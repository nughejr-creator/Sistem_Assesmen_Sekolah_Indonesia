import React, { useState, useEffect, useMemo } from 'react';
import { 
  QuestionWriterAssignment, 
  UserProfile, 
  SchoolLevel, 
  Phase, 
  AssessmentType 
} from '../../types/database';
import { MOCK_WRITER_ASSIGNMENTS, MOCK_USERS } from '../../lib/mockData';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  GraduationCap, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Copy, 
  X, 
  Sparkles,
  Layers,
  Award,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  RotateCcw,
  Archive
} from 'lucide-react';
import { isAssignmentArchived } from '../../lib/archiveHelper';
import * as XLSX from 'xlsx';
import { 
  generateValidUUID, 
  toValidUUID, 
  safeSupabaseUpsert,
  fetchWriterAssignmentsFromCloud,
  saveWriterAssignmentToCloud,
  deleteWriterAssignmentFromCloud,
  deduplicateWriterAssignments
} from '../../lib/syncHelper';
import { supabase } from '../../lib/supabase';

const ASSIGNMENTS_STORAGE_KEY = 'sasi_writer_assignments_cache';
const USERS_STORAGE_KEY = 'sasi_users_cache';

interface WriterAssignmentManagerProps {
  currentUser: UserProfile;
}

export const WriterAssignmentManager: React.FC<WriterAssignmentManagerProps> = ({ currentUser }) => {
  // 1. State for Assignments (Eksklusif data riil, bebas duplikasi)
  const [assignments, setAssignments] = useState<QuestionWriterAssignment[]>(() => {
    try {
      const cached = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = deduplicateWriterAssignments(parsed);
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch (e) {}
    return deduplicateWriterAssignments(MOCK_WRITER_ASSIGNMENTS);
  });

  // Purge dummy items & deduplikasi dari localStorage immediately on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const cleaned = deduplicateWriterAssignments(parsed);
          localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(cleaned));
          setAssignments(cleaned);
        }
      }
    } catch (e) {}
  }, []);

  // Fetch Cloud Assignments on Mount (Realtime sync & intelligent deduplication across devices)
  useEffect(() => {
    let isMounted = true;
    async function loadCloudAssignments() {
      try {
        const cloudData = await fetchWriterAssignmentsFromCloud();
        if (cloudData && cloudData.length > 0 && isMounted) {
          setAssignments(prev => {
            // Prioritaskan Cloud Supabase atas legacy local cache
            const merged = deduplicateWriterAssignments([...cloudData, ...prev]);
            try {
              localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      } catch (err) {
        console.warn('Error loading cloud assignments:', err);
      }
    }
    loadCloudAssignments();
    return () => { isMounted = false; };
  }, []);

  // 2. State for Users (to pick existing teachers)
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem(USERS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return MOCK_USERS;
  });

  // Fetch Cloud Users from Supabase on mount to enrich teacher list
  useEffect(() => {
    async function fetchCloudUsers() {
      try {
        const { data: dbProfiles, error } = await supabase
          .from('user_profiles')
          .select('*, school:schools(id, name)');
        if (dbProfiles && !error && dbProfiles.length > 0) {
          setAllUsers(prev => {
            const map = new Map<string, UserProfile>();
            prev.forEach(u => map.set(u.id, u));
            dbProfiles.forEach((u: any) => map.set(u.id, u));
            const merged = Array.from(map.values());
            try { localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
      } catch (err) {
        console.warn('Error fetching cloud users in WriterAssignmentManager:', err);
      }
    }
    fetchCloudUsers();
  }, []);

  // Filter & Search states
  const [activeArchiveTab, setActiveArchiveTab] = useState<'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('ALL');
  const [filterAssessment, setFilterAssessment] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const handleArchiveAssignment = (item: QuestionWriterAssignment) => {
    const updated = assignments.map(a => a.id === item.id ? { ...a, status: 'Diarsipkan' as const, is_archived: true, archived_at: new Date().toISOString() } : a);
    saveAssignments(updated);
    notify(`Penugasan ${item.user_name} berhasil diarsipkan dari lembar kerja aktif.`);
  };

  const handleRestoreAssignment = (item: QuestionWriterAssignment) => {
    const updated = assignments.map(a => a.id === item.id ? { ...a, status: 'Selesai' as const, is_archived: false } : a);
    saveAssignments(updated);
    notify(`Penugasan ${item.user_name} berhasil dipulihkan ke lembar kerja aktif.`);
  };

  const activeCount = useMemo(() => assignments.filter(a => !isAssignmentArchived(a)).length, [assignments]);
  const archivedCount = useMemo(() => assignments.filter(a => isAssignmentArchived(a)).length, [assignments]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterGrade('ALL');
    setFilterAssessment('ALL');
    setFilterStatus('ALL');
  };
  const isAnyFilterActive = searchTerm.trim() !== '' || filterGrade !== 'ALL' || filterAssessment !== 'ALL' || filterStatus !== 'ALL';

  // Modal Add/Edit state
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<QuestionWriterAssignment | null>(null);

  // Form tab: 'existing' (Guru Terdaftar) vs 'external' (Mitra/Dosen Baru)
  const [authorSourceTab, setAuthorSourceTab] = useState<'existing' | 'external'>('existing');

  // Form fields
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [externalName, setExternalName] = useState('');
  const [externalInstitution, setExternalInstitution] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalPassword, setExternalPassword] = useState('sasi123');

  const [formSubjectName, setFormSubjectName] = useState('Bahasa Indonesia');
  const [formGradeClass, setFormGradeClass] = useState('Kelas 1');
  const [formLevel, setFormLevel] = useState<SchoolLevel>('SD');
  const [formPhase, setFormPhase] = useState<Phase>('A');
  const [formAssessmentTypes, setFormAssessmentTypes] = useState<AssessmentType[]>(['SAS']);
  const [formTargetQuestions, setFormTargetQuestions] = useState<number>(30);
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<QuestionWriterAssignment['status']>('Dalam Penulisan');

  // Modal Import Excel state
  const [showImportModal, setShowImportModal] = useState(false);

  // Notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Persist helper (LocalStorage + Supabase Cloud)
  const saveAssignments = (updated: QuestionWriterAssignment[]) => {
    setAssignments(updated);
    try {
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('sasi_assignments_updated'));
    } catch (e) {}
    // Background cloud sync
    updated.forEach(item => {
      saveWriterAssignmentToCloud(item);
    });
  };

  // Pre-filter teachers
  const availableTeachers = useMemo(() => {
    return allUsers.filter(u => u.role === 'teacher');
  }, [allUsers]);

  // Available grade options
  const gradeOptions = [
    { label: 'Kelas 1 (Fase A - SD)', value: 'Kelas 1', level: 'SD' as SchoolLevel, phase: 'A' as Phase },
    { label: 'Kelas 2 (Fase A - SD)', value: 'Kelas 2', level: 'SD' as SchoolLevel, phase: 'A' as Phase },
    { label: 'Kelas 3 (Fase B - SD)', value: 'Kelas 3', level: 'SD' as SchoolLevel, phase: 'B' as Phase },
    { label: 'Kelas 4 (Fase B - SD)', value: 'Kelas 4', level: 'SD' as SchoolLevel, phase: 'B' as Phase },
    { label: 'Kelas 5 (Fase C - SD)', value: 'Kelas 5', level: 'SD' as SchoolLevel, phase: 'C' as Phase },
    { label: 'Kelas 6 (Fase C - SD)', value: 'Kelas 6', level: 'SD' as SchoolLevel, phase: 'C' as Phase },
    { label: 'Kelas 7 (Fase D - SMP)', value: 'Kelas 7', level: 'SMP' as SchoolLevel, phase: 'D' as Phase },
    { label: 'Kelas 8 (Fase D - SMP)', value: 'Kelas 8', level: 'SMP' as SchoolLevel, phase: 'D' as Phase },
    { label: 'Kelas 9 (Fase D - SMP)', value: 'Kelas 9', level: 'SMP' as SchoolLevel, phase: 'D' as Phase },
  ];

  // Common subjects
  const commonSubjects = [
    'Pendidikan Agama Islam dan Budi Pekerti',
    'Pendidikan Pancasila',
    'Bahasa Indonesia',
    'Matematika',
    'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
    'Seni Rupa',
    'Seni Musik',
    'Bahasa Inggris',
    'Bahasa Sunda'
  ];

  const assessmentOptions: AssessmentType[] = ['Formatif', 'PTS', 'SAS', 'SAT', 'SAJ'];

  // Handle grade change to auto-update Phase and Level
  const handleGradeChange = (gradeVal: string) => {
    setFormGradeClass(gradeVal);
    const found = gradeOptions.find(g => g.value === gradeVal);
    if (found) {
      setFormLevel(found.level);
      setFormPhase(found.phase);
    }
  };

  // Toggle assessment checkbox
  const toggleAssessmentType = (type: AssessmentType) => {
    setFormAssessmentTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // Minimal 1 tipe terpilih
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Open Modal Add
  const handleOpenAddModal = () => {
    setEditingAssignment(null);
    setAuthorSourceTab('existing');
    setSelectedUserId(availableTeachers[0]?.id || '');
    setExternalName('');
    setExternalInstitution('Universitas / Dosen Ahli');
    setExternalEmail('');
    setExternalPassword('sasi123');
    setFormSubjectName('Bahasa Indonesia');
    handleGradeChange('Kelas 1');
    setFormAssessmentTypes(['SAS']);
    setFormTargetQuestions(30);
    setFormNotes('');
    setFormStatus('Dalam Penulisan');
    setShowModal(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (item: QuestionWriterAssignment) => {
    setEditingAssignment(item);
    if (item.user_type === 'mitra_eksternal') {
      setAuthorSourceTab('external');
      setExternalName(item.user_name);
      setExternalInstitution(item.user_institution || '');
      setExternalEmail(item.user_email || '');
    } else {
      setAuthorSourceTab('existing');
      setSelectedUserId(item.user_id);
    }
    setFormSubjectName(item.subject_name);
    setFormGradeClass(item.grade_class);
    setFormLevel(item.level);
    setFormPhase(item.phase);
    setFormAssessmentTypes(item.assessment_types && item.assessment_types.length > 0 ? item.assessment_types : ['SAS']);
    setFormTargetQuestions(item.target_questions || 30);
    setFormNotes(item.notes || '');
    setFormStatus(item.status);
    setShowModal(true);
  };

  // Save Assignment
  const handleSaveAssignment = () => {
    let finalUserId = selectedUserId;
    let finalUserName = '';
    let finalUserEmail = '';
    let finalInstitution = '';
    let finalUserType: QuestionWriterAssignment['user_type'] = 'guru_internal';

    if (authorSourceTab === 'existing') {
      const matchedTeacher = availableTeachers.find(t => t.id === selectedUserId);
      if (!matchedTeacher) {
        alert('Silakan pilih guru terlebih dahulu.');
        return;
      }
      finalUserId = matchedTeacher.id;
      finalUserName = matchedTeacher.full_name;
      finalUserEmail = matchedTeacher.username || '';
      finalInstitution = matchedTeacher.school?.name || 'SD Negeri Cinanggerang I';
      finalUserType = 'guru_internal';
    } else {
      if (!externalName.trim()) {
        alert('Nama penulis eksternal wajib diisi.');
        return;
      }
      const existingUser = allUsers.find(u => 
        (externalEmail && u.username?.toLowerCase() === externalEmail.trim().toLowerCase()) ||
        u.full_name?.toLowerCase() === externalName.trim().toLowerCase()
      );

      finalUserId = editingAssignment?.user_id || existingUser?.id || generateValidUUID();
      finalUserName = externalName.trim();
      finalUserEmail = externalEmail.trim() || existingUser?.username || `penulis.${Date.now().toString().slice(-4)}@sasi.id`;
      finalInstitution = externalInstitution.trim() || 'Mitra Akademisi';
      finalUserType = 'mitra_eksternal';

      // Auto-create/sync new user profile if external and not exists
      const newExternalUser: UserProfile = {
        id: finalUserId,
        username: finalUserEmail,
        full_name: finalUserName,
        role: 'teacher',
        teacher_type: 'penulis_soal',
        password: externalPassword || 'sasi123',
        assigned_level: formLevel,
        grade_class: formGradeClass,
        phase: formPhase,
        assigned_subject_name: formSubjectName,
        created_at: new Date().toISOString()
      };
      const updatedUsers = existingUser 
        ? allUsers.map(u => u.id === existingUser.id ? { ...u, ...newExternalUser } : u)
        : [...allUsers, newExternalUser];
      setAllUsers(updatedUsers);
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
      } catch (e) {}

      // Push to Supabase Cloud user_profiles
      safeSupabaseUpsert('user_profiles', [{
        id: toValidUUID(finalUserId),
        username: finalUserEmail,
        full_name: finalUserName,
        role: 'teacher',
        teacher_type: 'penulis_soal',
        password: externalPassword || 'sasi123',
        assigned_level: formLevel,
        grade_class: formGradeClass,
        phase: formPhase,
        assigned_subject_name: formSubjectName,
        created_at: new Date().toISOString()
      }]);
    }

    if (editingAssignment) {
      // Update
      const updated = assignments.map(a => {
        if (a.id === editingAssignment.id) {
          return {
            ...a,
            user_id: finalUserId,
            user_name: finalUserName,
            user_email: finalUserEmail,
            user_institution: finalInstitution,
            user_type: finalUserType,
            subject_name: formSubjectName,
            grade_class: formGradeClass,
            phase: formPhase,
            level: formLevel,
            assessment_types: formAssessmentTypes,
            target_questions: formTargetQuestions,
            status: formStatus,
            notes: formNotes,
            updated_at: new Date().toISOString()
          };
        }
        return a;
      });
      saveAssignments(updated);
      notify(`Penugasan ${finalUserName} berhasil diperbarui.`);
    } else {
      // Create New
      const newAssignment: QuestionWriterAssignment = {
        id: `asg-${Date.now()}`,
        user_id: finalUserId,
        user_name: finalUserName,
        user_email: finalUserEmail,
        user_institution: finalInstitution,
        user_type: finalUserType,
        subject_name: formSubjectName,
        grade_class: formGradeClass,
        phase: formPhase,
        level: formLevel,
        assessment_types: formAssessmentTypes,
        target_questions: formTargetQuestions,
        status: formStatus,
        notes: formNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      saveAssignments([newAssignment, ...assignments]);
      notify(`Berhasil menambahkan penugasan baru untuk ${finalUserName}.`);
    }

    setShowModal(false);
  };

  // Delete Assignment
  const handleDeleteAssignment = (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus penugasan naskah untuk "${name}"?`)) {
      const updated = assignments.filter(a => a.id !== id);
      saveAssignments(updated);
      deleteWriterAssignmentFromCloud(id);
      notify(`Penugasan ${name} telah dihapus.`);
    }
  };

  // Duplicate Assignment (Useful for same teacher, different assessment type / grade)
  const handleDuplicateAssignment = (item: QuestionWriterAssignment) => {
    const duplicated: QuestionWriterAssignment = {
      ...item,
      id: `asg-${Date.now()}`,
      status: 'Draft',
      notes: `${item.notes || ''} (Salinan Penugasan)`.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    saveAssignments([duplicated, ...assignments]);
    notify(`Penugasan untuk ${item.user_name} berhasil diduplikasi.`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = assignments.map((a, idx) => ({
      'No': idx + 1,
      'Nama Penulis': a.user_name,
      'Email / Username': a.user_email || '-',
      'Asal Instansi': a.user_institution || '-',
      'Kategori Penulis': a.user_type === 'mitra_eksternal' ? 'Mitra Eksternal' : 'Guru Internal',
      'Mata Pelajaran': a.subject_name,
      'Kelas': a.grade_class,
      'Fase': a.phase,
      'Jenjang': a.level,
      'Jenis Asesmen': a.assessment_types.join(', '),
      'Target Butir': a.target_questions || 30,
      'Status': a.status,
      'Catatan': a.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Penugasan Penulis Soal');
    XLSX.writeFile(workbook, `SASI_Matriks_Penugasan_Penulis_${new Date().toISOString().slice(0, 10)}.xlsx`);
    notify('Matriks penugasan berhasil diekspor ke Excel!');
  };

  // Filtered List
  const filteredAssignments = useMemo(() => {
    return assignments.filter(item => {
      const isArchived = isAssignmentArchived(item);
      if (activeArchiveTab === 'active' && isArchived) return false;
      if (activeArchiveTab === 'archived' && !isArchived) return false;

      const matchSearch = 
        item.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.user_institution || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchGrade = filterGrade === 'ALL' || item.grade_class === filterGrade;
      const matchAssessment = filterAssessment === 'ALL' || item.assessment_types.includes(filterAssessment as AssessmentType);
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;

      return matchSearch && matchGrade && matchAssessment && matchStatus;
    });
  }, [assignments, activeArchiveTab, searchTerm, filterGrade, filterAssessment, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = assignments.length;
    const internalTeachers = assignments.filter(a => a.user_type !== 'mitra_eksternal').length;
    const externalExperts = assignments.filter(a => a.user_type === 'mitra_eksternal').length;
    const sasPackages = assignments.filter(a => a.assessment_types.includes('SAS')).length;
    const completedPackages = assignments.filter(a => a.status === 'Selesai').length;

    return { total, internalTeachers, externalExperts, sasPackages, completedPackages };
  }, [assignments]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Otoritas Super Admin & Asisten</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center space-x-3">
              <span>Penugasan Khusus Penulis Soal</span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-white uppercase tracking-wider">
                Multi-Paket
              </span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Petakan guru internal maupun mitra ahli eksternal (Dosen, Widyaiswara, Mahasiswa) ke paket naskah soal tertentu. Akun penulis akan otomatis terkunci hanya pada mata pelajaran dan jenis asesmen yang ditugaskan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-brand-600/30 transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Penugasan</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800">{stats.total}</div>
            <div className="text-[11px] font-bold text-slate-500">Total Penugasan</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800">{stats.internalTeachers}</div>
            <div className="text-[11px] font-bold text-slate-500">Guru Internal</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800">{stats.externalExperts}</div>
            <div className="text-[11px] font-bold text-slate-500">Mitra / Ahli Eksternal</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800">{stats.sasPackages}</div>
            <div className="text-[11px] font-bold text-slate-500">Paket Ujian SAS</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center space-x-3.5 col-span-2 lg:col-span-1">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-800">{stats.completedPackages}</div>
            <div className="text-[11px] font-bold text-slate-500">Selesai Ditulis</div>
          </div>
        </div>
      </div>

      {/* 2.5. Tab Selector: Penugasan Aktif vs Kotak Arsip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveArchiveTab('active')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              activeArchiveTab === 'active'
                ? 'bg-white text-brand-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-brand-600" />
            <span>Penugasan Aktif ({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveArchiveTab('archived')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
              activeArchiveTab === 'archived'
                ? 'bg-white text-amber-800 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-4 h-4 text-amber-600" />
            <span>Kotak Arsip ({archivedCount})</span>
          </button>
        </div>

        {activeArchiveTab === 'archived' && (
          <span className="text-xs text-amber-800 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center space-x-1.5">
            <Archive className="w-3.5 h-3.5 text-amber-600" />
            <span>Penugasan di bawah ini diarsipkan dan tidak mengotori lembar kerja aktif</span>
          </span>
        )}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama penulis, mapel, atau instansi..."
              className="w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Kelas */}
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700"
            >
              <option value="ALL">Semua Kelas</option>
              {gradeOptions.map(g => (
                <option key={g.value} value={g.value}>{g.value}</option>
              ))}
            </select>

            {/* Filter Jenis Asesmen */}
            <select
              value={filterAssessment}
              onChange={(e) => setFilterAssessment(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700"
            >
              <option value="ALL">Semua Asesmen</option>
              {assessmentOptions.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Dalam Penulisan">Dalam Penulisan</option>
              <option value="Menunggu Riviu">Menunggu Riviu</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 justify-between md:justify-end shrink-0">
          {/* Tombol 1-Klik Reset Filter */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center space-x-1 transition-all"
              title="Reset semua filter ke kondisi awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Filter</span>
            </button>
          )}

          <span className="text-xs font-black text-brand-700 bg-brand-50 px-3 py-2 rounded-xl border border-brand-200 whitespace-nowrap">
            {filteredAssignments.length} Penugasan Ditampilkan
          </span>
        </div>
      </div>

      {/* 4. Table Matrix: Grid Bersekat Tegas & High-Density */}
      <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-sky-100 text-sky-950 font-black uppercase tracking-wider text-[11px] border-b-2 border-sky-300">
              <tr className="divide-x divide-sky-200">
                <th className="py-2.5 px-2 w-12 text-center bg-sky-200/80 text-sky-950 font-black">NO.</th>
                <th className="py-2.5 px-3 min-w-[200px]">PENULIS & INSTANSI</th>
                <th className="py-2.5 px-3 w-28">KELAS & FASE</th>
                <th className="py-2.5 px-3 min-w-[160px]">MATA PELAJARAN</th>
                <th className="py-2.5 px-3 min-w-[180px]">PAKET ASESMEN DITUGASKAN</th>
                <th className="py-2.5 px-3 text-center w-24">TARGET BUTIR</th>
                <th className="py-2.5 px-3 text-center w-28">STATUS</th>
                <th className="py-2.5 px-3 text-center w-28">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-700">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium text-xs">
                    <UserCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-xs text-slate-600">Tidak ada penugasan yang sesuai dengan filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Gunakan tombol "+ Tambah Penugasan" untuk membuat penugasan naskah baru.</p>
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((item, idx) => (
                  <tr 
                    key={item.id} 
                    className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors"
                  >
                    {/* 1. NOMOR URUT DINAMIS */}
                    <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                      {idx + 1}
                    </td>

                    {/* 2. Penulis & Instansi */}
                    <td className="py-2 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-white shrink-0 text-xs shadow-2xs ${
                          item.user_type === 'mitra_eksternal'
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                            : 'bg-gradient-to-br from-blue-600 to-indigo-600'
                        }`}>
                          {item.user_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 text-xs leading-tight flex items-center space-x-1.5 truncate max-w-[200px]" title={item.user_name}>
                            <span className="truncate">{item.user_name}</span>
                            {item.user_type === 'mitra_eksternal' && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                Eksternal
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5 truncate max-w-[200px]" title={item.user_institution || 'Instansi Terdaftar'}>
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{item.user_institution || 'Instansi Terdaftar'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Kelas & Fase */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
                        {item.grade_class}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
                        Fase {item.phase} ({item.level})
                      </div>
                    </td>

                    {/* 4. Mata Pelajaran */}
                    <td className="py-2 px-3 font-bold text-slate-800 text-xs">
                      <div className="flex items-center space-x-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span className="truncate max-w-[180px]" title={item.subject_name}>{item.subject_name}</span>
                      </div>
                      {item.notes && (
                        <div className="text-[10px] text-slate-400 font-normal italic mt-0.5 line-clamp-1 truncate max-w-[180px]" title={item.notes}>
                          {item.notes}
                        </div>
                      )}
                    </td>

                    {/* 5. Paket Asesmen (Multi-Checkbox Badges) */}
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {item.assessment_types && item.assessment_types.map(type => (
                          <span
                            key={type}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-black tracking-wider uppercase border ${
                              type === 'SAS' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              type === 'SAT' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              type === 'PTS' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                              type === 'SAJ' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* 6. Target Butir */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className="font-black text-slate-800 text-xs">
                        {item.target_questions || 30}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-normal">Soal</span>
                    </td>

                    {/* 7. Status */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        item.status === 'Menunggu Riviu' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        item.status === 'Dalam Penulisan' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    {/* 8. Aksi */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        {isAssignmentArchived(item) ? (
                          <button
                            type="button"
                            onClick={() => handleRestoreAssignment(item)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-all flex items-center space-x-1 shadow-2xs"
                            title="Aktifkan Kembali Penugasan Ini ke Lembar Kerja"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-600" />
                            <span>Aktifkan</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDuplicateAssignment(item)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition border border-slate-200"
                              title="Duplikasi Penugasan"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition border border-slate-200"
                              title="Edit Penugasan"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArchiveAssignment(item)}
                              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition border border-slate-200"
                              title="Arsipkan Penugasan Ini dari Lembar Kerja"
                            >
                              <Archive className="w-3 h-3 text-amber-500" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAssignment(item.id, item.user_name)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition border border-slate-200"
                              title="Hapus Penugasan"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal Tambah / Edit Penugasan */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-slate-200">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-800">
                    {editingAssignment ? 'Edit Penugasan Penulis Soal' : 'Formulir Penugasan Penulis Soal'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih pendidik internal atau daftarkan mitra ahli eksternal.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs font-semibold text-slate-700">
              
              {/* Tab Sumber Penulis (Guru Terdaftar vs Mitra Baru) */}
              <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setAuthorSourceTab('existing')}
                  className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
                    authorSourceTab === 'existing'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Pilih Guru Terdaftar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthorSourceTab('external')}
                  className={`flex-1 py-2 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
                    authorSourceTab === 'external'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>+ Daftarkan Penulis Eksternal (Dosen/Widyaiswara/Mhs)</span>
                </button>
              </div>

              {/* Skenario A: Guru Terdaftar */}
              {authorSourceTab === 'existing' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Pilih Akun Guru Pendidik:
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                  >
                    {availableTeachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.school?.name || 'SDN Cinanggerang I'}) - {t.username}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Guru yang dipilih akan langsung mendapatkan akses paket ini saat login.
                  </p>
                </div>
              ) : (
                /* Skenario B: Penulis Eksternal Baru */
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/80 space-y-3.5">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>Biodata Penulis Eksternal / Mitra Ahli</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Nama Lengkap & Gelar: *
                      </label>
                      <input
                        type="text"
                        value={externalName}
                        onChange={(e) => setExternalName(e.target.value)}
                        placeholder="Contoh: Dr. Irwan Setiawan, M.Pd."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Asal Instansi / Lembaga: *
                      </label>
                      <input
                        type="text"
                        value={externalInstitution}
                        onChange={(e) => setExternalInstitution(e.target.value)}
                        placeholder="Contoh: Universitas Pendidikan Indonesia"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Email / Username Login:
                      </label>
                      <input
                        type="text"
                        value={externalEmail}
                        onChange={(e) => setExternalEmail(e.target.value)}
                        placeholder="Contoh: dosen.matematika@sasi.id"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Kata Sandi Awal:
                      </label>
                      <input
                        type="text"
                        value={externalPassword}
                        onChange={(e) => setExternalPassword(e.target.value)}
                        placeholder="Default: sasi123"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Rombel & Mata Pelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Kelas / Jenjang Penugasan:
                  </label>
                  <select
                    value={formGradeClass}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                  >
                    {gradeOptions.map(g => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Mata Pelajaran:
                  </label>
                  <select
                    value={formSubjectName}
                    onChange={(e) => setFormSubjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                  >
                    {commonSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Checkbox Pilihan Paket Asesmen */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Paket Jenis Asesmen Ditugaskan (Bisa Centang Lebih dari 1):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {assessmentOptions.map(type => {
                    const isChecked = formAssessmentTypes.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleAssessmentType(type)}
                        className={`p-2.5 rounded-xl text-center font-black text-xs transition border flex items-center justify-between ${
                          isChecked
                            ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <span>{type}</span>
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isChecked ? 'bg-brand-600 text-white' : 'border border-slate-300'
                        }`}>
                          {isChecked && '✓'}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Centang semua asesmen yang menjadi tanggung jawab penulis ini (contoh: Formatif + PTS + SAS).
                </p>
              </div>

              {/* Target Soal & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Target Butir Soal per Paket:
                  </label>
                  <input
                    type="number"
                    value={formTargetQuestions}
                    onChange={(e) => setFormTargetQuestions(Number(e.target.value))}
                    min={5}
                    max={100}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Status Pengerjaan:
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                  >
                    <option value="Draft">Draft (Belum Dibuka)</option>
                    <option value="Dalam Penulisan">Dalam Penulisan (Aktif)</option>
                    <option value="Menunggu Riviu">Menunggu Riviu Ahli</option>
                    <option value="Selesai">Selesai (Naskah Terkunci)</option>
                  </select>
                </div>
              </div>

              {/* Catatan / Keterangan Khusus */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Catatan / Instruksi Khusus untuk Penulis (Opsional):
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Contoh: Fokus pada soal penalaran HOTS dan stimulus teks konteks lokal..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800"
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveAssignment}
                className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black transition text-xs shadow-md shadow-brand-600/30"
              >
                Simpan Penugasan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

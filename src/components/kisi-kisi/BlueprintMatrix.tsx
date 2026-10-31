import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Blueprint, 
  BlueprintItem, 
  QuestionBankItem, 
  WorkflowStatus,
  TaskType,
  QuestionType,
  CognitiveLevel,
  Subject,
  StudentAnswer,
  UserProfile,
  SchoolLevel,
  QuestionWriterAssignment
} from '../../types/database';
import { MOCK_BLUEPRINT, MOCK_SUBJECTS, MOCK_WRITER_ASSIGNMENTS } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  generateValidUUID, 
  toValidUUID, 
  safeSupabaseUpsert,
  resolveSubjectUUID,
  getOrCreateBlueprintId,
  formatBlueprintItemForCloud,
  formatQuestionForCloud,
  formatOptionsForCloud,
  isObsoleteSubject,
  fetchBlueprintItemWritersFromCloud,
  saveBlueprintItemWriterToCloud,
  saveBlueprintItemWritersBatchToCloud,
  deleteBlueprintItemWriterFromCloud,
  fetchWriterAssignmentsFromCloud,
  saveWriterAssignmentToCloud,
  deduplicateWriterAssignments
} from '../../lib/syncHelper';
import { getContextOptionsForSubject } from '../../lib/contextPresetData';
import { CreatableCombobox } from './CreatableCombobox';
import { QuestionEditorModal } from './QuestionEditorModal';
import { QuestionRenderer } from '../cbt/QuestionRenderer';
import { RichMathText } from '../common/RichMathText';
import { HourglassLoader } from '../common/HourglassLoader';
import { 
  exportBlueprintToExcel, 
  downloadBlueprintTemplate, 
  parseBlueprintFromExcel 
} from '../../lib/blueprintExcel';
import { isSameSubject } from '../../lib/subjectMatcher';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  FileSpreadsheet, 
  Layers, 
  CheckCircle, 
  Clock, 
  Edit3, 
  Eye, 
  ChevronRight,
  ChevronLeft,
  Target,
  Sparkles,
  BookOpen,
  GraduationCap,
  BookMarked,
  PenTool,
  Archive,
  CheckCircle2,
  ListFilter,
  FileText,
  BadgeCheck,
  PackagePlus,
  HelpCircle,
  Download,
  Upload,
  RefreshCw,
  FolderSearch,
  Check,
  AlertCircle,
  AlertTriangle,
  Lock,
  ShieldAlert,
  Info,
  X,
  Trash2,
  User,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';

const BLUEPRINT_ITEMS_KEY = 'sasi_blueprint_items_cache';
const QUESTION_BANK_KEY = 'sasi_question_bank_cache';

export interface BlueprintMatrixProps {
  currentUser?: UserProfile;
  initialScope?: {
    level?: SchoolLevel;
    grade?: string;
    subject?: string;
    assessment?: string;
    isLocked?: boolean;
    defaultMode?: 'kisi-kisi' | 'penulisan' | 'bank-soal';
    targetQuestions?: number;
    assignment?: any;
  };
  activeSubModeProp?: 'kisi-kisi' | 'penulisan' | 'bank-soal' | null;
  onSubModeChange?: (mode: 'kisi-kisi' | 'penulisan' | 'bank-soal') => void;
}

function getAssignmentStatusInfo(status?: string): {
  key: 'draft' | 'in_progress' | 'pending_review' | 'needs_revision' | 'approved';
  label: string;
  badgeClass: string;
} {
  const s = (status || '').toLowerCase().trim();
  if (s === 'terverifikasi' || s === 'approved' || s === 'selesai' || s === 'selesai (terverifikasi)') {
    return {
      key: 'approved',
      label: 'Terverifikasi',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
    };
  }
  if (s === 'perlu revisi' || s === 'needs_revision' || s === 'revisi') {
    return {
      key: 'needs_revision',
      label: 'Perlu Revisi',
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200'
    };
  }
  if (s === 'menunggu verifikasi' || s === 'menunggu riviu' || s === 'pending_review' || s === 'menunggu verifikasi (selesai penulis)') {
    return {
      key: 'pending_review',
      label: 'Menunggu Verifikasi',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200'
    };
  }
  if (s === 'proses penulisan' || s === 'dalam penulisan' || s === 'in_progress' || s === 'penulisan') {
    return {
      key: 'in_progress',
      label: 'Proses Penulisan',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200'
    };
  }
  return {
    key: 'draft',
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200'
  };
}

export const BlueprintMatrix: React.FC<BlueprintMatrixProps> = ({ 
  currentUser, 
  initialScope,
  activeSubModeProp,
  onSubModeChange
}) => {
  const [blueprint] = useState<Blueprint>(MOCK_BLUEPRINT);

  


  // Check if current user is Super Admin
  const isSuperAdmin = useMemo(() => {
    if (currentUser?.role) {
      return currentUser.role === 'super_admin';
    }
    try {
      const saved = localStorage.getItem('sasi_user_session');
      if (saved) {
        const u = JSON.parse(saved);
        return u.role === 'super_admin';
      }
    } catch (e) {}
    return false;
  }, [currentUser]);
  
  // Persistent state for Blueprint Items
  const [items, setItems] = useState<BlueprintItem[]>(() => {
    try {
      const cached = localStorage.getItem(BLUEPRINT_ITEMS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Persistent state for Question Bank
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>(() => {
    try {
      const cached = localStorage.getItem(QUESTION_BANK_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Subjects state (loaded from cache or fallback to MOCK_SUBJECTS, menyaring mapel obsolete)
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_subjects_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((s: Subject) => !isObsoleteSubject(s));
        }
      }
    } catch (e) {}
    return MOCK_SUBJECTS.filter((s: Subject) => !isObsoleteSubject(s));
  });

  // Cloud Database Connection State
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('checking');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Fetch Blueprint Items & Question Bank from Supabase Cloud on mount & Sync Bidirectional
  useEffect(() => {
    let isMounted = true;

    const syncBlueprintFromCloud = async () => {
      setIsLoadingData(true);
      setCloudStatus('checking');
      try {
        // 0. Sync Subjects from Supabase Cloud (bersihkan data obsolete)
        try {
          const { data: cloudSubs } = await supabase
            .from('subjects')
            .select('*')
            .order('level', { ascending: true })
            .order('name', { ascending: true });

          if (cloudSubs && cloudSubs.length > 0 && isMounted) {
            const cleanSubs = cloudSubs.filter((s: Subject) => !isObsoleteSubject(s));
            setAvailableSubjects(cleanSubs);
            try {
              localStorage.setItem('sasi_subjects_cache', JSON.stringify(cleanSubs));
            } catch (e) {}
          }
        } catch (subErr) {}
        // 1. Ambil data blueprint items dan butir soal cloud secara serempak
        const [itemsRes, questionsRes, writerMappings] = await Promise.all([
          supabase
            .from('blueprint_items')
            .select('*, blueprint:blueprints(title, subject_id, level, phase, assessment_type, subject:subjects(name))')
            .order('question_number', { ascending: true }),
          supabase
            .from('question_bank')
            .select('*, options:question_options(*)'),
          fetchBlueprintItemWritersFromCloud()
        ]);

        const rawCloudItems = itemsRes.data;
        const itemsError = itemsRes.error;
        const cloudQuestions = questionsRes.data;
        const qError = questionsRes.error;

        if (itemsError) {
          console.warn('Supabase blueprint items load error:', itemsError);
          setCloudStatus('error');
          setCloudError(itemsError.message);
        } else {
          setCloudStatus('connected');
          setCloudError(null);
        }

        // 2. Bentuk daftar blueprint items terstandardisasi
        let cloudItems: BlueprintItem[] = [];
        if (!itemsError && rawCloudItems) {
          cloudItems = rawCloudItems.map((i: any) => {
            const rawSubName = i.blueprint?.subject?.name || '';
            const bpPhase = i.blueprint?.phase || 'B';
            const bpTitle = i.blueprint?.title || '';

            let cleanSubName = rawSubName.replace(/\s*\(.*\)/, '').trim() || i.subject_name || 'Matematika';

            // Penyelarasan cerdas nama mapel spesifik dari judul blueprint
            const titleLower = bpTitle.toLowerCase();
            const rawLower = rawSubName.toLowerCase();
            if (titleLower.includes('seni rupa')) {
              cleanSubName = 'Seni Rupa';
            } else if (titleLower.includes('seni musik')) {
              cleanSubName = 'Seni Musik';
            } else if (titleLower.includes('seni tari')) {
              cleanSubName = 'Seni Tari';
            } else if (titleLower.includes('bahasa sunda')) {
              cleanSubName = 'Bahasa Sunda';
            } else if (titleLower.includes('agama islam') || titleLower.includes('budi pekerti') || rawLower.includes('agama')) {
              cleanSubName = 'Pendidikan Agama dan Budi Pekerti';
            } else if (titleLower.includes('ipas') || rawLower.includes('ipas')) {
              cleanSubName = 'IPAS (Ilmu Pengetahuan Alam dan Sosial)';
            } else if (titleLower.includes('pjok') || rawLower.includes('pjok')) {
              cleanSubName = 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)';
            }

            const gradeMatch = bpTitle.match(/Kelas\s*([0-9]+)/i);
            let detectedGrade = '';
            if (gradeMatch) {
              detectedGrade = `Kelas ${gradeMatch[1]}`;
            } else {
              detectedGrade = bpPhase === 'D' ? 'Kelas 7' : bpPhase === 'C' ? 'Kelas 6' : bpPhase === 'A' ? 'Kelas 1' : 'Kelas 4';
            }

            const writerMeta = writerMappings[i.id];
            const resolvedWriterId = i.writer_id || writerMeta?.writer_id || null;
            const resolvedWriterName = writerMeta?.writer_name || i.writer_name || (resolvedWriterId ? 'Penulis Terdaftar' : undefined);

            return {
              ...i,
              writer_id: resolvedWriterId,
              writer_name: resolvedWriterName,
              subject_name: i.subject_name || cleanSubName,
              grade_class: i.grade_class || detectedGrade,
              assessment_type: i.assessment_type || i.blueprint?.assessment_type || 'SAS',
              level: i.level || i.blueprint?.level || 'SD',
              phase: i.phase || bpPhase,
              workflow_status: i.workflow_status || 'Draft'
            };
          });
        }

        // 3. Map question bank dan perkayakan metadata dari blueprint_item pasangannya
        const itemsMap = new Map<string, BlueprintItem>();
        cloudItems.forEach(it => itemsMap.set(it.id, it));

        const mappedQuestions: QuestionBankItem[] = (!qError && cloudQuestions)
          ? cloudQuestions.map((q: any) => {
              let width = q.stimulus_media_width;
              let align = q.stimulus_media_align;
              let pos = q.stimulus_media_position;
              let caption = q.stimulus_media_caption;

              if (q.stimulus_media_url && q.stimulus_media_url.includes('#meta:')) {
                const parts = q.stimulus_media_url.split('#meta:');
                const params = new URLSearchParams(parts[1] || '');
                if (params.get('w')) width = params.get('w')!;
                if (params.get('a')) align = params.get('a') as any;
                if (params.get('p')) pos = params.get('p') as any;
                if (params.get('c')) caption = decodeURIComponent(params.get('c')!);
              }

              const linkedItem = q.blueprint_item_id ? itemsMap.get(q.blueprint_item_id) : undefined;

              return {
                ...q,
                subject_name: q.subject_name || linkedItem?.subject_name,
                grade_class: q.grade_class || linkedItem?.grade_class,
                level: q.level || linkedItem?.level || 'SD',
                phase: q.phase || linkedItem?.phase || 'B',
                writer_id: q.writer_id || linkedItem?.writer_id,
                writer_name: q.writer_name || linkedItem?.writer_name,
                assignment_id: q.assignment_id || (linkedItem as any)?.assignment_id,
                blueprint_item: linkedItem || q.blueprint_item,
                stimulus_media_width: width || '120px',
                stimulus_media_align: align || 'left',
                stimulus_media_position: pos || 'above',
                stimulus_media_caption: caption || q.stimulus_media_caption || '',
                options: Array.isArray(q.options)
                  ? [...q.options].sort((a: any, b: any) => (a.option_label || '').localeCompare(b.option_label || ''))
                  : []
              };
            })
          : [];

        // Tandai status Selesai pada item kisi-kisi jika ada butir selesai
        const finishedBpItemIds = new Set(
          mappedQuestions
            .filter(q => q.status === 'Selesai' && q.blueprint_item_id)
            .map(q => q.blueprint_item_id)
        );

        const finalizedCloudItems = cloudItems.map(it => ({
          ...it,
          workflow_status: (finishedBpItemIds.has(it.id) ? 'Selesai' : it.workflow_status) || 'Draft'
        }));

        if (isMounted) {
          setItems(finalizedCloudItems);
          setQuestionBank(mappedQuestions);
          try {
            localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(finalizedCloudItems));
            localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(mappedQuestions));
          } catch (e) {}
        }
      } catch (err: any) {
        console.warn('Supabase blueprint/questions sync fallback:', err);
        setCloudStatus('error');
        setCloudError(err?.message || 'Gagal sinkronisasi cloud');
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    syncBlueprintFromCloud();
    return () => { isMounted = false; };
  }, []);

  // 3 Sub-Navigation Modes: 'kisi-kisi' | 'penulisan' | 'bank-soal'
  const [activeSubMode, setActiveSubMode] = useState<'kisi-kisi' | 'penulisan' | 'bank-soal'>(() => {
    if (activeSubModeProp) return activeSubModeProp;
    if (initialScope?.defaultMode) return initialScope.defaultMode;
    return 'kisi-kisi';
  });

  const handleSubModeChange = (mode: 'kisi-kisi' | 'penulisan' | 'bank-soal') => {
    setActiveSubMode(mode);
    onSubModeChange?.(mode);
  };

  // Sync with activeSubModeProp from parent sidebar navigation
  useEffect(() => {
    if (activeSubModeProp && activeSubModeProp !== activeSubMode) {
      setActiveSubMode(activeSubModeProp);
    }
  }, [activeSubModeProp]);

  // Filter Bertingkat (Hierarchical Stepped Filter: Jenjang -> Kelas -> Mapel -> Jenis Asesmen)
  const [selectedLevel, setSelectedLevel] = useState<'SD' | 'SMP' | null>(initialScope?.level || null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(initialScope?.grade || null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(initialScope?.subject || null);
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(initialScope?.assessment || null);
  const [showArchivedItems, setShowArchivedItems] = useState<boolean>(false);

  // Sync initialScope dynamically if parent changes active assignment
  useEffect(() => {
    if (initialScope) {
      if (initialScope.level) setSelectedLevel(initialScope.level);
      if (initialScope.grade) {
        setSelectedGrade(initialScope.grade);
        setBankFilterGrade(initialScope.grade);
      }
      if (initialScope.subject) {
        setSelectedSubject(initialScope.subject);
        setBankFilterSubject(initialScope.subject);
      }
      if (initialScope.assessment) {
        setSelectedAssessment(initialScope.assessment);
        setBankFilterAssessment(initialScope.assessment);
      }
      if (initialScope.defaultMode) {
        handleSubModeChange(initialScope.defaultMode);
      } else if (initialScope.isLocked) {
        // PERBAIKAN BUG TAB MEMANTUL / BOUNCE:
        // Pertahankan submode yang sedang dipilih pengguna (penulisan / bank-soal).
        // Jangan timpa kembali ke 'kisi-kisi' jika pengguna sedang bekerja di submode lain!
        setActiveSubMode(prev => prev || 'kisi-kisi');
      }
      if (initialScope.isLocked) {
        setShowBankQuestions(true);
      }
    }
  }, [
    initialScope?.level,
    initialScope?.grade,
    initialScope?.subject,
    initialScope?.assessment,
    initialScope?.isLocked,
    initialScope?.defaultMode
  ]);

  // Assignments state for Bank Soal Terverifikasi Monitoring
  const [writerAssignments, setWriterAssignments] = useState<QuestionWriterAssignment[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_writer_assignments_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return deduplicateWriterAssignments(parsed);
        }
      }
    } catch (e) {}
    return deduplicateWriterAssignments(MOCK_WRITER_ASSIGNMENTS);
  });

  // Realtime Cloud sync for assignments
  useEffect(() => {
    let isMounted = true;
    const loadAssignments = async () => {
      try {
        const cloudData = await fetchWriterAssignmentsFromCloud();
        if (cloudData && cloudData.length > 0 && isMounted) {
          setWriterAssignments(prev => {
            const merged = deduplicateWriterAssignments([...cloudData, ...prev]);
            try { localStorage.setItem('sasi_writer_assignments_cache', JSON.stringify(merged)); } catch (e) {}
            return merged;
          });
        }
      } catch (err) {}
    };
    loadAssignments();

    const handleUpdate = () => {
      try {
        const cached = localStorage.getItem('sasi_writer_assignments_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setWriterAssignments(deduplicateWriterAssignments(parsed));
        }
      } catch (e) {}
    };
    window.addEventListener('sasi_assignments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('sasi_assignments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Filter States for Monitoring Paket Bank Soal Terverifikasi
  const [monSearchTerm, setMonSearchTerm] = useState('');
  const [monFilterGrade, setMonFilterGrade] = useState('ALL');
  const [monFilterSubject, setMonFilterSubject] = useState('ALL');
  const [monFilterAssessment, setMonFilterAssessment] = useState('ALL');
  const [monFilterStatus, setMonFilterStatus] = useState('ALL');

  // Preview & Verification Modal State
  const [previewAssignment, setPreviewAssignment] = useState<QuestionWriterAssignment | null>(null);
  const [isRevisionFormOpen, setIsRevisionFormOpen] = useState(false);
  const [revisionNotesInput, setRevisionNotesInput] = useState('');
  const [activePreviewQuestionTab, setActivePreviewQuestionTab] = useState<number | 'ALL'>('ALL');

  // Teacher Workspace State Check
  const isAssignmentReadOnly = useMemo(() => {
    if (!initialScope?.assignment) return false;
    const s = (initialScope.assignment.status || '').toLowerCase().trim();
    return s === 'terverifikasi' || s === 'approved' || s === 'selesai' || s === 'selesai (terverifikasi)';
  }, [initialScope?.assignment?.status]);

  const isAssignmentNeedsRevision = useMemo(() => {
    if (!initialScope?.assignment) return false;
    const s = (initialScope.assignment.status || '').toLowerCase().trim();
    return s === 'perlu revisi' || s === 'needs_revision' || s === 'revisi';
  }, [initialScope?.assignment?.status]);

  // Handler: Setujui / Lolos Verifikasi
  const handleApproveAssignment = async (asg: QuestionWriterAssignment) => {
    const reviewerName = currentUser?.full_name || currentUser?.name || (currentUser?.role === 'assistant_admin' ? 'Asisten Admin' : currentUser?.role === 'super_admin' ? 'Super Admin' : 'Administrator');
    const updatedAsg: QuestionWriterAssignment = {
      ...asg,
      status: 'Selesai',
      reviewed_by: reviewerName,
      reviewed_at: new Date().toISOString()
    };

    const nextAssignments = writerAssignments.map(a => a.id === asg.id ? updatedAsg : a);
    setWriterAssignments(nextAssignments);
    try {
      localStorage.setItem('sasi_writer_assignments_cache', JSON.stringify(nextAssignments));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('sasi_assignments_updated'));
    } catch (e) {}

    await saveWriterAssignmentToCloud(updatedAsg);

    // Tandai butir kisi-kisi dan butir soal sebagai Selesai / Terbit
    setItems(prev => {
      const updated = prev.map(item => {
        const matchSub = (item.subject_name || '').toLowerCase() === asg.subject_name.toLowerCase();
        const matchGrd = (item.grade_class || '').toLowerCase().includes(asg.grade_class.toLowerCase());
        if (matchSub && matchGrd) {
          return { ...item, workflow_status: 'Selesai' as const };
        }
        return item;
      });
      try { localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    setQuestionBank(prev => {
      const updated = prev.map(q => {
        const matchSub = (q.subject_name || '').toLowerCase() === asg.subject_name.toLowerCase();
        const matchGrd = (q.grade_class || '').toLowerCase().includes(asg.grade_class.toLowerCase());
        if (matchSub && matchGrd) {
          return { ...q, status: 'Terbit' as const, workflow_status: 'Terbit' as const };
        }
        return q;
      });
      try { localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(updated)); } catch (e) {}
      return updated;
    });

    setPreviewAssignment(null);
    setIsRevisionFormOpen(false);
    setRevisionNotesInput('');
    alert(`Paket soal "${asg.subject_name} - ${asg.grade_class}" berhasil Disetujui (Status Selesai) dan terverifikasi ke Bank Soal!`);
  };

  // Handler: Kembalikan untuk Perbaikan / Revisi
  const handleRejectForRevision = async (asg: QuestionWriterAssignment) => {
    if (!revisionNotesInput.trim()) {
      alert('Mohon tuliskan Catatan / Umpan Balik Perbaikan bagi penulis.');
      return;
    }

    const reviewerName = currentUser?.full_name || currentUser?.name || (currentUser?.role === 'assistant_admin' ? 'Asisten Admin' : currentUser?.role === 'super_admin' ? 'Super Admin' : 'Administrator');
    const updatedAsg: QuestionWriterAssignment = {
      ...asg,
      status: 'Perlu Revisi',
      revision_notes: revisionNotesInput.trim(),
      reviewed_by: reviewerName,
      reviewed_at: new Date().toISOString()
    };

    const nextAssignments = writerAssignments.map(a => a.id === asg.id ? updatedAsg : a);
    setWriterAssignments(nextAssignments);
    try {
      localStorage.setItem('sasi_writer_assignments_cache', JSON.stringify(nextAssignments));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('sasi_assignments_updated'));
    } catch (e) {}

    await saveWriterAssignmentToCloud(updatedAsg);

    setPreviewAssignment(null);
    setIsRevisionFormOpen(false);
    setRevisionNotesInput('');
    alert(`Paket soal "${asg.subject_name} - ${asg.grade_class}" telah dikembalikan ke penulis dengan catatan perbaikan.`);
  };

  // Handler: Guru Penulis Kirim Kembali ke Verifikator
  const handleTeacherResubmit = async () => {
    if (!initialScope?.assignment) return;
    const asg = initialScope.assignment;
    const updatedAsg: QuestionWriterAssignment = {
      ...asg,
      status: 'Menunggu Verifikasi',
      updated_at: new Date().toISOString()
    };

    try {
      const cached = localStorage.getItem('sasi_writer_assignments_cache');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const next = list.map((a: any) => a.id === asg.id ? updatedAsg : a);
          localStorage.setItem('sasi_writer_assignments_cache', JSON.stringify(next));
        }
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('sasi_assignments_updated'));
    } catch (e) {}

    await saveWriterAssignmentToCloud(updatedAsg);
    alert('Naskah soal revisi berhasil dikirim kembali ke Verifikator.');
  };

  // Handler: Guru Penulis Mengajukan Naskah Baru Selesai
  const handleTeacherSubmitForReview = async () => {
    if (!initialScope?.assignment) return;
    const asg = initialScope.assignment;
    const updatedAsg: QuestionWriterAssignment = {
      ...asg,
      status: 'Menunggu Verifikasi',
      updated_at: new Date().toISOString()
    };

    try {
      const cached = localStorage.getItem('sasi_writer_assignments_cache');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list)) {
          const next = list.map((a: any) => a.id === asg.id ? updatedAsg : a);
          localStorage.setItem('sasi_writer_assignments_cache', JSON.stringify(next));
        }
      }
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('sasi_assignments_updated'));
    } catch (e) {}

    await saveWriterAssignmentToCloud(updatedAsg);
    alert('Naskah soal penugasan ini berhasil diajukan ke Verifikator.');
  };

  // Helper: Ekstraksi angka kelas secara tepat (misal "SD - Kelas 4" -> "4", "Kelas 6" -> "6")
  const extractGradeNumber = (str?: string | null): string => {
    if (!str) return '';
    const match = str.match(/(?:kelas|grade|kls)?\s*([0-9]+)/i);
    return match ? match[1] : '';
  };

  const normalizeCleanStr = (str?: string | null): string => {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  // Helper: Ambil data butir soal untuk penugasan tertentu dengan isolasi ketat per paket
  const getAssignmentQuestions = (asg: QuestionWriterAssignment) => {
    if (!asg) {
      return { items: [], questions: [], writtenCount: 0, target: 0 };
    }

    const asgId = asg.id ? toValidUUID(asg.id) : '';
    const asgGradeNum = extractGradeNumber(asg.grade_class);
    const asgSubKey = normalizeCleanStr(asg.subject_name);
    const asgUserKey = normalizeCleanStr(asg.user_name);
    const asgUserId = asg.user_id ? toValidUUID(asg.user_id) : '';
    const asgLevel = asg.level || (asgGradeNum && Number(asgGradeNum) >= 7 ? 'SMP' : 'SD');

    // 1. Filter Blueprint Items yang secara spesifik sesuai dengan penugasan ini
    const matchedItems = items.filter(item => {
      // a. Jika item memiliki assignment_id eksplisit
      if ((item as any).assignment_id && asgId && (item as any).assignment_id === asgId) {
        return true;
      }

      // b. Match Jenjang (SD vs SMP)
      const itemLevel = item.level || (extractGradeNumber(item.grade_class) && Number(extractGradeNumber(item.grade_class)) >= 7 ? 'SMP' : 'SD');
      if (asgLevel && itemLevel && asgLevel !== itemLevel) {
        return false;
      }

      // c. Match Mata Pelajaran (WAJIB COCOK)
      if (!isSameSubject(item.subject_name, asg.subject_name)) return false;

      // d. Match Kelas (WAJIB ANGKA KELAS SAMA PERSIS, misal Kelas 4 vs Kelas 4)
      const itemGradeNum = extractGradeNumber(item.grade_class);
      if (!asgGradeNum || !itemGradeNum || asgGradeNum !== itemGradeNum) {
        return false;
      }

      // e. Match Penulis (Writer Attribution)
      const itemWriterId = item.writer_id ? toValidUUID(item.writer_id) : '';
      const itemWriterKey = normalizeCleanStr(item.writer_name);

      // Jika item sudah di-assign ke penulis lain, jangan klaim!
      if (itemWriterId && asgUserId && itemWriterId !== asgUserId) {
        if (itemWriterKey && asgUserKey && (itemWriterKey.includes(asgUserKey) || asgUserKey.includes(itemWriterKey))) {
          return true;
        }
        return false;
      }

      if (itemWriterKey && asgUserKey && !itemWriterKey.includes(asgUserKey) && !asgUserKey.includes(itemWriterKey)) {
        return false;
      }

      return true;
    });

    const itemIds = new Set(matchedItems.map(i => i.id));

    // 2. Filter Butir Soal di questionBank (Hanya yang benar-benar milik penugasan ini)
    const matchedQuestions = questionBank.filter(q => {
      // a. Match langsung via assignment_id
      if ((q as any).assignment_id && asgId && (q as any).assignment_id === asgId) {
        return true;
      }

      // b. Match via blueprint_item_id yang sudah terverifikasi cocok
      if (q.blueprint_item_id && itemIds.has(q.blueprint_item_id)) {
        return true;
      }

      // c. Match via metadata soal yang sudah diperkaya
      const qGradeNum = extractGradeNumber(q.grade_class || q.blueprint_item?.grade_class);
      const qSubKey = normalizeCleanStr(q.subject_name || q.blueprint_item?.subject_name);
      const qLevel = q.level || q.blueprint_item?.level || 'SD';

      // Jenjang harus sama
      if (asgLevel && qLevel && asgLevel !== qLevel) return false;

      // Subject harus cocok dan tidak boleh kosong
      if (!isSameSubject(q.subject_name || q.blueprint_item?.subject_name, asg.subject_name)) return false;

      // Kelas harus sama persis dan tidak boleh kosong
      if (!asgGradeNum || !qGradeNum || asgGradeNum !== qGradeNum) return false;

      // Penulis (jika tertera) harus cocok
      const qWriterId = ((q as any).writer_id || q.blueprint_item?.writer_id) ? toValidUUID((q as any).writer_id || q.blueprint_item?.writer_id) : '';
      const qWriterKey = normalizeCleanStr((q as any).writer_name || q.blueprint_item?.writer_name);
      if (qWriterId && asgUserId && qWriterId !== asgUserId) {
        if (qWriterKey && asgUserKey && (qWriterKey.includes(asgUserKey) || asgUserKey.includes(qWriterKey))) {
          return true;
        }
        return false;
      }

      if (qWriterKey && asgUserKey && !qWriterKey.includes(asgUserKey) && !asgUserKey.includes(qWriterKey)) {
        return false;
      }

      return true;
    });

    const writtenCount = matchedQuestions.filter(q => q.question_text?.trim()).length;
    const target = asg.target_questions || (matchedItems.length > 0 ? matchedItems.length : 5);

    return {
      items: matchedItems,
      questions: matchedQuestions,
      writtenCount,
      target
    };
  };

  // Filtered Assignments for Monitoring
  const filteredWriterAssignments = useMemo(() => {
    return writerAssignments.filter(asg => {
      if (asg.is_archived || asg.status === 'Diarsipkan') return false;

      // Filter Jenjang dari button Step 1
      if (selectedLevel && asg.level !== selectedLevel) return false;

      // Filter Jenjang & Kelas Dropdown
      if (monFilterGrade !== 'ALL') {
        if (monFilterGrade === 'SD_ALL') {
          if (asg.level !== 'SD') return false;
        } else if (monFilterGrade === 'SMP_ALL') {
          if (asg.level !== 'SMP') return false;
        } else {
          if (!asg.grade_class.toLowerCase().includes(monFilterGrade.toLowerCase())) return false;
        }
      }

      // Filter Mata Pelajaran Dropdown
      if (monFilterSubject !== 'ALL') {
        if (!asg.subject_name.toLowerCase().includes(monFilterSubject.toLowerCase())) return false;
      }

      // Filter Jenis Asesmen Dropdown
      if (monFilterAssessment !== 'ALL') {
        const matches = (asg.assessment_types || []).some(t => t.toLowerCase().includes(monFilterAssessment.toLowerCase()));
        if (!matches) return false;
      }

      // Filter Status Dropdown
      if (monFilterStatus !== 'ALL') {
        const statusInfo = getAssignmentStatusInfo(asg.status);
        if (statusInfo.key !== monFilterStatus) return false;
      }

      // Search Term (Penulis atau Judul Paket)
      if (monSearchTerm.trim()) {
        const q = monSearchTerm.toLowerCase();
        const matchWriter = (asg.user_name || '').toLowerCase().includes(q);
        const matchSubject = (asg.subject_name || '').toLowerCase().includes(q);
        const matchGrade = (asg.grade_class || '').toLowerCase().includes(q);
        const matchInst = (asg.user_institution || '').toLowerCase().includes(q);
        if (!matchWriter && !matchSubject && !matchGrade && !matchInst) return false;
      }

      return true;
    });
  }, [writerAssignments, selectedLevel, monFilterGrade, monFilterSubject, monFilterAssessment, monFilterStatus, monSearchTerm]);

  // Header Filter Realtime (Jenjang & Jenis Asesmen untuk 4 Kartu Status Penugasan)
  const [headerLevelFilter, setHeaderLevelFilter] = useState<'ALL' | 'SD' | 'SMP'>('SD');
  const [headerAssessmentFilter, setHeaderAssessmentFilter] = useState<string>('ALL');

  // Search & Filters (Global across Kisi-Kisi & Penulisan Soal)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [filterAssessment, setFilterAssessment] = useState<string>('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterWriter, setFilterWriter] = useState<string>('ALL');
  const [showClearWorkspaceModal, setShowClearWorkspaceModal] = useState<boolean>(false);
  const [isClearingWorkspace, setIsClearingWorkspace] = useState<boolean>(false);
  const [sortField, setSortField] = useState<'question_number' | 'element' | 'status'>('question_number');
  const [sortAsc, setSortAsc] = useState(true);

  // Manual Blueprint Modal State
  const [showCreateManualModal, setShowCreateManualModal] = useState(false);
  const [manualNumber, setManualNumber] = useState<number>(items.length + 1);
  const [manualSubject, setManualSubject] = useState<string>('Matematika');
  const [manualGrade, setManualGrade] = useState<string>('Kelas 4');
  const [manualAssessment, setManualAssessment] = useState<string>('SAS');
  const [manualElement, setManualElement] = useState<string>('');
  const [manualSubElement, setManualSubElement] = useState<string>('');
  const [manualCompetency, setManualCompetency] = useState<string>('');
  const [manualCognitive, setManualCognitive] = useState<CognitiveLevel>('Aplikasi (L2)');
  const [manualContext, setManualContext] = useState<string>('Personal');
  const [manualIndicator, setManualIndicator] = useState<string>('');
  const [manualType, setManualType] = useState<QuestionType>('Pilihan Ganda');
  const [manualTaskType, setManualTaskType] = useState<TaskType>('TULIS');
  const [manualWriter, setManualWriter] = useState<string>('Guru Penulis');
  const [manualReviewer, setManualReviewer] = useState<string>('Guru Penelaah');

  // Preview & In-Place Edit Modal States (Permintaan User: Gambar Mata, Edit & Simpan, Hapus)
  const [previewItem, setPreviewItem] = useState<BlueprintItem | null>(null);
  const [editingItem, setEditingItem] = useState<BlueprintItem | null>(null);

  // Helper normalisasi nama kelas (misal "Kelas 4 (Fase B)" -> "Kelas 4")
  const getNormalizedGrade = (val: string | undefined | null): string => {
    if (!val) return selectedGrade || 'Kelas 4';
    if (val.includes('Kelas 1')) return 'Kelas 1';
    if (val.includes('Kelas 2')) return 'Kelas 2';
    if (val.includes('Kelas 3')) return 'Kelas 3';
    if (val.includes('Kelas 4')) return 'Kelas 4';
    if (val.includes('Kelas 5')) return 'Kelas 5';
    if (val.includes('Kelas 6')) return 'Kelas 6';
    if (val.includes('Kelas 7')) return 'Kelas 7';
    if (val.includes('Kelas 8')) return 'Kelas 8';
    if (val.includes('Kelas 9')) return 'Kelas 9';
    return selectedGrade || 'Kelas 4';
  };

  const handleOpenEditItem = (itemToEdit: BlueprintItem) => {
    const resolvedGrade = getNormalizedGrade(itemToEdit.grade_class || selectedGrade);
    const resolvedSubject = itemToEdit.subject_name || selectedSubject || 'Matematika';
    const resolvedAssessment = itemToEdit.assessment_type || selectedAssessment || 'SAS';

    setEditingItem({
      ...itemToEdit,
      grade_class: resolvedGrade,
      subject_name: resolvedSubject,
      assessment_type: resolvedAssessment as any
    });
  };

  // Dual-Panel Alignment Inspector Modal State (Permintaan User: Split-View Kisi-Kisi & Soal Siswa CBT)
  const [dualInspectItem, setDualInspectItem] = useState<BlueprintItem | null>(null);
  const [dualInspectVariantIndex, setDualInspectVariantIndex] = useState<number>(0);
  const [inspectViewMode, setInspectViewMode] = useState<'split' | 'question-only' | 'blueprint-only'>('split');
  const [studentPreviewQuestion, setStudentPreviewQuestion] = useState<QuestionBankItem | null>(null);
  const [previewFontSize, setPreviewFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [previewAnswer, setPreviewAnswer] = useState<StudentAnswer | undefined>(undefined);
  const [previewIsFlagged, setPreviewIsFlagged] = useState<boolean>(false);

  const handleOpenStudentPreview = (item: BlueprintItem, existingQ?: QuestionBankItem, variantIndex: number = 0) => {
    setPreviewAnswer(undefined);
    setPreviewIsFlagged(false);
    setPreviewFontSize('normal');
    setInspectViewMode('split');
    setDualInspectItem(item);
    setDualInspectVariantIndex(variantIndex);

    if (existingQ) {
      setStudentPreviewQuestion({
        ...existingQ,
        blueprint_item: item,
      });
    } else {
      const syntheticQuestion: QuestionBankItem = {
        id: `preview-qb-${item.id}`,
        blueprint_item_id: item.id,
        blueprint_item: item,
        subject_id: item.subject_name || blueprint.subject?.name || 'sub-01',
        level: (item.level as any) || blueprint.level || 'SD',
        phase: (item.phase as any) || blueprint.phase || 'B',
        assessment_type: item.assessment_type || 'SAS',
        stimulus_text: item.context ? `Wacana Konteks: ${item.context}\n\nPerhatikan narasi masalah kontekstual berikut untuk menjawab soal dengan tepat.` : '',
        stimulus_media_url: '',
        stimulus_media_align: 'center',
        stimulus_media_width: '60%',
        question_text: `Berdasarkan indikator capaian "${item.indicator}", pilihlah atau tentukan jawaban yang paling tepat:`,
        question_type: item.question_type,
        weight: 10,
        status: item.workflow_status,
        options: item.question_type === 'Benar/Salah'
          ? [
              { id: '1', question_id: 'temp', option_label: '1', option_text: 'Pernyataan 1 terkait materi...', matching_pair_text: 'Benar', is_correct: true, distractor_note: 'BENAR_SALAH' },
              { id: '2', question_id: 'temp', option_label: '2', option_text: 'Pernyataan 2 terkait materi...', matching_pair_text: 'Salah', is_correct: false, distractor_note: 'BENAR_SALAH' },
              { id: '3', question_id: 'temp', option_label: '3', option_text: 'Pernyataan 3 terkait materi...', matching_pair_text: 'Benar', is_correct: true, distractor_note: 'BENAR_SALAH' },
            ]
          : item.question_type === 'Menjodohkan'
          ? [
              { id: '1', question_id: 'temp', option_label: '1', option_text: 'Pernyataan Konsep A', matching_pair_text: 'Definisi Pasangan A', is_correct: true },
              { id: '2', question_id: 'temp', option_label: '2', option_text: 'Pernyataan Konsep B', matching_pair_text: 'Definisi Pasangan B', is_correct: true },
              { id: '3', question_id: 'temp', option_label: '3', option_text: 'Pernyataan Konsep C', matching_pair_text: 'Definisi Pasangan C', is_correct: true },
            ]
          : [
              { id: '1', question_id: 'temp', option_label: 'A', option_text: 'Pilihan opsi jawaban A', is_correct: true },
              { id: '2', question_id: 'temp', option_label: 'B', option_text: 'Pilihan opsi jawaban B', is_correct: false },
              { id: '3', question_id: 'temp', option_label: 'C', option_text: 'Pilihan opsi jawaban C', is_correct: false },
              { id: '4', question_id: 'temp', option_label: 'D', option_text: 'Pilihan opsi jawaban D', is_correct: false },
            ],
        explanation: `Pembahasan Soal:\nKunci jawaban yang benar adalah opsi yang sesuai dengan indikator "${item.indicator}".\nLangkah penyelesaian:\n1. Pahami stimulus dan identifikasi data yang relevan.\n2. Gunakan konsep atau rumus materi yang tepat.\n3. Periksa kembali kecocokan opsi jawaban.`,
        updated_at: new Date().toISOString(),
      };
      setStudentPreviewQuestion(syntheticQuestion);
    }
  };

  // Import & Download Template Wizard Modal State (Permintaan User)
  const [showImportWizardModal, setShowImportWizardModal] = useState(false);
  const [importLevel, setImportLevel] = useState<SchoolLevel>('SD');
  const [importSubject, setImportSubject] = useState<string>('Matematika');
  const [importGrade, setImportGrade] = useState<string>('Kelas 4');
  const [importPhase, setImportPhase] = useState<string>('B');
  const [importAssessment, setImportAssessment] = useState<string>('SAS');
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Import Confirmation Popup State (Permintaan User)
  interface ImportPreviewData {
    items: BlueprintItem[];
    metadata: {
      level: SchoolLevel;
      subject_name: string;
      grade_class: string;
      phase: string;
      assessment_type: string;
    };
    fileName: string;
    existingCount: number;
    maxExistingNum: number;
    hasCollision: boolean;
    importMode: 'append_renumber' | 'replace_all';
  }
  const [importPreviewData, setImportPreviewData] = useState<ImportPreviewData | null>(null);
  const [isSavingImport, setIsSavingImport] = useState(false);

  // Butir efektif yang akan disimpan (mendukung penomoran otomatis melanjutkan nomor lama)
  const effectiveImportItems = useMemo(() => {
    if (!importPreviewData) return [];
    const { items: rawItems, importMode, existingCount, maxExistingNum } = importPreviewData;
    if (importMode === 'append_renumber' && existingCount > 0) {
      return rawItems.map((item, idx) => ({
        ...item,
        question_number: maxExistingNum + idx + 1,
        original_number: item.question_number
      } as BlueprintItem & { original_number?: number }));
    }
    return rawItems;
  }, [importPreviewData]);

  // Compute Phase from Grade
  const getPhaseFromGrade = (grade: string): string => {
    if (grade.includes('Kelas 1') || grade.includes('Kelas 2')) return 'A';
    if (grade.includes('Kelas 3') || grade.includes('Kelas 4')) return 'B';
    if (grade.includes('Kelas 5') || grade.includes('Kelas 6')) return 'C';
    return 'D';
  };

  const handleOpenImportWizard = () => {
    setModalFeedback(null);
    const defaultLevel = selectedLevel || (filterGrade.includes('Kelas 7') || filterGrade.includes('Kelas 8') || filterGrade.includes('Kelas 9') ? 'SMP' : 'SD');
    setImportLevel(defaultLevel);
    if (selectedSubject) {
      setImportSubject(selectedSubject);
    } else if (filterSubject !== 'ALL') {
      setImportSubject(filterSubject);
    } else {
      const firstSub = availableSubjects.find(s => s.level === defaultLevel);
      setImportSubject(firstSub ? firstSub.name : 'Matematika');
    }
    const defaultGrd = selectedGrade || (filterGrade !== 'ALL' ? filterGrade : (defaultLevel === 'SD' ? 'Kelas 4' : 'Kelas 7'));
    setImportGrade(defaultGrd);
    setImportPhase(getPhaseFromGrade(defaultGrd));
    setImportAssessment(selectedAssessment || (filterAssessment !== 'ALL' ? filterAssessment : 'SAS'));
    setShowImportWizardModal(true);
  };

  const handleImportLevelChange = (lvl: SchoolLevel) => {
    setImportLevel(lvl);
    const newGrd = lvl === 'SD' ? 'Kelas 4' : 'Kelas 7';
    setImportGrade(newGrd);
    setImportPhase(getPhaseFromGrade(newGrd));
    const subForLvl = availableSubjects.find(s => s.level === lvl);
    if (subForLvl) setImportSubject(subForLvl.name);
  };

  const handleImportGradeChange = (grd: string) => {
    setImportGrade(grd);
    setImportPhase(getPhaseFromGrade(grd));
  };

  const handleDownloadCustomTemplate = () => {
    try {
      downloadBlueprintTemplate(blueprint, {
        level: importLevel,
        subject_name: importSubject,
        grade_class: importGrade,
        phase: importPhase,
        assessment_type: importAssessment
      });
      const successMsg = `Template Excel untuk ${importSubject} (${importGrade} • ${importAssessment}) berhasil diunduh.`;
      setExcelFeedback({
        type: 'success',
        message: successMsg
      });
      setModalFeedback({
        type: 'success',
        message: `Template Excel (${importSubject} - ${importGrade} - ${importAssessment}) berhasil diunduh ke perangkat Anda!`
      });
      setTimeout(() => {
        setExcelFeedback(null);
        setModalFeedback(null);
      }, 7000);
    } catch (err: any) {
      const errMsg = `Gagal mengunduh template: ${err.message}`;
      setExcelFeedback({
        type: 'error',
        message: errMsg
      });
      setModalFeedback({
        type: 'error',
        message: errMsg
      });
    }
  };

  const handleImportWithMetadata = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedItems = await parseBlueprintFromExcel(file, blueprint.id, {
        level: importLevel,
        subject_name: importSubject,
        grade_class: importGrade,
        phase: importPhase,
        assessment_type: importAssessment
      });

      if (!importedItems || importedItems.length === 0) {
        throw new Error('Tidak ada butir kisi-kisi yang dapat dibaca dari file Excel. Pastikan format tabel sesuai dengan template.');
      }

      // Periksa apakah modul ini sudah memiliki data butir di state/database
      const targetExistingItems = items.filter(
        i => (i.subject_name === importSubject) && 
             (i.grade_class === importGrade) && 
             ((i.assessment_type || 'SAS') === importAssessment)
      );
      const existingCount = targetExistingItems.length;
      const maxExistingNum = existingCount > 0 ? Math.max(...targetExistingItems.map(i => i.question_number)) : 0;
      const existingNumSet = new Set(targetExistingItems.map(i => i.question_number));
      const hasCollision = importedItems.some(i => existingNumSet.has(i.question_number));

      // Tutup Wizard dan buka Modal Konfirmasi Pratinjau Impor
      setShowImportWizardModal(false);
      setImportPreviewData({
        items: importedItems,
        metadata: {
          level: importLevel,
          subject_name: importSubject,
          grade_class: importGrade,
          phase: importPhase,
          assessment_type: importAssessment
        },
        fileName: file.name,
        existingCount,
        maxExistingNum,
        hasCollision,
        importMode: existingCount > 0 ? 'append_renumber' : 'replace_all'
      });
    } catch (err: any) {
      setExcelFeedback({
        type: 'error',
        message: `Gagal membaca file Excel: ${err.message}`
      });
      setModalFeedback({
        type: 'error',
        message: `Gagal membaca file Excel: ${err.message}`
      });
    } finally {
      e.target.value = '';
    }
  };

  // Simpan Seluruh Data Impor Langsung ke Supabase Cloud (Permintaan User: Proteksi Data & Lanjutan Nomor)
  const handleConfirmSaveImport = async () => {
    if (!importPreviewData || importPreviewData.items.length === 0) return;

    setIsSavingImport(true);
    const { metadata, importMode, existingCount } = importPreviewData;
    const itemsToProcess = effectiveImportItems;

    const currentWriterId = currentUser?.id || initialScope?.assignment?.user_id || null;
    const currentWriterName = currentUser?.full_name || currentUser?.name || initialScope?.assignment?.user_name || undefined;

    try {
      // 1. Dapatkan atau buat blueprint ID di Supabase Cloud sesuai nama kelas & fase spesifik
      const bpId = await getOrCreateBlueprintId(
        metadata.subject_name,
        metadata.level,
        metadata.phase,
        metadata.assessment_type,
        metadata.grade_class
      );

      let itemsWithBpId: BlueprintItem[] = [];

      if (importMode === 'append_renumber' && existingCount > 0) {
        // =========================================================================
        // MODE A: TAMBAHKAN SEBAGAI SOAL BARU (Seluruh kisi-kisi lama aman 100%)
        // =========================================================================
        itemsWithBpId = itemsToProcess.map(it => ({
          ...it,
          id: generateValidUUID(),
          blueprint_id: bpId,
          level: metadata.level,
          phase: metadata.phase,
          grade_class: metadata.grade_class,
          subject_name: metadata.subject_name,
          assessment_type: metadata.assessment_type as any,
          writer_id: currentWriterId || it.writer_id,
          writer_name: currentWriterName || it.writer_name
        }));

        // Simpan hanya butir-butir baru ke Supabase
        const rowsToInsert = itemsWithBpId.map(item => formatBlueprintItemForCloud(item, bpId));
        const upsertRes = await safeSupabaseUpsert('blueprint_items', rowsToInsert);
        if (!upsertRes.success) {
          throw new Error(upsertRes.error?.message || 'Gagal menyimpan butir baru ke database');
        }

        // Sinkronisasi metadata penulis secara batch atomik ke context_presets
        await saveBlueprintItemWritersBatchToCloud(itemsWithBpId);

        // Gabungkan butir lama modul ini dengan butir baru
        const existingForThisModule = items.filter(
          i => i.subject_name === metadata.subject_name && 
               i.grade_class === metadata.grade_class && 
               (i.assessment_type || 'SAS') === metadata.assessment_type
        );
        const otherModules = items.filter(
          i => !(
            i.subject_name === metadata.subject_name && 
            i.grade_class === metadata.grade_class && 
            (i.assessment_type || 'SAS') === metadata.assessment_type
          )
        );

        const merged = [...otherModules, ...existingForThisModule, ...itemsWithBpId];
        setItems(merged);
        try {
          localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(merged));
        } catch (e) {}

        const firstNum = itemsWithBpId[0]?.question_number;
        const lastNum = itemsWithBpId[itemsWithBpId.length - 1]?.question_number;
        setExcelFeedback({
          type: 'success',
          message: `Berhasil menambahkan ${itemsWithBpId.length} butir kisi-kisi baru (No. ${firstNum}–${lastNum})! Seluruh ${existingForThisModule.length} butir lama tetap aman tanpa tertimpa.`
        });

      } else {
        // =========================================================================
        // MODE B: TIMPA / PERBARUI SELURUH KISI-KISI
        // =========================================================================
        const { data: existingBpItems } = await supabase
          .from('blueprint_items')
          .select('id, question_number')
          .eq('blueprint_id', bpId);

        const existingMap = new Map<number, string>();
        if (existingBpItems) {
          existingBpItems.forEach(it => existingMap.set(it.question_number, it.id));
        }

        itemsWithBpId = itemsToProcess.map(it => {
          const preservedId = existingMap.get(it.question_number);
          return {
            ...it,
            id: preservedId || toValidUUID(it.id),
            blueprint_id: bpId,
            level: metadata.level,
            phase: metadata.phase,
            grade_class: metadata.grade_class,
            subject_name: metadata.subject_name,
            assessment_type: metadata.assessment_type as any,
            writer_id: currentWriterId || it.writer_id,
            writer_name: currentWriterName || it.writer_name
          };
        });

        // Hapus hanya butir lama yang nomornya tidak ada lagi di file Excel baru
        const newQuestionNums = new Set(itemsToProcess.map(i => i.question_number));
        const idsToDelete = (existingBpItems || [])
          .filter(old => !newQuestionNums.has(old.question_number))
          .map(old => old.id);

        if (idsToDelete.length > 0) {
          await supabase.from('blueprint_items').delete().in('id', idsToDelete);
        }

        const rowsToInsert = itemsWithBpId.map(item => formatBlueprintItemForCloud(item, bpId));
        const upsertRes = await safeSupabaseUpsert('blueprint_items', rowsToInsert);
        if (!upsertRes.success) {
          throw new Error(upsertRes.error?.message || 'Gagal menyimpan ke database Supabase');
        }

        // Sinkronisasi metadata penulis secara batch atomik ke context_presets
        await saveBlueprintItemWritersBatchToCloud(itemsWithBpId);

        const otherItems = items.filter(
          i => !(
            i.subject_name === metadata.subject_name && 
            i.grade_class === metadata.grade_class && 
            (i.assessment_type || 'SAS') === metadata.assessment_type
          )
        );
        const merged = [...otherItems, ...itemsWithBpId];
        setItems(merged);
        try {
          localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(merged));
        } catch (e) {}

        setExcelFeedback({
          type: 'success',
          message: `Berhasil memperbarui kisi-kisi (${itemsWithBpId.length} butir) untuk ${metadata.subject_name}!`
        });
      }

      // Update filter dan tutup modal
      setFilterSubject(metadata.subject_name);
      setFilterGrade(metadata.grade_class);
      setFilterAssessment(metadata.assessment_type);
      setImportPreviewData(null);
      setTimeout(() => setExcelFeedback(null), 6000);
    } catch (err: any) {
      console.error('Save import error:', err);
      alert(`Gagal menyimpan data ke database Supabase: ${err?.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsSavingImport(false);
    }
  };

  // Blueprint Item CRUD Handlers (Pratinjau, Edit & Simpan, Hapus)
  const handleDeleteBlueprintItem = async (itemToDelete: BlueprintItem) => {
    if (window.confirm(`Hapus butir kisi-kisi No. ${itemToDelete.question_number} (${itemToDelete.element} - ${itemToDelete.indicator.slice(0, 45)}...)?`)) {
      const updated = items.filter(i => i.id !== itemToDelete.id);
      setItems(updated);
      try {
        localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(updated));
      } catch (e) {}

      try {
        const validDeleteId = toValidUUID(itemToDelete.id);
        await supabase.from('blueprint_items').delete().eq('id', validDeleteId);
        await deleteBlueprintItemWriterFromCloud(itemToDelete.id);
      } catch (e) {}

      setExcelFeedback({
        type: 'success',
        message: `Butir kisi-kisi No. ${itemToDelete.question_number} berhasil dihapus.`
      });
      setTimeout(() => setExcelFeedback(null), 4000);
    }
  };

  const handleSaveEditBlueprintItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const lvl = (editingItem.grade_class || '').includes('Kelas 7') || (editingItem.grade_class || '').includes('Kelas 8') || (editingItem.grade_class || '').includes('Kelas 9') ? 'SMP' : 'SD';
    const phs = getPhaseFromGrade(editingItem.grade_class || 'Kelas 4');

    // 1. Resolve blueprint ID yang benar sesuai mata pelajaran, jenjang, fase, dan kelas item ini
    let targetBpId = editingItem.blueprint_id;
    try {
      const resolvedBp = await getOrCreateBlueprintId(
        editingItem.subject_name || selectedSubject || 'Matematika',
        lvl,
        phs,
        editingItem.assessment_type || selectedAssessment || 'SAS',
        editingItem.grade_class || selectedGrade
      );
      if (resolvedBp) {
        targetBpId = resolvedBp;
      }
    } catch (e) {
      if (!isValidUUID(targetBpId)) {
        targetBpId = toValidUUID(targetBpId);
      }
    }

    const resolvedWriterId = editingItem.writer_id || currentUser?.id || initialScope?.assignment?.user_id || null;
    const resolvedWriterName = editingItem.writer_name || currentUser?.full_name || currentUser?.name || initialScope?.assignment?.user_name || 'Guru Penulis';

    const itemToSave: BlueprintItem = {
      ...editingItem,
      blueprint_id: targetBpId,
      writer_id: resolvedWriterId,
      writer_name: resolvedWriterName,
      level: lvl,
      phase: phs,
      updated_at: new Date().toISOString()
    };

    const updated = items.map(i => i.id === editingItem.id ? itemToSave : i);
    setItems(updated);
    try {
      localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(updated));
    } catch (e) {}

    try {
      const payload = formatBlueprintItemForCloud(itemToSave, targetBpId);
      const validId = toValidUUID(editingItem.id);

      // Eksekusi update langsung ke Supabase Cloud berdasarkan ID butir
      const { data: updateRes, error: updateErr } = await supabase
        .from('blueprint_items')
        .update({
          blueprint_id: payload.blueprint_id,
          question_number: payload.question_number,
          element: payload.element,
          sub_element: payload.sub_element,
          competency: payload.competency,
          question_category: payload.question_category,
          cognitive_level: payload.cognitive_level,
          context: payload.context,
          indicator: payload.indicator,
          question_type: payload.question_type,
          writer_id: payload.writer_id,
          task_type: payload.task_type,
          workflow_status: payload.workflow_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', validId)
        .select();

      // Sinkronisasi metadata penulis ke context_presets (Universal Dual Engine)
      await saveBlueprintItemWriterToCloud(editingItem.id, resolvedWriterId, resolvedWriterName);

      if (updateErr) {
        console.warn('[Supabase Sync] Update blueprint_items error, mencoba fallback upsert:', updateErr);
        const res = await safeSupabaseUpsert('blueprint_items', payload);
        if (!res.success) {
          throw new Error(res.error?.message || updateErr.message);
        }
      } else if (!updateRes || updateRes.length === 0) {
        // Jika belum ada di DB (misal baru dibuat di lokal), lakukan upsert
        const res = await safeSupabaseUpsert('blueprint_items', payload);
        if (!res.success) {
          throw new Error(res.error?.message || 'Gagal menyimpan ke database cloud');
        }
      }

      // Sinkronkan juga question_type pada question_bank jika soal sudah pernah dibuat untuk butir ini
      try {
        await supabase
          .from('question_bank')
          .update({
            question_type: payload.question_type,
            updated_at: new Date().toISOString()
          })
          .eq('blueprint_item_id', validId);
      } catch (qbSyncErr) {}

      setCloudStatus('connected');
      setExcelFeedback({
        type: 'success',
        message: `Perubahan butir kisi-kisi No. ${editingItem.question_number} (${editingItem.element}) berhasil disimpan permanen ke Database Supabase!`
      });
      setTimeout(() => setExcelFeedback(null), 4000);
      setEditingItem(null);

      // Tampilkan Pop-Up Notifikasi Berhasil Simpan Kisi-Kisi di Layar Saat Ini (Current Viewport)
      setSaveSuccessNotification({
        isOpen: true,
        type: 'blueprint',
        title: 'Kisi-Kisi Berhasil Disimpan!',
        description: 'Perubahan butir kisi-kisi telah sukses disimpan secara permanen ke database SASI.',
        questionNumber: editingItem.question_number,
        element: editingItem.element,
        questionType: editingItem.question_type,
        cognitiveLevel: editingItem.cognitive_level,
        indicator: editingItem.indicator,
        isCloudSynced: true,
        blueprintItem: itemToSave
      });
    } catch (saveErr: any) {
      console.error('Error saat menyimpan butir kisi-kisi:', saveErr);
      setExcelFeedback({
        type: 'error',
        message: `Peringatan: Gagal memperbarui data di Cloud Database: ${saveErr?.message || 'Koneksi error'}`
      });
      setTimeout(() => setExcelFeedback(null), 6000);
      setEditingItem(null);
    }
  };

  // Modal State for Question Editor (Mendukung Multi-Varian Soal per Kisi-Kisi)
  const [selectedItemForEditor, setSelectedItemForEditor] = useState<BlueprintItem | null>(null);
  const [selectedQuestionForEditor, setSelectedQuestionForEditor] = useState<QuestionBankItem | null>(null);
  const [selectedVariantNumber, setSelectedVariantNumber] = useState<number>(1);

  // Popup Pemberitahuan Berhasil Simpan Soal & Kisi-Kisi ke Database (Permintaan User)
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<{
    isOpen: boolean;
    type?: 'question' | 'blueprint';
    title?: string;
    description?: string;
    questionNumber?: number;
    variantNumber?: number;
    questionType?: string;
    element?: string;
    cognitiveLevel?: string;
    indicator?: string;
    isCloudSynced: boolean;
    savedQuestion?: QuestionBankItem;
    blueprintItem?: BlueprintItem;
  } | null>(null);

  // Aksesibilitas Keyboard (Enter / Escape) untuk menutup pop-up notifikasi simpan
  useEffect(() => {
    if (!saveSuccessNotification?.isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        setSaveSuccessNotification(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveSuccessNotification?.isOpen]);

  const handleOpenEditorForVariant = (item: BlueprintItem, existingQ?: QuestionBankItem | null, variantNum: number = 1) => {
    setSelectedItemForEditor(item);
    setSelectedQuestionForEditor(existingQ || null);
    setSelectedVariantNumber(variantNum);
  };

  // Bank Soal Filter & Display State (Soal baru muncul ketika tombol diklik, atau otomatis jika locked scope)
  const [showBankQuestions, setShowBankQuestions] = useState(Boolean(initialScope?.isLocked));
  const [bankFilterSubject, setBankFilterSubject] = useState(initialScope?.subject || 'ALL');
  const [bankFilterGrade, setBankFilterGrade] = useState(initialScope?.grade || 'ALL');
  const [bankFilterAssessment, setBankFilterAssessment] = useState(initialScope?.assessment || 'ALL');
  const [bankFilterType, setBankFilterType] = useState('ALL');
  const [bankFilterCognitive, setBankFilterCognitive] = useState('ALL');
  const [bankFilterStatus, setBankFilterStatus] = useState('ALL');

  // Excel feedback state
  const [excelFeedback, setExcelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Available Presets for this subject
  const contextPresets = getContextOptionsForSubject(blueprint.subject?.name || 'Matematika');

  // Excel Handlers
  const handleExportExcel = () => {
    try {
      exportBlueprintToExcel(blueprint, items);
      setExcelFeedback({
        type: 'success',
        message: 'File Excel pemetaan kisi-kisi (Format A4 Margin 1.5 cm) berhasil diunduh.'
      });
      setTimeout(() => setExcelFeedback(null), 5000);
    } catch (err: any) {
      setExcelFeedback({
        type: 'error',
        message: `Gagal mengekspor file: ${err.message}`
      });
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const activeLvl = selectedLevel || (selectedGrade.includes('Kelas 7') || selectedGrade.includes('Kelas 8') || selectedGrade.includes('Kelas 9') ? 'SMP' : 'SD');
      const activeSub = selectedSubject || 'Matematika';
      const activeGrd = selectedGrade || (activeLvl === 'SD' ? 'Kelas 4' : 'Kelas 7');
      const activeAsmt = selectedAssessment || 'SAS';
      const activePhs = getPhaseFromGrade(activeGrd);

      downloadBlueprintTemplate(blueprint, {
        level: activeLvl,
        subject_name: activeSub,
        grade_class: activeGrd,
        phase: activePhs,
        assessment_type: activeAsmt
      });
      setExcelFeedback({
        type: 'success',
        message: `Template Excel (${activeSub} - ${activeGrd} - ${activeAsmt}) berhasil diunduh.`
      });
      setTimeout(() => setExcelFeedback(null), 5000);
    } catch (err: any) {
      setExcelFeedback({
        type: 'error',
        message: `Gagal mengunduh template: ${err.message}`
      });
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedItems = await parseBlueprintFromExcel(file, blueprint.id);
      
      const bpId = await getOrCreateBlueprintId(
        blueprint.subject?.name || 'Matematika', 
        blueprint.level || 'SD', 
        blueprint.phase || 'B', 
        blueprint.assessment_type || 'SAS',
        selectedGrade
      );

      // Cari ID butir lama agar soal yang sudah pernah ditulis di Bank Soal tidak putus tautannya
      const { data: existingBpItems } = await supabase
        .from('blueprint_items')
        .select('id, question_number')
        .eq('blueprint_id', bpId);

      const existingMap = new Map<number, string>();
      if (existingBpItems) {
        existingBpItems.forEach(it => existingMap.set(it.question_number, it.id));
      }

      const currentWriterId = currentUser?.id || initialScope?.assignment?.user_id || null;
      const currentWriterName = currentUser?.full_name || currentUser?.name || initialScope?.assignment?.user_name || undefined;

      const itemsWithBpId: BlueprintItem[] = importedItems.map(item => {
        const preservedId = existingMap.get(item.question_number);
        return {
          ...item,
          id: preservedId || toValidUUID(item.id),
          blueprint_id: bpId,
          subject_name: item.subject_name || blueprint.subject?.name || 'Matematika',
          grade_class: item.grade_class || selectedGrade,
          assessment_type: item.assessment_type || blueprint.assessment_type || 'SAS',
          writer_id: item.writer_id || currentWriterId,
          writer_name: item.writer_name || currentWriterName
        };
      });
      
      // Update state & localStorage
      try {
        localStorage.removeItem('sasi_blueprint_reset_done');
      } catch (e) {}
      setItems(itemsWithBpId);
      localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(itemsWithBpId));

      // Asynchronous background sync to Supabase if available via safe upsert
      const rowsToInsert = itemsWithBpId.map(item => formatBlueprintItemForCloud(item, bpId));
      const upsertRes = await safeSupabaseUpsert('blueprint_items', rowsToInsert);
      if (!upsertRes.success) {
        throw new Error(upsertRes.error?.message || 'Gagal menyimpan data butir kisi-kisi ke database');
      }
      await saveBlueprintItemWritersBatchToCloud(itemsWithBpId);

      setExcelFeedback({
        type: 'success',
        message: `Berhasil mengimpor ${importedItems.length} butir kisi-kisi dari file Excel!`
      });
      setTimeout(() => setExcelFeedback(null), 5000);
    } catch (err: any) {
      setExcelFeedback({
        type: 'error',
        message: `Gagal mengimpor file Excel: ${err.message}`
      });
    } finally {
      // Reset input value so same file can be re-uploaded if needed
      e.target.value = '';
    }
  };

  // State & Handlers for Reset, Backup, and Restore (Super Admin Only)
  const [isResetting, setIsResetting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper: Cek apakah suatu item berada dalam slot filter bertingkat aktif saat ini
  const isScopedFilter = Boolean(selectedLevel && selectedGrade && selectedSubject && selectedAssessment);

  const isItemInCurrentScope = (item: BlueprintItem): boolean => {
    if (!isScopedFilter) return true;

    // 1. Grade match
    const itemGrade = (item.grade_class || '').toLowerCase();
    const selGrade = (selectedGrade || '').toLowerCase();
    const gradeNum = (selectedGrade || '').replace(/\D/g, '');
    const matchG = itemGrade.includes(selGrade) || (gradeNum ? itemGrade.includes(gradeNum) : false);
    if (!matchG) return false;

    // 2. Subject match
    const matchS = isSameSubject(item.subject_name, selectedSubject);
    if (!matchS) return false;

    // 3. Assessment match
    const itemAsmt = (item.assessment_type || blueprint.assessment_type || 'SAS').toUpperCase();
    const selAsmt = (selectedAssessment || '').toUpperCase();
    if (selAsmt === 'SUMATIF') {
      const isSumatif = itemAsmt === 'SUMATIF' || itemAsmt === 'STS' || itemAsmt === 'PTS';
      if (!isSumatif) return false;
    } else if (itemAsmt !== selAsmt) {
      return false;
    }

    // 4. Level match
    const isSMP = item.level === 'SMP' || item.phase === 'D' || itemGrade.includes('kelas 7') || itemGrade.includes('kelas 8') || itemGrade.includes('kelas 9');
    const itemLvl = isSMP ? 'SMP' : 'SD';
    if (itemLvl !== selectedLevel) return false;

    // 5. Isolasi Penulis untuk Guru Penugasan (Solusi A) & Filter Penulis untuk Admin (Solusi C)
    if (currentUser?.role === 'teacher' || initialScope?.assignment) {
      const curId = currentUser?.id || initialScope?.assignment?.user_id;
      const curName = (currentUser?.full_name || currentUser?.name || initialScope?.assignment?.user_name || '').toLowerCase().trim();
      const itemWriterId = item.writer_id;
      const itemWriterName = (item.writer_name || '').toLowerCase().trim();

      const matchId = Boolean(curId && itemWriterId && (itemWriterId === curId || toValidUUID(itemWriterId) === toValidUUID(curId)));
      const matchName = Boolean(curName && itemWriterName && (itemWriterName === curName || itemWriterName.includes(curName) || curName.includes(itemWriterName)));

      if (!matchId && !matchName) return false;
    } else if (filterWriter && filterWriter !== 'ALL') {
      const itemWriterId = item.writer_id;
      const matchW = itemWriterId === filterWriter || (item.writer_name && item.writer_name === filterWriter);
      if (!matchW) return false;
    }

    return true;
  };

  // 1. Reset Kisi-Kisi & Butir Soal (Terisolasi per Kriteria Bertingkat atau Global)
  const handleResetBlueprintAndQuestions = async () => {
    if (!isSuperAdmin) {
      alert('Akses Ditolak: Fitur Reset hanya diizinkan untuk Super Admin.');
      return;
    }

    // A. RESET TERISOLASI KHUSUS SLOT FILTER AKTIF
    if (isScopedFilter) {
      const slotDesc = `${selectedSubject} (${selectedGrade} • ${selectedLevel} • Asesmen ${selectedAssessment})`;
      const targetItems = items.filter(isItemInCurrentScope);
      const targetItemIds = new Set(targetItems.map(i => i.id));
      const targetQuestions = questionBank.filter(q => q.blueprint_item_id && targetItemIds.has(q.blueprint_item_id));
      const targetQuestionIds = new Set(targetQuestions.map(q => q.id));

      const firstConfirm = window.confirm(
        `PERINGATAN: Apakah Anda yakin ingin MENGHAPUS data kisi-kisi dan butir soal HANYA untuk:\n\n` +
        `• Jenjang: ${selectedLevel}\n` +
        `• Tingkat Kelas: ${selectedGrade}\n` +
        `• Mata Pelajaran: ${selectedSubject}\n` +
        `• Jenis Asesmen: ${selectedAssessment}\n\n` +
        `Data yang akan dihapus: ${targetItems.length} butir kisi-kisi & ${targetQuestions.length} butir soal.\n\n` +
        `✅ AMAN: Data mata pelajaran, kelas, dan asesmen lainnya TIDAK AKAN TERPENGARUH SAMA SEKALI.`
      );
      if (!firstConfirm) return;

      setIsResetting(true);
      try {
        // 1. Bersihkan di lokal (pertahankan data mapel & kelas lain!)
        const remainingItems = items.filter(i => !isItemInCurrentScope(i));
        const remainingQuestions = questionBank.filter(q => !q.blueprint_item_id || !targetItemIds.has(q.blueprint_item_id));

        setItems(remainingItems);
        setQuestionBank(remainingQuestions);
        localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(remainingItems));
        localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(remainingQuestions));

        // 2. Hapus di Supabase Cloud hanya untuk ID-ID item slot ini
        if (targetQuestionIds.size > 0) {
          const validQuestionIds = Array.from(targetQuestionIds).map(id => toValidUUID(id));
          await supabase.from('question_options').delete().in('question_id', validQuestionIds);
          await supabase.from('question_bank').delete().in('id', validQuestionIds);
        }

        if (targetItemIds.size > 0) {
          const validItemIds = Array.from(targetItemIds).map(id => toValidUUID(id));
          await supabase.from('blueprint_items').delete().in('id', validItemIds);
        }

        // Coba juga hapus berdasarkan blueprint container jika ada
        try {
          const bpId = await getOrCreateBlueprintId(selectedSubject!, selectedLevel!, getPhaseFromGrade(selectedGrade!), selectedAssessment!);
          if (bpId) {
            await supabase.from('blueprint_items').delete().eq('blueprint_id', bpId);
          }
        } catch (bpErr) {}

        setExcelFeedback({
          type: 'success',
          message: `Sukses! Data kisi-kisi & soal untuk ${slotDesc} berhasil direset secara bersih. Data mapel dan kelas lainnya tetap aman!`
        });
        setTimeout(() => setExcelFeedback(null), 5000);
      } catch (err: any) {
        console.error('Scoped reset error:', err);
        setExcelFeedback({
          type: 'error',
          message: `Gagal mereset data slot: ${err?.message || 'Terjadi kesalahan sistem'}`
        });
      } finally {
        setIsResetting(false);
      }
      return;
    }

    // B. RESET GLOBAL (Hanya jika pengguna berada di luar filter bertingkat)
    const firstConfirm = window.confirm(
      'PERINGATAN GLOBAL: Anda sedang berada di luar filter spesifik.\n\n' +
      'Apakah Anda yakin ingin MENGHAPUS SEMUA data kisi-kisi dan butir soal dari seluruh kelas dan seluruh mata pelajaran?\n\n' +
      'Data akan dihapus permanen dari Cloud Database Supabase dan penyimpanan lokal.'
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      'KONFIRMASI AKHIR GLOBAL: Tindakan ini TIDAK DAPAT DIBATALKAN.\n\nKlik OK untuk mengosongkan seluruh kisi-kisi dan butir soal sekarang.'
    );
    if (!secondConfirm) return;

    setIsResetting(true);
    try {
      setItems([]);
      setQuestionBank([]);
      localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify([]));
      localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify([]));
      localStorage.setItem('sasi_blueprint_reset_done', 'true');

      const dummyUUID = '00000000-0000-0000-0000-000000000000';
      await supabase.from('question_options').delete().neq('id', dummyUUID);
      await supabase.from('question_bank').delete().neq('id', dummyUUID);
      await supabase.from('blueprint_items').delete().neq('id', dummyUUID);

      setExcelFeedback({
        type: 'success',
        message: 'Semua data kisi-kisi dan butir soal berhasil direset secara bersih dari Cloud Database dan lokal!'
      });
      setTimeout(() => setExcelFeedback(null), 5000);
    } catch (err: any) {
      console.error('Reset error:', err);
      setExcelFeedback({
        type: 'error',
        message: `Gagal mereset data: ${err?.message || 'Terjadi kesalahan sistem'}`
      });
    } finally {
      setIsResetting(false);
    }
  };

  // 2. Cadangkan Data (Backup JSON - Terisolasi per Kriteria Bertingkat atau Global)
  const handleExportBackup = () => {
    try {
      const isScoped = isScopedFilter;
      const targetItems = isScoped ? items.filter(isItemInCurrentScope) : items;
      const targetItemIds = new Set(targetItems.map(i => i.id));
      const targetQuestions = isScoped 
        ? questionBank.filter(q => q.blueprint_item_id && targetItemIds.has(q.blueprint_item_id))
        : questionBank;

      const dateStr = new Date().toISOString().slice(0, 10);
      const safeSub = (selectedSubject || 'Semua-Mapel').replace(/[^a-zA-Z0-9]/g, '_');
      const safeGrade = (selectedGrade || 'Semua-Kelas').replace(/[^a-zA-Z0-9]/g, '_');
      const safeAsmt = (selectedAssessment || 'Semua-Asesmen').replace(/[^a-zA-Z0-9]/g, '_');

      const fileName = isScoped
        ? `backup-${selectedLevel}-${safeGrade}-${safeSub}-${safeAsmt}-${dateStr}.json`
        : `backup-kisi-kisi-dan-soal-semua-${dateStr}.json`;

      const backupData = {
        app: 'SASI - Sistem Asesmen Sekolah Indonesia',
        version: '1.0',
        scope: isScoped ? 'scoped_slot' : 'global',
        metadata: isScoped ? {
          level: selectedLevel,
          grade_class: selectedGrade,
          subject_name: selectedSubject,
          assessment_type: selectedAssessment,
          phase: getPhaseFromGrade(selectedGrade || 'Kelas 4')
        } : null,
        exported_at: new Date().toISOString(),
        exported_by: currentUser?.full_name || 'Super Admin',
        total_blueprint_items: targetItems.length,
        total_questions: targetQuestions.length,
        blueprint_items: targetItems,
        question_bank: targetQuestions
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExcelFeedback({
        type: 'success',
        message: isScoped
          ? `Cadangan data (${targetItems.length} kisi-kisi & ${targetQuestions.length} butir soal) untuk ${selectedSubject} (${selectedGrade} • ${selectedAssessment}) berhasil diunduh sebagai file JSON!`
          : `Cadangan data global (${items.length} kisi-kisi & ${questionBank.length} butir soal) berhasil diunduh!`
      });
      setTimeout(() => setExcelFeedback(null), 5000);
    } catch (err: any) {
      setExcelFeedback({
        type: 'error',
        message: `Gagal mencadangkan data: ${err?.message}`
      });
    }
  };

  // 3. Pulihkan Data (Restore Backup JSON - Terisolasi per Kriteria Bertingkat atau Global)
  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      const text = await file.text();
      const parsed = JSON.parse(text);

      const importedItems: BlueprintItem[] = Array.isArray(parsed.blueprint_items) ? parsed.blueprint_items : [];
      const importedQuestions: QuestionBankItem[] = Array.isArray(parsed.question_bank) ? parsed.question_bank : [];

      if (importedItems.length === 0 && importedQuestions.length === 0) {
        throw new Error('File backup JSON tidak memiliki data kisi-kisi atau butir soal yang valid.');
      }

      // Periksa apakah backup adalah file scoped / kriteria khusus
      const fileMeta = parsed.metadata;
      const isScopedFile = parsed.scope === 'scoped_slot' || Boolean(fileMeta);

      const targetLvl = fileMeta?.level || selectedLevel || 'SD';
      const targetGrd = fileMeta?.grade_class || selectedGrade || 'Kelas 4';
      const targetSub = fileMeta?.subject_name || selectedSubject || 'Matematika';
      const targetAsmt = fileMeta?.assessment_type || selectedAssessment || 'SAS';

      const confirmMsg = isScopedFilter || isScopedFile
        ? `Ditemukan cadangan terisolasi:\n` +
          `• Target: ${targetSub} (${targetGrd} • ${targetLvl} • Asesmen ${targetAsmt})\n` +
          `• Kisi-kisi: ${importedItems.length} butir\n` +
          `• Soal: ${importedQuestions.length} butir\n\n` +
          `✅ Pemulihan HANYA akan mengganti data untuk slot ${targetSub} (${targetGrd} • ${targetAsmt}). Data mapel/kelas lain TIDAK akan tertimpa.\n\n` +
          `Lanjutkan pemulihan dan sinkronisasi ke Cloud Database?`
        : `Ditemukan data cadangan:\n` +
          `• Kisi-kisi: ${importedItems.length} butir\n` +
          `• Soal: ${importedQuestions.length} butir\n\n` +
          `Apakah Anda ingin memulihkan data ini sekarang dan menyinkronkannya ke database Cloud?`;

      const confirmRestore = window.confirm(confirmMsg);
      if (!confirmRestore) {
        if (e.target) e.target.value = '';
        return;
      }

      // NON-DESTRUCTIVE MERGE (Terisolasi):
      // Hanya buang item lokal lama yang cocok dengan kriteria slot ini, data mapel/kelas lain tetap dipertahankan!
      const otherItems = items.filter(i => {
        const itemGrade = (i.grade_class || '').toLowerCase();
        const selGrade = targetGrd.toLowerCase();
        const gradeNum = targetGrd.replace(/\D/g, '');
        const matchG = itemGrade.includes(selGrade) || (gradeNum && itemGrade.includes(gradeNum));
        const matchS = isSameSubject(i.subject_name, targetSub);
        const itemAsmt = (i.assessment_type || 'SAS').toUpperCase();
        const selAsmt = targetAsmt.toUpperCase();
        const matchA = itemAsmt === selAsmt;
        return !(matchG && matchS && matchA);
      });

      const restoredItemIds = new Set(importedItems.map(i => i.id));
      const otherQuestions = questionBank.filter(q => !q.blueprint_item_id || !restoredItemIds.has(q.blueprint_item_id));

      const mergedItems = [...otherItems, ...importedItems];
      const mergedQuestions = [...otherQuestions, ...importedQuestions];

      // 1. Simpan ke local state & cache
      try {
        localStorage.removeItem('sasi_blueprint_reset_done');
      } catch (e) {}

      setItems(mergedItems);
      setQuestionBank(mergedQuestions);
      localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(mergedItems));
      localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(mergedQuestions));

      // 2. Sinkronkan hanya item yang dipulihkan ke Cloud Database Supabase
      const bpId = await getOrCreateBlueprintId(targetSub, targetLvl, getPhaseFromGrade(targetGrd), targetAsmt);
      for (const item of importedItems) {
        try {
          const payload = formatBlueprintItemForCloud({ 
            ...item, 
            subject_name: targetSub, 
            grade_class: targetGrd, 
            assessment_type: targetAsmt as any 
          }, bpId);
          await safeSupabaseUpsert('blueprint_items', payload);
        } catch (pushErr) {}
      }

      for (const q of importedQuestions) {
        try {
          const resolvedSub = resolveSubjectUUID(targetSub, targetLvl);
          const qPayload = formatQuestionForCloud(q, resolvedSub, q.blueprint_item_id);
          const res = await safeSupabaseUpsert('question_bank', qPayload);
          if (res.success && q.options && q.options.length > 0) {
            const optPayload = formatOptionsForCloud(q.options, qPayload.id);
            await safeSupabaseUpsert('question_options', optPayload);
          }
        } catch (pushQErr) {}
      }

      setExcelFeedback({
        type: 'success',
        message: `Pemulihan data untuk ${targetSub} (${targetGrd} • ${targetAsmt}) berhasil! Data mapel dan kelas lainnya tetap utuh.`
      });
      setTimeout(() => setExcelFeedback(null), 5000);
    } catch (err: any) {
      console.error('Restore backup error:', err);
      setExcelFeedback({
        type: 'error',
        message: `Gagal memulihkan cadangan: ${err?.message || 'File tidak valid'}`
      });
    } finally {
      setIsRestoring(false);
      if (e.target) e.target.value = '';
    }
  };

  // Calculate 4 Assignment Cards: Total Penugasan, Ditugaskan, Draft, Selesai (Reaktif terhadap Filter Jenjang & Asesmen di Header)
  const stats = useMemo(() => {
    const finishedBpSet = new Set(
      questionBank
        .filter(q => q.status === 'Selesai' && q.blueprint_item_id)
        .map(q => q.blueprint_item_id)
    );

    const getEffectiveStatus = (item: BlueprintItem): WorkflowStatus => {
      // Pada tab penulisan soal, butir kisi-kisi berstatus Selesai jika soal di question_bank sudah berstatus Selesai
      if (finishedBpSet.has(item.id)) return 'Selesai';
      const hasQuestions = questionBank.some(q => q.blueprint_item_id === item.id);
      if (hasQuestions) return 'Dalam Penulisan';
      return 'Draft';
    };

    const filteredByHeader = items.filter(item => {
      // 0. Jika mode ruang kerja terkunci penugasan penulis (initialScope.isLocked)
      if (initialScope?.isLocked) {
        // Cocokkan Mata Pelajaran
        if (initialScope.subject) {
          if (!isSameSubject(item.subject_name, initialScope.subject)) {
            return false;
          }
        }

        // Cocokkan Kelas / Fase
        if (initialScope.grade) {
          const itemGrade = (item.grade_class || '').toLowerCase().trim();
          const targetGrade = initialScope.grade.toLowerCase().trim();
          const targetNum = targetGrade.match(/[0-9]+/)?.[0];
          const itemNum = itemGrade.match(/[0-9]+/)?.[0];
          if (targetNum && itemNum && targetNum !== itemNum) {
            return false;
          }
        }

        // Cocokkan Jenis Asesmen
        if (initialScope.assessment) {
          const itemAsmt = (item.assessment_type || blueprint.assessment_type || '').toUpperCase();
          const targetAsmt = initialScope.assessment.toUpperCase();
          if (itemAsmt && itemAsmt !== targetAsmt) {
            return false;
          }
        }

        return true;
      }

      // 1. Filter Jenjang (Mode Umum / Admin)
      if (headerLevelFilter !== 'ALL') {
        const itemGrade = (item.grade_class || '').toLowerCase();
        const isSMP = item.level === 'SMP' || item.phase === 'D' || itemGrade.includes('kelas 7') || itemGrade.includes('kelas 8') || itemGrade.includes('kelas 9');
        const itemLvl = isSMP ? 'SMP' : 'SD';
        if (itemLvl !== headerLevelFilter) return false;
      }

      // 2. Filter Jenis Asesmen (Mode Umum / Admin)
      if (headerAssessmentFilter !== 'ALL') {
        const itemAsmt = (item.assessment_type || blueprint.assessment_type || 'SAS').toUpperCase();
        const targetAsmt = headerAssessmentFilter.toUpperCase();
        if (targetAsmt === 'SUMATIF') {
          const isSumatif = itemAsmt === 'SUMATIF' || itemAsmt === 'STS' || itemAsmt === 'PTS';
          if (!isSumatif) return false;
        } else if (itemAsmt !== targetAsmt) {
          return false;
        }
      }

      return true;
    });

    const effectiveItems = filteredByHeader.map(i => ({ ...i, workflow_status: getEffectiveStatus(i) }));

    // Jika Penulis memiliki kuota penugasan spesifik (misal: 5 butir soal)
    const assignedTarget = initialScope?.isLocked
      ? (initialScope.targetQuestions || initialScope.assignment?.target_questions || 5)
      : null;

    if (assignedTarget !== null) {
      // Hitung progress nyata butir soal yang sudah masuk
      const selesaiCount = effectiveItems.filter(i => i.workflow_status === 'Selesai').length;
      const draftCount = effectiveItems.filter(i => i.workflow_status === 'Draft' || i.workflow_status === 'Menunggu Riviu').length;
      
      // Sisa target yang belum dibuat kisi-kisi / butir soalnya
      const remainingAssigned = Math.max(0, assignedTarget - (selesaiCount + draftCount));

      return {
        total: {
          count: assignedTarget,
          tulis: assignedTarget,
          riviu: 0,
        },
        ditugaskan: {
          count: remainingAssigned,
          tulis: remainingAssigned,
          riviu: 0,
        },
        draft: {
          count: draftCount,
          tulis: draftCount,
          riviu: 0,
        },
        selesai: {
          count: selesaiCount,
          tulis: selesaiCount,
          riviu: 0,
        }
      };
    }

    return {
      total: {
        count: effectiveItems.length,
        tulis: effectiveItems.filter(i => i.task_type === 'TULIS').length,
        riviu: effectiveItems.filter(i => i.task_type === 'RIVIU').length,
      },
      ditugaskan: {
        count: effectiveItems.filter(i => i.workflow_status === 'Dalam Penulisan').length,
        tulis: effectiveItems.filter(i => i.workflow_status === 'Dalam Penulisan' && i.task_type === 'TULIS').length,
        riviu: effectiveItems.filter(i => i.workflow_status === 'Dalam Penulisan' && i.task_type === 'RIVIU').length,
      },
      draft: {
        count: effectiveItems.filter(i => i.workflow_status === 'Draft' || i.workflow_status === 'Menunggu Riviu').length,
        tulis: effectiveItems.filter(i => (i.workflow_status === 'Draft' || i.workflow_status === 'Menunggu Riviu') && i.task_type === 'TULIS').length,
        riviu: effectiveItems.filter(i => (i.workflow_status === 'Draft' || i.workflow_status === 'Menunggu Riviu') && i.task_type === 'RIVIU').length,
      },
      selesai: {
        count: effectiveItems.filter(i => i.workflow_status === 'Selesai').length,
        tulis: effectiveItems.filter(i => i.workflow_status === 'Selesai' && i.task_type === 'TULIS').length,
        riviu: effectiveItems.filter(i => i.workflow_status === 'Selesai' && i.task_type === 'RIVIU').length,
      }
    };
  }, [
    items, 
    questionBank, 
    headerLevelFilter, 
    headerAssessmentFilter, 
    blueprint.assessment_type,
    initialScope?.isLocked,
    initialScope?.subject,
    initialScope?.grade,
    initialScope?.assessment,
    initialScope?.targetQuestions,
    initialScope?.assignment?.target_questions
  ]);

  // Manual Blueprint Item Handlers
  const handleOpenCreateManual = () => {
    // Gunakan currentScopeItems agar guru penugasan yang baru otomatis mulai dari butir #1
    const currentScopeItems = items.filter(isItemInCurrentScope);
    const nextNum = currentScopeItems.length > 0 ? Math.max(...currentScopeItems.map(i => i.question_number)) + 1 : 1;
    setManualNumber(nextNum);
    setManualSubject(selectedSubject || (filterSubject !== 'ALL' ? filterSubject : (availableSubjects[0]?.name || 'Matematika')));
    setManualGrade(selectedGrade || (filterGrade !== 'ALL' ? filterGrade : 'Kelas 4'));
    setManualAssessment(selectedAssessment || (filterAssessment !== 'ALL' ? filterAssessment : 'SAS'));
    setManualElement('');
    setManualSubElement('');
    setManualCompetency('');
    setManualIndicator('');
    const authorName = currentUser?.full_name || currentUser?.name || initialScope?.assignment?.user_name || 'Guru Penulis';
    setManualWriter(authorName);
    setShowCreateManualModal(true);
  };

  const handleSaveManualItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualElement.trim() || !manualIndicator.trim()) {
      alert('Mohon lengkapi Elemen dan Indikator Soal terlebih dahulu.');
      return;
    }

    const newItemId = generateValidUUID();
    const lvl = manualGrade.includes('Kelas 7') || manualGrade.includes('Kelas 8') || manualGrade.includes('Kelas 9') ? 'SMP' : 'SD';
    const phs = getPhaseFromGrade(manualGrade);
    const validBpId = await getOrCreateBlueprintId(manualSubject, lvl, phs, manualAssessment);

    const currentWriterId = currentUser?.id || initialScope?.assignment?.user_id || null;
    const currentWriterName = manualWriter.trim() || currentUser?.full_name || currentUser?.name || initialScope?.assignment?.user_name || 'Guru Penulis';

    const newItem: BlueprintItem = {
      id: newItemId,
      blueprint_id: validBpId,
      question_number: Number(manualNumber) || 1,
      element: manualElement.trim(),
      sub_element: manualSubElement.trim() || manualElement.trim(),
      competency: manualCompetency.trim() || `Memahami capaian pembelajaran materi ${manualElement.trim()}`,
      question_category: 'Single',
      cognitive_level: manualCognitive,
      context: manualContext.trim() || 'Personal',
      indicator: manualIndicator.trim(),
      question_type: manualType,
      task_type: manualTaskType,
      workflow_status: 'Dalam Penulisan',
      writer_id: currentWriterId,
      writer_name: currentWriterName,
      reviewer_name: manualReviewer.trim() || 'Guru Penelaah',
      subject_name: manualSubject,
      grade_class: manualGrade,
      assessment_type: manualAssessment as any,
      created_at: new Date().toISOString()
    };

    const updated = [...items, newItem];
    setItems(updated);
    try {
      localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(updated));
    } catch (err) {}

    // Persist directly to Supabase Cloud
    const res = await safeSupabaseUpsert('blueprint_items', formatBlueprintItemForCloud(newItem, validBpId));
    if (res.success) setCloudStatus('connected');

    // Sinkronisasi metadata penulis ke context_presets (Universal Dual-Engine)
    await saveBlueprintItemWriterToCloud(newItemId, currentWriterId, currentWriterName);

    setShowCreateManualModal(false);
    setExcelFeedback({
      type: 'success',
      message: `Butir Kisi-Kisi No #${newItem.question_number} (${newItem.element} • ${newItem.assessment_type}) berhasil ditambahkan & tersimpan ke Cloud Database!`
    });
    setTimeout(() => setExcelFeedback(null), 5000);

    // Tampilkan Pop-Up Notifikasi Berhasil Simpan Kisi-Kisi Baru di Layar Saat Ini (Current Viewport)
    setSaveSuccessNotification({
      isOpen: true,
      type: 'blueprint',
      title: 'Butir Kisi-Kisi Berhasil Dibuat!',
      description: 'Butir kisi-kisi baru telah sukses ditambahkan dan disimpan secara permanen ke database SASI.',
      questionNumber: newItem.question_number,
      element: newItem.element,
      questionType: newItem.question_type,
      cognitiveLevel: newItem.cognitive_level,
      indicator: newItem.indicator,
      isCloudSynced: true,
      blueprintItem: newItem
    });
  };

  // Filter & Sort Logic (Tersinkronisasi dengan Hierarchical Stepped Filter)
  const filteredItems = items
    .filter(item => {
      const matchSearch = 
        (item.element || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sub_element || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.indicator || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.competency || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.context || '').toLowerCase().includes(searchTerm.toLowerCase());

      // Hierarchical Stepped Filters
      if (selectedGrade) {
        const itemGrade = (item.grade_class || '').toLowerCase();
        const selGrade = selectedGrade.toLowerCase();
        const gradeNum = selectedGrade.replace(/\D/g, '');
        const itemGradeNum = itemGrade.replace(/\D/g, '');
        const matchG = itemGrade.includes(selGrade) || selGrade.includes(itemGrade) || (Boolean(gradeNum) && Boolean(itemGradeNum) && gradeNum === itemGradeNum);
        if (!matchG) return false;
      }

      if (selectedSubject) {
        if (!isSameSubject(item.subject_name, selectedSubject)) return false;
      }

      if (selectedAssessment) {
        const itemAsmt = (item.assessment_type || blueprint.assessment_type || 'SAS').toUpperCase();
        if (itemAsmt !== selectedAssessment.toUpperCase()) return false;
      }

      // Filter pengarsipan: sembunyikan butir dari kisi-kisi arsip kecuali opsi centang diaktifkan
      const isArchived = Boolean(
        item.is_archived || 
        item.blueprint?.title?.startsWith('[ARSIP]') || 
        (typeof item.subject_name === 'string' && item.subject_name.startsWith('[ARSIP]'))
      );
      if (!showArchivedItems && isArchived) return false;

      // Isolasi Penulis untuk Guru Penugasan (Solusi A) & Filter Penulis untuk Admin (Solusi C)
      if (currentUser?.role === 'teacher' || initialScope?.assignment) {
        const curId = currentUser?.id || initialScope?.assignment?.user_id;
        const curName = (currentUser?.full_name || currentUser?.name || initialScope?.assignment?.user_name || '').toLowerCase().trim();
        const itemWriterId = item.writer_id;
        const itemWriterName = (item.writer_name || '').toLowerCase().trim();

        const matchId = Boolean(curId && itemWriterId && (itemWriterId === curId || toValidUUID(itemWriterId) === toValidUUID(curId)));
        const matchName = Boolean(curName && itemWriterName && (itemWriterName === curName || itemWriterName.includes(curName) || curName.includes(itemWriterName)));

        // Jangan izinkan matchSlot jika butir sudah memiliki penulis lain (penulis lama/berbeda).
        // Setiap guru penulis baru harus memiliki lembar kerja masing-masing tanpa tercampur data penulis lain!
        const matchSlot = Boolean(initialScope?.isLocked && !itemWriterId);

        if (!matchId && !matchName && !matchSlot) return false;
      } else if (filterWriter && filterWriter !== 'ALL') {
        const itemWriterId = item.writer_id;
        const matchW = itemWriterId === filterWriter || (item.writer_name && item.writer_name === filterWriter);
        if (!matchW) return false;
      }

      // Legacy fallback filters (jika aktif)
      const matchSubject = filterSubject === 'ALL' || !item.subject_name || item.subject_name === filterSubject;
      const matchGrade = filterGrade === 'ALL' || !item.grade_class || item.grade_class.includes(filterGrade);
      const matchAssessment = filterAssessment === 'ALL' || (item.assessment_type || blueprint.assessment_type || 'SAS') === filterAssessment;
      const matchType = filterType === 'ALL' || item.question_type === filterType;
      const matchStatus = filterStatus === 'ALL' || item.workflow_status === filterStatus;

      return matchSearch && matchSubject && matchGrade && matchAssessment && matchType && matchStatus;
    })
    .sort((a, b) => {
      if (sortField === 'question_number') {
        return sortAsc ? a.question_number - b.question_number : b.question_number - a.question_number;
      }
      if (sortField === 'element') {
        return sortAsc ? (a.element || '').localeCompare(b.element || '') : (b.element || '').localeCompare(a.element || '');
      }
      return 0;
    });

  // Daftar Penulis untuk Dropdown Filter Super Admin (Solusi C)
  const allWritersList = useMemo(() => {
    const writersMap = new Map<string, { id: string; name: string; count: number }>();
    items.forEach(it => {
      const wId = it.writer_id || it.writer_name || 'unassigned';
      const wName = it.writer_name || (it.writer_id ? `Penulis (${it.writer_id.slice(0, 8)}...)` : 'Belum Ditentukan');
      const existing = writersMap.get(wId);
      if (existing) {
        existing.count += 1;
      } else {
        writersMap.set(wId, { id: wId, name: wName, count: 1 });
      }
    });
    return Array.from(writersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Solusi B: Guru membersihkan lembar kerja penugasan aktif (mengosongkan draft untuk mulai baru dari nomor 1)
  const handleClearTeacherWorkspace = async () => {
    setIsClearingWorkspace(true);
    try {
      const targetItems = items.filter(isItemInCurrentScope);
      const targetItemIds = targetItems.map(i => i.id);
      const targetQuestionIds = questionBank
        .filter(q => q.blueprint_item_id && targetItemIds.includes(q.blueprint_item_id))
        .map(q => q.id);

      // 1. Hapus dari Supabase Cloud
      if (targetQuestionIds.length > 0) {
        await supabase.from('question_bank').delete().in('id', targetQuestionIds);
      }
      if (targetItemIds.length > 0) {
        await supabase.from('blueprint_items').delete().in('id', targetItemIds);
        for (const id of targetItemIds) {
          await deleteBlueprintItemWriterFromCloud(id);
        }
      }

      // 2. Bersihkan local state & cache
      const remainingItems = items.filter(i => !targetItemIds.includes(i.id));
      const remainingBank = questionBank.filter(q => !targetQuestionIds.includes(q.id));
      setItems(remainingItems);
      setQuestionBank(remainingBank);
      try {
        localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(remainingItems));
        localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(remainingBank));
      } catch (e) {}

      setShowClearWorkspaceModal(false);
      setExcelFeedback({
        type: 'success',
        message: `Lembar kerja penugasan berhasil dibersihkan (${targetItems.length} butir dihapus). Sekarang Anda memiliki lembar kerja yang bersih untuk mulai menulis dari butir #1!`
      });
      setTimeout(() => setExcelFeedback(null), 6000);
    } catch (err: any) {
      alert(`Gagal membersihkan lembar kerja: ${err.message || 'Terjadi kesalahan sistem'}`);
    } finally {
      setIsClearingWorkspace(false);
    }
  };

  // Handle in-place context change via Creatable Combobox
  const handleContextChange = async (itemId: string, newContext: string) => {
    const updated = items.map(item => item.id === itemId ? { ...item, context: newContext } : item);
    setItems(updated);
    try {
      localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(updated));
    } catch (e) {}

    // Sync to Supabase
    const validId = toValidUUID(itemId);
    try {
      await supabase
        .from('blueprint_items')
        .update({
          context: newContext,
          updated_at: new Date().toISOString()
        })
        .eq('id', validId);
    } catch (e) {
      console.warn('Update context error:', e);
    }
  };

  // Handle save from QuestionEditorModal
  const handleSaveQuestion = async (savedQuestion: QuestionBankItem, updatedStatus: WorkflowStatus) => {
    const validQId = toValidUUID(savedQuestion.id);
    const currentBpItem = selectedItemForEditor;
    const currentVarNum = selectedVariantNumber;
    const validBpId = currentBpItem ? toValidUUID(currentBpItem.id) : (savedQuestion.blueprint_item_id ? toValidUUID(savedQuestion.blueprint_item_id) : null);

    const formattedOptions = savedQuestion.options && savedQuestion.options.length > 0
      ? formatOptionsForCloud(savedQuestion.options, validQId)
      : [];

    const activeAsgId = initialScope?.assignment?.id || (currentBpItem as any)?.assignment_id;

    const normalizedQuestion: QuestionBankItem = {
      ...savedQuestion,
      id: validQId,
      assignment_id: activeAsgId || (savedQuestion as any).assignment_id || undefined,
      subject_name: savedQuestion.subject_name || currentBpItem?.subject_name || selectedSubject || initialScope?.subject || undefined,
      grade_class: savedQuestion.grade_class || currentBpItem?.grade_class || selectedGrade || initialScope?.grade || undefined,
      level: (savedQuestion.level || currentBpItem?.level || selectedLevel || initialScope?.level || 'SD') as SchoolLevel,
      phase: (savedQuestion.phase || currentBpItem?.phase || (initialScope?.assignment?.phase) || 'B') as Phase,
      options: formattedOptions,
      blueprint_item_id: validBpId || undefined,
      status: updatedStatus
    };

    // 1. Update question in bank state & localStorage
    const exists = questionBank.some(q => q.id === validQId || q.id === savedQuestion.id);
    const updatedBank = exists 
      ? questionBank.map(q => (q.id === validQId || q.id === savedQuestion.id) ? normalizedQuestion : q)
      : [...questionBank, normalizedQuestion];
    
    setQuestionBank(updatedBank);
    try {
      localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(updatedBank));
    } catch (e) {}

    // 2. Update blueprint item workflow status
    if (currentBpItem) {
      const updatedItems = items.map(item =>
        item.id === currentBpItem.id
          ? { 
              ...item, 
              assignment_id: activeAsgId || item.assignment_id,
              workflow_status: updatedStatus 
            }
          : item
      );
      setItems(updatedItems);
      try {
        localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(updatedItems));
      } catch (e) {}

      // 3. Sync blueprint item status to Supabase via update (NOT upsert to avoid null constraint violations)
      if (validBpId) {
        try {
          await supabase
            .from('blueprint_items')
            .update({
              workflow_status: updatedStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', validBpId);
        } catch (bpUpdErr) {
          console.warn('Update blueprint_items status error:', bpUpdErr);
        }
      }
    }

    // 4. Resolve Subject UUID and Persist question_bank to Supabase
    const targetSub = 
      savedQuestion.subject_id ||
      (currentBpItem as any)?.blueprint?.subject_id ||
      (currentBpItem as any)?.blueprint_item?.blueprint?.subject_id ||
      currentBpItem?.subject_name ||
      selectedSubject ||
      initialScope?.subject;

    const resolvedSubId = resolveSubjectUUID(
      targetSub,
      savedQuestion.level || currentBpItem?.level || selectedLevel || initialScope?.level || 'SD'
    );

    const qbPayload = formatQuestionForCloud(
      { ...savedQuestion, status: updatedStatus },
      resolvedSubId,
      validBpId
    );

    const qbRes = await safeSupabaseUpsert('question_bank', qbPayload);

    // 5. Persist question_options to Supabase
    let optRes = { success: true };
    if (formattedOptions.length > 0) {
      // Clean up existing options for this question first to avoid duplicates
      try {
        await supabase.from('question_options').delete().eq('question_id', validQId);
      } catch (optDelErr) {}

      optRes = await safeSupabaseUpsert('question_options', formattedOptions);
    }

    const isCloudSuccess = Boolean(qbRes.success && optRes.success);

    if (isCloudSuccess) {
      setCloudStatus('connected');
      setExcelFeedback({
        type: 'success',
        message: `Butir Soal #${currentBpItem?.question_number || ''} & Opsi Jawaban berhasil disimpan permanen ke Cloud Supabase!`
      });
    } else {
      setCloudStatus('error');
      setExcelFeedback({
        type: 'error',
        message: `Soal tersimpan di cache lokal, namun gagal sinkron ke Cloud: ${qbRes.error?.message || (optRes as any).error?.message || 'Koneksi terputus'}`
      });
    }
    setTimeout(() => setExcelFeedback(null), 5000);

    // Tutup editor modal
    setSelectedItemForEditor(null);
    setSelectedQuestionForEditor(null);

    // Munculkan POPUP PEMBERITAHUAN BERHASIL DISIMPAN KE DATABASE (Permintaan User)
    setSaveSuccessNotification({
      isOpen: true,
      questionNumber: currentBpItem?.question_number,
      variantNumber: currentVarNum,
      questionType: currentBpItem?.question_type || savedQuestion.question_type,
      element: currentBpItem?.element,
      isCloudSynced: isCloudSuccess,
      savedQuestion: normalizedQuestion,
      blueprintItem: currentBpItem || undefined
    });
  };

  // Hapus Varian Soal Tertentu Saja (Butir Kisi-Kisi Tetap Aman & Tidak Terhapus)
  const handleDeleteQuestionVariant = async (
    variantQ: QuestionBankItem,
    blueprintItem: BlueprintItem,
    variantNum: number
  ) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus Butir Soal Varian #${variantNum} untuk kisi-kisi nomor #${blueprintItem.question_number}?\n\n` +
      `PERHATIAN: Hanya soal varian ini yang akan dihapus. Kisi-kisi (indikator, level kognitif, dll.) TETAP AMAN dan TIDAK AKAN TERHAPUS.`
    );
    if (!confirmDelete) return;

    const validQId = toValidUUID(variantQ.id);

    // 1. Hapus opsi & soal dari Supabase Cloud
    try {
      await supabase.from('question_options').delete().eq('question_id', validQId);
      await supabase.from('question_bank').delete().eq('id', validQId);
    } catch (err) {
      console.warn('Delete cloud question error:', err);
    }

    // 2. Hapus dari questionBank state lokal & cache
    const updatedBank = questionBank.filter(q => q.id !== variantQ.id && q.id !== validQId);
    setQuestionBank(updatedBank);
    try {
      localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(updatedBank));
    } catch (e) {}

    // 3. Periksa sisa varian yang masih ada untuk butir kisi-kisi ini
    const remainingVariants = updatedBank.filter(
      q => q.blueprint_item_id === blueprintItem.id || (!q.blueprint_item_id && q.id === `qb-00${blueprintItem.question_number}`)
    );

    let newWorkflowStatus: WorkflowStatus = 'Draft';
    if (remainingVariants.length > 0) {
      const hasFinished = remainingVariants.some(v => v.status === 'Selesai');
      const hasReview = remainingVariants.some(v => v.status === 'Menunggu Riviu');
      const hasWriting = remainingVariants.some(v => v.status === 'Dalam Penulisan');
      if (hasFinished) newWorkflowStatus = 'Selesai';
      else if (hasReview) newWorkflowStatus = 'Menunggu Riviu';
      else if (hasWriting) newWorkflowStatus = 'Dalam Penulisan';
      else newWorkflowStatus = 'Draft';
    }

    const updatedItems = items.map(it =>
      it.id === blueprintItem.id ? { ...it, workflow_status: newWorkflowStatus } : it
    );
    setItems(updatedItems);
    try {
      localStorage.setItem(BLUEPRINT_ITEMS_KEY, JSON.stringify(updatedItems));
    } catch (e) {}

    // 4. Update status kisi-kisi di Supabase Cloud jika terhubung
    try {
      await supabase
        .from('blueprint_items')
        .update({
          workflow_status: newWorkflowStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', toValidUUID(blueprintItem.id));
    } catch (bpErr) {}

    setExcelFeedback({
      type: 'success',
      message: `Soal Varian #${variantNum} berhasil dihapus. Kisi-kisi #${blueprintItem.question_number} tetap tersimpan.`
    });
    setTimeout(() => setExcelFeedback(null), 4000);
  };

  const getStatusBadge = (status: WorkflowStatus) => {
    switch (status) {
      case 'Dalam Penulisan':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">Dalam Penulisan</span>;
      case 'Draft':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">Draft</span>;
      case 'Menunggu Riviu':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">Menunggu Riviu</span>;
      case 'Selesai':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Selesai</span>
        </span>;
    }
  };

  // Badge Status Khusus Tab Penulisan Soal (Akurat berdasarkan ada/tidaknya soal di Bank Soal)
  const getQuestionStatusBadge = (totalVariants: number, variants: QuestionBankItem[]) => {
    if (totalVariants === 0) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300 inline-flex items-center space-x-1.5 whitespace-nowrap" title="Belum ada butir soal yang ditulis untuk kisi-kisi ini">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          <span>Belum Ditulis</span>
        </span>
      );
    }

    const allFinished = variants.every(q => q.status === 'Selesai');
    if (allFinished) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1 whitespace-nowrap" title="Seluruh varian soal sudah selesai dan siap terbit">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Selesai</span>
        </span>
      );
    }

    const hasReview = variants.some(q => q.status === 'Menunggu Riviu');
    if (hasReview) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 inline-flex items-center space-x-1 whitespace-nowrap" title="Menunggu penelaahan reviewer">
          <span>Menunggu Riviu</span>
        </span>
      );
    }

    const hasInWriting = variants.some(q => q.status === 'Dalam Penulisan');
    if (hasInWriting) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center space-x-1 whitespace-nowrap" title="Soal sedang dalam proses penulisan">
          <span>Dalam Penulisan</span>
        </span>
      );
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 inline-flex items-center space-x-1 whitespace-nowrap" title="Soal masih berstatus Draft">
        <span>Draft</span>
      </span>
    );
  };

  // List of approved / finished questions for Bank Soal view (Tersinkronisasi Hierarchical Stepped Filter)
  const approvedQuestions = useMemo(() => {
    const finishedBpSet = new Set(
      questionBank
        .filter(q => q.status === 'Selesai' && q.blueprint_item_id)
        .map(q => q.blueprint_item_id)
    );

    return items.filter(i => {
      const isApproved = i.workflow_status === 'Selesai' || finishedBpSet.has(i.id);
      
      // Hierarchical Stepped Filter
      if (selectedGrade) {
        const itemGrade = (i.grade_class || '').toLowerCase();
        const selGrade = selectedGrade.toLowerCase();
        const gradeNum = selectedGrade.replace(/\D/g, '');
        const matchG = itemGrade.includes(selGrade) || (gradeNum && itemGrade.includes(gradeNum));
        if (!matchG) return false;
      }

      if (selectedSubject) {
        if (!isSameSubject(i.subject_name, selectedSubject)) return false;
      }

      if (selectedAssessment) {
        const itemAsmt = (i.assessment_type || blueprint.assessment_type || 'SAS').toUpperCase();
        if (itemAsmt !== selectedAssessment.toUpperCase()) return false;
      }

      const matchAsmt = bankFilterAssessment === 'ALL' || (i.assessment_type || blueprint.assessment_type || 'SAS') === bankFilterAssessment;
      return isApproved && matchAsmt;
    });
  }, [items, questionBank, bankFilterAssessment, blueprint.assessment_type, selectedGrade, selectedSubject, selectedAssessment]);

  // Count of items in current scope that have actual written questions (in any status: Draft, Menunggu Riviu, Selesai)
  const writtenQuestionsCount = useMemo(() => {
    return items.filter(item => {
      if (isScopedFilter && !isItemInCurrentScope(item)) return false;
      const itemVariants = questionBank.filter(
        qb => qb.blueprint_item_id === item.id || (!qb.blueprint_item_id && qb.id === `qb-00${item.question_number}`)
      );
      return itemVariants.some(q => 
        Boolean(
          (q.question_text && q.question_text.trim().length > 0) ||
          (q.stimulus_text && q.stimulus_text.trim().length > 0) ||
          (q.options && q.options.some(opt => opt.option_text && opt.option_text.trim().length > 0))
        )
      );
    }).length;
  }, [items, questionBank, isScopedFilter, selectedLevel, selectedGrade, selectedSubject, selectedAssessment]);

  // Filtered Bank Soal Items (digunakan oleh daftar Bank Soal & Dual-Panel Inspection Modal)
  const filteredBankItems = useMemo(() => {
    return items.filter(item => {
      if (isScopedFilter && !isItemInCurrentScope(item)) return false;

      const itemVariants = questionBank.filter(
        qb => qb.blueprint_item_id === item.id || (!qb.blueprint_item_id && qb.id === `qb-00${item.question_number}`)
      );
      
      const hasWrittenQuestion = itemVariants.some(q => 
        Boolean(
          (q.question_text && q.question_text.trim().length > 0) ||
          (q.stimulus_text && q.stimulus_text.trim().length > 0) ||
          (q.options && q.options.some(opt => opt.option_text && opt.option_text.trim().length > 0))
        )
      );
      if (!hasWrittenQuestion) return false;

      const effSubject = initialScope?.isLocked ? (selectedSubject || initialScope.subject) : bankFilterSubject;
      const effGrade = initialScope?.isLocked ? (selectedGrade || initialScope.grade) : bankFilterGrade;
      const effAssessment = initialScope?.isLocked ? (selectedAssessment || initialScope.assessment) : bankFilterAssessment;

      const matchSub = effSubject === 'ALL' || !item.subject_name || isSameSubject(item.subject_name, effSubject);
      const matchGrd = effGrade === 'ALL' || !item.grade_class || item.grade_class.toLowerCase().includes(effGrade.toLowerCase());
      const itemAsmt = (item.assessment_type || blueprint.assessment_type || 'SAS').toUpperCase();
      const matchAsmt = effAssessment === 'ALL' || itemAsmt === effAssessment.toUpperCase();

      const matchType = bankFilterType === 'ALL' || item.question_type === bankFilterType;
      const matchCog = bankFilterCognitive === 'ALL' || item.cognitive_level === bankFilterCognitive;
      const matchStat = bankFilterStatus === 'ALL' || itemVariants.some(v => (v.status || 'Draft') === bankFilterStatus);
      return matchSub && matchGrd && matchAsmt && matchType && matchCog && matchStat;
    });
  }, [items, isScopedFilter, isItemInCurrentScope, questionBank, initialScope, selectedSubject, selectedGrade, selectedAssessment, bankFilterSubject, bankFilterGrade, bankFilterAssessment, bankFilterType, bankFilterCognitive, bankFilterStatus, blueprint.assessment_type]);

  const currentInspectIndex = useMemo(() => {
    if (!dualInspectItem) return -1;
    return filteredBankItems.findIndex(it => it.id === dualInspectItem.id);
  }, [dualInspectItem, filteredBankItems]);

  const inspectItemVariants = useMemo(() => {
    if (!dualInspectItem) return [];
    return questionBank.filter(qb => qb.blueprint_item_id === dualInspectItem.id || (!qb.blueprint_item_id && qb.id === `qb-00${dualInspectItem.question_number}`));
  }, [dualInspectItem, questionBank]);

  const handleSelectInspectVariant = (vIdx: number) => {
    setDualInspectVariantIndex(vIdx);
    const vQ = inspectItemVariants[vIdx];
    if (vQ && dualInspectItem) {
      setStudentPreviewQuestion({
        ...vQ,
        blueprint_item: dualInspectItem
      });
    }
  };

  const handleInspectPrev = () => {
    if (currentInspectIndex > 0) {
      const prevItem = filteredBankItems[currentInspectIndex - 1];
      const prevVariants = questionBank.filter(qb => qb.blueprint_item_id === prevItem.id || (!qb.blueprint_item_id && qb.id === `qb-00${prevItem.question_number}`));
      handleOpenStudentPreview(prevItem, prevVariants[0], 0);
    }
  };

  const handleInspectNext = () => {
    if (currentInspectIndex >= 0 && currentInspectIndex < filteredBankItems.length - 1) {
      const nextItem = filteredBankItems[currentInspectIndex + 1];
      const nextVariants = questionBank.filter(qb => qb.blueprint_item_id === nextItem.id || (!qb.blueprint_item_id && qb.id === `qb-00${nextItem.question_number}`));
      handleOpenStudentPreview(nextItem, nextVariants[0], 0);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-4.5 animate-fade-in w-full">
      
      {/* Breadcrumb & Cloud Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center space-x-2 text-sm font-semibold text-slate-500">
          <span className="hover:text-brand-600 cursor-pointer">Pusat Asesmen</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="hover:text-brand-600 cursor-pointer">Penyusunan Modul</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
          <span className="text-slate-900 font-extrabold">
            Kisi-Kisi & Bank Soal
          </span>
        </nav>

        {/* Cloud Database Indicator */}
        <div className="flex items-center space-x-2">
          {cloudStatus === 'connected' && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Cloud Database Aktif</span>
            </div>
          )}
          {cloudStatus === 'checking' && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-50 text-sky-700 border border-sky-300 shadow-2xs">
              <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
              <span>Sinkronisasi Cloud...</span>
            </div>
          )}
          {cloudStatus === 'error' && (
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs" title={cloudError || ''}>
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Cloud Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Header & 4 Kartu Status Penugasan */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm">
        
        {/* Top Info & 4 Status Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-center">
          
          {/* Left: Info Judul, Pilihan Jenjang & Filter Asesmen */}
          <div className="lg:col-span-5 space-y-2 sm:space-y-2.5">
            
            {/* Pilihan Jenjang & Asesmen Terkunci untuk Penulis vs Bebas untuk Admin */}
            {initialScope?.isLocked ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 text-white shadow-xs flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Jenjang {initialScope.level || 'SD'}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-600 text-white shadow-xs flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Asesmen {initialScope.assessment || 'Formatif'}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-xs flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>{initialScope.subject || 'Bahasa Indonesia'} ({initialScope.grade || 'Kelas 1'})</span>
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHeaderLevelFilter(prev => prev === 'SD' ? 'ALL' : 'SD')}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 shadow-2xs ${
                    headerLevelFilter === 'SD'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                  title="Filter hitungan soal khusus Jenjang SD"
                >
                  <span>SD • Fase A-B-C</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHeaderLevelFilter(prev => prev === 'SMP' ? 'ALL' : 'SMP')}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 shadow-2xs ${
                    headerLevelFilter === 'SMP'
                      ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                  title="Filter hitungan soal khusus Jenjang SMP"
                >
                  <span>SMP • Fase D</span>
                </button>

                {headerLevelFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setHeaderLevelFilter('ALL')}
                    className="px-2 py-0.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 underline"
                    title="Lihat akumulasi semua jenjang"
                  >
                    Semua Jenjang
                  </button>
                )}
              </div>
            )}

            {/* Judul Bersih Sesuai Arahan User */}
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {initialScope?.isLocked 
                ? `Penyusunan Naskah: ${initialScope.subject || 'Soal'}`
                : 'Penyusunan Soal & Pemetaan Kisi–Kisi'}
            </h1>

            {/* Info Alokasi Target & Sasaran Penulis */}
            <div className="text-xs text-slate-600 flex flex-wrap gap-y-1 gap-x-4 pt-0.5">
              <span>Alokasi Target: <strong className="text-brand-700">{stats.total.count} Butir Soal</strong></span>
              {initialScope?.isLocked && (
                <span>Sasaran: <strong className="text-slate-900">{initialScope.grade || 'Kelas 1'} (Fase {initialScope.assignment?.phase || 'A'})</strong></span>
              )}
              <span>Tahun Ajaran: <strong className="text-slate-900">2026/2027</strong></span>
            </div>

            {/* Tombol Filter Jenis Asesmen (Hanya tampil di mode umum bebas, disembunyikan jika locked) */}
            {!initialScope?.isLocked && (
              <div className="pt-0.5">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  Filter Asesmen:
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'ALL', label: 'Semua Asesmen' },
                    { key: 'Formatif', label: 'Formatif' },
                    { key: 'Sumatif', label: 'Sumatif (STS)' },
                    { key: 'SAS', label: 'SAS' },
                    { key: 'SAT', label: 'SAT' },
                    { key: 'SAJ', label: 'SAJ' }
                  ].map(asmt => {
                    const isActive = headerAssessmentFilter === asmt.key;
                    return (
                      <button
                        key={asmt.key}
                        type="button"
                        onClick={() => setHeaderAssessmentFilter(asmt.key)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all border ${
                          isActive
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm ring-1 ring-purple-300'
                            : 'bg-purple-50 hover:bg-purple-100/80 text-purple-800 border-purple-200'
                        }`}
                        title={`Klik untuk memfilter hitungan soal ${asmt.label}`}
                      >
                        {asmt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: 4 Kartu Status Penugasan */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            
            {/* Card 1: Total Penugasan */}
            <div className="bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-2xl p-2.5 sm:p-3 transition-all shadow-2xs flex flex-col justify-between h-auto">
              <div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">
                  Total Penugasan
                </div>
                <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {stats.total.count}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-200 text-[11px] space-y-0.5 text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Tulis:</span>
                  <strong className="text-emerald-700 font-bold">{stats.total.tulis} Soal</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Riviu:</span>
                  <strong className="text-blue-700 font-bold">{stats.total.riviu} Soal</strong>
                </div>
              </div>
            </div>

            {/* Card 2: Ditugaskan */}
            <div className="bg-amber-50/60 hover:bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5 sm:p-3 transition-all shadow-2xs flex flex-col justify-between h-auto">
              <div>
                <div className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider leading-tight">
                  Ditugaskan
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-900 mt-1">
                  {stats.ditugaskan.count}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-amber-200/60 text-[11px] space-y-0.5 text-amber-800">
                <div className="flex justify-between items-center">
                  <span>Tulis:</span>
                  <strong className="text-amber-900 font-bold">{stats.ditugaskan.tulis} Soal</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Riviu:</span>
                  <strong className="text-blue-800 font-bold">{stats.ditugaskan.riviu} Soal</strong>
                </div>
              </div>
            </div>

            {/* Card 3: Draft */}
            <div className="bg-sky-50/60 hover:bg-sky-50 border border-sky-200/80 rounded-2xl p-2.5 sm:p-3 transition-all shadow-2xs flex flex-col justify-between h-auto">
              <div>
                <div className="text-[10px] sm:text-[11px] font-bold text-sky-800 uppercase tracking-wider leading-tight">
                  Draft
                </div>
                <div className="text-xl sm:text-2xl font-black text-sky-900 mt-1">
                  {stats.draft.count}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-sky-200/60 text-[11px] space-y-0.5 text-sky-800">
                <div className="flex justify-between items-center">
                  <span>Tulis:</span>
                  <strong className="text-emerald-800 font-bold">{stats.draft.tulis} Soal</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Riviu:</span>
                  <strong className="text-sky-900 font-bold">{stats.draft.riviu} Soal</strong>
                </div>
              </div>
            </div>

            {/* Card 4: Selesai */}
            <div className="bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/80 rounded-2xl p-2.5 sm:p-3 transition-all shadow-2xs flex flex-col justify-between h-auto">
              <div>
                <div className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider leading-tight">
                  Selesai
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                  {stats.selesai.count}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-emerald-200/60 text-[11px] space-y-0.5 text-emerald-800">
                <div className="flex justify-between items-center">
                  <span>Tulis:</span>
                  <strong className="text-emerald-900 font-bold">{stats.selesai.tulis} Soal</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span>Riviu:</span>
                  <strong className="text-blue-800 font-bold">{stats.selesai.riviu} Soal</strong>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Alur Baku Kerja: Kisi-Kisi -> Penulisan Soal -> Bank Soal */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-3.5 sm:p-4 border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-slate-800/80 pb-2.5 mb-2.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">Alur Baku Penyusunan Asesmen Berkelanjutan</h3>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-snug">
                Tahapan berurutan: Kisi-kisi adalah acuan mutlak penulisan butir soal, dan hanya soal selesai ditelaah yang diterbitkan ke Bank Soal.
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Validasi Alur Bertahap</span>
          </div>
        </div>

        {/* 3 Step Visual Sequence Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div 
            onClick={() => handleSubModeChange('kisi-kisi')}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer hover:border-brand-300 flex flex-col justify-between h-auto ${activeSubMode === 'kisi-kisi' ? 'bg-brand-500/20 border-brand-400 text-white ring-1 ring-brand-400/30' : 'bg-slate-800/50 border-slate-700/60 text-slate-400'}`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-brand-300">Tahap 1 • Fondasi</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-brand-400/20 text-brand-200">
                  {initialScope?.isLocked 
                    ? `${filteredItems.length} Butir (${filteredItems.length >= (initialScope.targetQuestions || 5) ? 'Lengkap' : `Target ${initialScope.targetQuestions || 5}`})`
                    : `${items.length} Butir`}
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-white">1. Pemetaan Kisi–Kisi</h4>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-tight">Acuan kompetensi (CP/TP), indikator, dan bentuk soal.</p>
          </div>

          <div 
            onClick={() => handleSubModeChange('penulisan')}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer hover:border-amber-300 flex flex-col justify-between h-auto ${activeSubMode === 'penulisan' ? 'bg-amber-500/20 border-amber-400 text-white ring-1 ring-amber-400/30' : 'bg-slate-800/50 border-slate-700/60 text-slate-400'}`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-300">Tahap 2 • Produksi</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200">
                  {initialScope?.isLocked 
                    ? `${stats.draft.count} Proses`
                    : (items.length === 0 ? 'Terkunci' : `${stats.ditugaskan.count + stats.draft.count} Proses`)}
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-white">2. Penulisan Butir Soal</h4>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-tight">Soal ditulis & ditelaah <strong>hanya dari kisi–kisi acuan</strong>.</p>
          </div>

          <div 
            onClick={() => {
              handleSubModeChange('bank-soal');
              setShowBankQuestions(true);
            }}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer hover:border-emerald-300 flex flex-col justify-between h-auto ${activeSubMode === 'bank-soal' ? 'bg-emerald-500/20 border-emerald-400 text-white ring-1 ring-emerald-400/30' : 'bg-slate-800/50 border-slate-700/60 text-slate-400'}`}
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-300">Tahap 3 • Terbit</span>
                <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-200">
                  {stats.selesai.count} Lolos
                </span>
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-white">3. Bank Soal Terverifikasi</h4>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-tight">Katalog soal terbit siap perakitan ujian CBT.</p>
          </div>
        </div>
      </div>

      {/* Hierarchical Stepped Filter: Jenjang -> Kelas -> Mapel -> Jenis Asesmen */}
      {activeSubMode !== null && (() => {
        const isFilterComplete = Boolean(selectedLevel && selectedGrade && selectedSubject && selectedAssessment);

        return (
          <div className="space-y-4 animate-fade-in">
            {/* Breadcrumb Navigator Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span className="font-bold text-slate-400">Modul:</span>
                <span className="px-3 py-1 bg-slate-900 text-white font-black rounded-xl text-xs">
                  {activeSubMode === 'kisi-kisi' ? '1. Pemetaan Kisi-Kisi' : activeSubMode === 'penulisan' ? '2. Penulisan Butir Soal' : '3. Bank Soal Terbit'}
                </span>
                
                {selectedLevel && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      disabled={Boolean(initialScope?.isLocked)}
                      onClick={() => {
                        if (initialScope?.isLocked) return;
                        setSelectedGrade(null);
                        setSelectedSubject(null);
                        setSelectedAssessment(null);
                      }}
                      className={`px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 font-black rounded-xl text-xs transition-colors ${
                        initialScope?.isLocked ? 'cursor-default opacity-90' : 'hover:bg-rose-100'
                      }`}
                      title={initialScope?.isLocked ? "Terkunci sesuai penugasan" : "Klik untuk mengganti jenjang"}
                    >
                      Jenjang {selectedLevel} {!initialScope?.isLocked && '✎'}
                    </button>
                  </>
                )}

                {selectedGrade && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      disabled={Boolean(initialScope?.isLocked)}
                      onClick={() => {
                        if (initialScope?.isLocked) return;
                        setSelectedSubject(null);
                        setSelectedAssessment(null);
                      }}
                      className={`px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 font-black rounded-xl text-xs transition-colors ${
                        initialScope?.isLocked ? 'cursor-default opacity-90' : 'hover:bg-indigo-100'
                      }`}
                      title={initialScope?.isLocked ? "Terkunci sesuai penugasan" : "Klik untuk mengganti kelas"}
                    >
                      {selectedGrade} {!initialScope?.isLocked && '✎'}
                    </button>
                  </>
                )}

                {selectedSubject && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <button
                      type="button"
                      disabled={Boolean(initialScope?.isLocked)}
                      onClick={() => {
                        if (initialScope?.isLocked) return;
                        setSelectedAssessment(null);
                      }}
                      className={`px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black rounded-xl text-xs transition-colors ${
                        initialScope?.isLocked ? 'cursor-default opacity-90' : 'hover:bg-emerald-100'
                      }`}
                      title={initialScope?.isLocked ? "Terkunci sesuai penugasan" : "Klik untuk mengganti mata pelajaran"}
                    >
                      {selectedSubject} {!initialScope?.isLocked && '✎'}
                    </button>
                  </>
                )}

                {selectedAssessment && (
                  <>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-200 font-black rounded-xl text-xs flex items-center space-x-1">
                      {initialScope?.isLocked && <Lock className="w-3 h-3 text-purple-600" />}
                      <span>{selectedAssessment}</span>
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                {isFilterComplete && !initialScope?.isLocked && (
                  <button
                    type="button"
                    onClick={() => setSelectedAssessment(null)}
                    className="text-xs font-bold text-brand-600 hover:text-brand-800 underline px-2 py-1"
                  >
                    ‹ Ubah Kriteria
                  </button>
                )}
                {!initialScope?.isLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSubMode(null);
                      setSelectedLevel(null);
                      setSelectedGrade(null);
                      setSelectedSubject(null);
                      setSelectedAssessment(null);
                    }}
                    className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors flex items-center space-x-1 px-2 py-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Sembunyikan / Tutup Modul</span>
                  </button>
                )}
                {initialScope?.isLocked && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Ruang Penulis Terkunci</span>
                  </span>
                )}
              </div>
            </div>

            {/* BANNERS FOR TEACHER WORKSPACE: REVISION ALERT OR READ-ONLY LOCK */}
            {initialScope?.assignment && (
              <div className="space-y-3">
                {isAssignmentNeedsRevision && (
                  <div className="sticky top-2 z-30 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-start space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-sm text-amber-900">
                          Catatan Perbaikan Verifikator:
                        </h4>
                        <p className="text-xs text-amber-800 font-medium italic">
                          "{initialScope.assignment.revision_notes || 'Silakan lakukan revisi pada butir yang diminta, kemudian klik \'Kirim Kembali\' setelah selesai.'}"
                        </p>
                        <p className="text-[11px] text-amber-700">
                          Akses edit lembar kerja kembali dibuka. Silakan sesuaikan butir soal dan kisi-kisi, lalu kirim kembali.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTeacherResubmit}
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 flex items-center space-x-1.5 transition active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Kirim Kembali</span>
                    </button>
                  </div>
                )}

                {isAssignmentReadOnly && (
                  <div className="sticky top-2 z-30 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 shadow-sm flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-emerald-900">
                          Status: Selesai
                        </h4>
                        <p className="text-xs text-emerald-800">
                          Paket soal ini telah disetujui verifikator dan masuk Bank Soal. Lembar kerja berada dalam mode <strong>hanya-baca (read-only)</strong>.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shrink-0 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Terkunci</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SELEKSI LANGKAH BERTINGKAT ATAU MONITORING BANK SOAL TERVERIFIKASI */}
            {activeSubMode === 'bank-soal' && !initialScope?.isLocked ? (
              <div className="space-y-6 animate-fade-in">
                
                {/* BAGIAN 1: PERAMPINGAN TOMBOL PEMILIH JENJANG (SD & SMP) */}
                <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        Langkah 1 dari 4 • Pemilih Jenjang
                      </span>
                      <h3 className="text-lg font-black text-slate-900 mt-1.5">
                        Pilih Jenjang Satuan Pendidikan
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pilih jenjang sekolah untuk memfilter penugasan naskah soal dan memuat bank soal yang relevan.
                      </p>
                    </div>
                    {selectedLevel && (
                      <button
                        type="button"
                        onClick={() => setSelectedLevel(null)}
                        className="text-xs font-bold text-slate-500 hover:text-indigo-600 underline px-2 py-1"
                      >
                        Tampilkan Semua Jenjang (Reset)
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Tombol Jenjang SD */}
                    <div
                      onClick={() => setSelectedLevel(selectedLevel === 'SD' ? null : 'SD')}
                      className={`py-3 px-4 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between ${
                        selectedLevel === 'SD'
                          ? 'border-2 border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500/20'
                          : 'border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedLevel === 'SD' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-slate-800">Jenjang SD</h4>
                          <p className="text-xs text-slate-500">Fase A, Fase B, Fase C (Kelas 1 - 6)</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        selectedLevel === 'SD' ? 'bg-indigo-600 text-white' : 'text-slate-400 group-hover:text-indigo-600'
                      }`}>
                        {selectedLevel === 'SD' ? 'Aktif ✓' : 'Pilih'}
                      </span>
                    </div>

                    {/* Tombol Jenjang SMP */}
                    <div
                      onClick={() => setSelectedLevel(selectedLevel === 'SMP' ? null : 'SMP')}
                      className={`py-3 px-4 rounded-xl border transition-all duration-150 cursor-pointer flex items-center justify-between ${
                        selectedLevel === 'SMP'
                          ? 'border-2 border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500/20'
                          : 'border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedLevel === 'SMP' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'
                        }`}>
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-semibold text-slate-800">Jenjang SMP</h4>
                          <p className="text-xs text-slate-500">Fase D (Kelas 7 - 9)</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                        selectedLevel === 'SMP' ? 'bg-indigo-600 text-white' : 'text-slate-400 group-hover:text-indigo-600'
                      }`}>
                        {selectedLevel === 'SMP' ? 'Aktif ✓' : 'Pilih'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* BAGIAN 2: FILTER & MONITORING PAKET BANK SOAL TERVERIFIKASI */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  
                  {/* Header Modul Monitoring */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/25 shrink-0">
                        <Archive className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-extrabold text-xl text-slate-900">
                            Bank Soal Terverifikasi & Monitoring Paket
                          </h3>
                          <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                            Supervisi Penugasan
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                          Tinjau kemajuan butir naskah guru, periksa rubrik & kunci jawaban, dan lakukan verifikasi dua arah langsung.
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats Badges */}
                    <div className="flex items-center flex-wrap gap-2 text-xs font-bold">
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl">
                        Total Paket: {filteredWriterAssignments.length}
                      </span>
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl">
                        Menunggu: {filteredWriterAssignments.filter(a => getAssignmentStatusInfo(a.status).key === 'pending_review').length}
                      </span>
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl">
                        Terverifikasi: {filteredWriterAssignments.filter(a => getAssignmentStatusInfo(a.status).key === 'approved').length}
                      </span>
                      <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl">
                        Perlu Revisi: {filteredWriterAssignments.filter(a => getAssignmentStatusInfo(a.status).key === 'needs_revision').length}
                      </span>
                    </div>
                  </div>

                  {/* 1. PANEL KOTAK FILTER RESPONSIF */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                    
                    {/* Input Pencarian */}
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Pencarian Teks
                      </label>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          value={monSearchTerm}
                          onChange={(e) => setMonSearchTerm(e.target.value)}
                          placeholder="Cari nama penulis / judul paket..."
                          className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Dropdown Jenjang & Kelas */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Jenjang & Kelas
                      </label>
                      <select
                        value={monFilterGrade}
                        onChange={(e) => setMonFilterGrade(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">Semua Jenjang & Kelas</option>
                        <option value="SD_ALL">Semua SD (Kelas 1–6)</option>
                        <option value="Kelas 1">SD - Kelas 1</option>
                        <option value="Kelas 2">SD - Kelas 2</option>
                        <option value="Kelas 3">SD - Kelas 3</option>
                        <option value="Kelas 4">SD - Kelas 4</option>
                        <option value="Kelas 5">SD - Kelas 5</option>
                        <option value="Kelas 6">SD - Kelas 6</option>
                        <option value="SMP_ALL">Semua SMP (Kelas 7–9)</option>
                        <option value="Kelas 7">SMP - Kelas 7</option>
                        <option value="Kelas 8">SMP - Kelas 8</option>
                        <option value="Kelas 9">SMP - Kelas 9</option>
                      </select>
                    </div>

                    {/* Dropdown Mata Pelajaran */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Mata Pelajaran
                      </label>
                      <select
                        value={monFilterSubject}
                        onChange={(e) => setMonFilterSubject(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">Semua Mapel</option>
                        <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                        <option value="Matematika">Matematika</option>
                        <option value="IPAS">IPAS</option>
                        <option value="Pendidikan Pancasila">Pendidikan Pancasila</option>
                        <option value="Bahasa Inggris">Bahasa Inggris</option>
                        <option value="PJOK">PJOK</option>
                        <option value="Seni Budaya">Seni Budaya / Seni Rupa</option>
                        <option value="Informatika">Informatika</option>
                        <option value="Pendidikan Agama">Pendidikan Agama</option>
                      </select>
                    </div>

                    {/* Dropdown Jenis Asesmen */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Jenis Asesmen
                      </label>
                      <select
                        value={monFilterAssessment}
                        onChange={(e) => setMonFilterAssessment(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">Semua Jenis</option>
                        <option value="SAS">Sumatif Akhir Semester (SAS)</option>
                        <option value="STS">Sumatif Tengah Semester (STS)</option>
                        <option value="PTS">Penilaian Tengah Semester (PTS)</option>
                        <option value="Formatif">Asesmen Formatif/Harian</option>
                        <option value="SAT">Sumatif Akhir Tahun (SAT)</option>
                        <option value="SAJ">Ujian Sekolah (SAJ)</option>
                      </select>
                    </div>

                    {/* Dropdown Status Paket */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        Status Paket
                      </label>
                      <select
                        value={monFilterStatus}
                        onChange={(e) => setMonFilterStatus(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="ALL">Semua Status</option>
                        <option value="draft">Draft</option>
                        <option value="in_progress">Proses Penulisan</option>
                        <option value="pending_review">Menunggu Verifikasi (Selesai Penulis)</option>
                        <option value="needs_revision">Perlu Revisi</option>
                        <option value="approved">Terverifikasi (Approved)</option>
                      </select>
                    </div>
                  </div>

                  {/* 2. TAMPILAN TABEL MONITORING PAKET PENUGASAN */}
                  <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="table-auto w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4 w-12 text-center">No</th>
                            <th className="py-3 px-4">Nama Penulis</th>
                            <th className="py-3 px-4">Jenjang & Kelas</th>
                            <th className="py-3 px-4">Mata Pelajaran</th>
                            <th className="py-3 px-4">Jenis Tes</th>
                            <th className="py-3 px-4">Progres Soal</th>
                            <th className="py-3 px-4">Keterangan / Status</th>
                            <th className="py-3 px-4 text-center w-20">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredWriterAssignments.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                                <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                Tidak ada paket penugasan bank soal yang cocok dengan filter yang dipilih.
                              </td>
                            </tr>
                          ) : (
                            filteredWriterAssignments.map((asg, idx) => {
                              const statusInfo = getAssignmentStatusInfo(asg.status);
                              const qData = getAssignmentQuestions(asg);
                              const progressText = `${qData.writtenCount}/${qData.target} Butir`;

                              return (
                                <tr key={asg.id} className="hover:bg-slate-50/80 transition-colors">
                                  {/* 1. No */}
                                  <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-xs">
                                    {idx + 1}
                                  </td>

                                  {/* 2. Nama Penulis */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-brand-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                                        {(asg.user_name || 'G').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                          {asg.user_name}
                                        </div>
                                        <div className="text-[11px] text-slate-500 line-clamp-1">
                                          {asg.user_institution || asg.user_email || 'Instansi Terdaftar'}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* 3. Jenjang & Kelas */}
                                  <td className="py-3.5 px-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                      {asg.level} - {asg.grade_class}
                                    </span>
                                  </td>

                                  {/* 4. Mata Pelajaran */}
                                  <td className="py-3.5 px-4">
                                    <span className="font-bold text-slate-800 text-xs sm:text-sm">
                                      {asg.subject_name}
                                    </span>
                                  </td>

                                  {/* 5. Jenis Tes */}
                                  <td className="py-3.5 px-4">
                                    <div className="flex flex-wrap gap-1">
                                      {(asg.assessment_types || ['SAS']).map(t => (
                                        <span
                                          key={t}
                                          className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                                        >
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </td>

                                  {/* 6. Progres Soal */}
                                  <td className="py-3.5 px-4">
                                    <div className="space-y-1">
                                      <span className="text-xs font-extrabold text-slate-800">
                                        {progressText}
                                      </span>
                                      <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                        <div
                                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                          style={{ width: `${Math.min(100, (qData.writtenCount / (qData.target || 1)) * 100)}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>

                                  {/* 7. Keterangan / Status */}
                                  <td className="py-3.5 px-4">
                                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusInfo.badgeClass}`}>
                                      {statusInfo.key === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                      {statusInfo.key === 'needs_revision' && <AlertTriangle className="w-3 h-3" />}
                                      {statusInfo.key === 'pending_review' && <Clock className="w-3 h-3" />}
                                      <span>{statusInfo.label}</span>
                                    </span>
                                  </td>

                                  {/* 8. Aksi */}
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPreviewAssignment(asg);
                                        setIsRevisionFormOpen(false);
                                        setRevisionNotesInput(asg.revision_notes || '');
                                        setActivePreviewQuestionTab('ALL');
                                      }}
                                      title="Lihat Daftar & Pratinjau Butir Soal"
                                      className="p-2 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 transition shadow-xs active:scale-95 inline-flex items-center justify-center"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </div>
            ) : !isFilterComplete && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6 animate-fade-in">
                
                {/* LANGKAH 1: PILIH JENJANG */}
                {!selectedLevel && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200">
                        Langkah 1 dari 4
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-2">
                        Pilih Jenjang Satuan Pendidikan
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                        Tentukan jenjang sekolah untuk memuat kurikulum, tingkat kelas, dan mata pelajaran yang sesuai.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedLevel(selectedLevel === 'SD' ? null : 'SD')}
                        className={`group relative flex items-center justify-between py-3 px-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                          selectedLevel === 'SD'
                            ? 'border-2 border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500/20'
                            : 'border border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            selectedLevel === 'SD' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h4 className="text-sm font-semibold text-slate-800">Jenjang SD</h4>
                            <p className="text-xs text-slate-500">Fase A, Fase B, Fase C (Kelas 1 - 6)</p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${selectedLevel === 'SD' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedLevel(selectedLevel === 'SMP' ? null : 'SMP')}
                        className={`group relative flex items-center justify-between py-3 px-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                          selectedLevel === 'SMP'
                            ? 'border-2 border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500/20'
                            : 'border border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            selectedLevel === 'SMP' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700'
                          }`}>
                            <BookOpen className="w-5 h-5" />
                          </div>
                          <div className="text-left">
                            <h4 className="text-sm font-semibold text-slate-800">Jenjang SMP</h4>
                            <p className="text-xs text-slate-500">Fase D (Kelas 7 - 9)</p>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${selectedLevel === 'SMP' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      </button>
                    </div>
                  </div>
                )}

                {/* LANGKAH 2: PILIH TINGKAT KELAS */}
                {selectedLevel && !selectedGrade && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                          Langkah 2 dari 4 • Jenjang {selectedLevel}
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-2">
                          Pilih Tingkat Kelas ({selectedLevel})
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                          Tentukan kelas peserta didik untuk mengunci capaian pembelajaran (Fase Kurikulum Merdeka).
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedLevel(null)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                      >
                        ‹ Ganti Jenjang
                      </button>
                    </div>

                    <div className={`grid gap-3 pt-2 ${selectedLevel === 'SD' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
                      {(selectedLevel === 'SD'
                        ? [
                            { grade: 'Kelas 1', phase: 'Fase A', desc: 'Siswa Kelas 1 SD' },
                            { grade: 'Kelas 2', phase: 'Fase A', desc: 'Siswa Kelas 2 SD' },
                            { grade: 'Kelas 3', phase: 'Fase B', desc: 'Siswa Kelas 3 SD' },
                            { grade: 'Kelas 4', phase: 'Fase B', desc: 'Siswa Kelas 4 SD' },
                            { grade: 'Kelas 5', phase: 'Fase C', desc: 'Siswa Kelas 5 SD' },
                            { grade: 'Kelas 6', phase: 'Fase C', desc: 'Siswa Kelas 6 SD' },
                          ]
                        : [
                            { grade: 'Kelas 7', phase: 'Fase D', desc: 'Siswa Kelas 7 SMP' },
                            { grade: 'Kelas 8', phase: 'Fase D', desc: 'Siswa Kelas 8 SMP' },
                            { grade: 'Kelas 9', phase: 'Fase D', desc: 'Siswa Kelas 9 SMP' },
                          ]
                      ).map((item) => (
                        <button
                          key={item.grade}
                          type="button"
                          onClick={() => setSelectedGrade(item.grade)}
                          className="group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border-2 bg-white hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-400 text-left transition-all hover:shadow-md hover:-translate-y-0.5"
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span className="font-black text-base text-slate-900 group-hover:text-indigo-700">
                              {item.grade}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                              {item.phase}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* LANGKAH 3: PILIH MATA PELAJARAN */}
                {selectedLevel && selectedGrade && !selectedSubject && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          Langkah 3 dari 4 • {selectedGrade} ({selectedLevel})
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-2">
                          Pilih Mata Pelajaran
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                          Daftar mata pelajaran aktif khusus jenjang {selectedLevel} dari database kurikulum.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedGrade(null)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                      >
                        ‹ Ganti Kelas
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                      {(() => {
                        const mapelList = availableSubjects.filter(s => s.level === selectedLevel);
                        const displayList = mapelList.length > 0 ? mapelList : (
                          selectedLevel === 'SD'
                            ? [
                                { id: '1', name: 'Bahasa Indonesia', code: 'BIN-SD' },
                                { id: '2', name: 'Matematika', code: 'MAT-SD' },
                                { id: '3', name: 'IPAS', code: 'IPAS-SD' },
                                { id: '4', name: 'Pendidikan Pancasila', code: 'PPKN-SD' },
                                { id: '5', name: 'PJOK', code: 'PJOK-SD' },
                                { id: '6', name: 'Seni Rupa', code: 'SR-SD' },
                                { id: '7', name: 'Bahasa Inggris', code: 'BING-SD' },
                                { id: '8', name: 'Bahasa Sunda', code: 'BSU-SD' },
                                { id: '9', name: 'Pendidikan Agama Islam', code: 'PAI-SD' },
                              ]
                            : [
                                { id: '1', name: 'Bahasa Indonesia', code: 'BIN-SMP' },
                                { id: '2', name: 'Matematika', code: 'MAT-SMP' },
                                { id: '3', name: 'IPA', code: 'IPA-SMP' },
                                { id: '4', name: 'IPS', code: 'IPS-SMP' },
                                { id: '5', name: 'Bahasa Inggris', code: 'BING-SMP' },
                                { id: '6', name: 'Pendidikan Pancasila', code: 'PPKN-SMP' },
                                { id: '7', name: 'PJOK', code: 'PJOK-SMP' },
                                { id: '8', name: 'Informatika', code: 'INF-SMP' },
                                { id: '9', name: 'Pendidikan Agama Islam', code: 'PAI-SMP' },
                              ]
                        );

                        return displayList.map((sub: any) => {
                          const subName = sub?.name || 'Mata Pelajaran';
                          const countForSub = items.filter(i => {
                            const matchG = !selectedGrade || ((i?.grade_class || '').toLowerCase().includes(selectedGrade.toLowerCase()));
                            return isSameSubject(i?.subject_name, subName) && matchG;
                          }).length;

                          return (
                            <button
                              key={sub.id || sub.code}
                              type="button"
                              onClick={() => setSelectedSubject(sub.name)}
                              className="group flex items-center justify-between p-4 rounded-2xl border-2 bg-white hover:bg-emerald-50/60 border-slate-200 hover:border-emerald-400 text-left transition-all hover:shadow-md hover:-translate-y-0.5"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  <BookMarked className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-black text-sm text-slate-900 group-hover:text-emerald-800 line-clamp-1">
                                    {sub.name}
                                  </h4>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {sub.code || 'MAPEL'}
                                  </span>
                                </div>
                              </div>
                              {countForSub > 0 && (
                                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                                  {countForSub} Kisi
                                </span>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* LANGKAH 4: PILIH JENIS ASESMEN */}
                {selectedLevel && selectedGrade && selectedSubject && !selectedAssessment && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                          Langkah 4 dari 4 • {selectedSubject} ({selectedGrade})
                        </span>
                        <h3 className="text-xl font-black text-slate-900 mt-2">
                          Pilih Jenis Asesmen / Tes
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                          Tentukan tujuan evaluasi asesmen untuk membuka ruang kerja kisi-kisi dan butir soal.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSubject(null)}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                      >
                        ‹ Ganti Mapel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                      {[
                        { key: 'Formatif', title: 'Formatif', badge: 'Harian', desc: 'Asesmen Formatif & Lingkup Materi', color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/60' },
                        { key: 'Sumatif', title: 'Sumatif (STS)', badge: 'Tengah Sem.', desc: 'Sumatif Tengah Semester / PTS', color: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50/60' },
                        { key: 'SAS', title: 'SAS', badge: 'Semester Ganjil', desc: 'Sumatif Akhir Semester Ganjil', color: 'border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/60' },
                        { key: 'SAT', title: 'SAT', badge: 'Semester Genap', desc: 'Sumatif Akhir Tahun / Kenaikan Kelas', color: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50/60' },
                        { key: 'SAJ', title: 'SAJ', badge: 'Akhir Jenjang', desc: 'Sumatif Akhir Jenjang (Kelas 6 / 9)', color: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/60' },
                      ].map((asmt) => (
                        <button
                          key={asmt.key}
                          type="button"
                          onClick={() => setSelectedAssessment(asmt.key)}
                          className={`group flex flex-col justify-between p-4 sm:p-5 rounded-2xl border-2 bg-white text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${asmt.color}`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="font-black text-base text-slate-900 group-hover:text-brand-700">
                              {asmt.title}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {asmt.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{asmt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })()}

      {/* Feedback Banner Excel */}
      {excelFeedback && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border animate-fade-in ${
          excelFeedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center space-x-3">
            {excelFeedback.type === 'success' ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-bold">{excelFeedback.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setExcelFeedback(null)}
            className="text-xs font-bold px-2 py-1 hover:bg-black/5 rounded-lg"
          >
            Tutup
          </button>
        </div>
      )}

      {/* VIEW 1: PEMETAAN KISI-KISI (TABEL MATRIKS 11 KOLOM) */}
      {activeSubMode === 'kisi-kisi' && Boolean(selectedLevel && selectedGrade && selectedSubject && selectedAssessment) && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          
          {/* Controls Bar & Excel Toolbar */}
          <div className="p-6 border-b border-slate-100 flex flex-col gap-4">
            
            {/* Top Toolbar: Excel Export/Import & Search */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              
              {/* Search */}
              <div className="relative w-full lg:w-96">
                <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari elemen, konteks, atau indikator..."
                  className="w-full pl-11 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons: Template, Import, Export Excel, Buat Manual */}
              <div className="flex flex-wrap items-center gap-2.5">

                {/* Filter Penulis untuk Super Admin (Solusi C) */}
                {isSuperAdmin && allWritersList.length > 0 && (
                  <div className="flex items-center space-x-2 bg-indigo-50/70 border border-indigo-200 px-3 py-2 rounded-xl text-xs">
                    <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-bold text-indigo-950 whitespace-nowrap">Filter Penulis:</span>
                    <select
                      value={filterWriter}
                      onChange={(e) => setFilterWriter(e.target.value)}
                      className="bg-transparent font-bold text-indigo-900 text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">Semua Penulis ({items.length} butir)</option>
                      {allWritersList.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.count} butir)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tombol Bersihkan Lembar Kerja Penugasan (Solusi B) */}
                {Boolean(currentUser?.role === 'teacher' || initialScope?.assignment) && (
                  <button
                    type="button"
                    onClick={() => setShowClearWorkspaceModal(true)}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black flex items-center space-x-2 transition-all active:scale-95 shadow-2xs"
                    title="Kosongkan seluruh butir kisi-kisi dan naskah soal yang telah Anda buat untuk penugasan ini agar lembar kerja kembali bersih"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Bersihkan Lembar Kerja</span>
                  </button>
                )}

                {/* Checkbox Termasuk Soal Arsip */}
                <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 px-3 py-2.5 rounded-xl border border-slate-200 cursor-pointer transition-colors shadow-2xs">
                  <input
                    type="checkbox"
                    checked={showArchivedItems}
                    onChange={e => setShowArchivedItems(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                  />
                  <Archive className="w-3.5 h-3.5 text-amber-600" />
                  <span>Termasuk Arsip</span>
                </label>
                
                {/* Buat Kisi-Kisi Manual (Permintaan User) */}
                <button
                  type="button"
                  onClick={handleOpenCreateManual}
                  className="px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center space-x-2 transition-all shadow-md shadow-brand-500/25 active:scale-95"
                  title="Buat butir kisi-kisi langsung secara manual di aplikasi"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Kisi-Kisi Manual</span>
                </button>

                {/* Download Template Excel (Buka Wizard) */}
                <button
                  type="button"
                  onClick={handleOpenImportWizard}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all border border-slate-200 active:scale-95"
                  title="Pilih jenjang, mapel, fase, dan kelas untuk mengunduh template Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Unduh Template</span>
                </button>

                {/* Import Excel (Buka Wizard Terlebih Dahulu Sebelum File Picker) */}
                <button
                  type="button"
                  onClick={handleOpenImportWizard}
                  className="px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-emerald-500/80 hover:border-emerald-600 rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Pilih spesifikasi template lalu impor file Excel agar otomatis terpisah"
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span>Impor Excel</span>
                </button>

                {/* Export Excel (A4 Margin 1.5 cm) */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold flex items-center space-x-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                  title="Ekspor seluruh kisi-kisi ke file Excel dengan layout siap cetak (A4 Margin 1,5 cm)"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Excel (A4 Margin 1.5cm)</span>
                </button>

                {/* Super Admin Actions: Backup, Restore & Reset */}
                {isSuperAdmin && (
                  <>
                    <input
                      type="file"
                      ref={restoreFileInputRef}
                      accept=".json"
                      onChange={handleRestoreBackup}
                      className="hidden"
                    />

                    {/* Cadangkan Data (Backup JSON) */}
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-xs active:scale-95"
                      title={isScopedFilter ? `Unduh cadangan data khusus ${selectedSubject} (${selectedGrade} • ${selectedAssessment})` : "Unduh cadangan data ke file JSON"}
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                      <span>{isScopedFilter ? `Cadangkan Data (${selectedSubject} • ${selectedGrade})` : 'Cadangkan Data (JSON)'}</span>
                    </button>

                    {/* Pulihkan Data (Restore JSON) */}
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={() => restoreFileInputRef.current?.click()}
                      className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                      title={isScopedFilter ? `Pulihkan data cadangan khusus ${selectedSubject} (${selectedGrade} • ${selectedAssessment}) tanpa menimpa mapel lain` : "Unggah file JSON cadangan untuk memulihkan kisi-kisi dan butir soal"}
                    >
                      <Upload className="w-4 h-4 text-amber-600" />
                      <span>{isRestoring ? 'Memulihkan...' : (isScopedFilter ? 'Pulihkan Data (Slot Ini)' : 'Pulihkan Data (JSON)')}</span>
                    </button>

                    {/* Reset Kisi-Kisi & Soal (Super Admin Only) */}
                    <button
                      type="button"
                      disabled={isResetting}
                      onClick={handleResetBlueprintAndQuestions}
                      className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-extrabold flex items-center space-x-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                      title={isScopedFilter ? `Kosongkan kisi-kisi & butir soal HANYA untuk ${selectedSubject} (${selectedGrade} • ${selectedAssessment}). Data mapel lain AMAN` : "Kosongkan seluruh butir kisi-kisi dan butir soal"}
                    >
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      <span>{isResetting ? 'Mereset...' : (isScopedFilter ? 'Reset Kisi-Kisi & Soal (Slot Ini)' : 'Reset Kisi-Kisi & Soal')}</span>
                    </button>
                  </>
                )}

              </div>

            </div>

            {/* Bottom Filter Row (Tanpa Filter Semua Elemen) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Filter Tipe Soal */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-medium text-slate-700 focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">Semua Tipe Soal</option>
                <option value="Pilihan Ganda">Pilihan Ganda</option>
                <option value="Pilihan Ganda Kompleks">PG Kompleks</option>
                <option value="Menjodohkan">Menjodohkan</option>
                <option value="Benar/Salah">Benar/Salah</option>
                <option value="Isian Singkat">Isian Singkat</option>
                <option value="Uraian">Uraian</option>
              </select>

              {/* Filter Status */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-brand-700 focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">Semua Status</option>
                <option value="Dalam Penulisan">Dalam Penulisan</option>
                <option value="Draft">Draft</option>
                <option value="Menunggu Riviu">Menunggu Riviu</option>
                <option value="Selesai">Selesai</option>
              </select>

              {/* Sort question number */}
              <button
                type="button"
                onClick={() => {
                  if (sortField === 'question_number') setSortAsc(!sortAsc);
                  else { setSortField('question_number'); setSortAsc(true); }
                }}
                className="p-2.5 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 flex items-center space-x-1 text-sm font-semibold"
                title="Urutkan No Soal"
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>No</span>
              </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Menampilkan <strong className="text-slate-800">{filteredItems.length}</strong> dari {initialScope?.isLocked ? `${initialScope.targetQuestions || 5} butir target penugasan` : `${items.length} butir`}
              </div>
            </div>

          </div>

          {/* Table Matriks 11 Kolom */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-3 text-center w-16">No & Tes</th>
                  <th className="py-4 px-4 min-w-[130px]">1. Elemen</th>
                  <th className="py-4 px-4 min-w-[130px]">2. Subelemen</th>
                  <th className="py-4 px-4 min-w-[200px]">3. Kompetensi (CP/TP)</th>
                  <th className="py-4 px-3 min-w-[100px]">4. Jenis</th>
                  <th className="py-4 px-3 min-w-[140px]">5. Kognitif</th>
                  <th className="py-4 px-4 min-w-[240px]">6. Konteks</th>
                  <th className="py-4 px-4 min-w-[200px]">7. Indikator</th>
                  <th className="py-4 px-3 min-w-[130px]">8. Tipe Soal</th>
                  <th className="py-4 px-3 text-center min-w-[90px]">9. Tugas</th>
                  <th className="py-4 px-4 min-w-[130px]">10. Status</th>
                  <th className="py-4 px-3 text-right min-w-[160px]">Aksi Kisi-Kisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* No & Kategori Tes */}
                    <td className="py-4 px-3 text-center font-black text-slate-900 bg-slate-50/50">
                      <div>#{item.question_number}</div>
                      <span className={`inline-block mt-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                        (item.assessment_type || 'SAS') === 'Formatif'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : (item.assessment_type || 'SAS') === 'SAT'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-brand-100 text-brand-800 border border-brand-200'
                      }`}>
                        {item.assessment_type || 'SAS'}
                      </span>
                    </td>

                    {/* 1. Elemen */}
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {item.element}
                    </td>

                    {/* 2. Subelemen */}
                    <td className="py-4 px-4 text-slate-600">
                      {item.sub_element}
                    </td>

                    {/* 3. Kompetensi */}
                    <td className="py-4 px-4 text-slate-700 leading-snug">
                      {item.competency}
                    </td>

                    {/* 4. Jenis */}
                    <td className="py-4 px-3">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-xs whitespace-nowrap">
                        {item.question_category}
                      </span>
                    </td>

                    {/* 5. Level Kognitif */}
                    <td className="py-4 px-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap ${
                        item.cognitive_level.includes('L3') 
                          ? 'bg-purple-100 text-purple-800' 
                          : item.cognitive_level.includes('L2')
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.cognitive_level}
                      </span>
                    </td>

                    {/* 6. Konteks (Creatable Combobox) */}
                    <td className="py-4 px-4">
                      <CreatableCombobox
                        value={item.context}
                        onChange={(val) => handleContextChange(item.id, val)}
                        options={contextPresets}
                        placeholder="Pilih atau ketik konteks..."
                      />
                    </td>

                    {/* 7. Indikator */}
                    <td className="py-4 px-4 text-slate-700 leading-snug">
                      {item.indicator}
                    </td>

                    {/* 8. Tipe Soal */}
                    <td className="py-4 px-3">
                      <span className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-700 font-bold text-xs whitespace-nowrap">
                        {item.question_type}
                      </span>
                    </td>

                    {/* 9. Tugas */}
                    <td className="py-4 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                        item.task_type === 'TULIS'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {item.task_type}
                      </span>
                    </td>

                    {/* 10. Status */}
                    <td className="py-4 px-4">
                      {getStatusBadge(item.workflow_status)}
                    </td>

                    {/* Aksi: Pratinjau (Mata), Edit & Simpan, Hapus, dan Tulis Soal */}
                    <td className="py-4 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* 1. Pratinjau (Gambar Mata) */}
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 active:scale-95 shadow-2xs"
                          title="Pratinjau Lengkap Butir Kisi-Kisi"
                        >
                          <Eye className="w-4 h-4 text-slate-700" />
                        </button>

                        {/* 2. Edit & Simpan */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditItem(item)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-xl transition-all active:scale-95 shadow-2xs"
                          title="Edit & Simpan Kisi-Kisi"
                        >
                          <Edit3 className="w-4 h-4 text-amber-700" />
                        </button>

                        {/* 3. Hapus */}
                        <button
                          type="button"
                          onClick={() => handleDeleteBlueprintItem(item)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-xl transition-all active:scale-95 shadow-2xs"
                          title="Hapus Butir Kisi-Kisi"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {isLoadingData ? (
                  <tr>
                    <td colSpan={12} className="py-12 px-4 bg-white">
                      <HourglassLoader
                        title="Sedang Memuat Data Kisi-Kisi..."
                        subtitle={`Menghubungkan ke database cloud SASI untuk ${selectedSubject || 'Mata Pelajaran'} (${selectedGrade || ''}). Mohon tunggu sejenak, data kisi-kisi dan indikator Anda sedang disinkronkan secara aman.`}
                        badgeText="MEMUAT KISI-KISI DARI SUPABASE"
                      />
                    </td>
                  </tr>
                ) : filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={12} className="py-14 text-center text-slate-400 bg-slate-50/40">
                      <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3 border border-brand-200">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <p className="font-black text-base text-slate-800">
                        Belum Ada Kisi-Kisi untuk {selectedSubject || 'Mata Pelajaran'} ({selectedGrade || ''} • {selectedAssessment || ''})
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Mulai susun kisi-kisi baru untuk slot asesmen ini secara manual atau impor dari template Excel A4.
                      </p>
                      <div className="flex items-center justify-center gap-3 mt-4">
                        <button
                          type="button"
                          onClick={handleOpenCreateManual}
                          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Buat Kisi-Kisi Manual</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenImportWizard}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Impor File Excel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* VIEW 2: PENULISAN SOAL (TAMPILAN KOMPAK 1 BARIS MEMANJANG SEPERTI KISI-KISI) */}
      {activeSubMode === 'penulisan' && Boolean(selectedLevel && selectedGrade && selectedSubject && selectedAssessment) && (
        (isScopedFilter ? items.filter(isItemInCurrentScope).length === 0 : items.length === 0) ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-14 text-center shadow-sm space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
                Alur Tahapan: Tahap 2 Terkunci
              </span>
              <h3 className="text-xl font-black text-slate-900 pt-2">
                Soal Tidak Bisa Dibuat Sebelum Ada Kisi-Kisi
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Kisi-kisi merupakan <strong>acuan mutlak</strong> untuk penulisan soal. Setiap butir soal wajib merujuk pada elemen, indikator, level kognitif, dan tipe soal yang telah ditetapkan pada kisi-kisi.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveSubMode('kisi-kisi');
                  handleOpenCreateManual();
                }}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Kisi-Kisi Pertama (Tahap 1)</span>
              </button>
            </div>
          </div>
        ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in space-y-0">
          
          {/* Header Penulisan Soal */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Area Kerja Penulisan & Riviu Soal</h3>
                <p className="text-xs text-slate-500">Tampilan 1 baris memanjang: efisien, ringkas, dan langsung terhubung ke editor stimulus & opsi</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {initialScope?.isLocked ? (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-black text-amber-900">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{selectedSubject} • {selectedGrade} • {selectedAssessment}</span>
                </div>
              ) : (
                <>
                  {/* Filter Mapel */}
                  <select
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="text-xs border border-amber-300 rounded-xl px-3 py-1.5 font-bold text-amber-950 bg-amber-50 focus:ring-2 focus:ring-amber-500 max-w-[200px]"
                  >
                    <option value="ALL">Semua Mapel</option>
                    {Array.from(new Set(availableSubjects.map(s => s.name))).map((sName) => (
                      <option key={sName} value={sName}>{sName}</option>
                    ))}
                  </select>

                  {/* Filter Kelas */}
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="text-xs border border-purple-300 rounded-xl px-3 py-1.5 font-bold text-purple-950 bg-purple-50 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ALL">Semua Kelas</option>
                    <option value="Kelas 1">Kelas 1 (Fase A)</option>
                    <option value="Kelas 2">Kelas 2 (Fase A)</option>
                    <option value="Kelas 3">Kelas 3 (Fase B)</option>
                    <option value="Kelas 4">Kelas 4 (Fase B)</option>
                    <option value="Kelas 5">Kelas 5 (Fase C)</option>
                    <option value="Kelas 6">Kelas 6 (Fase C)</option>
                    <option value="Kelas 7">Kelas 7 (Fase D)</option>
                    <option value="Kelas 8">Kelas 8 (Fase D)</option>
                    <option value="Kelas 9">Kelas 9 (Fase D)</option>
                  </select>

                  {/* Filter Kategori Tes */}
                  <select
                    value={filterAssessment}
                    onChange={(e) => setFilterAssessment(e.target.value)}
                    className="text-xs border border-emerald-300 rounded-xl px-3 py-1.5 font-bold text-emerald-950 bg-emerald-50 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">Semua Kategori Tes</option>
                    <option value="Formatif">Formatif</option>
                    <option value="Sumatif">Sumatif (STS/PTS)</option>
                    <option value="SAS">SAS</option>
                    <option value="SAT">SAT</option>
                    <option value="SAJ">SAJ</option>
                  </select>
                </>
              )}

              <span className="text-xs font-bold px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl">
                {stats.ditugaskan.count + stats.draft.count} Perlu Dikerjakan
              </span>
              <span className="text-xs font-bold px-3 py-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl">
                {stats.selesai.count} Siap Terbit
              </span>
            </div>
          </div>

          {/* Tabel Kompak 1 Baris Memanjang */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-3 text-center w-14">No</th>
                  <th className="py-4 px-4 min-w-[130px]">Tipe & Level</th>
                  <th className="py-4 px-4 min-w-[180px]">Elemen / Topik</th>
                  <th className="py-4 px-4 min-w-[260px]">Indikator & Konteks</th>
                  <th className="py-4 px-4">Varian Soal</th>
                  <th className="py-4 px-3 text-center min-w-[90px]">Tugas</th>
                  <th className="py-4 px-4 min-w-[130px]">Status</th>
                  <th className="py-4 px-4 text-right min-w-[150px]">Aksi Penulisan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingData ? (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 bg-white">
                      <HourglassLoader
                        title="Sedang Memuat Lembar Kerja Penulisan Soal..."
                        subtitle={`Menghubungkan ke database cloud SASI untuk butir soal ${selectedSubject || 'Mata Pelajaran'} (${selectedGrade || ''}). Mohon tunggu sejenak, naskah stimulus dan opsi jawaban Anda sedang disinkronkan.`}
                        badgeText="MEMUAT BANK SOAL DARI SUPABASE"
                      />
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 bg-slate-50/30">
                      <div className="max-w-md mx-auto space-y-2">
                        <PenTool className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-bold text-slate-700 text-sm">
                          Belum Ada Butir Kisi-Kisi untuk {selectedSubject || 'Mapel Ini'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Silakan kembali ke tab <strong>"1. Pemetaan Kisi-Kisi"</strong> untuk menambahkan indikator soal terlebih dahulu.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveSubMode('kisi-kisi')}
                          className="mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center space-x-1.5"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Buka Pemetaan Kisi-Kisi</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                  // Temukan semua varian soal untuk butir kisi-kisi ini (Multi-Varian)
                  const itemVariants = questionBank.filter(q => q.blueprint_item_id === item.id || (!q.blueprint_item_id && q.id === `qb-00${item.question_number}`));
                  const totalVariants = itemVariants.length;
                  const primaryQ = itemVariants[0];
                  const hasStimulus = Boolean(primaryQ?.stimulus_text);
                  const hasQuestion = Boolean(primaryQ?.question_text);

                  return (
                    <tr key={item.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* No */}
                      <td className="py-3.5 px-3 text-center font-black text-slate-900 bg-slate-50/50">
                        #{item.question_number}
                      </td>

                      {/* Tipe & Level */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-700 font-bold text-xs whitespace-nowrap">
                            {item.question_type}
                          </span>
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.cognitive_level.includes('L3') 
                                ? 'bg-purple-100 text-purple-800' 
                                : item.cognitive_level.includes('L2')
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.cognitive_level.replace('Pengetahuan dan Pemahaman ', '').replace('Aplikasi ', '').replace('Penalaran ', '')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Elemen / Topik */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="font-bold text-slate-900">{item.element}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[180px]">{item.sub_element}</div>
                      </td>

                      {/* Indikator & Konteks (Dengan Tombol Pratinjau Pemetaan Kisi-Kisi Lengkap) */}
                      <td className="py-3.5 px-4 text-xs leading-snug text-slate-700">
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(item)}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black transition-all shadow-2xs hover:shadow-xs active:scale-95 group shrink-0"
                            title="Buka pratinjau seluruh pemetaan kisi-kisi (CP/TP, level kognitif, konteks, dan indikator lengkap)"
                          >
                            <Eye className="w-3 h-3 text-indigo-600 group-hover:scale-110 transition-transform" />
                            <span>Lihat Kisi-Kisi</span>
                          </button>
                        </div>
                        <div 
                          onClick={() => setPreviewItem(item)}
                          className="font-semibold text-slate-900 line-clamp-2 hover:text-brand-600 cursor-pointer transition-colors"
                          title="Klik teks untuk melihat seluruh pemetaan kisi-kisi lengkap butir ini"
                        >
                          {item.indicator}
                        </div>
                        {item.context && (
                          <div className="text-slate-500 mt-1 flex items-center space-x-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Konteks:</span>
                            <span 
                              onClick={() => setPreviewItem(item)}
                              className="truncate max-w-[200px] italic hover:text-brand-600 cursor-pointer" 
                              title={`Konteks: ${item.context} (Klik untuk detail)`}
                            >
                              {item.context}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Kolom Varian Soal & Kontrol Interaktif (Mata, Pensil, Tong Sampah, + Varian) */}
                      <td className="py-3.5 px-4">
                        {totalVariants > 0 ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                              {totalVariants} Varian
                            </span>

                            {/* Deretan Tombol Kontrol per Varian */}
                            {itemVariants.map((varQ, vIdx) => {
                              const vNum = vIdx + 1;
                              const isFinished = varQ.status === 'Selesai';
                              return (
                                <div 
                                  key={varQ.id || vIdx} 
                                  className="inline-flex items-center space-x-0.5 bg-slate-50 hover:bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-0.5 shadow-2xs transition-all"
                                >
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black mr-0.5 ${
                                    isFinished 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-white text-slate-700 border border-slate-200'
                                  }`}>
                                    #{vNum}
                                  </span>

                                  {/* Ikon Mata (Pratinjau CBT Layar Siswa) */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStudentPreview(item, varQ)}
                                    className="p-1 hover:bg-brand-50 text-slate-500 hover:text-brand-600 rounded transition-colors"
                                    title={`Pratinjau CBT Layar Siswa (Varian #${vNum})`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Ikon Pensil (Edit Butir Soal) */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditorForVariant(item, varQ, vNum)}
                                    className="p-1 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded transition-colors"
                                    title={`Edit Butir Soal (Varian #${vNum})`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Ikon Tong Sampah (Hapus Varian Ini Saja, Kisi-Kisi Tetap Aman) */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestionVariant(varQ, item, vNum)}
                                    className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                    title={`Hapus Soal Varian #${vNum} Saja (Kisi-kisi tetap aman & tidak terhapus)`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}

                            {/* Tombol Tambah Varian Baru Langsung di Samping */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditorForVariant(item, null, totalVariants + 1)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-black inline-flex items-center space-x-1 shadow-2xs transition-all active:scale-95 shrink-0"
                              title={`Tambah Soal Varian Baru (#${totalVariants + 1}) untuk Kisi-Kisi Ini`}
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>+ Varian</span>
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-2">
                            <span className="text-slate-400 italic text-[11px]">Belum ada soal</span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditorForVariant(item, null, 1)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-black inline-flex items-center space-x-1 bg-brand-600 hover:bg-brand-700 text-white shadow-xs active:scale-95 transition-all shrink-0"
                              title="Tulis Soal Varian #1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tulis Soal #1</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Tugas */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-black uppercase ${
                          item.task_type === 'TULIS'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                          {item.task_type}
                        </span>
                      </td>

                      {/* Status Penulisan Soal Riil (Bukan Status Kisi-Kisi) */}
                      <td className="py-3.5 px-4">
                        {getQuestionStatusBadge(totalVariants, itemVariants)}
                      </td>

                      {/* Tombol Aksi Cepat Penulisan */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {totalVariants === 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditorForVariant(item, null, 1)}
                            className="px-3.5 py-2 rounded-xl text-xs font-black inline-flex items-center space-x-1.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white shadow-md shadow-brand-500/20 active:scale-95 transition-all"
                            title="Mulai tulis butir soal varian #1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tulis Soal #1</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditorForVariant(item, null, totalVariants + 1)}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black inline-flex items-center space-x-1.5 shadow-xs transition-all active:scale-95"
                            title={`Tambah Soal Varian Baru (#${totalVariants + 1}) untuk Kisi-Kisi Ini`}
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+ Varian Baru</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </div>
        )
      )}

      {/* VIEW 3: BANK SOAL TERVERIFIKASI (FILTER SELECTION + TRIGGER BUTTON) */}
      {activeSubMode === 'bank-soal' && Boolean(selectedLevel && selectedGrade && selectedSubject && selectedAssessment) && (
        isLoadingData ? (
          <div className="bg-white rounded-3xl p-10 border border-slate-200">
            <HourglassLoader
              title="Sedang Memuat Katalog Bank Soal..."
              subtitle="Menarik butir-butir soal yang telah disetujui dari cloud database SASI..."
              badgeText="MEMUAT KATALOG SOAL"
            />
          </div>
        ) : (isScopedFilter ? items.filter(isItemInCurrentScope).length === 0 : items.length === 0) ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-14 text-center shadow-sm space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <span className="px-3 py-1 bg-slate-200 text-slate-800 rounded-full text-xs font-black uppercase tracking-wider">
                Alur Tahapan: Tahap 3 Belum Tersedia
              </span>
              <h3 className="text-xl font-black text-slate-900 pt-2">
                Bank Soal Tidak Akan Ada Tanpa Kisi-Kisi
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Bank soal merupakan tempat penyimpanan butir-butir soal yang telah tervalidasi. Karena belum ada kisi-kisi pada penugasan ini, katalog bank soal saat ini masih kosong.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSubMode('kisi-kisi');
                handleOpenCreateManual();
              }}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-2 mx-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Mulai Buat Kisi-Kisi (Tahap 1)</span>
            </button>
          </div>
        ) : writtenQuestionsCount === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 sm:p-14 text-center shadow-sm space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
              <Info className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <span className="px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-black uppercase tracking-wider">
                Tahap 2 Sedang Menunggu
              </span>
              <h3 className="text-xl font-black text-slate-900 pt-2">
                Belum Ada Butir Soal yang Ditulis
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Terdapat <strong>{isScopedFilter ? items.filter(isItemInCurrentScope).length : items.length} butir kisi-kisi</strong> yang sudah dipetakan. Silakan buka modul <strong>"2. Penulisan Butir Soal"</strong> untuk mulai menulis naskah stimulus, pertanyaan, opsi, dan kunci jawaban.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubMode('penulisan')}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-2 mx-auto"
            >
              <PenTool className="w-4 h-4" />
              <span>Buka Area Penulisan Soal (Tahap 2)</span>
            </button>
          </div>
        ) : (
        <div className="space-y-6 animate-fade-in">
          
          {/* Panel Seleksi Filter Bank Soal */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/25">
                  <Archive className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900">Katalog Bank Soal Terbit</h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    {initialScope?.isLocked 
                      ? `Terisolasi khusus penugasan: ${selectedSubject} • ${selectedGrade} • ${selectedAssessment}` 
                      : 'Pilih kriteria filter di bawah ini lalu klik tombol untuk memuat daftar butir soal yang sesuai'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold px-3.5 py-1.5 bg-brand-50 text-brand-800 border border-brand-200 rounded-full flex items-center space-x-1.5">
                  <PenTool className="w-3.5 h-3.5 text-brand-600" />
                  <span>Total Ditulis: {writtenQuestionsCount} Butir</span>
                </span>
                <span className="text-xs font-extrabold px-3.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Siap Terbit: {approvedQuestions.length} Butir</span>
                </span>
              </div>
            </div>

            {/* Menu Pilihan Filter (Mapel, Kelas, Kategori Tes, Tipe, Level, Status) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              
              {/* Filter 1: Mapel */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-brand-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Mata Pelajaran</span>
                  {initialScope?.isLocked && <Lock className="w-3 h-3 text-brand-600" />}
                </label>
                {initialScope?.isLocked ? (
                  <div className="w-full text-xs border border-brand-300 rounded-xl px-3 py-2.5 font-bold text-brand-900 bg-brand-50/70 flex items-center justify-between">
                    <span className="truncate">{selectedSubject || initialScope.subject}</span>
                    <span className="text-[10px] bg-brand-200 text-brand-800 px-1.5 py-0.5 rounded font-black shrink-0">Terkunci</span>
                  </div>
                ) : (
                  <select
                    value={bankFilterSubject}
                    onChange={(e) => {
                      setBankFilterSubject(e.target.value);
                      setShowBankQuestions(false);
                    }}
                    className="w-full text-sm border border-brand-300 rounded-xl px-3.5 py-2.5 font-bold text-brand-900 bg-brand-50/50 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">Semua Mapel</option>
                    {Array.from(new Set(availableSubjects.map(s => s.name))).map((sName) => (
                      <option key={sName} value={sName}>{sName}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Filter 2: Kelas */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-purple-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Jenjang & Kelas</span>
                  {initialScope?.isLocked && <Lock className="w-3 h-3 text-purple-600" />}
                </label>
                {initialScope?.isLocked ? (
                  <div className="w-full text-xs border border-purple-300 rounded-xl px-3 py-2.5 font-bold text-purple-900 bg-purple-50/70 flex items-center justify-between">
                    <span className="truncate">{selectedGrade || initialScope.grade}</span>
                    <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-black shrink-0">Terkunci</span>
                  </div>
                ) : (
                  <select
                    value={bankFilterGrade}
                    onChange={(e) => {
                      setBankFilterGrade(e.target.value);
                      setShowBankQuestions(false);
                    }}
                    className="w-full text-sm border border-purple-300 rounded-xl px-3.5 py-2.5 font-bold text-purple-900 bg-purple-50/50 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">Semua Kelas</option>
                    <option value="Kelas 1">Kelas 1 (Fase A)</option>
                    <option value="Kelas 2">Kelas 2 (Fase A)</option>
                    <option value="Kelas 3">Kelas 3 (Fase B)</option>
                    <option value="Kelas 4">Kelas 4 (Fase B)</option>
                    <option value="Kelas 5">Kelas 5 (Fase C)</option>
                    <option value="Kelas 6">Kelas 6 (Fase C)</option>
                    <option value="Kelas 7">Kelas 7 (Fase D)</option>
                    <option value="Kelas 8">Kelas 8 (Fase D)</option>
                    <option value="Kelas 9">Kelas 9 (Fase D)</option>
                  </select>
                )}
              </div>

              {/* Filter 3: Kategori Tes (Formatif, SAS, SAT, dll) */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Kategori Tes</span>
                  {initialScope?.isLocked && <Lock className="w-3 h-3 text-emerald-600" />}
                </label>
                {initialScope?.isLocked ? (
                  <div className="w-full text-xs border border-emerald-300 rounded-xl px-3 py-2.5 font-bold text-emerald-950 bg-emerald-50/70 flex items-center justify-between">
                    <span className="truncate">{selectedAssessment || initialScope.assessment}</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-black shrink-0">Terkunci</span>
                  </div>
                ) : (
                  <select
                    value={bankFilterAssessment}
                    onChange={(e) => {
                      setBankFilterAssessment(e.target.value);
                      setShowBankQuestions(false);
                    }}
                    className="w-full text-sm border border-emerald-300 rounded-xl px-3.5 py-2.5 font-bold text-emerald-950 bg-emerald-50/60 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ALL">Semua Kategori</option>
                    <option value="Formatif">Formatif</option>
                    <option value="Sumatif">Sumatif (STS/PTS)</option>
                    <option value="SAS">SAS</option>
                    <option value="SAT">SAT</option>
                    <option value="SAJ">SAJ</option>
                  </select>
                )}
              </div>

              {/* Filter 4: Tipe Soal */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Tipe Soal
                </label>
                <select
                  value={bankFilterType}
                  onChange={(e) => {
                    setBankFilterType(e.target.value);
                  }}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                >
                  <option value="ALL">Semua Tipe Soal</option>
                  <option value="Pilihan Ganda">Pilihan Ganda</option>
                  <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks</option>
                  <option value="Menjodohkan">Menjodohkan</option>
                  <option value="Benar/Salah">Benar/Salah</option>
                  <option value="Isian Singkat">Isian Singkat</option>
                  <option value="Uraian">Uraian</option>
                </select>
              </div>

              {/* Filter 5: Level Kognitif */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Level Kognitif
                </label>
                <select
                  value={bankFilterCognitive}
                  onChange={(e) => {
                    setBankFilterCognitive(e.target.value);
                  }}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                >
                  <option value="ALL">Semua Level (L1, L2, L3)</option>
                  <option value="Pengetahuan dan Pemahaman (L1)">L1 - Pengetahuan & Pemahaman</option>
                  <option value="Aplikasi (L2)">L2 - Aplikasi</option>
                  <option value="Penalaran (L3)">L3 - Penalaran</option>
                </select>
              </div>

              {/* Filter 6: Status Kelolosan */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Status Kelolosan
                </label>
                <select
                  value={bankFilterStatus}
                  onChange={(e) => {
                    setBankFilterStatus(e.target.value);
                  }}
                  className="w-full text-sm border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Selesai">Hanya Selesai / Terverifikasi (Siap Terbit)</option>
                  <option value="Menunggu Riviu">Menunggu Riviu</option>
                  <option value="Draft">Draft</option>
                  <option value="Dalam Penulisan">Dalam Penulisan</option>
                </select>
              </div>

            </div>

            {/* Tombol Trigger: Tampilkan Soal (hanya jika showBankQuestions belum aktif) */}
            {!showBankQuestions && (
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500 italic">
                  * Klik tombol di sebelah kanan untuk menerapkan filter dan menampilkan butir-butir soal.
                </p>

                <button
                  type="button"
                  onClick={() => setShowBankQuestions(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2.5 transition-all transform active:scale-95"
                >
                  <FolderSearch className="w-5 h-5" />
                  <span>Tampilkan Butir Soal Sesuai Filter</span>
                </button>
              </div>
            )}

          </div>

          {/* Kontainer Butir Soal (MUNCUL OTOMATIS JIKA SCOPED / TOMBOL DIKLIK) */}
          {showBankQuestions ? (
            (() => {
              const matchedItems = filteredBankItems;

              if (matchedItems.length === 0) {
                return (
                  <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
                    <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <HelpCircle className="w-7 h-7" />
                    </div>
                    <h4 className="text-base font-black text-slate-900">Belum Ada Soal yang Ditulis</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Tidak ditemukan butir soal yang sudah ditulis pada kriteria filter ini. Kisi-kisi yang belum dituliskan soalnya tidak ditampilkan di Bank Soal. Silakan pilih tab <strong>"1. Pemetaan Kisi-Kisi"</strong> untuk mulai menulis butir soal.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-extrabold text-slate-800">
                      Menampilkan {matchedItems.length} butir kisi-kisi dengan soal yang telah ditulis:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBankQuestions(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                    >
                      Sembunyikan Daftar Soal
                    </button>
                  </div>

                  {/* Daftar Butir Soal Terstruktur Multi-Varian */}
                  <div className="space-y-3">
                    {matchedItems.map((item) => {
                      const itemVariants = questionBank.filter(
                        qb => qb.blueprint_item_id === item.id || (!qb.blueprint_item_id && qb.id === `qb-00${item.question_number}`)
                      );
                      const q = itemVariants[0] || null;
                      const totalVariants = itemVariants.length;
                      const hasMultipleVariants = totalVariants > 1;

                      const status = q?.status || item.workflow_status || 'Draft';
                      const isFinal = status === 'Selesai';
                      const isDraft = status === 'Draft';
                      const isWriting = status === 'Dalam Penulisan';
                      const isReview = status === 'Menunggu Riviu';

                      // Penentuan warna kartu dan border aksen
                      let cardStyle = 'bg-white border-slate-200 hover:border-slate-300 border-l-4 border-l-slate-400';
                      let numberBadgeStyle = 'bg-slate-700 text-white';
                      let statusBadgeElement = null;

                      if (isFinal) {
                        cardStyle = 'bg-emerald-50/20 border-emerald-300 hover:border-emerald-400 border-l-4 border-l-emerald-500 shadow-2xs';
                        numberBadgeStyle = 'bg-emerald-600 text-white shadow-xs';
                        statusBadgeElement = (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1 shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Final / Selesai</span>
                          </span>
                        );
                      } else if (isDraft) {
                        cardStyle = 'bg-amber-50/20 border-amber-200 hover:border-amber-300 border-l-4 border-l-amber-500 shadow-2xs';
                        numberBadgeStyle = 'bg-amber-500 text-white shadow-xs';
                        statusBadgeElement = (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Draft</span>
                          </span>
                        );
                      } else if (isWriting) {
                        cardStyle = 'bg-sky-50/20 border-sky-200 hover:border-sky-300 border-l-4 border-l-sky-500 shadow-2xs';
                        numberBadgeStyle = 'bg-sky-600 text-white shadow-xs';
                        statusBadgeElement = (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center space-x-1 shrink-0">
                            <PenTool className="w-3.5 h-3.5 text-sky-600" />
                            <span>Dalam Penulisan</span>
                          </span>
                        );
                      } else if (isReview) {
                        cardStyle = 'bg-purple-50/20 border-purple-200 hover:border-purple-300 border-l-4 border-l-purple-500 shadow-2xs';
                        numberBadgeStyle = 'bg-purple-600 text-white shadow-xs';
                        statusBadgeElement = (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 flex items-center space-x-1 shrink-0">
                            <Eye className="w-3.5 h-3.5 text-purple-600" />
                            <span>Menunggu Riviu</span>
                          </span>
                        );
                      }

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl p-4 border transition-all flex flex-col gap-3 ${cardStyle}`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            {/* Sisi Kiri: Nomor Soal + Jenis Soal + Indikator + Status */}
                            <div className="flex items-start md:items-center space-x-3.5 flex-1 min-w-0">
                              {/* Nomor Soal */}
                              <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${numberBadgeStyle}`}>
                                #{item.question_number}
                              </span>

                              {/* Detail Ringkas: Jenis Soal, Kognitif, Status, dan Indikator */}
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  {/* Jenis Soal */}
                                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 shrink-0">
                                    {item.question_type}
                                  </span>
                                  {/* Level Kognitif */}
                                  <span className="px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 font-medium text-[11px] border border-slate-200 shrink-0">
                                    {item.cognitive_level}
                                  </span>
                                  {/* Status Penulisan */}
                                  {statusBadgeElement}

                                  {/* Badge Multi-Varian */}
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center space-x-1 shrink-0">
                                    <Sparkles className="w-3 h-3 text-indigo-600" />
                                    <span>{totalVariants} Varian Tersedia</span>
                                  </span>
                                </div>

                                {/* Indikator Soal & Tombol Pratinjau Pemetaan */}
                                <div className="text-xs sm:text-sm text-slate-800 leading-snug flex items-start gap-2">
                                  <p className="line-clamp-2 flex-1">
                                    <span className="font-bold text-slate-600">Indikator:</span> {item.indicator}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const primaryQ = itemVariants[0];
                                      handleOpenStudentPreview(item, primaryQ, 0);
                                    }}
                                    className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black shrink-0 transition-all shadow-2xs hover:shadow-xs active:scale-95"
                                    title="Periksa kesesuaian kisi-kisi dan naskah soal lengkap"
                                  >
                                    <Eye className="w-3 h-3 text-indigo-600" />
                                    <span>Detail Kisi-Kisi</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Sisi Kanan: Aksi Cepat Tambah Varian */}
                            <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                              <button
                                type="button"
                                onClick={() => handleOpenEditorForVariant(item, undefined, totalVariants + 1)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95"
                                title="Tambah varian baru untuk kisi-kisi ini"
                              >
                                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                <span>+ Varian Baru</span>
                              </button>
                            </div>
                          </div>

                          {/* Baris Daftar Varian Soal */}
                          <div className="pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                              Pilih Varian:
                            </span>
                            {itemVariants.map((variant, vIdx) => {
                              const vNum = vIdx + 1;
                              const isVarFinal = variant.status === 'Selesai';
                              return (
                                <div key={variant.id || vIdx} className="inline-flex items-center rounded-xl bg-white border border-slate-200 p-1 shadow-2xs space-x-1">
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                                    isVarFinal ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    Varian #{vNum}
                                    {isVarFinal && <CheckCircle2 className="w-3 h-3 text-emerald-600 inline ml-1" />}
                                  </span>

                                  {/* 1. Ikon Mata: Pratinjau 2-Panel Keselarasan */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenStudentPreview(item, variant, vIdx)}
                                    className="p-1.5 hover:bg-brand-50 rounded-lg text-slate-500 hover:text-brand-600 transition-colors"
                                    title={`Pratinjau Soal & Kisi-Kisi Varian #${vNum}`}
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 2. Ikon Pensil: Edit Soal */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditorForVariant(item, variant, vNum)}
                                    className="p-1.5 hover:bg-amber-50 rounded-lg text-slate-500 hover:text-amber-600 transition-colors"
                                    title={`Edit Soal Varian #${vNum}`}
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* 3. Ikon Tong Sampah: Hapus Varian Ini Saja */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuestionVariant(variant, item, vNum)}
                                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                    title={`Hapus Soal Varian #${vNum} Saja (Kisi-kisi tetap aman)`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-3xl p-8 text-center text-slate-500 space-y-2">
              <FolderSearch className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold">
                Silakan pilih filter di atas, kemudian klik <strong>"Tampilkan Butir Soal Sesuai Filter"</strong> untuk meninjau butir soal.
              </p>
            </div>
          )}

        </div>
        )
      )}

      {/* Modal Buat Butir Kisi-Kisi Baru Secara Manual (True Viewport Center via createPortal document.body) */}
      {showCreateManualModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 my-auto max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    Buat Butir Kisi-Kisi Baru (Manual)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Menjadi acuan baku penulisan butir soal di Tahap 2
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualItem} className="space-y-4 text-xs sm:text-sm">
              
              {/* Row 1: No Soal, Kategori Tes, Mapel, Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Nomor Soal *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={manualNumber}
                    onChange={(e) => setManualNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-center focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Kategori Tes *
                  </label>
                  <select
                    value={manualAssessment}
                    onChange={(e) => setManualAssessment(e.target.value)}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl font-bold text-emerald-950 bg-emerald-50/60 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Formatif">Formatif</option>
                    <option value="Sumatif">Sumatif (STS/PTS)</option>
                    <option value="SAS">SAS (Sumatif Akhir Semester)</option>
                    <option value="SAT">SAT (Sumatif Akhir Tahun)</option>
                    <option value="SAJ">SAJ (Sumatif Akhir Jenjang)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Mata Pelajaran *
                  </label>
                  <select
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-brand-900 focus:ring-2 focus:ring-brand-500"
                  >
                    {Array.from(new Set(availableSubjects.map(s => s.name))).map((sName) => (
                      <option key={sName} value={sName}>{sName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Jenjang & Kelas *
                  </label>
                  <select
                    value={manualGrade}
                    onChange={(e) => setManualGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-300 rounded-xl font-bold text-purple-900 bg-purple-50/30 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Kelas 1">Kelas 1 (SD)</option>
                    <option value="Kelas 2">Kelas 2 (SD)</option>
                    <option value="Kelas 3">Kelas 3 (SD)</option>
                    <option value="Kelas 4">Kelas 4 (SD)</option>
                    <option value="Kelas 5">Kelas 5 (SD)</option>
                    <option value="Kelas 6">Kelas 6 (SD)</option>
                    <option value="Kelas 7">Kelas 7 (SMP)</option>
                    <option value="Kelas 8">Kelas 8 (SMP)</option>
                    <option value="Kelas 9">Kelas 9 (SMP)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Elemen & Subelemen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    1. Elemen CP/TP *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualElement}
                    onChange={(e) => setManualElement(e.target.value)}
                    placeholder="Contoh: Bilangan, Geometri, Aljabar..."
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    2. Subelemen (Materi Spesifik)
                  </label>
                  <input
                    type="text"
                    value={manualSubElement}
                    onChange={(e) => setManualSubElement(e.target.value)}
                    placeholder="Contoh: Operasi Penjumlahan & Pengurangan"
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Row 3: Kompetensi CP/TP */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                  3. Kompetensi Capaian Pembelajaran (CP / TP) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={manualCompetency}
                  onChange={(e) => setManualCompetency(e.target.value)}
                  placeholder="Deskripsi kompetensi yang ingin diukur pada butir ini..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Row 4: Level Kognitif & Konteks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    4. Level Kognitif *
                  </label>
                  <select
                    value={manualCognitive}
                    onChange={(e) => setManualCognitive(e.target.value as CognitiveLevel)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Pengetahuan dan Pemahaman (L1)">L1 - Pengetahuan dan Pemahaman</option>
                    <option value="Aplikasi (L2)">L2 - Aplikasi</option>
                    <option value="Penalaran (L3)">L3 - Penalaran</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    5. Konteks Soal *
                  </label>
                  <select
                    value={manualContext}
                    onChange={(e) => setManualContext(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Personal">Personal (Diri Sendiri & Keluarga)</option>
                    <option value="Sosial Budaya">Sosial Budaya (Masyarakat & Lingkungan)</option>
                    <option value="Saintifik">Saintifik (Ilmiah & Fenomena Alam)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Indikator Soal */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                  6. Indikator Soal *
                </label>
                <textarea
                  rows={2}
                  required
                  value={manualIndicator}
                  onChange={(e) => setManualIndicator(e.target.value)}
                  placeholder="Contoh: Disajikan cerita/ilustrasi, peserta didik dapat menentukan..."
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Row 6: Tipe Soal & Penugasan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    7. Bentuk / Tipe Soal *
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) => setManualType(e.target.value as QuestionType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-brand-900 focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Pilihan Ganda">Pilihan Ganda</option>
                    <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks</option>
                    <option value="Menjodohkan">Menjodohkan</option>
                    <option value="Benar/Salah">Benar / Salah</option>
                    <option value="Isian Singkat">Isian Singkat</option>
                    <option value="Uraian">Uraian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    8. Jenis Tugas
                  </label>
                  <select
                    value={manualTaskType}
                    onChange={(e) => setManualTaskType(e.target.value as TaskType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="TULIS">TULIS (Penulisan Soal)</option>
                    <option value="RIVIU">RIVIU (Penelaahan Soal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Penulis / Penelaah
                  </label>
                  <input
                    type="text"
                    value={manualWriter}
                    onChange={(e) => setManualWriter(e.target.value)}
                    placeholder="Nama Guru"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateManualModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simpan & Daftarkan ke Kisi-Kisi</span>
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Modal Pusat Impor & Personalisasi Unduh Template Excel (Permintaan User) */}
      {showImportWizardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    Pusat Impor & Personalisasi Template Kisi-Kisi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih target jenjang, mapel, fase, dan kelas agar template presisi & hasil impor otomatis terpisah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImportWizardModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bagian 1: Pemilihan Spesifikasi Target (Jenjang, Mapel, Kelas, Fase) */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Tentukan Target Kisi-Kisi</span>
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Fase Otomatis: <strong className="text-brand-700">Fase {importPhase}</strong>
                </span>
              </div>

              {/* Grid Pilihan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* Jenjang Sekolah (SD / SMP) */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Jenjang Sekolah
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleImportLevelChange('SD')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        importLevel === 'SD'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      Sekolah Dasar (SD)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImportLevelChange('SMP')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        importLevel === 'SMP'
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      SMP (Fase D)
                    </button>
                  </div>
                </div>

                {/* Tingkat Kelas */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Kelas / Tingkat
                  </label>
                  <select
                    value={importGrade}
                    onChange={(e) => handleImportGradeChange(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-800 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    {importLevel === 'SD' ? (
                      <>
                        <option value="Kelas 1">Kelas 1 (Fase A)</option>
                        <option value="Kelas 2">Kelas 2 (Fase A)</option>
                        <option value="Kelas 3">Kelas 3 (Fase B)</option>
                        <option value="Kelas 4">Kelas 4 (Fase B)</option>
                        <option value="Kelas 5">Kelas 5 (Fase C)</option>
                        <option value="Kelas 6">Kelas 6 (Fase C)</option>
                      </>
                    ) : (
                      <>
                        <option value="Kelas 7">Kelas 7 (Fase D)</option>
                        <option value="Kelas 8">Kelas 8 (Fase D)</option>
                        <option value="Kelas 9">Kelas 9 (Fase D)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Mata Pelajaran (Filter otomatis sesuai jenjang) */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Mata Pelajaran (Tersedia untuk {importLevel})
                  </label>
                  <select
                    value={importSubject}
                    onChange={(e) => setImportSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-brand-300 rounded-xl font-bold text-brand-950 bg-brand-50/40 focus:ring-2 focus:ring-brand-500"
                  >
                    {availableSubjects
                      .filter(s => s.level === importLevel)
                      .map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                  </select>
                </div>

                {/* Kategori Tes (Formatif, Sumatif, SAS, SAT, SAJ) */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Kategori Tes / Asesmen Target
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {['Formatif', 'Sumatif', 'SAS', 'SAT', 'SAJ'].map((asmt) => (
                      <button
                        key={asmt}
                        type="button"
                        onClick={() => setImportAssessment(asmt)}
                        className={`py-2 px-3 rounded-xl text-xs font-black transition-all border ${
                          importAssessment === asmt
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-[1.02]'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {asmt}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Ringkasan Target */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">Target Dokumen Aktif:</span>
                <span className="font-extrabold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-md border border-brand-200">
                  {importLevel} • {importSubject} • {importGrade} (Fase {importPhase}) • Asesmen {importAssessment}
                </span>
              </div>
            </div>

            {/* Bagian 2: Unduh Template Excel Siap Cetak (A4 Margin 1.5 cm) */}
            <div className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center space-x-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Unduh Template Excel Siap Pakai</span>
                </span>
                <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  A4 Landscape • Margin 1.5 cm
                </span>
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Unduh format resmi dengan kolom yang telah disesuaikan untuk <strong>{importSubject}</strong> ({importGrade} • Asesmen {importAssessment}). Format ini siap dicetak rapi dan diisi secara luring (offline).
              </p>
              <button
                type="button"
                onClick={handleDownloadCustomTemplate}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Template Excel ({importSubject} - {importGrade} - {importAssessment})</span>
              </button>

              {modalFeedback && (
                <div className={`p-3 rounded-xl flex items-center space-x-2.5 text-xs font-bold animate-fade-in ${
                  modalFeedback.type === 'success' 
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}>
                  {modalFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{modalFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Bagian 3: Unggah File Excel yang Telah Diisi (Impor) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Unggah File Excel & Simpan Terpisah</span>
              </span>
              <p className="text-xs text-slate-500">
                Pilih file Excel yang telah selesai Anda lengkapi. Butir kisi-kisi akan langsung dilabeli dan dikelompokkan secara terpisah di bawah <strong>{importSubject}</strong> ({importGrade} • Asesmen {importAssessment}).
              </p>
              
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 p-6 rounded-2xl cursor-pointer transition-all">
                <Upload className="w-8 h-8 text-indigo-600 mb-2" />
                <span className="font-black text-sm text-indigo-950">
                  Klik untuk Memilih File Excel dari Komputer
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  Mendukung format .xlsx dan .xls
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportWithMetadata}
                  className="hidden"
                />
              </label>
            </div>

            {/* Footer Modal */}
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowImportWizardModal(false)}
                className="px-5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI IMPOR KISI-KISI KE DATABASE SUPABASE (Permintaan User) */}
      {importPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Konfirmasi Simpan Impor Kisi-Kisi</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    File: <span className="font-mono font-bold text-white">{importPreviewData.fileName}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingImport}
                onClick={() => setImportPreviewData(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              
              {/* Info Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-bold">Mata Pelajaran</span>
                  <span className="font-extrabold text-slate-800">{importPreviewData.metadata.subject_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Kelas & Fase</span>
                  <span className="font-extrabold text-slate-800">{importPreviewData.metadata.grade_class} (Fase {importPreviewData.metadata.phase})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Jenis Asesmen</span>
                  <span className="font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md inline-block mt-0.5">{importPreviewData.metadata.assessment_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Jumlah Butir</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">{importPreviewData.items.length} Soal Terbaca</span>
                </div>
              </div>

              {/* Kotak Peringatan Konflik & Pilihan Mode Simpan jika Modul Sudah Memiliki Data */}
              {importPreviewData.existingCount > 0 ? (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-950">
                        Perhatian: Modul Ini Sudah Memiliki {importPreviewData.existingCount} Butir Kisi-Kisi di Database (No. 1 – {importPreviewData.maxExistingNum})
                      </h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        File Excel Anda memuat <strong>{importPreviewData.items.length} butir</strong> (tertulis No. 1 – {Math.max(...importPreviewData.items.map(i => i.question_number))}). Silakan pilih bagaimana data baru ini disimpan:
                      </p>
                    </div>
                  </div>

                  {/* 2 Opsi Penyimpanan Interaktif */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    
                    {/* Opsi A: Tambahkan Sebagai Butir Baru (Auto-Renumber) */}
                    <div 
                      onClick={() => setImportPreviewData({ ...importPreviewData, importMode: 'append_renumber' })}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        importPreviewData.importMode === 'append_renumber'
                          ? 'bg-emerald-50/90 border-emerald-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="import_mode"
                          checked={importPreviewData.importMode === 'append_renumber'}
                          onChange={() => setImportPreviewData({ ...importPreviewData, importMode: 'append_renumber' })}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-black text-xs text-slate-900">
                          Tambahkan Sebagai Butir Baru (Direkomendasikan)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 pl-5 leading-normal">
                        Seluruh <strong>{importPreviewData.existingCount} butir lama tetap aman</strong>. {importPreviewData.items.length} butir baru otomatis disesuaikan nomornya menjadi <strong>No. {importPreviewData.maxExistingNum + 1} s.d. {importPreviewData.maxExistingNum + importPreviewData.items.length}</strong> (total: {importPreviewData.existingCount + importPreviewData.items.length} butir).
                      </p>
                    </div>

                    {/* Opsi B: Timpa & Gantikan Seluruh Kisi-Kisi */}
                    <div 
                      onClick={() => setImportPreviewData({ ...importPreviewData, importMode: 'replace_all' })}
                      className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        importPreviewData.importMode === 'replace_all'
                          ? 'bg-rose-50/90 border-rose-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="import_mode"
                          checked={importPreviewData.importMode === 'replace_all'}
                          onChange={() => setImportPreviewData({ ...importPreviewData, importMode: 'replace_all' })}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        <span className="font-black text-xs text-slate-900">
                          Timpa / Gantikan Kisi-Kisi yang Ada
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 pl-5 leading-normal">
                        Butir kisi-kisi lama akan <strong>ditimpa / diperbarui</strong> dengan {importPreviewData.items.length} butir dari file Excel ini sesuai nomor yang tertera di file.
                      </p>
                    </div>

                  </div>
                </div>
              ) : (
                /* Informative Banner jika modul masih baru */
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold text-emerald-950 block mb-0.5">Penyimpanan Otomatis ke Database Cloud (Supabase)</strong>
                    Ketika Anda menekan tombol <strong>"Simpan Seluruh Data ke Database"</strong>, seluruh <strong>{importPreviewData.items.length} butir</strong> kisi-kisi ini akan langsung diunggah ke database cloud Supabase sebagai butir baru (No. 1 s.d. {importPreviewData.items.length}).
                  </div>
                </div>
              )}

              {/* Tabel Pratinjau Butir */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 border-b border-slate-200 flex justify-between items-center">
                  <span>
                    Pratinjau Data Kisi-Kisi ({effectiveImportItems.length} Butir
                    {importPreviewData.importMode === 'append_renumber' && importPreviewData.existingCount > 0 ? ` • Lanjutan No. ${importPreviewData.maxExistingNum + 1}–${importPreviewData.maxExistingNum + effectiveImportItems.length}` : ''})
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {importPreviewData.importMode === 'append_renumber' && importPreviewData.existingCount > 0 
                      ? 'Nomor otomatis dilanjutkan' 
                      : 'Menampilkan nomor sesuai file'}
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-28 text-center">No Soal</th>
                        <th className="py-2 px-3">Elemen / Materi</th>
                        <th className="py-2 px-3">Bentuk Soal</th>
                        <th className="py-2 px-3">Level Kognitif</th>
                        <th className="py-2 px-3">Indikator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {effectiveImportItems.map((item: any, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-center">
                            {item.original_number && item.original_number !== item.question_number ? (
                              <div className="flex flex-col items-center">
                                <span className="font-black text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md inline-block">
                                  No. {item.question_number}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium mt-0.5">
                                  (asal: No. {item.original_number})
                                </span>
                              </div>
                            ) : (
                              <span className="font-bold text-slate-700">No. {item.question_number}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{item.element}</td>
                          <td className="py-2 px-3">
                            <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {item.question_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px]">{item.cognitive_level}</td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-xs" title={item.indicator}>
                            {item.indicator}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer with Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isSavingImport}
                onClick={() => setImportPreviewData(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold transition-all disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isSavingImport}
                onClick={handleConfirmSaveImport}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-600/25 flex items-center space-x-2 transition-all disabled:opacity-50 active:scale-95"
              >
                {isSavingImport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Cloud Supabase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Seluruh Data ke Database</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Editor Modal Popup: Mendukung Multi-Varian Soal */}
      {selectedItemForEditor && (
        <QuestionEditorModal
          blueprintItem={selectedItemForEditor}
          existingQuestion={selectedQuestionForEditor || undefined}
          variantNumber={selectedVariantNumber}
          onClose={() => {
            setSelectedItemForEditor(null);
            setSelectedQuestionForEditor(null);
          }}
          onSave={handleSaveQuestion}
        />
      )}

      {/* POPUP PEMBERITAHUAN: SOAL BERHASIL DISIMPAN KE DATABASE (Tampil True Center via createPortal document.body) */}
      {saveSuccessNotification?.isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in select-none"
          style={{ zIndex: 10000 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSaveSuccessNotification(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-scale-up text-center my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animasi Ikon Centang Hijau */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                {saveSuccessNotification.isCloudSynced ? 'Database Cloud Supabase Terhubung' : 'Penyimpanan Database Aktif'}
              </span>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {saveSuccessNotification.title || (saveSuccessNotification.type === 'blueprint' ? 'Kisi-Kisi Berhasil Disimpan!' : 'Soal Berhasil Disimpan!')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {saveSuccessNotification.description || (saveSuccessNotification.type === 'blueprint' 
                  ? 'Data butir kisi-kisi telah sukses disimpan secara permanen ke database SASI.' 
                  : 'Data butir soal, stimulus, dan kunci jawaban telah sukses disimpan secara permanen ke database SASI.')}
              </p>
            </div>

            {/* Kartu Ringkasan Detail */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <span className="text-slate-500 font-bold">Nomor Butir Kisi-Kisi:</span>
                <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Butir #{saveSuccessNotification.questionNumber}
                </span>
              </div>
              {saveSuccessNotification.type === 'blueprint' ? (
                <>
                  {saveSuccessNotification.element && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <span className="text-slate-500 font-bold">Elemen / Materi:</span>
                      <span className="font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 text-right line-clamp-1 max-w-[200px]">
                        {saveSuccessNotification.element}
                      </span>
                    </div>
                  )}
                  {saveSuccessNotification.cognitiveLevel && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <span className="text-slate-500 font-bold">Level Kognitif:</span>
                      <span className="font-bold text-slate-800">
                        {saveSuccessNotification.cognitiveLevel}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">Varian Soal:</span>
                  <span className="font-black text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    Varian #{saveSuccessNotification.variantNumber || 1}
                  </span>
                </div>
              )}
              {saveSuccessNotification.questionType && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <span className="text-slate-500 font-bold">Bentuk Soal:</span>
                  <span className="font-bold text-slate-800">
                    {saveSuccessNotification.questionType}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Status Database:</span>
                <span className="inline-flex items-center space-x-1.5 font-black text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{saveSuccessNotification.isCloudSynced ? 'Permanen di Cloud Supabase' : 'Tersimpan Aman di Database'}</span>
                </span>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              {saveSuccessNotification.type === 'blueprint' && saveSuccessNotification.blueprintItem && (
                <button
                  type="button"
                  onClick={() => {
                    const bp = saveSuccessNotification.blueprintItem!;
                    setSaveSuccessNotification(null);
                    handleOpenEditorForVariant(bp);
                  }}
                  className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors border border-brand-200"
                >
                  <Edit3 className="w-4 h-4 text-brand-600" />
                  <span>Tulis Soal Ini</span>
                </button>
              )}
              {saveSuccessNotification.type !== 'blueprint' && saveSuccessNotification.blueprintItem && saveSuccessNotification.savedQuestion && (
                <button
                  type="button"
                  onClick={() => {
                    const bp = saveSuccessNotification.blueprintItem!;
                    const q = saveSuccessNotification.savedQuestion!;
                    setSaveSuccessNotification(null);
                    handleOpenStudentPreview(bp, q);
                  }}
                  className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4 text-slate-600" />
                  <span>Uji Pratinjau Siswa</span>
                </button>
              )}
              <button
                type="button"
                autoFocus
                onClick={() => setSaveSuccessNotification(null)}
                className="w-full sm:w-auto flex-1 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Oke, Lanjutkan</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Modal Pratinjau Komparasi 2 Panel TRUE FULLSCREEN (createPortal z-[9999] menutupi seluruh layar & sidebar) */}
      {studentPreviewQuestion && typeof document !== 'undefined' && createPortal(
        (() => {
          const activeItem = dualInspectItem || studentPreviewQuestion.blueprint_item || ({ question_number: 1 } as any);

          return (
            <div className="fixed inset-0 z-[9999] bg-slate-950 w-screen h-screen flex flex-col overflow-hidden animate-fade-in select-none">
              <div className="w-full h-full bg-slate-100 flex flex-col overflow-hidden">
                
                {/* STICKY TOP BAR: Navigasi, Identitas, Mode Tampilan, Varian, Font, Edit & Tutup */}
                <div className="bg-white px-4 sm:px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs z-30">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white flex items-center justify-center font-black shadow-md shadow-brand-500/20">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-brand-100 text-brand-800 px-2 py-0.5 rounded-md">
                          Telaah Keselarasan Soal
                        </span>
                        <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          Butir #{activeItem.question_number || '1'}
                          {currentInspectIndex >= 0 && (
                            <span className="text-slate-500 font-medium ml-1">
                              ({currentInspectIndex + 1} dari {filteredBankItems.length})
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {studentPreviewQuestion.question_type}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">
                        {activeItem.subject_name || blueprint.subject?.name} • Kelas {activeItem.grade_class || '6'} ({activeItem.assessment_type || 'SAS'})
                      </h3>
                    </div>
                  </div>

                  {/* Kontrol Navigasi & Aksi */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {/* Mode Tampilan Switcher (Berdampingan vs Fokus Soal vs Fokus Kisi-Kisi) */}
                    <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setInspectViewMode('split')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                          inspectViewMode === 'split' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Tampilkan Berdampingan (40% Kisi-Kisi : 60% Soal)"
                      >
                        Berdampingan
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectViewMode('question-only')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                          inspectViewMode === 'question-only' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Tampilan Fokus Penuh Naskah Soal Siswa (100% Layar)"
                      >
                        Fokus Soal (100%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectViewMode('blueprint-only')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                          inspectViewMode === 'blueprint-only' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Tampilan Fokus Penuh Kisi-Kisi (100% Layar)"
                      >
                        Fokus Kisi-Kisi
                      </button>
                    </div>

                    {/* Pemilih Varian Tab */}
                    {inspectItemVariants.length > 0 && (
                      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 px-1.5">Varian:</span>
                        {inspectItemVariants.map((varQ, vIdx) => {
                          const isActive = dualInspectVariantIndex === vIdx;
                          return (
                            <button
                              key={varQ.id || vIdx}
                              type="button"
                              onClick={() => handleSelectInspectVariant(vIdx)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                                isActive
                                  ? 'bg-brand-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              Varian #{vIdx + 1}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Skala Ukuran Huruf CBT */}
                    <div className="hidden lg:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 px-1.5">Font:</span>
                      <button
                        type="button"
                        onClick={() => setPreviewFontSize('normal')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          previewFontSize === 'normal' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFontSize('large')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          previewFontSize === 'large' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        A+
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFontSize('xlarge')}
                        className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                          previewFontSize === 'xlarge' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        A++
                      </button>
                    </div>

                    {/* Tombol Prev & Next (Navigasi Berurutan) */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        disabled={currentInspectIndex <= 0}
                        onClick={handleInspectPrev}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center space-x-1 transition-all shadow-2xs"
                        title="Periksa Butir Sebelumnya"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Sebelumnya</span>
                      </button>
                      <button
                        type="button"
                        disabled={currentInspectIndex < 0 || currentInspectIndex >= filteredBankItems.length - 1}
                        onClick={handleInspectNext}
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700 text-xs font-bold rounded-xl border border-slate-300 flex items-center space-x-1 transition-all shadow-2xs"
                        title="Periksa Butir Selanjutnya"
                      >
                        <span className="hidden sm:inline">Selanjutnya</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Buka di Editor */}
                    <button
                      type="button"
                      onClick={() => {
                        const bp = activeItem;
                        const varQ = studentPreviewQuestion;
                        const vNum = dualInspectVariantIndex + 1;
                        setDualInspectItem(null);
                        setStudentPreviewQuestion(null);
                        if (bp) {
                          handleOpenEditorForVariant(bp, varQ, vNum);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
                      title="Edit Soal Varian Ini"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit Soal</span>
                    </button>

                    {/* Tutup Modal Fullscreen */}
                    <button
                      type="button"
                      onClick={() => {
                        setDualInspectItem(null);
                        setStudentPreviewQuestion(null);
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Tutup Pratinjau Fullscreen"
                    >
                      <X className="w-5 h-5" />
                    </button>

                  </div>
                </div>

                {/* DUAL PANEL WORKSPACE: 40% KIRI (KISI-KISI) : 60% KANAN (SOAL CBT) DENGAN SCROLL INDEPENDEN */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden w-full h-[calc(100vh-56px)] select-text">
                  
                  {/* ======================================================== */}
                  {/* PANEL KIRI: 40% LEBAR LAYAR - LEMBAR AUDIT KISI-KISI       */}
                  {/* ======================================================== */}
                  {(inspectViewMode === 'split' || inspectViewMode === 'blueprint-only') && (
                    <div className={`h-full flex flex-col border-r border-slate-200 bg-white overflow-hidden shadow-xs shrink-0 ${
                      inspectViewMode === 'blueprint-only' ? 'w-full max-w-4xl mx-auto' : 'w-full md:w-[40%]'
                    }`}>
                      
                      {/* Header Panel Kiri */}
                      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
                        <div className="flex items-center space-x-2 text-indigo-800 font-black text-sm">
                          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                          <span>Spesifikasi Kisi-Kisi Acuan</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Butir #{activeItem.question_number || '1'}
                        </span>
                      </div>

                      {/* Scrollable Container Panel Kiri (Hanya Kisi-kisi yang Naik/Turun Saat di-Scroll) */}
                      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 font-sans">
                        
                        {/* Pita Badge Identitas Ringkas */}
                        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-50 text-amber-900 border border-amber-200 flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            <span>Level: {activeItem.cognitive_level || 'L1'}</span>
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-50 text-blue-900 border border-blue-200">
                            {activeItem.question_type || studentPreviewQuestion.question_type}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {activeItem.question_category || 'Single'}
                          </span>
                          {(activeItem.workflow_status || studentPreviewQuestion.status) && (
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {activeItem.workflow_status || studentPreviewQuestion.status}
                            </span>
                          )}
                        </div>

                        {/* 1. ELEMEN & 2. SUBELEMEN (Kartu Ringkas Elegan, Tanpa Kotak Kosong Bertingkat) */}
                        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60">
                            <span className="font-black text-slate-500 uppercase tracking-wider">1. ELEMEN</span>
                            <span className="font-bold text-slate-900 text-right">{activeItem.element || '-'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-black text-slate-500 uppercase tracking-wider">2. SUBELEMEN</span>
                            <span className="font-bold text-slate-900 text-right">{activeItem.sub_element || '-'}</span>
                          </div>
                        </div>

                        {/* 3. KOMPETENSI (CP / TP) */}
                        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                          <div className="flex items-center space-x-1.5 text-xs font-black text-slate-600 uppercase tracking-wider">
                            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                            <span>3. KOMPETENSI (CP / TP)</span>
                          </div>
                          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans font-medium">
                            {activeItem.competency || activeItem.learning_objective || '(Belum ditentukan)'}
                          </div>
                        </div>

                        {/* 4. JENIS & 5. KOGNITIF (Grid 2 Kolom) */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/80">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                              4. JENIS
                            </span>
                            <span className="text-xs font-black text-slate-800">
                              {activeItem.question_category || 'Single'}
                            </span>
                          </div>
                          <div className="bg-amber-50/80 rounded-2xl p-3 border border-amber-200">
                            <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block mb-1">
                              5. KOGNITIF
                            </span>
                            <span className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                              <span>{activeItem.cognitive_level || 'L1'}</span>
                            </span>
                          </div>
                        </div>

                        {/* 6. KONTEKS */}
                        <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex items-center justify-between">
                          <span className="text-xs font-black text-slate-500 uppercase tracking-wider">6. KONTEKS</span>
                          <span className="text-xs font-bold text-slate-800">{activeItem.context || '-'}</span>
                        </div>

                        {/* 7. INDIKATOR SOAL (CROWN JEWEL - RUH PEMBUATAN SOAL) */}
                        <div className="bg-gradient-to-br from-indigo-50/90 via-blue-50/70 to-indigo-100/50 rounded-2xl p-4 sm:p-5 border-2 border-indigo-200 shadow-xs space-y-2">
                          <div className="flex items-center space-x-2 text-indigo-800 font-black text-xs uppercase tracking-wider">
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            <span>7. INDIKATOR SOAL (ACUAN POKOK)</span>
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-indigo-950 leading-relaxed font-sans">
                            {activeItem.indicator || 'Indikator belum diisi'}
                          </div>
                        </div>

                        {/* 8. TIPE SOAL */}
                        <div className="bg-blue-50/70 rounded-2xl p-3.5 border border-blue-200 flex items-center justify-between">
                          <span className="text-xs font-black text-blue-900 uppercase tracking-wider">8. TIPE SOAL</span>
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-600 text-white shadow-2xs">
                            {activeItem.question_type || studentPreviewQuestion.question_type}
                          </span>
                        </div>

                        {/* Metadata Opsional: Materi Pokok & Profil */}
                        {(activeItem.material_scope || activeItem.graduate_dimension) && (
                          <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 text-xs space-y-1.5">
                            {activeItem.material_scope && (
                              <div>
                                <span className="font-black text-slate-500 mr-1.5">Materi Pokok:</span>
                                <span className="text-slate-700 font-medium">{activeItem.material_scope}</span>
                              </div>
                            )}
                            {activeItem.graduate_dimension && (
                              <div>
                                <span className="font-black text-purple-700 mr-1.5">Dimensi Profil:</span>
                                <span className="text-purple-900 font-bold">{activeItem.graduate_dimension}</span>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* PANEL KANAN: 60% LEBAR LAYAR - TAMPILAN SOAL UTUH CBT     */}
                  {/* ======================================================== */}
                  {(inspectViewMode === 'split' || inspectViewMode === 'question-only') && (
                    <div className={`h-full flex flex-col bg-slate-100/70 overflow-hidden ${
                      inspectViewMode === 'question-only' ? 'w-full' : 'w-full md:w-[60%]'
                    }`}>
                      
                      {/* Header Panel Kanan: Bobot Skor, Varian & Kunci Jawaban Indicator */}
                      <div className="px-6 py-3 border-b border-slate-200/80 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center space-x-1.5">
                            <span>🎯 Bobot Skor:</span>
                            <span className="underline decoration-white/40">{studentPreviewQuestion.weight || 10} Poin</span>
                          </span>
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200">
                            Varian #{dualInspectVariantIndex + 1}
                          </span>
                        </div>

                        <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Kunci Jawaban Disorot Hijau</span>
                        </div>
                      </div>

                      {/* Scrollable Container Panel Kanan (Hanya Soal yang Naik/Turun Saat di-Scroll) */}
                      <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-5">
                        <div className={`bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 mx-auto ${
                          inspectViewMode === 'question-only' ? 'max-w-5xl' : 'max-w-4xl'
                        }`}>
                          <QuestionRenderer
                            question={studentPreviewQuestion}
                            fontSize={previewFontSize}
                            answer={previewAnswer}
                            showAnswerKey={true}
                            onUpdateAnswer={(selectedOptionIds, answerText) => {
                              setPreviewAnswer({
                                id: 'preview-ans',
                                attempt_id: 'preview-attempt',
                                question_id: studentPreviewQuestion.id,
                                selected_option_ids: selectedOptionIds,
                                answer_text: answerText,
                                is_doubtful: false,
                              });
                            }}
                          />
                        </div>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            </div>
          );
        })(),
        document.body
      )}

      {/* Modal 1: Pratinjau Lengkap Butir Kisi-Kisi (True Viewport Center via createPortal document.body) */}
      {previewItem && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            
            {/* Header Pratinjau */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Pratinjau Butir Kisi-Kisi #{previewItem.question_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acuan spesifikasi butir soal SASI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badges Target */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-brand-600 text-white shadow-xs">
                Asesmen {previewItem.assessment_type || blueprint.assessment_type || 'SAS'}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                {previewItem.subject_name || blueprint.subject?.name}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                {previewItem.grade_class || blueprint.level}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                {previewItem.cognitive_level}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {previewItem.question_type}
              </span>
            </div>

            {/* Konten Detail Matriks 11 Kolom */}
            <div className="space-y-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-200 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                    1. Elemen CP/TP
                  </span>
                  <p className="font-black text-slate-900">{previewItem.element}</p>
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                    2. Subelemen (Materi)
                  </span>
                  <p className="font-bold text-slate-700">{previewItem.sub_element}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                  3. Capaian Pembelajaran / Kompetensi (CP/TP)
                </span>
                <p className="text-slate-800 font-medium leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {previewItem.competency}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                    4. Jenis Soal & Bentuk
                  </span>
                  <p className="font-bold text-slate-800">
                    {previewItem.question_category} • {previewItem.question_type}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                    5. Konteks Stimulus
                  </span>
                  <p className="font-bold text-slate-800">{previewItem.context}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 block mb-0.5">
                  6. Indikator Soal
                </span>
                <p className="text-slate-900 font-semibold leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                  {previewItem.indicator}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Tugas:</span>
                  <span className="font-black uppercase text-emerald-700">{previewItem.task_type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Penulis:</span>
                  <span className="font-bold text-slate-800">{previewItem.writer_name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <div className="mt-0.5">{getStatusBadge(previewItem.workflow_status)}</div>
                </div>
              </div>
            </div>

            {/* Footer Aksi Pratinjau */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Tutup
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const toEdit = { ...previewItem };
                    setPreviewItem(null);
                    handleOpenEditItem(toEdit);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-300 active:scale-95 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Matriks Kisi-Kisi</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const bpItem = { ...previewItem };
                    setPreviewItem(null);
                    const variants = questionBank.filter(q => q.blueprint_item_id === bpItem.id || (!q.blueprint_item_id && q.id === `qb-00${bpItem.question_number}`));
                    handleOpenEditorForVariant(bpItem, variants[0] || null, 1);
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-md active:scale-95 transition-all"
                >
                  <PenTool className="w-3.5 h-3.5 text-white" />
                  <span>Tulis / Edit Soal Butir #{previewItem.question_number}</span>
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Edit & Simpan Butir Kisi-Kisi (True Viewport Center via createPortal document.body) */}
      {editingItem && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900">
                    Edit Butir Kisi-Kisi #{editingItem.question_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Perbarui acuan butir kisi-kisi dan simpan perubahannya
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditBlueprintItem} className="space-y-4 text-xs sm:text-sm">
              
              {/* Row 1: Nomor, Kategori Tes, Mapel, Kelas */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Nomor Soal *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingItem.question_number}
                    onChange={(e) => setEditingItem({ ...editingItem, question_number: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-center focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Kategori Tes *
                  </label>
                  <select
                    value={editingItem.assessment_type || 'SAS'}
                    onChange={(e) => setEditingItem({ ...editingItem, assessment_type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl font-bold text-emerald-950 bg-emerald-50/60 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Formatif">Formatif</option>
                    <option value="Sumatif">Sumatif (STS/PTS)</option>
                    <option value="SAS">SAS (Sumatif Akhir Semester)</option>
                    <option value="SAT">SAT (Sumatif Akhir Tahun)</option>
                    <option value="SAJ">SAJ (Sumatif Akhir Jenjang)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Mata Pelajaran *
                  </label>
                  <select
                    value={editingItem.subject_name || availableSubjects[0]?.name}
                    onChange={(e) => setEditingItem({ ...editingItem, subject_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-brand-900 focus:ring-2 focus:ring-amber-500"
                  >
                    {Array.from(new Set(availableSubjects.map(s => s.name))).map((sName) => (
                      <option key={sName} value={sName}>{sName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Jenjang & Kelas *
                  </label>
                  <select
                    value={getNormalizedGrade(editingItem.grade_class)}
                    onChange={(e) => setEditingItem({ ...editingItem, grade_class: e.target.value })}
                    className="w-full px-3 py-2 border border-purple-300 rounded-xl font-bold text-purple-900 bg-purple-50/30 focus:ring-2 focus:ring-amber-500"
                  >
                    {(!selectedLevel || selectedLevel === 'SD') && (
                      <>
                        <option value="Kelas 1">Kelas 1 (SD)</option>
                        <option value="Kelas 2">Kelas 2 (SD)</option>
                        <option value="Kelas 3">Kelas 3 (SD)</option>
                        <option value="Kelas 4">Kelas 4 (SD)</option>
                        <option value="Kelas 5">Kelas 5 (SD)</option>
                        <option value="Kelas 6">Kelas 6 (SD)</option>
                      </>
                    )}
                    {(!selectedLevel || selectedLevel === 'SMP') && (
                      <>
                        <option value="Kelas 7">Kelas 7 (SMP)</option>
                        <option value="Kelas 8">Kelas 8 (SMP)</option>
                        <option value="Kelas 9">Kelas 9 (SMP)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Row 2: Elemen & Subelemen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    1. Elemen CP/TP *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.element}
                    onChange={(e) => setEditingItem({ ...editingItem, element: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    2. Subelemen (Materi Spesifik)
                  </label>
                  <input
                    type="text"
                    value={editingItem.sub_element}
                    onChange={(e) => setEditingItem({ ...editingItem, sub_element: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Row 3: Kompetensi CP/TP */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                  3. Kompetensi Capaian Pembelajaran (CP / TP) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.competency}
                  onChange={(e) => setEditingItem({ ...editingItem, competency: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Row 4: Level Kognitif & Konteks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    4. Level Kognitif *
                  </label>
                  <select
                    value={editingItem.cognitive_level}
                    onChange={(e) => setEditingItem({ ...editingItem, cognitive_level: e.target.value as CognitiveLevel })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Pengetahuan dan Pemahaman (L1)">L1 - Pengetahuan dan Pemahaman</option>
                    <option value="Aplikasi (L2)">L2 - Aplikasi</option>
                    <option value="Penalaran (L3)">L3 - Penalaran</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    5. Konteks Soal *
                  </label>
                  <select
                    value={editingItem.context}
                    onChange={(e) => setEditingItem({ ...editingItem, context: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Personal">Personal (Diri Sendiri & Keluarga)</option>
                    <option value="Sosial Budaya">Sosial Budaya (Masyarakat & Lingkungan)</option>
                    <option value="Saintifik">Saintifik (Ilmiah & Fenomena Alam)</option>
                    <option value="Masalah Sehari-hari (Aplikatif)">Masalah Sehari-hari (Aplikatif)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Jenis Soal
                  </label>
                  <select
                    value={editingItem.question_category}
                    onChange={(e) => setEditingItem({ ...editingItem, question_category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Single">Single (Berdiri Sendiri)</option>
                    <option value="Grup Wacana">Grup Wacana (Terikat Stimulus)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Indikator Soal */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                  6. Indikator Soal *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingItem.indicator}
                  onChange={(e) => setEditingItem({ ...editingItem, indicator: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Row 6: Tipe Soal & Penugasan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    7. Bentuk / Tipe Soal *
                  </label>
                  <select
                    value={editingItem.question_type}
                    onChange={(e) => setEditingItem({ ...editingItem, question_type: e.target.value as QuestionType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-brand-900 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Pilihan Ganda">Pilihan Ganda</option>
                    <option value="Pilihan Ganda Kompleks">Pilihan Ganda Kompleks</option>
                    <option value="Menjodohkan">Menjodohkan</option>
                    <option value="Benar/Salah">Benar / Salah</option>
                    <option value="Isian Singkat">Isian Singkat</option>
                    <option value="Uraian">Uraian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    8. Jenis Tugas
                  </label>
                  <select
                    value={editingItem.task_type}
                    onChange={(e) => setEditingItem({ ...editingItem, task_type: e.target.value as TaskType })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="TULIS">TULIS (Penulisan Soal)</option>
                    <option value="RIVIU">RIVIU (Penelaahan Soal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    9. Status Workflow
                  </label>
                  <select
                    value={editingItem.workflow_status}
                    onChange={(e) => setEditingItem({ ...editingItem, workflow_status: e.target.value as WorkflowStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-brand-800 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Dalam Penulisan">Dalam Penulisan</option>
                    <option value="Draft">Draft</option>
                    <option value="Menunggu Riviu">Menunggu Riviu</option>
                    <option value="Selesai">Selesai (Siap Terbit ke Bank Soal)</option>
                  </select>
                </div>
              </div>

              {/* Row 7: Penulis & Penelaah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Nama Penulis
                  </label>
                  <input
                    type="text"
                    value={editingItem.writer_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, writer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                    Nama Penelaah
                  </label>
                  <input
                    type="text"
                    value={editingItem.reviewer_name || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, reviewer_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Kisi-Kisi</span>
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Modal Konfirmasi Bersihkan Lembar Kerja Penugasan (Solusi B) */}
      {showClearWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-scale-up">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Bersihkan Lembar Kerja?</h3>
                <p className="text-xs text-slate-500">Reset lembar kerja penugasan ini ke kondisi awal</p>
              </div>
            </div>

            <div className="p-4 bg-rose-50/80 rounded-2xl border border-rose-200 text-xs text-rose-950 space-y-2 leading-relaxed">
              <p>
                Tindakan ini akan <strong>menghapus seluruh butir kisi-kisi dan naskah soal</strong> yang telah Anda buat untuk:
              </p>
              <div className="font-extrabold text-rose-900 bg-white/80 p-2.5 rounded-xl border border-rose-200">
                {selectedSubject} • {selectedGrade} ({selectedLevel}) • {selectedAssessment}
              </div>
              <p className="text-[11px] text-rose-700">
                Setelah dibersihkan, lembar kerja penugasan Anda akan kembali kosong (0 butir) sehingga Anda dapat mulai menulis dari butir #1. Soal milik guru lain atau penugasan lain tidak akan terpengaruh.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearWorkspaceModal(false)}
                disabled={isClearingWorkspace}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearTeacherWorkspace}
                disabled={isClearingWorkspace}
                className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition shadow-md shadow-rose-600/25 flex items-center space-x-2"
              >
                {isClearingWorkspace ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Membersihkan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Bersihkan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

{/* BAGIAN 3: MODAL PRATINJAU SOAL & LOGIKA VERIFIKASI DUA ARAH (TRUE FULLSCREEN) */}
      {previewAssignment && typeof document !== 'undefined' && createPortal(
        (() => {
          const asg = previewAssignment;
          const statusInfo = getAssignmentStatusInfo(asg.status);
          const qData = getAssignmentQuestions(asg);
          const questionsList = qData.questions;
          const itemsList = qData.items;

          return (
            <div className="fixed inset-0 z-[9999] bg-slate-950 w-screen h-screen flex flex-col overflow-hidden animate-fade-in select-text">
              <div className="w-full h-full bg-slate-100 flex flex-col overflow-hidden">
                
                {/* 1. Modal Top Bar (Sticky Header Layar Penuh) */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 sm:px-8 py-3.5 flex items-center justify-between gap-4 shrink-0 shadow-md z-30">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => setPreviewAssignment(null)}
                      className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition shrink-0"
                      title="Kembali / Tutup Layar Penuh"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                          {asg.level} • {asg.grade_class} (Fase {asg.phase})
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden md:inline">
                          • Target: {qData.target} Butir Soal
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                        Pratinjau Paket: {asg.subject_name}
                      </h3>
                      <p className="text-xs text-slate-300 truncate">
                        Penulis: <strong>{asg.user_name}</strong> ({asg.user_institution || 'Instansi Terdaftar'}) • Ditugaskan: {(asg.assessment_types || []).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewAssignment(null)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition flex items-center space-x-1.5"
                      title="Tutup Pratinjau Fullscreen"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Tutup</span>
                    </button>
                  </div>
                </div>

                {/* 2. Revision Notes Alert Banner (Jika Pernah Ada Catatan Revisi) */}
                {asg.revision_notes && (
                  <div className="bg-rose-50 border-b border-rose-200 px-6 sm:px-8 py-3 text-xs space-y-1 shrink-0 z-20">
                    <div className="flex items-center space-x-2 font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Catatan Revisi Terakhir (Verifikator):</span>
                    </div>
                    <p className="text-rose-700 font-medium whitespace-pre-wrap pl-6">
                      "{asg.revision_notes}"
                    </p>
                    {asg.reviewed_at && (
                      <div className="text-[10px] text-rose-500 pl-6">
                        Ditinjau oleh: {asg.reviewed_by || 'Verifikator'} • {new Date(asg.reviewed_at).toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Sub-header Navigasi Nomor Butir Soal */}
                {questionsList.length > 0 && (
                  <div className="bg-white px-5 sm:px-8 py-2.5 border-b border-slate-200 flex items-center justify-between gap-4 overflow-x-auto text-xs shrink-0 shadow-2xs z-10">
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="font-extrabold text-slate-700 flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                        <span>Navigasi Butir:</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {questionsList.length} Butir Ditulis
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                      <button
                        type="button"
                        onClick={() => setActivePreviewQuestionTab('ALL')}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shrink-0 ${
                          activePreviewQuestionTab === 'ALL'
                            ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        Semua Butir ({questionsList.length})
                      </button>
                      {questionsList.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActivePreviewQuestionTab(i)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shrink-0 ${
                            activePreviewQuestionTab === i
                              ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          No. {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Modal Body: Daftar Butir Soal Layar Penuh */}
                <div className="overflow-y-auto p-4 sm:p-8 flex-1 bg-slate-100/80">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {questionsList.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                          <PenTool className="w-7 h-7" />
                        </div>
                        <h4 className="font-bold text-slate-900 text-base">
                          Belum Ada Butir Soal yang Disimpan
                        </h4>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                          Penulis belum menulis naskah butir soal untuk penugasan ini (Target: {asg.target_questions || 30} butir). Lembar kerja kisi-kisi memuat {itemsList.length} butir terpetakan.
                        </p>
                      </div>
                    ) : (
                      questionsList
                        .filter((_, idx) => activePreviewQuestionTab === 'ALL' || activePreviewQuestionTab === idx)
                        .map((q, idx) => {
                          const originalIndex = activePreviewQuestionTab === 'ALL' ? idx : Number(activePreviewQuestionTab);
                          const matchedBp = itemsList.find(i => i.id === q.blueprint_item_id) || itemsList[originalIndex];

                          const rawType = q.question_type || matchedBp?.question_type || 'Pilihan Ganda';
                          const normalizedQType = rawType
                            .replace('Benar-Salah', 'Benar/Salah')
                            .replace('Benar / Salah', 'Benar/Salah');

                          const questionForRenderer: QuestionBankItem = {
                            ...q,
                            question_type: normalizedQType as any
                          };

                          return (
                            <div
                              key={q.id || idx}
                              className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6"
                            >
                              {/* Top Bar Butir Soal */}
                              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                <div className="flex items-center space-x-2.5">
                                  <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-brand-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                                    {originalIndex + 1}
                                  </span>
                                  <span className="font-bold text-xs px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                    {normalizedQType}
                                  </span>
                                  <span className="font-bold text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80">
                                    {matchedBp?.cognitive_level || 'Penalaran (L2)'}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/80">
                                    🎯 Bobot: {q.weight || 10} Poin
                                  </span>
                                </div>
                              </div>

                              {/* Indikator Kisi-Kisi Acuan */}
                              {(matchedBp?.indicator_question || matchedBp?.indicator) && (
                                <div className="text-xs text-indigo-950 bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200/70 space-y-1.5">
                                  <div className="font-extrabold text-indigo-800 flex items-center space-x-1.5 uppercase tracking-wider text-[11px]">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Indikator Soal Acuan Kisi-Kisi:</span>
                                  </div>
                                  <div className="leading-relaxed font-medium">
                                    <RichMathText content={matchedBp.indicator_question || matchedBp.indicator} />
                                  </div>
                                </div>
                              )}

                              {/* RENDER UTUH SOAL CBT DENGAN QuestionRenderer (Mendukung HTML, List <ol><li>, [justify], Rumus Math, Gambar & Kunci Jawaban) */}
                              <div className="pt-1">
                                <QuestionRenderer
                                  question={questionForRenderer}
                                  fontSize="normal"
                                  showAnswerKey={true}
                                  onUpdateAnswer={() => {}}
                                />
                              </div>

                              {/* Rubrik Penilaian / Pembahasan Soal */}
                              {(q.rubric || q.answer_explanation) && (
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-900 space-y-1.5">
                                  <div className="font-extrabold flex items-center space-x-1.5 text-slate-700 uppercase tracking-wider text-[11px]">
                                    <Info className="w-4 h-4 text-indigo-600" />
                                    <span>Rubrik Penilaian / Pembahasan Soal:</span>
                                  </div>
                                  <div className="leading-relaxed font-sans text-xs text-slate-700">
                                    <RichMathText content={q.rubric || q.answer_explanation} />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* 5. Sticky Bottom Footer: Action Buttons */}
                <div className="bg-white border-t border-slate-200 px-6 sm:px-8 py-4 shrink-0 shadow-lg z-30">
                  {isRevisionFormOpen ? (
                    <div className="max-w-4xl mx-auto space-y-3 animate-fade-in">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-rose-800 flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Catatan / Umpan Balik Perbaikan bagi Penulis (Wajib Diisi):</span>
                        </label>
                        <textarea
                          rows={3}
                          value={revisionNotesInput}
                          onChange={(e) => setRevisionNotesInput(e.target.value)}
                          placeholder="Tuliskan nomor butir soal dan arahan perbaikan spesifik bagi penulis..."
                          className="w-full text-xs p-3 rounded-xl border border-rose-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500 bg-rose-50/30 text-slate-800 placeholder:text-slate-400"
                        />
                      </div>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setIsRevisionFormOpen(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectForRevision(asg)}
                          className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-md shadow-rose-600/25 flex items-center space-x-1.5 active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kirim Arahan Revisi ke Penulis</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewAssignment(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition w-full sm:w-auto"
                      >
                        Tutup Pratinjau
                      </button>

                      <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        {/* Tombol Aksi 2: Kembalikan untuk Perbaikan / Revisi */}
                        <button
                          type="button"
                          onClick={() => setIsRevisionFormOpen(true)}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition active:scale-95 flex items-center space-x-1.5"
                          title="Kembalikan paket soal ke penulis dengan catatan perbaikan"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>Kembalikan untuk Perbaikan / Revisi</span>
                        </button>

                        {/* Tombol Aksi 1: Setujui / Lolos Verifikasi */}
                        <button
                          type="button"
                          onClick={() => handleApproveAssignment(asg)}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition shadow-md shadow-emerald-600/25 active:scale-95 flex items-center space-x-1.5"
                          title="Setujui dan kunci naskah masuk ke Bank Soal Terverifikasi"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Setujui / Lolos Verifikasi</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })(),
        document.body
      )}

    </div>
  );
};

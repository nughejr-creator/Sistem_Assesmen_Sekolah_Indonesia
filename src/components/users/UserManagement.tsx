import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { UserProfile, UserRole, SchoolLevel, School, Phase } from '../../types/database';
import { MOCK_USERS, MOCK_SCHOOLS } from '../../lib/mockData';
import { exportStudentsToExcel, generateStudentPin } from '../../lib/excelHelper';
import { supabase } from '../../lib/supabase';
import { getClusterNodes, getClientForNode } from '../../lib/clusterManager';
import { 
  generateValidUUID, 
  toValidUUID, 
  mergeCloudAndLocal, 
  safeSupabaseUpsert,
  safeSupabaseDistributedDelete,
  safeSupabaseDistributedUpdate
} from '../../lib/syncHelper';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  Building2,
  Key, 
  Unlock, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  School as SchoolIcon,
  GraduationCap,
  Award,
  X,
  FileSpreadsheet,
  Database,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  KeyRound,
  Camera,
  UploadCloud,
  Copy,
  Check,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Printer
} from 'lucide-react';
import { ResetDataModal } from '../dashboards/ResetDataModal';
import { ImportExcelModal } from '../proctor/ImportExcelModal';
import { ExamCardPrintModal } from '../proctor/ExamCardPrintModal';

interface UserManagementProps {
  currentUser: UserProfile;
}

const STORAGE_KEY = 'sasi_users_cache';

export const UserManagement: React.FC<UserManagementProps> = ({ currentUser }) => {
  // Initialize from LocalStorage cache first, fallback to MOCK_USERS
  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Validasi dan sanitasi integritas akun pengguna
        const cleaned = parsed.filter((u: UserProfile) => Boolean(u && u.username && u.full_name));
        return cleaned.map((u: UserProfile) => {
          const isAsst = u.role === 'assistant_admin';
          let asstInst = u.institution;
          if (isAsst && u.exam_card_password?.startsWith('ASST:')) {
            asstInst = u.exam_card_password.replace('ASST:', '');
          }
          const hasOverloadedPin = u.exam_card_password && (u.exam_card_password.startsWith('ASST:') || u.exam_card_password.startsWith('TEACHER:'));
          return {
            ...u,
            institution: isAsst ? (asstInst || 'Dinas Pendidikan (Pengawas Sekolah)') : u.institution,
            school_id: isAsst ? null : u.school_id,
            school: isAsst ? undefined : u.school,
            exam_card_password: hasOverloadedPin ? null : u.exam_card_password,
            password: u.password || (u.role === 'super_admin' ? 'admin123' : u.role === 'proctor' ? 'proktor123' : u.role === 'assistant_admin' ? 'asisten123' : (hasOverloadedPin ? '1234' : u.exam_card_password) || '1234')
          };
        });
      }
    } catch (e) {}
    return MOCK_USERS;
  });

  const [schools, setSchools] = useState<School[]>(() => {
    try {
      const cachedSchools = localStorage.getItem('sasi_schools_cache');
      if (cachedSchools) return JSON.parse(cachedSchools);
    } catch (e) {}
    return MOCK_SCHOOLS;
  });

  // Filters & Search - Default 'student' untuk proktor agar langsung tampil, null untuk admin
  const [activeRoleTab, setActiveRoleTab] = useState<string | null>(currentUser.role === 'proctor' ? 'student' : null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedRombel, setSelectedRombel] = useState<string>('ALL');
  const [selectedSessionStatus, setSelectedSessionStatus] = useState<'ALL' | 'online' | 'offline'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExamCardModal, setShowExamCardModal] = useState(false);

  // Modal State for Add/Edit
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Modal State for Import Excel (.xlsx)
  const [showImportModal, setShowImportModal] = useState(false);

  // Modal State for Super Admin Reset Data
  const [showResetModal, setShowResetModal] = useState(false);

  // Interactive Reset Password/PIN Modal State
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [targetResetUser, setTargetResetUser] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Visibility toggle for table passwords
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State for Add/Edit
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [schoolId, setSchoolId] = useState<string>(schools[0]?.id || '');
  const [gradeClass, setGradeClass] = useState('4-A');
  const [assignedLevel, setAssignedLevel] = useState<SchoolLevel>('SD');
  const [pinPassword, setPinPassword] = useState('4821');
  const [officerPassword, setOfficerPassword] = useState('proktor123');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Teacher Specific Form State
  const [teacherType, setTeacherType] = useState<'guru_kelas' | 'guru_mapel' | 'penulis_soal'>('guru_kelas');
  const [homeroomClass, setHomeroomClass] = useState('1-A');
  const [teacherSubjectSpecialty, setTeacherSubjectSpecialty] = useState('Semua Mapel SD (Kecuali PJOK & PAI)');
  const [teacherNip, setTeacherNip] = useState('');
  const [teacherGender, setTeacherGender] = useState<'L' | 'P'>('P');
  const [teacherEmploymentStatus, setTeacherEmploymentStatus] = useState<'PNS' | 'PPPK' | 'GTT/Honorer' | 'Guru Tetap Yayasan'>('PNS');
  const [teacherPhoneNumber, setTeacherPhoneNumber] = useState('');

  // Assistant Admin / Pengawas Specific Form State
  const [assistantInstitutionType, setAssistantInstitutionType] = useState<string>('Dinas Pendidikan (Pengawas Sekolah)');
  const [assistantCustomInstitution, setAssistantCustomInstitution] = useState<string>('');

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyPassword = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify('Password / PIN berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openResetPasswordModal = (user: UserProfile) => {
    setTargetResetUser(user);
    if (user.role === 'student') {
      const isSD = user.assigned_level === 'SD';
      setNewPasswordInput(isSD ? String(Math.floor(1000 + Math.random() * 9000)) : Math.random().toString(36).substring(2, 8).toUpperCase());
    } else {
      setNewPasswordInput('sasi' + Math.floor(100 + Math.random() * 900));
    }
    setShowResetPasswordModal(true);
  };

  const handleRandomizePassword = () => {
    if (!targetResetUser) return;
    if (targetResetUser.role === 'student') {
      const isSD = targetResetUser.assigned_level === 'SD';
      setNewPasswordInput(isSD ? String(Math.floor(1000 + Math.random() * 9000)) : Math.random().toString(36).substring(2, 8).toUpperCase());
    } else {
      const adjectives = ['hebat', 'pintar', 'unggul', 'maju', 'cerdas', 'sasi'];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      setNewPasswordInput(`${adj}${Math.floor(100 + Math.random() * 900)}`);
    }
  };

  const handleSaveResetPassword = async () => {
    if (!targetResetUser || !newPasswordInput.trim()) return;

    const trimmed = newPasswordInput.trim();
    const isStudent = targetResetUser.role === 'student';

    const updated = users.map(u => {
      if (u.id === targetResetUser.id) {
        return {
          ...u,
          exam_card_password: isStudent ? trimmed : (u.exam_card_password || trimmed),
          password: !isStudent ? trimmed : (u.password || trimmed)
        };
      }
      return u;
    });

    persistUsers(updated);

    // Sync to current user session if resetting own password
    try {
      const cachedCur = localStorage.getItem('sasi_current_user');
      if (cachedCur) {
        const curUserObj = JSON.parse(cachedCur);
        if (curUserObj.id === targetResetUser.id) {
          curUserObj.password = trimmed;
          localStorage.setItem('sasi_current_user', JSON.stringify(curUserObj));
        }
      }
    } catch (e) {}

    notify(`Berhasil mereset kata sandi/PIN untuk ${targetResetUser.full_name}: ${trimmed}`);

    try {
      const payload = isStudent
        ? { exam_card_password: trimmed, password: trimmed }
        : { password: trimmed, exam_card_password: trimmed };

      await safeSupabaseDistributedUpdate({
        tableName: 'user_profiles',
        id: targetResetUser.id,
        username: targetResetUser.username,
        schoolId: targetResetUser.school_id,
        role: targetResetUser.role,
        payload
      });
      await fetchUsersFromCloud();
    } catch (e) {}

    setShowResetPasswordModal(false);
    setTargetResetUser(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to persist users to cache
  const persistUsers = (updatedList: UserProfile[]) => {
    setUsers(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {}
  };

  // Fetch from Supabase Cloud (Authoritative Dual-Source: Master Hub + All Shards)
  const fetchUsersFromCloud = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, school:schools(*)');

      let allCloudUsers: any[] = (!error && data) ? [...data] : [];

      // Federated Sync: Kumpulkan juga akun dari seluruh Shard Nodes aktif (Klaster 2, Klaster 3)
      try {
        const clusterNodes = getClusterNodes().filter(n => !n.isMaster && n.isActive);
        for (const node of clusterNodes) {
          try {
            const nodeClient = getClientForNode(node);
            const { data: shardUsers } = await nodeClient
              .from('user_profiles')
              .select('*');

            if (shardUsers && shardUsers.length > 0) {
              const existingIds = new Set(allCloudUsers.filter(u => u && u.id).map(u => u.id));
              const existingUsernames = new Set(allCloudUsers.map(u => (u?.username || '').toLowerCase().trim()));
              shardUsers.forEach(su => {
                const hasId = su && su.id && existingIds.has(su.id);
                const hasUsername = su && su.username && existingUsernames.has(su.username.toLowerCase().trim());
                if (su && su.username && !hasId && !hasUsername) {
                  allCloudUsers.push(su);
                  if (su.id) existingIds.add(su.id);
                  existingUsernames.add(su.username.toLowerCase().trim());
                }
              });
            }
          } catch (nodeErr) {}
        }
      } catch (clusterErr) {}

      if (allCloudUsers.length > 0) {
        setUsers(prev => {
          const cleanedPrev = prev.filter(u => 
            !['0123456793', '0123456794', '0123456795', '0123456796'].includes(u.username) &&
            !u.full_name?.includes('(6-A)') && !u.full_name?.includes('(6-B)')
          );

          // Authoritative Cloud Sync: Master Cloud & Active Shards adalah sumber kebenaran data.
          // Akun yang telah dihapus permanen tidak akan dibangkitkan kembali dari local cache.
          const authoritativeList = (allCloudUsers as UserProfile[])
            .filter(u => Boolean(u && u.username && u.full_name))
            .map(u => {
              if (u.role === 'assistant_admin') {
                let asstInst = u.institution;
                if (u.exam_card_password?.startsWith('ASST:')) {
                  asstInst = u.exam_card_password.replace('ASST:', '');
                }
                return {
                  ...u,
                  institution: asstInst || 'Dinas Pendidikan (Pengawas Sekolah)',
                  school_id: null,
                  school: undefined,
                  exam_card_password: u.exam_card_password?.startsWith('ASST:') ? null : u.exam_card_password
                };
              }
              return {
                ...u,
                exam_card_password: u.exam_card_password?.startsWith('TEACHER:') ? null : u.exam_card_password
              };
            });

          // Distributed Deduplication: Pastikan list 100% bebas duplikasi (id maupun username)
          const uniqueMap = new Map<string, UserProfile>();
          authoritativeList.forEach(u => {
            const idKey = u.id ? `id:${u.id}` : null;
            const userKey = u.username ? `u:${u.username.toLowerCase().trim()}` : null;
            if (idKey && uniqueMap.has(idKey)) return;
            if (userKey && uniqueMap.has(userKey)) return;
            if (idKey) uniqueMap.set(idKey, u);
            if (userKey) uniqueMap.set(userKey, u);
          });
          const deduplicatedList = Array.from(new Set(uniqueMap.values()));

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(deduplicatedList));
          } catch (e) {}

          return deduplicatedList;
        });
      }
    } catch (e) {
      console.warn('Supabase users sync fallback:', e);
    }
  }, []);

  // Fetch from Supabase Cloud on mount & Sync bidirectional
  useEffect(() => {
    let isMounted = true;

    const fetchSchoolsFromCloud = async () => {
      try {
        const { data: dbSchools } = await supabase
          .from('schools')
          .select('*')
          .order('name', { ascending: true });
        if (dbSchools && dbSchools.length > 0 && isMounted) {
          setSchools(dbSchools);
          try {
            localStorage.setItem('sasi_schools_cache', JSON.stringify(dbSchools));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Supabase schools sync fallback:', err);
      }
    };

    fetchUsersFromCloud();
    fetchSchoolsFromCloud();
    return () => { isMounted = false; };
  }, [fetchUsersFromCloud]);

  // Resolusi nama sekolah proktor yang akurat dan bersumber langsung dari Supabase
  const currentProctorSchoolName = useMemo(() => {
    if (currentUser.school?.name) return currentUser.school.name;
    if (currentUser.school_id) {
      const targetId = toValidUUID(currentUser.school_id);
      const matched = schools.find(s => s.id === currentUser.school_id || toValidUUID(s.id) === targetId);
      if (matched?.name) return matched.name;
    }
    return 'Satuan Pendidikan';
  }, [currentUser, schools]);

  // Helper cerdas ekstrak angka tingkat kelas (misal: "6-A", "Kelas 6", "6", "IV", "Fase B" -> "4")
  const getGradeNumber = (gradeClass?: string | null): string | null => {
    if (!gradeClass) return null;
    const clean = gradeClass.trim();

    // 1. Prioritas Utama: Angka eksplisit (contoh: "Kelas 4", "4-A", "4")
    const match = clean.match(/\d+/);
    if (match) return match[0];

    // 2. Angka Romawi (contoh: "IV", "VI", "Kelas IV")
    const matchRoman = clean.match(/\b(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/i);
    if (matchRoman) {
      const romanMap: Record<string, string> = {
        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6',
        'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12'
      };
      const val = romanMap[matchRoman[1].toUpperCase()];
      if (val) return val;
    }

    // 3. Fase Kurikulum Merdeka (contoh: "Fase B", "Kelas Fase B")
    const matchPhase = clean.match(/fase\s*([a-f])/i);
    if (matchPhase) {
      const p = matchPhase[1].toUpperCase();
      if (p === 'A') return '1';
      if (p === 'B') return '4';
      if (p === 'C') return '6';
      if (p === 'D') return '7';
      if (p === 'E') return '10';
      if (p === 'F') return '11';
    }

    return null;
  };

  // Scope users based on currentUser role:
  // - super_admin: semua pengguna
  // - assistant_admin: hanya proktor dan siswa
  // - proctor: HANYA siswa yang bersekolah di SD proktor tersebut (TIDAK BOLEH muncul sekolah lain)
  const scopedUsers = users.filter((u) => {
    if (currentUser.role === 'super_admin') {
      return true; // Super admin melihat semua pengguna
    }
    if (currentUser.role === 'assistant_admin') {
      return u.role === 'proctor' || u.role === 'student'; // Asisten melihat proktor dan siswa
    }
    if (currentUser.role === 'proctor') {
      // 1. Wajib role student
      if (u.role !== 'student') return false;

      // 2. Wajib sesuai dengan sekolah proktor (berdasarkan school_id atau ID sekolah SD pertama sebagai fallback)
      const targetSchoolId = currentUser.school_id || 'sch-001';
      return u.school_id === targetSchoolId || (Boolean(u.school_id) && toValidUUID(u.school_id) === toValidUUID(targetSchoolId));
    }
    return false;
  });

  // Rekapitulasi jumlah akun per sekolah untuk Super Admin / Asisten
  const schoolUserCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    schools.forEach(s => {
      const sId = toValidUUID(s.id);
      counts[s.id] = users.filter(u => u.school_id === s.id || (Boolean(u.school_id) && toValidUUID(u.school_id) === sId)).length;
    });
    return counts;
  }, [users, schools]);

  // Siswa dalam scope sekolah aktif untuk perhitungan filter kelas
  const studentUsersInScope = useMemo(() => {
    return scopedUsers.filter(u => {
      if (u.role !== 'student') return false;
      if (selectedSchoolId === 'ALL') return true;
      return u.school_id === selectedSchoolId || (Boolean(u.school_id) && toValidUUID(u.school_id) === toValidUUID(selectedSchoolId));
    });
  }, [scopedUsers, selectedSchoolId]);

  // Cek jenjang SD (1-6) atau SMP (7-9)
  const isSmp = currentUser.assigned_level === 'SMP' || studentUsersInScope.some(u => {
    const g = getGradeNumber(u.grade_class);
    return g && ['7', '8', '9'].includes(g);
  });

  const gradeLevels = isSmp ? ['7', '8', '9'] : ['1', '2', '3', '4', '5', '6'];

  const gradeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: studentUsersInScope.length };
    gradeLevels.forEach(g => { counts[g] = 0; });
    studentUsersInScope.forEach(u => {
      const g = getGradeNumber(u.grade_class);
      if (g && counts[g] !== undefined) {
        counts[g] = (counts[g] || 0) + 1;
      }
    });
    return counts;
  }, [studentUsersInScope, gradeLevels]);

  // Daftar rombel unik yang tersedia pada kelas terpilih
  const availableRombels = useMemo(() => {
    const set = new Set<string>();
    studentUsersInScope.forEach(u => {
      if (u.grade_class) {
        const g = getGradeNumber(u.grade_class);
        if (selectedGrade === 'ALL' || g === selectedGrade) {
          set.add(u.grade_class.trim());
        }
      }
    });
    return Array.from(set).sort();
  }, [studentUsersInScope, selectedGrade]);

  // Filter logic
  const filteredUsers = scopedUsers.filter((u) => {
    const matchRole = !activeRoleTab || activeRoleTab === 'ALL' || u.role === activeRoleTab;
    const matchSchool = selectedSchoolId === 'ALL' || u.school_id === selectedSchoolId || (Boolean(u.school_id) && toValidUUID(u.school_id) === toValidUUID(selectedSchoolId));

    // Grade and Rombel filter (khusus siswa)
    const gradeNum = getGradeNumber(u.grade_class);
    const matchGrade = selectedGrade === 'ALL' || (u.role === 'student' && gradeNum === selectedGrade);
    const matchRombel = selectedRombel === 'ALL' || (u.role === 'student' && u.grade_class === selectedRombel);

    // Session status
    const matchSession = selectedSessionStatus === 'ALL' ||
      (selectedSessionStatus === 'online' && Boolean(u.is_logged_in)) ||
      (selectedSessionStatus === 'offline' && !u.is_logged_in);

    // Search query
    const searchLower = searchTerm.toLowerCase().trim();
    const matchSearch = 
      !searchLower ||
      u.full_name.toLowerCase().includes(searchLower) ||
      u.username.toLowerCase().includes(searchLower) ||
      (u.grade_class && u.grade_class.toLowerCase().includes(searchLower));

    return matchRole && matchSchool && matchGrade && matchRombel && matchSession && matchSearch;
  });

  const handleResetFilters = () => {
    setSelectedGrade('ALL');
    setSelectedRombel('ALL');
    setSelectedSessionStatus('ALL');
    setSearchTerm('');
    if (currentUser.role === 'super_admin') {
      setSelectedSchoolId('ALL');
    }
  };

  const isAnyFilterActive = selectedGrade !== 'ALL' || selectedRombel !== 'ALL' || selectedSessionStatus !== 'ALL' || searchTerm.trim() !== '' || (currentUser.role === 'super_admin' && selectedSchoolId !== 'ALL');

  // Reset PIN / Password
  const handleResetPin = async (user: UserProfile) => {
    const isSD = user.assigned_level === 'SD';
    const newPin = isSD 
      ? String(Math.floor(1000 + Math.random() * 9000))
      : Math.random().toString(36).substring(2, 8).toUpperCase();

    const updated = users.map(u => u.id === user.id ? { ...u, exam_card_password: newPin } : u);
    persistUsers(updated);
    notify(`Password / PIN ${user.full_name} berhasil direset menjadi: ${newPin}`);

    try {
      await safeSupabaseDistributedUpdate({
        tableName: 'user_profiles',
        id: user.id,
        username: user.username,
        schoolId: user.school_id,
        role: user.role,
        payload: { exam_card_password: newPin, password: newPin }
      });
      await fetchUsersFromCloud();
    } catch (e) {}
  };

  // Reset Login Status
  const handleResetLogin = async (user: UserProfile) => {
    const updated = users.map(u => u.id === user.id ? { ...u, is_logged_in: false } : u);
    persistUsers(updated);
    notify(`Status sesi login untuk ${user.full_name} berhasil dilepas.`);

    try {
      await safeSupabaseDistributedUpdate({
        tableName: 'user_profiles',
        id: user.id,
        username: user.username,
        schoolId: user.school_id,
        role: user.role,
        payload: { is_logged_in: false }
      });
      await fetchUsersFromCloud();
    } catch (e) {}
  };

  // Delete User (Distributed Delete across Master Hub and all active Shard Clusters)
  const handleDeleteUser = async (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    const userLabel = targetUser ? `${targetUser.full_name} (${targetUser.role.toUpperCase()})` : 'pengguna ini';

    // RBAC Security Guard: Asisten Admin hanya memiliki wewenang menghapus Siswa dan Proktor
    if (currentUser.role === 'assistant_admin' && targetUser && targetUser.role !== 'student' && targetUser.role !== 'proctor') {
      alert('Akses Ditolak: Asisten Admin hanya memiliki wewenang untuk menghapus akun Siswa CBT dan Proktor Sekolah.');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus ${userLabel} secara permanen dari sistem?`)) {
      const updated = users.filter(u => u.id !== userId);
      persistUsers(updated);
      notify('Menghapus pengguna dari server Master dan Klaster database...');

      try {
        const res = await safeSupabaseDistributedDelete({
          tableName: 'user_profiles',
          id: userId,
          username: targetUser?.username,
          fullName: targetUser?.full_name,
          nip: targetUser?.nip || undefined,
          schoolId: targetUser?.school_id,
          role: targetUser?.role
        });

        if (res.success) {
          notify(`Pengguna ${targetUser?.full_name || ''} berhasil dihapus permanen dari seluruh node database.`);
        } else {
          notify('Pengguna berhasil dihapus dari sistem lokal.');
        }

        // Cache Invalidation & Authoritative Sync:
        // Segera perbarui cache dari cloud database agar data yang dihapus tidak bangkit saat F5
        await fetchUsersFromCloud();
      } catch (e: any) {
        console.warn('Gagal menghapus pengguna terdistribusi:', e);
      }
    }
  };

  // Super Admin Reset Handlers (Distributed Reset across Master Hub and all Shard Clusters)
  const handleResetUsers = async (filter: { role?: UserRole | 'ALL'; schoolId?: string | 'ALL'; keepSuperAdmin?: boolean }) => {
    const remainingUsers = users.filter((u) => {
      if (filter.keepSuperAdmin && (u.username === 'nughejr@gmail.com' || u.role === 'super_admin')) {
        return true;
      }
      const matchRole = filter.role === 'ALL' || !filter.role || u.role === filter.role;
      const matchSchool = filter.schoolId === 'ALL' || !filter.schoolId || u.school_id === filter.schoolId;

      if (matchRole && matchSchool) {
        return false; // Hapus yang sesuai filter
      }
      return true;
    });

    persistUsers(remainingUsers);
    notify('Membersihkan data pengguna di Master Hub dan seluruh Shard Klaster...');

    try {
      await safeSupabaseDistributedDelete({
        tableName: 'user_profiles',
        bulkFilter: {
          role: filter.role,
          schoolId: filter.schoolId,
          keepSuperAdmin: filter.keepSuperAdmin,
          keepUsername: 'nughejr@gmail.com'
        }
      });
      notify('Data pengguna berhasil dibersihkan permanen di seluruh klaster database!');
    } catch (e: any) {
      console.warn('Gagal membersihkan data pengguna terdistribusi:', e);
    }
  };

  const handleResetBlueprintAndQuestions = async () => {
    localStorage.setItem('sasi_blueprint_items_cache', JSON.stringify([]));
    localStorage.setItem('sasi_question_bank_cache', JSON.stringify([]));
    notify('Seluruh data kisi-kisi dan bank butir soal berhasil direset!');

    try {
      await supabase.from('question_bank').delete().neq('id', 'keep-all-safety-check');
      await supabase.from('blueprint_items').delete().neq('id', 'keep-all-safety-check');
    } catch (e) {}
  };

  const handleResetAllSystemData = async () => {
    const defaultUsers = users.filter(u => u.username === 'nughejr@gmail.com' || u.role === 'super_admin');
    persistUsers(defaultUsers);
    localStorage.setItem('sasi_blueprint_items_cache', JSON.stringify([]));
    localStorage.setItem('sasi_question_bank_cache', JSON.stringify([]));
    localStorage.removeItem('sasi_packages_cache');
    localStorage.removeItem('sasi_sessions_cache');
    notify('Seluruh data aplikasi telah direset ke kondisi awal.');

    try {
      await supabase.from('user_profiles').delete().neq('username', 'nughejr@gmail.com');
      await supabase.from('question_bank').delete().neq('id', 'keep-all-safety-check');
      await supabase.from('blueprint_items').delete().neq('id', 'keep-all-safety-check');
    } catch (e) {}
  };

  // Helper untuk menentukan Fase otomatis dari kelas dan jenjang
  const calculatePhase = (level: SchoolLevel, gradeStr?: string): Phase => {
    const gradeNum = parseInt(gradeStr?.match(/\d+/)?.[0] || '6', 10);
    if (level === 'SMP' || gradeNum >= 7) return 'D';
    if (gradeNum <= 2) return 'A';
    if (gradeNum <= 4) return 'B';
    return 'C';
  };

  // Save new or edited user
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    const phaseComputed = role === 'student' ? calculatePhase(assignedLevel, gradeClass) : null;
    const calculatedGradeClass = role === 'student' 
      ? gradeClass.trim() 
      : (role === 'teacher' 
          ? (teacherType === 'guru_kelas' ? (homeroomClass.startsWith('Kelas ') ? homeroomClass : `Kelas ${homeroomClass}`) : (homeroomClass || '-'))
          : null);

    const calculatedTeacherMeta = role === 'teacher' ? `TEACHER:${JSON.stringify({
      type: teacherType,
      rombel: calculatedGradeClass,
      subject: teacherType === 'guru_kelas' ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : teacherSubjectSpecialty,
      assigned: [homeroomClass.replace('Kelas ', '')],
      nip: teacherNip.trim()
    })}` : null;

    const resolvedInstitution = role === 'assistant_admin'
      ? (assistantInstitutionType === 'custom' ? (assistantCustomInstitution.trim() || 'Dinas Pendidikan (Pengawas Sekolah)') : assistantInstitutionType)
      : (role === 'super_admin' ? 'Pusat / Super Admin' : undefined);

    // RBAC Security Guard: Asisten Admin secara ketat hanya memiliki wewenang mengelola Siswa dan Proktor
    if (currentUser.role === 'assistant_admin' && role !== 'student' && role !== 'proctor') {
      alert('Akses Ditolak: Asisten Admin hanya memiliki wewenang untuk mengelola akun Siswa CBT dan Proktor Sekolah.');
      return;
    }

    // 1. Validasi duplikasi username/NISN di state lokal
    const usernameClean = username.trim().toLowerCase();
    const usernameExists = users.some(u => 
      u.username.toLowerCase() === usernameClean && 
      (!editingUser || u.id !== editingUser.id)
    );
    if (usernameExists) {
      alert(`${role === 'student' ? 'NISN (Nomor Peserta)' : 'Username / Email'} "${username.trim()}" sudah digunakan oleh pengguna lain.`);
      return;
    }

    // 2. Validasi duplikasi di database cloud Supabase (Primary DB & Shard Prevention)
    try {
      let chkQuery = supabase
        .from('user_profiles')
        .select('id, username')
        .ilike('username', usernameClean);
      if (editingUser) {
        chkQuery = chkQuery.neq('id', toValidUUID(editingUser.id));
      }
      const { data: cloudMatch } = await chkQuery.maybeSingle();
      if (cloudMatch) {
        alert(`${role === 'student' ? 'NISN (Nomor Peserta)' : 'Username / Email'} "${username.trim()}" sudah terdaftar di database server pusat.`);
        return;
      }
    } catch (chkErr) {}

    // Validasi duplikasi NIP guru
    const nipClean = teacherNip.trim();
    if (role === 'teacher' && nipClean && nipClean !== '-' && nipClean.length > 3) {
      const nipExists = users.some(u => 
        u.role === 'teacher' && 
        u.nip && u.nip.trim() === nipClean && 
        (!editingUser || u.id !== editingUser.id) &&
        (!schoolId || u.school_id === schoolId || (schoolId && u.school_id === toValidUUID(schoolId)))
      );
      if (nipExists) {
        alert(`NIP/NUPTK "${nipClean}" sudah terdaftar untuk guru lain di sekolah ini.`);
        return;
      }
    }

    if (editingUser) {
      const validUserId = toValidUUID(editingUser.id);
      const validSchoolId = (role === 'super_admin' || role === 'assistant_admin') ? null : (schoolId ? toValidUUID(schoolId) : null);

      const updatedUser: UserProfile = {
        ...editingUser,
        id: validUserId,
        full_name: fullName.trim(),
        username: username.trim(),
        role,
        school_id: validSchoolId,
        school: (role === 'super_admin' || role === 'assistant_admin') ? undefined : schools.find(s => s.id === schoolId || (validSchoolId && toValidUUID(s.id) === validSchoolId)),
        institution: resolvedInstitution || editingUser.institution,
        grade_class: calculatedGradeClass,
        teacher_type: role === 'teacher' ? teacherType : editingUser.teacher_type,
        assigned_classes: role === 'teacher' ? [homeroomClass.replace('Kelas ', '')] : editingUser.assigned_classes,
        assigned_subject_name: role === 'teacher' ? (teacherType === 'guru_kelas' ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : teacherSubjectSpecialty) : editingUser.assigned_subject_name,
        nip: role === 'teacher' ? (teacherNip.trim() || null) : editingUser.nip,
        assigned_level: assignedLevel,
        phase: phaseComputed,
        exam_card_password: role === 'teacher' 
          ? (calculatedTeacherMeta || officerPassword.trim()) 
          : (role === 'assistant_admin' ? `ASST:${resolvedInstitution}` : pinPassword.trim()),
        password: role !== 'student' ? officerPassword.trim() : (pinPassword.trim() || editingUser.password),
        photo_url: photoUrl.trim() || null,
        updated_at: new Date().toISOString()
      };

      const updated = users.map(u => {
        const isMatch = 
          u.id === editingUser.id || 
          toValidUUID(u.id) === validUserId || 
          (Boolean(u.username) && Boolean(editingUser.username) && u.username.toLowerCase().trim() === editingUser.username.toLowerCase().trim());
        return isMatch ? updatedUser : u;
      });
      persistUsers(updated);

      // Sync to currentUser in localStorage if the user edited their own account
      try {
        const cachedCur = localStorage.getItem('sasi_current_user');
        if (cachedCur) {
          const curUserObj = JSON.parse(cachedCur);
          if (curUserObj.id === editingUser.id || toValidUUID(curUserObj.id) === validUserId || curUserObj.username === editingUser.username) {
            curUserObj.full_name = fullName.trim();
            curUserObj.username = username.trim();
            curUserObj.photo_url = photoUrl.trim() || null;
            if (role !== 'student') curUserObj.password = officerPassword.trim();
            localStorage.setItem('sasi_current_user', JSON.stringify(curUserObj));
          }
        }
      } catch (e) {}

      notify('Data pengguna & profil berhasil diperbarui & disimpan permanen di database!');

      // Persist to Cloud Supabase via safeSupabaseDistributedUpdate (Strict by ID UUID to Master & All Shards)
      await safeSupabaseDistributedUpdate({
        tableName: 'user_profiles',
        id: validUserId,
        schoolId: validSchoolId,
        previousSchoolId: editingUser.school_id,
        role: updatedUser.role,
        payload: {
          id: validUserId,
          full_name: updatedUser.full_name,
          username: updatedUser.username,
          role: updatedUser.role,
          school_id: validSchoolId,
          grade_class: updatedUser.grade_class,
          assigned_level: updatedUser.assigned_level,
          phase: updatedUser.phase,
          exam_card_password: updatedUser.exam_card_password,
          password: updatedUser.password,
          photo_url: updatedUser.photo_url,
          updated_at: updatedUser.updated_at
        }
      });

      // Sync to Supabase `teachers` table & local teachers cache (khusus guru internal sekolah, bukan penulis eksternal)
      if (role === 'teacher' && validSchoolId && teacherType !== 'penulis_soal') {
        try {
          const tchPayload = {
            id: generateValidUUID(),
            school_id: validSchoolId,
            nip_nuptk: teacherNip.trim() || '-',
            full_name: fullName.trim(),
            gender: teacherGender || 'P',
            subject_specialty: teacherType === 'guru_kelas' ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : teacherSubjectSpecialty,
            homeroom_class: calculatedGradeClass || '-',
            employment_status: teacherEmploymentStatus || 'PNS',
            phone_number: teacherPhoneNumber.trim() || '-',
            updated_at: new Date().toISOString()
          };

          const { data: existingTch } = await supabase
            .from('teachers')
            .select('id')
            .eq('school_id', validSchoolId)
            .or(`nip_nuptk.eq.${teacherNip || 'nomatch'},full_name.eq.${fullName.trim()}`)
            .maybeSingle();

          const finalTchId = existingTch?.id || tchPayload.id;
          await safeSupabaseDistributedUpdate({
            tableName: 'teachers',
            id: finalTchId,
            schoolId: validSchoolId,
            previousSchoolId: editingUser.school_id,
            role: 'teacher',
            payload: { ...tchPayload, id: finalTchId }
          });
        } catch (tchErr) {
          console.warn('Sync to teachers table warning:', tchErr);
        }

        // Also update local storage sasi_teachers_${validSchoolId} and sasi_teachers_${schoolId}
        try {
          const keys = [`sasi_teachers_${validSchoolId}`];
          if (schoolId && schoolId !== validSchoolId) keys.push(`sasi_teachers_${schoolId}`);
          keys.forEach(k => {
            const cached = localStorage.getItem(k);
            let list = cached ? JSON.parse(cached) : [];
            const newTchRec = {
              id: validUserId,
              nip_nuptk: teacherNip.trim() || '-',
              full_name: fullName.trim(),
              gender: teacherGender || 'P',
              teacher_type: teacherType,
              homeroom_class: calculatedGradeClass || '-',
              assigned_classes: [homeroomClass.replace('Kelas ', '')],
              subject_specialty: teacherType === 'guru_kelas' ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : teacherSubjectSpecialty,
              employment_status: teacherEmploymentStatus,
              phone_number: teacherPhoneNumber.trim() || '-',
              email: username.trim(),
              password: officerPassword.trim() || 'guru123'
            };
            list = list.filter((item: any) => 
              item.id !== newTchRec.id && 
              item.email?.toLowerCase().trim() !== newTchRec.email.toLowerCase().trim() &&
              item.full_name?.toLowerCase().trim() !== newTchRec.full_name.toLowerCase().trim()
            );
            list.unshift(newTchRec);
            localStorage.setItem(k, JSON.stringify(list));
          });
        } catch (e) {}
      }

    } else {
      const newId = generateValidUUID();
      const validSchoolId = (role === 'super_admin' || role === 'assistant_admin') ? null : (schoolId ? toValidUUID(schoolId) : null);

      const newUser: UserProfile = {
        id: newId,
        username: username.trim(),
        full_name: fullName.trim(),
        role,
        school_id: validSchoolId,
        school: (role === 'super_admin' || role === 'assistant_admin') ? undefined : schools.find(s => s.id === schoolId),
        institution: resolvedInstitution,
        grade_class: calculatedGradeClass,
        teacher_type: role === 'teacher' ? teacherType : undefined,
        assigned_classes: role === 'teacher' ? [homeroomClass.replace('Kelas ', '')] : undefined,
        assigned_subject_name: role === 'teacher' ? (teacherType === 'guru_kelas' ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : teacherSubjectSpecialty) : undefined,
        nip: role === 'teacher' ? (teacherNip.trim() || null) : undefined,
        assigned_level: assignedLevel,
        phase: phaseComputed,
        exam_card_password: role === 'teacher' 
          ? (calculatedTeacherMeta || officerPassword.trim()) 
          : (role === 'assistant_admin' ? `ASST:${resolvedInstitution}` : pinPassword.trim()),
        password: role !== 'student' ? officerPassword.trim() : pinPassword.trim(),
        photo_url: photoUrl.trim() || null,
        is_logged_in: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updated = [newUser, ...users];
      persistUsers(updated);
      notify(`Pengguna baru ${fullName} berhasil ditambahkan & tersimpan di database Supabase!`);

      // Persist to Cloud Supabase user_profiles (Multi-Node Dual-Write)
      await safeSupabaseUpsert('user_profiles', {
        id: newUser.id,
        username: newUser.username,
        full_name: newUser.full_name,
        role: newUser.role,
        school_id: validSchoolId,
        grade_class: newUser.grade_class,
        assigned_level: newUser.assigned_level,
        phase: newUser.phase,
        exam_card_password: newUser.exam_card_password,
        password: newUser.password,
        photo_url: newUser.photo_url,
        is_logged_in: false,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      }, validSchoolId);

      // Sync to Supabase `teachers` table & local teachers cache (khusus guru internal sekolah, bukan penulis eksternal)
      if (role === 'teacher' && validSchoolId && teacherType !== 'penulis_soal') {
        try {
          const tchPayload = {
            id: generateValidUUID(),
            school_id: validSchoolId,
            nip_nuptk: teacherNip.trim() || '-',
            full_name: fullName.trim(),
            gender: teacherGender || 'P',
            subject_specialty: teacherType === 'guru_kelas' ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : teacherSubjectSpecialty,
            homeroom_class: calculatedGradeClass || '-',
            employment_status: teacherEmploymentStatus || 'PNS',
            phone_number: teacherPhoneNumber.trim() || '-',
            updated_at: new Date().toISOString()
          };
          await safeSupabaseUpsert('teachers', tchPayload, validSchoolId);
        } catch (tchErr) {
          console.warn('Sync to teachers table warning:', tchErr);
        }

        // Also update local storage sasi_teachers_${validSchoolId} and sasi_teachers_${schoolId}
        try {
          const keys = [`sasi_teachers_${validSchoolId}`];
          if (schoolId && schoolId !== validSchoolId) keys.push(`sasi_teachers_${schoolId}`);
          keys.forEach(k => {
            const cached = localStorage.getItem(k);
            let list = cached ? JSON.parse(cached) : [];
            const newTchRec = {
              id: newId,
              nip_nuptk: teacherNip.trim() || '-',
              full_name: fullName.trim(),
              gender: teacherGender || 'P',
              teacher_type: teacherType,
              homeroom_class: calculatedGradeClass || '-',
              assigned_classes: [homeroomClass.replace('Kelas ', '')],
              subject_specialty: teacherType === 'guru_kelas' ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : teacherSubjectSpecialty,
              employment_status: teacherEmploymentStatus,
              phone_number: teacherPhoneNumber.trim() || '-',
              email: username.trim(),
              password: officerPassword.trim() || 'guru123'
            };
            list = list.filter((item: any) => 
              item.id !== newTchRec.id && 
              item.email?.toLowerCase().trim() !== newTchRec.email.toLowerCase().trim() &&
              item.full_name?.toLowerCase().trim() !== newTchRec.full_name.toLowerCase().trim()
            );
            list.unshift(newTchRec);
            localStorage.setItem(k, JSON.stringify(list));
          });
        } catch (e) {}
      }
    }

    // Authoritative Sync: Segera sinkronkan cache lokal dengan database setelah mutasi
    await fetchUsersFromCloud();

    setShowAddModal(false);
    setEditingUser(null);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setFullName(u.full_name);
    setUsername(u.username);
    setRole(u.role);
    setSchoolId(u.school_id || schools[0]?.id || '');
    setGradeClass(u.grade_class || '6-A');
    setAssignedLevel(u.assigned_level || 'SD');
    setPinPassword(u.exam_card_password || u.password || '1234');
    setOfficerPassword(u.password || (u.role === 'super_admin' ? 'admin123' : (u.role === 'teacher' ? 'guru123' : 'proktor123')));
    setPhotoUrl(u.photo_url || '');

    // Assistant / Pengawas fields
    if (u.role === 'assistant_admin') {
      let inst = u.institution;
      if (u.exam_card_password?.startsWith('ASST:')) {
        inst = u.exam_card_password.replace('ASST:', '');
      }
      inst = inst || 'Dinas Pendidikan (Pengawas Sekolah)';
      const standardList = [
        'Dinas Pendidikan (Pengawas Sekolah)',
        'Pusat / Tim Teknis SASIPEDIA',
        'Korwil Bidang Pendidikan Kecamatan',
        'Tim Pengembang Kurikulum & Penelaah Soal'
      ];
      if (standardList.includes(inst)) {
        setAssistantInstitutionType(inst);
        setAssistantCustomInstitution(inst);
      } else {
        setAssistantInstitutionType('custom');
        setAssistantCustomInstitution(inst);
      }
    } else {
      setAssistantInstitutionType('Dinas Pendidikan (Pengawas Sekolah)');
      setAssistantCustomInstitution('');
    }

    // Teacher fields
    const resolvedType = u.teacher_type || (
      u.full_name?.toLowerCase().includes('zyandru') || u.username?.toLowerCase().includes('zyandru')
        ? 'penulis_soal'
        : (u.assigned_subject_name && (u.assigned_subject_name.toLowerCase().includes('pjok') || u.assigned_subject_name.toLowerCase().includes('agama')) ? 'guru_mapel' : 'guru_kelas')
    );
    setTeacherType(resolvedType);
    setHomeroomClass(u.grade_class?.replace('Kelas ', '') || '1-A');
    setTeacherSubjectSpecialty(u.assigned_subject_name || 'Semua Mapel SD (Kecuali PJOK & PAI)');
    setTeacherNip(u.nip || '');
    setTeacherGender(u.gender || 'P');
    setTeacherEmploymentStatus((u.employment_status as any) || 'PNS');
    setTeacherPhoneNumber(u.phone_number || '');
    setShowAddModal(true);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setRole('student');
    const targetSchoolId = currentUser.role === 'proctor' && currentUser.school_id 
      ? currentUser.school_id 
      : (selectedSchoolId !== 'ALL' ? selectedSchoolId : (schools[0]?.id || ''));
    const matchedSchool = schools.find(s => s.id === targetSchoolId);
    const targetLevel: SchoolLevel = matchedSchool?.level || (currentUser.role === 'proctor' && currentUser.assigned_level ? currentUser.assigned_level : 'SD');
    const defaultGrade = targetLevel === 'SMP' ? '7-A' : '6-A';
    setSchoolId(targetSchoolId);
    setGradeClass(defaultGrade);
    setAssignedLevel(targetLevel);
    // Auto-generate PIN unik untuk siswa baru
    setPinPassword(generateStudentPin(targetLevel, defaultGrade));
    setOfficerPassword('proktor123');
    setPhotoUrl('');

    // Assistant defaults
    setAssistantInstitutionType('Dinas Pendidikan (Pengawas Sekolah)');
    setAssistantCustomInstitution('Dinas Pendidikan (Pengawas Sekolah)');

    // Teacher defaults
    setTeacherType('guru_kelas');
    setHomeroomClass('1-A');
    setTeacherSubjectSpecialty('Semua Mapel SD (Kecuali PJOK & PAI)');
    setTeacherNip('');
    setTeacherGender('P');
    setTeacherEmploymentStatus('PNS');
    setTeacherPhoneNumber('');
    setShowAddModal(true);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const studentList = filteredUsers.filter(u => u.role === 'student');
    if (studentList.length === 0) {
      alert('Tidak ada data siswa pada filter saat ini untuk diekspor.');
      return;
    }
    const schoolName = currentUser.role === 'proctor' 
      ? currentProctorSchoolName 
      : (schools.find(s => s.id === selectedSchoolId)?.name || 'Semua_Sekolah');
    exportStudentsToExcel(studentList, schoolName);
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-sm font-bold animate-slide-left">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black text-brand-700 uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5 text-brand-600" />
            <span>
              {currentUser.role === 'proctor' 
                ? `Pusat Kendali Siswa • ${currentProctorSchoolName}`
                : 'Manajemen Pengguna & Hirarki Otoritas'}
            </span>
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex items-center space-x-1 font-bold">
              <Database className="w-3 h-3" />
              <span>Tersinkron Database</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {currentUser.role === 'proctor'
              ? `Kelola Siswa (${currentProctorSchoolName})`
              : 'Atur Pengguna Sistem (User Management)'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {currentUser.role === 'proctor'
              ? `Daftar siswa resmi yang terdaftar pada satuan pendidikan ini. Anda dapat mengunduh daftar siswa, mereset PIN, melepas sesi perangkat, atau mendaftarkan siswa baru.`
              : currentUser.role === 'assistant_admin'
                ? 'Kelola akun Proktor Sekolah dan Siswa peserta ujian. Mendukung reset PIN instan dan buka kunci sesi perangkat siswa.'
                : 'Kelola akun pengguna: Super Admin, Asisten Super Admin, Proktor Sekolah, Guru, dan Siswa peserta ujian. Mendukung reset PIN instan dan buka kunci sesi.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full lg:w-auto shrink-0">
          {currentUser.role === 'super_admin' && (
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="col-span-2 sm:col-span-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
              title="Reset data akun berdasarkan sekolah atau peran"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Data</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            title="Impor daftar siswa dari file Excel (.xlsx / .xls)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
            <span>Impor Siswa (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            title="Unduh daftar akun dan PIN siswa ke format Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor Siswa (.xlsx)</span>
          </button>

          {/* Tombol Cetak Kartu Ujian (Sesuai Filter Siswa) */}
          <button
            type="button"
            onClick={() => {
              const studentList = filteredUsers.filter(u => u.role === 'student');
              if (studentList.length === 0) {
                notify('Tidak ada data siswa pada filter saat ini untuk dicetak kartunya.');
                return;
              }
              setShowExamCardModal(true);
            }}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-800 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            title="Cetak kartu peserta ujian sesuai filter kelas/siswa yang aktif"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-700" />
            <span>Cetak Kartu ({filteredUsers.filter(u => u.role === 'student').length})</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white text-xs sm:text-sm font-black rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-brand-500/20 transition-all transform active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{currentUser.role === 'proctor' ? 'Tambah Siswa' : (currentUser.role === 'assistant_admin' ? 'Tambah Siswa / Proktor' : 'Tambah Pengguna')}</span>
          </button>
        </div>
      </div>

      {/* Role Filter Tabs (Disesuaikan dengan Hak Akses Role Pengguna) */}
      {(() => {
        const availableRoleTabs = [
          { key: 'ALL', label: currentUser.role === 'proctor' ? 'Seluruh Siswa' : (currentUser.role === 'assistant_admin' ? 'Semua (Siswa & Proktor)' : 'Semua Pengguna'), subLabel: 'Semua hak akses akun', count: scopedUsers.length, icon: Users, color: 'text-blue-600', bgIcon: 'bg-blue-50', show: true },
          { key: 'super_admin', label: 'Super Admin', subLabel: 'Pengelola penuh sistem', count: scopedUsers.filter(u => u.role === 'super_admin').length, icon: ShieldCheck, color: 'text-purple-600', bgIcon: 'bg-purple-50', show: currentUser.role === 'super_admin' },
          { key: 'assistant_admin', label: 'Asisten Admin', subLabel: 'Pengawas & verifikator', count: scopedUsers.filter(u => u.role === 'assistant_admin').length, icon: Users, color: 'text-indigo-600', bgIcon: 'bg-indigo-50', show: currentUser.role === 'super_admin' },
          { key: 'proctor', label: 'Proktor Sekolah', subLabel: 'Operator ruang ujian', count: scopedUsers.filter(u => u.role === 'proctor').length, icon: SchoolIcon, color: 'text-sky-600', bgIcon: 'bg-sky-50', show: currentUser.role === 'super_admin' || currentUser.role === 'assistant_admin' },
          { key: 'teacher', label: 'Pendidik / Guru', subLabel: 'Penilai isian & uraian', count: scopedUsers.filter(u => u.role === 'teacher').length, icon: Award, color: 'text-amber-600', bgIcon: 'bg-amber-50', show: currentUser.role === 'super_admin' },
          { key: 'student', label: 'Siswa CBT', subLabel: 'Peserta asesmen & ujian', count: scopedUsers.filter(u => u.role === 'student').length, icon: GraduationCap, color: 'text-emerald-600', bgIcon: 'bg-emerald-50', show: true },
        ].filter(t => t.show);

        const renderTabCard = (tab: typeof availableRoleTabs[0]) => {
          const IconComponent = tab.icon;
          const isSelected = activeRoleTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveRoleTab(prev => prev === tab.key ? null : tab.key)}
              className={`group relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl text-left transition-all duration-200 border-2 h-auto gap-2 ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20 scale-[1.01]'
                  : 'bg-white hover:bg-slate-50/90 text-slate-800 border-slate-200/90 hover:border-brand-400 shadow-xs hover:shadow-sm'
              }`}
              title={isSelected ? "Klik lagi untuk menyembunyikan daftar" : `Klik untuk menampilkan daftar ${tab.label}`}
            >
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
                  isSelected ? 'bg-white/15 text-white' : `${tab.bgIcon} ${tab.color}`
                }`}>
                  <IconComponent className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-black text-xs sm:text-sm leading-tight truncate">
                      {tab.label}
                    </h4>
                    {isSelected && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-brand-500 text-white tracking-wider shrink-0">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] leading-snug mt-0.5 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {tab.subLabel}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-2">
                <span className={`inline-block text-[11px] sm:text-xs font-black px-2.5 py-1 rounded-lg ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700 border border-slate-200/80'
                }`}>
                  {tab.count} <span className="font-semibold text-[10px] opacity-75">Akun</span>
                </span>
              </div>
            </button>
          );
        };

        return (
          <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-brand-600" />
                <span>Pilih Kategori Role Pengguna:</span>
              </div>
              {activeRoleTab !== null && (
                <button
                  type="button"
                  onClick={() => setActiveRoleTab(null)}
                  className="text-xs text-brand-600 hover:text-brand-800 font-bold hover:underline transition-colors flex items-center space-x-1"
                >
                  <span>✕ Sembunyikan Tabel</span>
                </button>
              )}
            </div>

            <div className={`grid gap-2.5 sm:gap-3 ${
              availableRoleTabs.length === 6 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' :
              availableRoleTabs.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
            }`}>
              {availableRoleTabs.map(renderTabCard)}
            </div>
          </div>
        );
      })()}

      {/* Tampilkan Daftar Tabel Pengguna hanya jika ada role yang diklik */}
      {activeRoleTab !== null && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Panel Kontrol Filter & Pencarian Lengkap */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
            {/* Baris 1: Pencarian, Sekolah, Status Sesi & Reset */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari nama siswa, NISN, atau kelas..."
                  className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Filter Sekolah (Super Admin & Asisten) */}
              <div className="flex flex-wrap items-center gap-2">
                {currentUser.role !== 'proctor' && (
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Sekolah:</span>
                    <select
                      value={selectedSchoolId}
                      onChange={(e) => setSelectedSchoolId(e.target.value)}
                      className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 max-w-[240px] truncate"
                    >
                      <option value="ALL">Semua Sekolah ({users.length} Akun)</option>
                      {schools.map(s => {
                        const count = schoolUserCounts[s.id] || 0;
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} ({count} Akun)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {currentUser.role === 'proctor' && (
                  <div className="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                    Sekolah: <strong>{currentProctorSchoolName}</strong>
                  </div>
                )}

                {/* Filter Status Sesi (Online / Offline) */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Status:</span>
                  <select
                    value={selectedSessionStatus}
                    onChange={(e) => setSelectedSessionStatus(e.target.value as any)}
                    className="text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-700 focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="ALL">Semua Sesi</option>
                    <option value="online">● Online / Ujian</option>
                    <option value="offline">○ Offline</option>
                  </select>
                </div>

                {/* Tombol Reset Filter jika ada filter aktif */}
                {isAnyFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center space-x-1 transition-all"
                    title="Reset semua filter pencarian dan kelas"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reset Filter</span>
                  </button>
                )}

                {/* Counter Total Hasil Filter */}
                <span className="text-xs font-black text-brand-700 bg-brand-50 px-3 py-2 rounded-xl border border-brand-200 whitespace-nowrap">
                  {filteredUsers.length} Data Ditampilkan
                </span>
              </div>
            </div>

            {/* Baris 2: Quick Filter Tingkat Kelas & Rombel (Khusus Tampilan Siswa) */}
            {(activeRoleTab === 'student' || activeRoleTab === 'ALL' || currentUser.role === 'proctor') && (
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center space-x-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-brand-600" />
                  <span>Filter Tingkat Kelas:</span>
                </span>

                <button
                  type="button"
                  onClick={() => { setSelectedGrade('ALL'); setSelectedRombel('ALL'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                    selectedGrade === 'ALL'
                      ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Semua Kelas ({gradeCounts['ALL'] || 0})
                </button>

                {gradeLevels.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => { setSelectedGrade(g); setSelectedRombel('ALL'); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border ${
                      selectedGrade === g
                        ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Kelas {g} ({gradeCounts[g] || 0})
                  </button>
                ))}

                {/* Dropdown Rombel jika dalam kelas yang dipilih terdapat lebih dari 1 rombel */}
                {availableRombels.length > 1 && (
                  <div className="flex items-center space-x-1.5 ml-auto sm:ml-2">
                    <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Rombel:</span>
                    <select
                      value={selectedRombel}
                      onChange={(e) => setSelectedRombel(e.target.value)}
                      className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-700 focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="ALL">Semua Rombel</option>
                      {availableRombels.map(r => (
                        <option key={r} value={r}>{r.startsWith('Kelas') ? r : `Kelas ${r}`}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Users Table: Grid Bersekat Tegas & High-Density (Muat 10-15 Baris per Layar) */}
          <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-sky-100 text-sky-950 font-black uppercase tracking-wider text-[11px] border-b-2 border-sky-300">
                  <tr className="divide-x divide-sky-200">
                    <th className="py-2.5 px-2 text-center w-12 bg-sky-200/80 text-sky-950 font-black">NO.</th>
                    <th className="py-2.5 px-3 min-w-[200px]">PENGGUNA & AKUN (NISN / USERNAME)</th>
                    <th className="py-2.5 px-3 w-32">ROLE OTORITAS</th>
                    {currentUser.role !== 'proctor' && (
                      <th className="py-2.5 px-3 min-w-[200px]">ASAL SEKOLAH / INSTANSI</th>
                    )}
                    <th className="py-2.5 px-3 w-28">KELAS / ROMBEL</th>
                    <th className="py-2.5 px-3 w-36 text-center">PASSWORD / PIN</th>
                    <th className="py-2.5 px-2 w-24 text-center">STATUS SESI</th>
                    <th className="py-2.5 px-3 w-40 text-center">TINDAKAN CEPAT</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={currentUser.role !== 'proctor' ? 8 : 7} className="py-12 text-center text-slate-400 font-medium text-xs">
                        Tidak ditemukan data pengguna yang sesuai dengan filter pencarian / kriteria kelas.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, index) => {
                      const matchedSchool = u.school || schools.find(s => s.id === u.school_id || (Boolean(u.school_id) && toValidUUID(s.id) === toValidUUID(u.school_id)));
                      return (
                        <tr 
                          key={u.id} 
                          className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors"
                        >
                          {/* 1. NOMOR URUT DINAMIS */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                            {index + 1}
                          </td>

                          {/* 2. PENGGUNA & AKUN (NAMA & NISN / USERNAME) */}
                          <td className="py-2 px-3">
                            <div className="flex items-center space-x-2.5">
                              {u.photo_url ? (
                                <img
                                  src={u.photo_url}
                                  alt={u.full_name}
                                  className="w-7 h-7 rounded-lg object-cover border border-slate-300 shadow-2xs shrink-0"
                                />
                              ) : (
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                                  u.role === 'super_admin' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                  u.role === 'assistant_admin' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' :
                                  u.role === 'proctor' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                  u.role === 'teacher' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                  'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {u.full_name ? u.full_name.charAt(0) : 'U'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 text-xs leading-tight truncate max-w-[220px]" title={u.full_name}>
                                  {u.full_name}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center space-x-1 truncate max-w-[220px]" title={u.username}>
                                  <span>{u.username}</span>
                                  {u.role === 'student' && <span className="text-brand-600 font-semibold text-[10px]">(@siswa.sasi.id)</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 3. ROLE OTORITAS */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold inline-flex items-center space-x-1 ${
                              u.role === 'super_admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                              u.role === 'assistant_admin' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                              u.role === 'proctor' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              u.role === 'teacher' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {u.role === 'super_admin' && <ShieldCheck className="w-3 h-3" />}
                              {u.role === 'assistant_admin' && <Users className="w-3 h-3" />}
                              {u.role === 'proctor' && <SchoolIcon className="w-3 h-3" />}
                              {u.role === 'teacher' && <Award className="w-3 h-3" />}
                              {u.role === 'student' && <GraduationCap className="w-3 h-3" />}
                              <span>
                                {u.role === 'super_admin' ? 'Super Admin' :
                                 u.role === 'assistant_admin' ? 'Asisten' :
                                 u.role === 'proctor' ? 'Proktor' :
                                 u.role === 'teacher' ? 'Pendidik' : 'Siswa CBT'}
                              </span>
                            </span>
                          </td>

                          {/* 4. ASAL SEKOLAH / INSTANSI (HANYA DITAMPILKAN JIKA BUKAN PROKTOR) */}
                          {currentUser.role !== 'proctor' && (
                            <td className="py-2 px-3 text-slate-700 font-semibold text-xs truncate max-w-[240px]" title={u.institution || matchedSchool?.name || '-'}>
                              {u.role === 'assistant_admin' ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200 shadow-2xs">
                                  <Building2 className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span>{u.institution || 'Dinas Pendidikan (Pengawas Sekolah)'}</span>
                                </span>
                              ) : u.role === 'super_admin' ? (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
                                  <ShieldCheck className="w-3 h-3 text-purple-600 shrink-0" />
                                  <span>{u.institution || 'Pusat / Super Admin'}</span>
                                </span>
                              ) : matchedSchool ? (
                                <span>{matchedSchool.name}</span>
                              ) : (
                                <span className="text-slate-400 italic font-normal">Pusat / Seluruh Jenjang</span>
                              )}
                            </td>
                          )}

                          {/* 5. KELAS / ROMBEL */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-800 text-xs">
                              {u.grade_class ? (u.grade_class.startsWith('Kelas') ? u.grade_class : `Kelas ${u.grade_class}`) : '-'}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {u.assigned_level || 'SD'} {u.phase ? `(Fase ${u.phase})` : ''}
                            </span>
                          </td>

                          {/* 6. PASSWORD / PIN */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            {u.role === 'student' ? (
                              u.exam_card_password ? (
                                <div className="inline-flex items-center space-x-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-300 font-mono font-bold text-amber-900 text-[11px]">
                                  <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{u.exam_card_password}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPassword(u.id, u.exam_card_password!)}
                                    className="text-amber-600 hover:text-amber-900 ml-0.5 p-0.5 rounded transition-colors"
                                    title="Salin PIN Siswa"
                                  >
                                    {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">-</span>
                              )
                            ) : (
                              <div className="inline-flex items-center space-x-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-800 text-[11px]">
                                <KeyRound className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="tracking-wider">
                                  {visiblePasswords[u.id] ? (u.password || 'admin123') : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(u.id)}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                  title={visiblePasswords[u.id] ? "Sembunyikan Sandi" : "Lihat Sandi"}
                                >
                                  {visiblePasswords[u.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPassword(u.id, u.password || 'admin123')}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                                  title="Salin Kata Sandi"
                                >
                                  {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                          </td>

                          {/* 7. STATUS SESI */}
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {u.is_logged_in ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Aktif</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600">
                                Offline
                              </span>
                            )}
                          </td>

                          {/* 8. TINDAKAN CEPAT */}
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-1">
                              {/* Reset PIN / Password */}
                              <button
                                type="button"
                                onClick={() => openResetPasswordModal(u)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all"
                                title={u.role === 'student' ? 'Reset PIN Kartu Ujian' : 'Reset Kata Sandi Akun'}
                              >
                                <KeyRound className="w-3 h-3 text-amber-600" />
                                <span>{u.role === 'student' ? 'Reset PIN' : 'Reset'}</span>
                              </button>

                              {/* Buka Sesi Login Siswa jika Aktif */}
                              {u.is_logged_in && (
                                <button
                                  type="button"
                                  onClick={() => handleResetLogin(u)}
                                  className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all"
                                  title="Lepas Kunci Sesi Login Siswa"
                                >
                                  <Unlock className="w-3 h-3 text-sky-600" />
                                  <span>Lepas</span>
                                </button>
                              )}

                              {/* Edit Profil */}
                              <button
                                type="button"
                                onClick={() => openEditModal(u)}
                                className="p-1 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-slate-200"
                                title="Edit Pengguna & Profil"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Hapus Pengguna */}
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                                title="Hapus Pengguna"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
      )}

      {/* Modal Cetak Kartu Ujian (PDF / Print Langsung) */}
      {showExamCardModal && (
        <ExamCardPrintModal
          students={filteredUsers.filter(u => u.role === 'student')}
          school={
            (currentUser.school_id && schools.find(s => s.id === currentUser.school_id || toValidUUID(s.id) === toValidUUID(currentUser.school_id))) 
            || schools.find(s => s.id === selectedSchoolId)
            || currentUser.school
            || schools[0]
          }
          sessionName={selectedGrade !== 'ALL' ? `Siswa Kelas ${selectedGrade}` : 'Semua Peserta Terdaftar'}
          onClose={() => setShowExamCardModal(false)}
        />
      )}

      {/* Modal Add / Edit User (Lengkap dengan Unggah Foto & Kata Sandi) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-200 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingUser ? 'Perbarui Data & Profil Pengguna' : 'Tambah Pengguna Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">Tersimpan permanen di cloud database Supabase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 mt-5 text-sm">
              
              {/* Foto Profil Pengguna (Khusus Akun sampai dengan Proktor) */}
              {role !== 'student' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center space-x-4">
                  <div className="relative shrink-0">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Preview Foto"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500 shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[10px] font-bold mt-0.5">Foto</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="block text-slate-700 font-bold mb-1 text-xs">
                      Foto Profil Pengguna (Maks 2MB)
                    </label>
                    <div className="flex items-center space-x-2">
                      <label className="cursor-pointer px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs">
                        <Camera className="w-3.5 h-3.5" />
                        <span>{photoUrl ? 'Ganti Foto' : 'Pilih Foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Bintang Pratama"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                    Role Otoritas *
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={currentUser.role === 'proctor'}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-600"
                  >
                    <option value="student">Siswa CBT</option>
                    {currentUser.role === 'super_admin' && (
                      <option value="teacher">Pendidik / Guru Mata Pelajaran</option>
                    )}
                    {(currentUser.role === 'super_admin' || currentUser.role === 'assistant_admin') && (
                      <option value="proctor">Proktor Sekolah</option>
                    )}
                    {currentUser.role === 'super_admin' && (
                      <option value="assistant_admin">Asisten Admin</option>
                    )}
                    {currentUser.role === 'super_admin' && (
                      <option value="super_admin">Super Admin Pusat</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                    {role === 'student' ? 'NISN (No. Peserta) *' : 'Email / Username *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={role === 'student' ? 'Contoh: 3140421328' : 'nama@sasi.id'}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-mono text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Password Akun untuk Petugas / PIN untuk Siswa */}
              {role !== 'student' ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                    Kata Sandi Akun (Password) *
                  </label>
                  <input
                    type="text"
                    required
                    value={officerPassword}
                    onChange={(e) => setOfficerPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Digunakan untuk login petugas ke dalam sistem.</p>
                </div>
              ) : null}

              {/* Afiliasi Instansi Khusus Asisten Admin / Pengawas Sekolah */}
              {role === 'assistant_admin' && (
                <div className="bg-blue-50/80 p-4 rounded-2xl border border-blue-200 space-y-2.5 animate-fade-in">
                  <div className="flex items-center space-x-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>Asal Instansi / Kedinasan Pengawas *</span>
                  </div>
                  <select
                    value={assistantInstitutionType}
                    onChange={(e) => {
                      setAssistantInstitutionType(e.target.value);
                      if (e.target.value !== 'custom') {
                        setAssistantCustomInstitution(e.target.value);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 border border-blue-300 rounded-xl text-xs font-bold text-blue-950 bg-white focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Dinas Pendidikan (Pengawas Sekolah)">Dinas Pendidikan (Pengawas Sekolah)</option>
                    <option value="Pusat / Tim Teknis SASIPEDIA">Pusat / Tim Teknis SASIPEDIA</option>
                    <option value="Korwil Bidang Pendidikan Kecamatan">Korwil Bidang Pendidikan Kecamatan</option>
                    <option value="Tim Pengembang Kurikulum & Penelaah Soal">Tim Pengembang Kurikulum & Penelaah Soal</option>
                    <option value="custom">-- Tulis Nama Instansi / Wilayah Lainnya --</option>
                  </select>

                  {assistantInstitutionType === 'custom' && (
                    <input
                      type="text"
                      required
                      value={assistantCustomInstitution}
                      onChange={(e) => setAssistantCustomInstitution(e.target.value)}
                      placeholder="Contoh: Dinas Pendidikan Kab. Sumedang / Korwil Pamulihan"
                      className="w-full px-3.5 py-2 border border-blue-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-brand-500"
                    />
                  )}
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    Akun Pengawas berstatus otoritas independen lintas sekolah untuk membina pembuatan kisi-kisi dan menelaah bank butir soal guru.
                  </p>
                </div>
              )}

              {/* School Assignment untuk Siswa, Proktor, dan Guru */}
              {role !== 'super_admin' && role !== 'assistant_admin' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                    Asal Satuan Pendidikan (Sekolah) *
                  </label>
                  <select
                    value={schoolId}
                    onChange={(e) => {
                      setSchoolId(e.target.value);
                      const sObj = schools.find(sc => sc.id === e.target.value);
                      if (sObj) setAssignedLevel(sObj.level);
                    }}
                    disabled={currentUser.role === 'proctor' && !!currentUser.school_id}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-600"
                  >
                    {schools.filter(s => currentUser.role === 'proctor' && currentUser.school_id ? s.id === currentUser.school_id : true).map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.npsn} - {s.level})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Grade and PIN for Student */}
              {role === 'student' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider">
                          Kelas & Rombel Paralel *
                        </label>
                        <span className="text-[10px] font-bold text-brand-700 bg-brand-100 px-2 py-0.5 rounded-full">
                          {assignedLevel} • Fase {calculatePhase(assignedLevel, gradeClass)}
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={gradeClass}
                        onChange={(e) => setGradeClass(e.target.value.toUpperCase())}
                        placeholder="Contoh: 6-A, 6-B, 4-A"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-brand-500 uppercase"
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(assignedLevel === 'SMP'
                          ? ['7-A', '7-B', '7-C', '8-A', '8-B', '8-C', '9-A', '9-B', '9-C']
                          : ['1-A', '2-A', '3-A', '4-A', '5-A', '6-A', '6-B', '6-C']
                        ).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setGradeClass(r)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              gradeClass === r 
                                ? 'bg-brand-600 text-white border-brand-700 shadow-xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider">
                          PIN Cetak Ujian *
                        </label>
                        <span className="text-[10px] text-slate-500">Otomatis / Edit</span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={pinPassword}
                          onChange={(e) => setPinPassword(e.target.value.toUpperCase())}
                          placeholder="PIN"
                          className="w-full px-3.5 py-2 pr-10 border border-slate-300 rounded-xl font-mono font-black text-brand-700 bg-white tracking-widest uppercase focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => setPinPassword(generateStudentPin(assignedLevel, gradeClass))}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Generate / Acak PIN Baru"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                        PIN dibuat otomatis. Klik tombol putar untuk acak ulang, atau ketik manual sesuai kebutuhan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher Form Fields (Khusus Pendidik / Guru) */}
              {role === 'teacher' && (
                <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 p-4 sm:p-5 rounded-2xl border border-indigo-200 space-y-4">
                  <div className="flex items-center space-x-2 pb-2 border-b border-indigo-200/60">
                    <GraduationCap className="w-5 h-5 text-indigo-700" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                        Penugasan & Profil Guru / Pendidik
                      </h4>
                      <p className="text-[11px] text-indigo-700">
                        Atur peran sebagai Guru Kelas (Wali Kelas) atau Guru Mapel Khusus untuk sekolah ini
                      </p>
                    </div>
                  </div>

                  {/* Tipe Guru */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                      Tipe Penugasan Pendidik / Penulis *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherType('guru_kelas');
                          setTeacherSubjectSpecialty('Semua Mapel SD (Kecuali PJOK & PAI)');
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          teacherType === 'guru_kelas'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Guru Kelas / Wali
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherType('guru_mapel');
                          setTeacherSubjectSpecialty('Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)');
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          teacherType === 'guru_mapel'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Guru Mapel Khusus
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTeacherType('penulis_soal');
                          setTeacherSubjectSpecialty('Bahasa Indonesia');
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          teacherType === 'penulis_soal'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Penulis Naskah Soal
                      </button>
                    </div>
                  </div>

                  {/* Jika Penulis Soal Murni */}
                  {teacherType === 'penulis_soal' ? (
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
                      <div className="font-bold flex items-center space-x-1.5 text-emerald-800">
                        <PenTool className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Akun Khusus Penulis Naskah Soal (Mitra Eksternal / Ahli)</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Akun ini tidak memiliki kelas binaan atau akses koreksi nilai siswa sekolah. Dashboard akun akan secara otomatis fokus murni pada perakitan kisi-kisi dan naskah bank soal.
                      </p>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                          Mata Pelajaran yang Dituliskan
                        </label>
                        <input
                          type="text"
                          value={teacherSubjectSpecialty}
                          onChange={(e) => setTeacherSubjectSpecialty(e.target.value)}
                          placeholder="Contoh: Bahasa Indonesia, Matematika, IPA"
                          className="w-full px-3.5 py-1.5 border border-emerald-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-emerald-500 text-xs"
                        />
                      </div>
                    </div>
                  ) : teacherType === 'guru_kelas' ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider">
                          Kelas & Rombel yang Diampu (Wali Kelas) *
                        </label>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          Kelas {homeroomClass}
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={homeroomClass}
                        onChange={(e) => setHomeroomClass(e.target.value.toUpperCase())}
                        placeholder="Contoh: 1-A, 1-B, 6-A"
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 uppercase text-sm"
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(assignedLevel === 'SMP'
                          ? ['7-A', '7-B', '7-C', '8-A', '8-B', '8-C', '9-A', '9-B', '9-C']
                          : ['1-A', '1-B', '2-A', '2-B', '3-A', '3-B', '4-A', '4-B', '5-A', '5-B', '6-A', '6-B']
                        ).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setHomeroomClass(r)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                              homeroomClass === r 
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2">
                        💡 Guru Kelas bertugas memeriksa seluruh mata pelajaran di rombelnya (kecuali PJOK & PAI).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                          Mata Pelajaran yang Diampu *
                        </label>
                        <select
                          value={teacherSubjectSpecialty}
                          onChange={(e) => setTeacherSubjectSpecialty(e.target.value)}
                          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                          <option value="Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)">Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)</option>
                          <option value="Pendidikan Agama Islam dan Budi Pekerti">Pendidikan Agama Islam dan Budi Pekerti</option>
                          <option value="Pendidikan Agama Kristen dan Budi Pekerti">Pendidikan Agama Kristen dan Budi Pekerti</option>
                          <option value="Pendidikan Agama Katolik dan Budi Pekerti">Pendidikan Agama Katolik dan Budi Pekerti</option>
                          <option value="Bahasa Inggris">Bahasa Inggris</option>
                          <option value="Bahasa Daerah / Mulok">Bahasa Daerah / Mulok</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                          Rombel / Kelas yang Diajar
                        </label>
                        <input
                          type="text"
                          value={homeroomClass}
                          onChange={(e) => setHomeroomClass(e.target.value.toUpperCase())}
                          placeholder="Contoh: 1-A, 1-B, 2-A s.d. 6-B"
                          className="w-full px-3.5 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 uppercase text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Metadata Tambahan Guru */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-indigo-200/60">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                        NIP / NUPTK
                      </label>
                      <input
                        type="text"
                        value={teacherNip}
                        onChange={(e) => setTeacherNip(e.target.value)}
                        placeholder="Contoh: 19800101..."
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                        Jenis Kelamin
                      </label>
                      <select
                        value={teacherGender}
                        onChange={(e) => setTeacherGender(e.target.value as 'L' | 'P')}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1 text-[11px] uppercase tracking-wider">
                        Status Kepegawaian
                      </label>
                      <select
                        value={teacherEmploymentStatus}
                        onChange={(e) => setTeacherEmploymentStatus(e.target.value as any)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white"
                      >
                        <option value="PNS">PNS</option>
                        <option value="PPPK">PPPK</option>
                        <option value="GTT/Honorer">GTT / Honorer</option>
                        <option value="Guru Tetap Yayasan">Guru Tetap Yayasan</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-black rounded-xl shadow-md"
                >
                  {editingUser ? 'Perbarui Pengguna' : 'Simpan Pengguna'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL INTERAKTIF: RESET PASSWORD / PIN */}
      {showResetPasswordModal && targetResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-5">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {targetResetUser.role === 'student' ? 'Reset PIN Siswa' : 'Reset Kata Sandi Akun'}
                  </h3>
                  <p className="text-xs text-slate-500">Perbarui kredensial akses masuk secara instan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setTargetResetUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Summary Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center space-x-3">
              {targetResetUser.photo_url ? (
                <img
                  src={targetResetUser.photo_url}
                  alt={targetResetUser.full_name}
                  className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-black text-base shrink-0">
                  {targetResetUser.full_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-black text-slate-900 text-sm truncate">{targetResetUser.full_name}</div>
                <div className="text-xs text-slate-500 font-mono truncate">{targetResetUser.username}</div>
                <div className="text-[10px] font-bold text-brand-600 uppercase tracking-wider mt-0.5">
                  {targetResetUser.role === 'student' ? 'Siswa Peserta' : targetResetUser.role.replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Input & Randomize */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {targetResetUser.role === 'student' ? 'PIN Baru (4 Digit Angka)' : 'Kata Sandi Baru'}
                </label>
                <button
                  type="button"
                  onClick={handleRandomizePassword}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Acak Otomatis</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder={targetResetUser.role === 'student' ? 'Contoh: 4821' : 'Contoh: sandiBaru123'}
                  className="w-full px-4 py-3 border-2 border-slate-300 focus:border-brand-500 rounded-xl font-mono text-base font-black text-slate-900 tracking-wider focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                {targetResetUser.role === 'student'
                  ? 'PIN baru akan langsung dicetak pada kartu ujian peserta dan langsung aktif di login CBT.'
                  : 'Pengguna dapat langsung menggunakan kata sandi baru ini saat masuk di halaman login petugas.'}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setTargetResetUser(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveResetPassword}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
              >
                Terapkan & Simpan Sandi
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Impor Siswa dari Excel (.xlsx / .xls) */}
      {showImportModal && (
        <ImportExcelModal
          schoolLevel={currentUser.role === 'proctor' ? (currentUser.assigned_level || 'SD') : (selectedSchoolId !== 'ALL' ? (schools.find(s => s.id === selectedSchoolId)?.level || 'SD') : 'SD')}
          schoolId={currentUser.role === 'proctor' && currentUser.school_id ? currentUser.school_id : (selectedSchoolId !== 'ALL' ? selectedSchoolId : undefined)}
          schools={schools}
          onClose={() => setShowImportModal(false)}
          onImportComplete={(count, newStudents) => {
            setShowImportModal(false);
            if (newStudents && newStudents.length > 0) {
              setUsers(prev => {
                const userMap = new Map(prev.map(u => [u.username, u]));
                newStudents.forEach(s => userMap.set(s.username, s));
                const updated = Array.from(userMap.values());
                persistUsers(updated);
                return updated;
              });
            }
            notify(`Berhasil mengimpor ${count} data siswa dan tersimpan permanen di database Supabase!`);
          }}
        />
      )}

      {/* Modal Pusat Reset Data Super Admin */}
      {currentUser.role === 'super_admin' && (
        <ResetDataModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          schools={schools}
          onResetUsers={handleResetUsers}
          onResetBlueprintAndQuestions={handleResetBlueprintAndQuestions}
          onResetAllSystemData={handleResetAllSystemData}
        />
      )}

    </div>
  );
};

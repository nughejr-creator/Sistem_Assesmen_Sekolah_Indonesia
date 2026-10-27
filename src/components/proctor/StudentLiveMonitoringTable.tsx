import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserProfile, 
  StudentAttempt, 
  ExamSession, 
  School 
} from '../../types/database';
import { 
  MOCK_STUDENT_ATTEMPTS, 
  MOCK_EXAM_SESSION, 
  MOCK_USERS, 
  MOCK_SCHOOLS 
} from '../../lib/mockData';
import { 
  proctorResetStudentPassword, 
  proctorResetLoginStatus, 
  proctorForceSubmit,
  subscribeToExamMonitoring,
  supabase
} from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { ImportExcelModal } from './ImportExcelModal';
import { ExamCardPrintModal } from './ExamCardPrintModal';
import { EmergencyRecoveryModal } from './EmergencyRecoveryModal';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  Unlock, 
  Send, 
  Eye, 
  FileSpreadsheet, 
  Printer, 
  Timer, 
  Search,
  CheckCircle2,
  LayoutGrid,
  X,
  Filter,
  Archive,
  Calendar,
  ShieldAlert,
  UploadCloud
} from 'lucide-react';
import { isSessionArchived, getCleanSessionName } from '../../lib/archiveHelper';

interface StudentLiveMonitoringTableProps {
  proctorUser: UserProfile;
  school?: School;
}

export const StudentLiveMonitoringTable: React.FC<StudentLiveMonitoringTableProps> = ({ proctorUser, school: propSchool }) => {
  const school: School = useMemo(() => {
    if (propSchool) return propSchool;
    if (proctorUser.school) return proctorUser.school;
    if (proctorUser.school_id) {
      try {
        const cached = localStorage.getItem('sasi_schools_cache');
        if (cached) {
          const list = JSON.parse(cached);
          const found = list.find((s: any) => s.id === proctorUser.school_id);
          if (found) return found;
        }
      } catch (e) {}
      const mockFound = MOCK_SCHOOLS.find(s => s.id === proctorUser.school_id);
      if (mockFound) return mockFound;

      return {
        id: proctorUser.school_id,
        name: proctorUser.full_name || 'Sekolah Proktor',
        npsn: '',
        address: '',
        level: 'SD' as any,
        cluster_node: 'klaster-1'
      } as School;
    }
    return MOCK_SCHOOLS[0];
  }, [propSchool, proctorUser]);

  const [sessions, setSessions] = useState<ExamSession[]>(() => {
    if (!school?.id) return [];
    try {
      const cached = localStorage.getItem(`sasi_sessions_cache_${school.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
  const [proctorSessionTab, setProctorSessionTab] = useState<'active' | 'archived'>('active');

  const activeSessions = useMemo(() => {
    return sessions.filter(s => s.is_active && !isSessionArchived(s));
  }, [sessions]);

  const closedArchivedSessions = useMemo(() => {
    return sessions.filter(s => !s.is_active || isSessionArchived(s));
  }, [sessions]);

  const displayedSessions = proctorSessionTab === 'active' ? activeSessions : closedArchivedSessions;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'working' | 'completed' | 'unattempted'>('all');
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [students, setStudents] = useState<UserProfile[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_users_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const schStudents = parsed.filter((u: any) => u.role === 'student' && (!u.school_id || u.school_id === school.id));
          if (schStudents.length > 0) return schStudents;
        }
      }
    } catch (e) {}
    return MOCK_USERS.filter(u => u.role === 'student' && u.school_id === school.id);
  });

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [isReconcilingMaster, setIsReconcilingMaster] = useState(false);
  const [inspectCardStudent, setInspectCardStudent] = useState<UserProfile | null>(null);

  // Action alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Rekonsiliasi Nilai Ujian dari Shard Klaster ke Master Hub Pusat
  const handleReconcileToMaster = async () => {
    setIsReconcilingMaster(true);
    try {
      const schId = toValidUUID(school.id);
      const clusterClient = getSupabaseClientForSchool(school.id);

      const { data: shardAttempts, error: sErr } = await clusterClient
        .from('student_attempts')
        .select('*')
        .eq('school_id', schId)
        .eq('status', 'completed');

      if (sErr || !shardAttempts || shardAttempts.length === 0) {
        showNotification('Tidak ada data nilai ujian selesai di Shard Klaster yang perlu disinkronkan.');
        return;
      }

      const { data: masterAttempts } = await supabase
        .from('student_attempts')
        .select('id, status, final_score')
        .eq('school_id', schId)
        .eq('status', 'completed');

      const masterMap = new Map((masterAttempts || []).map((m: any) => [m.id, m]));

      const missingInMaster = shardAttempts.filter((sa: any) => {
        const m = masterMap.get(sa.id);
        return !m || m.status !== 'completed' || m.final_score !== sa.final_score;
      });

      if (missingInMaster.length === 0) {
        showNotification('✅ Seluruh nilai ujian siswa sudah 100% tersinkronisasi di Master Hub Pusat.');
        return;
      }

      const { error: upsertErr } = await supabase
        .from('student_attempts')
        .upsert(missingInMaster);

      if (upsertErr) {
        throw new Error(upsertErr.message);
      }

      showNotification(`✅ Berhasil merekonsiliasi ${missingInMaster.length} nilai ujian dari Klaster ke Master Hub!`);
      loadData();
    } catch (err: any) {
      console.error('[ReconcileMaster] Error:', err);
      showNotification(`⚠️ Gagal rekonsiliasi ke Master: ${err.message || 'Koneksi terganggu'}`);
    } finally {
      setIsReconcilingMaster(false);
    }
  };

  // Live Timer Clock untuk Countdown Real-time Sisa Waktu Sesi
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch real students, sessions, and attempts from Supabase Cloud on mount & periodic poll
  useEffect(() => {
    let isMounted = true;

    const fetchCloudProctorData = async () => {
      try {
        const clusterClient = getSupabaseClientForSchool(school.id);

        // 1. Fetch Students for this school (Query mandiri tanpa join lintas database)
        const { data: shardStudents, error: shardStdErr } = await clusterClient
          .from('user_profiles')
          .select('*')
          .eq('role', 'student')
          .order('full_name');

        let cloudStudents = (!shardStdErr && shardStudents && shardStudents.length > 0)
          ? shardStudents
          : null;

        if (!cloudStudents || cloudStudents.length === 0) {
          const { data: masterStudents } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('role', 'student')
            .order('full_name');
          cloudStudents = masterStudents;
        }

        if (cloudStudents && isMounted) {
          const matchedStudents = cloudStudents.filter(
            s => school.id && (s.school_id === school.id || s.school?.id === school.id)
          );
          setStudents(matchedStudents as UserProfile[]);
        }

        // 2. Fetch Sessions for this school dari Master
        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*), school:schools(*)')
          .order('created_at', { ascending: false });

        let finalSessionsList: ExamSession[] = [];
        if (cloudSessions && isMounted) {
          const matchedSessions = cloudSessions.filter(
            s => school.id && (s.school_id === school.id || s.school?.id === school.id)
          );
          finalSessionsList = matchedSessions as ExamSession[];
          setSessions(finalSessionsList);

          try {
            if (school.id) {
              localStorage.setItem(`sasi_sessions_cache_${school.id}`, JSON.stringify(finalSessionsList));
            }
          } catch (e) {}

          setSelectedSessionId(prev => {
            if (prev === 'all') return 'all';
            if (prev && finalSessionsList.some(s => s.id === prev)) return prev;
            return 'all';
          });
        } else if (isMounted) {
          setSessions([]);
        }

        // 3. Fetch Attempts dari Kluster Sekolah & Master (Hybrid Merge Aman & Resilien)
        let combinedAttempts: any[] = [];
        
        const { data: shardAttempts, error: shardAttErr } = await clusterClient
          .from('student_attempts')
          .select('*')
          .order('started_at', { ascending: false });

        if (!shardAttErr && shardAttempts && shardAttempts.length > 0) {
          combinedAttempts = [...shardAttempts];
        }

        // Ambil juga dari Master sebagai cadangan dual-sync
        const { data: masterAttempts } = await supabase
          .from('student_attempts')
          .select('*')
          .order('started_at', { ascending: false });

        if (masterAttempts && masterAttempts.length > 0) {
          const attMap = new Map<string, any>();
          // Muat master terlebih dahulu
          masterAttempts.forEach(m => attMap.set(m.id, m));
          // Timpa atau prioritaskan yang lebih baru / completed dari shard
          combinedAttempts.forEach(s => {
            const m = attMap.get(s.id);
            if (!m || s.status === 'completed' || (s.answered_count || 0) >= (m.answered_count || 0)) {
              attMap.set(s.id, s);
            }
          });
          combinedAttempts = Array.from(attMap.values());
        }

        if (combinedAttempts.length > 0) {
          combinedAttempts.sort((a, b) => {
            const timeA = new Date(a.submitted_at || a.started_at || 0).getTime();
            const timeB = new Date(b.submitted_at || b.started_at || 0).getTime();
            return timeB - timeA;
          });
        }

        if (isMounted) {
          if (combinedAttempts.length > 0) {
            const mappedAttempts = combinedAttempts.map((ca: any) => {
              const matchedSession = finalSessionsList.find((s: any) => s.id === ca.session_id);
              return {
                id: ca.id,
                student_id: ca.student_id,
                session_id: ca.session_id,
                session: matchedSession || ca.session,
                school_id: ca.school_id || school.id,
                started_at: ca.started_at,
                submitted_at: ca.submitted_at,
                status: ca.status || 'working',
                total_questions: Number(ca.total_questions) || 11,
                answered_count: Number(ca.answered_count) || (ca.status === 'completed' ? (Number(ca.total_questions) || 11) : 0),
                final_score: ca.final_score
              };
            });
            setAttempts(mappedAttempts);
          } else {
            setAttempts([]);
          }
        }
      } catch (err) {
        console.warn('Sync proctor data error:', err);
      }
    };

    fetchCloudProctorData();

    // Polling setiap 45 detik (Standar ANBK) untuk menjaga beban server database tetap di zona aman
    const pollInterval = setInterval(() => {
      fetchCloudProctorData();
    }, 45000);

    return () => { 
      isMounted = false; 
      clearInterval(pollInterval);
    };
  }, [school.id]);

  // Realtime subscription to student attempts & user_profiles from Supabase
  useEffect(() => {
    const clusterClient = getSupabaseClientForSchool(school.id);

    const handleAttemptChange = (payload: any) => {
      if (payload.new) {
        const row: any = payload.new;
        const matchedSession = (sessions || []).find((s: any) => s.id === row.session_id);
        const mapped: StudentAttempt = {
          id: row.id,
          student_id: row.student_id,
          session_id: row.session_id,
          session: matchedSession,
          school_id: row.school_id || school.id,
          started_at: row.started_at,
          submitted_at: row.submitted_at,
          status: row.status || 'working',
          total_questions: Number(row.total_questions) || 11,
          answered_count: Number(row.answered_count) || (row.status === 'completed' ? (Number(row.total_questions) || 11) : 0),
          final_score: row.final_score
        };
        setAttempts(prev => {
          const exists = prev.some(att => att.id === mapped.id || (att.student_id === mapped.student_id && att.session_id === mapped.session_id));
          if (exists) {
            return prev.map(att => (att.id === mapped.id || (att.student_id === mapped.student_id && att.session_id === mapped.session_id)) ? mapped : att);
          }
          return [mapped, ...prev];
        });
      }
    };

    const handleUserChange = (payload: any) => {
      if (payload.new) {
        const updatedUser: any = payload.new;
        setStudents(prev =>
          prev.map(s => s.id === updatedUser.id ? { ...s, ...updatedUser } : s)
        );
      }
    };

    const attemptsChannel = supabase
      .channel('proctor-live-attempts-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attempts' }, handleAttemptChange)
      .subscribe();

    const usersChannel = supabase
      .channel('proctor-live-users-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, handleUserChange)
      .subscribe();

    const sessionsChannel = supabase
      .channel('proctor-live-sessions-master')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_sessions' }, (payload: any) => {
        if (payload.new) {
          const row: any = payload.new;
          if (row.school_id && row.school_id !== school.id) {
            return;
          }
          setSessions(prev => {
            const exists = prev.some(s => s.id === row.id || s.token_code === row.token_code);
            if (exists) {
              return prev.map(s => (s.id === row.id || s.token_code === row.token_code) ? { ...s, ...row } : s);
            }
            if (row.school_id === school.id) {
              return [row, ...prev];
            }
            return prev;
          });
        }
      })
      .subscribe();

    let shardAttemptsChannel: any = null;
    let shardUsersChannel: any = null;

    if (clusterClient !== supabase) {
      shardAttemptsChannel = clusterClient
        .channel('proctor-live-attempts-shard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attempts' }, handleAttemptChange)
        .subscribe();

      shardUsersChannel = clusterClient
        .channel('proctor-live-users-shard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, handleUserChange)
        .subscribe();
    }

    return () => {
      supabase.removeChannel(attemptsChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(sessionsChannel);
      if (shardAttemptsChannel) clusterClient.removeChannel(shardAttemptsChannel);
      if (shardUsersChannel) clusterClient.removeChannel(shardUsersChannel);
    };
  }, [school.id, sessions]);

  // Helper presisi untuk mengekstrak nomor kelas dari string (contoh: "Kelas 6", "Kls 6", "6-A")
  const extractGradeNumber = (str?: string): string | null => {
    if (!str) return null;
    const clean = str.trim();

    // 1. Prioritas Utama: Eksplisit ada kata "Kelas X", "Kls X", "Kelas VI", "Kelas 6A", dsb
    const matchExplicit = clean.match(/\b(?:kelas|kls)\s*(?:ke-?)?\s*(1[0-2]|[1-9]|VI|IV|V|III|II|I)\b/i);
    if (matchExplicit) {
      const val = matchExplicit[1].toUpperCase();
      const romanMap: Record<string, string> = {
        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6',
        'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12'
      };
      return romanMap[val] || val;
    }

    // 2. Format pendek khusus field grade_class siswa (contoh: "6", "6-A", "6A", "VI", "VI-A")
    // Hanya dicocokkan jika diawali angka/romawi di awal string agar tidak salah mendeteksi kata umum (seperti Sesi, dll)
    const matchClassShort = clean.match(/^(?:kelas\s*)?(1[0-2]|[1-9]|VI|IV|V|III|II|I)(?:[-/\s]?[A-Za-z]|\b)/i);
    if (matchClassShort) {
      const val = matchClassShort[1].toUpperCase();
      const romanMap: Record<string, string> = {
        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6',
        'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12'
      };
      return romanMap[val] || val;
    }

    return null;
  };

  // Helper untuk menentukan tingkatan kelas dari sesi ujian
  const getSessionGrade = (sess: ExamSession): string | null => {
    // 1. Dari session_name (contoh: "Sesi Ujian - SAS Matematika Kelas 6 SD")
    const fromName = extractGradeNumber(sess.session_name);
    if (fromName) return fromName;

    // 2. Dari package.title (contoh: "Sumatif Akhir Semester (SAS) Matematika Kelas 6 SD")
    const fromPkg = extractGradeNumber(sess.package?.title);
    if (fromPkg) return fromPkg;

    // 3. Fallback Fase Kurikulum Merdeka (Fase C = Kelas 5/6, dst)
    if (sess.package?.phase) {
      const p = sess.package.phase.toUpperCase();
      if (p === 'A') return '1';
      if (p === 'B') return '4';
      if (p === 'C') return '6';
      if (p === 'D') return '7';
      if (p === 'E') return '10';
      if (p === 'F') return '11';
    }

    return null;
  };

  // Sesi yang sedang aktif dipilih
  const activeSession = sessions.find(s => s.id === selectedSessionId) || null;

  // Riwayat attempt sesuai sesi yang dipilih (mendukung multi-sekolah dengan token/paket yang sama)
  const sessionAttempts = React.useMemo(() => {
    if (selectedSessionId === 'all') {
      return attempts;
    }
    const curSess = sessions.find(s => s.id === selectedSessionId);
    if (!curSess) return [];

    return attempts.filter(a => {
      // 1. Cocok langsung berdasarkan session_id
      if (a.session_id === curSess.id) return true;

      // 2. Cocok jika relasi sesi attempt memiliki token_code atau package_id yang sama
      if (a.session) {
        if (a.session.token_code && a.session.token_code === curSess.token_code) return true;
        if (a.session.package_id && a.session.package_id === curSess.package_id) return true;
      }
      return false;
    });
  }, [attempts, selectedSessionId, sessions]);

  // Filter siswa berdasarkan sesi yang dipilih
  const sessionStudents = React.useMemo(() => {
    if (selectedSessionId === 'all' || !activeSession) {
      return students;
    }
    const sessionGrade = getSessionGrade(activeSession);

    return students.filter(student => {
      // 1. Cek apakah ada riwayat attempt di sesi ini
      if (sessionAttempts.some(a => a.student_id === student.id)) {
        return true;
      }
      // 2. Cek apakah kelas siswa cocok dengan kelas sesi
      const studentGrade = extractGradeNumber(student.grade_class);
      if (sessionGrade && studentGrade) {
        return sessionGrade === studentGrade;
      }
      // Jika nama sesi tidak menspesifikasikan kelas, tampilkan semua siswa sekolah
      return !sessionGrade;
    });
  }, [students, selectedSessionId, activeSession, sessionAttempts]);

  // Helper pencarian attempt siswa dengan prioritas: completed (paling mutakhir/terbaru) > working
  const getStudentAttempt = React.useCallback((studentId: string) => {
    const studentAtts = sessionAttempts
      .filter(a => a.student_id === studentId)
      .sort((a, b) => {
        const timeA = new Date(a.submitted_at || a.started_at || 0).getTime();
        const timeB = new Date(b.submitted_at || b.started_at || 0).getTime();
        return timeB - timeA; // Paling terbaru selalu di indeks 0
      });

    if (studentAtts.length === 0) return undefined;
    return studentAtts.find(a => a.status === 'completed') || studentAtts[0];
  }, [sessionAttempts]);

  // Siswa terfilter berdasarkan pencarian teks & tab status
  const filteredStudents = React.useMemo(() => {
    return sessionStudents.filter(student => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = student.full_name?.toLowerCase().includes(q);
        const matchUname = student.username?.toLowerCase().includes(q);
        const matchClass = student.grade_class?.toLowerCase().includes(q);
        if (!matchName && !matchUname && !matchClass) return false;
      }

      const studentAttempt = getStudentAttempt(student.id);
      const isCompleted = studentAttempt?.status === 'completed';
      const isWorking = (studentAttempt && studentAttempt.status === 'working') || (Boolean(student.is_logged_in) && !isCompleted);

      if (statusFilter === 'working' && !isWorking) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'unattempted' && (isWorking || isCompleted)) return false;

      return true;
    });
  }, [sessionStudents, getStudentAttempt, searchQuery, statusFilter]);

  // 1. One-Click Reset Password
  const handleResetPassword = async (studentId: string) => {
    const isSD = school.level === 'SD';
    const newPin = isSD 
      ? String(Math.floor(1000 + Math.random() * 9000))
      : Math.random().toString(36).substring(2, 8).toUpperCase();

    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, exam_card_password: newPin } : s)
    );

    setAttempts(prev =>
      prev.map(att => att.student_id === studentId && att.student ? {
        ...att,
        student: { ...att.student, exam_card_password: newPin }
      } : att)
    );

    try {
      const clusterClient = getSupabaseClientForSchool(school.id);
      await Promise.allSettled([
        proctorResetStudentPassword(studentId, newPin),
        clusterClient.from('user_profiles').update({ exam_card_password: newPin, updated_at: new Date().toISOString() }).eq('id', studentId)
      ]);
    } catch (e) {}

    showNotification(`PIN Password berhasil direset menjadi: ${newPin}`);
  };

  // 2. Reset Status Login (Lepas Kunci jika perangkat crash tanpa menghapus jawaban yang tersimpan di cloud)
  const handleResetLoginStatus = async (studentId: string) => {
    setStudents(prev =>
      prev.map(s => s.id === studentId ? { ...s, is_logged_in: false } : s)
    );

    try {
      const clusterClient = getSupabaseClientForSchool(school.id);
      await Promise.allSettled([
        supabase.from('user_profiles').update({ is_logged_in: false }).eq('id', studentId),
        clusterClient.from('user_profiles').update({ is_logged_in: false }).eq('id', studentId)
      ]);
    } catch (e) {}

    showNotification(`Kunci login siswa berhasil dilepas. Siswa dapat login kembali dari perangkat lain untuk melanjutkan ujian.`);
  };

  // 3. Force Submit dengan Penghitungan Skor Riil Murni dari Jawaban Asli Siswa
  const handleForceSubmit = async (attemptId: string) => {
    if (window.confirm('Apakah Anda yakin ingin memaksakan submit (kumpul jawaban) untuk siswa ini? Sesi pengerjaan siswa akan langsung ditutup dan dinilai proporsional berdasarkan jawaban yang telah tersimpan.')) {
      try {
        const clusterClient = getSupabaseClientForSchool(school.id);

        // 1. Ambil rekaman attempt dan jawaban asli siswa yang sudah tersimpan di database
        const { data: attemptRow } = await clusterClient
          .from('student_attempts')
          .select('*')
          .eq('id', attemptId)
          .maybeSingle();

        const { data: savedAnswers } = await clusterClient
          .from('student_answers')
          .select('*')
          .eq('attempt_id', attemptId);

        // 2. Hitung skor riil murni berdasarkan jawaban yang telah tersimpan
        const totalQ = Number(attemptRow?.total_questions) || 11;
        let earnedScore = 0;
        if (savedAnswers && savedAnswers.length > 0) {
          earnedScore = savedAnswers.reduce((sum: number, curr: any) => {
            return sum + (Number(curr.score_obtained) || 0);
          }, 0);
        }

        // Fallback evaluasi instan kunci jawaban jika score_obtained belum terisi sebelumnya
        if (earnedScore === 0 && savedAnswers && savedAnswers.length > 0) {
          try {
            const qIds = savedAnswers.map((a: any) => a.question_id).filter(Boolean);
            const { data: qData } = await supabase
              .from('question_bank')
              .select('id, question_type, weight, options:question_options(*)')
              .in('id', qIds);

            if (qData && qData.length > 0) {
              qData.forEach((q: any) => {
                const studentAns = savedAnswers.find((a: any) => a.question_id === q.id);
                if (studentAns && q.options) {
                  const correctOpt = q.options.find((o: any) => o.is_correct);
                  if (correctOpt && studentAns.selected_option_ids?.includes(correctOpt.id)) {
                    earnedScore += (q.weight || 1);
                  }
                }
              });
            }
          } catch (evalErr) {
            console.warn('Fallback question scoring warning:', evalErr);
          }
        }

        const realScore = totalQ > 0 ? Math.round((earnedScore / totalQ) * 100) : 0;
        const finalAnswered = savedAnswers?.length || Number(attemptRow?.answered_count) || 0;

        const updatePayload = {
          status: 'completed',
          submitted_at: new Date().toISOString(),
          final_score: realScore,
          answered_count: finalAnswered
        };

        // 3. Update state lokal instan
        setAttempts(prev =>
          prev.map(att => att.id === attemptId ? {
            ...att,
            ...updatePayload
          } : att)
        );

        // 4. Update data ke Shard & Master (dual-write) serta lepas status is_logged_in siswa
        const studentIdTarget = attemptRow?.student_id;
        await Promise.allSettled([
          clusterClient.from('student_attempts').update(updatePayload).eq('id', attemptId),
          supabase.from('student_attempts').update(updatePayload).eq('id', attemptId),
          studentIdTarget && clusterClient.from('user_profiles').update({ is_logged_in: false, updated_at: new Date().toISOString() }).eq('id', studentIdTarget),
          studentIdTarget && supabase.from('user_profiles').update({ is_logged_in: false, updated_at: new Date().toISOString() }).eq('id', studentIdTarget)
        ]);

        // 5. Broadcast instant WebSocket event ke layar siswa (Zero DB Load, transisi instan)
        const bcPayload = {
          id: attemptId,
          attempt_id: attemptId,
          student_id: studentIdTarget,
          status: 'completed',
          final_score: realScore
        };

        try {
          const shardBc = clusterClient.channel(`cbt-broadcast-${attemptId}`);
          shardBc.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              shardBc.send({
                type: 'broadcast',
                event: 'force-submit',
                payload: bcPayload
              });
            }
          });

          const masterBc = supabase.channel(`cbt-broadcast-${attemptId}`);
          masterBc.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              masterBc.send({
                type: 'broadcast',
                event: 'force-submit',
                payload: bcPayload
              });
            }
          });
        } catch (bcErr) {
          console.warn('Realtime broadcast dispatch warning:', bcErr);
        }

        showNotification(`Sesi ujian berhasil diselesaikan paksa (Force Submit). Skor Riil: ${realScore}/100 (${finalAnswered} dari ${totalQ} Soal Dijawab).`);
      } catch (err) {
        console.error('Force submit error:', err);
      }
    }
  };

  // KPI calculations
  const totalStudents = sessionStudents.length;
  const sedangMengerjakan = sessionStudents.filter(s => {
    const a = getStudentAttempt(s.id);
    return (a && a.status === 'working') || (Boolean(s.is_logged_in) && (!a || a.status !== 'completed'));
  }).length;
  const selesaiSubmit = sessionStudents.filter(s => {
    const a = getStudentAttempt(s.id);
    return a && a.status === 'completed';
  }).length;
  const belumLogin = Math.max(0, totalStudents - sedangMengerjakan - selesaiSubmit);

  // Perhitungan Real-time Countdown Sisa Waktu Sesi
  const sessionTimeState = (() => {
    if (sessions.length === 0) {
      return { isExpired: true, text: '---', subtext: 'Belum Ada Sesi Terjadwal' };
    }

    const targetSession = activeSession || (activeSessions.length > 0 ? activeSessions[0] : sessions[0]);

    if (!targetSession || !targetSession.is_active) {
      return { isExpired: true, text: 'SESI DITUTUP', subtext: 'Dinonaktifkan oleh Proktor' };
    }

    if (!targetSession.end_time) {
      const dur = targetSession.package?.duration_minutes || 60;
      return { isExpired: false, text: `${dur}:00`, subtext: `Alokasi ${dur} Menit/Siswa` };
    }

    const endDate = new Date(targetSession.end_time);
    const diffMs = endDate.getTime() - currentTime;

    if (diffMs <= 0) {
      return { isExpired: true, text: 'WAKTU HABIS', subtext: 'Sesi Ujian Berakhir' };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const padH = String(hours).padStart(2, '0');
    const padM = String(minutes).padStart(2, '0');
    const padS = String(seconds).padStart(2, '0');

    if (days > 0) {
      return {
        isExpired: false,
        text: `${days}h ${padH}:${padM}:${padS}`,
        subtext: `Tutup: ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} ${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')} WIB`
      };
    }

    return {
      isExpired: false,
      text: `${padH}:${padM}:${padS}`,
      subtext: `Berakhir pukul ${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')} WIB (Durasi: ${targetSession.package?.duration_minutes || 60}m)`
    };
  })();

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-slide-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. SESSION SWITCHER: Carousel / Tab Grid untuk Memilih Sesi Ujian */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 pb-2.5 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <span className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
              <LayoutGrid className="w-4 h-4" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Panel Sesi Ujian Sekolah
                </h2>

                {/* Tab Switcher: Sesi Aktif vs Ditutup / Arsip */}
                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setProctorSessionTab('active')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center space-x-1 ${
                      proctorSessionTab === 'active'
                        ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sesi Aktif ({activeSessions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProctorSessionTab('archived')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center space-x-1 ${
                      proctorSessionTab === 'archived'
                        ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Archive className="w-3 h-3 text-amber-600" />
                    <span>Ditutup / Arsip ({closedArchivedSessions.length})</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 mt-0.5">
                {proctorSessionTab === 'active'
                  ? 'Menampilkan sesi yang sedang dibuka dan dapat dikerjakan siswa saat ini.'
                  : 'Menampilkan riwayat sesi ujian yang telah ditutup atau diarsipkan oleh panitia/admin.'}
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200 self-start sm:self-auto shrink-0">
            {selectedSessionId === 'all' ? 'Mode: Tampilkan Seluruh Sesi' : `Mode: Terfokus pada 1 Sesi`}
          </span>
        </div>

        {/* Scrollable / Responsive Sesi Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
          {sessions.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">
                Belum ada sesi ujian yang dijadwalkan untuk sekolah ini
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Jadwal sesi ujian akan muncul secara otomatis setelah Super Admin menetapkan jadwal dan memilih sekolah ini.
              </p>
            </div>
          ) : (
            <>
              {/* Option: Semua Sesi */}
              <button
                type="button"
                onClick={() => setSelectedSessionId('all')}
                className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between ${
                  selectedSessionId === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    selectedSessionId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    Semua Sesi
                  </span>
                  <span className={`text-[10px] font-bold ${selectedSessionId === 'all' ? 'text-brand-300' : 'text-slate-500'}`}>
                    {students.length} Siswa Total
                  </span>
                </div>
                <div className="font-extrabold text-xs truncate">
                  Gabungan Seluruh Kelas
                </div>
                <div className={`text-[10px] mt-1 ${selectedSessionId === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Monitoring umum semua tingkatan
                </div>
              </button>

              {/* Cards Per Sesi */}
              {displayedSessions.map((sess) => {
                const isSelected = selectedSessionId === sess.id;
                const sessGrade = getSessionGrade(sess);
                const sessWorkingCount = attempts.filter(a => a.session_id === sess.id && a.status === 'working').length;
                const sessDoneCount = attempts.filter(a => a.session_id === sess.id && a.status === 'completed').length;
                const isArchived = isSessionArchived(sess);

                return (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => setSelectedSessionId(sess.id)}
                    className={`text-left p-3 rounded-xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                      isSelected
                        ? 'bg-brand-900 text-white border-brand-700 shadow-md ring-2 ring-brand-500/30'
                        : sess.is_active && !isArchived
                          ? 'bg-white hover:bg-brand-50/50 text-slate-800 border-slate-200 hover:border-brand-300'
                          : 'bg-slate-100/70 hover:bg-slate-200/60 text-slate-700 border-slate-200'
                    }`}
                  >
                    {/* Active indicator bar */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                    )}

                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        {sessGrade && (
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-amber-400 text-slate-950' : 'bg-brand-100 text-brand-800'
                          }`}>
                            Kelas {sessGrade}
                          </span>
                        )}
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-white/15 text-amber-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          Token: {sess.token_code}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {isArchived ? (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            Arsip
                          </span>
                        ) : !sess.is_active ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Ditutup
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sesi Sedang Aktif" />
                        )}
                      </div>
                    </div>

                    <div className="font-extrabold text-xs truncate" title={sess.session_name}>
                      {getCleanSessionName(sess.session_name)}
                    </div>

                    <div className={`text-[10px] mt-1.5 flex items-center justify-between font-medium ${
                      isSelected ? 'text-brand-200' : 'text-slate-500'
                    }`}>
                      <span>{sessWorkingCount} Aktif • {sessDoneCount} Selesai</span>
                      <span className="font-mono text-[9px]">{sess.package?.duration_minutes || 60}m</span>
                    </div>
                  </button>
                );
              })}

              {displayedSessions.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-600">
                    {proctorSessionTab === 'active' 
                      ? 'Tidak ada sesi ujian yang sedang aktif / berlangsung saat ini.' 
                      : 'Tidak ada sesi ujian yang berstatus ditutup atau diarsipkan.'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {proctorSessionTab === 'active'
                      ? 'Aktifkan sesi dari menu perakitan atau hubungi administrator untuk membuka token.'
                      : 'Sesi yang ditutup atau diarsipkan akan muncul di sini.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Top Bar: School & Session Token Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="bg-brand-500/30 text-brand-200 border border-brand-400/30 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
              Proktor Ruangan • {school.level}
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-300 font-medium">NPSN: {school.npsn}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">{school.name}</h1>
          <p className="text-xs text-amber-300 font-semibold mt-1 flex items-center space-x-1.5">
            <span>Fokus Sesi:</span>
            <span className="bg-white/10 px-2 py-0.5 rounded text-white font-bold">
              {sessions.length === 0 
                ? 'Tidak Ada Sesi Terjadwal' 
                : (activeSession ? getCleanSessionName(activeSession.session_name) : 'Semua Sesi Ujian Aktif')}
            </span>
          </p>
        </div>

        {/* Active Token & Countdown Widget */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          
          {/* Token Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3 text-center min-w-[130px]">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
              {activeSession ? 'Token Sesi Terpilih' : 'Token Ujian'}
            </div>
            <div className="text-2xl font-mono font-black tracking-widest text-amber-300 my-0.5">
              {sessions.length === 0 ? '---' : (activeSession ? activeSession.token_code : (activeSessions[0]?.token_code || sessions[0]?.token_code || '---'))}
            </div>
            <div className={`text-[10px] font-semibold flex items-center justify-center space-x-1 mt-0.5 ${sessionTimeState.isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sessionTimeState.isExpired ? (sessions.length === 0 ? 'bg-slate-400' : 'bg-rose-400') : 'bg-emerald-400 animate-ping'}`} />
              <span>{sessions.length === 0 ? 'Belum Terjadwal' : (sessionTimeState.isExpired ? 'Sesi Ditutup' : 'Sesi Dibuka')}</span>
            </div>
          </div>

          {/* Sisa Waktu Countdown Real-time */}
          <div className={`bg-white/10 backdrop-blur-md border ${sessionTimeState.isExpired ? 'border-rose-400/50 bg-rose-950/20' : 'border-white/20'} rounded-xl px-5 py-3 text-center min-w-[150px]`}>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300 flex items-center justify-center space-x-1">
              <Timer className={`w-3 h-3 ${sessionTimeState.isExpired ? 'text-rose-400' : 'text-sky-300'}`} />
              <span>Sisa Waktu Sesi</span>
            </div>
            <div className={`text-2xl font-mono font-black my-0.5 ${sessionTimeState.isExpired ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
              {sessionTimeState.text}
            </div>
            <div className="text-[10px] text-slate-300">
              {sessionTimeState.subtext}
            </div>
          </div>

          {/* Action Buttons: Import, Cetak, Darurat & Sync */}
          <div className="grid grid-cols-2 sm:flex sm:flex-col gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import (Excel)</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all border border-white/20"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu (PDF)</span>
            </button>

            <button
              onClick={() => setShowEmergencyModal(true)}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-rose-600/30"
              title="Unggah berkas darurat JSON jika komputer siswa sempat offline saat submit"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-200" />
              <span>Darurat Proktor</span>
            </button>

            <button
              onClick={handleReconcileToMaster}
              disabled={isReconcilingMaster}
              className="px-3 py-1.5 bg-sky-600/90 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md"
              title="Kirim ulang nilai siswa dari Shard Klaster ke Master Hub Pusat"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isReconcilingMaster ? 'animate-bounce' : ''}`} />
              <span>{isReconcilingMaster ? 'Menyinkronkan...' : 'Sinkron ke Master'}</span>
            </button>
          </div>

        </div>

      </div>

      {/* 4 KPI Cards Sekolah */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>{selectedSessionId === 'all' ? 'Total Siswa Terdaftar' : 'Siswa Sesi Terpilih'}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalStudents}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {activeSession ? `Target: ${activeSession.session_name}` : 'Seluruh kelas'}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-bold">
            <span>Belum Login</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-2">{belumLogin}</div>
          <div className="text-[11px] text-slate-400 mt-1">Belum memasukkan token</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-brand-700 text-xs font-bold">
            <span>Sedang Mengerjakan</span>
            <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-brand-700 mt-2">{sedangMengerjakan}</div>
          <div className="text-[11px] text-slate-400 mt-1">Koneksi aktif di arena CBT</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
            <span>Selesai Submit</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{selesaiSubmit}</div>
          <div className="text-[11px] text-slate-400 mt-1">Jawaban terkunci di server</div>
        </div>

      </div>

      {/* Tabel Live Monitoring Progres Siswa */}
      <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden">
        
        {/* Table Top Header & Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <span>Live Monitoring Progres Siswa (Supabase Realtime)</span>
                {activeSession && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-brand-100 text-brand-800 rounded-md">
                    {activeSession.session_name}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                Memantau status login dan progres jawaban soal tiap siswa secara langsung tanpa refresh halaman.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Kanal Realtime Terhubung</span>
            </div>
          </div>

          {/* Quick Search & Status Filter Pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
            
            {/* Quick Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama siswa, NISN, atau kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              <span className="text-[11px] font-bold text-slate-400 flex items-center mr-1">
                <Filter className="w-3 h-3 mr-1" /> Filter:
              </span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Semua ({sessionStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('working')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center space-x-1 ${
                  statusFilter === 'working'
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-brand-700 hover:bg-brand-50 border border-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                <span>Mengerjakan ({sedangMengerjakan})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors flex items-center space-x-1 ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                <span>Selesai ({selesaiSubmit})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unattempted')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  statusFilter === 'unattempted'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-700 hover:bg-amber-50 border border-slate-200'
                }`}
              >
                Belum Mulai ({belumLogin})
              </button>
            </div>

          </div>

        </div>

        {/* The Monitoring Table: Grid Bersekat Tegas & High-Density */}
        <div className="overflow-x-auto border-t-2 border-sky-300">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-sky-100 text-sky-950 font-black uppercase tracking-wider text-[11px] border-b-2 border-sky-300">
              <tr className="divide-x divide-sky-200">
                <th className="py-2.5 px-2 text-center w-12 bg-sky-200/80 text-sky-950 font-black">NO.</th>
                <th className="py-2.5 px-3 min-w-[200px]">NAMA SISWA & NISN</th>
                <th className="py-2.5 px-2 text-center w-24">KELAS</th>
                <th className="py-2.5 px-2 text-center w-28">STATUS SESI</th>
                <th className="py-2.5 px-3 min-w-[190px]">PROGRES JAWABAN SOAL</th>
                <th className="py-2.5 px-2 text-center w-20">MULAI</th>
                <th className="py-2.5 px-3 text-center w-40">3 TOMBOL DARURAT PROKTOR</th>
                <th className="py-2.5 px-2 text-center w-24">AKSI AKHIR</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium text-xs">
                    <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Tidak ada siswa yang sesuai filter</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchQuery ? `Hasil pencarian "${searchQuery}" nihil.` : 'Belum ada siswa pada sesi / status ini.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const attempt = getStudentAttempt(student.id);
                  const isCompleted = attempt?.status === 'completed';
                  const isWorking = (attempt && attempt.status === 'working') || (Boolean(student.is_logged_in) && !isCompleted);
                  const totalQ = attempt?.total_questions || activeSession?.package?.total_questions || 11;
                  const answeredQ = isCompleted ? totalQ : (attempt ? attempt.answered_count : 0);
                  const percent = Math.min(100, Math.round((answeredQ / totalQ) * 100));

                  return (
                    <tr 
                      key={student.id} 
                      className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors"
                    >
                      {/* 1. NOMOR URUT DINAMIS */}
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                        {idx + 1}
                      </td>
                      
                      {/* 2. Student Info */}
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900 text-xs leading-tight truncate max-w-[200px]" title={student.full_name}>
                          {student.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          NISN: {student.username}
                        </div>
                      </td>

                      {/* 3. Class */}
                      <td className="py-2 px-2 text-center font-semibold text-slate-700 whitespace-nowrap">
                        {student.grade_class?.startsWith('Kelas') ? student.grade_class : `Kelas ${student.grade_class}`}
                      </td>

                      {/* 4. Status Sesi */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Selesai ({attempt?.final_score ?? '-'})
                          </span>
                        ) : isWorking ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-brand-100 text-brand-800 border border-brand-200 animate-pulse">
                            Mengerjakan
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                            Belum Mulai
                          </span>
                        )}
                      </td>

                      {/* 5. Progress Bar Soal Terjawab Real-time */}
                      <td className="py-2 px-3">
                        {isCompleted ? (
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700">
                              <span className="text-emerald-700">100% Selesai</span>
                              <span className="text-emerald-700 font-mono">Skor: {attempt?.final_score ?? '-'}</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                              <div className="h-full bg-emerald-500 w-full" />
                            </div>
                          </div>
                        ) : isWorking ? (
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700">
                              <span>{answeredQ}/{totalQ} Soal</span>
                              <span className="text-brand-700">{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                              <div
                                className="h-full transition-all duration-500 bg-brand-600"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Menunggu login siswa</span>
                        )}
                      </td>

                      {/* 6. Start Time */}
                      <td className="py-2 px-2 text-center text-[11px] text-slate-500 font-mono whitespace-nowrap">
                        {attempt?.started_at ? new Date(attempt.started_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>

                      {/* 7. 3 Tombol Darurat Saat Ujian */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          {/* 1. Lihat Kartu / Password */}
                          <button
                            type="button"
                            onClick={() => setInspectCardStudent(student)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors"
                            title="1. Lihat Kartu & PIN Password"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. One-Click Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(student.id)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold border border-amber-300 flex items-center space-x-0.5 transition-colors"
                            title="2. One-Click Reset Password (PIN Baru)"
                          >
                            <Key className="w-3 h-3 text-amber-600" />
                            <span>Reset PIN</span>
                          </button>

                          {/* 3. Reset Status Login (Release lock) */}
                          <button
                            type="button"
                            onClick={() => handleResetLoginStatus(student.id)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-[10px] font-bold border border-blue-300 flex items-center space-x-0.5 transition-colors"
                            title="3. Reset Status Login (Buka kunci sesi hang/mati)"
                          >
                            <Unlock className="w-3 h-3 text-blue-600" />
                            <span>Lepas</span>
                          </button>
                        </div>
                      </td>

                      {/* 8. Force Submit Button */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {attempt && attempt.status === 'working' ? (
                          <button
                            type="button"
                            onClick={() => handleForceSubmit(attempt.id)}
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-md border border-rose-300 text-[10px] transition-colors"
                            title="Paksa Kumpul Ujian"
                          >
                            Submit
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Inspect Single Student Card Modal */}
      {inspectCardStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">Kredensial Login Siswa</h4>
            <p className="text-xs text-slate-500 mb-4">{inspectCardStudent.full_name}</p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">NISN / No Peserta:</span>
                <span className="font-mono font-bold text-slate-900">{inspectCardStudent.username}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Email Masking Supabase:</span>
                <code className="text-[11px] text-brand-700 font-mono">{inspectCardStudent.username}@siswa.sasi.id</code>
              </div>

              <div className="p-2.5 bg-brand-50 border border-brand-200 rounded-lg">
                <span className="text-brand-800 block text-[10px] uppercase font-bold">PIN Password Cetak:</span>
                <span className="text-xl font-mono font-black text-brand-900 tracking-wider">
                  {inspectCardStudent.exam_card_password}
                </span>
                <span className="text-[10px] text-brand-600 block mt-0.5">
                  (Khusus SD Kelas 1-4: 4 digit angka mudah)
                </span>
              </div>
            </div>

            <button
              onClick={() => setInspectCardStudent(null)}
              className="mt-4 w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showImportModal && (
        <ImportExcelModal
          schoolLevel={school.level}
          schoolId={school.id}
          onClose={() => setShowImportModal(false)}
          onImportComplete={(count, newStudents) => {
            setShowImportModal(false);
            if (newStudents && newStudents.length > 0) {
              setStudents(prev => {
                const map = new Map(prev.map(s => [s.username, s]));
                newStudents.forEach(ns => {
                  map.set(ns.username, { ...ns, school });
                });
                return Array.from(map.values());
              });
              showNotification(`Berhasil mengimpor ${count} akun siswa ${school.name} beserta PIN cetak unik!`);
            } else {
              showNotification(`Berhasil memproses ${count} data siswa.`);
            }
          }}
        />
      )}

      {showPrintModal && (
        <ExamCardPrintModal
          students={sessionStudents}
          school={school}
          sessionName={activeSession ? activeSession.session_name : 'Semua Sesi Ujian'}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Emergency Recovery Modal */}
      {showEmergencyModal && (
        <EmergencyRecoveryModal
          school={school}
          onClose={() => setShowEmergencyModal(false)}
          onRecoverySuccess={(name, score) => {
            showNotification(`✅ Nilai siswa ${name} (${score}) berhasil dipulihkan ke Shard & Master!`);
            loadData();
          }}
        />
      )}

    </div>
  );
};

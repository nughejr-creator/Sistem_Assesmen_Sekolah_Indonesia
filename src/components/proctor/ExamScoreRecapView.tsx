import React, { useState, useEffect, useMemo } from 'react';
import { School, UserProfile, ExamSession, StudentAttempt, QuestionBankItem } from '../../types/database';
import { MOCK_USERS, MOCK_EXAM_SESSION, MOCK_QUESTION_BANK } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { toValidUUID } from '../../lib/syncHelper';
import { StudentAnswerReviewModal } from './StudentAnswerReviewModal';
import { StudentTranscriptModal, SubjectScoreItem } from './StudentTranscriptModal';
import {
  BarChart3,
  Printer,
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  Percent,
  Sparkles,
  Eye,
  Check,
  UploadCloud,
  RefreshCw,
  FileText,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface ExamScoreRecapViewProps {
  school: School;
  defaultPrintMode?: boolean;
}

export interface SubjectColumn {
  id: string;
  name: string;
  code: string;
}

export interface PivotedStudentRow {
  no: number;
  id: string;
  name: string;
  nisn: string;
  grade_class: string;
  grade_level: string;
  rombel: string;
  nilai_mapel: Record<string, number | null>;
  total_skor: number;
  rata_rata: number;
  completed_count: number;
  isPassed: boolean;
  status: 'completed' | 'working' | 'unattempted';
  attempts_by_session: Record<string, StudentAttempt>;
}

export const ExamScoreRecapView: React.FC<ExamScoreRecapViewProps> = ({
  school,
  defaultPrintMode = false
}) => {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    try {
      return localStorage.getItem('sasi_selected_recap_session') || 'all';
    } catch (e) {
      return 'all';
    }
  });

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<StudentAttempt[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_attempts_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [kktpThreshold, setKktpThreshold] = useState<number>(75);

  // Filter Tingkat Kelas & Rombel
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [selectedRombelFilter, setSelectedRombelFilter] = useState<string>('all');

  // Sortir Nilai
  const [sortBy, setSortBy] = useState<'avg_desc' | 'avg_asc' | 'name_asc' | 'name_desc' | 'nisn_asc'>('avg_desc');

  // State Review Jawaban Siswa
  const [selectedStudentForReview, setSelectedStudentForReview] = useState<UserProfile | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualRefreshCount, setManualRefreshCount] = useState(0);
  const [reconcileToast, setReconcileToast] = useState<string | null>(null);

  // State Modal Transkrip Siswa Perorangan
  const [selectedStudentForTranscript, setSelectedStudentForTranscript] = useState<UserProfile | null>(null);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);

  // Rekonsiliasi Nilai Ujian dari Shard Klaster ke Master Hub
  const handleReconcileToMaster = async () => {
    setIsReconciling(true);
    try {
      const schId = toValidUUID(school.id);
      const clusterClient = getSupabaseClientForSchool(school.id);

      const { data: shardAttempts, error: sErr } = await clusterClient
        .from('student_attempts')
        .select('*')
        .eq('school_id', schId)
        .eq('status', 'completed');

      if (sErr || !shardAttempts || shardAttempts.length === 0) {
        setReconcileToast('Tidak ada data nilai ujian di Shard Klaster yang perlu disinkronkan.');
        setTimeout(() => setReconcileToast(null), 3500);
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
        setReconcileToast('✅ Seluruh nilai ujian sudah 100% sinkron antara Klaster dan Master Hub.');
        setTimeout(() => setReconcileToast(null), 3500);
        return;
      }

      const { error: upsertErr } = await supabase
        .from('student_attempts')
        .upsert(missingInMaster);

      if (upsertErr) throw upsertErr;

      setReconcileToast(`✅ Sukses merekonsiliasi ${missingInMaster.length} nilai ujian ke Master Hub Pusat!`);
      setTimeout(() => setReconcileToast(null), 3500);
    } catch (err: any) {
      setReconcileToast(`⚠️ Gagal merekonsiliasi nilai: ${err.message || 'Koneksi terganggu'}`);
      setTimeout(() => setReconcileToast(null), 3500);
    } finally {
      setIsReconciling(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      setIsRefreshing(true);
      try {
        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*, subject:subjects(*))')
          .order('created_at', { ascending: false });

        if (cloudSessions && isMounted) {
          const matched = cloudSessions.filter(s => school.id && s.school_id === school.id);
          setSessions(matched as ExamSession[]);
        }

        const { data: cloudStudents } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'student')
          .order('full_name');

        if (cloudStudents && isMounted) {
          const matchedStudents = cloudStudents.filter(s => school.id && s.school_id === school.id);
          setStudents(matchedStudents);
        } else if (isMounted) {
          setStudents([]);
        }

        const clusterClient = getSupabaseClientForSchool(school.id);
        let combinedAttempts: any[] = [];

        const { data: shardAttempts, error: shardAttErr } = await clusterClient
          .from('student_attempts')
          .select('*');

        if (!shardAttErr && shardAttempts && shardAttempts.length > 0) {
          combinedAttempts = [...shardAttempts];
        }

        const { data: cloudAttempts } = await supabase
          .from('student_attempts')
          .select('*');

        if (cloudAttempts && cloudAttempts.length > 0) {
          const map = new Map<string, any>();
          cloudAttempts.forEach(m => map.set(m.id, m));
          combinedAttempts.forEach(s => {
            const m = map.get(s.id);
            if (!m || s.status === 'completed' || (s.answered_count || 0) >= (m.answered_count || 0)) {
              map.set(s.id, s);
            }
          });
          combinedAttempts = Array.from(map.values());
        }

        if (combinedAttempts.length > 0 && isMounted) {
          combinedAttempts.sort((a, b) => {
            const timeA = new Date(a.submitted_at || a.started_at || 0).getTime();
            const timeB = new Date(b.submitted_at || b.started_at || 0).getTime();
            return timeB - timeA;
          });

          const mappedAttempts = combinedAttempts.map(ca => {
            const matchedSession = (cloudSessions || []).find((s: any) => s.id === ca.session_id);
            return {
              ...ca,
              session: matchedSession || ca.session
            };
          });
          setAttempts(mappedAttempts as StudentAttempt[]);
          try {
            localStorage.setItem('sasi_attempts_cache', JSON.stringify(mappedAttempts));
          } catch (e) {}
        }

        const { data: cloudQuestions } = await supabase
          .from('question_bank')
          .select('*, options:question_options(*)')
          .order('created_at', { ascending: true });

        if (cloudQuestions && cloudQuestions.length > 0 && isMounted) {
          setQuestions(cloudQuestions as QuestionBankItem[]);
        } else if (isMounted) {
          setQuestions(MOCK_QUESTION_BANK);
        }
      } catch (e) {
        if (isMounted) setQuestions(MOCK_QUESTION_BANK);
      } finally {
        if (isMounted) setIsRefreshing(false);
      }
    };

    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [school.id, manualRefreshCount]);

  // Helper presisi mengekstrak nomor tingkatan kelas
  const extractGradeNumber = (str?: string): string => {
    if (!str) return '1';
    const clean = str.trim();
    const matchExplicit = clean.match(/\b(?:kelas|kls)\s*(?:ke-?)?\s*(1[0-2]|[1-9]|VI|IV|V|III|II|I)\b/i);
    if (matchExplicit) {
      const val = matchExplicit[1].toUpperCase();
      const romanMap: Record<string, string> = {
        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6',
        'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12'
      };
      return romanMap[val] || val;
    }
    const matchClassShort = clean.match(/^(?:kelas\s*)?(1[0-2]|[1-9]|VI|IV|V|III|II|I)(?:[-/\s]?[A-Za-z]|\b)/i);
    if (matchClassShort) {
      const val = matchClassShort[1].toUpperCase();
      const romanMap: Record<string, string> = {
        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6',
        'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12'
      };
      return romanMap[val] || val;
    }
    return '1';
  };

  // Helper ekstrak rombel (misal "4-A" -> "A")
  const extractRombel = (str?: string): string => {
    if (!str) return 'A';
    const clean = str.trim();
    const match = clean.match(/[-/\s]([A-Za-z])$/);
    if (match) return match[1].toUpperCase();
    const matchSuffix = clean.match(/([A-Za-z])$/);
    if (matchSuffix) return matchSuffix[1].toUpperCase();
    return 'A';
  };

  // Ekstrak Informasi Mata Pelajaran dari Sesi Ujian
  const extractSubjectFromSession = (sess: ExamSession): SubjectColumn => {
    const pkgSub = sess.package?.subject;
    if (pkgSub && pkgSub.name) {
      const rawCode = pkgSub.code || pkgSub.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const cleanCode = rawCode.split('-')[0] || rawCode;
      return {
        id: pkgSub.id || cleanCode,
        name: pkgSub.name,
        code: cleanCode
      };
    }

    const title = sess.package?.title || sess.session_name || 'Mata Pelajaran';
    if (/matematika/i.test(title)) return { id: 'MAT', name: 'Matematika', code: 'MAT' };
    if (/bahasa\s*indonesia/i.test(title)) return { id: 'BIN', name: 'Bahasa Indonesia', code: 'BIN' };
    if (/bahasa\s*inggris/i.test(title)) return { id: 'BIG', name: 'Bahasa Inggris', code: 'BIG' };
    if (/ipas|ipa|sains/i.test(title)) return { id: 'IPAS', name: 'IPAS', code: 'IPAS' };
    if (/ips/i.test(title)) return { id: 'IPS', name: 'IPS', code: 'IPS' };
    if (/ppkn|pancasila/i.test(title)) return { id: 'PKN', name: 'Pendidikan Pancasila', code: 'PKN' };
    if (/pjok|jasmani|penjas/i.test(title)) return { id: 'PJOK', name: 'PJOK', code: 'PJK' };
    if (/agama/i.test(title)) return { id: 'PAB', name: 'Pendidikan Agama', code: 'PAB' };
    if (/seni/i.test(title)) return { id: 'SBD', name: 'Seni Budaya', code: 'SBD' };

    const clean = title.replace(/\[.*?\]/g, '').replace(/Sesi\s*Ujian\s*-\s*/i, '').trim();
    const name = clean.length > 25 ? clean.substring(0, 22) + '...' : clean;
    const code = clean.substring(0, 4).toUpperCase();
    return {
      id: sess.package?.subject_id || code,
      name,
      code
    };
  };

  // Sesi aktif saat ini
  const isCombinedMode = selectedSessionId === 'all';
  const activeSession = isCombinedMode ? null : (sessions.find(s => s.id === selectedSessionId) || sessions[0] || null);

  // 1. Koleksi Kolom Mata Pelajaran Unik (Dinamis untuk Header Th)
  const subjectColumns: SubjectColumn[] = useMemo(() => {
    const map = new Map<string, SubjectColumn>();

    if (!isCombinedMode && activeSession) {
      const s = extractSubjectFromSession(activeSession);
      map.set(s.id, s);
      return Array.from(map.values());
    }

    sessions.forEach(sess => {
      const s = extractSubjectFromSession(sess);
      if (!map.has(s.id)) {
        map.set(s.id, s);
      }
    });

    if (map.size === 0) {
      // Default fallback
      return [
        { id: 'MAT', name: 'Matematika', code: 'MAT' },
        { id: 'BIN', name: 'Bahasa Indonesia', code: 'BIN' },
        { id: 'IPAS', name: 'IPAS', code: 'IPAS' },
        { id: 'PKN', name: 'P. Pancasila', code: 'PKN' },
      ];
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions, activeSession, isCombinedMode]);

  // Peta Sesi ID ke Subject ID
  const sessionIdToSubjectMap = useMemo(() => {
    const map = new Map<string, SubjectColumn>();
    sessions.forEach(sess => {
      map.set(sess.id, extractSubjectFromSession(sess));
    });
    return map;
  }, [sessions]);

  // Daftar opsi kelas & rombel unik untuk filter
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    students.forEach(st => {
      const gr = extractGradeNumber(st.grade_class);
      if (gr) set.add(gr);
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [students]);

  const availableRombels = useMemo(() => {
    const set = new Set<string>();
    students.forEach(st => {
      const r = extractRombel(st.grade_class);
      if (r) set.add(r);
    });
    return Array.from(set).sort();
  }, [students]);

  // 2. Transformasi Data Pivot: Mengelompokkan riwayat pengerjaan siswa per unik student_id
  const pivotedRows: PivotedStudentRow[] = useMemo(() => {
    return students.map((st, idx) => {
      const studentAttempts = attempts.filter(a => a.student_id === st.id);

      const nilaiMapel: Record<string, number | null> = {};
      const attemptsBySession: Record<string, StudentAttempt> = {};

      // Inisialisasi placeholder null untuk seluruh mapel
      subjectColumns.forEach(sc => {
        nilaiMapel[sc.id] = null;
      });

      // Hubungkan tiap attempt dengan kolom mapel yang sesuai
      studentAttempts.forEach(att => {
        let subj = sessionIdToSubjectMap.get(att.session_id);
        if (!subj && att.session) {
          subj = extractSubjectFromSession(att.session);
        }

        const targetSubjectId = subj ? subj.id : null;
        if (targetSubjectId && nilaiMapel[targetSubjectId] !== undefined) {
          const score = (att.final_score !== null && att.final_score !== undefined)
            ? Number(att.final_score)
            : null;

          // Jika ada remedial / pengulangan sesi, ambil skor tertinggi siswa
          const existing = nilaiMapel[targetSubjectId];
          if (existing === null || existing === undefined) {
            nilaiMapel[targetSubjectId] = score;
            attemptsBySession[targetSubjectId] = att;
          } else if (score !== null && score > existing) {
            nilaiMapel[targetSubjectId] = score;
            attemptsBySession[targetSubjectId] = att;
          }
        }
      });

      // Jika dalam mode per-sesi tunggal, hanya evaluasi sesi tersebut
      if (!isCombinedMode && activeSession) {
        const activeSubj = extractSubjectFromSession(activeSession);
        const specificAttempt = studentAttempts.find(a => 
          a.session_id === activeSession.id || 
          (a.session?.token_code && activeSession.token_code && a.session.token_code === activeSession.token_code)
        );
        nilaiMapel[activeSubj.id] = (specificAttempt && specificAttempt.final_score !== null && specificAttempt.final_score !== undefined)
          ? Number(specificAttempt.final_score)
          : null;
        if (specificAttempt) {
          attemptsBySession[activeSubj.id] = specificAttempt;
        }
      }

      // Hitung Total Skor dan Rata-rata Nilai Siswa
      const validMapelScores = Object.values(nilaiMapel).filter((v): v is number => v !== null && v !== undefined);
      const totalSkor = validMapelScores.reduce((acc, curr) => acc + curr, 0);
      const rataRata = validMapelScores.length > 0 
        ? Math.round((totalSkor / validMapelScores.length) * 10) / 10 
        : 0;

      const gradeNum = extractGradeNumber(st.grade_class);
      const rombel = extractRombel(st.grade_class);

      let overallStatus: 'completed' | 'working' | 'unattempted' = 'unattempted';
      if (studentAttempts.some(a => a.status === 'completed')) {
        overallStatus = 'completed';
      } else if (studentAttempts.some(a => a.status === 'working')) {
        overallStatus = 'working';
      }

      return {
        no: idx + 1,
        id: st.id,
        name: st.full_name,
        nisn: st.username,
        grade_class: st.grade_class || `Kelas ${gradeNum}-${rombel}`,
        grade_level: gradeNum,
        rombel: rombel,
        nilai_mapel: nilaiMapel,
        total_skor: totalSkor,
        rata_rata: rataRata,
        completed_count: validMapelScores.length,
        isPassed: rataRata >= kktpThreshold,
        status: overallStatus,
        attempts_by_session: attemptsBySession
      };
    });
  }, [students, attempts, subjectColumns, sessionIdToSubjectMap, isCombinedMode, activeSession, kktpThreshold]);

  // Filter Data (Pencarian, Kelas, Rombel)
  const filteredAndSortedRows = useMemo(() => {
    let result = pivotedRows.filter(row => {
      // 1. Filter Pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = row.name.toLowerCase().includes(q);
        const matchNisn = row.nisn.toLowerCase().includes(q);
        const matchClass = row.grade_class.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchClass) return false;
      }

      // 2. Filter Tingkat Kelas
      if (selectedGradeFilter !== 'all') {
        if (row.grade_level !== selectedGradeFilter) return false;
      }

      // 3. Filter Rombel
      if (selectedRombelFilter !== 'all') {
        if (row.rombel !== selectedRombelFilter) return false;
      }

      return true;
    });

    // Urutkan (Sorting)
    result.sort((a, b) => {
      switch (sortBy) {
        case 'avg_desc':
          return b.rata_rata - a.rata_rata || a.name.localeCompare(b.name);
        case 'avg_asc':
          return a.rata_rata - b.rata_rata || a.name.localeCompare(b.name);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'nisn_asc':
          return a.nisn.localeCompare(b.nisn);
        default:
          return 0;
      }
    });

    // Re-index penomoran
    return result.map((r, i) => ({ ...r, no: i + 1 }));
  }, [pivotedRows, searchQuery, selectedGradeFilter, selectedRombelFilter, sortBy]);

  // 3. Statistik Agregasi Kolom Leger (Rata-rata, Tertinggi, Terendah per Kolom Mapel)
  const columnAggregations = useMemo(() => {
    const agg: Record<string, { avg: number; max: number; min: number; count: number; passedCount: number }> = {};

    subjectColumns.forEach(sc => {
      const scores = filteredAndSortedRows
        .map(r => r.nilai_mapel[sc.id])
        .filter((v): v is number => v !== null && v !== undefined);

      if (scores.length > 0) {
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = Math.round((sum / scores.length) * 10) / 10;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const passedCount = scores.filter(s => s >= kktpThreshold).length;
        agg[sc.id] = { avg, max, min, count: scores.length, passedCount };
      } else {
        agg[sc.id] = { avg: 0, max: 0, min: 0, count: 0, passedCount: 0 };
      }
    });

    // Agregasi untuk kolom Rata-rata Keseluruhan Siswa
    const validStudentAvgs = filteredAndSortedRows
      .map(r => r.rata_rata)
      .filter(v => v > 0);

    const overallClassAvg = validStudentAvgs.length > 0
      ? Math.round((validStudentAvgs.reduce((a, b) => a + b, 0) / validStudentAvgs.length) * 10) / 10
      : 0;

    const overallMaxAvg = validStudentAvgs.length > 0 ? Math.max(...validStudentAvgs) : 0;
    const overallMinAvg = validStudentAvgs.length > 0 ? Math.min(...validStudentAvgs) : 0;
    const totalPassedStudents = filteredAndSortedRows.filter(r => r.isPassed && r.completed_count > 0).length;

    return {
      bySubject: agg,
      overallClassAvg,
      overallMaxAvg,
      overallMinAvg,
      totalPassedStudents,
      completedStudentsCount: validStudentAvgs.length
    };
  }, [subjectColumns, filteredAndSortedRows, kktpThreshold]);

  // Ekspor Excel (CSV Matriks Leger Resmi)
  const exportToMatrixCSV = () => {
    const headerCols = ['No', 'NISN', 'Nama Siswa', 'Kelas'];
    subjectColumns.forEach(sc => {
      headerCols.push(`"${sc.name} (${sc.code})"`);
    });
    headerCols.push('Total Skor', 'Rata-rata', 'Status KKTP');

    const csvRows = [headerCols.join(',')];

    // Baris Siswa
    filteredAndSortedRows.forEach(row => {
      const studentCols = [
        row.no,
        `"${row.nisn}"`,
        `"${row.name}"`,
        `"${row.grade_class}"`
      ];

      subjectColumns.forEach(sc => {
        const score = row.nilai_mapel[sc.id];
        studentCols.push(score !== null ? String(score) : '"-"');
      });

      studentCols.push(
        row.total_skor > 0 ? String(row.total_skor) : '"-"',
        row.rata_rata > 0 ? String(row.rata_rata) : '"-"',
        `"${row.isPassed && row.completed_count > 0 ? 'Tuntas' : 'Belum Tuntas'}"`
      );

      csvRows.push(studentCols.join(','));
    });

    // Baris Agregasi: Rata-rata Kelas
    const avgCols = ['""', '""', '"RATA-RATA KELAS"', '""'];
    subjectColumns.forEach(sc => {
      const val = columnAggregations.bySubject[sc.id]?.avg || 0;
      avgCols.push(val > 0 ? String(val) : '"-"');
    });
    avgCols.push('""', String(columnAggregations.overallClassAvg), '""');
    csvRows.push(avgCols.join(','));

    // Baris Agregasi: Nilai Tertinggi
    const maxCols = ['""', '""', '"NILAI TERTINGGI"', '""'];
    subjectColumns.forEach(sc => {
      const val = columnAggregations.bySubject[sc.id]?.max || 0;
      maxCols.push(val > 0 ? String(val) : '"-"');
    });
    maxCols.push('""', String(columnAggregations.overallMaxAvg), '""');
    csvRows.push(maxCols.join(','));

    // Baris Agregasi: Nilai Terendah
    const minCols = ['""', '""', '"NILAI TERENDAH"', '""'];
    subjectColumns.forEach(sc => {
      const val = columnAggregations.bySubject[sc.id]?.min || 0;
      minCols.push(val > 0 ? String(val) : '"-"');
    });
    minCols.push('""', String(columnAggregations.overallMinAvg), '""');
    csvRows.push(minCols.join(','));

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sessionLabel = activeSession ? activeSession.session_name.replace(/\s+/g, '_') : 'Rekap_Gabungan_Semua_Mapel';
    link.setAttribute('download', `Leger_Nilai_${sessionLabel}_${school.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic CSS Print Rule (Landscape untuk Leger Resmi) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: landscape;
            margin: 8mm 10mm;
          }
        }
      `}} />

      {/* Header Banner (Screen Only) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {defaultPrintMode ? 'Cetak Leger & Transkrip Nilai Kelas' : 'Rekapitulasi Nilai & Leger Siswa'}
              </h2>
              <p className="text-xs text-slate-500">
                Pusat pengolahan matriks nilai multi-mapel, agregasi kelas, ekspor Excel (CSV), dan cetak leger resmi berstandar dinas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          <button
            type="button"
            onClick={() => setManualRefreshCount(prev => prev + 1)}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-200 shadow-xs"
            title="Segarkan data rekap nilai sekarang"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-brand-600' : 'text-slate-500'}`} />
            <span>{isRefreshing ? 'Memuat...' : 'Segarkan'}</span>
          </button>

          <button
            type="button"
            onClick={handleReconcileToMaster}
            disabled={isReconciling}
            className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Kirim dan sinkronkan nilai siswa dari Shard Klaster ke Master Hub Pusat"
          >
            <UploadCloud className={`w-4 h-4 ${isReconciling ? 'animate-bounce' : ''}`} />
            <span>{isReconciling ? 'Menyinkronkan...' : 'Sinkron ke Master'}</span>
          </button>

          <button
            type="button"
            onClick={exportToMatrixCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Download Matriks Leger dalam format file CSV / Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Leger (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Cetak Leger Nilai Kelas ke kertas Landscape / PDF"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Cetak Leger (Landscape)</span>
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {reconcileToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-slide-left">
          <span>{reconcileToast}</span>
        </div>
      )}

      {/* Kop Surat Fisik Leger (Tampil saat Print) */}
      <div className="hidden print:block p-0 bg-white text-center space-y-1 mb-4 text-black">
        <h4 className="text-xs font-bold uppercase tracking-wider">
          PEMERINTAH KABUPATEN/KOTA {school.regency_city?.toUpperCase() || 'SUMEDANG'}
        </h4>
        <h4 className="text-xs font-bold uppercase tracking-wider">
          DINAS PENDIDIKAN DAN KEBUDAYAAN
        </h4>
        <h1 className="text-xl font-black uppercase tracking-wide">
          {school.name}
        </h1>
        <p className="text-xs">
          NPSN: {school.npsn} • Status: {school.status} • Akreditasi: {school.accreditation || 'A'}
        </p>
        <p className="text-[11px] italic">
          {school.address || 'Jl. Raya Pendidikan No. 45'}, {school.district}, {school.regency_city}
        </p>
        <div className="kop-border-thick" />
        <div className="kop-border-thin" />
        <h2 className="text-base font-black uppercase tracking-widest pt-2">
          LEGER REKAPITULASI HASIL ASESMEN PESERTA DIDIK
        </h2>
        <p className="text-xs font-semibold">
          {isCombinedMode ? 'Rekap Gabungan Seluruh Mata Pelajaran' : (activeSession?.session_name || 'Sesi Ujian Terpilih')} • Batas Ketercapaian (KKTP): {kktpThreshold}
        </p>
      </div>

      {/* 4 Statistik Nilai (Screen Only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 block">Rata-rata Kelas</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{columnAggregations.overallClassAvg}</span>
          <span className="text-[10px] text-slate-400">Dari {columnAggregations.completedStudentsCount} siswa terdata</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 block">Nilai Tertinggi</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{columnAggregations.overallMaxAvg}</span>
          <span className="text-[10px] text-slate-400">Rata-rata puncak</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 block">Nilai Terendah</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{columnAggregations.overallMinAvg}</span>
          <span className="text-[10px] text-slate-400">Rata-rata minimum</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-brand-600 block">Ketuntasan KKTP</span>
          <span className="text-2xl font-black text-brand-700 mt-1 block">
            {columnAggregations.completedStudentsCount > 0 
              ? Math.round((columnAggregations.totalPassedStudents / columnAggregations.completedStudentsCount) * 100) 
              : 0}%
          </span>
          <span className="text-[10px] text-slate-400">{columnAggregations.totalPassedStudents} siswa mencapai target</span>
        </div>

      </div>

      {/* Baris Filter Komprehensif: Sesi Ujian, Kelas, Rombel, Sortir & Pencarian (Screen Only) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3 print:hidden">
        
        {/* Baris Atas: Pilihan Mode Sesi */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2 w-full md:w-auto">
            <label className="text-xs font-bold text-slate-700 shrink-0 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-brand-600" />
              <span>Mode Tampilan:</span>
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedSessionId(newId);
                try {
                  localStorage.setItem('sasi_selected_recap_session', newId);
                } catch (err) {}
              }}
              className="w-full md:w-auto px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
            >
              <option value="all">⭐ REKAP NILAI GABUNGAN (Matriks Lengkap Seluruh Mapel)</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>Per Sesi: {s.session_name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-bold text-[11px] shrink-0">Batas KKTP:</span>
            <input
              type="number"
              value={kktpThreshold}
              onChange={(e) => setKktpThreshold(Number(e.target.value) || 75)}
              className="w-16 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold text-slate-800 shadow-2xs"
              title="Kriteria Ketercapaian Tujuan Pembelajaran"
            />
          </div>
        </div>

        {/* Baris Bawah: Filter Kelas, Rombel, Urutan, dan Search */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter Tingkat Kelas */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-500">Kelas:</span>
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="all">Semua Kelas</option>
                {availableGrades.map(gr => (
                  <option key={gr} value={gr}>Kelas {gr}</option>
                ))}
              </select>
            </div>

            {/* Filter Rombel */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-500">Rombel:</span>
              <select
                value={selectedRombelFilter}
                onChange={(e) => setSelectedRombelFilter(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="all">Semua Rombel</option>
                {availableRombels.map(r => (
                  <option key={r} value={r}>Rombel {r}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-bold text-slate-500 flex items-center space-x-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <span>Urutkan:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
              >
                <option value="avg_desc">Rata-rata Tertinggi ke Terendah</option>
                <option value="avg_asc">Rata-rata Terendah ke Tertinggi</option>
                <option value="name_asc">Nama Siswa (A - Z)</option>
                <option value="name_desc">Nama Siswa (Z - A)</option>
                <option value="nisn_asc">NISN Siswa</option>
              </select>
            </div>

          </div>

          {/* Kolom Pencarian */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>

        </div>

      </div>

      {/* Smart Auto-Scoring Hybrid Info Strip (Screen Only) */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-2xl p-4 text-xs flex items-start space-x-3 print:hidden shadow-2xs">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-emerald-950">
              {isCombinedMode ? 'Matriks Leger Multi-Mapel Otomatis Aktif' : 'Mode Pemeriksaan Nilai Per Sesi'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              {isCombinedMode ? `${subjectColumns.length} Mata Pelajaran Dipetakan` : 'Single Session View'}
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            {isCombinedMode 
              ? 'Tabel di bawah ini menampilkan matriks lengkap perolehan nilai setiap siswa untuk seluruh mata pelajaran dalam satu baris utuh. Siswa yang belum mengikuti mapel tertentu ditandai dengan placeholder "-". Klik "Transkrip" untuk mencetak rapor perorangan siswa (A4 Portrait).'
              : 'Menampilkan rincian pengerjaan untuk sesi terpilih. Anda dapat meninjau lembar jawaban siswa dan menyesuaikan nilai secara langsung.'}
          </p>
        </div>
      </div>

      {/* Tabel Leger Nilai (Matriks Multi-Mapel & Agregasi Kelas) */}
      <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-x-auto print:border-none print:shadow-none print:rounded-none">
        <table className="w-full text-left text-xs print:text-[10px] print-table border-collapse">
          <thead className="bg-sky-100 text-sky-950 font-black border-b-2 border-sky-300 uppercase tracking-wider text-[11px] print:bg-slate-200 print:text-black">
            <tr className="divide-x divide-sky-200 print:divide-x-0">
              <th className="py-2.5 px-2 text-center w-10 bg-sky-200/80 text-sky-950 font-black print:border-[1.5px] print:border-black print:w-8">
                NO.
              </th>
              <th className="py-2.5 px-3 print:border-[1.5px] print:border-black min-w-[140px]">
                Nama Lengkap Siswa
              </th>
              <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black w-24">
                NISN
              </th>
              <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black w-20">
                Kelas
              </th>

              {/* Dynamic Mapel Headers */}
              {subjectColumns.map(sc => (
                <th
                  key={sc.id}
                  className="py-2.5 px-2 text-center print:border-[1.5px] print:border-black min-w-[70px]"
                  title={sc.name}
                >
                  <div className="font-extrabold">{sc.code}</div>
                  <div className="text-[9px] font-normal text-slate-500 print:text-black truncate max-w-[80px] mx-auto">
                    {sc.name}
                  </div>
                </th>
              ))}

              {/* Total Skor & Rata-Rata */}
              <th className="py-2.5 px-2 text-center bg-sky-200/50 print:bg-slate-200 print:border-[1.5px] print:border-black w-20 font-black">
                TOTAL
              </th>
              <th className="py-2.5 px-2 text-center bg-sky-300/60 text-sky-950 print:bg-slate-300 print:border-[1.5px] print:border-black w-20 font-black">
                RATA-RATA
              </th>
              <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black w-28">
                KKTP ({kktpThreshold})
              </th>
              <th className="py-2.5 px-3 text-center print:hidden w-36">
                Aksi Proktor
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800 print:text-black">
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={subjectColumns.length + 7}
                  className="py-8 text-center text-slate-400 italic bg-slate-50"
                >
                  Tidak ada data siswa yang sesuai dengan filter pencarian.
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((s) => (
                <tr
                  key={s.id}
                  className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors print-avoid-break print:divide-x-0"
                >
                  {/* Nomor Urut */}
                  <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50 print:bg-transparent print:text-black print:border print:border-black">
                    {s.no}
                  </td>

                  {/* Nama Siswa */}
                  <td className="py-2 px-3 print:border print:border-black">
                    <div className="font-extrabold text-slate-900 print:text-black">{s.name}</div>
                  </td>

                  {/* NISN */}
                  <td className="py-2 px-3 text-center font-mono font-bold print:text-black print:border print:border-black">
                    {s.nisn}
                  </td>

                  {/* Kelas */}
                  <td className="py-2 px-3 text-center font-semibold print:text-black print:border print:border-black">
                    {s.grade_class}
                  </td>

                  {/* Nilai Tiap Mata Pelajaran Dinamis */}
                  {subjectColumns.map(sc => {
                    const score = s.nilai_mapel[sc.id];
                    return (
                      <td
                        key={sc.id}
                        className="py-2 px-2 text-center font-mono font-bold print:text-black print:border print:border-black"
                      >
                        {score !== null ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs ${
                            score >= kktpThreshold 
                              ? 'text-emerald-800 bg-emerald-50 print:bg-transparent print:text-black font-black' 
                              : 'text-rose-700 bg-rose-50 print:bg-transparent print:text-black font-bold'
                          }`}>
                            {score}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono print:text-black">-</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Total Skor */}
                  <td className="py-2 px-2 text-center font-mono font-extrabold bg-sky-50/50 print:bg-transparent print:text-black print:border print:border-black">
                    {s.total_skor > 0 ? s.total_skor : '-'}
                  </td>

                  {/* Rata-Rata */}
                  <td className="py-2 px-2 text-center font-mono font-black text-slate-950 bg-sky-100/60 print:bg-transparent print:text-black print:border print:border-black">
                    {s.rata_rata > 0 ? (
                      <span className={`px-2 py-0.5 rounded ${s.isPassed ? 'text-emerald-900 bg-emerald-100/70' : 'text-rose-900 bg-rose-100/70'} print:bg-transparent print:p-0`}>
                        {s.rata_rata}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono print:text-black">-</span>
                    )}
                  </td>

                  {/* Ketuntasan KKTP */}
                  <td className="py-2 px-3 text-center print:border print:border-black">
                    {s.completed_count > 0 ? (
                      s.isPassed ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 print:bg-transparent print:border print:border-black print:text-black">
                          Tuntas
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 print:bg-transparent print:border print:border-black print:text-black">
                          Remedial
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 text-[10px] print:text-black">Belum Ada</span>
                    )}
                  </td>

                  {/* Aksi Proktor (Screen Only) */}
                  <td className="py-2 px-3 text-center print:hidden">
                    <div className="flex items-center justify-center space-x-1">
                      
                      {/* Tombol Cetak Transkrip Perorangan */}
                      <button
                        type="button"
                        onClick={() => {
                          const targetStudent = students.find(st => st.id === s.id);
                          if (targetStudent) {
                            setSelectedStudentForTranscript(targetStudent);
                            setIsTranscriptModalOpen(true);
                          }
                        }}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors shadow-2xs"
                        title="Lihat & Cetak Transkrip Nilai Siswa (A4 Portrait)"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Transkrip</span>
                      </button>

                      {/* Tombol Tinjau Jawaban (Jika pada Sesi Tunggal atau Siswa Ada Pengerjaan) */}
                      {!isCombinedMode && activeSession && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetStudent = students.find(st => st.id === s.id);
                            if (targetStudent) {
                              setSelectedStudentForReview(targetStudent);
                              setIsReviewModalOpen(true);
                            }
                          }}
                          className="px-2 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-colors shadow-2xs"
                          title="Tinjau jawaban siswa atau sesuaikan skor"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Tinjau</span>
                        </button>
                      )}

                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* Baris Agregasi Statistik Kelas (Rata-Rata, Nilai Tertinggi, Nilai Terendah) */}
          <tfoot className="bg-sky-100/90 text-sky-950 font-black border-t-2 border-sky-400 print:bg-slate-100 print:text-black print:border-black">
            
            {/* 1. Baris Rata-rata Kelas */}
            <tr className="divide-x divide-sky-200 print:divide-x-0 print:border print:border-black">
              <td colSpan={4} className="py-2 px-3 text-right font-black uppercase text-[11px] print:border print:border-black">
                Rata-Rata Kelas:
              </td>
              {subjectColumns.map(sc => {
                const avg = columnAggregations.bySubject[sc.id]?.avg || 0;
                return (
                  <td key={sc.id} className="py-2 px-2 text-center font-mono font-black text-xs print:border print:border-black">
                    {avg > 0 ? avg : '-'}
                  </td>
                );
              })}
              <td className="py-2 px-2 text-center font-mono font-bold text-xs print:border print:border-black">
                -
              </td>
              <td className="py-2 px-2 text-center font-mono font-black text-xs text-sky-950 print:border print:border-black bg-sky-200/70 print:bg-transparent">
                {columnAggregations.overallClassAvg > 0 ? columnAggregations.overallClassAvg : '-'}
              </td>
              <td colSpan={2} className="py-2 px-2 text-center text-[10px] text-slate-600 print:text-black print:border print:border-black">
                {columnAggregations.completedStudentsCount > 0 
                  ? `${Math.round((columnAggregations.totalPassedStudents / columnAggregations.completedStudentsCount) * 100)}% Tuntas` 
                  : '-'}
              </td>
            </tr>

            {/* 2. Baris Nilai Tertinggi */}
            <tr className="divide-x divide-sky-200 print:divide-x-0 print:border print:border-black">
              <td colSpan={4} className="py-2 px-3 text-right font-bold uppercase text-[11px] text-emerald-800 print:text-black print:border print:border-black">
                Nilai Tertinggi:
              </td>
              {subjectColumns.map(sc => {
                const max = columnAggregations.bySubject[sc.id]?.max || 0;
                return (
                  <td key={sc.id} className="py-2 px-2 text-center font-mono font-bold text-xs text-emerald-800 print:text-black print:border print:border-black">
                    {max > 0 ? max : '-'}
                  </td>
                );
              })}
              <td className="py-2 px-2 text-center font-mono font-bold text-xs print:border print:border-black">
                -
              </td>
              <td className="py-2 px-2 text-center font-mono font-black text-xs text-emerald-900 print:text-black print:border print:border-black bg-emerald-100/50 print:bg-transparent">
                {columnAggregations.overallMaxAvg > 0 ? columnAggregations.overallMaxAvg : '-'}
              </td>
              <td colSpan={2} className="py-2 px-2 text-center text-[10px] text-emerald-700 print:text-black print:border print:border-black">
                Skor Tertinggi
              </td>
            </tr>

            {/* 3. Baris Nilai Terendah */}
            <tr className="divide-x divide-sky-200 print:divide-x-0 print:border print:border-black">
              <td colSpan={4} className="py-2 px-3 text-right font-bold uppercase text-[11px] text-amber-800 print:text-black print:border print:border-black">
                Nilai Terendah:
              </td>
              {subjectColumns.map(sc => {
                const min = columnAggregations.bySubject[sc.id]?.min || 0;
                return (
                  <td key={sc.id} className="py-2 px-2 text-center font-mono font-bold text-xs text-amber-800 print:text-black print:border print:border-black">
                    {min > 0 ? min : '-'}
                  </td>
                );
              })}
              <td className="py-2 px-2 text-center font-mono font-bold text-xs print:border print:border-black">
                -
              </td>
              <td className="py-2 px-2 text-center font-mono font-black text-xs text-amber-900 print:text-black print:border print:border-black bg-amber-100/50 print:bg-transparent">
                {columnAggregations.overallMinAvg > 0 ? columnAggregations.overallMinAvg : '-'}
              </td>
              <td colSpan={2} className="py-2 px-2 text-center text-[10px] text-amber-700 print:text-black print:border print:border-black">
                Skor Terendah
              </td>
            </tr>

          </tfoot>
        </table>
      </div>

      {/* Tanda Tangan Cetak Leger (Hanya tampil saat Print) */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-8 text-xs text-center text-black print-avoid-break">
        <div>
          <p>Mengetahui,</p>
          <p className="font-bold">Kepala Sekolah {school.name}</p>
          <div className="signature-space" style={{ height: '72px', minHeight: '72px' }} />
          <p className="font-bold underline uppercase">{school.principal_name || 'Aep Yayat, S.Pd.SD.'}</p>
          <p className="text-[11px] font-mono">NIP: {school.principal_nip || '19750812 200003 2 004'}</p>
        </div>

        <div>
          <p>{school.regency_city || 'Sumedang'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="font-bold">Guru Kelas / Proktor Pelaksana,</p>
          <div className="signature-space" style={{ height: '72px', minHeight: '72px' }} />
          <p className="font-bold underline uppercase">( .................................................... )</p>
          <p className="text-[11px] font-mono">NIP: ................................................</p>
        </div>
      </div>

      {/* Modal Tinjau & Koreksi Jawaban Siswa */}
      {selectedStudentForReview && (
        <StudentAnswerReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => {
            setIsReviewModalOpen(false);
            setSelectedStudentForReview(null);
          }}
          student={selectedStudentForReview}
          attempt={attempts.find(a => a.student_id === selectedStudentForReview.id && (!activeSession || a.session_id === activeSession.id))}
          session={activeSession}
          questions={questions.length > 0 ? questions : MOCK_QUESTION_BANK}
          kktpThreshold={kktpThreshold}
          onSaved={(studentId, newFinalScore) => {
            setAttempts(prev => prev.map(a => {
              if (a.student_id === studentId && (!activeSession || a.session_id === activeSession.id)) {
                return { ...a, final_score: newFinalScore };
              }
              return a;
            }));
          }}
        />
      )}

      {/* Modal Cetak Transkrip Nilai Perorangan Siswa (A4 Portrait) */}
      {selectedStudentForTranscript && (
        <StudentTranscriptModal
          isOpen={isTranscriptModalOpen}
          onClose={() => {
            setIsTranscriptModalOpen(false);
            setSelectedStudentForTranscript(null);
          }}
          student={selectedStudentForTranscript}
          school={school}
          subjects={subjectColumns.map(sc => {
            const row = pivotedRows.find(r => r.id === selectedStudentForTranscript.id);
            return {
              id: sc.id,
              name: sc.name,
              code: sc.code,
              score: row?.nilai_mapel[sc.id] ?? null
            };
          })}
          kktpThreshold={kktpThreshold}
        />
      )}

    </div>
  );
};

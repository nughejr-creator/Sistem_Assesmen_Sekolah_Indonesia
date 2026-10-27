import React, { useState, useEffect } from 'react';
import { School, UserProfile, ExamSession, StudentAttempt, QuestionBankItem } from '../../types/database';
import { MOCK_USERS, MOCK_EXAM_SESSION, MOCK_QUESTION_BANK } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { toValidUUID } from '../../lib/syncHelper';
import { StudentAnswerReviewModal } from './StudentAnswerReviewModal';
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
  UploadCloud
} from 'lucide-react';

interface ExamScoreRecapViewProps {
  school: School;
  defaultPrintMode?: boolean;
}

export const ExamScoreRecapView: React.FC<ExamScoreRecapViewProps> = ({
  school,
  defaultPrintMode = false
}) => {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    try {
      return localStorage.getItem('sasi_selected_recap_session') || '';
    } catch (e) {
      return '';
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
  const [kktpThreshold, setKktpThreshold] = useState<number>(75); // Kriteria Ketercapaian Tujuan Pembelajaran

  // State Review Jawaban Siswa
  const [selectedStudentForReview, setSelectedStudentForReview] = useState<UserProfile | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileToast, setReconcileToast] = useState<string | null>(null);

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
      try {
        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)')
          .order('created_at', { ascending: false });

        if (cloudSessions && isMounted) {
          const matched = cloudSessions.filter(s => school.id && s.school_id === school.id);
          setSessions(matched as ExamSession[]);

          if (matched.length > 0) {
            setSelectedSessionId(prev => {
              if (prev && (prev === 'all' || matched.some(s => s.id === prev))) {
                return prev;
              }
              const nonRemedial = matched.find(s => !s.session_name.toLowerCase().includes('remedial'));
              const chosen = nonRemedial ? nonRemedial.id : matched[0].id;
              try {
                localStorage.setItem('sasi_selected_recap_session', chosen);
              } catch (e) {}
              return chosen;
            });
          } else {
            setSelectedSessionId('');
          }
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
          // Urutkan attempts berdasarkan waktu submit terbaru agar attempt terakhir selalu diprioritaskan
          combinedAttempts.sort((a, b) => {
            const timeA = new Date(a.submitted_at || a.started_at || 0).getTime();
            const timeB = new Date(b.submitted_at || b.started_at || 0).getTime();
            return timeB - timeA;
          });

          const mappedAttempts = combinedAttempts.map(ca => {
            const matchedSession = cloudSessions.find((s: any) => s.id === ca.session_id);
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
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [school.id]);

  // Helper presisi mengekstrak nomor tingkatan kelas
  const extractGradeNumber = (str?: string): string | null => {
    if (!str) return null;
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
    return null;
  };

  const getSessionGrade = (sess?: ExamSession | null): string | null => {
    if (!sess) return null;
    const fromName = extractGradeNumber(sess.session_name);
    if (fromName) return fromName;
    const fromPkg = extractGradeNumber(sess.package?.title);
    if (fromPkg) return fromPkg;
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

  // Sesi aktif yang dipilih
  const activeSession = selectedSessionId === 'all'
    ? null
    : (sessions.find(s => s.id === selectedSessionId) || sessions[0] || null);

  // Attempt yang valid khusus untuk sesi terpilih
  const sessionAttempts = React.useMemo(() => {
    if (selectedSessionId === 'all' || !activeSession) {
      return attempts;
    }
    return attempts.filter(a => {
      if (a.session_id === activeSession.id) return true;
      if (a.session?.id === activeSession.id) return true;
      if (a.session?.token_code && activeSession.token_code && a.session.token_code === activeSession.token_code) return true;
      return false;
    });
  }, [attempts, activeSession, selectedSessionId]);

  // Siswa yang relevan dengan sesi terpilih
  const sessionStudents = React.useMemo(() => {
    if (selectedSessionId === 'all' || !activeSession) {
      return students;
    }
    const sessionGrade = getSessionGrade(activeSession);
    return students.filter(student => {
      // 1. Jika ada riwayat attempt di sesi ini, selalu sertakan
      if (sessionAttempts.some(a => a.student_id === student.id)) return true;

      // 2. Filter berdasarkan kelas jika sesi menspesifikasikan kelas tertentu
      const studentGrade = extractGradeNumber(student.grade_class);
      if (sessionGrade && studentGrade) {
        if (sessionGrade !== studentGrade) return false;
      }
      return true;
    });
  }, [students, sessionAttempts, activeSession, selectedSessionId]);

  // Data Skor yang terikat KETAT pada Sesi Terpilih
  const scoreData = sessionStudents.map((st, idx) => {
    // Cari attempt KHUSUS pada sesi terpilih, atau attempt manapun jika mode 'all'
    const att = (selectedSessionId === 'all' || !activeSession)
      ? attempts.find(a => a.student_id === st.id)
      : sessionAttempts.find(a => a.student_id === st.id);

    const score = (att && att.final_score !== null && att.final_score !== undefined)
      ? Number(att.final_score)
      : null;

    const isPassed = score !== null ? score >= kktpThreshold : false;

    return {
      no: idx + 1,
      id: st.id,
      name: st.full_name,
      nisn: st.username,
      grade_class: st.grade_class || '6-A',
      score: score,
      status: att?.status || 'unattempted',
      isPassed
    };
  });

  const filteredScores = scoreData.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q) || s.grade_class.toLowerCase().includes(q);
  });

  // Statistics
  const validScores = scoreData.map(s => s.score).filter((s): s is number => s !== null);
  const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
  const lowestScore = validScores.length > 0 ? Math.min(...validScores) : 0;
  const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const passedCount = scoreData.filter(s => s.isPassed).length;
  const passPercentage = validScores.length > 0 ? Math.round((passedCount / validScores.length) * 100) : 0;

  const exportToCSV = () => {
    const headers = ['No,NISN,Nama Siswa,Kelas,Skor Ujian,Ketuntasan KKTP\n'];
    const rows = filteredScores.map(s => 
      `"${s.no}","${s.nisn}","${s.name}","${s.grade_class}","${s.score ?? '-'}","${s.isPassed ? 'Tuntas' : 'Belum Tuntas'}"\n`
    );
    const blob = new Blob([headers.concat(rows).join('')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Nilai_${(activeSession ? activeSession.session_name : 'Semua_Sesi').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner (Screen Only) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {defaultPrintMode ? 'Cetak Leger & Transkrip Nilai' : 'Rekapitulasi Nilai Ujian Siswa'}
              </h2>
              <p className="text-xs text-slate-500">
                Hasil perolehan nilai, ketuntasan belajar (KKTP), dan export laporan ke Excel / cetak PDF.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
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
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-brand-300" />
            <span>Cetak Leger (PDF)</span>
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
          LEGER REKAPITULASI NILAI ASESMEN / UJIAN
        </h2>
        <p className="text-xs font-semibold">
          {(activeSession ? activeSession.session_name : 'Semua Sesi Ujian')} • Batas Ketercapaian (KKTP): {kktpThreshold}
        </p>
      </div>

      {/* Ringkasan Statistik Cetak (Tampil di Print Mode seperti Tabel Word) */}
      <div className="hidden print:block mb-3">
        <table className="w-full text-xs print-table border-collapse">
          <tbody>
            <tr>
              <td className="w-1/4 font-bold bg-slate-100 print:bg-slate-100 print:border print:border-black">Total Siswa Terdata:</td>
              <td className="w-1/4 font-mono font-bold print:border print:border-black">{scoreData.length} Siswa</td>
              <td className="w-1/4 font-bold bg-slate-100 print:bg-slate-100 print:border print:border-black">Rata-rata Nilai:</td>
              <td className="w-1/4 font-mono font-black print:border print:border-black">{avgScore}</td>
            </tr>
            <tr>
              <td className="font-bold bg-slate-100 print:bg-slate-100 print:border print:border-black">Nilai Tertinggi:</td>
              <td className="font-mono font-bold print:border print:border-black">{highestScore}</td>
              <td className="font-bold bg-slate-100 print:bg-slate-100 print:border print:border-black">Nilai Terendah:</td>
              <td className="font-mono font-bold print:border print:border-black">{lowestScore}</td>
            </tr>
            <tr>
              <td className="font-bold bg-slate-100 print:bg-slate-100 print:border print:border-black">Ketuntasan (KKTP &ge; {kktpThreshold}):</td>
              <td colSpan={3} className="font-bold print:border print:border-black">
                {passedCount} Siswa Tuntas ({passPercentage}%) • {validScores.length - passedCount} Siswa Perlu Bimbingan/Remedial
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4 Statistik Nilai (Screen Only) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 block">Rata-rata Kelas</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{avgScore}</span>
          <span className="text-[10px] text-slate-400">Dari {validScores.length} siswa selesai</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 block">Nilai Tertinggi</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{highestScore}</span>
          <span className="text-[10px] text-slate-400">Skor maksimum</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-600 block">Nilai Terendah</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{lowestScore}</span>
          <span className="text-[10px] text-slate-400">Skor minimum</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-brand-600 block">Ketuntasan KKTP</span>
          <span className="text-2xl font-black text-brand-700 mt-1 block">{passPercentage}%</span>
          <span className="text-[10px] text-slate-400">{passedCount} siswa mencapai target</span>
        </div>

      </div>

      {/* Filter Sesi & Search */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-600">Pilih Sesi Ujian:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedSessionId(newId);
              try {
                localStorage.setItem('sasi_selected_recap_session', newId);
              } catch (err) {}
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.session_name}</option>
            ))}
            <option value="all">-- Rekap Gabungan Semua Sesi --</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative max-w-xs w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari siswa atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center space-x-1 text-xs">
            <span className="text-slate-500 font-bold text-[11px]">KKTP:</span>
            <input
              type="number"
              value={kktpThreshold}
              onChange={(e) => setKktpThreshold(Number(e.target.value) || 75)}
              className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-center font-bold"
            />
          </div>
        </div>
      </div>

      {/* Smart Auto-Scoring Hybrid Info Strip (Screen Only) */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 rounded-2xl p-4 text-xs flex items-start space-x-3 print:hidden shadow-2xs">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-emerald-950">Mode Hybrid Smart System Aktif:</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Auto-Accepted by Default
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            Soal isian singkat telah dinilai dengan toleransi salah ketik (typo) <strong>≥ 80%</strong> dan soal uraian telah dianalisis berdasarkan <strong>kepadatan konsep materi</strong> secara otomatis. Seluruh nilai di atas telah sah dan diterima otomatis untuk keperluan cetak leger atau ekspor rapor. Jika ingin memberikan penyesuaian nilai, silakan klik tombol <strong>"Tinjau Jawaban"</strong> pada siswa bersangkutan.
          </p>
        </div>
      </div>

      {/* Tabel Leger Nilai (MS Word Quality Print Table & Crisp Screen Grid) */}
      <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <table className="w-full text-left text-xs print:text-[11px] print-table border-collapse">
          <thead className="bg-sky-100 text-sky-950 font-black border-b-2 border-sky-300 uppercase tracking-wider text-[11px] print:bg-slate-200 print:text-black">
            <tr className="divide-x divide-sky-200 print:divide-x-0">
              <th className="py-2.5 px-2 text-center w-12 bg-sky-200/80 text-sky-950 font-black print:border-[1.5px] print:border-black print:w-10">NO.</th>
              <th className="py-2.5 px-3 print:border-[1.5px] print:border-black">Nama Lengkap Siswa</th>
              <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black print:w-28">NISN</th>
              <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black print:w-20">Kelas</th>
              <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black print:w-28">Skor Ujian</th>
              <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black print:w-32">Ketuntasan (KKTP {kktpThreshold})</th>
              <th className="py-2.5 px-3 text-center print:hidden">Status Pengerjaan</th>
              <th className="py-2.5 px-3 text-center print:hidden">Aksi Guru</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800 print:text-black">
            {filteredScores.map((s) => (
              <tr key={s.id} className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors print-avoid-break print:divide-x-0">
                <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50 print:bg-transparent print:text-black print:border print:border-black">
                  {s.no}
                </td>

                <td className="py-2 px-3 print:border print:border-black">
                  <div className="font-extrabold text-slate-900 print:text-black">{s.name}</div>
                </td>

                <td className="py-2 px-3 text-center font-mono font-bold print:text-black print:border print:border-black">
                  {s.nisn}
                </td>

                <td className="py-2 px-3 text-center font-semibold print:text-black print:border print:border-black">
                  Kelas {s.grade_class}
                </td>

                {/* Score */}
                <td className="py-2 px-3 text-center print:border print:border-black">
                  {s.score !== null ? (
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-900 print:bg-transparent print:p-0 print:text-black">
                      {s.score}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono print:text-black">-</span>
                  )}
                </td>

                {/* Ketuntasan */}
                <td className="py-2 px-3 text-center print:border print:border-black">
                  {s.score !== null ? (
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
                    <span className="text-slate-400 text-[10px] print:text-black">-</span>
                  )}
                </td>

                {/* Status (Screen only) */}
                <td className="py-2 px-3 text-center print:hidden">
                  {s.status === 'completed' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Selesai
                    </span>
                  ) : s.status === 'working' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200 animate-pulse">
                      Mengerjakan
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                      Belum Ujian
                    </span>
                  )}
                </td>

                {/* Aksi Guru: Tinjau & Koreksi Jawaban */}
                <td className="py-2 px-3 text-center print:hidden">
                  {s.status === 'completed' || s.score !== null ? (
                    <button
                      type="button"
                      onClick={() => {
                        const targetStudent = students.find(st => st.id === s.id);
                        if (targetStudent) {
                          setSelectedStudentForReview(targetStudent);
                          setIsReviewModalOpen(true);
                        }
                      }}
                      className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-[11px] font-bold flex items-center space-x-1 mx-auto transition-colors shadow-2xs"
                      title="Tinjau jawaban siswa atau sesuaikan nilai"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Tinjau Jawaban</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Belum Selesai</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tanda Tangan Cetak Leger */}
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
          <p className="font-bold">Guru Mata Pelajaran / Proktor,</p>
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
          attempt={sessionAttempts.find(a => a.student_id === selectedStudentForReview.id) || attempts.find(a => a.student_id === selectedStudentForReview.id)}
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

    </div>
  );
};

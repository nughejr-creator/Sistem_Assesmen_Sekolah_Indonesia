import React, { useState, useEffect } from 'react';
import { UserProfile, School, ExamSession, StudentAttempt, QuestionBankItem } from '../../types/database';
import { MOCK_USERS, MOCK_EXAM_SESSION, MOCK_QUESTION_BANK, MOCK_SCHOOLS } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { StudentAnswerReviewModal } from '../proctor/StudentAnswerReviewModal';
import { filterSessionsForTeacher, filterStudentsForTeacher } from '../../lib/teacherScope';
import { toValidUUID } from '../../lib/syncHelper';
import { 
  BarChart3, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Eye, 
  Award,
  BookOpen
} from 'lucide-react';

interface TeacherSubjectLedgerViewProps {
  teacher: UserProfile;
  school?: School;
  defaultPrintMode?: boolean;
}

export const TeacherSubjectLedgerView: React.FC<TeacherSubjectLedgerViewProps> = ({
  teacher,
  school = teacher.school || MOCK_SCHOOLS[0],
  defaultPrintMode = false
}) => {
  const [sessions, setSessions] = useState<ExamSession[]>([MOCK_EXAM_SESSION]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    try {
      return localStorage.getItem('sasi_teacher_session') || '';
    } catch (e) {
      return '';
    }
  });

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [kktpThreshold, setKktpThreshold] = useState<number>(75);

  const [selectedStudentForReview, setSelectedStudentForReview] = useState<UserProfile | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)')
          .order('created_at', { ascending: false });

        if (cloudSessions && isMounted) {
          const matched = teacher.school_id ? cloudSessions.filter(s => s.school_id === teacher.school_id) : cloudSessions;
          const scopedSessions = filterSessionsForTeacher(matched, teacher);
          setSessions(scopedSessions as ExamSession[]);

          setSelectedSessionId(prev => {
            if (prev && (prev === 'all' || scopedSessions.some(s => s.id === prev))) return prev;
            const nonRemedial = scopedSessions.find(s => !s.session_name.toLowerCase().includes('remedial'));
            const chosen = nonRemedial ? nonRemedial.id : (scopedSessions[0]?.id || 'all');
            try { localStorage.setItem('sasi_teacher_session', chosen); } catch (e) {}
            return chosen;
          });
        }

        const clusterClient = getSupabaseClientForSchool(teacher.school_id);

        const { data: cloudStudents } = await clusterClient
          .from('user_profiles')
          .select('*')
          .eq('role', 'student')
          .order('full_name');

        const effectiveStudents = (cloudStudents && cloudStudents.length > 0) ? cloudStudents : (await supabase.from('user_profiles').select('*').eq('role', 'student')).data;

        if (effectiveStudents && effectiveStudents.length > 0 && isMounted) {
          const matchedStudents = teacher.school_id ? effectiveStudents.filter(s => s.school_id === teacher.school_id) : effectiveStudents;
          const scopedStudents = filterStudentsForTeacher(matchedStudents, teacher);
          setStudents(scopedStudents);
        } else if (isMounted) {
          setStudents([]);
        }

        let combinedAttempts: any[] = [];
        const { data: shardAttempts, error: shardAttErr } = await clusterClient
          .from('student_attempts')
          .select('*');

        if (!shardAttErr && shardAttempts && shardAttempts.length > 0) {
          combinedAttempts = [...shardAttempts];
        }

        const { data: masterAttempts } = await supabase
          .from('student_attempts')
          .select('*');

        if (masterAttempts && masterAttempts.length > 0) {
          const map = new Map<string, any>();
          masterAttempts.forEach(m => map.set(m.id, m));
          combinedAttempts.forEach(s => {
            const m = map.get(s.id);
            if (!m || s.status === 'completed' || (s.answered_count || 0) >= (m.answered_count || 0)) {
              map.set(s.id, s);
            }
          });
          combinedAttempts = Array.from(map.values());
        }

        if (combinedAttempts.length > 0 && isMounted) {
          const mappedAttempts = combinedAttempts.map(ca => {
            const matchedSession = (cloudSessions || []).find((s: any) => s.id === ca.session_id);
            return {
              ...ca,
              session: matchedSession || ca.session
            };
          });
          setAttempts(mappedAttempts as StudentAttempt[]);
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
    const interval = setInterval(fetchData, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [teacher.school_id]);

  // Filter Sesi & Siswa sesuai aturan kewenangan guru
  const allowedSessions = filterSessionsForTeacher(sessions, teacher);
  const effectiveSessions = allowedSessions;

  const activeSession = selectedSessionId === 'all'
    ? null
    : (effectiveSessions.find(s => s.id === selectedSessionId) || effectiveSessions[0] || null);

  // Muat butir soal spesifik paket sesi yang aktif untuk review jawaban siswa
  useEffect(() => {
    let isMounted = true;
    const loadSessionQuestions = async () => {
      if (!activeSession?.package_id) return;
      try {
        const { data: epqData } = await supabase
          .from('exam_package_questions')
          .select('question_id, order_number')
          .eq('package_id', toValidUUID(activeSession.package_id))
          .order('order_number', { ascending: true });

        if (epqData && epqData.length > 0) {
          const qIds = epqData.map((x: any) => x.question_id);
          const { data: qData } = await supabase
            .from('question_bank')
            .select('*, options:question_options(*)')
            .in('id', qIds);

          if (qData && qData.length > 0 && isMounted) {
            const qMap = new Map(qData.map((q: any) => [q.id, q]));
            const ordered: QuestionBankItem[] = [];
            epqData.forEach((epq: any) => {
              const found = qMap.get(epq.question_id);
              if (found) {
                ordered.push({
                  ...found,
                  options: Array.isArray(found.options)
                    ? [...found.options].sort((a: any, b: any) => (a.option_label || '').localeCompare(b.option_label || ''))
                    : []
                });
              }
            });
            if (ordered.length > 0) {
              setQuestions(ordered);
            }
          }
        }
      } catch (err) {}
    };
    loadSessionQuestions();
  }, [activeSession?.id, activeSession?.package_id]);

  // Sesi attempt
  const sessionAttempts = attempts.filter(a => {
    if (selectedSessionId === 'all' || !activeSession) return true;
    return a.session_id === activeSession.id || a.session?.id === activeSession.id;
  });

  // Siswa binaan guru sesuai kelas
  const allowedStudents = filterStudentsForTeacher(students, teacher);

  const scoreData = allowedStudents.map((st, idx) => {
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

  const validScores = scoreData.map(s => s.score).filter((s): s is number => s !== null);
  const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
  const lowestScore = validScores.length > 0 ? Math.min(...validScores) : 0;
  const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const passedCount = scoreData.filter(s => s.isPassed).length;
  const passPercentage = validScores.length > 0 ? Math.round((passedCount / validScores.length) * 100) : 0;

  const exportToExcelXLSX = () => {
    try {
      const XLSX = (window as any).XLSX;
      if (!XLSX) {
        alert('Pustaka Excel sedang disiapkan, silakan klik kembali dalam 1 detik.');
        return;
      }

      const districtName = school.regency_city?.toUpperCase() || school.district?.toUpperCase() || 'SUMEDANG';
      const mapelName = (teacher.assigned_subject_name || 'MATEMATIKA').toUpperCase();
      const sessionTitle = activeSession ? activeSession.session_name : 'Semua Sesi Ujian';
      const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

      // Format Data Sheet yang persis dengan Kop & Tabel Cetak PDF
      const aoa: any[][] = [
        [`PEMERINTAH KABUPATEN/KOTA ${districtName}`],
        ['DINAS PENDIDIKAN DAN KEBUDAYAAN'],
        [school.name.toUpperCase()],
        [`NPSN: ${school.npsn || '-'} • Status: ${school.level || 'SD'}`],
        [''],
        [`LEGER NILAI MATA PELAJARAN: ${mapelName}`],
        [`Sesi Ujian: ${sessionTitle} | Batas Ketercapaian (KKTP): ${kktpThreshold} | Tahun Ajaran: 2026/2027`],
        [''],
        ['NO', 'NAMA LENGKAP SISWA', 'NISN', 'KELAS', 'SKOR NILAI', `KETUNTASAN (KKTP ${kktpThreshold})`]
      ];

      filteredScores.forEach(s => {
        aoa.push([
          s.no,
          s.name,
          s.nisn,
          s.grade_class,
          s.score !== null ? s.score : '-',
          s.score !== null ? (s.isPassed ? 'Tuntas' : 'Remedial') : 'Belum Ujian'
        ]);
      });

      // Ringkasan Statistik Kelas
      aoa.push(['']);
      aoa.push(['', '', '', 'Rata-rata Kelas:', avgScore, 'Skala 0 - 100']);
      aoa.push(['', '', '', 'Nilai Tertinggi:', highestScore, 'Skor Maksimum']);
      aoa.push(['', '', '', 'Nilai Terendah:', lowestScore, 'Skor Minimum']);
      aoa.push(['', '', '', 'Ketuntasan Belajar:', `${passPercentage}%`, `${passedCount} dari ${filteredScores.length} siswa`]);

      // Tanda Tangan Resmi
      aoa.push(['']);
      aoa.push(['Mengetahui,', '', '', '', `${school.district || school.regency_city || 'Sumedang'}, ${dateStr}`, '']);
      aoa.push([`Kepala Sekolah ${school.name}`, '', '', '', `Guru Mata Pelajaran ${teacher.assigned_subject_name || 'Matematika'},`, '']);
      aoa.push(['', '', '', '', '', '']);
      aoa.push(['', '', '', '', '', '']);
      aoa.push(['', '', '', '', '', '']);
      aoa.push([school.principal_name || 'Aep Yayat, S.Pd.SD.', '', '', '', teacher.full_name, '']);
      aoa.push([`NIP: ${school.principal_nip || '19750812 200003 2 004'}`, '', '', '', `NIP: ${teacher.nip && teacher.nip !== '-' ? teacher.nip : '-'}`, '']);

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Merge header kop surat (Kolom A s/d F)
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } },
        { s: { r: 6, c: 0 }, e: { r: 6, c: 5 } }
      ];

      // Lebar kolom proporsional
      ws['!cols'] = [
        { wch: 6 },  // No
        { wch: 32 }, // Nama
        { wch: 16 }, // NISN
        { wch: 12 }, // Kelas
        { wch: 14 }, // Skor
        { wch: 22 }  // Ketuntasan
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leger_Nilai');

      const fileName = `Leger_Nilai_${(teacher.assigned_subject_name || 'Mapel').replace(/\s+/g, '_')}_${(teacher.grade_class || 'Kelas').replace(/\s+/g, '_')}.xlsx`;

      try {
        XLSX.writeFile(wb, fileName);
      } catch (err) {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 200);
      }
    } catch (e) {
      console.error('Export Excel failed:', e);
      alert('Gagal mengekspor file Excel. Silakan coba lagi.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner (Screen Only) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">
                {defaultPrintMode ? 'Cetak Leger Nilai Mata Pelajaran' : 'Rekapitulasi Nilai & Leger Mata Pelajaran'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pendidik: <strong>{teacher.full_name}</strong> • Mapel: <strong>{teacher.assigned_subject_name || 'Matematika'}</strong> • Target KKTP: <strong>{kktpThreshold}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={exportToExcelXLSX}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Unduh file Microsoft Excel (.xlsx) rapi siap cetak"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Unduh Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-amber-300" />
            <span>Cetak Leger (PDF)</span>
          </button>
        </div>
      </div>

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
          NPSN: {school.npsn} • Status: {school.status || school.level} • Akreditasi: {school.accreditation || 'A'}
        </p>
        <p className="text-[11px] italic">
          {school.address || 'Jl. Raya Pendidikan No. 45'}, {school.district}, {school.regency_city}
        </p>
        <div className="kop-border-thick" />
        <div className="kop-border-thin" />
        <h2 className="text-base font-black uppercase tracking-widest pt-2">
          LEGER NILAI MATA PELAJARAN: {(teacher.assigned_subject_name || 'MATEMATIKA').toUpperCase()}
        </h2>
        <p className="text-xs font-semibold">
          {activeSession ? activeSession.session_name : 'Semua Sesi Ujian'} • Batas Ketercapaian (KKTP): {kktpThreshold}
        </p>
      </div>

      {/* Ringkasan Statistik Cetak (Tampil di Print Mode seperti Tabel Word) */}
      <div className="hidden print:block mb-3">
        <table className="w-full text-xs print-table border-collapse">
          <tbody>
            <tr>
              <td className="w-1/4 font-bold bg-slate-100 print:bg-slate-100 print:border print:border-black">Total Siswa Terdata:</td>
              <td className="w-1/4 font-mono font-bold print:border print:border-black">{filteredScores.length} Siswa</td>
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
          <span className="text-[11px] font-bold text-amber-600 block">Ketuntasan KKTP</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{passPercentage}%</span>
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
              try { localStorage.setItem('sasi_teacher_session', newId); } catch (err) {}
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
          >
            {effectiveSessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.session_name} ({s.package?.subject?.name || 'Umum'})
              </option>
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

      {/* Tabel Leger Nilai Mata Pelajaran */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        <table className="w-full text-left text-xs print:text-[11px] border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase tracking-wider text-[11px] print:bg-slate-200 print:text-black">
            <tr>
              <th className="py-3 px-3 text-center w-12 print:border print:border-black">No</th>
              <th className="py-3 px-4 print:border print:border-black">Nama Lengkap Siswa</th>
              <th className="py-3 px-3 text-center print:border print:border-black">NISN</th>
              <th className="py-3 px-3 text-center print:border print:border-black">Kelas</th>
              <th className="py-3 px-4 text-center print:border print:border-black">Skor Nilai</th>
              <th className="py-3 px-3 text-center print:border print:border-black">Ketuntasan (KKTP {kktpThreshold})</th>
              <th className="py-3 px-4 text-center print:hidden">Status</th>
              <th className="py-3 px-4 text-center print:hidden">Aksi Guru</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800 print:text-black">
            {filteredScores.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 print-avoid-break">
                <td className="py-3 px-3 text-center font-bold text-slate-500 print:text-black print:border print:border-black">
                  {s.no}
                </td>
                <td className="py-3 px-4 print:border print:border-black font-extrabold text-slate-900">
                  {s.name}
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold print:border print:border-black">
                  {s.nisn}
                </td>
                <td className="py-3 px-3 text-center font-semibold print:border print:border-black">
                  {s.grade_class}
                </td>
                <td className="py-3 px-4 text-center print:border print:border-black font-mono font-black text-sm">
                  {s.score !== null ? s.score : '-'}
                </td>
                <td className="py-3 px-3 text-center print:border print:border-black">
                  {s.score !== null ? (
                    s.isPassed ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 print:border-black print:text-black">
                        Tuntas
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 print:border-black print:text-black">
                        Remedial
                      </span>
                    )
                  ) : '-'}
                </td>
                <td className="py-3 px-4 text-center print:hidden">
                  {s.status === 'completed' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Selesai
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                      Belum Ujian
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center print:hidden">
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
                      className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 mx-auto transition-colors shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tinjau Lembar</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Belum Ujian</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tanda Tangan Resmi Cetak Leger */}
      <div className="hidden print:grid grid-cols-2 gap-8 pt-8 text-xs text-center text-black print-avoid-break mt-6">
        <div>
          <p>Mengetahui,</p>
          <p className="font-bold">Kepala Sekolah {school.name}</p>
          <div className="signature-space" style={{ height: '72px', minHeight: '72px' }} />
          <p className="font-bold underline uppercase">{school.principal_name || 'Aep Yayat, S.Pd.SD.'}</p>
          <p className="text-[11px] font-mono">NIP: {school.principal_nip || '19750812 200003 2 004'}</p>
        </div>

        <div>
          <p>{school.district || school.regency_city || 'Sumedang'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="font-bold">
            {(teacher.teacher_type === 'guru_kelas' || (!teacher.assigned_subject_name?.toLowerCase().includes('pjok') && !teacher.assigned_subject_name?.toLowerCase().includes('agama')))
              ? `Guru Kelas & Wali ${teacher.grade_class || 'Kelas'},`
              : `Guru Mata Pelajaran ${teacher.assigned_subject_name || 'Matematika'},`
            }
          </p>
          <div className="signature-space" style={{ height: '72px', minHeight: '72px' }} />
          <p className="font-bold underline uppercase">{teacher.full_name}</p>
          <p className="text-[11px] font-mono">NIP: {teacher.nip && teacher.nip !== '-' ? teacher.nip : '-'}</p>
        </div>
      </div>

      {/* Modal Tinjau Jawaban Siswa */}
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
              if (a.student_id === studentId) {
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

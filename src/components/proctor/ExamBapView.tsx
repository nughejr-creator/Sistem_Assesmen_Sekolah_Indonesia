import React, { useState, useEffect } from 'react';
import { School, UserProfile, ExamSession } from '../../types/database';
import { MOCK_EXAM_SESSION } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { fetchBapReportFromCloud, saveBapReportToCloud } from '../../lib/syncHelper';
import {
  FileText,
  Printer,
  Save,
  CheckCircle2,
  Calendar,
  Clock,
  Building,
  Users,
  AlertTriangle,
  Award,
  UserCheck
} from 'lucide-react';

interface ExamBapViewProps {
  school: School;
  proctorUser: UserProfile;
}

export const ExamBapView: React.FC<ExamBapViewProps> = ({ school, proctorUser }) => {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`sasi_supervisors_${school.id || 'default'}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  // Ambil NIP Proktor asli (BUKAN email/username login)
  const getInitialProctorNip = () => {
    try {
      const saved = localStorage.getItem(`sasi_proctor_nip_${proctorUser.id || school.id}`);
      if (saved) return saved;
    } catch (e) {}

    // Jangan pernah gunakan email sebagai NIP
    if (proctorUser.username && !proctorUser.username.includes('@') && /^\d{8,}$/.test(proctorUser.username.trim())) {
      return proctorUser.username.trim();
    }
    return '-';
  };

  // BAP Form Data
  const [bapData, setBapData] = useState({
    examDay: 'Senin',
    examDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    roomName: 'Ruang 01',
    timeStart: '07:30',
    timeEnd: '09:00',
    subjectName: 'Matematika - Asesmen Sumatif Akhir Semester (SAS)',
    totalRegistered: 0,
    totalPresent: 0,
    totalAbsent: 0,
    absentNames: '',
    incidentNotes: 'Pelaksanaan ujian CBT berjalan tertib, aman, dan lancar. Tidak ada kecurangan atau kendala teknis jaringan listrik.',
    supervisorName: '',
    supervisorNip: '',
    proctorName: proctorUser.full_name || 'Lia Afriliyanti, S.Pd.',
    proctorNip: getInitialProctorNip()
  });

  const findSupervisorForSession = (sessName: string, spvs: any[]) => {
    if (!sessName || spvs.length === 0) return null;
    const target = sessName.toLowerCase().trim();

    // 1. Exact match
    const exact = spvs.find(s => s.session_assigned && s.session_assigned.toLowerCase().trim() === target);
    if (exact) return exact;

    // 2. Partial match
    const partial = spvs.find(s => s.session_assigned && (
      target.includes(s.session_assigned.toLowerCase().trim()) ||
      s.session_assigned.toLowerCase().trim().includes(target)
    ));
    if (partial) return partial;

    // 3. Fallback: "Semua Sesi Ujian"
    const all = spvs.find(s => s.session_assigned && s.session_assigned.toLowerCase().includes('semua sesi'));
    return all || null;
  };

  const getSessionGrade = (sessionName: string) => {
    if (!sessionName) return null;
    const match = sessionName.match(/kelas\s*(\d+)/i) || sessionName.match(/grade\s*(\d+)/i);
    return match ? match[1] : null;
  };

  // Formula Realtime Rekapitulasi Kehadiran Peserta per Sesi
  const calculateSessionStats = (
    sess: ExamSession | undefined,
    allStudents: UserProfile[],
    allAttempts: any[]
  ) => {
    if (!sess) {
      return {
        totalRegistered: allStudents.length,
        totalPresent: 0,
        totalAbsent: allStudents.length,
        absentNames: '- Tidak ada sesi terpilih -'
      };
    }

    const sessGrade = getSessionGrade(sess.session_name);
    const sessionAttempts = allAttempts.filter(a => a.session_id === sess.id);

    // Filter siswa yang masuk lingkup kelas sesi ini
    const sessionStudents = allStudents.filter(st => {
      if (sessionAttempts.some(a => a.student_id === st.id)) return true;
      if (sessGrade) {
        const stGradeMatch = (st.grade_class || '').match(/(\d+)/);
        const stGrade = stGradeMatch ? stGradeMatch[1] : null;
        if (stGrade && stGrade !== sessGrade) return false;
      }
      return true;
    });

    const targetStudents = sessionStudents.length > 0 ? sessionStudents : allStudents;
    const totalRegistered = targetStudents.length;

    // Siswa yang hadir mengikuti tes di sesi ini
    const presentStudents = targetStudents.filter(st =>
      sessionAttempts.some(a => a.student_id === st.id && (a.status === 'completed' || a.status === 'working' || (a.final_score !== null && a.final_score !== undefined)))
    );
    const totalPresent = presentStudents.length;
    const totalAbsent = Math.max(0, totalRegistered - totalPresent);

    const absentStudents = targetStudents.filter(st =>
      !sessionAttempts.some(a => a.student_id === st.id && (a.status === 'completed' || a.status === 'working' || (a.final_score !== null && a.final_score !== undefined)))
    );

    let absentNames = '';
    if (absentStudents.length > 0) {
      absentNames = absentStudents
        .slice(0, 50)
        .map((st, idx) => `${idx + 1}. ${st.full_name} (${st.grade_class || 'Kelas 6'}) - Belum Mengerjakan`)
        .join('\n');
    } else {
      absentNames = '- Tidak ada peserta yang absen (Seluruh siswa hadir lengkap) -';
    }

    return {
      totalRegistered,
      totalPresent,
      totalAbsent,
      absentNames
    };
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const schId = school.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';

        // 1. Fetch Sessions
        const { data: sessData } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)')
          .order('created_at', { ascending: false });

        let finalSessions: ExamSession[] = [];
        if (sessData) {
          const matched = sessData.filter(s => school.id && s.school_id === school.id);
          finalSessions = matched as ExamSession[];
          setSessions(finalSessions);
        }

        // 2. Fetch Students Realtime
        const { data: stData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'student')
          .eq('school_id', schId)
          .order('full_name');

        const loadedStudents = (stData || []) as UserProfile[];
        setStudents(loadedStudents);

        // 3. Fetch Attempts Realtime
        const { data: attData } = await supabase
          .from('student_attempts')
          .select('*')
          .eq('school_id', schId);

        const loadedAttempts = attData || [];
        setAttempts(loadedAttempts);

        // 4. Fetch Supervisors
        const { data: spvData } = await supabase
          .from('supervisors')
          .select('*')
          .eq('school_id', schId)
          .order('name');

        const activeSpvs = spvData && spvData.length > 0 ? spvData : (
          (() => {
            try {
              const cached = localStorage.getItem(`sasi_supervisors_${school.id || 'default'}`);
              return cached ? JSON.parse(cached) : [];
            } catch (e) { return []; }
          })()
        );
        setSupervisors(activeSpvs);

        // Set initial session and real-time stats
        const initialSession = finalSessions[0];
        if (initialSession) {
          setSelectedSessionId(initialSession.id);
          const matchedSpv = findSupervisorForSession(initialSession.session_name, activeSpvs);
          const stats = calculateSessionStats(initialSession, loadedStudents, loadedAttempts);
          loadSavedBap(initialSession.id, stats, matchedSpv, initialSession.session_name);
        }
      } catch (e) {}
    };

    fetchAllData();
  }, [school.id]);

  // Real-time synchronization when supervisors are added/edited in ProctorSupervisorView
  useEffect(() => {
    const handleSupervisorsUpdated = (e: any) => {
      const spvs = e.detail && Array.isArray(e.detail) ? e.detail : (() => {
        try {
          const cached = localStorage.getItem(`sasi_supervisors_${school.id || 'default'}`);
          return cached ? JSON.parse(cached) : [];
        } catch (err) { return []; }
      })();
      setSupervisors(spvs);

      const activeSess = sessions.find(s => s.id === selectedSessionId) || sessions[0];
      if (activeSess) {
        const matchedSpv = findSupervisorForSession(activeSess.session_name, spvs);
        setBapData(prev => ({
          ...prev,
          roomName: matchedSpv?.room_assigned || prev.roomName,
          supervisorName: matchedSpv ? matchedSpv.name : '',
          supervisorNip: matchedSpv && matchedSpv.nip !== '-' ? matchedSpv.nip : ''
        }));
      }
    };

    window.addEventListener('sasi_supervisors_updated', handleSupervisorsUpdated);
    window.addEventListener('storage', handleSupervisorsUpdated);
    return () => {
      window.removeEventListener('sasi_supervisors_updated', handleSupervisorsUpdated);
      window.removeEventListener('storage', handleSupervisorsUpdated);
    };
  }, [school.id, sessions, selectedSessionId]);

  // Helper memuat BAP tersimpan (Lokal Cache & Cloud Supabase)
  const loadSavedBap = async (sessId: string, baseStats: any, matchedSpv: any, sessName: string) => {
    // 1. Coba baca dari cache lokal terlebih dahulu untuk kecepatan render
    let cachedBap: any = null;
    try {
      const raw = localStorage.getItem(`sasi_bap_${school.id}_${sessId}`);
      if (raw) cachedBap = JSON.parse(raw);
    } catch (e) {}

    if (cachedBap) {
      setBapData(prev => ({
        ...prev,
        ...cachedBap,
        subjectName: sessName,
        totalRegistered: baseStats.totalRegistered || cachedBap.totalRegistered || prev.totalRegistered,
        totalPresent: baseStats.totalPresent || cachedBap.totalPresent || prev.totalPresent,
        totalAbsent: baseStats.totalAbsent || cachedBap.totalAbsent || prev.totalAbsent,
        absentNames: baseStats.absentNames || cachedBap.absentNames || prev.absentNames
      }));
    } else {
      setBapData(prev => ({
        ...prev,
        subjectName: sessName,
        roomName: matchedSpv?.room_assigned || prev.roomName,
        supervisorName: matchedSpv ? matchedSpv.name : prev.supervisorName,
        supervisorNip: matchedSpv && matchedSpv.nip !== '-' ? matchedSpv.nip : prev.supervisorNip,
        totalRegistered: baseStats.totalRegistered,
        totalPresent: baseStats.totalPresent,
        totalAbsent: baseStats.totalAbsent,
        absentNames: baseStats.absentNames
      }));
    }

    // 2. Fetch dari Cloud Supabase di latar belakang untuk sinkronisasi lintas laptop/perangkat
    try {
      const cloudBap = await fetchBapReportFromCloud(school.id, sessId);
      if (cloudBap) {
        setBapData(prev => ({
          ...prev,
          ...cloudBap,
          subjectName: sessName,
          totalRegistered: baseStats.totalRegistered || cloudBap.totalRegistered || prev.totalRegistered,
          totalPresent: baseStats.totalPresent || cloudBap.totalPresent || prev.totalPresent,
          totalAbsent: baseStats.totalAbsent || cloudBap.totalAbsent || prev.totalAbsent,
          absentNames: baseStats.absentNames || cloudBap.absentNames || prev.absentNames
        }));
        try {
          localStorage.setItem(`sasi_bap_${school.id}_${sessId}`, JSON.stringify(cloudBap));
        } catch (e) {}
      }
    } catch (e) {}
  };

  const handleSessionChange = (sessId: string) => {
    setSelectedSessionId(sessId);
    const found = sessions.find(s => s.id === sessId);
    if (found) {
      const matchedSpv = findSupervisorForSession(found.session_name, supervisors);
      const stats = calculateSessionStats(found, students, attempts);
      loadSavedBap(found.id, stats, matchedSpv, found.session_name);
    }
  };

  const handleSaveBap = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (bapData.proctorNip && bapData.proctorNip !== '-') {
        localStorage.setItem(`sasi_proctor_nip_${proctorUser.id || school.id}`, bapData.proctorNip);
      }
      localStorage.setItem(`sasi_bap_${school.id}_${selectedSessionId}`, JSON.stringify(bapData));
    } catch (err) {}

    // Persistensi Cloud Supabase (Resilien & Tersinkronisasi Lintas Perangkat)
    try {
      await saveBapReportToCloud(school.id, selectedSessionId, bapData);
    } catch (cloudErr) {
      console.warn('Save BAP to cloud warning:', cloudErr);
    }

    setToastMessage('Dokumen Berita Acara Ujian (BAP) berhasil disimpan ke Cloud & Sistem.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-slide-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Berita Acara Pelaksanaan (BAP)</h2>
              <p className="text-xs text-slate-500">
                Laporan resmi jalannya ujian, jumlah peserta hadir, insiden khusus, dan pengesahan proktor & pengawas.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4 text-brand-300" />
          <span>Cetak BAP Resmi (PDF)</span>
        </button>
      </div>

      {/* Printable Sheet Wrapper */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Kop Surat Sekolah Resmi */}
        <div className="text-center space-y-1 pb-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 print:text-black">
            PEMERINTAH KABUPATEN/KOTA {school.regency_city?.toUpperCase() || 'SUMEDANG'}
          </h4>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 print:text-black">
            DINAS PENDIDIKAN DAN KEBUDAYAAN
          </h4>
          <h2 className="text-xl font-black uppercase text-slate-900 print:text-black">
            {school.name}
          </h2>
          <p className="text-xs text-slate-600 print:text-black">
            NPSN: {school.npsn} • Status: {school.status} • Akreditasi: {school.accreditation || 'A'}
          </p>
          <p className="text-[10px] text-slate-500 italic print:text-black">
            {school.address || 'Jl. Raya Pendidikan No. 45'}, {school.district}, {school.regency_city}
          </p>
          <div className="kop-border-thick" />
          <div className="kop-border-thin" />
        </div>

        {/* Title BAP */}
        <div className="text-center py-5 space-y-1">
          <h3 className="text-base font-black tracking-wider uppercase text-slate-900 print:text-black underline underline-offset-4">
            BERITA ACARA PELAKSANAAN ASESMEN / UJIAN
          </h3>
          <p className="text-xs font-semibold text-slate-600 print:text-black">
            Tahun Pelajaran 2026/2027
          </p>
        </div>

        {/* Form Isi BAP (Dual view: Form input in screen, pure document text in print) */}
        <form onSubmit={handleSaveBap} className="space-y-5 text-xs text-slate-800 print:text-black leading-relaxed">
          
          <p>
            Pada hari ini <span className="font-bold">{bapData.examDay}</span>, tanggal <span className="font-bold">{bapData.examDate}</span>, telah diselenggarakan Asesmen / Ujian Berbasis Komputer (CBT) untuk:
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 print:bg-transparent print:border-none print:p-0">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
              <div>
                <label className="font-bold text-slate-500 block mb-1">Pilih Sesi Ujian:</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => handleSessionChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>{s.session_name}</option>
                  ))}
                </select>
                <div className="mt-1 flex items-center space-x-1.5 text-[11px] text-slate-600">
                  <UserCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  <span className="font-medium">Pengawas:</span>
                  {bapData.supervisorName ? (
                    <span className="font-bold text-emerald-800">
                      {bapData.supervisorName}
                    </span>
                  ) : (
                    <span className="italic text-amber-700">
                      Belum Ada (Cetak Titik-titik)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Hari & Tanggal Ujian:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={bapData.examDay}
                    onChange={(e) => setBapData(p => ({ ...p, examDay: e.target.value }))}
                    className="w-24 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                  <input
                    type="text"
                    value={bapData.examDate}
                    onChange={(e) => setBapData(p => ({ ...p, examDate: e.target.value }))}
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Waktu Pelaksanaan (WIB):</label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={bapData.timeStart}
                    onChange={(e) => setBapData(p => ({ ...p, timeStart: e.target.value }))}
                    className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-mono font-bold"
                  />
                  <span>s.d.</span>
                  <input
                    type="text"
                    value={bapData.timeEnd}
                    onChange={(e) => setBapData(p => ({ ...p, timeEnd: e.target.value }))}
                    className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-center font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Document view for print */}
            <table className="w-full text-xs table-borderless">
              <tbody>
                <tr>
                  <td className="py-1 font-bold w-48">Mata Pelajaran / Asesmen</td>
                  <td className="py-1">: {bapData.subjectName}</td>
                </tr>
                <tr>
                  <td className="py-1 font-bold">Ruang Pelaksanaan Ujian</td>
                  <td className="py-1">: {bapData.roomName}</td>
                </tr>
                <tr>
                  <td className="py-1 font-bold">Waktu Ujian</td>
                  <td className="py-1">: Pukul {bapData.timeStart} s.d. {bapData.timeEnd} WIB</td>
                </tr>
              </tbody>
            </table>

          </div>

          {/* Rincian Peserta (Screen: Cards, Print: MS Word Style Bordered Table) */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 print:text-black">
              1. Rekapitulasi Kehadiran Peserta Ujian:
            </h4>

            {/* Screen View */}
            <div className="grid grid-cols-3 gap-3 print:hidden text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Jumlah Terdaftar</span>
                <span className="text-lg font-black text-slate-900">{bapData.totalRegistered} Siswa</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-emerald-700">Jumlah Hadir</span>
                <span className="text-lg font-black text-emerald-800">{bapData.totalPresent} Siswa</span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <span className="block text-[10px] uppercase font-bold text-rose-700">Tidak Hadir</span>
                <span className="text-lg font-black text-rose-800">{bapData.totalAbsent} Siswa</span>
              </div>
            </div>

            {/* Print View: MS Word Style Table */}
            <table className="hidden print:table w-full text-xs print-table border-collapse my-2">
              <thead>
                <tr>
                  <th className="w-12 print:border-[1.5px] print:border-black text-center">No</th>
                  <th className="text-left print:border-[1.5px] print:border-black">Kategori Rekapitulasi Peserta</th>
                  <th className="w-36 text-center print:border-[1.5px] print:border-black">Jumlah</th>
                  <th className="text-left print:border-[1.5px] print:border-black">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center font-bold print:border print:border-black">1</td>
                  <td className="font-semibold print:border print:border-black">Jumlah Peserta Terdaftar (DNT)</td>
                  <td className="text-center font-mono font-bold print:border print:border-black">{bapData.totalRegistered} Siswa</td>
                  <td className="print:border print:border-black">Sesuai daftar rombel sesi</td>
                </tr>
                <tr>
                  <td className="text-center font-bold print:border print:border-black">2</td>
                  <td className="font-semibold print:border print:border-black">Jumlah Peserta Hadir Mengikuti Tes</td>
                  <td className="text-center font-mono font-bold print:border print:border-black">{bapData.totalPresent} Siswa</td>
                  <td className="print:border print:border-black">Mengikuti ujian hingga selesai</td>
                </tr>
                <tr>
                  <td className="text-center font-bold print:border print:border-black">3</td>
                  <td className="font-semibold print:border print:border-black">Jumlah Peserta Tidak Hadir (Absen)</td>
                  <td className="text-center font-mono font-bold print:border print:border-black">{bapData.totalAbsent} Siswa</td>
                  <td className="print:border print:border-black">{bapData.totalAbsent > 0 ? 'Sakit / Izin / Alpa' : 'Nihil / Hadir Lengkap'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Rincian Siswa Tidak Hadir */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 print:text-black mb-1">
              2. Rincian Peserta Tidak Hadir:
            </h4>
            <textarea
              rows={2}
              value={bapData.absentNames}
              onChange={(e) => setBapData(p => ({ ...p, absentNames: e.target.value }))}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 print:hidden"
            />
            {/* Boxed output for print */}
            <div className="hidden print:block border border-black p-2 min-h-[38px] font-mono text-xs text-black">
              {bapData.absentNames ? bapData.absentNames : '- Tidak ada peserta yang absen (Seluruh siswa hadir lengkap) -'}
            </div>
          </div>

          {/* Catatan Khusus / Insiden */}
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 print:text-black mb-1">
              3. Catatan Integritas & Kejadian Khusus Selama Ujian:
            </h4>
            <textarea
              rows={3}
              value={bapData.incidentNotes}
              onChange={(e) => setBapData(p => ({ ...p, incidentNotes: e.target.value }))}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 print:hidden"
            />
            {/* Boxed output for print */}
            <div className="hidden print:block border border-black p-2.5 min-h-[50px] text-xs text-black">
              {bapData.incidentNotes ? bapData.incidentNotes : 'Pelaksanaan asesmen berlangsung dengan tertib, lancar, dan aman tanpa kendala teknis berarti.'}
            </div>
          </div>

          <p className="italic text-[11px] text-slate-500 print:text-black">
            Demikian Berita Acara ini dibuat dengan sesungguhnya dan penuh rasa tanggung jawab untuk dapat dipergunakan sebagaimana mestinya.
          </p>

          {/* Tanda Tangan Proktor & Pengawas */}
          <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs text-black print-avoid-break">
            
            {/* Proktor */}
            <div>
              <p className="invisible select-none print:block">&nbsp;</p>
              <p className="font-bold">Proktor Ruangan,</p>
              <div className="signature-space" style={{ height: '72px', minHeight: '72px' }} />
              <input
                type="text"
                value={bapData.proctorName}
                onChange={(e) => setBapData(p => ({ ...p, proctorName: e.target.value }))}
                className="w-full text-center font-bold underline uppercase bg-transparent border-none text-xs print:hidden"
                placeholder="Nama Proktor"
              />
              <p className="hidden print:block font-bold underline uppercase">{bapData.proctorName || 'Lia Afriliyanti, S.Pd.'}</p>
              
              {/* Input NIP Proktor on screen */}
              <div className="print:hidden mt-1 flex items-center justify-center space-x-1">
                <span className="text-[11px] font-mono text-slate-500">NIP:</span>
                <input
                  type="text"
                  value={bapData.proctorNip === '-' ? '' : bapData.proctorNip}
                  onChange={(e) => {
                    const val = e.target.value.trim() ? e.target.value : '-';
                    setBapData(p => ({ ...p, proctorNip: val }));
                    try { localStorage.setItem(`sasi_proctor_nip_${proctorUser.id || school.id}`, val); } catch (err) {}
                  }}
                  placeholder="Ketik NIP Proktor (atau tanda -)"
                  className="text-[11px] font-mono text-center bg-white border border-slate-300 rounded px-2 py-0.5 w-48 font-bold text-slate-800"
                />
              </div>

              {/* Print NIP Proktor */}
              <p className="text-[11px] font-mono hidden print:block">
                NIP: {bapData.proctorNip && bapData.proctorNip !== '-' ? bapData.proctorNip : '-'}
              </p>
            </div>

            {/* Pengawas */}
            <div>
              <p>{school.regency_city || 'Sumedang'}, {bapData.examDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold">Pengawas Ruang Ujian,</p>
              <div className="signature-space" style={{ height: '72px', minHeight: '72px' }} />
              <input
                type="text"
                value={bapData.supervisorName}
                onChange={(e) => setBapData(p => ({ ...p, supervisorName: e.target.value }))}
                className="w-full text-center font-bold underline uppercase bg-transparent border-none text-xs print:hidden"
                placeholder="Nama Pengawas"
              />
              <p className="hidden print:block font-bold underline uppercase">{bapData.supervisorName || '( .................................................... )'}</p>

              {/* Input NIP Pengawas on screen */}
              <div className="print:hidden mt-1 flex items-center justify-center space-x-1">
                <span className="text-[11px] font-mono text-slate-500">NIP:</span>
                <input
                  type="text"
                  value={bapData.supervisorNip}
                  onChange={(e) => setBapData(p => ({ ...p, supervisorNip: e.target.value }))}
                  placeholder="Ketik NIP Pengawas (opsional)"
                  className="text-[11px] font-mono text-center bg-white border border-slate-300 rounded px-2 py-0.5 w-48 font-bold text-slate-800"
                />
              </div>

              {/* Print NIP Pengawas */}
              <p className="text-[11px] font-mono hidden print:block">
                NIP: {bapData.supervisorNip && bapData.supervisorNip !== '-' ? bapData.supervisorNip : '................................................'}
              </p>
            </div>

          </div>

          {/* Mengetahui Kepala Sekolah */}
          <div className="pt-6 text-center text-xs text-black print-avoid-break">
            <p>Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah {school.name}</p>
            <div className="signature-space" style={{ height: '72px', minHeight: '72px' }} />
            <p className="font-bold underline uppercase">{school.principal_name || 'Aep Yayat, S.Pd.SD.'}</p>
            <p className="text-[11px] font-mono">NIP: {school.principal_nip || '19750812 200003 2 004'}</p>
          </div>

          {/* Action Button (Hidden on Print) */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3 print:hidden">
            <button
              type="submit"
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Berita Acara</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};

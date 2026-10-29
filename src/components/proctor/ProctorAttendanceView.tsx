import React, { useState, useEffect, useMemo } from 'react';
import { School, UserProfile, ExamSession } from '../../types/database';
import { MOCK_USERS, MOCK_EXAM_SESSION } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import {
  ClipboardCheck,
  Printer,
  Search,
  CheckCircle2,
  Filter,
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface ProctorAttendanceViewProps {
  school: School;
}

interface StudentAttendance {
  studentId: string;
  status: 'hadir' | 'sakit' | 'izin' | 'alpa';
  notes?: string;
}

export const ProctorAttendanceView: React.FC<ProctorAttendanceViewProps> = ({ school }) => {
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

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('auto');
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, StudentAttendance>>({});
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [supervisors, setSupervisors] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem(`sasi_supervisors_${school.id || 'default'}`);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  // Helper presisi untuk mengekstrak nomor tingkatan kelas (contoh: "Kelas 6", "Kls 6", "6-A", "VI")
  const extractGradeNumber = (str?: string | null): string | null => {
    if (!str) return null;
    const clean = str.trim();

    // 1. Eksplisit kata "Kelas X", "Kls X", "Kelas VI", dsb
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
    const matchClassShort = clean.match(/^(?:kelas\s*)?(1[0-2]|[1-9]|VI|IV|V|III|II|I)(?:[-/\s]?[A-Za-z]|\b)/i);
    if (matchClassShort) {
      const val = matchClassShort[1].toUpperCase();
      const romanMap: Record<string, string> = {
        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6',
        'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12'
      };
      return romanMap[val] || val;
    }

    // 3. Fallback jika ada angka 1-12
    const anyDigit = clean.match(/\b([1-9]|1[0-2])\b/);
    if (anyDigit) return anyDigit[1];

    return null;
  };

  // Helper untuk menentukan tingkatan kelas dari sesi ujian
  const getSessionGrade = (sess?: ExamSession | null): string | null => {
    if (!sess) return null;
    // 1. Dari session_name (contoh: "Sesi Ujian - SAS Matematika Kelas 6 SD" atau "Kelas 6-A")
    const fromName = extractGradeNumber(sess.session_name);
    if (fromName) return fromName;

    // 2. Dari package.title (contoh: "Sumatif Akhir Semester (SAS) Matematika Kelas 6 SD")
    const fromPkg = extractGradeNumber(sess.package?.title);
    if (fromPkg) return fromPkg;

    // 3. Fallback Fase Kurikulum Merdeka (Fase A = Kelas 1, Fase B = Kelas 4, Fase C = Kelas 6, dst)
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

  // Normalisasi kode rombel (contoh: "Kelas 6-A" -> "6-A")
  const normalizeClassCode = (str?: string | null): string => {
    if (!str) return '';
    return str.trim().replace(/^kelas\s*/i, '');
  };

  // Reset class filter ke 'auto' jika sesi berubah
  useEffect(() => {
    setSelectedClassFilter('auto');
  }, [selectedSessionId]);

  // Fetch real students, sessions, attempts, and supervisors from Supabase Cloud
  useEffect(() => {
    const fetchData = async () => {
      try {
        const schId = school.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';

        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)')
          .order('created_at', { ascending: false });

        if (cloudSessions) {
          const matched = cloudSessions.filter(
            s => s.school_id === schId
          );
          setSessions(matched as ExamSession[]);
          if (matched.length > 0) {
            if (!selectedSessionId || !matched.some(s => s.id === selectedSessionId)) {
              setSelectedSessionId(matched[0].id);
            }
          } else {
            setSelectedSessionId('');
          }
        }

        const { data: cloudStudents } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('role', 'student')
          .eq('school_id', schId)
          .order('full_name');

        if (cloudStudents) {
          setStudents(cloudStudents);
        } else {
          setStudents([]);
        }

        // Fetch Attempts
        const { data: cloudAttempts } = await supabase
          .from('student_attempts')
          .select('id, student_id, session_id, status, final_score')
          .eq('school_id', schId);

        if (cloudAttempts) {
          setAttempts(cloudAttempts);
        }

        // Fetch Supervisors
        const { data: spvData } = await supabase
          .from('supervisors')
          .select('*')
          .eq('school_id', schId)
          .order('name');

        if (spvData && spvData.length > 0) {
          setSupervisors(spvData);
          try {
            localStorage.setItem(`sasi_supervisors_${schId}`, JSON.stringify(spvData));
          } catch (err) {}
        }
      } catch (e) {
        setStudents(MOCK_USERS.filter(u => u.role === 'student'));
      }
    };

    fetchData();
  }, [school.id]);

  // Sync supervisors real-time when changed in ProctorSupervisorView
  useEffect(() => {
    const handleSupervisorsUpdated = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setSupervisors(e.detail);
      } else {
        try {
          const cached = localStorage.getItem(`sasi_supervisors_${school.id || 'default'}`);
          if (cached) setSupervisors(JSON.parse(cached));
        } catch (err) {}
      }
    };

    window.addEventListener('sasi_supervisors_updated', handleSupervisorsUpdated);
    window.addEventListener('storage', handleSupervisorsUpdated);
    return () => {
      window.removeEventListener('sasi_supervisors_updated', handleSupervisorsUpdated);
      window.removeEventListener('storage', handleSupervisorsUpdated);
    };
  }, [school.id]);

  const activeSession = sessions.find(s => s.id === selectedSessionId) || sessions[0] || MOCK_EXAM_SESSION;

  // Otomatis cari pengawas ruang yang ditugaskan pada sesi ini
  const activeSupervisor = useMemo(() => {
    if (!activeSession || supervisors.length === 0) return null;
    const sessName = (activeSession.session_name || '').toLowerCase().trim();

    // 1. Exact match dengan session_assigned
    const exact = supervisors.find(s => s.session_assigned && s.session_assigned.toLowerCase().trim() === sessName);
    if (exact) return exact;

    // 2. Partial match
    const partial = supervisors.find(s => s.session_assigned && (
      sessName.includes(s.session_assigned.toLowerCase().trim()) ||
      s.session_assigned.toLowerCase().trim().includes(sessName)
    ));
    if (partial) return partial;

    // 3. Fallback: "Semua Sesi Ujian"
    const all = supervisors.find(s => s.session_assigned && s.session_assigned.toLowerCase().includes('semua sesi'));
    if (all) return all;

    return null;
  }, [activeSession, supervisors]);

  // Initialize attendance records: preserve existing proctor marks
  useEffect(() => {
    if (students.length === 0) return;
    setAttendanceRecords(prev => {
      const next = { ...prev };
      students.forEach(st => {
        if (!next[st.id]) {
          const hasAttempt = attempts.some(a => a.student_id === st.id && a.session_id === activeSession?.id);
          next[st.id] = {
            studentId: st.id,
            status: hasAttempt || st.is_logged_in ? 'hadir' : 'hadir'
          };
        }
      });
      return next;
    });
  }, [students, attempts, activeSession?.id]);

  const handleStatusChange = (studentId: string, status: 'hadir' | 'sakit' | 'izin' | 'alpa') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { studentId }),
        status
      }
    }));
  };

  // 1. Tingkat kelas sesi aktif (contoh: "6", "4", atau null)
  const sessionGrade = useMemo(() => getSessionGrade(activeSession), [activeSession]);

  // 2. Daftar rombel unik yang ada di sekolah (dikelompokkan sesuai tingkat sesi bila ada)
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    students.forEach(st => {
      const cls = normalizeClassCode(st.grade_class);
      if (cls) {
        if (!sessionGrade || extractGradeNumber(cls) === sessionGrade) {
          classSet.add(cls);
        }
      }
    });
    return Array.from(classSet).sort();
  }, [students, sessionGrade]);

  // 3. Filter siswa sesuai tingkat kelas sesi dan seleksi rombel
  const eligibleStudents = useMemo(() => {
    return students.filter(st => {
      const studentGrade = extractGradeNumber(st.grade_class);
      const studentClassNorm = normalizeClassCode(st.grade_class);

      // Jika user memilih rombel tertentu secara manual
      if (selectedClassFilter !== 'auto' && selectedClassFilter !== 'all') {
        return studentClassNorm.toLowerCase() === selectedClassFilter.toLowerCase();
      }

      // Jika user memilih tampilkan semua rombel sekolah
      if (selectedClassFilter === 'all') {
        return true;
      }

      // Mode 'auto': otomatis hanya siswa yang satu tingkat kelas dengan sesi ujian
      if (sessionGrade) {
        // Siswa dari kelas/tingkatan lain (contoh: Kelas 4 di sesi Kelas 6) dikeluarkan secara mutlak
        if (studentGrade && studentGrade !== sessionGrade) {
          return false;
        }
        // Jika data siswa tidak punya informasi kelas sama sekali dan sesi memiliki kelas spesifik -> jangan sertakan
        if (!studentGrade) {
          return false;
        }
      }

      return true;
    });
  }, [students, sessionGrade, selectedClassFilter]);

  // 4. Filter akhir dengan pencarian nama / NISN / rombel
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return eligibleStudents;
    const q = searchQuery.toLowerCase();
    return eligibleStudents.filter(st => (
      st.full_name?.toLowerCase().includes(q) ||
      st.username?.toLowerCase().includes(q) ||
      st.grade_class?.toLowerCase().includes(q)
    ));
  }, [eligibleStudents, searchQuery]);

  // KPI dihitung spesifik berdasarkan daftar peserta yang tampil pada sesi / rombel terpilih
  const totalHadir = useMemo(() => 
    filteredStudents.filter(st => (attendanceRecords[st.id]?.status || 'hadir') === 'hadir').length,
    [filteredStudents, attendanceRecords]
  );
  const totalSakit = useMemo(() => 
    filteredStudents.filter(st => attendanceRecords[st.id]?.status === 'sakit').length,
    [filteredStudents, attendanceRecords]
  );
  const totalIzin = useMemo(() => 
    filteredStudents.filter(st => attendanceRecords[st.id]?.status === 'izin').length,
    [filteredStudents, attendanceRecords]
  );
  const totalAlpa = useMemo(() => 
    filteredStudents.filter(st => attendanceRecords[st.id]?.status === 'alpa').length,
    [filteredStudents, attendanceRecords]
  );

  return (
    <div className="space-y-6">
      
      {/* Printable Area Wrapper */}
      <div id="printable-attendance-sheet" className="space-y-6">
        
        {/* Header Banner (Hidden when Printing) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-brand-50 text-brand-600 rounded-xl">
                <ClipboardCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">Daftar Hadir Peserta Ujian</h2>
                <p className="text-xs text-slate-500">
                  Presensi kehadiran peserta tes per sesi dan cetak form tanda tangan kehadiran fisik/digital.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4 text-brand-300" />
              <span>Cetak Daftar Hadir (PDF)</span>
            </button>
          </div>
        </div>

        {/* Kop Surat Fisik Ujian (Tampil saat Cetak / Print Mode) */}
        <div className="hidden print:block p-0 bg-white text-center space-y-1 mb-4 text-black">
          <h3 className="text-xs font-bold uppercase tracking-wider">
            PEMERINTAH KABUPATEN/KOTA {school.regency_city?.toUpperCase() || 'SUMEDANG'}
          </h3>
          <h3 className="text-xs font-bold uppercase tracking-wider">
            DINAS PENDIDIKAN DAN KEBUDAYAAN
          </h3>
          <h1 className="text-xl font-black uppercase tracking-wide">
            {school.name}
          </h1>
          <p className="text-xs">
            NPSN: {school.npsn} • Status: {school.status} • Akreditasi: {school.accreditation || 'A'}
          </p>
          <p className="text-[11px] italic">
            Alamat: {school.address || 'Jl. Raya Pendidikan No. 45'}, {school.district}, {school.regency_city}
          </p>
          <div className="kop-border-thick" />
          <div className="kop-border-thin" />
          <h2 className="text-base font-black uppercase tracking-widest pt-2">
            DAFTAR HADIR PESERTA ASESMEN / UJIAN
          </h2>
          <p className="text-xs font-semibold">
            Tahun Pelajaran 2026/2027 • {activeSession.session_name}
            {selectedClassFilter !== 'auto' && selectedClassFilter !== 'all' ? ` • Kelas ${selectedClassFilter}` : ''}
          </p>
        </div>

        {/* Filter Sesi & KPI Bar (Hidden on Print) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center space-x-1.5">
                <label className="text-xs font-bold text-slate-600">Pilih Sesi Ujian:</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500"
                >
                  {sessions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.session_name} (Token: {s.token_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Rombel / Kelas Khusus Sesi Ini */}
              <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
                <Filter className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <label className="text-xs font-bold text-slate-700">Filter Rombel:</label>
                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
                >
                  <option value="auto">
                    {sessionGrade ? `Sesuai Sesi (Kelas ${sessionGrade})` : 'Semua Kelas'}
                  </option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                  <option value="all">Semua Siswa Sekolah (Tanpa Filter)</option>
                </select>
              </div>

              {/* Status Pengawas Sesi Otomatis */}
              <div className="flex items-center space-x-1.5 text-[11px] px-2.5 py-1 rounded-lg border bg-slate-50 border-slate-200">
                <UserCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span className="text-slate-500 font-medium">Pengawas:</span>
                {activeSupervisor ? (
                  <span className="font-bold text-slate-900">
                    {activeSupervisor.name} ({activeSupervisor.room_assigned})
                  </span>
                ) : (
                  <span className="font-semibold text-amber-700 italic">
                    Belum Ditugaskan (Cetak Titik-titik)
                  </span>
                )}
              </div>

              {/* Total Peserta Terdaftar Badge */}
              <div className="flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 font-bold">
                <Users className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                <span>{filteredStudents.length} Peserta</span>
              </div>
            </div>

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
          </div>

          {/* KPI Stat Hadir / Absen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-center">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Hadir</span>
              <span className="text-xl font-black text-emerald-800">{totalHadir}</span>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">Sakit (S)</span>
              <span className="text-xl font-black text-amber-800">{totalSakit}</span>
            </div>
            <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200">
              <span className="text-[10px] uppercase font-bold text-sky-700 block">Izin (I)</span>
              <span className="text-xl font-black text-sky-800">{totalIzin}</span>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-700 block">Alpa / Tanpa Ket (A)</span>
              <span className="text-xl font-black text-rose-800">{totalAlpa}</span>
            </div>
          </div>
        </div>

        {/* Tabel Daftar Hadir (MS Word Quality Print Table & Crisp Screen Grid) */}
        <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none">
          <table className="w-full text-left text-xs print:text-[11px] print-table border-collapse">
            <thead className="bg-sky-100 text-sky-950 font-black border-b-2 border-sky-300 uppercase tracking-wider text-[11px] print:bg-slate-200 print:text-black">
              <tr className="divide-x divide-sky-200 print:divide-x-0">
                <th className="py-2.5 px-2 text-center w-12 bg-sky-200/80 text-sky-950 font-black print:border-[1.5px] print:border-black print:w-10">NO.</th>
                <th className="py-2.5 px-3 print:border-[1.5px] print:border-black">Nama Lengkap Siswa</th>
                <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black print:w-28">NISN</th>
                <th className="py-2.5 px-3 text-center print:border-[1.5px] print:border-black print:w-20">Kelas</th>
                <th className="py-2.5 px-3 text-center print:hidden">Status Kehadiran</th>
                <th className="py-2.5 px-4 text-center w-48 print:border-[1.5px] print:border-black print:w-44">Tanda Tangan Kehadiran</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800 print:text-black">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium italic">
                    Tidak ada data peserta ujian untuk tingkatan / rombel ini.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                const currentStatus = attendanceRecords[st.id]?.status || 'hadir';

                return (
                  <tr key={st.id} className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors print-avoid-break print:divide-x-0">
                    <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50 print:bg-transparent print:text-black print:border print:border-black">
                      {idx + 1}
                    </td>

                    <td className="py-2 px-3 print:border print:border-black">
                      <div className="font-extrabold text-slate-900 print:text-black">{st.full_name}</div>
                      <div className="text-[10px] text-slate-400 print:text-black font-mono">No Peserta: {st.username}</div>
                    </td>

                    <td className="py-2 px-3 text-center font-mono font-bold print:text-black print:border print:border-black">
                      {st.username}
                    </td>

                    <td className="py-2 px-3 text-center font-semibold print:text-black print:border print:border-black">
                      Kelas {st.grade_class}
                    </td>

                    {/* Radio Status Kehadiran (Screen Only) */}
                    <td className="py-2 px-3 text-center print:hidden">
                      <div className="inline-flex items-center space-x-1 p-0.5 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'hadir')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            currentStatus === 'hadir'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Hadir
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'sakit')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            currentStatus === 'sakit'
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Sakit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'izin')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            currentStatus === 'izin'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Izin
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(st.id, 'alpa')}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                            currentStatus === 'alpa'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Alpa
                        </button>
                      </div>
                    </td>

                    {/* Kolom Tanda Tangan Cetak (Format Zig-Zag Resmi Ujian Indonesia) */}
                    <td className="py-2 px-3 text-left border-l border-slate-200 print:border print:border-black">
                      <div className="h-7 flex items-center">
                        {idx % 2 === 0 ? (
                          <span className="text-[11px] font-mono font-bold text-slate-700 print:text-black">
                            {idx + 1}. ......................................
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono font-bold text-slate-700 print:text-black ml-auto pr-2">
                            {idx + 1}. ......................................
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>

        {/* Lembar Tanda Tangan Bawah (Tampil saat Cetak) */}
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
            <p className="font-bold">Pengawas Ruang Ujian,</p>
            <div className="signature-space" style={{ height: '72px', minHeight: '72px' }} />
            {activeSupervisor ? (
              <>
                <p className="font-bold underline uppercase">{activeSupervisor.name}</p>
                <p className="text-[11px] font-mono">
                  NIP: {activeSupervisor.nip && activeSupervisor.nip !== '-' ? activeSupervisor.nip : '................................................'}
                </p>
              </>
            ) : (
              <>
                <p className="font-bold underline uppercase">( .................................................... )</p>
                <p className="text-[11px] font-mono">NIP: ................................................</p>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

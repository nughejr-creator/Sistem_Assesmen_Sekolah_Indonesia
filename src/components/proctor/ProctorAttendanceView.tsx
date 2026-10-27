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
  const [students, setStudents] = useState<UserProfile[]>([]);
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

  // Fetch real students, sessions, and supervisors from Supabase Cloud
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)')
          .order('created_at', { ascending: false });

        if (cloudSessions) {
          const matched = cloudSessions.filter(
            s => school.id && s.school_id === school.id
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
          .order('full_name');

        if (cloudStudents) {
          const matchedStudents = cloudStudents.filter(
            s => school.id && s.school_id === school.id
          );
          setStudents(matchedStudents);
        } else {
          setStudents([]);
        }

        // Fetch Supervisors
        const { data: spvData } = await supabase
          .from('supervisors')
          .select('*')
          .eq('school_id', school.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222')
          .order('name');

        if (spvData && spvData.length > 0) {
          setSupervisors(spvData);
          try {
            localStorage.setItem(`sasi_supervisors_${school.id || 'default'}`, JSON.stringify(spvData));
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

  // Initialize attendance records: students who are logged in or completed attempt default to 'hadir'
  useEffect(() => {
    const initialRecords: Record<string, StudentAttendance> = {};
    students.forEach(st => {
      initialRecords[st.id] = {
        studentId: st.id,
        status: st.is_logged_in ? 'hadir' : 'hadir' // default hadir, proktor can change
      };
    });
    setAttendanceRecords(initialRecords);
  }, [students]);

  const handleStatusChange = (studentId: string, status: 'hadir' | 'sakit' | 'izin' | 'alpa') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { studentId }),
        status
      }
    }));
  };

  const filteredStudents = students.filter(st => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      st.full_name?.toLowerCase().includes(q) ||
      st.username?.toLowerCase().includes(q) ||
      st.grade_class?.toLowerCase().includes(q)
    );
  });

  const totalHadir = Object.values(attendanceRecords).filter(a => a.status === 'hadir').length;
  const totalSakit = Object.values(attendanceRecords).filter(a => a.status === 'sakit').length;
  const totalIzin = Object.values(attendanceRecords).filter(a => a.status === 'izin').length;
  const totalAlpa = Object.values(attendanceRecords).filter(a => a.status === 'alpa').length;

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
          </p>
        </div>

        {/* Filter Sesi & KPI Bar (Hidden on Print) */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <label className="text-xs font-bold text-slate-600">Pilih Sesi Ujian:</label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.session_name} (Token: {s.token_code})
                  </option>
                ))}
              </select>

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
              {filteredStudents.map((st, idx) => {
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
              })}
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

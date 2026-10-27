import React, { useState, useEffect } from 'react';
import { School, ExamSession } from '../../types/database';
import { supabase } from '../../lib/supabase';
import {
  UserCheck,
  Plus,
  Search,
  Printer,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  ShieldCheck,
  Building,
  Calendar,
  GraduationCap,
  ArrowRight,
  UserPlus,
  RotateCcw
} from 'lucide-react';

export interface Supervisor {
  id: string;
  name: string;
  nip: string;
  origin_school: string; // Asal Sekolah (misal: "SDN 2 Jayagiri (Pengawas Silang)")
  room_assigned: string; // Ruang 01, Lab CBT 1
  session_assigned: string; // Sesi 1 & 2
  phone_number: string;
}

interface ProctorSupervisorViewProps {
  school: School;
}

export const ProctorSupervisorView: React.FC<ProctorSupervisorViewProps> = ({ school }) => {
  const storageKey = `sasi_supervisors_${school.id || 'default'}`;

  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch real supervisors, teachers, & sessions from Supabase Cloud on mount
  useEffect(() => {
    let isMounted = true;
    const schId = school.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';

    const fetchData = async () => {
      try {
        // 1. Fetch Supervisors
        const { data: spvData } = await supabase
          .from('supervisors')
          .select('*')
          .eq('school_id', schId)
          .order('name');

        if (isMounted && spvData) {
          setSupervisors(spvData as Supervisor[]);
          try {
            localStorage.setItem(storageKey, JSON.stringify(spvData));
          } catch (e) {}
        }

        // 2. Fetch Teachers of this school for auto-complete
        const { data: tchData } = await supabase
          .from('teachers')
          .select('*')
          .eq('school_id', schId)
          .order('full_name');

        if (isMounted && tchData) {
          setTeachers(tchData);
        }

        // 3. Fetch Exam Sessions of this school
        const { data: sessData } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)')
          .order('created_at', { ascending: false });

        if (isMounted && sessData) {
          const matched = sessData.filter(s => school.id && s.school_id === school.id);
          setSessions(matched as ExamSession[]);
        }

        if (isMounted) setIsLoading(false);
      } catch (err) {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [school.id, storageKey]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState('ALL');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
  const [formData, setFormData] = useState<Partial<Supervisor>>({
    name: '',
    nip: '',
    origin_school: '',
    room_assigned: 'Ruang 01',
    session_assigned: '',
    phone_number: ''
  });

  const [printCardSupervisor, setPrintCardSupervisor] = useState<Supervisor | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const saveToStorage = (data: Supervisor[]) => {
    setSupervisors(data);
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent('sasi_supervisors_updated', { detail: data }));
    } catch (e) {}
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditingSupervisor(null);
    setFormData({
      name: '',
      nip: '',
      origin_school: school.name || '',
      room_assigned: 'Ruang 01',
      session_assigned: sessions.length > 0 ? sessions[0].session_name : 'Semua Sesi Ujian',
      phone_number: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenTeacherPicker = () => {
    if (teachers.length === 0) {
      if (window.confirm('Belum ada data guru terdaftar untuk sekolah ini di database. Apakah Anda ingin menginput pengawas secara manual?')) {
        handleOpenAdd();
      }
      return;
    }
    setTeacherSearchQuery('');
    setIsTeacherModalOpen(true);
  };

  const handleSelectTeacher = (tch: any) => {
    setEditingSupervisor(null);
    setFormData({
      name: tch.full_name,
      nip: tch.nip_nuptk || '-',
      origin_school: school.name,
      room_assigned: 'Ruang 01',
      session_assigned: sessions.length > 0 ? sessions[0].session_name : 'Semua Sesi Ujian',
      phone_number: tch.phone_number || '-'
    });
    setIsTeacherModalOpen(false);
    setIsModalOpen(true);
    showToast(`Data guru ${tch.full_name} berhasil dimuat otomatis.`);
  };

  const handleOpenEdit = (s: Supervisor) => {
    setEditingSupervisor(s);
    setFormData(s);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Hapus pengawas ruang: ${name}?`)) {
      const updated = supervisors.filter(s => s.id !== id);
      saveToStorage(updated);
      try {
        await supabase.from('supervisors').delete().eq('id', id);
      } catch (e) {}
      showToast(`Pengawas ${name} berhasil dihapus.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const schId = school.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';

    if (editingSupervisor) {
      const updated = supervisors.map(s =>
        s.id === editingSupervisor.id ? ({ ...s, ...formData } as Supervisor) : s
      );
      saveToStorage(updated);
      try {
        await supabase
          .from('supervisors')
          .update({
            name: formData.name,
            nip: formData.nip,
            origin_school: formData.origin_school,
            room_assigned: formData.room_assigned,
            session_assigned: formData.session_assigned,
            phone_number: formData.phone_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSupervisor.id);
      } catch (e) {}
      showToast(`Data pengawas ${formData.name} berhasil diperbarui.`);
    } else {
      const tempId = `spv-${Date.now()}`;
      const newSpv: Supervisor = {
        id: tempId,
        name: formData.name,
        nip: formData.nip || '-',
        origin_school: formData.origin_school || school.name,
        room_assigned: formData.room_assigned || 'Ruang 01',
        session_assigned: formData.session_assigned || (sessions[0]?.session_name || 'Semua Sesi Ujian'),
        phone_number: formData.phone_number || '-'
      };
      saveToStorage([newSpv, ...supervisors]);

      try {
        const { data } = await supabase
          .from('supervisors')
          .insert({
            school_id: schId,
            name: formData.name,
            nip: formData.nip || '-',
            origin_school: formData.origin_school || school.name,
            room_assigned: formData.room_assigned || 'Ruang 01',
            session_assigned: formData.session_assigned || (sessions[0]?.session_name || 'Semua Sesi Ujian'),
            phone_number: formData.phone_number || '-'
          })
          .select();

        if (data && data[0]) {
          setSupervisors(prev => prev.map(s => s.id === tempId ? (data[0] as Supervisor) : s));
        }
      } catch (e) {}

      showToast(`Pengawas ${formData.name} berhasil didaftarkan.`);
    }

    setIsModalOpen(false);
  };

  const availableRooms = Array.from(new Set(supervisors.map(s => s.room_assigned).filter(Boolean))).sort();
  const availableSessions = Array.from(new Set(supervisors.map(s => s.session_assigned).filter(Boolean))).sort();

  const filteredSupervisors = supervisors.filter(s => {
    const matchRoom = selectedRoomFilter === 'ALL' || s.room_assigned === selectedRoomFilter;
    const matchSession = selectedSessionFilter === 'ALL' || s.session_assigned === selectedSessionFilter;
    if (!searchQuery.trim()) return matchRoom && matchSession;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = (
      s.name.toLowerCase().includes(q) ||
      s.nip.toLowerCase().includes(q) ||
      s.origin_school.toLowerCase().includes(q) ||
      s.room_assigned.toLowerCase().includes(q)
    );
    return matchRoom && matchSession && matchSearch;
  });

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRoomFilter('ALL');
    setSelectedSessionFilter('ALL');
  };

  const isAnyFilterActive = searchQuery.trim() !== '' || selectedRoomFilter !== 'ALL' || selectedSessionFilter !== 'ALL';

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
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900">Data Pengawas Ruang Ujian</h2>
              <p className="text-xs text-slate-500">
                Pencatatan pengawas ruang (pengawas silang maupun mandiri) dan cetak kartu tanda pengawas resmi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenTeacherPicker}
            className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Pilih langsung dari daftar guru sekolah ini"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Pilih dari Dewan Guru ({teachers.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Tambah pengawas silang dari sekolah lain atau manual"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Manual / Luar</span>
          </button>
        </div>
      </div>

      {/* Control Panel: Search & Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pengawas, NIP, atau asal sekolah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
            />
          </div>

          {/* Filter Ruangan */}
          {availableRooms.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Ruang:</span>
              <select
                value={selectedRoomFilter}
                onChange={(e) => setSelectedRoomFilter(e.target.value)}
                className="text-xs px-2.5 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Ruangan</option>
                {availableRooms.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filter Sesi */}
          {availableSessions.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Sesi:</span>
              <select
                value={selectedSessionFilter}
                onChange={(e) => setSelectedSessionFilter(e.target.value)}
                className="text-xs px-2.5 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Sesi</option>
                {availableSessions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
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

          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 whitespace-nowrap">
            {filteredSupervisors.length} Pengawas Ditampilkan
          </span>
        </div>
      </div>

      {/* Table Container: Grid Bersekat Tegas & High-Density */}
      <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-sky-100 text-sky-950 font-black uppercase tracking-wider text-[11px] border-b-2 border-sky-300">
              <tr className="divide-x divide-sky-200">
                <th className="py-2.5 px-2 text-center w-12 bg-sky-200/80 text-sky-950 font-black">NO.</th>
                <th className="py-2.5 px-3 min-w-[220px]">NAMA PENGAWAS & NIP</th>
                <th className="py-2.5 px-3 min-w-[180px]">ASAL SEKOLAH</th>
                <th className="py-2.5 px-3 w-32">PENUGASAN RUANGAN</th>
                <th className="py-2.5 px-3 w-28">SESI BERTUGAS</th>
                <th className="py-2.5 px-3 w-32 text-center">CETAK KARTU</th>
                <th className="py-2.5 px-3 w-24 text-center">AKSI</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredSupervisors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                    Belum ada data pengawas ruang yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredSupervisors.map((spv, index) => (
                  <tr 
                    key={spv.id} 
                    className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors"
                  >
                    {/* 1. NOMOR URUT DINAMIS */}
                    <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                      {index + 1}
                    </td>

                    {/* 2. NAMA & NIP */}
                    <td className="py-2 px-3">
                      <div className="font-extrabold text-slate-900 text-xs leading-tight">{spv.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        NIP: {spv.nip || '-'}
                      </div>
                    </td>

                    {/* 3. ASAL SEKOLAH */}
                    <td className="py-2 px-3 font-semibold text-slate-700 text-xs">
                      {spv.origin_school}
                    </td>

                    {/* 4. PENUGASAN RUANGAN */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {spv.room_assigned}
                      </span>
                    </td>

                    {/* 5. SESI BERTUGAS */}
                    <td className="py-2 px-3 font-bold text-brand-900 text-xs whitespace-nowrap">
                      {spv.session_assigned}
                    </td>

                    {/* 6. CETAK KARTU */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setPrintCardSupervisor(spv)}
                        className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold rounded-lg border border-brand-200 text-[10px] flex items-center justify-center space-x-1 mx-auto transition-colors"
                      >
                        <Printer className="w-3 h-3 text-brand-600" />
                        <span>Cetak ID Card</span>
                      </button>
                    </td>

                    {/* 7. AKSI */}
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(spv)}
                          className="p-1 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-slate-200"
                          title="Edit Pengawas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(spv.id, spv.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                          title="Hapus Pengawas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modal Add / Edit Pengawas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-extrabold text-sm text-slate-900">
                {editingSupervisor ? 'Edit Data Pengawas' : 'Tambah Pengawas Ruang'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
              
              {/* Quick Select from School Teachers */}
              {teachers.length > 0 && !editingSupervisor && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl space-y-1.5">
                  <label className="block text-brand-900 font-extrabold text-[11px] flex items-center space-x-1.5">
                    <GraduationCap className="w-4 h-4 text-brand-600" />
                    <span>Pilih Otomatis dari Dewan Guru {school.name}:</span>
                  </label>
                  <select
                    onChange={(e) => {
                      const found = teachers.find(t => t.id === e.target.value);
                      if (found) {
                        setFormData(prev => ({
                          ...prev,
                          name: found.full_name,
                          nip: found.nip_nuptk || '-',
                          origin_school: school.name,
                          phone_number: found.phone_number || '-'
                        }));
                        showToast(`Data guru ${found.full_name} dimuat otomatis!`);
                      }
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-brand-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">-- Pilih Nama Guru (Otomatis Terisi) --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.subject_specialty || 'Guru'}) - NIP: {t.nip_nuptk || '-'}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-brand-600 italic">
                    Nama, NIP, Asal Sekolah ({school.name}), dan Kontak akan terisi otomatis.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-bold mb-1">Nama Lengkap Pengawas *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  value={formData.name || ''}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">NIP / NUPTK</label>
                <input
                  type="text"
                  placeholder="NIP Pengawas (opsional jika honorer)"
                  value={formData.nip || ''}
                  onChange={(e) => setFormData(p => ({ ...p, nip: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Asal Sekolah (Pengawas Silang / Mandiri)</label>
                <input
                  type="text"
                  placeholder="Contoh: SDN 2 Mekarwangi (Pengawas Silang)"
                  value={formData.origin_school || ''}
                  onChange={(e) => setFormData(p => ({ ...p, origin_school: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Ruangan Ujian</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ruang 01 / Lab CBT"
                    value={formData.room_assigned || ''}
                    onChange={(e) => setFormData(p => ({ ...p, room_assigned: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Pilih Sesi Ujian Bertugas *
                  </label>
                  <select
                    value={formData.session_assigned || ''}
                    onChange={(e) => setFormData(p => ({ ...p, session_assigned: e.target.value }))}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 text-xs"
                  >
                    <option value="">-- Pilih Sesi Ujian --</option>
                    <option value="Semua Sesi Ujian">Semua Sesi Ujian (Bertugas Penuh)</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.session_name}>
                        {s.session_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-2.5 bg-brand-50 border border-brand-200 rounded-xl text-[11px] text-brand-900 leading-snug">
                <strong>Otomatisasi Sistem:</strong> Pengawas yang dipilih pada sesi di atas akan secara otomatis dicantumkan pada lembar <strong>Cetak Daftar Hadir</strong> dan <strong>Berita Acara (BAP)</strong>. Jika belum ada pengawas untuk suatu sesi, lembar cetak otomatis menampilkan tanda titik-titik.
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">No. WhatsApp / HP</label>
                <input
                  type="text"
                  placeholder="08xxxxxxxxxx"
                  value={formData.phone_number || ''}
                  onChange={(e) => setFormData(p => ({ ...p, phone_number: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md"
                >
                  {editingSupervisor ? 'Simpan' : 'Daftarkan Pengawas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cetak Kartu Pengawas */}
      {printCardSupervisor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print:static print:inset-auto print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-scale-up print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none">
            
            {/* Kartu Fisik Preview */}
            <div className="p-5 rounded-2xl border-2 border-slate-900 bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-md print:border-[1.5px] print:border-black print:rounded-none print:bg-white print:shadow-none print:w-80 print:mx-auto print-avoid-break">
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-700 border-b pb-1.5 mb-3 border-slate-300 print:text-black print:border-black">
                KARTU TANDA PENGAWAS RUANG
              </div>

              <div className="w-16 h-16 rounded-full bg-slate-200 border-2 border-slate-400 mx-auto flex items-center justify-center font-black text-xl text-slate-700 mb-3 print:border-black print:bg-white print:text-black">
                {printCardSupervisor.name.charAt(0)}
              </div>

              <div className="font-black text-sm text-slate-900 print:text-black">
                {printCardSupervisor.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5 print:text-black">
                NIP: {printCardSupervisor.nip}
              </div>

              <div className="mt-3 py-2 px-3 bg-brand-50 rounded-xl border border-brand-200 text-xs text-left space-y-1 print:bg-white print:border-[1.5px] print:border-black print:rounded-none print:text-black">
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-black">Asal:</span>
                  <span className="font-bold text-slate-800 print:text-black truncate max-w-[170px]">{printCardSupervisor.origin_school}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-black">Lokasi:</span>
                  <span className="font-bold text-slate-800 print:text-black">{printCardSupervisor.room_assigned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 print:text-black">Sekolah:</span>
                  <span className="font-bold text-slate-800 print:text-black">{school.name}</span>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-200 text-[9px] text-slate-400 flex items-center justify-between print:border-black print:text-black">
                <span>SASI CBT 2026</span>
                <span>Tanda Tangan Pengawas</span>
              </div>
            </div>

            <div className="mt-5 flex items-center space-x-2 print:hidden">
              <button
                type="button"
                onClick={() => setPrintCardSupervisor(null)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Kartu</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Dialog: Pilih dari Dewan Guru */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-up">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-brand-600" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Pilih Guru Sebagai Pengawas Ruang
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Daftar guru dari {school.name} yang dapat ditugaskan mengawasi ruangan CBT.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Teacher Input */}
            <div className="my-4 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama guru atau NIP..."
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* List of Teachers */}
            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {teachers
                .filter(t => {
                  if (!teacherSearchQuery.trim()) return true;
                  const q = teacherSearchQuery.toLowerCase();
                  return t.full_name?.toLowerCase().includes(q) || t.nip_nuptk?.toLowerCase().includes(q);
                })
                .map((tch) => (
                  <div
                    key={tch.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-brand-50/50 hover:border-brand-300 transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{tch.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        NIP: {tch.nip_nuptk || '-'} • Mapel: {tch.subject_specialty || 'Guru'}
                      </div>
                      {tch.homeroom_class && tch.homeroom_class !== '-' && (
                        <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-brand-100 text-brand-800">
                          {tch.homeroom_class}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectTeacher(tch)}
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 shadow-xs"
                    >
                      <span>Tugaskan</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTeacherModalOpen(false)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

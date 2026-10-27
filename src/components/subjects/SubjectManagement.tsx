import React, { useState, useEffect } from 'react';
import { Subject, SchoolLevel } from '../../types/database';
import { MOCK_SUBJECTS } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Database, 
  X, 
  BookMarked,
  Layers,
  Filter,
  GraduationCap
} from 'lucide-react';
import { generateValidUUID, toValidUUID, mergeCloudAndLocal, safeSupabaseUpsert, isObsoleteSubject } from '../../lib/syncHelper';

const STORAGE_KEY = 'sasi_subjects_cache';

export const SubjectManagement: React.FC = () => {
  // Persistent Subjects State (Otomatis menyaring mapel obsolete)
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((s: Subject) => !isObsoleteSubject(s));
        }
      }
    } catch (e) {}
    return MOCK_SUBJECTS.filter((s: Subject) => !isObsoleteSubject(s));
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeLevel, setActiveLevel] = useState<'SD' | 'SMP' | null>(null);

  // Cloud Database Connection State
  const [cloudStatus, setCloudStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('checking');
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Modal State for Add / Edit
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Form State (No Phase - General / Global)
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<SchoolLevel>('SD');

  // Notification
  const [notification, setNotification] = useState<string | null>(null);
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const persistSubjects = (updatedList: Subject[]) => {
    setSubjects(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {}
  };

  // Fetch cloud subjects on mount non-destructively
  useEffect(() => {
    let isMounted = true;
    const fetchCloud = async () => {
      setCloudStatus('checking');
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .order('level', { ascending: true })
          .order('name', { ascending: true });

        if (error) {
          setCloudStatus('error');
          setCloudError(error.message);
          return;
        }

        if (data && isMounted) {
          setCloudStatus('connected');
          setCloudError(null);

          // 1. Auto-cleanup jika ada data obsolete yang masuk ke cloud
          const obsoleteInCloud = (data as Subject[]).filter(s => isObsoleteSubject(s));
          if (obsoleteInCloud.length > 0) {
            for (const obs of obsoleteInCloud) {
              supabase.from('subjects').delete().eq('id', obs.id).then(() => {});
            }
          }

          // 2. Saring data bersih
          const cleanCloud = (data as Subject[]).filter(s => !isObsoleteSubject(s));
          const cleanLocal = subjects.filter(s => !isObsoleteSubject(s));

          // Use keyMatcher (name + level) so subjects like Matematika never duplicate!
          const { merged, localOnly } = mergeCloudAndLocal(
            cleanCloud,
            cleanLocal,
            s => `${s.name.toLowerCase().trim()}_${s.level}`
          );

          const finalMerged = merged.filter(s => !isObsoleteSubject(s));
          persistSubjects(finalMerged);

          // Push any local subjects that aren't in cloud yet (hanya yang valid)
          const validLocalOnly = localOnly.filter(s => !isObsoleteSubject(s));
          if (validLocalOnly.length > 0) {
            for (const s of validLocalOnly) {
              const subjectPhase = s.phase || (s.level === 'SMP' ? 'D' : 'B');
              await safeSupabaseUpsert('subjects', {
                id: toValidUUID(s.id),
                code: s.code,
                name: s.name,
                level: s.level,
                phase: subjectPhase
              });
            }
          }
        }
      } catch (e: any) {
        console.warn('Sync subjects error:', e);
        setCloudStatus('error');
        setCloudError(e?.message || 'Gagal sinkronisasi cloud');
      }
    };
    fetchCloud();
    return () => { isMounted = false; };
  }, []);

  // Filter logic: Level & Search
  const filteredSubjects = subjects.filter((s) => {
    const matchSearch = 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchLevel = !activeLevel || s.level === activeLevel;
    return matchSearch && matchLevel;
  });

  const sdCount = subjects.filter(s => s.level === 'SD').length;
  const smpCount = subjects.filter(s => s.level === 'SMP').length;

  // Open Create Modal
  const openCreateModal = () => {
    setEditingSubject(null);
    setCode('');
    setName('');
    setLevel(activeLevel || 'SD');
    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setCode(sub.code);
    setName(sub.name);
    setLevel(sub.level);
    setShowModal(true);
  };

  // Save Subject (Add / Edit)
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const generatedCode = code.trim().toUpperCase() || `${name.substring(0, 3).toUpperCase()}-${level}`;
    const subjectPhase = level === 'SMP' ? 'D' : 'B';

    if (editingSubject) {
      const validId = toValidUUID(editingSubject.id);
      const updatedSubject: Subject = {
        ...editingSubject,
        id: validId,
        code: generatedCode,
        name: name.trim(),
        level,
        phase: subjectPhase
      };

      const updated = subjects.map(s => (s.id === editingSubject.id || s.id === validId) ? updatedSubject : s);
      persistSubjects(updated);

      const res = await safeSupabaseUpsert('subjects', {
        id: validId,
        code: generatedCode,
        name: name.trim(),
        level,
        phase: subjectPhase
      });

      if (res.success) {
        setCloudStatus('connected');
        notify(`Mata pelajaran "${name}" berhasil diperbarui & tersimpan ke Cloud Supabase!`);
      } else {
        setCloudStatus('error');
        notify(`Mata pelajaran "${name}" diperbarui di cache lokal, kendala cloud: ${res.error?.message || 'Koneksi terputus'}`);
      }
    } else {
      const newId = generateValidUUID();
      const newSubject: Subject = {
        id: newId,
        code: generatedCode,
        name: name.trim(),
        level,
        phase: subjectPhase,
        created_at: new Date().toISOString()
      };

      const updated = [...subjects, newSubject];
      persistSubjects(updated);

      const res = await safeSupabaseUpsert('subjects', {
        id: newSubject.id,
        code: newSubject.code,
        name: newSubject.name,
        level: newSubject.level,
        phase: newSubject.phase
      });

      if (res.success) {
        setCloudStatus('connected');
        notify(`Mata pelajaran baru "${name}" berhasil ditambahkan & tersimpan ke Cloud Supabase!`);
      } else {
        setCloudStatus('error');
        notify(`Mata pelajaran baru "${name}" tersimpan di cache lokal, kendala cloud: ${res.error?.message || 'Koneksi terputus'}`);
      }
    }

    setShowModal(false);
  };

  // Delete Subject
  const handleDeleteSubject = async (sub: Subject) => {
    if (window.confirm(`Hapus mata pelajaran "${sub.name}" (${sub.level}) dari sistem?`)) {
      const validId = toValidUUID(sub.id);
      const updated = subjects.filter(s => s.id !== sub.id && s.id !== validId && !(s.name === sub.name && s.level === sub.level));
      persistSubjects(updated);

      let deleteSuccess = false;
      try {
        const { error: idErr } = await supabase.from('subjects').delete().eq('id', validId);
        if (!idErr) {
          deleteSuccess = true;
        } else {
          // If error (or if sub had a different ID in Supabase), try deleting by code & level
          const { error: codeErr } = await supabase.from('subjects').delete().eq('code', sub.code).eq('level', sub.level);
          if (!codeErr) deleteSuccess = true;
        }
      } catch (err: any) {
        console.warn('Delete subject error:', err);
      }

      if (deleteSuccess) {
        setCloudStatus('connected');
        notify(`Mata pelajaran "${sub.name}" berhasil dihapus dari Cloud Database Supabase.`);
      } else {
        notify(`Mata pelajaran "${sub.name}" dihapus dari sistem lokal.`);
      }
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-sm font-bold animate-slide-left">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Ramping */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-black text-brand-700 uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <span>Master Kurikulum Nasional</span>
            <span className="text-slate-300">•</span>
            {cloudStatus === 'connected' && (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] px-2.5 py-0.5 rounded-full flex items-center space-x-1 font-bold shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Cloud Database Aktif</span>
              </span>
            )}
            {cloudStatus === 'checking' && (
              <span className="bg-sky-50 text-sky-800 border border-sky-300 text-[11px] px-2.5 py-0.5 rounded-full flex items-center space-x-1 font-bold shadow-2xs">
                <Database className="w-3 h-3 text-sky-600 animate-spin" />
                <span>Sinkronisasi Cloud...</span>
              </span>
            )}
            {cloudStatus === 'error' && (
              <span className="bg-rose-50 text-rose-800 border border-rose-300 text-[11px] px-2.5 py-0.5 rounded-full flex items-center space-x-1 font-bold shadow-2xs" title={cloudError || ''}>
                <Database className="w-3 h-3 text-rose-600" />
                <span>Cloud Offline</span>
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Daftar Mata Pelajaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Mata pelajaran bersifat umum per jenjang (SD / SMP) tanpa pembatasan fase.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center space-x-2 shadow-sm transition-all transform active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Mata Pelajaran</span>
        </button>
      </div>

      {/* 2 Tombol Besar Berdasarkan Jenjang (SD & SMP) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-brand-600" />
            <span>Pilih Jenjang Mata Pelajaran:</span>
          </div>
          {activeLevel !== null && (
            <button
              type="button"
              onClick={() => setActiveLevel(null)}
              className="text-xs text-brand-600 hover:text-brand-800 font-bold hover:underline transition-colors flex items-center space-x-1"
            >
              <span>✕ Sembunyikan Tabel</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tombol Besar Jenjang SD */}
          <button
            type="button"
            onClick={() => setActiveLevel(prev => prev === 'SD' ? null : 'SD')}
            className={`group relative flex items-center justify-between p-5 sm:p-6 rounded-3xl text-left transition-all duration-200 border-2 ${
              activeLevel === 'SD'
                ? 'bg-rose-950 text-white border-rose-900 shadow-xl shadow-rose-950/20 scale-[1.01]'
                : 'bg-white hover:bg-rose-50/60 text-slate-800 border-rose-200/90 hover:border-rose-400 shadow-xs hover:shadow-md'
            }`}
            title={activeLevel === 'SD' ? "Klik lagi untuk menyembunyikan daftar" : "Klik untuk menampilkan daftar mapel SD"}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
                activeLevel === 'SD' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
              }`}>
                <GraduationCap className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-lg sm:text-xl leading-tight">
                    Jenjang SD
                  </h3>
                  {activeLevel === 'SD' && (
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-500 text-white tracking-wider">
                      Aktif
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${activeLevel === 'SD' ? 'text-rose-200' : 'text-slate-500'}`}>
                  Fase A, Fase B, Fase C (Kelas 1 - 6)
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 ml-3">
              <span className={`inline-block text-sm font-black px-3.5 py-1.5 rounded-xl ${
                activeLevel === 'SD' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {sdCount} <span className="font-medium text-xs opacity-80">Mata Pelajaran</span>
              </span>
            </div>
          </button>

          {/* Tombol Besar Jenjang SMP */}
          <button
            type="button"
            onClick={() => setActiveLevel(prev => prev === 'SMP' ? null : 'SMP')}
            className={`group relative flex items-center justify-between p-5 sm:p-6 rounded-3xl text-left transition-all duration-200 border-2 ${
              activeLevel === 'SMP'
                ? 'bg-sky-950 text-white border-sky-900 shadow-xl shadow-sky-950/20 scale-[1.01]'
                : 'bg-white hover:bg-sky-50/60 text-slate-800 border-sky-200/90 hover:border-sky-400 shadow-xs hover:shadow-md'
            }`}
            title={activeLevel === 'SMP' ? "Klik lagi untuk menyembunyikan daftar" : "Klik untuk menampilkan daftar mapel SMP"}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs ${
                activeLevel === 'SMP' ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-700'
              }`}>
                <BookOpen className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-black text-lg sm:text-xl leading-tight">
                    Jenjang SMP
                  </h3>
                  {activeLevel === 'SMP' && (
                    <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-500 text-white tracking-wider">
                      Aktif
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${activeLevel === 'SMP' ? 'text-sky-200' : 'text-slate-500'}`}>
                  Fase D (Kelas 7 - 9)
                </p>
              </div>
            </div>

            <div className="text-right shrink-0 ml-3">
              <span className={`inline-block text-sm font-black px-3.5 py-1.5 rounded-xl ${
                activeLevel === 'SMP' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-800 border border-sky-200'
              }`}>
                {smpCount} <span className="font-medium text-xs opacity-80">Mata Pelajaran</span>
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Tampilkan Search & Tabel hanya jika jenjang (SD atau SMP) telah dipilih */}
      {activeLevel !== null && (
        <div className="space-y-4 animate-fade-in">
          {/* Kotak Filter & Pencarian Ramping */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Cari nama atau kode mapel jenjang ${activeLevel}...`}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className={`text-xs font-black px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 ${
                activeLevel === 'SD'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}>
                <span>Jenjang Aktif: <strong>{activeLevel} ({activeLevel === 'SD' ? 'Fase A-C' : 'Fase D'})</strong></span>
              </div>
              <span className="text-xs sm:text-sm font-black text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-200 whitespace-nowrap">
                {filteredSubjects.length} Mata Pelajaran
              </span>
            </div>
          </div>

          {/* Tabel Berbaris Ramping & Berkandang Rapi */}
          <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-sky-100 border-b-2 border-sky-300 text-sky-950 font-black uppercase tracking-wider text-[11px]">
                  <tr className="divide-x divide-sky-200">
                    <th className="py-2.5 px-2 text-center w-12 bg-sky-200/80 text-sky-950 font-black">NO.</th>
                    <th className="py-2.5 px-3 w-28">Kode Mapel</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Nama Mata Pelajaran</th>
                    <th className="py-2.5 px-3 w-36">Jenjang Sekolah</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Cakupan Tingkat</th>
                    <th className="py-2.5 px-3 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400 bg-slate-50/40">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        <p className="font-semibold text-xs text-slate-600">Tidak ada mata pelajaran jenjang {activeLevel} yang cocok dengan filter.</p>
                        <button
                          type="button"
                          onClick={() => { setSearchTerm(''); }}
                          className="mt-2 text-xs font-bold text-brand-600 hover:underline"
                        >
                          Reset Pencarian
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((sub, index) => {
                      const isSD = sub.level === 'SD';
                      return (
                        <tr 
                          key={sub.id} 
                          className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors group"
                        >
                          {/* No */}
                          <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                            {index + 1}
                          </td>

                          {/* Kode Mapel */}
                          <td className="py-2 px-3 font-mono font-bold text-slate-700 text-xs">
                            <span className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-[11px]">
                              {sub.code}
                            </span>
                          </td>

                          {/* Nama Mata Pelajaran */}
                          <td className="py-2 px-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                                isSD ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-700'
                              }`}>
                                <BookMarked className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-slate-900 text-xs group-hover:text-brand-700 transition-colors">
                                {sub.name}
                              </span>
                            </div>
                          </td>

                          {/* Jenjang */}
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-black ${
                              isSD 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                                : 'bg-purple-50 text-purple-800 border border-purple-300'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isSD ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
                              <span>{isSD ? 'Jenjang SD' : 'Jenjang SMP'}</span>
                            </span>
                          </td>

                          {/* Cakupan Tingkat / Kelas */}
                          <td className="py-2 px-3 text-slate-600 font-medium text-xs">
                            {isSD ? 'Kelas 1, 2, 3, 4, 5, 6' : 'Kelas 7, 8, 9'}
                          </td>

                          {/* Aksi */}
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(sub)}
                                className="p-1 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-all"
                                title="Edit Mapel"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubject(sub)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                title="Hapus Mapel"
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

            {/* Footer Info */}
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-300 text-xs text-slate-500 flex items-center justify-between font-medium">
              <span>Menampilkan <strong>{filteredSubjects.length}</strong> mata pelajaran</span>
              <span>Kurikulum Merdeka Indonesia</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Mata Pelajaran (Ramping - Tanpa Fase) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900">
                    {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Berlaku global untuk jenjang yang dipilih</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-3.5 text-xs sm:text-sm">
              
              {/* Nama Mapel */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs uppercase tracking-wider">
                  Nama Mata Pelajaran *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pendidikan Pancasila, IPAS, Informatika"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Jenjang Sekolah (Global / Umum) */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs uppercase tracking-wider">
                  Jenjang Sekolah *
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value as SchoolLevel)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-brand-500"
                >
                  <option value="SD">Sekolah Dasar (SD) • Kelas 1 - 6</option>
                  <option value="SMP">Sekolah Menengah Pertama (SMP) • Kelas 7 - 9</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mata pelajaran berlaku umum untuk seluruh fase dan kelas di jenjang ini.
                </p>
              </div>

              {/* Kode Mapel */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 text-xs uppercase tracking-wider">
                  Kode Singkat Mapel (Opsional)
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Contoh: PP-SD, INF-SMP (otomatis jika kosong)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs sm:text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {editingSubject ? 'Simpan Perubahan' : 'Tambahkan Mapel'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

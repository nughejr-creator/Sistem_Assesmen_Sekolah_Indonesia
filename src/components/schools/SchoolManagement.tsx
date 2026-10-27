import React, { useState, useEffect } from 'react';
import { School, SchoolLevel } from '../../types/database';
import { MOCK_SCHOOLS } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  generateValidUUID, 
  toValidUUID, 
  mergeCloudAndLocal, 
  safeSupabaseUpsert 
} from '../../lib/syncHelper';
import { 
  School as SchoolIcon, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  MapPin, 
  Hash, 
  X,
  Database,
  Layers,
  GraduationCap,
  AlertTriangle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
  Sparkles,
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { ImportSchoolProctorModal } from './ImportSchoolProctorModal';
import { 
  fetchProvinces, 
  fetchRegencies, 
  fetchDistricts, 
  toTitleCase, 
  formatFullAddress,
  ProvinceItem,
  RegencyItem,
  DistrictItem 
} from '../../lib/indonesiaWilayah';

const STORAGE_KEY = 'sasi_schools_cache';

export const SchoolManagement: React.FC = () => {
  // Initialize from LocalStorage cache first, fallback to MOCK_SCHOOLS
  const [schools, setSchools] = useState<School[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return MOCK_SCHOOLS.map(s => ({ ...s, id: toValidUUID(s.id) }));
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeLevel, setActiveLevel] = useState<'ALL' | 'SD' | 'SMP'>('ALL');
  const [filterRegion, setFilterRegion] = useState('');

  // Cloud Database Connection & Verification State
  const [cloudStatus, setCloudStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudSchoolIds, setCloudSchoolIds] = useState<Set<string>>(new Set());

  // Modal & Form State
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const [npsn, setNpsn] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<SchoolLevel>('SD');
  const [district, setDistrict] = useState('');

  // Administrative Region cascading state (Provinsi -> Kab/Kota -> Kecamatan)
  const [provincesList, setProvincesList] = useState<ProvinceItem[]>([]);
  const [regenciesList, setRegenciesList] = useState<RegencyItem[]>([]);
  const [districtsList, setDistrictsList] = useState<DistrictItem[]>([]);

  const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>('');
  const [selectedRegencyId, setSelectedRegencyId] = useState<string>('');
  const [selectedRegencyName, setSelectedRegencyName] = useState<string>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>('');

  const [isLoadingRegencies, setIsLoadingRegencies] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isCustomAddress, setIsCustomAddress] = useState(false);

  // Notification
  const [notification, setNotification] = useState<string | null>(null);
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  // Helper to persist schools to localStorage
  const persistSchools = (updatedList: School[]) => {
    setSchools(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  // Fetch real schools from Supabase Cloud on mount & Sync bidirectional
  const fetchSchoolsFromCloud = async () => {
    setCloudStatus('checking');
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        setCloudStatus('error');
        setCloudError(error.message || 'Gagal memuat data dari Supabase');
        return;
      }

      if (data) {
        setCloudStatus('connected');
        setCloudError(null);
        setCloudSchoolIds(new Set(data.map(d => d.id)));

        setSchools(prev => {
          // Non-destructively merge: keep any locally added schools!
          const { merged, localOnly } = mergeCloudAndLocal(
            data as School[], 
            prev, 
            s => s.npsn
          );

          // Push local-only schools to Supabase in background
          if (localOnly.length > 0) {
            const rowsToPush = localOnly.map(s => ({
              id: toValidUUID(s.id),
              npsn: s.npsn,
              name: s.name,
              level: s.level,
              district: s.district,
              created_at: s.created_at || new Date().toISOString()
            }));
            safeSupabaseUpsert('schools', rowsToPush);
          }

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {}

          return merged;
        });
      }
    } catch (err: any) {
      setCloudStatus('error');
      setCloudError(err?.message || 'Server Supabase tidak dapat dijangkau (Pastikan proyek tidak Paused)');
    }
  };

  useEffect(() => {
    fetchSchoolsFromCloud();
    // Load initial provinces list
    fetchProvinces().then(list => setProvincesList(list));
  }, []);

  // Handle Province Selection
  const handleProvinceSelect = async (provId: string) => {
    setSelectedProvinceId(provId);
    const provObj = provincesList.find(p => p.id === provId);
    const provName = provObj ? provObj.name : '';
    setSelectedProvinceName(provName);

    // Reset Regency & District
    setSelectedRegencyId('');
    setSelectedRegencyName('');
    setSelectedDistrictId('');
    setSelectedDistrictName('');
    setDistrictsList([]);

    if (!provId) {
      setRegenciesList([]);
      setDistrict('');
      return;
    }

    setIsLoadingRegencies(true);
    const regList = await fetchRegencies(provId);
    setRegenciesList(regList);
    setIsLoadingRegencies(false);

    setDistrict(formatFullAddress('', '', provName));
  };

  // Handle Regency Selection
  const handleRegencySelect = async (regId: string) => {
    setSelectedRegencyId(regId);
    const regObj = regenciesList.find(r => r.id === regId);
    const regName = regObj ? regObj.name : '';
    setSelectedRegencyName(regName);

    // Reset District
    setSelectedDistrictId('');
    setSelectedDistrictName('');

    if (!regId) {
      setDistrictsList([]);
      setDistrict(formatFullAddress('', '', selectedProvinceName));
      return;
    }

    setIsLoadingDistricts(true);
    const distList = await fetchDistricts(regId);
    setDistrictsList(distList);
    setIsLoadingDistricts(false);

    setDistrict(formatFullAddress('', regName, selectedProvinceName));
  };

  // Handle District Selection
  const handleDistrictSelect = (distId: string) => {
    setSelectedDistrictId(distId);
    const distObj = districtsList.find(d => d.id === distId);
    const distName = distObj ? distObj.name : '';
    setSelectedDistrictName(distName);

    if (distName) {
      const full = formatFullAddress(distName, selectedRegencyName, selectedProvinceName);
      setDistrict(full);
    }
  };

  const countSD = schools.filter(s => s.level === 'SD').length;
  const countSMP = schools.filter(s => s.level === 'SMP').length;

  // Extract unique regions for filter dropdown
  const availableRegions = Array.from(new Set(schools.map(s => s.district).filter(Boolean)));

  const filteredSchools = schools.filter(s => {
    const matchSearch = !searchTerm.trim() || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.npsn.includes(searchTerm.trim());
    const matchLevel = activeLevel === 'ALL' || s.level === activeLevel;
    const matchRegion = !filterRegion.trim() || (s.district && s.district.toLowerCase().includes(filterRegion.toLowerCase().trim()));
    return matchSearch && matchLevel && matchRegion;
  });

  const handleResetFilters = () => {
    setActiveLevel('ALL');
    setSearchTerm('');
    setFilterRegion('');
  };

  const isAnyFilterActive = activeLevel !== 'ALL' || searchTerm.trim() !== '' || filterRegion.trim() !== '';

  const openCreateModal = async () => {
    setEditingSchool(null);
    setNpsn('');
    setName('');
    setLevel(activeLevel === 'SMP' ? 'SMP' : 'SD');
    setIsCustomAddress(false);

    // Ensure provinces are loaded
    let provs = provincesList;
    if (provs.length === 0) {
      provs = await fetchProvinces();
      setProvincesList(provs);
    }

    // Default to Jawa Barat (ID: 32)
    const jabar = provs.find(p => p.id === '32' || p.name.toUpperCase().includes('JAWA BARAT'));
    if (jabar) {
      setSelectedProvinceId(jabar.id);
      setSelectedProvinceName(jabar.name);
      setIsLoadingRegencies(true);
      const regs = await fetchRegencies(jabar.id);
      setRegenciesList(regs);
      setIsLoadingRegencies(false);

      // Default to Kabupaten Sumedang (ID: 3211)
      const sumedang = regs.find(r => r.name.toUpperCase().includes('SUMEDANG'));
      if (sumedang) {
        setSelectedRegencyId(sumedang.id);
        setSelectedRegencyName(sumedang.name);
        setIsLoadingDistricts(true);
        const dists = await fetchDistricts(sumedang.id);
        setDistrictsList(dists);
        setIsLoadingDistricts(false);

        // Default to Pamulihan (ID: 3211180 or name includes PAMULIHAN)
        const pamulihan = dists.find(d => d.name.toUpperCase().includes('PAMULIHAN'));
        if (pamulihan) {
          setSelectedDistrictId(pamulihan.id);
          setSelectedDistrictName(pamulihan.name);
          setDistrict(formatFullAddress(pamulihan.name, sumedang.name, jabar.name));
        } else if (dists.length > 0) {
          setSelectedDistrictId(dists[0].id);
          setSelectedDistrictName(dists[0].name);
          setDistrict(formatFullAddress(dists[0].name, sumedang.name, jabar.name));
        }
      } else {
        setSelectedRegencyId('');
        setSelectedRegencyName('');
        setSelectedDistrictId('');
        setSelectedDistrictName('');
        setDistrict(formatFullAddress('', '', jabar.name));
      }
    } else {
      setSelectedProvinceId('');
      setSelectedProvinceName('');
      setSelectedRegencyId('');
      setSelectedRegencyName('');
      setSelectedDistrictId('');
      setSelectedDistrictName('');
      setDistrict('');
    }

    setShowModal(true);
  };

  const openEditModal = async (s: School) => {
    setEditingSchool(s);
    setNpsn(s.npsn);
    setName(s.name);
    setLevel(s.level);
    setDistrict(s.district || '');

    // Ensure provinces are loaded
    let provs = provincesList;
    if (provs.length === 0) {
      provs = await fetchProvinces();
      setProvincesList(provs);
    }

    // Try to parse existing district string e.g. "Kec. Pamulihan, Kabupaten Sumedang, Jawa Barat"
    const distText = s.district || '';
    let matched = false;

    // Check if contains any known province
    const matchedProv = provs.find(p => distText.toLowerCase().includes(p.name.toLowerCase()));
    if (matchedProv) {
      setSelectedProvinceId(matchedProv.id);
      setSelectedProvinceName(matchedProv.name);
      setIsLoadingRegencies(true);
      const regs = await fetchRegencies(matchedProv.id);
      setRegenciesList(regs);
      setIsLoadingRegencies(false);

      const matchedReg = regs.find(r => distText.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(distText.toLowerCase()));
      if (matchedReg) {
        setSelectedRegencyId(matchedReg.id);
        setSelectedRegencyName(matchedReg.name);
        setIsLoadingDistricts(true);
        const dists = await fetchDistricts(matchedReg.id);
        setDistrictsList(dists);
        setIsLoadingDistricts(false);

        const matchedDist = dists.find(d => distText.toLowerCase().includes(d.name.toLowerCase()));
        if (matchedDist) {
          setSelectedDistrictId(matchedDist.id);
          setSelectedDistrictName(matchedDist.name);
          matched = true;
        }
      }
    }

    if (!matched) {
      // If unable to automatically match, keep custom text mode
      setIsCustomAddress(true);
    } else {
      setIsCustomAddress(false);
    }

    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    let cloudSuccess = false;
    let cloudErr = '';

    if (editingSchool) {
      const validId = toValidUUID(editingSchool.id);
      const updatedSchool: School = {
        ...editingSchool,
        id: validId,
        npsn: npsn.trim(),
        name: name.trim(),
        level,
        district: district.trim(),
        updated_at: new Date().toISOString()
      };

      // Persist to Supabase Cloud
      const res = await safeSupabaseUpsert('schools', {
        id: validId,
        npsn: updatedSchool.npsn,
        name: updatedSchool.name,
        level: updatedSchool.level,
        district: updatedSchool.district,
        updated_at: updatedSchool.updated_at
      });

      cloudSuccess = res.success;
      if (!res.success) cloudErr = res.error?.message || '';

      const updatedList = schools.map(s => s.id === editingSchool.id ? updatedSchool : s);
      persistSchools(updatedList);

      if (cloudSuccess) {
        setCloudStatus('connected');
        setCloudSchoolIds(prev => new Set([...prev, validId]));
        notify(`Data sekolah "${name}" berhasil diperbarui & tersimpan ke Cloud Supabase!`);
      } else {
        setCloudStatus('error');
        setCloudError(cloudErr || 'Gagal tersambung ke Cloud Supabase');
        notify(`Data sekolah "${name}" diperbarui di lokal, namun GAGAL sync ke Cloud: ${cloudErr || 'Server Supabase terputus / paused'}`);
      }

    } else {
      const newId = generateValidUUID();

      const newSchool: School = {
        id: newId,
        npsn: npsn.trim(),
        name: name.trim(),
        level,
        district: district.trim(),
        created_at: new Date().toISOString()
      };

      // Persist to Supabase Cloud
      const res = await safeSupabaseUpsert('schools', {
        id: newSchool.id,
        npsn: newSchool.npsn,
        name: newSchool.name,
        level: newSchool.level,
        district: newSchool.district,
        created_at: newSchool.created_at
      });

      cloudSuccess = res.success;
      if (!res.success) cloudErr = res.error?.message || '';

      const updatedList = [newSchool, ...schools];
      persistSchools(updatedList);

      if (cloudSuccess) {
        setCloudStatus('connected');
        setCloudSchoolIds(prev => new Set([...prev, newId]));
        notify(`Sekolah "${name}" berhasil ditambahkan & tersimpan ke Cloud Supabase!`);
      } else {
        setCloudStatus('error');
        setCloudError(cloudErr || 'Gagal tersambung ke Cloud Supabase');
        notify(`Sekolah "${name}" tersimpan di memori lokal, namun GAGAL sync ke Cloud: ${cloudErr || 'Server Supabase terputus / paused'}`);
      }
    }

    setIsSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (schoolId: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus sekolah ini? Seluruh data terkait proktor dan siswa akan terpengaruh.')) {
      const updatedList = schools.filter(s => s.id !== schoolId);
      persistSchools(updatedList);
      notify('Sekolah berhasil dihapus.');

      try {
        const validId = toValidUUID(schoolId);
        await supabase.from('schools').delete().eq('id', validId);
        setCloudSchoolIds(prev => {
          const next = new Set(prev);
          next.delete(validId);
          return next;
        });
      } catch (err) {}
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-sm font-bold animate-slide-left max-w-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-4.5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 pr-0 sm:pr-4">
          <div className="flex items-center space-x-2 text-[11px] font-black uppercase tracking-wider mb-1">
            <SchoolIcon className="w-3.5 h-3.5 text-brand-600" />
            <span className="text-brand-700">Pangkalan Data Satuan Pendidikan</span>
            
            {/* Dynamic Cloud Database Status Badge */}
            {cloudStatus === 'connected' && (
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex items-center space-x-1 font-bold">
                <Database className="w-3 h-3 text-emerald-600" />
                <span>Cloud Supabase: Terhubung Aktif</span>
              </span>
            )}
            {cloudStatus === 'checking' && (
              <span className="bg-amber-50 text-amber-800 border border-amber-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex items-center space-x-1 font-bold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                <span>Memeriksa Cloud...</span>
              </span>
            )}
            {cloudStatus === 'error' && (
              <span className="bg-rose-50 text-rose-800 border border-rose-300 text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex items-center space-x-1 font-bold">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                <span>Cloud Supabase: Terputus / Paused</span>
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Manajemen Sekolah (NPSN & Jenjang)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed line-clamp-2">
            Kelola data satuan pendidikan SD (Fase A-C) dan SMP (Fase D) penyelenggara asesmen CBT. Data tersimpan permanen dan dapat dihubungkan ke akun proktor.
          </p>
        </div>

        {/* Susunan Tombol Vertikal Simetris Penuh */}
        <div className="flex flex-col gap-2 w-full sm:w-56 shrink-0">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="w-full py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-all transform active:scale-95"
            title="Impor banyak data sekolah dan akun proktor sekaligus dari spreadsheet Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Impor Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="w-full py-2 px-3.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white text-xs md:text-sm font-semibold rounded-xl flex items-center justify-center space-x-1.5 shadow-md shadow-brand-500/20 transition-all transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Sekolah Baru</span>
          </button>
        </div>
      </div>

      {/* Cloud Paused / Disconnected Warning Banner */}
      {cloudStatus === 'error' && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-4 text-rose-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-rose-900">
                Peringatan: Cloud Database Supabase Belum Terhubung / Paused
              </h4>
              <p className="text-xs text-rose-700 mt-0.5 leading-relaxed max-w-3xl">
                Server Supabase (<code className="bg-rose-100 px-1.5 py-0.5 rounded font-mono text-[11px]">lmlflfkdukcdhkdjssmm.supabase.co</code>) tidak merespons. 
                Data sekolah baru yang Anda input saat ini <strong>hanya berada di memori lokal browser</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
            <a
              href="https://supabase.com/dashboard/project/lmlflfkdukcdhkdjssmm"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Supabase</span>
            </a>
            <button
              type="button"
              onClick={() => fetchSchoolsFromCloud()}
              className="px-3 py-1.5 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cek Ulang</span>
            </button>
          </div>
        </div>
      )}

      {/* Tombol Pilihan Jenjang (Semua, SD, SMP) */}
      <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <SchoolIcon className="w-3.5 h-3.5 text-brand-600" />
            <span>Pilih Jenjang Satuan Pendidikan:</span>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Total {schools.length} Satuan Pendidikan Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* Semua Jenjang */}
          <button
            type="button"
            onClick={() => setActiveLevel('ALL')}
            className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-left transition-all border-2 h-auto gap-2 ${
              activeLevel === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-[1.01]'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                activeLevel === 'ALL' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm truncate">Semua Jenjang</h4>
                <p className={`text-[11px] truncate whitespace-nowrap ${activeLevel === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
                  SD (Fase A–C) & SMP (Fase D)
                </p>
              </div>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 ${
              activeLevel === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
            }`}>
              {schools.length}
            </span>
          </button>

          {/* Jenjang SD */}
          <button
            type="button"
            onClick={() => setActiveLevel('SD')}
            className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-left transition-all border-2 h-auto gap-2 ${
              activeLevel === 'SD'
                ? 'bg-rose-950 text-white border-rose-900 shadow-md scale-[1.01]'
                : 'bg-white hover:bg-rose-50/60 text-slate-800 border-rose-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                activeLevel === 'SD' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
              }`}>
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm truncate">Jenjang SD</h4>
                <p className={`text-[11px] truncate whitespace-nowrap ${activeLevel === 'SD' ? 'text-rose-200' : 'text-slate-500'}`}>
                  Fase A, B, C (Kelas 1–6)
                </p>
              </div>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 ${
              activeLevel === 'SD' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {countSD}
            </span>
          </button>

          {/* Jenjang SMP */}
          <button
            type="button"
            onClick={() => setActiveLevel('SMP')}
            className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-left transition-all border-2 h-auto gap-2 ${
              activeLevel === 'SMP'
                ? 'bg-sky-950 text-white border-sky-900 shadow-md scale-[1.01]'
                : 'bg-white hover:bg-sky-50/60 text-slate-800 border-sky-200 shadow-2xs'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                activeLevel === 'SMP' ? 'bg-sky-500 text-white' : 'bg-sky-100 text-sky-700'
              }`}>
                <SchoolIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs sm:text-sm truncate">Jenjang SMP</h4>
                <p className={`text-[11px] truncate whitespace-nowrap ${activeLevel === 'SMP' ? 'text-sky-200' : 'text-slate-500'}`}>
                  Fase D (Kelas 7–9)
                </p>
              </div>
            </div>
            <span className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 ${
              activeLevel === 'SMP' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-800 border border-sky-200'
            }`}>
              {countSMP}
            </span>
          </button>
        </div>
      </div>

      {/* Tabel & Filter Data Sekolah */}
      <div className="space-y-3.5 animate-fade-in">
        {/* Filter & Search Bar */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
            {/* Search by Name / NPSN */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama sekolah atau NPSN..."
                className="w-full pl-9 pr-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Filter by Wilayah / Kecamatan */}
            <div className="relative sm:w-56">
              <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-brand-500" />
              <input
                type="text"
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                placeholder="Filter Kecamatan / Wilayah..."
                className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
              {filterRegion && (
                <button
                  type="button"
                  onClick={() => setFilterRegion('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                  title="Bersihkan filter wilayah"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 justify-between md:justify-end shrink-0">
            {/* Tombol 1-Klik Reset Filter */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center space-x-1 transition-all"
                title="Reset semua filter ke kondisi awal"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                <span>Reset Filter</span>
              </button>
            )}

            <div className={`text-xs font-black px-2.5 py-1.5 rounded-xl border flex items-center space-x-1.5 ${
              activeLevel === 'SD'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : activeLevel === 'SMP'
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : 'bg-slate-100 text-slate-800 border-slate-200'
            }`}>
              <span>Jenjang: <strong>{activeLevel === 'ALL' ? 'Semua (SD & SMP)' : activeLevel}</strong></span>
            </div>

            <span className="text-xs font-black text-brand-700 bg-brand-50 px-2.5 py-1.5 rounded-xl border border-brand-200 whitespace-nowrap">
              {filteredSchools.length} Sekolah Ditampilkan
            </span>
          </div>
        </div>

        {/* Table of Schools: Grid Bersekat Tegas & High-Density */}
        <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-sky-100 text-sky-950 font-black uppercase tracking-wider text-[11px] border-b-2 border-sky-300">
                <tr className="divide-x divide-sky-200">
                  <th className="py-2 px-2 text-center w-12 bg-sky-200/80 text-sky-950 font-black">NO.</th>
                  <th className="py-2 px-3 w-28">NPSN</th>
                  <th className="py-2 px-3 min-w-[200px]">NAMA SATUAN PENDIDIKAN</th>
                  <th className="py-2 px-3 w-32">JENJANG & FASE</th>
                  <th className="py-2 px-3 min-w-[170px]">KECAMATAN / WILAYAH</th>
                  <th className="py-2 px-3 w-36 text-center">STATUS PENYIMPANAN</th>
                  <th className="py-2 px-3 w-24 text-center">AKSI</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium text-xs">
                      Tidak ditemukan data sekolah yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((s, index) => (
                    <tr 
                      key={s.id} 
                      className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors"
                    >
                      {/* 1. NOMOR URUT DINAMIS */}
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                        {index + 1}
                      </td>

                      {/* 2. NPSN */}
                      <td className="py-2 px-3 font-mono font-black text-brand-700 text-xs whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{s.npsn}</span>
                        </div>
                      </td>

                      {/* 3. NAMA SATUAN PENDIDIKAN */}
                      <td className="py-2 px-3 font-extrabold text-slate-900 text-xs">
                        {s.name}
                      </td>

                      {/* 4. JENJANG & FASE */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1 ${
                          s.level === 'SD' 
                            ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}>
                          <GraduationCap className="w-3 h-3" />
                          <span>{s.level} {s.level === 'SD' ? '(Fase A-C)' : '(Fase D)'}</span>
                        </span>
                      </td>

                      {/* 5. KECAMATAN / WILAYAH */}
                      <td className="py-2 px-3 text-slate-600 font-medium text-xs">
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[280px] lg:max-w-[360px]" title={s.district}>{s.district}</span>
                        </div>
                      </td>

                      {/* 6. STATUS PENYIMPANAN */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {cloudSchoolIds.has(s.id) ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Cloud Aktif</span>
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300"
                            title="Tersimpan di memori browser lokal"
                          >
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Hanya Lokal</span>
                          </span>
                        )}
                      </td>

                      {/* 7. AKSI */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(s)}
                            className="p-1 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-slate-200"
                            title="Edit Sekolah"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                            title="Hapus Sekolah"
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
      </div>

      {/* Modal Add/Edit */}
      {/* Modal Tambah/Edit Sekolah Manual */}
      {showModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-3xl max-w-xl w-full p-7 shadow-2xl border border-slate-200 animate-scale-up my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <SchoolIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingSchool ? 'Edit Satuan Pendidikan' : 'Tambah Satuan Pendidikan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">Data tersimpan permanen di cloud Supabase & terstruktur</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-5 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                    NPSN *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={npsn}
                    onChange={(e) => setNpsn(e.target.value)}
                    placeholder="Contoh: 20101234"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs font-bold focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                    Jenjang Pendidikan *
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as SchoolLevel)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-brand-500 bg-white"
                  >
                    <option value="SD">SD (Fase A, B, C - Kelas 1 s/d 6)</option>
                    <option value="SMP">SMP (Fase D - Kelas 7 s/d 9)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5 text-xs uppercase tracking-wider">
                  Nama Satuan Pendidikan *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: SD Negeri Percobaan 1"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-semibold text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* Pemilihan Wilayah Berjenjang Otomatis (Provinsi -> Kab/Kota -> Kecamatan) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    <span>Wilayah Satuan Pendidikan (Filter Berjenjang)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCustomAddress(!isCustomAddress)}
                    className="text-[11px] font-bold text-brand-600 hover:text-brand-800 hover:underline"
                  >
                    {isCustomAddress ? '← Gunakan Pilihan Otomatis' : 'Mode Teks Bebas / Manual'}
                  </button>
                </div>

                {!isCustomAddress ? (
                  <div className="space-y-3">
                    {/* 1. Provinsi */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        1. Provinsi <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedProvinceId}
                        onChange={(e) => handleProvinceSelect(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">-- Pilih Provinsi --</option>
                        {provincesList.map((p) => (
                          <option key={p.id} value={p.id}>
                            {toTitleCase(p.name)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Kabupaten / Kota */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                        <span>2. Kabupaten / Kota <span className="text-rose-500">*</span></span>
                        {isLoadingRegencies && (
                          <span className="text-brand-600 text-[10px] flex items-center space-x-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Memuat data kota...</span>
                          </span>
                        )}
                      </label>
                      <select
                        value={selectedRegencyId}
                        onChange={(e) => handleRegencySelect(e.target.value)}
                        disabled={!selectedProvinceId || isLoadingRegencies}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">
                          {!selectedProvinceId ? '-- Pilih Provinsi Terlebih Dahulu --' : '-- Pilih Kabupaten / Kota --'}
                        </option>
                        {regenciesList.map((r) => (
                          <option key={r.id} value={r.id}>
                            {toTitleCase(r.name)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Kecamatan */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center justify-between">
                        <span>3. Kecamatan <span className="text-rose-500">*</span></span>
                        {isLoadingDistricts && (
                          <span className="text-brand-600 text-[10px] flex items-center space-x-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Memuat data kecamatan...</span>
                          </span>
                        )}
                      </label>
                      <select
                        value={selectedDistrictId}
                        onChange={(e) => handleDistrictSelect(e.target.value)}
                        disabled={!selectedRegencyId || isLoadingDistricts}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="">
                          {!selectedRegencyId ? '-- Pilih Kabupaten/Kota Terlebih Dahulu --' : '-- Pilih Kecamatan --'}
                        </option>
                        {districtsList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {toTitleCase(d.name)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Alamat Preview Box */}
                    <div className="p-3 bg-brand-50/70 rounded-xl border border-brand-200">
                      <span className="text-[10px] uppercase font-bold text-brand-700 block mb-0.5">
                        Format Alamat Terstruktur:
                      </span>
                      <p className="text-xs font-extrabold text-brand-950">
                        {district ? `📍 ${district}` : 'Belum memilih wilayah'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Kecamatan / Wilayah Lengkap (Input Manual) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="Contoh: Kec. Pamulihan, Kabupaten Sumedang, Jawa Barat"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !district.trim()}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white text-xs font-black rounded-xl shadow-md flex items-center space-x-2 transition-all transform active:scale-95"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSaving ? 'Menyimpan...' : (editingSchool ? 'Perbarui Sekolah' : 'Simpan Sekolah')}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Modal Impor Banyak Sekolah & Akun Proktor dari Excel (.xlsx) */}
      {showImportModal && (
        <ImportSchoolProctorModal
          existingSchools={schools}
          onClose={() => setShowImportModal(false)}
          onImportComplete={(schoolsCount, proctorsCount, updatedSchools) => {
            setShowImportModal(false);
            setSchools(updatedSchools);
            notify(`Berhasil mengimpor ${schoolsCount} sekolah dan ${proctorsCount} akun proktor ke Supabase Cloud!`);
          }}
        />
      )}

    </div>
  );
};

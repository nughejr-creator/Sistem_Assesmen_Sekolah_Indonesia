import React, { useState, useEffect } from 'react';
import { School } from '../../types/database';
import { supabase } from '../../lib/supabase';
import {
  Building2,
  MessageCircle,
  PhoneCall,
  MapPin,
  Phone,
  Mail,
  Globe,
  Award,
  UserCheck,
  FileText,
  Save,
  CheckCircle2,
  Edit3,
  X,
  Lock,
  Unlock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Calendar,
  School as SchoolIcon,
  HelpCircle
} from 'lucide-react';

interface SchoolProfileViewProps {
  school: School;
}

export const SchoolProfileView: React.FC<SchoolProfileViewProps> = ({ school: initialSchool }) => {
  const [formData, setFormData] = useState<School>({
    ...initialSchool,
    name: initialSchool.name || 'SD Negeri Cinanggerang I',
    npsn: initialSchool.npsn || '20208801',
    level: initialSchool.level || 'SD',
    status: initialSchool.status || 'Negeri',
    accreditation: initialSchool.accreditation || 'B',
    principal_name: initialSchool.principal_name || 'Aep Yayat, S.Pd.SD.',
    principal_nip: initialSchool.principal_nip || '19750812 200003 2 004',
    address: initialSchool.address || 'Jl. Desa Cinanggerang RT 03 RW 04',
    district: initialSchool.district || 'Kec. Pamulihan',
    regency_city: initialSchool.regency_city || 'Kab. Sumedang',
    province: initialSchool.province || 'Jawa Barat',
    postal_code: initialSchool.postal_code || '45262',
    phone: initialSchool.phone || '082118449525',
    email: initialSchool.email || 'sdncinanggerang1@gmail.com',
    website: initialSchool.website || 'https://sdncinanggerang1.gosch.id'
  });

  const [originalData, setOriginalData] = useState<School>(formData);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [showKopPreview, setShowKopPreview] = useState<boolean>(false);

  // Ambil data sekolah terbaru secara langsung dari Supabase saat halaman dibuka
  useEffect(() => {
    let isMounted = true;
    const fetchLatestSchool = async () => {
      const schId = initialSchool?.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('id', schId)
          .maybeSingle();

        if (data && isMounted) {
          const cleanData: any = {};
          for (const [k, v] of Object.entries(data)) {
            if (v !== null && v !== undefined && v !== '') {
              cleanData[k] = v;
            }
          }
          const merged = { ...formData, ...cleanData };
          setFormData(merged);
          setOriginalData(merged);
        }
      } catch (err) {
        console.warn('Fetch school from cloud warning:', err);
      }
    };

    fetchLatestSchool();
    return () => { isMounted = false; };
  }, [initialSchool?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStartEdit = () => {
    setOriginalData({ ...formData });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData({ ...originalData });
    setIsEditing(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const schId = formData.id || initialSchool?.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';

    try {
      const payload: any = {
        name: formData.name?.trim(),
        npsn: formData.npsn?.trim(),
        level: formData.level || 'SD',
        status: formData.status || 'Negeri',
        accreditation: formData.accreditation || 'B',
        principal_name: formData.principal_name?.trim(),
        principal_nip: formData.principal_nip?.trim(),
        address: formData.address?.trim(),
        district: formData.district?.trim(),
        regency_city: formData.regency_city?.trim(),
        province: formData.province?.trim(),
        postal_code: formData.postal_code?.trim(),
        phone: formData.phone?.trim(),
        email: formData.email?.trim(),
        website: formData.website?.trim(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('schools')
        .update(payload)
        .eq('id', schId);

      if (error) {
        console.error('Update school error:', error);
        alert('Gagal menyimpan ke database Supabase: ' + error.message);
        return;
      }

      // Update local storage session
      try {
        const userCache = localStorage.getItem('sasi_current_user');
        if (userCache) {
          const u = JSON.parse(userCache);
          u.school = { ...u.school, ...payload };
          localStorage.setItem('sasi_current_user', JSON.stringify(u));
        }
      } catch (e) {}

      setOriginalData({ ...formData, ...payload });
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err: any) {
      console.warn('Update school error:', err);
      alert('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsSaving(false);
    }
  };

  const getAccreditationLabel = (acc?: string | null) => {
    switch (acc) {
      case 'A': return 'Terakreditasi A (Unggul)';
      case 'B': return 'Terakreditasi B (Baik)';
      case 'C': return 'Terakreditasi C (Cukup)';
      case 'Belum': return 'Belum Terakreditasi';
      default: return acc ? `Terakreditasi ${acc}` : 'Terakreditasi B (Baik)';
    }
  };

  const getLevelLabel = (lvl?: string | null) => {
    switch (lvl) {
      case 'SD': return 'Sekolah Dasar (SD)';
      case 'SMP': return 'Sekolah Menengah Pertama (SMP)';
      case 'SMA': return 'Sekolah Menengah Atas (SMA)';
      case 'SMK': return 'Sekolah Menengah Kejuruan (SMK)';
      default: return lvl || 'Sekolah Dasar (SD)';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. Header Toolbar Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-brand-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Profil & Identitas Satuan Pendidikan
              </h2>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                isEditing 
                  ? 'bg-amber-50 text-amber-700 border-amber-300 animate-pulse' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              }`}>
                {isEditing ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>{isEditing ? 'Mode Edit Aktif' : 'Terkunci Resmi'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Data resmi lembaga yang tersinkronisasi langsung ke database Supabase Cloud. Digunakan secara otomatis pada Kop Surat Berita Acara (BAP), Kartu Ujian Siswa, Daftar Hadir, dan Leger Nilai.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowKopPreview(!showKopPreview)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-200"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>{showKopPreview ? 'Tutup Pratinjau Kop' : 'Pratinjau Kop Ujian'}</span>
          </button>

          {!isEditing ? (
            <button
              type="button"
              onClick={handleStartEdit}
              className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white rounded-2xl text-xs font-extrabold flex items-center space-x-2 shadow-md shadow-brand-500/25 transition-all transform active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profil Sekolah</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-300"
              >
                <X className="w-4 h-4" />
                <span>Batal</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black flex items-center space-x-2 shadow-md shadow-emerald-600/25 transition-all transform active:scale-95 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan ke Cloud...' : 'Simpan ke Database'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="bg-emerald-900 text-white p-4.5 rounded-2xl flex items-center space-x-3 text-xs font-bold shadow-xl shadow-emerald-900/20 border border-emerald-700 animate-slide-down">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-sm">Berhasil Disimpan Permanen!</h4>
            <p className="text-emerald-200 text-[11px] font-medium">
              Profil sekolah dan data Kepala Sekolah telah diperbarui di database Supabase Cloud dan siap digunakan untuk seluruh dokumen CBT.
            </p>
          </div>
        </div>
      )}

      {/* Kop Surat Preview Box */}
      {showKopPreview && (
        <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-brand-300 shadow-md animate-slide-down space-y-3">
          <div className="text-[10px] uppercase font-black text-brand-700 tracking-wider flex items-center justify-between">
            <span className="flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Pratinjau Kop Surat Resmi Asesmen CBT:</span>
            </span>
            <span className="text-slate-400 font-medium">Dicetak pada Berita Acara, Leger & Kartu Peserta</span>
          </div>

          <div className="p-7 bg-slate-50/80 border border-slate-200 rounded-2xl text-center space-y-1">
            <h3 className="text-xs font-bold tracking-widest text-slate-600 uppercase">
              PEMERINTAH KABUPATEN/KOTA {formData.regency_city?.toUpperCase() || 'SUMEDANG'}
            </h3>
            <h3 className="text-xs font-bold tracking-widest text-slate-600 uppercase">
              DINAS PENDIDIKAN DAN KEBUDAYAAN
            </h3>
            <h1 className="text-xl font-black text-slate-900 tracking-wide uppercase pt-0.5">
              {formData.name}
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              NPSN: {formData.npsn} • Status: {formData.status} • Akreditasi: {formData.accreditation || 'B'}
            </p>
            <p className="text-[11px] text-slate-500 italic">
              {formData.address}, {formData.district}, {formData.regency_city}, {formData.province} - Kodepos: {formData.postal_code}
            </p>
            <p className="text-[10px] text-slate-500 font-mono pt-1">
              Telp/WA: {formData.phone || '-'} • Email: {formData.email || '-'} • Web: {formData.website || '-'}
            </p>
            <div className="border-b-2 border-slate-800 pt-2" />
          </div>
        </div>
      )}

      {/* 2. MODE TERKUNCI (READ-ONLY / DISPLAY RESMI) */}
      {!isEditing ? (
        <div className="space-y-6">
          
          {/* Header Identitas Satuan Pendidikan (Sesuai Desain Resmi Tut Wuri Handayani) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
            
            {/* Logo Universal Tut Wuri Handayani */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-sky-50/60 p-1 flex items-center justify-center shrink-0 border-2 border-sky-100 shadow-2xs overflow-hidden">
              <img 
                src="/tutwuri-logo.png" 
                alt="Logo Tut Wuri Handayani" 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Nama Sekolah & Deretan Badge Status */}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-[28px] font-black text-slate-900 tracking-tight leading-snug">
                {formData.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold">
                  NPSN: <strong className="font-bold text-slate-900">{formData.npsn}</strong>
                </span>

                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold">
                  Status: <strong className="font-bold text-emerald-700">{formData.status || 'Negeri'}</strong>
                </span>

                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-semibold">
                  Akreditasi: <strong className="font-bold text-amber-700">Peringkat {formData.accreditation || 'B'}</strong>
                </span>

                <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-300 text-xs font-semibold">
                  Jenjang: <strong className="font-bold text-sky-700">{formData.level || 'SD'}</strong>
                </span>
              </div>
            </div>

          </div>

          {/* 2 Kolom: Pimpinan & Kontak Resmi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Kolom Kiri: Pimpinan & Penanggung Jawab */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-5">
                  Pimpinan & Penanggung Jawab
                </h3>

                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-[#0d4f3c] text-white font-bold text-2xl flex items-center justify-center shrink-0 shadow-xs">
                    {formData.principal_name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h4 className="font-bold text-base sm:text-lg text-slate-900 leading-snug">
                      {formData.principal_name || 'Aep Yayat, S.Pd.SD.'}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 tracking-wider">
                      NIP: {formData.principal_nip || '19720812 200003 2 004'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Callout Notice Hijau */}
              <div className="p-4 rounded-2xl bg-[#eef8f4] border border-[#cbebe0] text-xs text-[#175240] flex items-start space-x-3">
                <div className="w-5 h-5 rounded-full border border-[#2ea378] text-[#2ea378] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs leading-relaxed font-medium">
                  Nama dan NIP otomatis tercantum pada penerbitan Berita Acara Pelaksanaan (BAP) ruang ujian & Lembar Pengesahan Rekap & Leger Nilai.
                </p>
              </div>
            </div>

            {/* Kolom Kanan: Lokasi & Kontak Resmi */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">
                Lokasi & Kontak Resmi
              </h3>

              <div className="space-y-3.5 text-xs text-slate-700">
                {/* Alamat Fisik */}
                <div className="flex items-start space-x-3">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    {formData.address || 'Jl. Desa Cinanggerang RT 03 RW 04'}, {formData.district || 'Kec. Pamulihan'}, {formData.regency_city || 'Kabupaten Sumedang'}, {formData.province || 'Jawa Barat'} ({formData.postal_code || '45265'})
                  </span>
                </div>

                {/* Telepon */}
                <div className="flex items-center space-x-3">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-800">{formData.phone || '082118449525'}</span>
                </div>

                {/* WhatsApp */}
                <div className="flex items-center space-x-3">
                  <MessageCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-800">{formData.phone || '082118449525'}</span>
                </div>

                {/* Email */}
                <div className="flex items-center space-x-3">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a 
                    href={`mailto:${formData.email || 'sdncinanggerang1@gmail.com'}`}
                    className="font-mono text-slate-800 hover:text-brand-600 hover:underline truncate"
                  >
                    {formData.email || 'sdncinanggerang1@gmail.com'}
                  </a>
                </div>

                {/* Website */}
                <div className="flex items-center space-x-3">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <a 
                    href={formData.website?.startsWith('http') ? formData.website : `https://${formData.website || 'sdncinanggerang1.sch.id'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-slate-800 hover:text-brand-600 hover:underline truncate"
                  >
                    {formData.website ? formData.website.replace(/^https?:\/\//, '') : 'sdncinanggerang1.sch.id'}
                  </a>
                </div>
              </div>
            </div>

          </div></div>
      ) : (
        /* 3. MODE EDIT INTERAKTIF (FORM MODERN & TERORGANISIR) */
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-8 animate-fade-in">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-brand-600" />
                <span>Formulir Pembaruan Profil Sekolah</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Silakan perbaiki data di bawah ini, lalu klik tombol Simpan untuk memperbarui database Supabase.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
              </button>
            </div>
          </div>

          {/* Section 1: Data Pokok Sekolah */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-brand-700 tracking-wider flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span>1. Data Pokok Lembaga</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="lg:col-span-2">
                <label className="block text-slate-600 font-bold mb-1.5">Nama Lengkap Satuan Pendidikan</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  required
                  placeholder="Contoh: SD Negeri Cinanggerang I"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Nomor Pokok Sekolah Nasional (NPSN)</label>
                <input
                  type="text"
                  name="npsn"
                  value={formData.npsn || ''}
                  onChange={handleChange}
                  required
                  placeholder="8 Digit NPSN"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Jenjang Pendidikan</label>
                <select
                  name="level"
                  value={formData.level || 'SD'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                >
                  <option value="SD">Sekolah Dasar (SD)</option>
                  <option value="SMP">Sekolah Menengah Pertama (SMP)</option>
                  <option value="SMA">Sekolah Menengah Atas (SMA)</option>
                  <option value="SMK">Sekolah Menengah Kejuruan (SMK)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Status Kepemilikan</label>
                <select
                  name="status"
                  value={formData.status || 'Negeri'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                >
                  <option value="Negeri">Negeri</option>
                  <option value="Swasta">Swasta</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Peringkat Akreditasi</label>
                <select
                  name="accreditation"
                  value={formData.accreditation || 'B'}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                >
                  <option value="A">Terakreditasi A (Unggul)</option>
                  <option value="B">Terakreditasi B (Baik)</option>
                  <option value="C">Terakreditasi C (Cukup)</option>
                  <option value="Belum">Belum Terakreditasi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Data Kepala Sekolah */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase text-emerald-700 tracking-wider flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>2. Data Kepala Sekolah (Penanda Tangan Berita Acara & Leger)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Nama Lengkap Kepala Sekolah beserta Gelar</label>
                <input
                  type="text"
                  name="principal_name"
                  value={formData.principal_name || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Aep Yayat, S.Pd.SD."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">NIP Kepala Sekolah</label>
                <input
                  type="text"
                  name="principal_nip"
                  value={formData.principal_nip || ''}
                  onChange={handleChange}
                  placeholder="Contoh: 19750812 200003 2 004"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Lokasi & Kontak Sekolah */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase text-amber-700 tracking-wider flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span>3. Lokasi & Saluran Kontak Resmi</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block text-slate-600 font-bold mb-1.5">Alamat Jalan / RT / RW</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Jl. Desa Cinanggerang RT 03 RW 04"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Kecamatan</label>
                <input
                  type="text"
                  name="district"
                  value={formData.district || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Kec. Pamulihan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Kabupaten / Kota</label>
                <input
                  type="text"
                  name="regency_city"
                  value={formData.regency_city || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Kab. Sumedang"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Provinsi</label>
                <input
                  type="text"
                  name="province"
                  value={formData.province || ''}
                  onChange={handleChange}
                  placeholder="Contoh: Jawa Barat"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Kode Pos</label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code || ''}
                  onChange={handleChange}
                  placeholder="Contoh: 45262"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Telepon / WhatsApp Resmi</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="Contoh: 082118449525"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Alamat Email Resmi</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  placeholder="Contoh: sdncinanggerang1@gmail.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1.5">Website Resmi Sekolah</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website || ''}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Footer in Form */}
          <div className="pt-5 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal & Kembalikan
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center space-x-2 shadow-md shadow-emerald-600/25 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan Perubahan...' : 'Simpan Profil Sekolah ke Cloud'}</span>
            </button>
          </div>

        </form>
      )}

    </div>
  );
};

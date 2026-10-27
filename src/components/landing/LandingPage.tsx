import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Sparkles, 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Key, 
  Timer, 
  BarChart3, 
  Check, 
  Laptop, 
  FileSpreadsheet, 
  School, 
  Users, 
  Award, 
  FileText, 
  ShieldAlert, 
  Zap, 
  Clock, 
  HelpCircle,
  PlayCircle,
  ExternalLink,
  ChevronRight,
  Database,
  Mail,
  MessageCircle,
  FileCheck2,
  RotateCcw
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: (tab: 'student' | 'officer', quickToken?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const [quickTokenInput, setQuickTokenInput] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleQuickTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = quickTokenInput.trim().toUpperCase() || 'SASI26';
    onOpenLogin('student', cleanToken);
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      
      {/* =========================================================================
          1. TOP PUBLIC NAVIGATION BAR
      ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Platform Title */}
          <div className="flex items-center space-x-3.5">
            <a href="#beranda" className="flex items-center group">
              <img 
                src="/sasipedia-logo.png" 
                alt="SASIPEDIA - Platform Asesmen Sekolah" 
                className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </a>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-6 text-xs font-bold text-slate-600">
            <a href="#beranda" className="text-brand-700 hover:text-brand-800 transition-colors">Beranda</a>
            <a href="#fitur" className="hover:text-slate-900 transition-colors">Fitur Unggulan</a>
            <a href="#alur" className="hover:text-slate-900 transition-colors">Alur Pelaksanaan</a>
            <a href="#panduan" className="hover:text-slate-900 transition-colors">Panduan & Bantuan</a>
            <a href="#kontak" className="hover:text-brand-600 transition-colors">Kontak</a>
          </nav>

          {/* Dual Action Login Buttons */}
          <div className="flex items-center space-x-2.5">
            {/* Student CBT Quick Entry Button */}
            <button
              type="button"
              onClick={() => onOpenLogin('student')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all transform active:scale-95"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Masuk CBT Siswa</span>
            </button>

            {/* Officer Portal Button */}
            <button
              type="button"
              onClick={() => onOpenLogin('officer')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              <span className="hidden sm:inline">Portal Petugas</span>
            </button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION DENGAN 2 KARTU INTERAKTIF
      ========================================================================= */}
      <section id="beranda" className="relative pt-12 pb-20 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100">
        
        {/* Background Decorative Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-tr from-brand-200/40 via-sky-200/30 to-emerald-100/30 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4">
            
            {/* Official Badge Tag */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-extrabold shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-spin" />
              <span>Platform Evaluasi Pendidikan Standar Nasional • Jenjang SD & SMP</span>
            </div>

            {/* Main Headline (Diperhalus proporsinya agar elegan dan seimbang) */}
            <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-black text-slate-950 tracking-tight leading-snug sm:leading-tight max-w-4xl mx-auto">
              Transformasi Asesmen Belajar Menjadi Lebih{' '}
              <span className="bg-gradient-to-r from-brand-600 via-sky-600 to-teal-600 bg-clip-text text-transparent">
                Akurat, Terstruktur,
              </span>{' '}
              dan Menyenangkan.
            </h1>

            {/* Sub-headline */}
            <p className="text-xs sm:text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium">
              Platform manajemen ujian modern dengan <strong>Koreksi Otomatis & Koreksi Guru</strong>, bank soal multi-varian (HOTS & AKM), serta pelaksanaan ujian ramah anak dengan <strong>Dual-Storage Autosave</strong> (tahan mati lampu & offline).
            </p>

            {/* Hero CTA Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onOpenLogin('student')}
                className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white text-sm font-black shadow-xl shadow-brand-500/25 flex items-center space-x-2.5 transition-all transform hover:-translate-y-0.5 active:scale-95"
              >
                <GraduationCap className="w-5 h-5" />
                <span>Mulai Asesmen CBT Siswa</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <button
                type="button"
                onClick={() => onOpenLogin('student', 'SASI26')}
                className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-sm font-bold shadow-xs transition-all flex items-center space-x-2"
              >
                <PlayCircle className="w-4 h-4 text-brand-600" />
                <span>Coba Demo Simulasi Siswa</span>
              </button>
            </div>

          </div>

          {/* Dua Kartu Interaktif Berdampingan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14 max-w-4xl mx-auto">
            
            {/* KARTU 1: AKSES CEPAT SISWA (MASUKKAN TOKEN TES) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-brand-200 shadow-xl shadow-brand-500/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-10 -mt-10 pointer-events-none" />
              
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-md shadow-brand-500/20">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Akses Cepat Siswa</h3>
                  <p className="text-xs text-slate-500">Punya token dari proktor ruangan? Masuk langsung.</p>
                </div>
              </div>

              <form onSubmit={handleQuickTokenSubmit} className="space-y-3 mt-4">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-600 tracking-wider mb-1">
                    Masukkan Token Ujian (6 Digit)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="CONTOH: SASI26"
                      value={quickTokenInput}
                      onChange={(e) => setQuickTokenInput(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center font-mono font-black text-lg tracking-widest text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 uppercase transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all transform active:scale-95"
                >
                  <span>Buka Lembar Ujian & Konfirmasi Data</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-[10px] text-center text-slate-400 italic">
                  * Token resmi dibagikan oleh Proktor Ruangan sesaat sebelum ujian dimulai.
                </p>
              </form>
            </div>

            {/* KARTU 2: RINGKASAN STATUS ASESMEN & KEANDALAN CBT */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
              
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-black tracking-wider uppercase text-emerald-400">
                      Sesi CBT Berjalan
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                    Live Server SASI
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Asesmen Aktif Saat Ini:</span>
                    <h4 className="font-extrabold text-base text-white mt-0.5">
                      Sumatif Akhir Semester (SAS), Formatif & Remedial
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">Daya Tahan Gangguan</span>
                      <span className="text-sm font-black text-emerald-400 flex items-center space-x-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 inline" />
                        <span>Autosave Ganda</span>
                      </span>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                      <span className="text-[10px] text-slate-400 block">Kesiapan Butir Soal</span>
                      <span className="text-sm font-black text-brand-300 mt-0.5 block">
                        Multi-Varian Paralel
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status footer inside card */}
              <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span>Skoring: Otomatis & Koreksi Guru</span>
                <span className="text-emerald-400 font-bold">100% Real-Time</span>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================================
          3. STATISTIK COUNTER BAR
      ========================================================================= */}
      <section className="bg-white border-y border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-brand-600">Dual Penilaian</div>
              <p className="text-xs font-semibold text-slate-500">Skoring Otomatis + Modul Koreksi Guru</p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">Dual-Storage</div>
              <p className="text-xs font-semibold text-slate-500">Autosave Tahan Mati Lampu & Ganti Laptop</p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-sky-600">Multi-Varian</div>
              <p className="text-xs font-semibold text-slate-500">Parallel Item Banking per Kisi-Kisi</p>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-purple-600">Live Control</div>
              <p className="text-xs font-semibold text-slate-500">3 Tombol Darurat Proktor Real-Time</p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          4. 8 FITUR UNGGULAN LENGKAP SISTEM SASI
      ========================================================================= */}
      <section id="fitur" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-2 mb-14">
            <span className="text-xs font-black uppercase tracking-wider text-brand-600">
              Keunggulan Komprehensif
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dirancang untuk Kemudahan Guru, Ketepatan Proktor, dan Ketenangan Siswa.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Sistem kami dibangun berdasarkan realitas dan kebutuhan nyata laboratorium komputer sekolah di Indonesia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Fitur 1: Koreksi Ganda (Otomatis & Guru) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-brand-400 hover:shadow-xl transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Koreksi Otomatis & Koreksi Guru
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Skoring instan real-time untuk PG Tunggal, PGK (Pilihan Ganda Kompleks), dan Isian. Dilengkapi modul koreksi guru khusus Uraian/Esai dengan rubrik penilaian objektif dan catatan feedback.
              </p>
            </div>

            {/* Fitur 2: Dual-Storage Autosave */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Dual-Storage Autosave
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Jawaban otomatis tersimpan simultan di peramban lokal dan Supabase Cloud. Jika listrik padam, tab tertutup, atau ganti laptop/HP, siswa langsung melanjutkan tanpa kehilangan jawaban.
              </p>
            </div>

            {/* Fitur 3: Sesi Remedial Mandiri */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <RotateCcw className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Sesi Ujian Utama & Remedial
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Siswa yang memperoleh nilai di bawah KKTP dapat mengikuti sesi remedial dengan paket dan token mandiri, tanpa terganjal atau terblokir oleh riwayat ujian utama sebelumnya.
              </p>
            </div>

            {/* Fitur 4: Bank Soal Multi-Varian Kurikulum Merdeka */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-sky-400 hover:shadow-xl transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Bank Soal Multi-Varian & AKM
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mendukung 5 model soal kurikulum merdeka (Fase A-D). Tiap butir kisi-kisi memiliki 5+ variasi butir soal paralel setara (HOTS & AKM) yang diacak otomatis antar siswa guna mencegah saling contek.
              </p>
            </div>

            {/* Fitur 5: Live Proctoring & 3 Tombol Darurat */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-brand-400 hover:shadow-xl transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Live Proctor & 3 Tombol Darurat
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Proktor memantau layar pengerjaan secara langsung dan dilengkapi <strong>3 Tombol Darurat</strong>: Lihat Kartu/PIN, Reset PIN Baru, dan Lepas Kunci Sesi (*Force Unlock*) jika komputer macet.
              </p>
            </div>

            {/* Fitur 6: Administrasi Ujian & Cetak PDF Otomatis */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-rose-400 hover:shadow-xl transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Berita Acara & Dokumen PDF Terpadu
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cetak Berita Acara (BA) realtime, Daftar Hadir Peserta yang otomatis mengintegrasikan Pengawas Ruang per sesi, Kartu Peserta Ujian ber-PIN, dan Denah Ruang Ujian dengan ruang tanda tangan proporsional.
              </p>
            </div>

            {/* Fitur 7: Impor & Ekspor Siswa Excel (.xlsx) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-teal-400 hover:shadow-xl transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Impor & Ekspor Siswa Excel (.xlsx)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Impor data siswa massal dari format Microsoft Excel (.xlsx) dengan unduh template resmi, fitur auto-generate PIN unik acak untuk SD & SMP, tombol acak PIN manual, dan ekspor instan .xlsx.
              </p>
            </div>

            {/* Fitur 8: Antarmuka Ramah Anak & Multi-Perangkat */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-cyan-400 hover:shadow-xl transition-all space-y-3.5 group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                <Laptop className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900">
                Ramah Anak & Multi-Perangkat
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Antarmuka bersih ramah anak SD & SMP dengan pilihan ukuran huruf soal (A, A+, A++), panel daftar nomor soal interaktif, serta responsif di Chromebook, PC Lab, Laptop, maupun Tablet/HP.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          5. ALUR 3 LANGKAH MUDAH PELAKSANAAN CBT
      ========================================================================= */}
      <section id="alur" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-14">
            <span className="text-xs font-black uppercase tracking-wider text-brand-600">
              Alur Baku SASI
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              3 Langkah Mudah Pelaksanaan Ujian Sekolah
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Proses terstruktur dari perumusan kisi-kisi hingga penerbitan hasil asesmen secara transparan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="p-7 rounded-3xl bg-slate-50 border border-slate-200 relative space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-brand-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-brand-500/20">
                1
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                Guru Petakan & Tulis Soal
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Guru menyusun kisi-kisi standar kurikulum merdeka, menulis butir soal dan variannya, serta menelaah hingga berstatus <strong>Selesai</strong>.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-7 rounded-3xl bg-slate-50 border border-slate-200 relative space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-sky-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-sky-500/20">
                2
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                Proktor Rilis Sesi & Token
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Proktor merakit paket ujian, menerbitkan token ruangan 6 digit, dan membagikan kartu peserta ujian ber-PIN unik kepada siswa.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-7 rounded-3xl bg-slate-50 border border-slate-200 relative space-y-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-emerald-500/20">
                3
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                Siswa Ujian & Penilaian Instan
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Siswa mengerjakan soal di arena CBT dengan autosave otomatis. Begitu tes dikumpulkan, nilai PG/PGK/Isian langsung terhitung, dan esai siap dinilai oleh guru.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          6. TATA TERTIB & PANDUAN RINGKAS (FAQ)
      ========================================================================= */}
      <section id="panduan" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-black uppercase tracking-wider text-brand-600">
              Pusat Informasi & Bantuan
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Bagaimana cara siswa login jika lupa kartu atau belum punya PIN?",
                a: "Siswa cukup melapor kepada Proktor Ruangan. Proktor dapat menekan tombol 'Lihat Kartu & PIN' atau melakukan 'Reset PIN Baru' dalam 1 kali klik dari dashboard Live Monitoring."
              },
              {
                q: "Apakah jawaban siswa hilang jika komputer mati lampu, ter-refresh, atau ganti laptop?",
                a: "Tidak hilang sama sekali. Sistem SASI menerapkan Dual-Storage Autosave: jawaban disimpan seketika di penyimpanan peramban lokal dan disinkronkan ke Supabase Cloud. Saat login kembali di laptop mana pun, siswa melanjutkan persis dari posisi terakhir."
              },
              {
                q: "Bagaimana sistem penilaian soal Uraian atau Esai?",
                a: "SASI menyediakan modul khusus 'Koreksi Guru'. Guru mata pelajaran dapat membuka lembar jawaban uraian siswa, memberikan skor berdasarkan rubrik penilaian objektif, serta membubuhkan umpan balik langsung."
              },
              {
                q: "Apa itu Multi-Varian Soal Paralel?",
                a: "Multi-Varian adalah kemampuan satu butir kisi-kisi menghasilkan hingga 5+ soal berbeda dengan tingkat kognitif dan indikator yang setara, sehingga tiap siswa di laboratorium menerima variasi soal yang berbeda dan tidak bisa saling menyontek."
              },
              {
                q: "Bagaimana cara proktor melepas kunci sesi siswa yang komputernya hang?",
                a: "Proktor cukup mengklik tombol 'Lepas Kunci' (Reset Login Status) pada baris nama siswa yang bersangkutan. Siswa tersebut bisa langsung login di komputer cadangan tanpa kehilangan jawaban."
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-slate-900 hover:text-brand-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`text-brand-600 text-lg transition-transform ${activeFaq === idx ? 'rotate-45' : ''}`}>
                    +
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          7. BOTTOM CALL TO ACTION BANNER
      ========================================================================= */}
      <section className="py-16 bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
          
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto">
            Siap Tingkatkan Kualitas dan Ketertiban Asesmen di Sekolah Anda?
          </h2>
          
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Gunakan platform SASI untuk penyelenggaraan Asesmen Formatif, STS/PTS, SAS, SAT, SAJ, hingga Remedial yang terstandar dan transparan.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenLogin('student')}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-black shadow-xl shadow-emerald-500/25 flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Masuk Ujian Siswa Sekarang</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenLogin('officer')}
              className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs sm:text-sm font-bold transition-all flex items-center space-x-2"
            >
              <ShieldCheck className="w-4 h-4 text-sky-300" />
              <span>Portal Guru & Proktor Ruangan</span>
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          8. KONTAK TIM PENGEMBANG & HELPDESK (SUSUNAN HORIZONTAL & UKURAN DIPERKECIL)
      ========================================================================= */}
      <section id="kontak" className="py-12 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header Ringkas */}
          <div className="text-center space-y-1 mb-6">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-600 bg-brand-50 border border-brand-200 px-3 py-0.5 rounded-full inline-block">
              Layanan Bantuan & Konsultasi
            </span>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              Kontak Tim Pengembang & Helpdesk
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              <strong>Agi Hamdani, M.Pd</strong> • Pengembang Sistem Asesmen Sekolah Indonesia (SASI)
            </p>
          </div>

          {/* Kotak Horizontal Berdampingan dengan Ukuran Ringkas / Hemat Space */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* Kotak 1: WhatsApp */}
            <a 
              href="https://wa.me/6282118449525?text=Halo%20Pak%20Agi%20Hamdani,%20saya%20ingin%20berkonsultasi%20terkait%20Sistem%20Asesmen%20Sekolah%20Indonesia%20(SASI)."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/90 border border-emerald-300 text-emerald-950 transition-all hover:shadow-xs group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">
                    Helpdesk WhatsApp / HP
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono leading-tight">
                    082118449525
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Klik untuk chat WA langsung
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow-xs group-hover:bg-emerald-700 transition-colors flex items-center space-x-1 shrink-0">
                <span>Chat WA</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </a>

            {/* Kotak 2: Email */}
            <a 
              href="mailto:agihamdani88@gmail.com?subject=Konsultasi%20Sistem%20Asesmen%20Sekolah%20Indonesia%20(SASI)"
              className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl bg-sky-50/70 hover:bg-sky-100/90 border border-sky-300 text-sky-950 transition-all hover:shadow-xs group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase text-sky-700 tracking-wider">
                    Email Resmi Pengembang
                  </div>
                  <div className="text-sm font-black text-slate-900 font-mono leading-tight truncate max-w-[140px] sm:max-w-none">
                    agihamdani88@gmail.com
                  </div>
                  <div className="text-[10px] text-sky-700">
                    Kirim surat aduan / konsultasi
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-bold shadow-xs group-hover:bg-sky-700 transition-colors flex items-center space-x-1 shrink-0">
                <span>Kirim Email</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </a>

          </div>

        </div>
      </section>

      {/* =========================================================================
          9. PUBLIC FOOTER BERSIH & STANDAR
      ========================================================================= */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            {/* Kiri: Brand SASI */}
            <div className="flex items-center space-x-3.5">
              <div className="bg-white/95 px-3 py-1.5 rounded-xl shadow-xs">
                <img 
                  src="/sasipedia-logo.png" 
                  alt="SASIPEDIA" 
                  className="h-7 sm:h-8 w-auto object-contain"
                />
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] text-slate-400 font-medium">Sistem Asesmen Sekolah Indonesia</p>
                <p className="text-[10px] text-slate-500 font-mono">sasipedia.my.id</p>
              </div>
            </div>

            {/* Navigasi Footer */}
            <div className="flex flex-wrap items-center gap-6 text-slate-400 font-medium">
              <a href="#beranda" className="hover:text-white transition-colors">Beranda</a>
              <a href="#fitur" className="hover:text-white transition-colors">Fitur Unggulan</a>
              <a href="#alur" className="hover:text-white transition-colors">Alur Ujian</a>
              <a href="#panduan" className="hover:text-white transition-colors">Pusat Bantuan</a>
              <a href="#kontak" className="hover:text-white transition-colors">Kontak Pengembang</a>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} SASI (Sistem Asesmen Sekolah Indonesia). Dikembangkan oleh <strong>Agi Hamdani, M.Pd</strong>.</p>
            <p>Standar Kurikulum Merdeka Fase A s.d. D (Jenjang SD & SMP)</p>
          </div>

        </div>
      </footer>

    </div>
  );
};

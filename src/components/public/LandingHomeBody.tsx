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

interface LandingHomeBodyProps {
  onOpenLogin: (tab: 'student' | 'officer', quickToken?: string) => void;
  onNavigateInsights: () => void;
  onNavigateCreativity: () => void;
  onNavigateQuestionBank: () => void;
}

export const LandingHomeBody: React.FC<LandingHomeBodyProps> = ({
  onOpenLogin,
  onNavigateInsights,
  onNavigateCreativity,
  onNavigateQuestionBank
}) => {
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
    <div className="bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      
      {/* =========================================================================
          1. HERO SECTION DENGAN POLET GRADASI BIRU GELAP (KOMPAK & FIT 1 HALAMAN)
      ========================================================================= */}
      <section id="beranda" className="relative pt-4 pb-7 sm:pt-6 sm:pb-8 overflow-hidden bg-gradient-to-b from-[#071328] via-[#091d3c] to-[#040e1f] text-white border-b border-slate-800">
        
        {/* Background Decorative Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-tr from-blue-600/20 via-sky-500/10 to-emerald-500/10 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-2.5">
            
            {/* Official Badge Tag */}
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[11px] font-bold shadow-xs">
              <Sparkles className="w-3 h-3 text-sky-400 animate-spin" />
              <span>Platform Evaluasi Pendidikan Standar Nasional • Jenjang SD & SMP</span>
            </div>

            {/* Main Headline (Diperkecil & Ramping) */}
            <h1 className="text-xl sm:text-2xl lg:text-[32px] font-black text-white tracking-tight leading-snug sm:leading-tight max-w-3xl mx-auto">
              Transformasi Asesmen Belajar Menjadi Lebih{' '}
              <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-300 bg-clip-text text-transparent">
                Akurat, Terstruktur,
              </span>{' '}
              dan Menyenangkan.
            </h1>

            {/* Sub-headline (Lebih Padat) */}
            <p className="text-xs sm:text-xs md:text-sm text-slate-300 leading-normal max-w-xl mx-auto font-normal">
              Platform manajemen ujian modern dengan <strong className="text-white font-semibold">Koreksi Otomatis & Koreksi Guru</strong>, bank soal multi-varian (HOTS & AKM), serta <strong className="text-white font-semibold">Dual-Storage Autosave</strong> (tahan mati lampu & offline).
            </p>

            {/* Hero CTA Action Buttons (Compact) */}
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => onOpenLogin('student')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 active:scale-95 group"
              >
                <GraduationCap className="w-4 h-4 text-emerald-100 transition-transform group-hover:rotate-12" />
                <span>Mulai Asesmen CBT Siswa</span>
                <ArrowRight className="w-3.5 h-3.5 ml-0.5 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => onOpenLogin('student', 'SASI26')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border-2 border-white/25 text-xs font-bold backdrop-blur-md transition-all flex items-center space-x-1.5 shadow-xs"
              >
                <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
                <span>Coba Demo Simulasi Siswa</span>
              </button>
            </div>

          </div>

          {/* Dua Kartu Interaktif Berdampingan (Jarak Diperpendek, Ramping & Muat di Layar) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 sm:mt-6 max-w-4xl mx-auto">
            
            {/* KARTU 1: AKSES CEPAT SISWA (COMPACT) */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-sky-400 shadow-xl shadow-black/50 relative overflow-hidden group text-slate-900 transition-all duration-300 hover:border-sky-300">
              <div className="absolute top-0 right-0 w-28 h-28 bg-sky-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
              
              <div className="flex items-center space-x-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Akses Cepat Siswa</h3>
                  <p className="text-[11px] text-slate-500">Punya token dari proktor ruangan? Masuk langsung.</p>
                </div>
              </div>

              <form onSubmit={handleQuickTokenSubmit} className="space-y-2 mt-2.5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 tracking-wider mb-0.5">
                    Masukkan Token Ujian (6 Digit)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="CONTOH: SASI26"
                      value={quickTokenInput}
                      onChange={(e) => setQuickTokenInput(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl text-center font-mono font-black text-base tracking-widest text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 uppercase transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:via-teal-700 hover:to-sky-700 text-white text-xs font-black rounded-xl shadow-sm border-2 border-emerald-400/50 flex items-center justify-center space-x-1.5 transition-all transform active:scale-95"
                >
                  <span>Buka Lembar Ujian & Konfirmasi Data</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <p className="text-[9px] text-center text-slate-400 italic">
                  * Token resmi dibagikan oleh Proktor Ruangan sesaat sebelum ujian dimulai.
                </p>
              </form>
            </div>

            {/* KARTU 2: RINGKASAN STATUS ASESMEN & KEANDALAN CBT (COMPACT) */}
            <div className="bg-gradient-to-br from-[#162952] via-[#112040] to-[#0d1830] rounded-2xl p-4 sm:p-5 border-2 border-sky-400 shadow-xl shadow-black/50 relative overflow-hidden flex flex-col justify-between text-white backdrop-blur-md transition-all duration-300 hover:border-sky-300">
              
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-sky-500/25">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[11px] font-black tracking-wider uppercase text-emerald-400">
                      Sesi CBT Berjalan
                    </span>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-200 border-2 border-sky-400/50 shadow-xs">
                    Live Server SASI
                  </span>
                </div>

                <div className="mt-2.5 space-y-2">
                  <div>
                    <span className="text-[10px] text-sky-200/80 font-medium">Asesmen Aktif Saat Ini:</span>
                    <h4 className="font-extrabold text-xs sm:text-sm text-white mt-0.5 line-clamp-1">
                      Sumatif Akhir Semester (SAS), Formatif & Remedial
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <div className="bg-[#09152b]/90 border-2 border-sky-500/40 rounded-lg p-2 shadow-inner">
                      <span className="text-[9px] text-slate-400 block font-medium">Daya Tahan Gangguan</span>
                      <span className="text-xs font-black text-emerald-400 flex items-center space-x-1 mt-0.5">
                        <CheckCircle2 className="w-3 h-3 inline text-emerald-400" />
                        <span>Autosave Ganda</span>
                      </span>
                    </div>

                    <div className="bg-[#09152b]/90 border-2 border-sky-500/40 rounded-lg p-2 shadow-inner">
                      <span className="text-[9px] text-slate-400 block font-medium">Kesiapan Butir Soal</span>
                      <span className="text-xs font-black text-sky-300 mt-0.5 block truncate">
                        Multi-Varian Paralel
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status footer inside card */}
              <div className="pt-2.5 mt-2.5 border-t border-sky-500/25 flex items-center justify-between text-[11px] text-slate-300">
                <span>Skoring: Otomatis & Guru</span>
                <span className="text-emerald-400 font-bold">100% Real-Time</span>
              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================================
          2. STATISTIK COUNTER BAR (PADAT & RAMPING)
      ========================================================================= */}
      <section className="bg-white border-y-2 border-slate-200 py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
            
            <div className="space-y-0.5 p-2.5 rounded-xl bg-slate-50/70 border-2 border-slate-200 shadow-xs">
              <div className="text-lg sm:text-xl font-black text-brand-600">Dual Penilaian</div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Skoring Otomatis + Meja Koreksi Guru</p>
            </div>

            <div className="space-y-0.5 p-2.5 rounded-xl bg-slate-50/70 border-2 border-slate-200 shadow-xs">
              <div className="text-lg sm:text-xl font-black text-emerald-600">Dual-Storage</div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Autosave Tahan Mati Lampu & Offline</p>
            </div>

            <div className="space-y-0.5 p-2.5 rounded-xl bg-slate-50/70 border-2 border-slate-200 shadow-xs">
              <div className="text-lg sm:text-xl font-black text-sky-600">Multi-Varian</div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Parallel Item Banking per Kisi-Kisi</p>
            </div>

            <div className="space-y-0.5 p-2.5 rounded-xl bg-slate-50/70 border-2 border-slate-200 shadow-xs">
              <div className="text-lg sm:text-xl font-black text-purple-600">Live Control</div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">3 Tombol Darurat Proktor Real-Time</p>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          3. 4 PILAR PORTAL EDUKASI PUBLIK (PINTU MASUK KE MENU UTAMA - COMPACT)
      ========================================================================= */}
      <section className="py-8 sm:py-10 bg-gradient-to-b from-white to-slate-50 border-b-2 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-6 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600">
              Ekosistem Terpadu
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Lebih dari Sekadar Mesin Ujian
            </h2>
            <p className="text-xs text-slate-600 max-w-xl mx-auto">
              SASIPEDIA hadir sebagai pusat literasi asesmen, bank instrumen evaluasi, dan alat bantu produktivitas cerdas bagi para pendidik di seluruh Indonesia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Kartu 1: Wawasan Soal */}
            <div 
              onClick={onNavigateInsights}
              className="bg-white p-5 rounded-2xl border-2 border-slate-300 hover:border-sky-500 shadow-xs hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border-2 border-sky-200 text-sky-600 flex items-center justify-center font-bold group-hover:bg-sky-600 group-hover:text-white group-hover:border-sky-600 transition-all">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-sky-600 transition-colors">
                  Wawasan Soal & Asesmen
                </h3>
                <p className="text-xs text-slate-600 leading-normal text-justify">
                  Panduan baku penulisan soal bermutu, bedah karakteristik stimulus AKM (Literasi & Numerasi), serta teknik analisis butir (daya beda & tingkat kesukaran).
                </p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-slate-100 flex items-center text-xs font-bold text-sky-600">
                <span>Jelajahi Panduan →</span>
              </div>
            </div>

            {/* Kartu 2: Kisi-Kisi & Bank Soal */}
            <div 
              onClick={onNavigateQuestionBank}
              className="bg-white p-5 rounded-2xl border-2 border-slate-300 hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Kisi-Kisi & Bank Soal SD
                </h3>
                <p className="text-xs text-slate-600 leading-normal text-justify">
                  Matriks kisi-kisi dan kartu soal siap cetak untuk Fase A, B, dan C. Dilengkapi sebaran level kognitif (L1-L3) dan instrumen asesmen diagnostik.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-slate-100 flex items-center text-xs font-bold text-emerald-600">
                <span>Lihat Katalog Soal →</span>
              </div>
            </div>

            {/* Kartu 3: Ruang Kreativitas Guru AI */}
            <div 
              onClick={onNavigateCreativity}
              className="bg-white p-5 rounded-2xl border-2 border-slate-300 hover:border-amber-500 shadow-xs hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-600 flex items-center justify-center font-bold group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-500 transition-all">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-700 transition-colors">
                  Ruang Kreativitas Guru
                </h3>
                <p className="text-xs text-slate-600 leading-normal text-justify">
                  Asisten Prompt AI 6 alur mengajar (Modul Ajar, LKPD, Soal, IKTP Rapor, Kokurikuler, Refleksi) serta repositori administrasi guru gratis (DOCX/XLSX).
                </p>
              </div>
              <div className="pt-3 mt-3 border-t-2 border-slate-100 flex items-center text-xs font-bold text-amber-700">
                <span>Buka Ruang Kreativitas →</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          4. ALUR PELAKSANAAN (COMPACT)
      ========================================================================= */}
      <section id="alur" className="py-8 sm:py-10 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto space-y-1 mb-6">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-400">
              Alur Operasional Sederhana
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
              4 Langkah Mudah Pelaksanaan Ujian Sekolah
            </h2>
            <p className="text-xs text-slate-400">
              Tanpa instalasi rumit, cukup buka peramban web modern di laboratorium atau kelas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 relative">
            
            <div className="bg-white/5 border-2 border-slate-700/80 hover:border-brand-400 rounded-2xl p-4 relative group hover:bg-white/10 transition-all shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-brand-500 text-slate-950 flex items-center justify-center font-black text-xs mb-2.5 shadow-sm">
                01
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Penyiapan Bank Soal</h3>
              <p className="text-[11px] text-slate-400 leading-normal text-justify">
                Guru mengunggah naskah soal lengkap dengan kunci dan rubrik uraian melalui portal Meja Koreksi Guru.
              </p>
            </div>

            <div className="bg-white/5 border-2 border-slate-700/80 hover:border-sky-400 rounded-2xl p-4 relative group hover:bg-white/10 transition-all shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-sky-500 text-slate-950 flex items-center justify-center font-black text-xs mb-2.5 shadow-sm">
                02
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Aktivasi Sesi & Token</h3>
              <p className="text-[11px] text-slate-400 leading-normal text-justify">
                Proktor mengaktifkan sesi ujian dan merilis token 6 digit di layar proyektor ruangan ujian.
              </p>
            </div>

            <div className="bg-white/5 border-2 border-slate-700/80 hover:border-emerald-400 rounded-2xl p-4 relative group hover:bg-white/10 transition-all shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs mb-2.5 shadow-sm">
                03
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Pengerjaan Siswa</h3>
              <p className="text-[11px] text-slate-400 leading-normal text-justify">
                Siswa login dengan NISN + Token. Jawaban otomatis tersimpan setiap kali tombol opsi diklik.
              </p>
            </div>

            <div className="bg-white/5 border-2 border-slate-700/80 hover:border-purple-400 rounded-2xl p-4 relative group hover:bg-white/10 transition-all shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-purple-500 text-slate-950 flex items-center justify-center font-black text-xs mb-2.5 shadow-sm">
                04
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Penilaian & Rekap</h3>
              <p className="text-[11px] text-slate-400 leading-normal text-justify">
                Nilai PG langsung keluar seketika. Guru memeriksa jawaban esai secara terpadu dan mengunduh rekap nilai Excel.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          5. FAQ (PERTANYAAN SERING DIAJUKAN - COMPACT)
      ========================================================================= */}
      <section id="panduan" className="py-8 sm:py-10 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-1 mb-6">
            <span className="text-[10px] font-black uppercase tracking-wider text-brand-600">
              Pusat Informasi & Bantuan
            </span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
          </div>

          <div className="space-y-2.5">
            {[
              {
                q: "Apa yang terjadi jika jaringan internet putus saat siswa sedang ujian?",
                a: "Sistem SASI dilengkapi mekanisme Dual-Storage Autosave. Setiap jawaban siswa langsung dienkripsi dan disimpan di cache browser lokal secara instan. Begitu koneksi internet pulih, sistem secara otomatis menyinkronkan seluruh jawaban ke server tanpa ada data yang hilang."
              },
              {
                q: "Bagaimana cara guru memeriksa jawaban soal bentuk uraian / esai?",
                a: "Guru masuk ke 'Portal Petugas' lalu membuka 'Meja Koreksi Guru'. Seluruh jawaban uraian siswa dikelompokkan per nomor soal, lengkap dengan kunci jawaban ideal, pedoman rubrik, dan kotak input nilai mandiri."
              },
              {
                q: "Apakah seluruh modul dan LKPD di Ruang Kreativitas Guru dapat diunduh gratis?",
                a: "Ya! Seluruh berkas template modul ajar, LKPD, kisi-kisi, dan format administrasi kelas di SASIPEDIA disediakan gratis untuk mendukung kemandirian guru di seluruh Indonesia."
              }
            ].map((item, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-xs hover:border-slate-400 transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-3.5 text-left flex items-center justify-between text-xs sm:text-xs font-bold text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  <span>{item.q}</span>
                  <span className="text-base font-mono text-slate-400 ml-3">
                    {activeFaq === idx ? '−' : '+'}
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className="px-3.5 pb-3.5 text-xs text-slate-600 leading-relaxed border-t-2 border-slate-100 pt-2 text-justify">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

    </div>
  );
};

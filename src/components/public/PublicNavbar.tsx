import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Layers, 
  Sparkles, 
  Menu, 
  X, 
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

export type PublicNavRoute = 
  | 'beranda'
  | 'wawasan-asesmen'
  | 'bank-soal'
  | 'ruang-kreativitas'
  | 'profil-pengembang'
  | 'privacy-policy'
  | 'terms'
  | 'about-contact';

export interface PublicNavOptions {
  category?: string;
  tab?: 'ai' | 'kontribusi' | 'perangkat' | 'lkpd' | 'administrasi';
  generatorIndex?: number;
}

interface PublicNavbarProps {
  currentRoute: PublicNavRoute;
  onNavigate: (route: PublicNavRoute, options?: PublicNavOptions) => void;
  onOpenLogin: (tab: 'student' | 'officer', quickToken?: string) => void;
}

interface SubMenuItem {
  icon: string; // 3D / Emotikon Berwarna
  label: string;
  route: PublicNavRoute;
  options?: PublicNavOptions;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentRoute,
  onNavigate,
  onOpenLogin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccordion, setMobileAccordion] = useState<'wawasan' | 'bank' | 'kreativitas' | null>(null);

  // ===========================================================================
  // SUB-MENU DEFINITIONS (Hanya Judul + Ikon 3D Berwarna)
  // ===========================================================================
  const wawasanItems: SubMenuItem[] = [
    {
      icon: '📖',
      label: 'Panduan Asesmen Sekolah',
      route: 'wawasan-asesmen',
      options: { category: 'Panduan Asesmen' }
    },
    {
      icon: '🧠',
      label: 'Bedah AKM Literasi & Numerasi',
      route: 'wawasan-asesmen',
      options: { category: 'Bedah AKM' }
    },
    {
      icon: '🔍',
      label: 'Analisis Butir & Kaidah TKA',
      route: 'wawasan-asesmen',
      options: { category: 'Analisis Butir' }
    },
    {
      icon: '📐',
      label: 'Pedoman Rubrik & Penskoran',
      route: 'wawasan-asesmen',
      options: { category: 'Rubrik & Penskoran' }
    }
  ];

  const bankSoalItems: SubMenuItem[] = [
    {
      icon: '📋',
      label: 'Matriks Kisi-Kisi SD (Fase A-C)',
      route: 'bank-soal',
      options: { category: 'Matriks Kisi-Kisi' }
    },
    {
      icon: '📑',
      label: 'Naskah Kartu Soal Lengkap',
      route: 'bank-soal',
      options: { category: 'Naskah Kartu Soal' }
    },
    {
      icon: '🎯',
      label: 'Instrumen Asesmen Diagnostik Awal',
      route: 'bank-soal',
      options: { category: 'Instrumen Diagnostik Awal' }
    }
  ];

  const kreativitasAiItems: SubMenuItem[] = [
    {
      icon: '📝',
      label: 'Generator Modul Ajar',
      route: 'ruang-kreativitas',
      options: { tab: 'ai', generatorIndex: 0 }
    },
    {
      icon: '📄',
      label: 'Generator LKPD Siswa',
      route: 'ruang-kreativitas',
      options: { tab: 'ai', generatorIndex: 1 }
    },
    {
      icon: '🎯',
      label: 'Generator Kisi-Kisi & Soal',
      route: 'ruang-kreativitas',
      options: { tab: 'ai', generatorIndex: 2 }
    },
    {
      icon: '📊',
      label: 'Generator Rubrik & Rapor',
      route: 'ruang-kreativitas',
      options: { tab: 'ai', generatorIndex: 3 }
    },
    {
      icon: '🌿',
      label: 'Generator Modul Kokurikuler',
      route: 'ruang-kreativitas',
      options: { tab: 'ai', generatorIndex: 4 }
    },
    {
      icon: '💬',
      label: 'Generator Refleksi & Umpan Balik',
      route: 'ruang-kreativitas',
      options: { tab: 'ai', generatorIndex: 5 }
    }
  ];

  const kreativitasSumberItems: SubMenuItem[] = [
    {
      icon: '✍️',
      label: 'Tulis & Publikasi Karya Guru',
      route: 'ruang-kreativitas',
      options: { tab: 'kontribusi' }
    },
    {
      icon: '📚',
      label: 'Perangkat Kurikulum Merdeka',
      route: 'ruang-kreativitas',
      options: { tab: 'perangkat' }
    },
    {
      icon: '🎨',
      label: 'Bank LKPD & Media Visual',
      route: 'ruang-kreativitas',
      options: { tab: 'lkpd' }
    },
    {
      icon: '📥',
      label: 'Pusat Unduhan Administrasi Guru',
      route: 'ruang-kreativitas',
      options: { tab: 'administrasi' }
    }
  ];

  // Helper navigasi langsung
  const handleItemClick = (item: SubMenuItem) => {
    onNavigate(item.route, item.options);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRouteClick = (route: PublicNavRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCbtClick = () => {
    setMobileMenuOpen(false);
    onOpenLogin('student');
  };

  const toggleMobileAccordion = (key: 'wawasan' | 'bank' | 'kreativitas') => {
    setMobileAccordion(prev => prev === key ? null : key);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-slate-200 shadow-xs transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between gap-3">
        
        {/* =====================================================================
            1. BRAND LOGO (Klik -> Kembali ke Beranda, Jelas & Proporsional)
        ===================================================================== */}
        <button
          type="button"
          onClick={() => handleRouteClick('beranda')}
          className="flex items-center space-x-2.5 group focus:outline-hidden"
          title="Kembali ke Beranda SASIPEDIA"
        >
          <img 
            src="/sasipedia-logo.png" 
            alt="SASIPEDIA - Sistem Asesmen Sekolah Indonesia" 
            className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </button>

        {/* =====================================================================
            2. DESKTOP NAVIGATION (Modern Crisp Pill Buttons + Clean Dropdown)
        ===================================================================== */}
        <nav className="hidden lg:flex items-center space-x-2 xl:space-x-2.5">
          
          {/* -----------------------------------------------------------------
              Pill 1: Soal & Asesmen (Vibrant Ocean / Sky Gradient)
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('wawasan-asesmen')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer bg-gradient-to-r from-blue-100/90 via-sky-100 to-blue-50 hover:from-blue-200/90 hover:via-sky-200 hover:to-blue-100 text-blue-950 border-2 border-blue-400 hover:border-blue-600 ${
                currentRoute === 'wawasan-asesmen' ? 'ring-2 ring-blue-500/40 border-blue-600 from-blue-200 via-sky-200 to-blue-100 shadow-sm' : ''
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-700 transition-transform group-hover:scale-110" />
              <span>Soal & Asesmen</span>
              <ChevronDown className="w-3.5 h-3.5 text-blue-600 group-hover:text-blue-950 transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Clean Flyout Dropdown (Solid White Background, Zero Transparency) */}
            <div className="absolute left-0 top-full pt-2 w-76 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-76 bg-white border-2 border-slate-300 shadow-2xl rounded-2xl p-2.5 space-y-2">
                {wawasanItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-100/75 via-sky-50 to-blue-50/90 hover:from-blue-200/80 hover:via-sky-100 hover:to-blue-100 border-2 border-blue-300 hover:border-blue-500 shadow-xs hover:shadow-sm transition-all text-xs font-bold text-blue-950 hover:text-blue-900 cursor-pointer group/item"
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border-2 border-blue-200 text-base shadow-xs flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              Pill 2: Kisi-Kisi & Bank Soal (Vibrant Royal Indigo / Violet Gradient)
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('bank-soal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-100/90 via-violet-100 to-purple-50 hover:from-indigo-200/90 hover:via-violet-200 hover:to-purple-100 text-indigo-950 border-2 border-indigo-400 hover:border-indigo-600 ${
                currentRoute === 'bank-soal' ? 'ring-2 ring-indigo-500/40 border-indigo-600 from-indigo-200 via-violet-200 to-purple-100 shadow-sm' : ''
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-700 transition-transform group-hover:scale-110" />
              <span>Kisi-Kisi & Bank Soal</span>
              <ChevronDown className="w-3.5 h-3.5 text-indigo-600 group-hover:text-indigo-950 transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Clean Flyout Dropdown (Solid White Background, Zero Transparency) */}
            <div className="absolute left-0 top-full pt-2 w-76 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-76 bg-white border-2 border-slate-300 shadow-2xl rounded-2xl p-2.5 space-y-2">
                {bankSoalItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-100/75 via-violet-50 to-purple-50/90 hover:from-indigo-200/80 hover:via-violet-100 hover:to-purple-100 border-2 border-indigo-300 hover:border-indigo-500 shadow-xs hover:shadow-sm transition-all text-xs font-bold text-indigo-950 hover:text-indigo-900 cursor-pointer group/item"
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border-2 border-indigo-200 text-base shadow-xs flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              Pill 3: Ruang Kreativitas Guru (Vibrant Sunset Amber / Peach Gradient)
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('ruang-kreativitas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all duration-200 flex items-center gap-2 cursor-pointer bg-gradient-to-r from-amber-100/90 via-orange-100 to-amber-50 hover:from-amber-200/90 hover:via-orange-200 hover:to-amber-100 text-amber-950 border-2 border-amber-400 hover:border-amber-600 ${
                currentRoute === 'ruang-kreativitas' ? 'ring-2 ring-amber-500/40 border-amber-600 from-amber-200 via-orange-200 to-amber-100 shadow-sm' : ''
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-700 transition-transform group-hover:scale-110" />
              <span>Ruang Kreativitas Guru</span>
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-xs tracking-wider">
                AI
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-amber-700 group-hover:text-amber-950 transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Clean Flyout Dropdown (Solid White Background, Zero Transparency) */}
            <div className="absolute right-0 top-full pt-2 w-84 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-84 bg-white border-2 border-slate-300 shadow-2xl rounded-2xl p-2.5 max-h-[480px] overflow-y-auto space-y-2">
                
                {/* Header 1: Asisten Guru AI */}
                <div className="text-[10px] font-extrabold text-amber-800 px-3 py-0.5 tracking-wider uppercase">
                  ASISTEN GURU AI
                </div>
                {kreativitasAiItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-100/75 via-orange-50 to-amber-50/90 hover:from-amber-200/80 hover:via-orange-100 hover:to-amber-100 border-2 border-amber-300 hover:border-amber-500 shadow-xs hover:shadow-sm transition-all text-xs font-bold text-amber-950 hover:text-amber-900 cursor-pointer group/item"
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border-2 border-amber-200 text-base shadow-xs flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}

                {/* Garis Pemisah */}
                <div className="border-t-2 border-slate-200 my-1.5" />

                {/* Header 2: Sumber Belajar */}
                <div className="text-[10px] font-extrabold text-teal-800 px-3 py-0.5 tracking-wider uppercase">
                  SUMBER BELAJAR
                </div>
                {kreativitasSumberItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-teal-100/75 via-emerald-50 to-cyan-50/90 hover:from-teal-200/80 hover:via-emerald-100 hover:to-cyan-100 border-2 border-teal-300 hover:border-teal-500 shadow-xs hover:shadow-sm transition-all text-xs font-bold text-teal-950 hover:text-teal-900 cursor-pointer group/item"
                  >
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border-2 border-teal-200 text-base shadow-xs flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}

              </div>
            </div>
          </div>

        </nav>

        {/* =====================================================================
            3. TOMBOL AKSI KANAN (CTA): ASESMEN CBT & PORTAL PETUGAS
        ===================================================================== */}
        <div className="hidden lg:flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleCbtClick}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:via-teal-700 hover:to-sky-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 flex items-center space-x-1.5 transition-all transform active:scale-95 group"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-100 transition-transform group-hover:rotate-12" />
            <span className="tracking-wide">Asesmen CBT</span>
            <ArrowRight className="w-3 h-3 text-white/80 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenLogin('officer')}
            className="bg-[#070d1e] hover:bg-slate-900 text-white px-3.5 py-2 rounded-xl font-semibold shadow-xs text-xs flex items-center space-x-1.5 transition-all"
            title="Portal Guru, Proktor, & Administrator"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden xl:inline">Portal Petugas</span>
          </button>
        </div>

        {/* =====================================================================
            4. MOBILE HAMBURGER BUTTON & CBT QUICK BUTTON
        ===================================================================== */}
        <div className="flex items-center space-x-2 lg:hidden">
          <button
            type="button"
            onClick={handleCbtClick}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs flex items-center space-x-1"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>CBT</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* =======================================================================
          5. MOBILE NAVIGATION DRAWER (CLEAN WHITE MODERN AKORDEON)
      ======================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white text-slate-800 px-4 pt-3 pb-6 shadow-xl max-h-[calc(100vh-80px)] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-2 mb-4">
            
            {/* Beranda */}
            <button
              type="button"
              onClick={() => handleRouteClick('beranda')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold transition-colors ${
                currentRoute === 'beranda' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Beranda Utama</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Akordeon 1: Soal & Asesmen */}
            <div className="border border-blue-200/90 rounded-xl overflow-hidden bg-gradient-to-r from-blue-100/70 via-sky-50 to-blue-50 shadow-2xs">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('wawasan')}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-blue-950 hover:bg-blue-100/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-blue-700" />
                  <span>Soal & Asesmen</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-blue-700 transition-transform ${mobileAccordion === 'wawasan' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'wawasan' && (
                <div className="p-2.5 bg-white space-y-1.5 border-t border-blue-200/80">
                  {wawasanItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-100/70 via-sky-50 to-blue-50/90 border border-blue-200/80 text-xs font-bold text-blue-950 cursor-pointer shadow-2xs"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-sm shadow-2xs flex-shrink-0">
                        {item.icon}
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Akordeon 2: Kisi-Kisi & Bank Soal */}
            <div className="border border-indigo-200/90 rounded-xl overflow-hidden bg-gradient-to-r from-indigo-100/70 via-violet-50 to-purple-50 shadow-2xs">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('bank')}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-indigo-950 hover:bg-indigo-100/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-700" />
                  <span>Kisi-Kisi & Bank Soal</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-indigo-700 transition-transform ${mobileAccordion === 'bank' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'bank' && (
                <div className="p-2.5 bg-white space-y-1.5 border-t border-indigo-200/80">
                  {bankSoalItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-100/70 via-violet-50 to-purple-50/90 border border-indigo-200/80 text-xs font-bold text-indigo-950 cursor-pointer shadow-2xs"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-indigo-200 flex items-center justify-center text-sm shadow-2xs flex-shrink-0">
                        {item.icon}
                      </div>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Akordeon 3: Ruang Kreativitas Guru */}
            <div className="border border-amber-200/90 rounded-xl overflow-hidden bg-gradient-to-r from-amber-100/70 via-orange-50 to-amber-50 shadow-2xs">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('kreativitas')}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-amber-950 hover:bg-amber-100/50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-700" />
                  <span>Ruang Kreativitas Guru</span>
                  <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-black px-1.5 py-0.5 rounded text-[9px] tracking-wider">
                    AI
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-700 transition-transform ${mobileAccordion === 'kreativitas' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'kreativitas' && (
                <div className="p-2.5 bg-white space-y-2 border-t border-amber-200/80">
                  <div className="text-[10px] font-extrabold text-amber-800/80 px-2 uppercase tracking-wider">ASISTEN GURU AI</div>
                  <div className="space-y-1.5">
                    {kreativitasAiItems.map((item) => (
                      <div
                        key={item.label}
                        onClick={() => handleItemClick(item)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-100/70 via-orange-50 to-amber-50/90 border border-amber-200/80 text-xs font-bold text-amber-950 cursor-pointer shadow-2xs"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-sm shadow-2xs flex-shrink-0">
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 my-1" />
                  <div className="text-[10px] font-extrabold text-teal-800/80 px-2 uppercase tracking-wider">SUMBER BELAJAR</div>
                  <div className="space-y-1.5">
                    {kreativitasSumberItems.map((item) => (
                      <div
                        key={item.label}
                        onClick={() => handleItemClick(item)}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gradient-to-r from-teal-100/70 via-emerald-50 to-cyan-50/90 border border-teal-200/80 text-xs font-bold text-teal-950 cursor-pointer shadow-2xs"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white border border-teal-200 flex items-center justify-center text-sm shadow-2xs flex-shrink-0">
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Tombol Akses Cepat Bawah */}
          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            <button
              type="button"
              onClick={handleCbtClick}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md flex items-center justify-center space-x-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Masuk Ruang Asesmen CBT Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin('officer');
              }}
              className="w-full py-2.5 rounded-xl bg-[#070d1e] hover:bg-slate-900 text-white text-xs font-semibold flex items-center justify-center space-x-2 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Portal Guru, Proktor, & Admin</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* =====================================================================
            1. BRAND LOGO (Klik -> Kembali ke Beranda)
        ===================================================================== */}
        <button
          type="button"
          onClick={() => handleRouteClick('beranda')}
          className="flex items-center space-x-3 group focus:outline-hidden"
          title="Kembali ke Beranda SASIPEDIA"
        >
          <img 
            src="/sasipedia-logo.png" 
            alt="SASIPEDIA - Sistem Asesmen Sekolah Indonesia" 
            className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </button>

        {/* =====================================================================
            2. DESKTOP NAVIGATION (Pill Containers + Compact 3D-Icon Dropdown)
        ===================================================================== */}
        <nav className="hidden lg:flex items-center space-x-2 xl:space-x-3">
          
          {/* -----------------------------------------------------------------
              Pill 1: Soal & Asesmen
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('wawasan-asesmen')}
              className={`px-3.5 py-2 rounded-xl font-medium text-sm transition-all duration-200 bg-blue-50/80 hover:bg-blue-100 text-blue-900 border border-blue-200/60 flex items-center gap-1.5 shadow-2xs group-hover:shadow-xs ${
                currentRoute === 'wawasan-asesmen' ? 'ring-2 ring-blue-500/30 font-bold' : ''
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Soal & Asesmen</span>
              <ChevronDown className="w-4 h-4 text-blue-600/70 transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Compact Flyout Dropdown */}
            <div className="absolute left-0 top-full pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-64 bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/80 rounded-2xl p-2 space-y-0.5">
                {wawasanItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-blue-700 cursor-pointer group/item"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100/80 shadow-xs text-base flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              Pill 2: Kisi-Kisi & Bank Soal
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('bank-soal')}
              className={`px-3.5 py-2 rounded-xl font-medium text-sm transition-all duration-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/60 flex items-center gap-1.5 shadow-2xs group-hover:shadow-xs ${
                currentRoute === 'bank-soal' ? 'ring-2 ring-indigo-500/30 font-bold' : ''
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-700" />
              <span>Kisi-Kisi & Bank Soal</span>
              <ChevronDown className="w-4 h-4 text-indigo-600/70 transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Compact Flyout Dropdown */}
            <div className="absolute left-0 top-full pt-2 w-68 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-68 bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/80 rounded-2xl p-2 space-y-0.5">
                {bankSoalItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-indigo-700 cursor-pointer group/item"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100/80 shadow-xs text-base flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              Pill 3: Ruang Kreativitas Guru
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('ruang-kreativitas')}
              className={`px-3.5 py-2 rounded-xl font-medium text-sm transition-all duration-200 bg-amber-50/80 hover:bg-amber-100 text-amber-950 border border-amber-200/60 flex items-center gap-1.5 shadow-2xs group-hover:shadow-xs ${
                currentRoute === 'ruang-kreativitas' ? 'ring-2 ring-amber-500/30 font-bold' : ''
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Ruang Kreativitas Guru</span>
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white rounded-md shadow-xs">
                AI
              </span>
              <ChevronDown className="w-4 h-4 text-amber-700/70 transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Compact Flyout Dropdown (2 Kategori: AI & Sumber Belajar) */}
            <div className="absolute right-0 top-full pt-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-72 bg-white/95 backdrop-blur-md shadow-xl border border-slate-200/80 rounded-2xl p-2.5 max-h-[460px] overflow-y-auto space-y-0.5">
                
                {/* Header 1: Asisten Guru AI */}
                <div className="text-[10px] font-bold text-slate-400 px-3 py-1 tracking-wider uppercase">
                  ASISTEN GURU AI
                </div>
                {kreativitasAiItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-amber-50/70 transition-colors text-xs font-semibold text-slate-800 hover:text-amber-800 cursor-pointer group/item"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-100/60 shadow-xs text-base flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}

                {/* Garis Pemisah */}
                <div className="border-t border-slate-100 my-1.5" />

                {/* Header 2: Sumber Belajar */}
                <div className="text-[10px] font-bold text-slate-400 px-3 py-1 tracking-wider uppercase">
                  SUMBER BELAJAR
                </div>
                {kreativitasSumberItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-800 hover:text-blue-700 cursor-pointer group/item"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100/80 shadow-xs text-base flex-shrink-0 group-hover/item:scale-110 transition-transform">
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
            3. TOMBOL CTA: ASESMEN CBT & PORTAL PETUGAS
        ===================================================================== */}
        <div className="hidden lg:flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleCbtClick}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-700 hover:via-teal-700 hover:to-sky-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 flex items-center space-x-2 transition-all transform active:scale-95 group"
          >
            <GraduationCap className="w-4 h-4 text-emerald-200 transition-transform group-hover:rotate-12" />
            <span className="tracking-wide">Asesmen CBT</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/80 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenLogin('officer')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5"
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
            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-black shadow-xs flex items-center space-x-1"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>CBT</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* =======================================================================
          5. MOBILE NAVIGATION DRAWER (DENGAN AKORDEON SUB-MENU)
      ======================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 shadow-xl max-h-[calc(100vh-80px)] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-2 mb-4">
            
            {/* Beranda */}
            <button
              type="button"
              onClick={() => handleRouteClick('beranda')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                currentRoute === 'beranda' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Beranda Utama</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Akordeon 1: Soal & Asesmen */}
            <div className="border border-blue-100 rounded-xl overflow-hidden bg-blue-50/40">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('wawasan')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-blue-900"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-blue-700" />
                  <span>Soal & Asesmen</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-blue-600 transition-transform ${mobileAccordion === 'wawasan' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'wawasan' && (
                <div className="p-2 bg-white space-y-1 border-t border-blue-100">
                  {wawasanItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-xs font-semibold text-slate-800"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Akordeon 2: Kisi-Kisi & Bank Soal */}
            <div className="border border-indigo-100 rounded-xl overflow-hidden bg-indigo-50/40">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('bank')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-indigo-900"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-700" />
                  <span>Kisi-Kisi & Bank Soal</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-indigo-600 transition-transform ${mobileAccordion === 'bank' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'bank' && (
                <div className="p-2 bg-white space-y-1 border-t border-indigo-100">
                  {bankSoalItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 text-xs font-semibold text-slate-800"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Akordeon 3: Ruang Kreativitas Guru */}
            <div className="border border-amber-200/80 rounded-xl overflow-hidden bg-amber-50/40">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('kreativitas')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-amber-950"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Ruang Kreativitas Guru</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-amber-500 text-white rounded">
                    AI
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-700 transition-transform ${mobileAccordion === 'kreativitas' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'kreativitas' && (
                <div className="p-2 bg-white space-y-1 border-t border-amber-200">
                  <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase">ASISTEN GURU AI</div>
                  {kreativitasAiItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-amber-50 text-xs font-semibold text-slate-800"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-100 my-1" />
                  <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase">SUMBER BELAJAR</div>
                  {kreativitasSumberItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Tombol Akses Cepat Bawah */}
          <div className="pt-3 border-t border-slate-100 flex flex-col space-y-2">
            <button
              type="button"
              onClick={handleCbtClick}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-md flex items-center justify-center space-x-2"
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
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center space-x-2"
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

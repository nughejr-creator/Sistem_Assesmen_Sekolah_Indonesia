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
    <header className="sticky top-0 z-50 bg-[#070d1e]/92 backdrop-blur-md border-b border-slate-800/80 transition-all duration-300 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* =====================================================================
            1. BRAND LOGO (Klik -> Kembali ke Beranda, Kontras Tinggi di Latar Gelap)
        ===================================================================== */}
        <button
          type="button"
          onClick={() => handleRouteClick('beranda')}
          className="flex items-center space-x-3 group focus:outline-hidden"
          title="Kembali ke Beranda SASIPEDIA"
        >
          <div className="bg-white/95 hover:bg-white px-3 py-1.5 rounded-xl shadow-md transition-all duration-200 group-hover:scale-105 border border-white/20">
            <img 
              src="/sasipedia-logo.png" 
              alt="SASIPEDIA - Sistem Asesmen Sekolah Indonesia" 
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>
        </button>

        {/* =====================================================================
            2. DESKTOP NAVIGATION (Glass Pill Containers + Dark Compact Flyouts)
        ===================================================================== */}
        <nav className="hidden lg:flex items-center space-x-2 xl:space-x-3">
          
          {/* -----------------------------------------------------------------
              Pill 1: Soal & Asesmen (Blue Glass Pill)
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('wawasan-asesmen')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-xs flex items-center gap-2 bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 hover:text-white border border-blue-500/40 hover:border-blue-400 ${
                currentRoute === 'wawasan-asesmen' ? 'ring-2 ring-blue-500/50 text-white font-bold bg-blue-900/50 border-blue-400' : ''
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
              <span>Soal & Asesmen</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Dark Compact Flyout Dropdown */}
            <div className="absolute left-0 top-full pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-64 bg-[#0d1527]/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2 shadow-2xl shadow-black/50 space-y-0.5">
                {wawasanItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-white transition-all text-xs font-medium cursor-pointer group/item"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/90 border border-slate-700/60 text-sm flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              Pill 2: Kisi-Kisi & Bank Soal (Indigo Glass Pill)
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('bank-soal')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-xs flex items-center gap-2 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-200 hover:text-white border border-indigo-500/40 hover:border-indigo-400 ${
                currentRoute === 'bank-soal' ? 'ring-2 ring-indigo-500/50 text-white font-bold bg-indigo-900/50 border-indigo-400' : ''
              }`}
            >
              <Layers className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300" />
              <span>Kisi-Kisi & Bank Soal</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Dark Compact Flyout Dropdown */}
            <div className="absolute left-0 top-full pt-2 w-68 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-68 bg-[#0d1527]/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2 shadow-2xl shadow-black/50 space-y-0.5">
                {bankSoalItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-white transition-all text-xs font-medium cursor-pointer group/item"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/90 border border-slate-700/60 text-sm flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              Pill 3: Ruang Kreativitas Guru (Amber Glass Pill + Gradient AI Badge)
          ----------------------------------------------------------------- */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => handleRouteClick('ruang-kreativitas')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 shadow-xs flex items-center gap-2 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 hover:text-white border border-amber-500/40 hover:border-amber-400 ${
                currentRoute === 'ruang-kreativitas' ? 'ring-2 ring-amber-500/50 text-white font-bold bg-amber-900/50 border-amber-400' : ''
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400 group-hover:text-amber-300" />
              <span>Ruang Kreativitas Guru</span>
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px] shadow-xs">
                AI
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-200 group-hover:rotate-180" />
            </button>

            {/* Dark Compact Flyout Dropdown (2 Kategori: AI & Sumber Belajar) */}
            <div className="absolute right-0 top-full pt-2 w-72 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
              <div className="w-72 bg-[#0d1527]/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-2.5 max-h-[460px] overflow-y-auto space-y-0.5 shadow-2xl shadow-black/50">
                
                {/* Header 1: Asisten Guru AI */}
                <div className="text-[10px] font-bold text-slate-400 tracking-wider px-3 py-1 uppercase">
                  ASISTEN GURU AI
                </div>
                {kreativitasAiItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-white transition-all text-xs font-medium cursor-pointer group/item"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/90 border border-slate-700/60 text-sm flex-shrink-0 group-hover/item:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}

                {/* Garis Pemisah */}
                <div className="border-t border-slate-800 my-1.5" />

                {/* Header 2: Sumber Belajar */}
                <div className="text-[10px] font-bold text-slate-400 tracking-wider px-3 py-1 uppercase">
                  SUMBER BELAJAR
                </div>
                {kreativitasSumberItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleItemClick(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-white transition-all text-xs font-medium cursor-pointer group/item"
                  >
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/90 border border-slate-700/60 text-sm flex-shrink-0 group-hover/item:scale-110 transition-transform">
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
            3. TOMBOL CTA: ASESMEN CBT (Primary Focus) & PORTAL PETUGAS
        ===================================================================== */}
        <div className="hidden lg:flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handleCbtClick}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white text-xs font-black shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 flex items-center space-x-2 transition-all transform active:scale-95 group"
          >
            <GraduationCap className="w-4 h-4 text-emerald-100 transition-transform group-hover:rotate-12" />
            <span className="tracking-wide">Asesmen CBT</span>
            <ArrowRight className="w-3.5 h-3.5 text-white/80 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenLogin('officer')}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600 text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5"
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
            className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-black shadow-xs flex items-center space-x-1"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>CBT</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/60 focus:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* =======================================================================
          5. MOBILE NAVIGATION DRAWER (DARK THEME AKORDEON)
      ======================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-[#070d1e] text-slate-200 px-4 pt-3 pb-6 shadow-2xl max-h-[calc(100vh-80px)] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-2 mb-4">
            
            {/* Beranda */}
            <button
              type="button"
              onClick={() => handleRouteClick('beranda')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                currentRoute === 'beranda' ? 'bg-blue-950/60 text-blue-300 border border-blue-500/40' : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <span>Beranda Utama</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>

            {/* Akordeon 1: Soal & Asesmen */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('wawasan')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-blue-300"
              >
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  <span>Soal & Asesmen</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform ${mobileAccordion === 'wawasan' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'wawasan' && (
                <div className="p-2 bg-[#0d1527] space-y-1 border-t border-slate-800">
                  {wawasanItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/80 text-xs font-medium text-slate-200 cursor-pointer"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Akordeon 2: Kisi-Kisi & Bank Soal */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('bank')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-indigo-300"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Kisi-Kisi & Bank Soal</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform ${mobileAccordion === 'bank' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'bank' && (
                <div className="p-2 bg-[#0d1527] space-y-1 border-t border-slate-800">
                  {bankSoalItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/80 text-xs font-medium text-slate-200 cursor-pointer"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Akordeon 3: Ruang Kreativitas Guru */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('kreativitas')}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-amber-300"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Ruang Kreativitas Guru</span>
                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[9px]">
                    AI
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform ${mobileAccordion === 'kreativitas' ? 'rotate-180' : ''}`} />
              </button>

              {mobileAccordion === 'kreativitas' && (
                <div className="p-2 bg-[#0d1527] space-y-1 border-t border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase">ASISTEN GURU AI</div>
                  {kreativitasAiItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-800/80 text-xs font-medium text-slate-200 cursor-pointer"
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                  <div className="border-t border-slate-800 my-1" />
                  <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase">SUMBER BELAJAR</div>
                  {kreativitasSumberItems.map((item) => (
                    <div
                      key={item.label}
                      onClick={() => handleItemClick(item)}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-slate-800/80 text-xs font-medium text-slate-200 cursor-pointer"
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
          <div className="pt-3 border-t border-slate-800 flex flex-col space-y-2">
            <button
              type="button"
              onClick={handleCbtClick}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black shadow-md flex items-center justify-center space-x-2"
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
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 text-xs font-bold flex items-center justify-center space-x-2"
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

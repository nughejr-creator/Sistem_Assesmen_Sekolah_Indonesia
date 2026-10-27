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

interface PublicNavbarProps {
  currentRoute: PublicNavRoute;
  onNavigate: (route: PublicNavRoute) => void;
  onOpenLogin: (tab: 'student' | 'officer', quickToken?: string) => void;
}

export const PublicNavbar: React.FC<PublicNavbarProps> = ({
  currentRoute,
  onNavigate,
  onOpenLogin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (route: PublicNavRoute) => {
    onNavigate(route);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCbtClick = () => {
    setMobileMenuOpen(false);
    onOpenLogin('student');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* =====================================================================
            1. BRAND LOGO (Klik -> Kembali ke Beranda)
        ===================================================================== */}
        <button
          type="button"
          onClick={() => handleNavClick('beranda')}
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
            2. DESKTOP NAVIGATION (Tepat 4 Menu Inti)
        ===================================================================== */}
        <nav className="hidden lg:flex items-center space-x-1 sm:space-x-2">
          
          {/* Menu 2: Wawasan Soal & Asesmen */}
          <button
            type="button"
            onClick={() => handleNavClick('wawasan-asesmen')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              currentRoute === 'wawasan-asesmen'
                ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${currentRoute === 'wawasan-asesmen' ? 'text-sky-600' : 'text-slate-400'}`} />
            <span>Soal & Asesmen</span>
          </button>

          {/* Menu 3: Kisi-Kisi & Bank Soal */}
          <button
            type="button"
            onClick={() => handleNavClick('bank-soal')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              currentRoute === 'bank-soal'
                ? 'bg-sky-50 text-sky-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Layers className={`w-4 h-4 ${currentRoute === 'bank-soal' ? 'text-sky-600' : 'text-slate-400'}`} />
            <span>Kisi-Kisi & Bank Soal</span>
          </button>

          {/* Menu 4: Ruang Kreativitas Guru */}
          <button
            type="button"
            onClick={() => handleNavClick('ruang-kreativitas')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
              currentRoute === 'ruang-kreativitas'
                ? 'bg-amber-50 text-amber-800 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${currentRoute === 'ruang-kreativitas' ? 'text-amber-600' : 'text-amber-500'}`} />
            <span>Ruang Kreativitas Guru</span>
            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 rounded-md">
              AI
            </span>
          </button>

        </nav>

        {/* =====================================================================
            3. MENU 1: ASESMEN CBT (CTA Beraksen Kontras / Mencolok)
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
            4. MOBILE HAMBURGER BUTTON
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
          5. MOBILE NAVIGATION DRAWER
      ======================================================================= */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="space-y-1.5 mb-4">
            
            <button
              type="button"
              onClick={() => handleNavClick('beranda')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                currentRoute === 'beranda' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Beranda Utama</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('wawasan-asesmen')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                currentRoute === 'wawasan-asesmen' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <span>Soal & Asesmen</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('bank-soal')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                currentRoute === 'bank-soal' ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Kisi-Kisi & Bank Soal</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => handleNavClick('ruang-kreativitas')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                currentRoute === 'ruang-kreativitas' ? 'bg-amber-50 text-amber-800' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Ruang Kreativitas Guru</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-amber-500/20 text-amber-800 rounded">
                AI Hub
              </span>
            </button>

          </div>

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

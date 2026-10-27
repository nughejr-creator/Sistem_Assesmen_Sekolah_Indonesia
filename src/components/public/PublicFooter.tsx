import React from 'react';
import { 
  ShieldCheck, 
  Mail, 
  MapPin, 
  Heart, 
  ExternalLink,
  BookOpen,
  Layers,
  Sparkles,
  FileText,
  UserCheck,
  Lock
} from 'lucide-react';
import { PublicNavRoute } from './PublicNavbar';

interface PublicFooterProps {
  onNavigate: (route: PublicNavRoute) => void;
  onOpenLogin: (tab: 'student' | 'officer') => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({
  onNavigate,
  onOpenLogin
}) => {
  const handleLinkClick = (e: React.MouseEvent, route: PublicNavRoute) => {
    e.preventDefault();
    onNavigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-slate-950 text-slate-400 border-t-2 border-slate-800 text-xs selection:bg-sky-500 selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        
        {/* =====================================================================
            TOP ROW: BRAND & FOUR COLUMNS
        ===================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b-2 border-slate-800/80">
          
          {/* Kolom 1 & 2: Identitas Platform & Pengembang E-E-A-T */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white px-3 py-1.5 rounded-xl border-2 border-slate-700 shadow-xs">
                <img 
                  src="/sasipedia-logo.png" 
                  alt="SASIPEDIA - Platform Asesmen Sekolah Indonesia" 
                  className="h-8 w-auto object-contain"
                />
              </div>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              <strong className="text-white">SASIPEDIA (Sistem Asesmen Sekolah Indonesia)</strong> adalah portal edukasi terpadu dan platform CBT multi-klaster mandiri untuk Sekolah Dasar dan Menengah. Mendukung pelaksanaan AKM, TKA, asesmen formatif, sumatif, serta pusat kreativitas guru.
            </p>

            <div className="pt-2 flex items-center space-x-2 text-[11px] text-slate-400">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Inisiator: <strong className="text-slate-200">Agi Hamdani, M.Pd</strong> (Praktisi Evaluasi Pendidikan)</span>
            </div>

            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Sumedang - Jawa Barat, Indonesia</span>
            </div>
          </div>

          {/* Kolom 3: Layanan Edukasi & Asesmen */}
          <div>
            <h4 className="text-[11px] font-black uppercase text-slate-200 tracking-wider mb-3.5 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Edukasi & Asesmen</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'wawasan-asesmen')}
                  className="hover:text-white transition-colors text-left"
                >
                  Panduan Penulisan Soal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'wawasan-asesmen')}
                  className="hover:text-white transition-colors text-left"
                >
                  Bedah Instrumen AKM
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'bank-soal')}
                  className="hover:text-white transition-colors text-left"
                >
                  Matriks Kisi-Kisi & Bank Soal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'ruang-kreativitas')}
                  className="hover:text-amber-400 transition-colors text-left flex items-center space-x-1"
                >
                  <span>Asisten Guru AI (6 Alur)</span>
                  <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded">AI</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'ruang-kreativitas')}
                  className="hover:text-white transition-colors text-left"
                >
                  Pusat Administrasi Guru (DOCX/XLSX)
                </button>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Kredibilitas & Pengembang (E-E-A-T) */}
          <div>
            <h4 className="text-[11px] font-black uppercase text-slate-200 tracking-wider mb-3.5 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kredibilitas & Profil</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'profil-pengembang')}
                  className="hover:text-emerald-300 font-semibold transition-colors text-left flex items-center space-x-1"
                >
                  <span>Profil Pengembang (E-E-A-T)</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'about-contact')}
                  className="hover:text-white transition-colors text-left"
                >
                  Tentang Kami & Kontak Resmi
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLogin('student')}
                  className="hover:text-white transition-colors text-left"
                >
                  Masuk CBT Siswa
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLogin('officer')}
                  className="hover:text-white transition-colors text-left"
                >
                  Portal Meja Koreksi Guru
                </button>
              </li>
            </ul>
          </div>

          {/* Kolom 5: Kebijakan Legalitas & AdSense Compliance */}
          <div>
            <h4 className="text-[11px] font-black uppercase text-slate-200 tracking-wider mb-3.5 flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Legalitas & Privasi</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'privacy-policy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Kebijakan Privasi (Privacy Policy)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'terms')}
                  className="hover:text-white transition-colors text-left"
                >
                  Syarat & Ketentuan Layanan (Terms)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'about-contact')}
                  className="hover:text-white transition-colors text-left"
                >
                  Saluran Bantuan & Aduan
                </button>
              </li>
              <li className="pt-2 text-[10px] text-slate-500 leading-tight">
                Dirancang memenuhi standar privasi COPPA & periklanan Google AdSense untuk situs pendidikan.
              </li>
            </ul>
          </div>

        </div>

        {/* =====================================================================
            BOTTOM ROW: COPYRIGHT & METADATA
        ===================================================================== */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            <p>
              © {new Date().getFullYear()} <strong className="text-slate-400">SASIPEDIA</strong> — Sistem Asesmen Sekolah Indonesia.
            </p>
            <p className="text-[10px] text-slate-600 mt-0.5">
              Arsitektur Dual-Zone: Mesin CBT Mandiri & Portal Edukasi Publik Terpadu.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-[11px]">
            <button
              type="button"
              onClick={(e) => handleLinkClick(e, 'privacy-policy')}
              className="hover:text-slate-300 transition-colors"
            >
              Privasi
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={(e) => handleLinkClick(e, 'terms')}
              className="hover:text-slate-300 transition-colors"
            >
              Ketentuan
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={(e) => handleLinkClick(e, 'about-contact')}
              className="hover:text-slate-300 transition-colors"
            >
              Kontak
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

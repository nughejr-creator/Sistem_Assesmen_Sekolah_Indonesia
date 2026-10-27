import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  Mail, 
  ExternalLink, 
  GraduationCap, 
  Code, 
  Database,
  Layers,
  ArrowRight
} from 'lucide-react';
import { DeveloperProfile } from '../../../types/publicPortal';
import { getDeveloperProfile } from '../../../lib/publicPortalService';

interface DeveloperProfilePageProps {
  onOpenLogin: (tab: 'student' | 'officer') => void;
  onNavigateHome: () => void;
}

export const DeveloperProfilePage: React.FC<DeveloperProfilePageProps> = ({
  onOpenLogin,
  onNavigateHome
}) => {
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);

  useEffect(() => {
    getDeveloperProfile().then(data => setProfile(data));
  }, []);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Banner Profil */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white py-8 sm:py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
          
          {/* Avatar / Foto */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-400 p-0.5 shadow-lg shrink-0">
            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center overflow-hidden">
              <img 
                src={profile.avatar_url || '/sasipedia-icon.png'} 
                alt={profile.full_name}
                className="w-14 sm:w-16 h-auto object-contain"
              />
            </div>
          </div>

          {/* Bio Singkat */}
          <div className="space-y-1.5 text-center md:text-left">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Standar E-E-A-T: Pengembang & Inisiator Resmi</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
              {profile.full_name}
            </h1>

            <p className="text-xs sm:text-sm font-bold text-sky-400">
              {profile.title}
            </p>

            <p className="text-xs text-slate-300 leading-normal max-w-xl text-justify">
              {profile.role_description}
            </p>
          </div>

        </div>
      </section>

      {/* Konten Detail Profil */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-10">
        
        {/* Latar Belakang & Visi SASIPEDIA */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-sky-600" />
            <span>Visi Pembaharuan Evaluasi Pendidikan</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-justify">
            {profile.bio}
          </p>
        </div>

        {/* 2 Kolom: Kredensial Akademik & Keahlian Khusus */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Kredensial Akademik & Sertifikasi */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              <span>Kredensial & Kualifikasi</span>
            </h3>
            <ul className="space-y-2.5">
              {profile.credentials.map((cred, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{cred}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bidang Keahlian */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Keahlian Instrumen & Sistem</span>
            </h3>
            <ul className="space-y-2.5">
              {profile.expertise.map((exp, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{exp}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Kontak Resmi */}
        <div className="p-6 rounded-2xl bg-sky-50 border-2 border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-black text-sky-950">Saluran Korespondensi Pengembang</h4>
            <p className="text-[11px] text-sky-700">Hubungi langsung untuk konsultasi evaluasi sekolah, aduan sistem, atau kolaborasi pendidikan.</p>
          </div>
          <a
            href={`mailto:${profile.email}`}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold border-2 border-sky-400/50 shadow-xs flex items-center space-x-1.5 shrink-0"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{profile.email}</span>
          </a>
        </div>

      </div>
    </div>
  );
};

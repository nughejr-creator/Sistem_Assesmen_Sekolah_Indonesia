import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Download, 
  FileText, 
  CheckCircle2, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  ExternalLink,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { TeachingResource } from '../../../types/publicPortal';
import { getTeachingResources } from '../../../lib/publicPortalService';

interface QuestionBankHubPageProps {
  onOpenLogin: (tab: 'student' | 'officer') => void;
  onNavigateCreativity: () => void;
}

export const QuestionBankHubPage: React.FC<QuestionBankHubPageProps> = ({
  onOpenLogin,
  onNavigateCreativity
}) => {
  const [resources, setResources] = useState<TeachingResource[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('Semua Fase');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  useEffect(() => {
    getTeachingResources().then(data => setResources(data));
  }, []);

  const phases = ['Semua Fase', 'Fase A (Kelas 1-2)', 'Fase B (Kelas 3-4)', 'Fase C (Kelas 5-6)', 'Umum'];

  // Sample static data for Matriks Kisi-Kisi & Kartu Soal
  const sampleBlueprints = [
    {
      id: 'bp-1',
      title: 'Matriks Kisi-Kisi Asesmen Sumatif Akhir Semester (SAS) Fase C - Bahasa Indonesia',
      phase: 'Fase C',
      grade: 'Kelas 5 & 6',
      subject: 'Bahasa Indonesia',
      totalItems: 30,
      distribution: 'L1: 30%, L2: 50%, L3: 20%',
      type: 'DOCX'
    },
    {
      id: 'bp-2',
      title: 'Matriks Kisi-Kisi & Kartu Soal Asesmen Diagnostik Awal Numerasi Fase B',
      phase: 'Fase B',
      grade: 'Kelas 4',
      subject: 'Matematika',
      totalItems: 20,
      distribution: 'L1: 40%, L2: 40%, L3: 20%',
      type: 'DOCX'
    },
    {
      id: 'bp-3',
      title: 'Katalog Instrumen Soal AKM Literasi Kontekstual Lingkungan Hidup Fase C',
      phase: 'Fase C',
      grade: 'Kelas 5',
      subject: 'IPAS & Literasi',
      totalItems: 25,
      distribution: 'L2: 60%, L3: 40%',
      type: 'PDF'
    },
    {
      id: 'bp-4',
      title: 'Instrumen Tes Kemampuan Awal (TKA) Membaca Permulaan Fase A',
      phase: 'Fase A',
      grade: 'Kelas 1',
      subject: 'Bahasa Indonesia',
      totalItems: 15,
      distribution: 'Fonik & Pengenalan Kata',
      type: 'PDF'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* =======================================================================
          1. HEADER BANNER
      ======================================================================= */}
      <section className="bg-gradient-to-b from-slate-900 via-sky-950 to-slate-950 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
            <Layers className="w-3.5 h-3.5" />
            <span>Katalog Instrumen & Repositori Soal SD</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Kisi-Kisi & Bank Soal Asesmen Nasional
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Daftar matriks kisi-kisi terstandar Kurikulum Merdeka (Fase A, B, dan C), paket kartu soal, serta instrumen asesmen diagnostik siap pakai untuk jenjang Sekolah Dasar.
          </p>
        </div>
      </section>

      {/* =======================================================================
          2. MAIN CONTENT
      ======================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-10">
        
        {/* Phase Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-500 mr-2 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Jenjang:</span>
          </span>
          {phases.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPhase(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedPhase === p
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Section 1: Matriks Kisi-Kisi & Kartu Soal */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Matriks Kisi-Kisi & Kartu Soal Terstandar
              </h2>
              <p className="text-xs text-slate-500">
                Disusun sesuai capaian pembelajaran dan level kognitif (L1 Pengetahuan, L2 Aplikasi, L3 Penalaran).
              </p>
            </div>

            <button
              type="button"
              onClick={onNavigateCreativity}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 hover:bg-amber-100"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Buat Kisi-Kisi via AI</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleBlueprints.map(bp => (
              <div 
                key={bp.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-800 border border-sky-100">
                      {bp.phase} • {bp.grade}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                      {bp.type}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {bp.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <div>
                      <span>Mata Pelajaran: </span>
                      <strong className="text-slate-700">{bp.subject}</strong>
                    </div>
                    <div>
                      <span>Jumlah Butir: </span>
                      <strong className="text-slate-700">{bp.totalItems} Soal</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Sebaran: {bp.distribution}
                  </span>
                  <a
                    href="https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx"
                    download
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Matriks</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Banner Simulasi CBT Siswa */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h3 className="text-lg sm:text-xl font-black">
              Ingin Mengujikan Soal-Soal Ini Secara Digital?
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
              Gunakan sistem CBT SASIPEDIA untuk menyelenggarakan asesmen sekolah langsung ke laptop atau gawai siswa tanpa perlu fotokopi kertas.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenLogin('student')}
            className="px-6 py-3 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black shadow-lg transition-transform transform active:scale-95 shrink-0 flex items-center space-x-2"
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Mulai Asesmen CBT Siswa</span>
          </button>
        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { BookOpen, Download, Filter, Search, CheckCircle2, FileText } from 'lucide-react';

export const CurriculumResourcesTab: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<string>('Semua Fase');
  const [selectedType, setSelectedType] = useState<string>('Semua');

  const curriculumDocs = [
    {
      id: 'cp-1',
      title: 'Capaian Pembelajaran (CP) Resmi Kurikulum Merdeka - Bahasa Indonesia Fase A-C SD',
      type: 'Capaian Pembelajaran (CP)',
      phase: 'Fase A, B, C',
      grade: 'Kelas 1-6 SD',
      format: 'PDF',
      size: '2.4 MB',
      downloads: 1820,
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx'
    },
    {
      id: 'atp-1',
      title: 'Alur Tujuan Pembelajaran (ATP) Matematika Fase B (Kelas 3 & 4) Berurutan per Semester',
      type: 'Alur Tujuan (ATP)',
      phase: 'Fase B',
      grade: 'Kelas 4 SD',
      format: 'DOCX',
      size: '1.2 MB',
      downloads: 1450,
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx'
    },
    {
      id: 'modul-1',
      title: 'Modul Ajar IPAS Berdiferensiasi: Ekosistem & Keseimbangan Lingkungan Hidup',
      type: 'Modul Ajar Guru',
      phase: 'Fase C',
      grade: 'Kelas 5 SD',
      format: 'DOCX',
      size: '3.1 MB',
      downloads: 2100,
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx'
    },
    {
      id: 'modul-2',
      title: 'Modul Ajar Pendidikan Pancasila: Menghargai Keragaman Budaya & Suku Bangsa',
      type: 'Modul Ajar Guru',
      phase: 'Fase B',
      grade: 'Kelas 3 SD',
      format: 'DOCX',
      size: '1.9 MB',
      downloads: 1240,
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx'
    }
  ];

  const filteredDocs = curriculumDocs.filter(doc => {
    const matchPhase = selectedPhase === 'Semua Fase' || doc.phase.includes(selectedPhase);
    const matchType = selectedType === 'Semua' || doc.type === selectedType;
    return matchPhase && matchType;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Pusat Perangkat Ajar Kurikulum Merdeka
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Unduh berkas resmi Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), dan Modul Ajar terbitan pendidik.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {['Semua Fase', 'Fase A', 'Fase B', 'Fase C', 'Fase D'].map(phase => (
            <button
              key={phase}
              type="button"
              onClick={() => setSelectedPhase(phase)}
              className={`transition-all duration-150 active:scale-95 ${
                selectedPhase === phase
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-sm shadow-indigo-500/20 rounded-xl px-3.5 py-1.5 text-xs md:text-sm'
                  : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border border-slate-200/60 rounded-xl px-3.5 py-1.5 text-xs md:text-sm'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map(doc => (
          <div 
            key={doc.id}
            className="bg-white p-6 rounded-3xl border-2 border-slate-300 hover:border-sky-500 hover:shadow-lg transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-800 border-2 border-sky-200">
                  {doc.type}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700">
                  {doc.format} • {doc.size}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                {doc.title}
              </h4>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">{doc.phase}</span>
                <span>•</span>
                <span>{doc.grade}</span>
                <span>•</span>
                <span>{doc.downloads}x diunduh</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terverifikasi Kurikulum</span>
              </span>

              <a
                href={doc.url}
                download
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold border-2 border-sky-400/50 shadow-2xs flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh ({doc.format})</span>
              </a>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

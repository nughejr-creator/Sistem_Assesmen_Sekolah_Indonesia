import React, { useState } from 'react';
import { FileText, Download, Image, Eye, Sparkles, CheckCircle2 } from 'lucide-react';

export const LkpdMediaTab: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  const mediaItems = [
    {
      id: 'lkpd-1',
      title: 'LKPD Eksplorasi Penemuan: Sifat & Perubahan Wujud Benda Padat, Cair, Gas',
      category: 'LKPD Siswa',
      level: 'Fase B (Kelas 4 SD)',
      format: 'PDF',
      size: '2.8 MB',
      downloads: 1340,
      description: 'Lengkap dengan instruksi praktikum sederhana menggunakan air es, lilin, dan balon udara.',
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/lkpd/paket-lkpd-ipas-fase-b-kelas4.pdf'
    },
    {
      id: 'poster-1',
      title: 'Poster Edukasi Dinding Kelas: 8 Dimensi Karakter Profil Pelajar Indonesia',
      category: 'Poster Dinding Kelas',
      level: 'Semua Jenjang SD',
      format: 'PDF Siap Cetak (A3)',
      size: '5.4 MB',
      downloads: 2480,
      description: 'Desain visual penuh warna ramah anak beresolusi tinggi (300 DPI) untuk dipajang di dinding kelas.',
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/lkpd/paket-lkpd-ipas-fase-b-kelas4.pdf'
    },
    {
      id: 'stimulus-1',
      title: 'Paket Kartu Stimulus Visual Literasi: Cerita Rakyat Bergambar & Pertanyaan Nalar',
      category: 'Kartu Stimulus Belajar',
      level: 'Fase A & B (Kelas 2-4 SD)',
      format: 'PDF',
      size: '3.6 MB',
      downloads: 1670,
      description: '10 kartu cerita bergambar fabel dan teks informasi sains untuk pojok baca kelas.',
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/lkpd/paket-lkpd-ipas-fase-b-kelas4.pdf'
    },
    {
      id: 'lkpd-2',
      title: 'LKPD Matematika Kontekstual: Berhitung Uang Belanja di Pasar Tradisional',
      category: 'LKPD Siswa',
      level: 'Fase A (Kelas 2 SD)',
      format: 'PDF',
      size: '1.9 MB',
      downloads: 980,
      description: 'Simulasi belanja kebutuhan pokok melatih penjumlahan dan pengurangan nominal mata uang rupiah.',
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/lkpd/paket-lkpd-ipas-fase-b-kelas4.pdf'
    }
  ];

  const categories = ['Semua', 'LKPD Siswa', 'Poster Dinding Kelas', 'Kartu Stimulus Belajar'];

  const filteredMedia = mediaItems.filter(item => {
    return selectedCategory === 'Semua' || item.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Bank LKPD Siap Cetak & Media Visual Edukatif
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Unduh lembar kerja siswa berstandar visual ramah anak, poster kelas beresolusi tinggi, dan paket kartu stimulus.
          </p>
        </div>

        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMedia.map(item => (
          <div 
            key={item.id}
            className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-100">
                  {item.category}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                  {item.format}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                {item.title}
              </h4>

              <p className="text-xs text-slate-500 leading-relaxed">
                {item.description}
              </p>

              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span className="text-slate-600 font-semibold">{item.level}</span>
                <span>•</span>
                <span>{item.size}</span>
                <span>•</span>
                <span>{item.downloads}x unduhan</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 italic">Siap Langsung Dicetak</span>

              <a
                href={item.url}
                download
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Berkas</span>
              </a>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

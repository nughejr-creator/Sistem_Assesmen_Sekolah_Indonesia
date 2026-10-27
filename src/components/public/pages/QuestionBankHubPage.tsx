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
  Sparkles,
  Eye,
  X,
  Check,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { TeachingResource, BlueprintMatrixRow } from '../../../types/publicPortal';
import { getTeachingResources, trackResourceDownload } from '../../../lib/publicPortalService';

interface QuestionBankHubPageProps {
  onOpenLogin: (tab: 'student' | 'officer') => void;
  onNavigateCreativity: () => void;
  initialCategory?: string;
}

export const QuestionBankHubPage: React.FC<QuestionBankHubPageProps> = ({
  onOpenLogin,
  onNavigateCreativity,
  initialCategory
}) => {
  const [resources, setResources] = useState<TeachingResource[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<string>('Semua Fase');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'Semua');
  const [selectedSubject, setSelectedSubject] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (initialCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory]);
  
  // Quick Preview Modal State
  const [previewResource, setPreviewResource] = useState<TeachingResource | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

  useEffect(() => {
    fetchFilteredData();
  }, [selectedPhase, selectedCategory, selectedSubject]);

  const fetchFilteredData = () => {
    getTeachingResources({
      phase: selectedPhase,
      category: selectedCategory,
      subject: selectedSubject
    }).then(data => setResources(data));
  };

  const phases = ['Semua Fase', 'Fase A', 'Fase B', 'Fase C'];
  const categories = ['Semua', 'Matriks Kisi-Kisi', 'Naskah Kartu Soal', 'Instrumen Diagnostik Awal'];
  const subjects = ['Semua', 'Bahasa Indonesia', 'Matematika', 'IPAS', 'Pendidikan Pancasila'];

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          res.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleDownload = async (res: TeachingResource) => {
    const newCount = await trackResourceDownload(res.id);
    setResources(prev => prev.map(item => item.id === res.id ? { ...item, download_count: newCount } : item));
    setDownloadSuccessId(res.id);
    setTimeout(() => setDownloadSuccessId(null), 2500);

    // Trigger browser download via anchor
    const link = document.createElement('a');
    link.href = res.file_url;
    link.download = `${res.title.replace(/[^a-zA-Z0-9]/g, '_')}.${res.file_type.toLowerCase()}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* =======================================================================
          1. HEADER BANNER
      ======================================================================= */}
      <section className="bg-gradient-to-b from-slate-900 via-sky-950 to-slate-950 text-white py-8 sm:py-9 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/30">
            <Layers className="w-3.5 h-3.5" />
            <span>Katalog Instrumen & Repositori Soal Terstandar</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
            Kisi-Kisi & Bank Soal Asesmen Nasional
          </h1>

          <p className="text-slate-300 text-xs sm:text-xs max-w-xl mx-auto leading-normal">
            Daftar matriks kisi-kisi Kurikulum Merdeka (Fase A, B, dan C), paket naskah kartu soal terstandar, serta instrumen asesmen diagnostik siap unduh untuk jenjang Sekolah Dasar.
          </p>

          {/* Quick Search */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari materi pokok, tema kisi-kisi, atau kartu soal..."
                className="w-full pl-11 pr-4 py-2.5 bg-white/10 text-white placeholder-slate-400 text-xs rounded-xl border-2 border-white/30 focus:outline-hidden focus:bg-white/15 focus:border-emerald-400 backdrop-blur-xs transition-all shadow-inner"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
          2. FILTER GANDA AREA
      ======================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Filter Controls Card */}
        <div className="bg-white p-5 rounded-2xl border-2 border-slate-300 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <Filter className="w-4 h-4 text-emerald-600" />
            <span>Filter Repositori Instrumen Evaluasi</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            
            {/* Filter 1: Fase & Jenjang */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Fase / Jenjang Kelas</label>
              <div className="flex flex-wrap gap-1.5">
                {phases.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPhase(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedPhase === p
                        ? 'bg-slate-900 text-white border-2 border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 2: Kategori Instrumen */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Kategori Dokumen</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCategory(c)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedCategory === c
                        ? 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 3: Mata Pelajaran */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Mata Pelajaran</label>
              <div className="flex flex-wrap gap-1.5">
                {subjects.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSubject(s)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedSubject === s
                        ? 'bg-sky-600 text-white border-2 border-sky-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* =====================================================================
            3. DAFTAR KARTU DOKUMEN INSTRUMEN
        ===================================================================== */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <span>Menampilkan {filteredResources.length} Berkas Instrumen Terverifikasi</span>
            </h2>

            <button
              type="button"
              onClick={onNavigateCreativity}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-100 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Rakit Kisi-Kisi Mandiri via AI</span>
            </button>
          </div>

          {filteredResources.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border-2 border-slate-300 text-center space-y-3">
              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Tidak ada instrumen yang sesuai filter</h4>
              <p className="text-xs text-slate-500">Coba atur ulang filter fase atau mata pelajaran di atas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResources.map(res => (
                <div 
                  key={res.id}
                  className="bg-white rounded-3xl border-2 border-slate-300 p-6 flex flex-col justify-between hover:shadow-xl hover:border-emerald-500 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Top Tags */}
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border-2 border-emerald-200">
                        {res.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase border ${
                        res.file_type === 'DOCX' ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {res.file_type}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {res.title}
                    </h3>

                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 text-justify">
                      {res.description}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {res.phase || 'Umum'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {res.grade_level || 'Semua Kelas'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                        {res.subject || 'Umum'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Stats & Actions */}
                  <div className="pt-5 mt-5 border-t-2 border-slate-100 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Ukuran: {res.file_size || '1.5 MB'}</span>
                      <span className="flex items-center space-x-1 text-slate-500 font-semibold">
                        <Download className="w-3 h-3 text-slate-400" />
                        <span>{res.download_count}x diunduh</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewResource(res)}
                        className="py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau</span>
                      </button>

                      {/* Download Button */}
                      <button
                        type="button"
                        onClick={() => handleDownload(res)}
                        className={`py-2 rounded-xl text-white text-xs font-bold shadow-2xs border-2 border-emerald-500/60 flex items-center justify-center space-x-1 transition-all ${
                          downloadSuccessId === res.id 
                            ? 'bg-emerald-600' 
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {downloadSuccessId === res.id ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Diunduh!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Unduh File</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =====================================================================
            4. QUICK PREVIEW MODAL
        ===================================================================== */}
        {previewResource && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-2 border-slate-300 animate-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b-2 border-slate-800">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Pratinjau Matriks Kisi-Kisi & Kartu Soal
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewResource(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                <div>
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border-2 border-emerald-200">
                      {previewResource.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 border border-slate-200 text-slate-700">
                      {previewResource.phase} • {previewResource.grade_level} • {previewResource.subject}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {previewResource.title}
                  </h3>
                  <p className="text-slate-500 mt-1 leading-relaxed text-justify">
                    {previewResource.description}
                  </p>
                </div>

                {/* Struktur Matriks Tabel */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Struktur Matriks Kisi-Kisi Butir Soal:</span>
                  </h4>

                  <div className="overflow-x-auto border-2 border-slate-300 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b-2 border-slate-300">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">No</th>
                          <th className="py-2.5 px-3">Capaian Pembelajaran (CP)</th>
                          <th className="py-2.5 px-3">Indikator Soal</th>
                          <th className="py-2.5 px-3">Bentuk Soal</th>
                          <th className="py-2.5 px-3 text-center">Level</th>
                          <th className="py-2.5 px-3 text-center">Skor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {previewResource.matrix_preview && previewResource.matrix_preview.length > 0 ? (
                          previewResource.matrix_preview.map((row) => (
                            <tr key={row.no} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-center text-slate-700">{row.no}</td>
                              <td className="py-2.5 px-3 font-medium text-slate-800">{row.cp}</td>
                              <td className="py-2.5 px-3">{row.indicator}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-700">{row.question_type}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  row.cognitive_level === 'L1' ? 'bg-sky-100 text-sky-800' :
                                  row.cognitive_level === 'L2' ? 'bg-amber-100 text-amber-800' :
                                  'bg-rose-100 text-rose-800'
                                }`}>
                                  {row.cognitive_level}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-center text-emerald-700">{row.points} Poin</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-4 text-center text-slate-400 italic">
                              Rincian butir lengkap tersedia di dalam dokumen berkas.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border-2 border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Format: <strong>{previewResource.file_type}</strong> ({previewResource.file_size})</span>
                  <span>Diunduh sebanyak <strong>{previewResource.download_count} kali</strong> oleh guru.</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPreviewResource(null)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                >
                  Tutup Pratinjau
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleDownload(previewResource);
                    setPreviewResource(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md border-2 border-emerald-400/50 flex items-center space-x-1.5 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Dokumen ({previewResource.file_type})</span>
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};

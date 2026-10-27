import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Clock, 
  Eye, 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  Share2, 
  Filter,
  FileText
} from 'lucide-react';
import { PublicArticle } from '../../../types/publicPortal';
import { getPublicArticles } from '../../../lib/publicPortalService';

interface AssessmentInsightsPageProps {
  onOpenLogin: (tab: 'student' | 'officer') => void;
  onNavigateCreativity: () => void;
}

export const AssessmentInsightsPage: React.FC<AssessmentInsightsPageProps> = ({
  onOpenLogin,
  onNavigateCreativity
}) => {
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua Kategori');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedArticle, setSelectedArticle] = useState<PublicArticle | null>(null);

  useEffect(() => {
    getPublicArticles().then(data => setArticles(data));
  }, []);

  const categories = [
    'Semua Kategori',
    'Panduan Asesmen',
    'Bedah AKM',
    'Analisis Butir',
    'Rubrik & Penskoran'
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'Semua Kategori' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* =======================================================================
          1. HEADER BANNER
      ======================================================================= */}
      <section className="bg-gradient-to-b from-sky-900 via-slate-900 to-slate-950 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-400/30">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Pusat Literasi & Evaluasi Pembelajaran</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Wawasan Soal & Asesmen Sekolah
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Kumpulan panduan penulisan soal bermutu, bedah stimulus Asesmen Kompetensi Minimum (AKM), analisis daya beda butir, serta pedoman rubrik penilaian bagi pendidik di Indonesia.
          </p>

          {/* Quick Search Bar */}
          <div className="max-w-xl mx-auto pt-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik panduan soal, AKM, atau analisis butir..."
                className="w-full pl-11 pr-4 py-3 bg-white/10 text-white placeholder-slate-400 text-xs rounded-xl border border-white/20 focus:outline-hidden focus:bg-white/15 focus:border-sky-400 backdrop-blur-xs transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =======================================================================
          2. MAIN CONTENT AREA
      ======================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pb-8 border-b border-slate-200">
          <Filter className="w-4 h-4 text-slate-500 mr-1" />
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Modal / Detail View Artikel Terpilih */}
        {selectedArticle ? (
          <div className="pt-8 max-w-4xl mx-auto bg-white p-6 sm:p-10 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => setSelectedArticle(null)}
              className="mb-6 inline-flex items-center space-x-1.5 text-xs font-bold text-sky-600 hover:text-sky-700"
            >
              <span>← Kembali ke Daftar Artikel</span>
            </button>

            <div className="space-y-4">
              <div className="inline-block px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-sky-100 text-sky-800">
                {selectedArticle.category}
              </div>

              <h2 className="text-xl sm:text-3xl font-black text-slate-900 leading-tight">
                {selectedArticle.title}
              </h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pb-6 border-b border-slate-200">
                <span>Penulis: <strong className="text-slate-700">{selectedArticle.author_name}</strong></span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Waktu Baca: {selectedArticle.read_time} menit</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedArticle.views_count} pembaca</span>
                </span>
              </div>

              {/* Konten Artikel */}
              <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-line text-slate-700 pt-4">
                {selectedArticle.content}
              </div>

              {/* Call to action bawah artikel */}
              <div className="mt-10 p-5 rounded-xl bg-sky-50 border border-sky-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black text-sky-900">Ingin Membuat Soal Serupa dengan Generator AI?</h4>
                  <p className="text-[11px] text-sky-700">Gunakan Asisten Guru AI untuk merakit kisi-kisi dan kartu soal siap pakai.</p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateCreativity}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs shrink-0 flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Buka Ruang Kreativitas</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Grid Kartu Artikel */
          <div className="pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map(art => (
              <article 
                key={art.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md hover:border-sky-300 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-100">
                      {art.category}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{art.read_time} mnt</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-2">
                    {art.title}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {art.excerpt}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">
                    {art.author_name}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedArticle(art);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="text-xs font-bold text-sky-600 group-hover:text-sky-700 flex items-center space-x-1"
                  >
                    <span>Baca Panduan</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

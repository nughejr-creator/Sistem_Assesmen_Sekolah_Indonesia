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
  FileText,
  ChevronRight,
  UserCheck,
  Check,
  BookmarkCheck,
  ArrowLeft
} from 'lucide-react';
import { PublicArticle } from '../../../types/publicPortal';
import { getPublicArticles } from '../../../lib/publicPortalService';
import { formatArticleContent } from '../../../lib/safeHtmlSanitizer';

interface AssessmentInsightsPageProps {
  onOpenLogin: (tab: 'student' | 'officer') => void;
  onNavigateCreativity: () => void;
  onNavigateHome?: () => void;
  initialCategory?: string;
  articles?: PublicArticle[];
  selectedArticle?: PublicArticle | null;
  onSelectArticle?: (article: PublicArticle | null) => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  hideBanner?: boolean;
}

export const AssessmentInsightsPage: React.FC<AssessmentInsightsPageProps> = ({
  onOpenLogin,
  onNavigateCreativity,
  onNavigateHome,
  initialCategory,
  articles: propArticles,
  selectedArticle: propSelectedArticle,
  onSelectArticle: propOnSelectArticle,
  selectedCategory: propSelectedCategory,
  onSelectCategory: propOnSelectCategory,
  hideBanner = false
}) => {
  const [internalArticles, setInternalArticles] = useState<PublicArticle[]>([]);
  const [localCategory, setLocalCategory] = useState<string>(initialCategory || 'Semua Topik');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [localSelectedArticle, setLocalSelectedArticle] = useState<PublicArticle | null>(null);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // Controlled vs Uncontrolled state
  const articles = propArticles && propArticles.length > 0 ? propArticles : internalArticles;
  const selectedArticle = propSelectedArticle !== undefined ? propSelectedArticle : localSelectedArticle;
  const selectedCategory = propSelectedCategory !== undefined ? propSelectedCategory : localCategory;

  const handleSelectArticle = (art: PublicArticle | null) => {
    if (propOnSelectArticle) {
      propOnSelectArticle(art);
    } else {
      setLocalSelectedArticle(art);
    }
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSelectCategory = (cat: string) => {
    if (propOnSelectCategory) {
      propOnSelectCategory(cat);
    } else {
      setLocalCategory(cat);
    }
  };

  useEffect(() => {
    if (initialCategory) {
      handleSelectCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    if (!propArticles || propArticles.length === 0) {
      getPublicArticles().then(data => setInternalArticles(data));
    }
  }, [propArticles]);

  const categories = [
    'Semua Topik',
    'Panduan Asesmen',
    'Bedah AKM',
    'Analisis Butir',
    'Rubrik & Penskoran'
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'Semua Topik' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          article.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleShareClick = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  const relatedArticles = selectedArticle 
    ? articles.filter(a => a.id !== selectedArticle.id).slice(0, 3)
    : [];

  return (
    <div className={hideBanner ? "space-y-6" : "min-h-screen bg-slate-50 text-slate-900 pb-20"}>
      
      {/* =======================================================================
          1. HEADER BANNER
      ======================================================================= */}
      {!hideBanner && (
        <section className="bg-gradient-to-b from-sky-950 via-slate-900 to-slate-950 text-white py-8 sm:py-9 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
          <div className="max-w-5xl mx-auto text-center space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[11px] font-bold border border-sky-400/30">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Pusat Literasi & Evaluasi Pembelajaran</span>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
              Wawasan Soal & Asesmen Sekolah
            </h1>

            <p className="text-slate-300 text-xs sm:text-xs max-w-xl mx-auto leading-normal">
              Kumpulan panduan penulisan soal bermutu, bedah stimulus Asesmen Kompetensi Minimum (AKM), analisis daya beda butir, serta pedoman rubrik penilaian bagi pendidik di Indonesia.
            </p>

            {/* Quick Search Bar */}
            <div className="max-w-xl mx-auto pt-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari topik panduan soal, stimulus AKM, atau rubrik penskoran..."
                  className="w-full pl-11 pr-4 py-2.5 bg-white/10 text-white placeholder-slate-400 text-xs rounded-xl border-2 border-white/30 focus:outline-hidden focus:bg-white/15 focus:border-sky-400 backdrop-blur-xs transition-all shadow-inner"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =======================================================================
          2. MAIN CONTENT AREA
      ======================================================================= */}
      <div className="space-y-6">
        {/* DETAIL VIEW ARTIKEL */}
        {selectedArticle ? (
              <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500 py-2">
              <button 
                type="button" 
                onClick={() => {
                  setSelectedArticle(null);
                  if (onNavigateHome) onNavigateHome();
                }}
                className="hover:text-sky-600 transition-colors"
              >
                Beranda
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button 
                type="button" 
                onClick={() => setSelectedArticle(null)}
                className="hover:text-sky-600 transition-colors"
              >
                Wawasan Asesmen
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-none">
                {selectedArticle.title}
              </span>
            </nav>

            {/* Back Button */}
            <button
              type="button"
              onClick={() => setSelectedArticle(null)}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-white border-2 border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-sky-700 transition-all shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Katalog Panduan</span>
            </button>

            {/* Main Article Container */}
            <article className="bg-white p-6 sm:p-10 rounded-3xl border-2 border-slate-300 shadow-md space-y-6">
              
              {/* Top Meta Badges */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-slate-100">
                <span className="px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border-2 border-sky-300">
                  {selectedArticle.category}
                </span>

                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedArticle.read_time} menit baca</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedArticle.views_count} pembaca</span>
                  </span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 leading-snug">
                {selectedArticle.title}
              </h1>

              {/* Author Info Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">{selectedArticle.author_name}</div>
                    <div className="text-[11px] text-slate-500">Praktisi Evaluasi Pendidikan & Inisiator SASI</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShareClick}
                  className="px-3 py-1.5 rounded-lg bg-white border-2 border-slate-300 text-slate-700 hover:text-sky-700 hover:border-sky-400 text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">Tautan Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Bagikan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Article Content */}
              <div 
                className="text-xs sm:text-sm leading-relaxed text-slate-700 space-y-4 pt-2 border-t-2 border-slate-100 font-sans text-justify article-rendered-body"
                dangerouslySetInnerHTML={{ __html: formatArticleContent(selectedArticle.content) }}
              />

              {/* Call to Action Box */}
              <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-sky-50 to-teal-50 border-2 border-sky-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="text-xs font-black text-sky-950 flex items-center space-x-1.5 justify-center sm:justify-start">
                    <Sparkles className="w-4 h-4 text-sky-600" />
                    <span>Ingin Merakit Butir Soal Berdasarkan Kaidah Ini?</span>
                  </h4>
                  <p className="text-[11px] text-sky-800">
                    Gunakan Asisten Guru AI untuk membuat kisi-kisi dan naskah kartu soal terstruktur secara otomatis.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onNavigateCreativity}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-xs shrink-0 flex items-center space-x-1.5 transition-transform active:scale-95"
                >
                  <span>Buka Generator AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </article>

            {/* Rekomendasi Artikel Terkait */}
            {relatedArticles.length > 0 && (
              <div className="pt-4 space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <BookmarkCheck className="w-4 h-4 text-sky-600" />
                  <span>Rekomendasi Wawasan Asesmen Lainnya</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {relatedArticles.map(rel => (
                    <div
                      key={rel.id}
                      onClick={() => handleSelectArticle(rel)}
                      className="bg-white p-5 rounded-2xl border-2 border-slate-300 hover:border-sky-500 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 border border-slate-200 text-slate-700">
                          {rel.category}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 hover:text-sky-600 transition-colors">
                          {rel.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2 text-justify">
                          {rel.excerpt}
                        </p>
                      </div>

                      <div className="pt-3 mt-3 border-t-2 border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{rel.read_time} menit baca</span>
                        <span className="text-sky-600 font-bold flex items-center space-x-0.5">
                          <span>Baca</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* KATALOG LIST VIEW */
          <div className="space-y-6">
            
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pb-4 border-b-2 border-slate-200">
              <Filter className="w-4 h-4 text-slate-500 mr-1" />
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-sky-600 text-white border-2 border-sky-600 shadow-xs'
                      : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Artikel Grid */}
            {filteredArticles.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border-2 border-slate-300 text-center space-y-3">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">Tidak ada artikel yang cocok</h4>
                <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau pilih kategori lain.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {filteredArticles.map(art => (
                  <article 
                    key={art.id}
                    className="bg-white rounded-3xl border-2 border-slate-300 p-6 flex flex-col justify-between hover:shadow-xl hover:border-sky-500 transition-all group"
                  >
                    <div className="space-y-3">
                      {art.featured_image && (
                        <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img 
                            src={art.featured_image} 
                            alt={art.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 border-2 border-sky-200">
                          {art.category}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{art.read_time} mnt baca</span>
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-700 transition-colors line-clamp-2">
                        {art.title}
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 text-justify">
                        {art.excerpt}
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t-2 border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-[11px] font-medium text-slate-500 truncate max-w-[140px]">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{art.author_name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectArticle(art)}
                        className="px-3 py-1.5 rounded-lg bg-sky-50 border-2 border-sky-200 group-hover:bg-sky-600 group-hover:border-sky-600 group-hover:text-white text-sky-700 text-xs font-bold flex items-center space-x-1 transition-all"
                      >
                        <span>Baca Lengkap</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

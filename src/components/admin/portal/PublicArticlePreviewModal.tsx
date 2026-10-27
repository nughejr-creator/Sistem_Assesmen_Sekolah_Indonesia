import React, { useState, useMemo } from 'react';
import { 
  X, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Clock, 
  Eye, 
  UserCheck, 
  Share2, 
  Sparkles, 
  ArrowRight, 
  Check, 
  ChevronRight, 
  BookOpen,
  Calendar
} from 'lucide-react';
import { PublicArticle } from '../../../types/publicPortal';
import { formatArticleContent, calculateReadTime } from '../../../lib/safeHtmlSanitizer';

interface PublicArticlePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: Partial<PublicArticle>;
}

export const PublicArticlePreviewModal: React.FC<PublicArticlePreviewModalProps> = ({
  isOpen,
  onClose,
  article
}) => {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [copiedShare, setCopiedShare] = useState(false);

  // Process and sanitize HTML + render KaTeX equations
  const processedContent = useMemo(() => {
    if (!article.content) return '<p class="text-slate-400 italic">Belum ada isi naskah artikel...</p>';
    return formatArticleContent(article.content);
  }, [article.content]);

  if (!isOpen) return null;

  const viewportWidthClass = 
    viewportMode === 'mobile' 
      ? 'max-w-[390px] border-x-4 border-slate-700 shadow-2xl' 
      : viewportMode === 'tablet' 
      ? 'max-w-[768px] border-x-4 border-slate-400 shadow-2xl' 
      : 'max-w-4xl shadow-md';

  const readTimeCalculated = article.read_time || calculateReadTime(article.content || '');
  const publishDateStr = article.published_at 
    ? new Date(article.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleShareClick = () => {
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-between overflow-hidden animate-fade-in">
      
      {/* =======================================================================
          TOP BAR: RESPONSIVE SWITCHER & CLOSE ACTIONS
      ======================================================================= */}
      <div className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-white shrink-0 z-10">
        
        {/* Left: Indicator */}
        <div className="flex items-center space-x-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Pratinjau Tampilan Publik (Public View Mode)</span>
          </span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Simulasi Pembaca
          </span>
        </div>

        {/* Center: Viewport Switcher */}
        <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setViewportMode('desktop')}
            title="Desktop View (100%)"
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              viewportMode === 'desktop'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setViewportMode('tablet')}
            title="Tablet View (768px)"
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              viewportMode === 'tablet'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>

          <button
            type="button"
            onClick={() => setViewportMode('mobile')}
            title="Mobile View (375px)"
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
              viewportMode === 'mobile'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">HP / Mobile</span>
          </button>
        </div>

        {/* Right: Exit Preview */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-black transition-colors flex items-center space-x-1.5 border border-slate-700 hover:border-rose-500 shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Tutup Pratinjau / Kembali Mengedit</span>
          </button>
        </div>
      </div>

      {/* =======================================================================
          PREVIEW CANVAS AREA (SCROLLABLE & RESPONSIVE SIMULATION)
      ======================================================================= */}
      <div className="w-full flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-900/40">
        <div className={`w-full bg-[#f4f7fb] min-h-full transition-all duration-300 rounded-2xl overflow-hidden flex flex-col ${viewportWidthClass}`}>
          
          {/* Header Simulation Bar */}
          <div className="bg-slate-900 text-white px-6 py-4 border-b-2 border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center font-black text-xs text-white">
                S
              </div>
              <div>
                <div className="text-xs font-black tracking-wide">SASIPEDIA</div>
                <div className="text-[10px] text-slate-400">Portal Wawasan & Panduan Asesmen</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Zona Publik</span>
            </div>
          </div>

          {/* Article Container Body */}
          <div className="p-4 sm:p-8 flex-1 space-y-6">
            
            {/* Breadcrumb Navigation */}
            <nav className="flex items-center space-x-2 text-xs font-medium text-slate-500">
              <span className="hover:text-sky-600">Beranda</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="hover:text-sky-600">Wawasan Asesmen</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-none">
                {article.title || 'Judul Artikel Belum Diisi'}
              </span>
            </nav>

            {/* Article Card */}
            <article className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-md space-y-6">
              
              {/* Category & Meta */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b-2 border-slate-100">
                <span className="px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border-2 border-sky-300">
                  {article.category || 'Panduan Asesmen'}
                </span>

                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{publishDateStr}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{readTimeCalculated} menit baca</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>{article.views_count || 1} pembaca</span>
                  </span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-3xl font-black text-slate-900 leading-snug">
                {article.title || 'Judul Naskah Artikel Publik'}
              </h1>

              {/* Excerpt if available */}
              {article.excerpt && (
                <div className="p-4 rounded-xl bg-sky-50/60 border-l-4 border-sky-600 text-xs sm:text-sm text-sky-950 font-medium italic leading-relaxed text-justify">
                  {article.excerpt}
                </div>
              )}

              {/* Author Info Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900">
                      {article.author_name || 'Agi Hamdani, M.Pd'}
                    </div>
                    <div className="text-[11px] text-slate-500">Praktisi Evaluasi Pendidikan & Inisiator SASI</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleShareClick}
                  className="px-3 py-1.5 rounded-lg bg-white border-2 border-slate-300 text-slate-700 hover:text-sky-700 text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors"
                >
                  {copiedShare ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Bagikan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Featured Image if available */}
              {article.featured_image && (
                <div className="rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm max-h-96">
                  <img
                    src={article.featured_image}
                    alt={article.title || 'Sampul Artikel'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Tags display */}
              {article.tags && article.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {article.tags.map((tag, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Main Article Content with Rendered KaTeX & HTML formatting */}
              <div 
                className="text-xs sm:text-sm leading-relaxed text-slate-700 space-y-4 pt-2 border-t-2 border-slate-100 font-sans text-justify article-rendered-body"
                dangerouslySetInnerHTML={{ __html: processedContent }}
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
                  className="px-4 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-black shadow-xs shrink-0 flex items-center space-x-1.5"
                >
                  <span>Buka Generator AI</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </article>

          </div>

          {/* Footer Simulation Bar */}
          <div className="bg-slate-900 text-slate-400 px-6 py-4 border-t border-slate-800 text-[11px] text-center">
            © 2026 Sistem Asesmen Sekolah Indonesia (SASI) • Simulasi Pratinjau Publik
          </div>

        </div>
      </div>

    </div>
  );
};

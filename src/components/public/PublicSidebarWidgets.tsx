import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Pin, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  Calendar, 
  Download, 
  Globe, 
  HelpCircle, 
  FileText, 
  ExternalLink, 
  Bookmark, 
  BookOpen, 
  Layers, 
  Flame, 
  X,
  Tag
} from 'lucide-react';
import { 
  PublicArticle, 
  SidebarWidgetConfig, 
  PortalQuickLink 
} from '../../types/publicPortal';
import { 
  getSidebarWidgetConfig, 
  getPortalQuickLinks 
} from '../../lib/publicPortalService';

interface PublicSidebarWidgetsProps {
  articles: PublicArticle[];
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  onSelectArticle: (article: PublicArticle) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Calendar,
  Download,
  Globe,
  HelpCircle,
  FileText,
  ExternalLink,
  Bookmark,
  BookOpen,
  Layers,
  Sparkles
};

export const PublicSidebarWidgets: React.FC<PublicSidebarWidgetsProps> = ({
  articles,
  selectedCategory = 'Semua Topik',
  onSelectCategory,
  onSelectArticle
}) => {
  const [config, setConfig] = useState<SidebarWidgetConfig>({
    show_search: true,
    show_pinned: true,
    show_popular_tabs: true,
    show_categories: true,
    show_quick_links: true
  });
  const [quickLinks, setQuickLinks] = useState<PortalQuickLink[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Tab state (Populer vs Terbaru)
  const [activeTab, setActiveTab] = useState<'popular' | 'latest'>('popular');

  // Load config & quick links on mount
  useEffect(() => {
    const loadSidebarData = async () => {
      const cfg = await getSidebarWidgetConfig();
      setConfig(cfg);
      const links = await getPortalQuickLinks();
      setQuickLinks(links.filter(l => l.is_active));
    };
    loadSidebarData();
  }, []);

  // Shortcut key listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Instant Search Results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return articles
      .filter(a => 
        a.title.toLowerCase().includes(q) || 
        (a.excerpt && a.excerpt.toLowerCase().includes(q)) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(q)))
      )
      .slice(0, 5);
  }, [articles, searchQuery]);

  // Pinned Articles (valid & not expired)
  const pinnedArticles = useMemo(() => {
    const now = new Date();
    return articles.filter(a => {
      if (!a.is_pinned) return false;
      if (a.pinned_until) {
        return new Date(a.pinned_until) > now;
      }
      return true;
    });
  }, [articles]);

  // Popular Articles (ranked by views_count)
  const popularArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 5);
  }, [articles]);

  // Latest Articles (ranked by published_at / created_at)
  const latestArticles = useMemo(() => {
    return [...articles]
      .sort((a, b) => {
        const dateA = new Date(a.published_at || a.created_at || 0).getTime();
        const dateB = new Date(b.published_at || b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [articles]);

  // Categories with count
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    articles.forEach(a => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [articles]);

  return (
    <aside className="w-full space-y-6 sticky top-20 text-slate-800">
      
      {/* =======================================================================
          1. WIDGET PENCARIAN CEPAT (INSTANT SEARCH DENGAN CTRL+K)
      ======================================================================= */}
      {config.show_search && (
        <div className="bg-white rounded-3xl p-4 border-2 border-slate-300 shadow-sm relative">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Cari materi artikel atau panduan..."
              className="w-full pl-9 pr-14 py-2.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-sky-500 transition-all shadow-inner"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-white border border-slate-300 text-[10px] font-mono text-slate-500 shadow-2xs pointer-events-none">
                Ctrl+K
              </span>
            )}
          </div>

          {/* Instant Search Results Dropdown */}
          {isSearchFocused && searchQuery.trim() && (
            <div 
              className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border-2 border-slate-300 shadow-xl overflow-hidden z-30 divide-y divide-slate-100 animate-fade-in"
              onMouseLeave={() => setIsSearchFocused(false)}
            >
              <div className="px-3.5 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                <span>Hasil Pencarian Cepat ({searchResults.length})</span>
                <button
                  type="button"
                  onClick={() => setIsSearchFocused(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {searchResults.length > 0 ? (
                searchResults.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectArticle(item);
                      setIsSearchFocused(false);
                      setSearchQuery('');
                    }}
                    className="w-full p-3 text-left hover:bg-sky-50 transition-colors flex items-start space-x-2.5 group"
                  >
                    <BookOpen className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-800 group-hover:text-sky-700 line-clamp-1">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                        <span className="text-sky-600 font-semibold">{item.category}</span>
                        <span>•</span>
                        <span>{item.read_time} menit baca</span>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Tidak ditemukan artikel yang sesuai kata kunci.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* =======================================================================
          2. WIDGET POS PENTING / PENGUMUMAN TERSEMAT (PINNED)
      ======================================================================= */}
      {config.show_pinned && pinnedArticles.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-5 border-2 border-amber-300 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-200/80 border border-amber-400/80 text-amber-900 text-[10px] font-black uppercase tracking-wider">
              <Pin className="w-3 h-3 text-amber-700 fill-amber-700" />
              <span>Pengumuman Tersemat</span>
            </span>
            <span className="text-[10px] font-bold text-amber-700">Penting</span>
          </div>

          <div className="space-y-2.5">
            {pinnedArticles.slice(0, 2).map(pinned => (
              <div 
                key={pinned.id}
                onClick={() => onSelectArticle(pinned)}
                className="p-3 bg-white/90 hover:bg-white rounded-2xl border border-amber-200 hover:border-amber-400 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="text-xs font-black text-slate-900 group-hover:text-amber-800 line-clamp-2 leading-snug">
                  {pinned.title}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                  <span className="font-semibold text-amber-800">{pinned.category}</span>
                  <span className="flex items-center space-x-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{pinned.read_time} menit</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================================
          3. WIDGET TAB POPULER & TERBARU
      ======================================================================= */}
      {config.show_popular_tabs && (
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-300 shadow-sm space-y-4">
          
          {/* Tab Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('popular')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'popular'
                  ? 'bg-white text-sky-800 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Terpopuler</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('latest')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition-all ${
                activeTab === 'latest'
                  ? 'bg-white text-sky-800 shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Teranyar</span>
            </button>
          </div>

          {/* Tab Content List */}
          <div className="space-y-3">
            {(activeTab === 'popular' ? popularArticles : latestArticles).map((art, idx) => {
              const rankColor = 
                idx === 0 
                  ? 'bg-amber-500 text-white' 
                  : idx === 1 
                  ? 'bg-slate-400 text-white' 
                  : idx === 2 
                  ? 'bg-amber-700 text-white' 
                  : 'bg-slate-100 text-slate-600';

              return (
                <div
                  key={art.id}
                  onClick={() => onSelectArticle(art)}
                  className="flex items-center space-x-3 p-2 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
                >
                  {/* Thumbnail / Rank Badge */}
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-2xs">
                    {art.featured_image ? (
                      <img 
                        src={art.featured_image} 
                        alt={art.title} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-700">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    )}

                    {activeTab === 'popular' && (
                      <span className={`absolute top-0 left-0 w-5 h-5 rounded-br-lg text-[10px] font-black flex items-center justify-center ${rankColor} shadow-xs`}>
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-sky-700 line-clamp-2 leading-snug">
                      {art.title}
                    </h4>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                      <span className="font-semibold text-slate-500">{art.category}</span>
                      <span>•</span>
                      <span className="flex items-center space-x-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{art.read_time}m</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* =======================================================================
          4. WIDGET KATEGORI & TAKSONOMI
      ======================================================================= */}
      {config.show_categories && (
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-300 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b-2 border-slate-100">
            <Tag className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Kategori & Topik
            </h3>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onSelectCategory && onSelectCategory('Semua Topik')}
              className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                selectedCategory === 'Semua Topik'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>Semua Topik Panduan</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                selectedCategory === 'Semua Topik' ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {articles.length}
              </span>
            </button>

            {Object.entries(categoryCounts).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(cat)}
                className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
                  selectedCategory === cat
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{cat}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  selectedCategory === cat ? 'bg-sky-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================================
          5. WIDGET TAUTAN CEPAT (QUICK LINKS)
      ======================================================================= */}
      {config.show_quick_links && quickLinks.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border-2 border-slate-300 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b-2 border-slate-100">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Tautan Layanan Cepat
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {quickLinks.map(link => {
              const IconComp = ICON_MAP[link.icon] || ExternalLink;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target={link.is_new_tab ? '_blank' : '_self'}
                  rel={link.is_new_tab ? 'noopener noreferrer' : undefined}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-all flex items-center space-x-3 group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 group-hover:border-sky-400 group-hover:bg-sky-600 text-slate-700 group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 group-hover:text-sky-800 line-clamp-1">
                      {link.title}
                    </div>
                    {link.description && (
                      <div className="text-[10px] text-slate-400 line-clamp-1">
                        {link.description}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}

    </aside>
  );
};

import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, Sparkles } from 'lucide-react';
import { PublicNavbar, PublicNavRoute } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { LandingHomeBody } from './LandingHomeBody';
import { AssessmentInsightsPage } from './pages/AssessmentInsightsPage';
import { QuestionBankHubPage } from './pages/QuestionBankHubPage';
import { TeacherCreativityHubPage } from './pages/TeacherCreativityHubPage';
import { DeveloperProfilePage } from './pages/DeveloperProfilePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { AboutContactPage } from './pages/AboutContactPage';
import { PublicSidebarWidgets } from './PublicSidebarWidgets';
import { PublicArticle, PublicSidebarAggregatePayload } from '../../types/publicPortal';
import { getPublicSidebarAggregateData } from '../../lib/publicPortalService';

interface PublicLayoutProps {
  initialRoute?: PublicNavRoute;
  onOpenLogin: (tab: 'student' | 'officer', quickToken?: string) => void;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  initialRoute = 'beranda',
  onOpenLogin
}) => {
  const validRoutes: PublicNavRoute[] = [
    'beranda',
    'wawasan-asesmen',
    'bank-soal',
    'ruang-kreativitas',
    'profil-pengembang',
    'privacy-policy',
    'terms',
    'about-contact'
  ];

  // Resolve current route from pathname first (Clean Path SEO), with fallback to legacy hash
  const getRouteFromUrl = (): PublicNavRoute => {
    try {
      // 1. Check clean pathname (e.g. "/wawasan-asesmen", "/bank-soal", "/about", "/contact")
      const pathname = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
      if (pathname === 'about' || pathname === 'contact') {
        return 'about-contact';
      }
      if (validRoutes.includes(pathname as PublicNavRoute)) {
        return pathname as PublicNavRoute;
      }
      for (const r of validRoutes) {
        if (pathname.startsWith(r)) {
          return r;
        }
      }

      // 2. Backward compatibility fallback: check hash if present (e.g. "#/wawasan-asesmen")
      const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');
      if (hash === 'about' || hash === 'contact') {
        return 'about-contact';
      }
      if (validRoutes.includes(hash as PublicNavRoute)) {
        return hash as PublicNavRoute;
      }
      for (const r of validRoutes) {
        if (hash.startsWith(r)) {
          return r;
        }
      }
    } catch (e) {}
    return initialRoute;
  };

  const [currentRoute, setCurrentRoute] = useState<PublicNavRoute>(getRouteFromUrl);

  const getInitialOptionsFromUrl = () => {
    try {
      const fullUrl = (window.location.pathname + window.location.hash + window.location.search).toLowerCase();
      if (fullUrl.includes('desain-atribut-kelas') || fullUrl.includes('atribut-kelas')) {
        return { tab: 'ai' as const, generatorIndex: 6 };
      }
    } catch (e) {}
    return {};
  };

  const [navOptions, setNavOptions] = useState<{
    category?: string;
    tab?: 'ai' | 'kontribusi' | 'perangkat' | 'lkpd' | 'administrasi';
    generatorIndex?: number;
  }>(getInitialOptionsFromUrl);

  // Layout-level Sidebar Aggregate Cache State
  const [sidebarAggregate, setSidebarAggregate] = useState<PublicSidebarAggregatePayload | null>(null);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState<boolean>(true);

  // Article Reader State (synchronized across sidebar and page)
  const [selectedArticle, setSelectedArticle] = useState<PublicArticle | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua Topik');

  // Load aggregate sidebar data once on mount (cached with TTL)
  useEffect(() => {
    let isMounted = true;
    const fetchAggregate = async () => {
      try {
        const data = await getPublicSidebarAggregateData();
        if (isMounted) {
          setSidebarAggregate(data);
          setIsLoadingSidebar(false);
        }
      } catch (err) {
        console.error('Failed to load public sidebar aggregate data:', err);
        if (isMounted) {
          setIsLoadingSidebar(false);
        }
      }
    };
    fetchAggregate();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // If entered with legacy hash (e.g. #/wawasan-asesmen), upgrade address bar to clean path
    if (window.location.hash) {
      const legacyRoute = getRouteFromUrl();
      const cleanPath = legacyRoute === 'beranda' ? '/' : `/${legacyRoute}`;
      try {
        window.history.replaceState(null, '', cleanPath);
      } catch (e) {}
    }

    const handleUrlChange = () => {
      const fullUrl = (window.location.pathname + window.location.hash).toLowerCase();
      if (fullUrl.includes('desain-atribut-kelas') || fullUrl.includes('atribut-kelas')) {
        setCurrentRoute('ruang-kreativitas');
        setNavOptions({ tab: 'ai', generatorIndex: 6 });
        return;
      }
      setCurrentRoute(getRouteFromUrl());
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  const handleNavigate = (
    route: PublicNavRoute, 
    options?: {
      category?: string;
      tab?: 'ai' | 'kontribusi' | 'perangkat' | 'lkpd' | 'administrasi';
      generatorIndex?: number;
    }
  ) => {
    setCurrentRoute(route);
    if (options) {
      setNavOptions(options);
      if (options.category) {
        setSelectedCategory(options.category);
      }
    } else {
      setNavOptions({});
    }
    try {
      const targetPath = route === 'beranda' ? '/' : `/${route}`;
      if (window.location.pathname !== targetPath || window.location.hash) {
        window.history.pushState(null, '', targetPath);
      }
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cross-Navigation handlers from Sidebar
  const handleSidebarSelectArticle = (article: PublicArticle) => {
    setSelectedArticle(article);
    setCurrentRoute('wawasan-asesmen');
    try {
      const targetPath = article.slug 
        ? `/wawasan-asesmen/${article.slug}`
        : '/wawasan-asesmen';
      if (window.location.pathname !== targetPath || window.location.hash) {
        window.history.pushState(null, '', targetPath);
      }
    } catch (e) {}
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const handleSidebarSelectCategory = (category: string) => {
    setSelectedCategory(category);
    setSelectedArticle(null);
    setCurrentRoute('wawasan-asesmen');
    try {
      if (window.location.pathname !== '/wawasan-asesmen' || window.location.hash) {
        window.history.pushState(null, '', '/wawasan-asesmen');
      }
    } catch (e) {}
    window.scrollTo({ top: 250, behavior: 'smooth' });
  };

  const isHubRoute = ['wawasan-asesmen', 'bank-soal', 'ruang-kreativitas'].includes(currentRoute);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      
      {/* 1. TOP PUBLIC NAVBAR (Maksimal 4 Menu & CTA CBT Menonjol) */}
      <PublicNavbar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenLogin={onOpenLogin}
      />

      {/* 2. MAIN CONTENT OUTLET */}
      <main className="flex-1 flex flex-col">
        {/* =======================================================================
            SHARED HUB LAYOUT: Untuk 3 Halaman Publik Utama
            (Wawasan Asesmen, Bank Soal, Ruang Kreativitas)
        ======================================================================= */}
        {isHubRoute ? (
          <div className="flex-1 flex flex-col">
            {/* Header Banner Dinamis Seragam (Zero CLS) */}
            {currentRoute === 'wawasan-asesmen' && (
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
                </div>
              </section>
            )}

            {currentRoute === 'bank-soal' && (
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
                </div>
              </section>
            )}

            {currentRoute === 'ruang-kreativitas' && (
              <section className="bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 text-white py-8 sm:py-9 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-5xl mx-auto text-center space-y-2">
                  <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pusat Produktivitas & Kreativitas Pendidik Indonesia</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
                    Ruang Kreativitas Guru
                  </h1>
                  <p className="text-slate-300 text-xs sm:text-xs max-w-xl mx-auto leading-normal">
                    One-Stop Educator Hub: Asisten Prompt AI cerdas 6 alur mengajar, ruang publikasi karya guru, repositori perangkat ajar Kurikulum Merdeka, serta unduhan administrasi kelas gratis.
                  </p>
                </div>
              </section>
            )}

            {/* Responsive 2-Column Grid (Main Content + Shared Sticky Sidebar) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
              <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* 1. Dynamic Main Content Column */}
                <div className="flex-1 min-w-0 w-full">
                  {currentRoute === 'wawasan-asesmen' && (
                    <AssessmentInsightsPage
                      onOpenLogin={onOpenLogin}
                      onNavigateCreativity={() => handleNavigate('ruang-kreativitas')}
                      initialCategory={navOptions.category || selectedCategory}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                      selectedArticle={selectedArticle}
                      onSelectArticle={setSelectedArticle}
                      hideBanner={true}
                    />
                  )}

                  {currentRoute === 'bank-soal' && (
                    <QuestionBankHubPage
                      onOpenLogin={onOpenLogin}
                      onNavigateCreativity={() => handleNavigate('ruang-kreativitas')}
                      initialCategory={navOptions.category}
                      hideBanner={true}
                    />
                  )}

                  {currentRoute === 'ruang-kreativitas' && (
                    <TeacherCreativityHubPage
                      onOpenLogin={onOpenLogin}
                      initialTab={navOptions.tab}
                      initialGeneratorIndex={navOptions.generatorIndex}
                      hideBanner={true}
                    />
                  )}
                </div>

                {/* 2. Shared Persistent Sidebar Column */}
                <aside className="w-full lg:w-80 shrink-0 sticky top-20">
                  <PublicSidebarWidgets
                    aggregateData={sidebarAggregate}
                    isLoading={isLoadingSidebar}
                    selectedCategory={selectedCategory}
                    onSelectCategory={handleSidebarSelectCategory}
                    onSelectArticle={handleSidebarSelectArticle}
                  />
                </aside>

              </div>
            </div>
          </div>
        ) : (
          /* =====================================================================
              STANDALONE PAGES: Halaman Tanpa Sidebar (Beranda & Profil/Legal)
          ===================================================================== */
          <>
            {currentRoute === 'beranda' && (
              <LandingHomeBody 
                onOpenLogin={onOpenLogin}
                onNavigateInsights={() => handleNavigate('wawasan-asesmen')}
                onNavigateQuestionBank={() => handleNavigate('bank-soal')}
                onNavigateCreativity={() => handleNavigate('ruang-kreativitas')}
              />
            )}

            {currentRoute === 'profil-pengembang' && (
              <DeveloperProfilePage
                onOpenLogin={onOpenLogin}
                onNavigateHome={() => handleNavigate('beranda')}
              />
            )}

            {currentRoute === 'privacy-policy' && (
              <PrivacyPolicyPage />
            )}

            {currentRoute === 'terms' && (
              <TermsOfServicePage />
            )}

            {currentRoute === 'about-contact' && (
              <AboutContactPage />
            )}
          </>
        )}
      </main>

      {/* 3. FOOTER E-E-A-T & KEPATUHAN ADSENSE */}
      <PublicFooter
        onNavigate={handleNavigate}
        onOpenLogin={onOpenLogin}
      />

    </div>
  );
};

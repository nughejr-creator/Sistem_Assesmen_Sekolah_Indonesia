import React, { useState, useEffect } from 'react';
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

interface PublicLayoutProps {
  initialRoute?: PublicNavRoute;
  onOpenLogin: (tab: 'student' | 'officer', quickToken?: string) => void;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({
  initialRoute = 'beranda',
  onOpenLogin
}) => {
  // Sync router with window.location.hash if present
  const getRouteFromHash = (): PublicNavRoute => {
    try {
      const hash = window.location.hash.replace(/^#\/?/, '');
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
      if (validRoutes.includes(hash as PublicNavRoute)) {
        return hash as PublicNavRoute;
      }
    } catch (e) {}
    return initialRoute;
  };

  const [currentRoute, setCurrentRoute] = useState<PublicNavRoute>(getRouteFromHash);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(getRouteFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (route: PublicNavRoute) => {
    setCurrentRoute(route);
    try {
      window.location.hash = `#/${route}`;
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-brand-500 selection:text-white">
      
      {/* 1. TOP PUBLIC NAVBAR (Maksimal 4 Menu & CTA CBT Menonjol) */}
      <PublicNavbar
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onOpenLogin={onOpenLogin}
      />

      {/* 2. MAIN CONTENT OUTLET (Isolasi Modular per Halaman) */}
      <main className="flex-1">
        {currentRoute === 'beranda' && (
          <LandingHomeBody 
            onOpenLogin={onOpenLogin}
            onNavigateInsights={() => handleNavigate('wawasan-asesmen')}
            onNavigateQuestionBank={() => handleNavigate('bank-soal')}
            onNavigateCreativity={() => handleNavigate('ruang-kreativitas')}
          />
        )}

        {currentRoute === 'wawasan-asesmen' && (
          <AssessmentInsightsPage
            onOpenLogin={onOpenLogin}
            onNavigateCreativity={() => handleNavigate('ruang-kreativitas')}
          />
        )}

        {currentRoute === 'bank-soal' && (
          <QuestionBankHubPage
            onOpenLogin={onOpenLogin}
            onNavigateCreativity={() => handleNavigate('ruang-kreativitas')}
          />
        )}

        {currentRoute === 'ruang-kreativitas' && (
          <TeacherCreativityHubPage
            onOpenLogin={onOpenLogin}
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
      </main>

      {/* 3. FOOTER E-E-A-T & KEPATUHAN ADSENSE */}
      <PublicFooter
        onNavigate={handleNavigate}
        onOpenLogin={onOpenLogin}
      />

    </div>
  );
};

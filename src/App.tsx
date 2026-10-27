import React, { useState, useEffect } from 'react';
import { UserProfile } from './types/database';
import { MOCK_USERS } from './lib/mockData';
import { supabase } from './lib/supabase';
import { initClusterNodesFromCloud } from './lib/clusterManager';
import { DualTabLoginGate } from './components/auth/DualTabLoginGate';
import { NetworkStatusIndicator } from './components/common/NetworkStatusIndicator';
import { ProctorPortalLayout } from './components/proctor/ProctorPortalLayout';
import { TeacherPortalLayout } from './components/teacher/TeacherPortalLayout';
import { AdminPortalLayout } from './components/admin/AdminPortalLayout';
import { CbtExamArena } from './components/cbt/CbtExamArena';
import { LandingPage } from './components/landing/LandingPage';

export const App: React.FC = () => {
  // Current user state: Hanya aktif jika ada data sesi login yang valid di localStorage
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('sasi_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'assistant_admin') {
          let inst = parsed.institution;
          if (parsed.exam_card_password?.startsWith('ASST:')) {
            inst = parsed.exam_card_password.replace('ASST:', '');
          }
          const sanitized = {
            ...parsed,
            institution: inst || 'Dinas Pendidikan (Pengawas Sekolah)',
            school: undefined,
            school_id: null
          };
          try { localStorage.setItem('sasi_current_user', JSON.stringify(sanitized)); } catch (e) {}
          return sanitized;
        }
        return parsed;
      }
    } catch (e) {}
    return null;
  });

  // Mode tampilan gerbang awal: 'landing' (Beranda Utama Publik) atau 'login' (Dual Tab Gate)
  const [publicViewMode, setPublicViewMode] = useState<'landing' | 'login'>('landing');
  const [loginInitialTab, setLoginInitialTab] = useState<'student' | 'officer'>('student');

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [initialExamToken, setInitialExamToken] = useState<string>('SASI26');

  // Load konfigurasi node kluster dari Cloud saat aplikasi dimuat pertama kali
  useEffect(() => {
    initClusterNodesFromCloud();
  }, []);

  // Handle open login from Landing Page (Siswa CBT atau Petugas)
  const handleOpenLogin = (tab: 'student' | 'officer', quickToken?: string) => {
    setLoginInitialTab(tab);
    if (quickToken) {
      setInitialExamToken(quickToken);
    }
    setPublicViewMode('login');
  };

  // Handle successful login from Dual-Tab Gate
  const handleLoginSuccess = (user: UserProfile, token?: string) => {
    let asstInst = user.institution;
    if (user.exam_card_password?.startsWith('ASST:')) {
      asstInst = user.exam_card_password.replace('ASST:', '');
    }
    const finalUser = user.role === 'assistant_admin'
      ? { ...user, institution: asstInst || 'Dinas Pendidikan (Pengawas Sekolah)', school: undefined, school_id: null }
      : user;
    setCurrentUser(finalUser);
    try {
      localStorage.setItem('sasi_current_user', JSON.stringify(finalUser));
    } catch (e) {}
    if (token) setInitialExamToken(token);
    if (finalUser.role === 'proctor') {
      setActiveTab('live-monitoring');
    } else {
      setActiveTab('dashboard');
    }
  };

  // Handle user logout (kembali ke Landing Page dan bersihkan sesi)
  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('sasi_current_user');
      sessionStorage.clear();
    } catch (e) {}
    try {
      supabase.auth.signOut();
    } catch (e) {}
    setPublicViewMode('landing');
    setActiveTab('dashboard');
  };

  // Switch role directly from the top bar switcher (Localhost role simulation)
  const handleSelectUser = (user: UserProfile) => {
    let asstInst = user.institution;
    if (user.exam_card_password?.startsWith('ASST:')) {
      asstInst = user.exam_card_password.replace('ASST:', '');
    }
    const finalUser = user.role === 'assistant_admin'
      ? { ...user, institution: asstInst || 'Dinas Pendidikan (Pengawas Sekolah)', school: undefined, school_id: null }
      : user;
    setCurrentUser(finalUser);
    try {
      localStorage.setItem('sasi_current_user', JSON.stringify(finalUser));
    } catch (e) {}
    if (finalUser.role === 'proctor') {
      setActiveTab('live-monitoring');
    } else {
      setActiveTab('dashboard');
    }
  };

  // 1. If not logged in, render Landing Page by default or Login Gate when requested
  if (!currentUser) {
    if (publicViewMode === 'landing') {
      return (
        <div className="relative">
          <LandingPage onOpenLogin={handleOpenLogin} />
          <NetworkStatusIndicator />
        </div>
      );
    }

    return (
      <div className="relative">
        <DualTabLoginGate 
          onLoginSuccess={handleLoginSuccess}
          initialTab={loginInitialTab}
          initialToken={initialExamToken}
          onBackToLanding={() => setPublicViewMode('landing')}
        />
        <NetworkStatusIndicator />
      </div>
    );
  }

  // 2. If user is a student, direct them immediately to the CBT Exam Arena
  if (currentUser.role === 'student') {
    return (
      <div className="relative">
        <CbtExamArena
          student={currentUser}
          initialToken={initialExamToken}
          onLogout={handleLogout}
        />
        <NetworkStatusIndicator />
      </div>
    );
  }

  // 3. If user is a Proctor, open the dedicated Modern 3-Column CBT Portal!
  if (currentUser.role === 'proctor') {
    return (
      <div className="relative">
        <ProctorPortalLayout
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onLogout={handleLogout}
        />
        <NetworkStatusIndicator />
      </div>
    );
  }

  // 3.5. If user is a Teacher / Pendidik, open the dedicated Modern 3-Column Teacher Portal!
  if (currentUser.role === 'teacher') {
    return (
      <div className="relative">
        <TeacherPortalLayout
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onLogout={handleLogout}
        />
        <NetworkStatusIndicator />
      </div>
    );
  }

  // 4. For Administrators (Super Admin & Assistant Admin) - Adopt Modern 3-Column Portal:
  return (
    <div className="relative">
      <AdminPortalLayout
        currentUser={currentUser}
        initialTab={activeTab}
        onSelectUser={handleSelectUser}
        onLogout={handleLogout}
      />
      <NetworkStatusIndicator />
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { UserProfile, School } from '../../types/database';
import { MOCK_SCHOOLS } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { toValidUUID } from '../../lib/syncHelper';
import { StudentLiveMonitoringTable } from './StudentLiveMonitoringTable';
import { UserManagement } from '../users/UserManagement';
import { SchoolProfileView } from './SchoolProfileView';
import { TeacherManagementView } from './TeacherManagementView';
import { ProctorSupervisorView } from './ProctorSupervisorView';
import { ProctorAttendanceView } from './ProctorAttendanceView';
import { ExamBapView } from './ExamBapView';
import { ExamScoreRecapView } from './ExamScoreRecapView';
import { UserProfileMenu } from '../common/RoleSwitcher';
import {
  Activity,
  ClipboardCheck,
  Building2,
  GraduationCap,
  Users,
  UserCheck,
  FileText,
  BarChart3,
  Printer,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  Radio,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Sparkles,
  School as SchoolIcon
} from 'lucide-react';

interface ProctorPortalLayoutProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onSelectUser?: (user: UserProfile) => void;
}

export type ProctorTab =
  | 'live-monitoring'
  | 'presence'
  | 'bap'
  | 'school-profile'
  | 'teachers'
  | 'students'
  | 'supervisors'
  | 'grades'
  | 'print-reports';

export const ProctorPortalLayout: React.FC<ProctorPortalLayoutProps> = ({
  currentUser,
  onLogout,
  onSelectUser
}) => {
  // Resolusi data sekolah proktor aktual dari database Supabase
  const [school, setSchool] = useState<School>(() => {
    if (currentUser.school) return currentUser.school;
    try {
      const cached = localStorage.getItem('sasi_schools_cache');
      if (cached) {
        const list: School[] = JSON.parse(cached);
        const targetId = currentUser.school_id ? toValidUUID(currentUser.school_id) : null;
        const found = list.find(s => s.id === currentUser.school_id || (targetId && toValidUUID(s.id) === targetId));
        if (found) return found;
      }
    } catch (e) {}
    return currentUser.school || MOCK_SCHOOLS[0];
  });

  useEffect(() => {
    if (!currentUser.school_id) return;
    let isMounted = true;
    const loadRealSchool = async () => {
      try {
        const validId = toValidUUID(currentUser.school_id);
        const { data } = await supabase
          .from('schools')
          .select('*')
          .eq('id', validId)
          .maybeSingle();
        if (data && isMounted) {
          setSchool(data);
        }
      } catch (e) {}
    };
    loadRealSchool();
    return () => { isMounted = false; };
  }, [currentUser.school_id]);

  const [activeTab, setActiveTab] = useState<ProctorTab>('live-monitoring');

  // Sidebar & Right Panel Visibility States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Live Digital Clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Nav Menu Groups
  const navigationGroups = [
    {
      groupTitle: 'PELAKSANAAN CBT',
      items: [
        {
          id: 'live-monitoring' as ProctorTab,
          label: 'Live Monitoring & Sesi',
          icon: Activity,
          badge: 'Live',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        },
        {
          id: 'presence' as ProctorTab,
          label: 'Daftar Hadir Tes',
          icon: ClipboardCheck
        }
      ]
    },
    {
      groupTitle: 'DATA SEKOLAH & SDM',
      items: [
        {
          id: 'school-profile' as ProctorTab,
          label: 'Profil Sekolah',
          icon: Building2
        },
        {
          id: 'teachers' as ProctorTab,
          label: 'Data Guru & Wali Kelas',
          icon: GraduationCap
        },
        {
          id: 'students' as ProctorTab,
          label: 'Data Siswa & Kartu',
          icon: Users
        },
        {
          id: 'supervisors' as ProctorTab,
          label: 'Pengawas Ruang',
          icon: UserCheck
        }
      ]
    },
    {
      groupTitle: 'DOKUMEN & NILAI',
      items: [
        {
          id: 'bap' as ProctorTab,
          label: 'Berita Acara Ujian (BAP)',
          icon: FileText
        },
        {
          id: 'grades' as ProctorTab,
          label: 'Rekap Nilai Siswa',
          icon: BarChart3
        },
        {
          id: 'print-reports' as ProctorTab,
          label: 'Cetak Nilai & Leger',
          icon: Printer
        }
      ]
    }
  ];

  const getActiveTabTitle = () => {
    for (const group of navigationGroups) {
      const found = group.items.find(item => item.id === activeTab);
      if (found) return found.label;
    }
    return 'Dashboard Proktor';
  };

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col font-sans text-slate-800">
      
      {/* 1. TOP HEADER BAR */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
        <div className="px-4 py-2.5 flex items-center justify-between gap-4">
          
          {/* Left Side: Brand Logo + Sidebar Toggle */}
          <div className="flex items-center space-x-3">
            {/* Mobile Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              title="Buka Menu"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop Sidebar Collapse Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title={isSidebarOpen ? 'Perkecil Menu' : 'Perluas Menu'}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Application Brand */}
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-white p-1 border border-slate-700/80 shadow-md ring-1 ring-sky-500/20 flex items-center justify-center overflow-hidden shrink-0">
                <img 
                  src="/sasipedia-icon.png" 
                  alt="SASIPEDIA" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-black text-sm tracking-tight text-white">SASIPEDIA</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-slate-950 uppercase">
                    Proktor
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[320px]">
                  {school.name} • NPSN: {school.npsn}
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Active Breadcrumb */}
          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Portal Proktor</span>
            <span className="text-slate-600">/</span>
            <span className="font-bold text-brand-300 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
              {getActiveTabTitle()}
            </span>
          </div>

          {/* Right Side: Quick Realtime Badge + Panel Toggle + Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Aktif</span>
            </div>

            {/* User Profile & Password Modal Menu */}
            <div className="hidden sm:block">
              <UserProfileMenu currentUser={currentUser} onSelectUser={onSelectUser} onLogout={onLogout} />
            </div>

            {/* Toggle Right Widget Panel Button */}
            <button
              type="button"
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className={`hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isRightPanelOpen
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-brand-600/30 text-brand-300 border-brand-500/50 hover:bg-brand-600/50'
              }`}
              title={isRightPanelOpen ? 'Sembunyikan Panel Kanan' : 'Tampilkan Panel Kanan'}
            >
              {isRightPanelOpen ? (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Layar Lebar</span>
                </>
              ) : (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Panel Kanan</span>
                </>
              )}
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title="Keluar dari Portal Proktor"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN 3-COLUMN WRAPPER */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* ============================================================== */}
        {/* KOLOM 1: LEFT SIDEBAR NAVIGATION                              */}
        {/* ============================================================== */}
        
        {/* Backdrop for Mobile */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
          />
        )}

        <aside
          className={`
            fixed lg:static top-[53px] bottom-0 left-0 z-30
            bg-slate-900 border-r border-slate-800 text-slate-300
            transition-all duration-300 ease-in-out flex flex-col justify-between
            ${isSidebarOpen ? 'w-64' : 'w-20'}
            ${isMobileSidebarOpen ? 'translate-x-0 !w-64' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Scrollable Menu Items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            
            {/* User Profile Card (Sidebar Top) */}
            <div className={`bg-slate-800/80 rounded-xl p-3 border border-slate-700/80 transition-all ${
              !isSidebarOpen && !isMobileSidebarOpen ? 'text-center p-2' : ''
            }`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow shrink-0">
                  {currentUser.full_name?.charAt(0) || 'P'}
                </div>
                {(isSidebarOpen || isMobileSidebarOpen) && (
                  <div className="overflow-hidden">
                    <div className="font-extrabold text-xs text-white truncate" title={currentUser.full_name}>
                      {currentUser.full_name}
                    </div>
                    <div className="text-[10px] text-brand-300 font-semibold flex items-center space-x-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Proktor Aktif</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {school.level} • {school.name}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Groups */}
            {navigationGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {(isSidebarOpen || isMobileSidebarOpen) ? (
                  <div className="px-2 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                    {group.groupTitle}
                  </div>
                ) : (
                  <div className="h-2 border-t border-slate-800 my-2" />
                )}

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full flex items-center rounded-xl transition-all font-semibold text-xs ${
                          isSidebarOpen || isMobileSidebarOpen ? 'px-3 py-2.5' : 'p-2.5 justify-center'
                        } ${
                          isActive
                            ? 'bg-brand-600 text-white shadow-md font-bold'
                            : 'hover:bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                        title={item.label}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        
                        {(isSidebarOpen || isMobileSidebarOpen) && (
                          <div className="flex-1 ml-3 flex items-center justify-between overflow-hidden text-left">
                            <span className="truncate">{item.label}</span>
                            {item.badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                {item.badge}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800 text-slate-400 text-[10px]">
            {(isSidebarOpen || isMobileSidebarOpen) ? (
              <div className="flex items-center justify-between">
                <span>SASI Versi 2.0</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                  Online
                </span>
              </div>
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto" title="Status: Online" />
            )}
          </div>
        </aside>

        {/* ============================================================== */}
        {/* KOLOM 2: TENGAH - MAIN WORKSPACE DENGAN KONTEN DINAMIS          */}
        {/* ============================================================== */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          <div className="max-w-[1600px] mx-auto space-y-6">
            
            {/* 1. Tab: Live Monitoring CBT Arena */}
            {activeTab === 'live-monitoring' && (
              <StudentLiveMonitoringTable proctorUser={currentUser} school={school} />
            )}

            {/* 2. Tab: Daftar Hadir Tes */}
            {activeTab === 'presence' && (
              <ProctorAttendanceView school={school} />
            )}

            {/* 3. Tab: Profil Sekolah */}
            {activeTab === 'school-profile' && (
              <SchoolProfileView school={school} />
            )}

            {/* 4. Tab: Data Guru & Wali Kelas */}
            {activeTab === 'teachers' && (
              <TeacherManagementView school={school} />
            )}

            {/* 5. Tab: Data Siswa & Kartu Ujian */}
            {activeTab === 'students' && (
              <UserManagement currentUser={currentUser} />
            )}

            {/* 6. Tab: Pengawas Ruang Ujian */}
            {activeTab === 'supervisors' && (
              <ProctorSupervisorView school={school} />
            )}

            {/* 7. Tab: Berita Acara Ujian (BAP) */}
            {activeTab === 'bap' && (
              <ExamBapView school={school} proctorUser={currentUser} />
            )}

            {/* 8. Tab: Rekap Nilai Siswa */}
            {activeTab === 'grades' && (
              <ExamScoreRecapView school={school} />
            )}

            {/* 9. Tab: Cetak Nilai & Leger */}
            {activeTab === 'print-reports' && (
              <ExamScoreRecapView school={school} defaultPrintMode={true} />
            )}

          </div>
        </main>

        {/* ============================================================== */}
        {/* KOLOM 3: WIDGET KANAN (CONTEXTUAL INFO BAR)                    */}
        {/* ============================================================== */}
        {isRightPanelOpen && (
          <aside className="hidden xl:flex flex-col w-72 bg-white border-l border-slate-200 p-4 space-y-4 shrink-0 overflow-y-auto shadow-xs">
            
            {/* 1. Live Digital Clock Widget */}
            <div className="bg-gradient-to-br from-slate-900 to-brand-950 text-white rounded-2xl p-4 shadow-md text-center border border-slate-800">
              <div className="flex items-center justify-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>Waktu Server CBT</span>
              </div>
              <div className="text-3xl font-mono font-black text-amber-300 tracking-wider">
                {formatTime(currentDateTime)}
              </div>
              <div className="text-[11px] text-slate-300 font-medium mt-1 flex items-center justify-center space-x-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>{formatDate(currentDateTime)}</span>
              </div>
            </div>

            {/* 2. Identity Card Proktor */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md border-2 border-white">
                {currentUser.full_name?.charAt(0) || 'P'}
              </div>
              
              <div className="mt-3">
                <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                  {currentUser.full_name}
                </h4>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-800 border border-brand-200">
                  Proktor Ruangan
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-left space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">
                    {currentUser.username?.includes('@') ? 'Email Login Proktor:' : 'Username / NIP:'}
                  </span>
                  <span className="font-mono font-bold text-slate-800 break-all">{currentUser.username}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Sekolah Asesmen:</span>
                  <span className="font-semibold text-slate-800">{school.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">NPSN / Jenjang:</span>
                  <span className="font-mono text-slate-700">{school.npsn} ({school.level})</span>
                </div>
              </div>
            </div>

            {/* 3. Status Koneksi & Database Widget */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between">
                <span>Status Infrastruktur</span>
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              </div>
              
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Supabase Cloud</span>
                  <span className="text-emerald-700 font-bold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Terhubung</span>
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Realtime Channel</span>
                  <span className="text-emerald-700 font-bold">Aktif (45s Poll - ANBK)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Mode Proteksi</span>
                  <span className="text-brand-700 font-bold">Single Attempt</span>
                </div>
              </div>
            </div>

            {/* 4. Quick Help Box */}
            <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-brand-900 text-xs">
              <div className="flex items-center space-x-1.5 font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span>Bantuan Proktor</span>
              </div>
              <p className="text-[11px] text-brand-700 leading-relaxed">
                Gunakan menu <strong>Live Monitoring</strong> untuk memantau status login, token aktif, dan sisa waktu ujian siswa.
              </p>
            </div>

          </aside>
        )}

      </div>

    </div>
  );
};

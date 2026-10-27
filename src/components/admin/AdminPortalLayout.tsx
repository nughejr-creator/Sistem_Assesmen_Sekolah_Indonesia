import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types/database';
import { SuperAdminDashboard } from '../dashboards/SuperAdminDashboard';
import { AssistantAdminDashboard } from '../dashboards/AssistantAdminDashboard';
import { UserManagement } from '../users/UserManagement';
import { SchoolManagement } from '../schools/SchoolManagement';
import { SubjectManagement } from '../subjects/SubjectManagement';
import { BlueprintMatrix } from '../kisi-kisi/BlueprintMatrix';
import { ExamAssembly } from '../exam/ExamAssembly';
import { WriterAssignmentManager } from '../assignment/WriterAssignmentManager';
import { DatabaseClusterManager } from './DatabaseClusterManager';
import { AdminPortalManager } from './portal/AdminPortalManager';
import { RoleSwitcher } from '../common/RoleSwitcher';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  FileSpreadsheet,
  Package,
  Clock,
  Calendar,
  Menu,
  X,
  LogOut,
  Maximize2,
  Minimize2,
  Sparkles,
  ShieldCheck,
  Radio,
  CheckCircle2,
  Database,
  UserCheck,
  ChevronDown,
  Globe
} from 'lucide-react';

interface AdminPortalLayoutProps {
  currentUser: UserProfile;
  initialTab?: string;
  onSelectUser?: (user: UserProfile) => void;
  onLogout: () => void;
}

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'schools'
  | 'subjects'
  | 'writer-assignments'
  | 'kisi-kisi'
  | 'exam-assembly'
  | 'database-clusters'
  | 'portal-manager';

export const AdminPortalLayout: React.FC<AdminPortalLayoutProps> = ({
  currentUser,
  initialTab = 'dashboard',
  onSelectUser,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>((initialTab as AdminTab) || 'dashboard');

  // Sidebar & Right Panel Visibility States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Sub-Navigation State for Kisi-Kisi & Bank Soal
  const [kisiKisiSubMode, setKisiKisiSubMode] = useState<'kisi-kisi' | 'penulisan' | 'bank-soal'>('kisi-kisi');
  const [isKisiKisiOpen, setIsKisiKisiOpen] = useState(initialTab === 'kisi-kisi');

  const kisiKisiSubMenuItems = [
    { id: 'kisi-kisi' as const, label: 'Pemetaan Kisi-Kisi' },
    { id: 'penulisan' as const, label: 'Penulisan Soal' },
    { id: 'bank-soal' as const, label: 'Bank Soal Terbit' },
  ];

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

  // Menu Groups for Admin
  const navigationGroups = [
    {
      groupTitle: 'IKHTISAR & MONITORING',
      items: [
        {
          id: 'dashboard' as AdminTab,
          label: 'Dashboard Ikhtisar',
          icon: LayoutDashboard,
          badge: 'Utama',
          badgeColor: 'bg-brand-500/20 text-brand-300 border-brand-500/30'
        }
      ]
    },
    {
      groupTitle: 'PENGGUNA & LEMBAGA',
      items: [
        ...(currentUser.role === 'super_admin' ? [
          {
            id: 'schools' as AdminTab,
            label: 'Kelola Sekolah',
            icon: Building2,
          }
        ] : []),
        {
          id: 'users' as AdminTab,
          label: 'Atur Pengguna',
          icon: Users,
        }
      ]
    },
    {
      groupTitle: 'BANK SOAL & KURIKULUM',
      items: [
        ...(currentUser.role === 'super_admin' ? [
          {
            id: 'subjects' as AdminTab,
            label: 'Mata Pelajaran & Fase',
            icon: BookOpen,
          },
          {
            id: 'writer-assignments' as AdminTab,
            label: 'Penugasan Penulis Soal',
            icon: UserCheck,
            badge: 'Multi-Paket',
            badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
          }
        ] : []),
        {
          id: 'kisi-kisi' as AdminTab,
          label: 'Kisi-Kisi & Bank Soal',
          icon: FileSpreadsheet,
        },
        {
          id: 'exam-assembly' as AdminTab,
          label: 'Perakitan Paket Ujian',
          icon: Package,
        }
      ]
    },
    ...(currentUser.role === 'super_admin' ? [
      {
        groupTitle: 'KONTEN & ZONA PUBLIK',
        items: [
          {
            id: 'portal-manager' as AdminTab,
            label: 'Manajer Portal Publik (CMS)',
            icon: Globe,
            badge: 'CMS Publik',
            badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          }
        ]
      },
      {
        groupTitle: 'INFRASTRUKTUR & SERVER',
        items: [
          {
            id: 'database-clusters' as AdminTab,
            label: 'Kluster Multi-Database',
            icon: Database,
            badge: 'Sharding',
            badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
          }
        ]
      }
    ] : [])
  ];

  const getActiveTabTitle = () => {
    for (const group of navigationGroups) {
      const found = group.items.find(item => item.id === activeTab);
      if (found) return found.label;
    }
    return 'Dashboard Administrator';
  };

  const isSuperAdmin = currentUser.role === 'super_admin';

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
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold text-white uppercase shadow-2xs ${
                    isSuperAdmin ? 'bg-purple-600' : 'bg-blue-600'
                  }`}>
                    {isSuperAdmin ? 'Super Admin' : 'Asisten Admin'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-[320px]">
                  Pusat Asesmen dan Kurikulum • sasipedia.my.id
                </div>
              </div>
            </div>
          </div>

          {/* Middle: Active Breadcrumb */}
          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Portal Administrasi</span>
            <span className="text-slate-600">/</span>
            <span className="font-bold text-brand-300 bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700">
              {getActiveTabTitle()}
            </span>
          </div>

          {/* Right Side: Quick Realtime Badge + Role Switcher + Panel Toggle + Logout */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Aktif</span>
            </div>

            {/* Simulation Role Switcher Dropdown */}
            {onSelectUser && (
              <div className="hidden sm:block">
                <RoleSwitcher currentUser={currentUser} onSelectUser={onSelectUser} onLogout={onLogout} />
              </div>
            )}

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
              title="Keluar dari Portal Administrasi"
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow shrink-0 ${
                  isSuperAdmin ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-gradient-to-br from-blue-600 to-cyan-600'
                }`}>
                  {currentUser.full_name?.charAt(0) || 'A'}
                </div>
                {(isSidebarOpen || isMobileSidebarOpen) && (
                  <div className="overflow-hidden">
                    <div className="font-extrabold text-xs text-white truncate" title={currentUser.full_name}>
                      {currentUser.full_name}
                    </div>
                    <div className="text-[10px] text-brand-300 font-semibold flex items-center space-x-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{isSuperAdmin ? 'Super Admin' : 'Asisten Admin'}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {currentUser.email || currentUser.username}
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
                    const isKisiKisi = item.id === 'kisi-kisi';

                    return (
                      <div key={item.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (isKisiKisi) {
                              if (activeTab === 'kisi-kisi') {
                                setIsKisiKisiOpen(!isKisiKisiOpen);
                              } else {
                                setActiveTab('kisi-kisi');
                                setIsKisiKisiOpen(true);
                              }
                            } else {
                              setActiveTab(item.id);
                            }
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
                              {isKisiKisi ? (
                                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isKisiKisiOpen ? 'rotate-180 text-white' : ''}`} />
                              ) : item.badge ? (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                  {item.badge}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </button>

                        {/* Sub Menu: Pemetaan Kisi-Kisi, Penulisan Soal, Bank Soal Terbit */}
                        {isKisiKisi && isKisiKisiOpen && (isSidebarOpen || isMobileSidebarOpen) && (
                          <div className="ml-5 pl-2.5 border-l-2 border-slate-800 space-y-1 py-1 animate-fade-in">
                            {kisiKisiSubMenuItems.map((sub) => {
                              const isSubActive = activeTab === 'kisi-kisi' && kisiKisiSubMode === sub.id;
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => {
                                    setActiveTab('kisi-kisi');
                                    setKisiKisiSubMode(sub.id);
                                    setIsMobileSidebarOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-2 ${
                                    isSubActive
                                      ? 'bg-brand-500/25 text-brand-300 font-bold border border-brand-400/30 shadow-xs'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                  }`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-brand-400' : 'bg-slate-600'}`} />
                                  <span className="truncate">{sub.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
            
            {/* 1. Dashboard Ikhtisar */}
            {activeTab === 'dashboard' && (
              isSuperAdmin ? (
                <SuperAdminDashboard
                  currentUser={currentUser}
                  onNavigateToKisiKisi={() => setActiveTab('kisi-kisi')}
                />
              ) : (
                <AssistantAdminDashboard
                  currentUser={currentUser}
                  onNavigateToKisiKisi={() => setActiveTab('kisi-kisi')}
                  onNavigateToExamAssembly={() => setActiveTab('exam-assembly')}
                  onNavigateToUsers={() => setActiveTab('users')}
                />
              )
            )}

            {/* 2. Atur Pengguna */}
            {activeTab === 'users' && (
              <UserManagement currentUser={currentUser} />
            )}

            {/* 3. Kelola Sekolah (Super Admin) */}
            {activeTab === 'schools' && isSuperAdmin && (
              <SchoolManagement />
            )}

            {/* 4. Mata Pelajaran (Super Admin) */}
            {activeTab === 'subjects' && isSuperAdmin && (
              <SubjectManagement />
            )}

            {/* 4.5. Penugasan Penulis Soal (Super Admin) */}
            {activeTab === 'writer-assignments' && isSuperAdmin && (
              <WriterAssignmentManager currentUser={currentUser} />
            )}

            {/* 5. Kisi-Kisi & Bank Soal */}
            {activeTab === 'kisi-kisi' && (
              <BlueprintMatrix 
                currentUser={currentUser} 
                activeSubModeProp={kisiKisiSubMode}
                onSubModeChange={setKisiKisiSubMode}
              />
            )}

            {/* 6. Perakitan Paket Ujian */}
            {activeTab === 'exam-assembly' && (
              <ExamAssembly currentUser={currentUser} />
            )}

            {/* 7. Manajemen Kluster Multi-Database (Super Admin) */}
            {activeTab === 'database-clusters' && isSuperAdmin && (
              <DatabaseClusterManager currentUser={currentUser} />
            )}

            {/* 8. Manajer Portal Publik CMS (Super Admin) */}
            {activeTab === 'portal-manager' && isSuperAdmin && (
              <AdminPortalManager currentUser={currentUser} />
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

            {/* 2. Identity Card Admin */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center relative overflow-hidden">
              <div className={`w-16 h-16 rounded-full text-white font-black text-xl flex items-center justify-center mx-auto shadow-md border-2 border-white ${
                isSuperAdmin ? 'bg-gradient-to-tr from-purple-600 to-indigo-600' : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
              }`}>
                {currentUser.full_name?.charAt(0) || 'A'}
              </div>
              
              <div className="mt-3">
                <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                  {currentUser.full_name}
                </h4>
                <div className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isSuperAdmin
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                }`}>
                  {isSuperAdmin ? 'Super Admin Pusat' : 'Asisten Super Admin'}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-left space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Instansi / Naungan:</span>
                  <span className="font-extrabold text-blue-900 block truncate" title={currentUser.institution || (currentUser.exam_card_password?.startsWith('ASST:') ? currentUser.exam_card_password.replace('ASST:', '') : (currentUser.role === 'assistant_admin' ? 'Dinas Pendidikan (Pengawas Sekolah)' : 'Pusat / Super Admin'))}>
                    {currentUser.role === 'assistant_admin' 
                      ? (currentUser.institution || (currentUser.exam_card_password?.startsWith('ASST:') ? currentUser.exam_card_password.replace('ASST:', '') : 'Dinas Pendidikan (Pengawas Sekolah)')) 
                      : (currentUser.role === 'super_admin' ? 'Pusat / Super Admin' : (currentUser.school?.name || '-'))}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Username:</span>
                  <span className="font-mono font-bold text-slate-800">{currentUser.username}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Email Terdaftar:</span>
                  <span className="font-semibold text-slate-800 truncate block">{currentUser.email || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Cakupan Hak Akses:</span>
                  <span className="font-semibold text-slate-700">
                    {isSuperAdmin ? 'Akses Penuh Seluruh Lembaga' : 'Supervisi Soal & Pengguna'}
                  </span>
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
                  <span className="text-slate-500">Database Engine</span>
                  <span className="text-brand-700 font-bold">PostgreSQL RLS</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Keamanan Sesi</span>
                  <span className="text-purple-700 font-bold">Role-Based Gate</span>
                </div>
              </div>

              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('database-clusters')}
                  className="w-full mt-2 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-colors border border-indigo-200"
                >
                  <Database className="w-3 h-3 text-indigo-600" />
                  <span>Kelola Kluster Multi-DB</span>
                </button>
              )}
            </div>

            {/* 4. Quick Help Box */}
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs">
              <div className="flex items-center space-x-1.5 font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Pusat Kendali</span>
              </div>
              <p className="text-[11px] text-purple-700 leading-relaxed">
                Gunakan tab <strong>Kisi-Kisi & Soal</strong> untuk menyusun naskah asesmen, serta <strong>Paket Ujian</strong> untuk merakit soal yang siap diujikan di sekolah.
              </p>
            </div>

          </aside>
        )}

      </div>

    </div>
  );
};

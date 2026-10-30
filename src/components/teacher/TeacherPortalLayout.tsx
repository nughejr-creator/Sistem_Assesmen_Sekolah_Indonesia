import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, School, QuestionWriterAssignment } from '../../types/database';
import { MOCK_SCHOOLS, MOCK_WRITER_ASSIGNMENTS } from '../../lib/mockData';
import { isAssignmentArchived } from '../../lib/archiveHelper';
import { RoleSwitcher } from '../common/RoleSwitcher';
import { TeacherDashboardView } from './TeacherDashboardView';
import { TeacherGradingWorkspace } from './TeacherGradingWorkspace';
import { TeacherSubjectLedgerView } from './TeacherSubjectLedgerView';
import { BlueprintMatrix } from '../kisi-kisi/BlueprintMatrix';
import { ExamAssembly } from '../exam/ExamAssembly';
import { checkIsGuruKelas } from '../../lib/teacherScope';
import { toValidUUID, fetchWriterAssignmentsFromCloud, deduplicateWriterAssignments } from '../../lib/syncHelper';
import { 
  Award, 
  LayoutDashboard, 
  Edit3, 
  FileSpreadsheet, 
  Printer, 
  LogOut, 
  Menu, 
  X, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Calendar, 
  GraduationCap, 
  Sparkles,
  Layers,
  HelpCircle,
  Building2,
  CheckCircle2,
  PenTool,
  AlertTriangle,
  AlertCircle,
  Package,
  BookOpen,
  ArrowRight,
  Lock,
  ChevronDown
} from 'lucide-react';

export type TeacherTab = 'dashboard' | 'grading' | 'ledger' | 'print' | 'writer-tasks' | 'kisi-kisi' | 'exam-assembly';

interface TeacherPortalLayoutProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onSelectUser?: (user: UserProfile) => void;
}

export const TeacherPortalLayout: React.FC<TeacherPortalLayoutProps> = ({
  currentUser,
  onLogout,
  onSelectUser
}) => {
  // 1. Load assignments for this teacher
  const [writerAssignments, setWriterAssignments] = useState<QuestionWriterAssignment[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_writer_assignments_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = deduplicateWriterAssignments(parsed);
          if (cleaned.length > 0) return cleaned;
        }
      }
    } catch (e) {}
    return deduplicateWriterAssignments(MOCK_WRITER_ASSIGNMENTS);
  });

  // Realtime Cloud Synchronization for Writer Assignments (Clean & Deduplicated)
  useEffect(() => {
    let isMounted = true;
    const syncCloudAssignments = async () => {
      try {
        const cloudData = await fetchWriterAssignmentsFromCloud();
        if (cloudData && cloudData.length > 0 && isMounted) {
          setWriterAssignments(prev => {
            const merged = deduplicateWriterAssignments([...cloudData, ...prev]);
            try {
              localStorage.setItem('sasi_writer_assignments_cache', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      } catch (err) {
        console.warn('Sync writer assignments warning:', err);
      }
    };
    syncCloudAssignments();

    const handleUpdate = () => syncCloudAssignments();
    window.addEventListener('sasi_assignments_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('sasi_assignments_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const myAssignments = useMemo(() => {
    const cleanStr = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const curId = currentUser.id || '';
    const curNormId = toValidUUID(curId);
    const curUsername = cleanStr(currentUser.username);
    const curName = cleanStr(currentUser.full_name);

    // Filter penugasan yang secara spesifik ditugaskan Super Admin untuk akun ini
    return writerAssignments.filter(a => {
      // Abaikan penugasan yang sudah diarsipkan
      if (isAssignmentArchived(a)) return false;

      // 1. Cocokkan ID langsung atau UUID
      if (a.user_id && (a.user_id === curId || toValidUUID(a.user_id) === curNormId)) return true;
      // 2. Cocokkan Email / Username
      if (a.user_email && curUsername && cleanStr(a.user_email) === curUsername) return true;
      // 3. Cocokkan Nama Lengkap Penulis
      const asgName = cleanStr(a.user_name);
      if (asgName && curName && (asgName.includes(curName) || curName.includes(asgName))) return true;
      return false;
    });
  }, [writerAssignments, currentUser]);

  // Deteksi cerdas apakah akun bertindak sebagai Penulis Naskah Soal Murni (Mitra Eksternal / Ahli / Non-Guru Kelas)
  const isDedicatedWriter = useMemo(() => {
    if (currentUser.teacher_type === 'penulis_soal') return true;
    
    const curId = currentUser.id || '';
    const curNormId = toValidUUID(curId);
    const cleanStr = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const curUsername = cleanStr(currentUser.username);
    const curName = cleanStr(currentUser.full_name);

    const matchedAssignment = writerAssignments.find(a => {
      if (a.user_id && (a.user_id === curId || toValidUUID(a.user_id) === curNormId)) return true;
      if (a.user_email && curUsername && cleanStr(a.user_email) === curUsername) return true;
      if (a.user_name && curName && (cleanStr(a.user_name).includes(curName) || curName.includes(cleanStr(a.user_name)))) return true;
      return false;
    });

    if (matchedAssignment?.user_type === 'mitra_eksternal') return true;
    if (matchedAssignment?.user_institution && !matchedAssignment.user_institution.toLowerCase().includes('sd') && !matchedAssignment.user_institution.toLowerCase().includes('smp')) {
      return true;
    }
    if (curName.includes('zyandru') || curUsername.includes('zyandru')) return true;
    if (myAssignments.length > 0 && (!currentUser.school_id || currentUser.school?.name?.toLowerCase().includes('mitra') || currentUser.school?.name?.toLowerCase().includes('universitas'))) {
      return true;
    }
    return false;
  }, [currentUser, writerAssignments, myAssignments]);

  const matchedAssignment = useMemo(() => {
    const curId = currentUser.id || '';
    const curNormId = toValidUUID(curId);
    const cleanStr = (s?: string | null) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const curUsername = cleanStr(currentUser.username);
    const curName = cleanStr(currentUser.full_name);

    return writerAssignments.find(a => {
      if (a.user_id && (a.user_id === curId || toValidUUID(a.user_id) === curNormId)) return true;
      if (a.user_email && curUsername && cleanStr(a.user_email) === curUsername) return true;
      if (a.user_name && curName && (cleanStr(a.user_name).includes(curName) || curName.includes(cleanStr(a.user_name)))) return true;
      return false;
    }) || myAssignments[0] || null;
  }, [currentUser, writerAssignments, myAssignments]);

  const [activeAssignment, setActiveAssignment] = useState<QuestionWriterAssignment | null>(() => {
    return myAssignments[0] || null;
  });

  // Track currently selected assessment type if assignment has multiple types (e.g. Formatif & SAS)
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>(() => {
    return myAssignments[0]?.assessment_types?.[0] || 'Formatif';
  });

  // Keep activeAssignment and selectedAssessmentType in sync with myAssignments
  useEffect(() => {
    if (myAssignments.length > 0) {
      if (!activeAssignment || !myAssignments.some(a => a.id === activeAssignment.id)) {
        setActiveAssignment(myAssignments[0]);
        setSelectedAssessmentType(myAssignments[0].assessment_types?.[0] || 'Formatif');
      }
    }
  }, [myAssignments, activeAssignment]);

  // Memoize authorScope so it retains stable reference across re-renders and clock ticks
  const authorScope = useMemo(() => {
    if (!activeAssignment) return undefined;
    const currentAssessment = selectedAssessmentType || activeAssignment.assessment_types?.[0] || 'Formatif';
    return {
      level: (activeAssignment.level || 'SD') as ('SD' | 'SMP'),
      grade: activeAssignment.grade_class,
      subject: activeAssignment.subject_name,
      assessment: currentAssessment,
      isLocked: true,
      targetQuestions: activeAssignment.target_questions || 5,
      assignment: activeAssignment
    };
  }, [
    activeAssignment?.id,
    activeAssignment?.level,
    activeAssignment?.grade_class,
    activeAssignment?.subject_name,
    activeAssignment?.target_questions,
    selectedAssessmentType,
    activeAssignment?.assessment_types
  ]);

  // Default tab: if author is dedicated writer, default to writer-tasks!
  const [activeTab, setActiveTab] = useState<TeacherTab>(() => {
    if (currentUser.teacher_type === 'penulis_soal' || currentUser.full_name?.toLowerCase().includes('zyandru') || currentUser.username?.toLowerCase().includes('zyandru') || myAssignments.length > 0) {
      return 'writer-tasks';
    }
    return 'dashboard';
  });

  // Proteksi navigasi: Penulis Murni tidak diarahkan ke dashboard penilaian guru
  useEffect(() => {
    if (isDedicatedWriter && (activeTab === 'dashboard' || activeTab === 'grading' || activeTab === 'ledger' || activeTab === 'print')) {
      setActiveTab('writer-tasks');
    }
  }, [isDedicatedWriter, activeTab]);

  // Sub-Navigation State for Kisi-Kisi & Bank Soal
  const [kisiKisiSubMode, setKisiKisiSubMode] = useState<'kisi-kisi' | 'penulisan' | 'bank-soal'>('kisi-kisi');
  const [isKisiKisiOpen, setIsKisiKisiOpen] = useState(false);

  const kisiKisiSubMenuItems = [
    { id: 'kisi-kisi' as const, label: 'Pemetaan Kisi-Kisi' },
    { id: 'penulisan' as const, label: 'Penulisan Soal' },
    { id: 'bank-soal' as const, label: 'Bank Soal Terbit' },
  ];

  // Auto-expand submenu when entering kisi-kisi
  useEffect(() => {
    if (activeTab === 'kisi-kisi') {
      setIsKisiKisiOpen(true);
    }
  }, [activeTab]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Live Server Clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const school: School = currentUser.school || MOCK_SCHOOLS[0];

  const isGuruKelas = checkIsGuruKelas(currentUser);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const menuGroups = isDedicatedWriter ? [
    {
      groupTitle: 'PENULISAN NASKAH SOAL',
      items: [
        {
          id: 'writer-tasks' as TeacherTab,
          label: 'Tugas Penulisan Soal',
          icon: PenTool,
          badge: myAssignments.length > 0 ? `${myAssignments.length} Paket` : 'Tersedia',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        },
        ...(activeAssignment ? [
          {
            id: 'kisi-kisi' as TeacherTab,
            label: `Kisi-Kisi (${activeAssignment.subject_name})`,
            icon: BookOpen,
            badge: 'Terkunci',
            badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
          },
          {
            id: 'exam-assembly' as TeacherTab,
            label: `Rakit Naskah (${activeAssignment.subject_name})`,
            icon: Package,
            badge: null
          }
        ] : [])
      ]
    }
  ] : [
    {
      groupTitle: 'PENILAIAN & EVALUASI',
      items: [
        {
          id: 'dashboard' as TeacherTab,
          label: 'Dashboard Pendidik',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'grading' as TeacherTab,
          label: 'Meja Koreksi Isian & Uraian',
          icon: Edit3,
          badge: 'Fokus Guru',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        },
        {
          id: 'ledger' as TeacherTab,
          label: 'Rekap & Leger Nilai Mapel',
          icon: FileSpreadsheet,
          badge: null
        },
        {
          id: 'print' as TeacherTab,
          label: 'Cetak Nilai & Leger (PDF)',
          icon: Printer,
          badge: null
        }
      ]
    },
    {
      groupTitle: 'PENULISAN NASKAH SOAL',
      items: [
        {
          id: 'writer-tasks' as TeacherTab,
          label: 'Tugas Penulisan Soal',
          icon: PenTool,
          badge: myAssignments.length > 0 ? `${myAssignments.length} Paket` : 'Tersedia',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        },
        ...(activeAssignment ? [
          {
            id: 'kisi-kisi' as TeacherTab,
            label: `Kisi-Kisi (${activeAssignment.subject_name})`,
            icon: BookOpen,
            badge: 'Terkunci',
            badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
          },
          {
            id: 'exam-assembly' as TeacherTab,
            label: `Rakit Naskah (${activeAssignment.subject_name})`,
            icon: Package,
            badge: null
          }
        ] : [])
      ]
    }
  ];

  const getActiveTabTitle = () => {
    for (const group of menuGroups) {
      const found = group.items.find(m => m.id === activeTab);
      if (found) return found.label;
    }
    return isDedicatedWriter ? 'Penulisan Naskah' : 'Portal Pendidik';
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans select-none overflow-hidden h-screen print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:block">
      
      {/* 1. TOP NAVBAR */}
      <header className="bg-slate-950 text-white border-b border-slate-800 px-4 py-2.5 shrink-0 z-40">
        <div className="flex items-center justify-between">
          
          {/* Left Brand Area */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileSidebarOpen(!isMobileSidebarOpen);
                } else {
                  setIsSidebarOpen(!isSidebarOpen);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

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
                  <span className="font-black text-sm tracking-wide text-white">SASIPEDIA</span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${isDedicatedWriter ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-amber-500 text-slate-950'}`}>
                    {isDedicatedWriter ? 'PENULIS NASKAH SOAL' : 'PENDIDIK / GURU'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isDedicatedWriter 
                    ? `${matchedAssignment?.user_institution || 'Universitas London'} • Penulis Naskah ${activeAssignment?.subject_name || 'Soal Asesmen'}`
                    : `${school.name} • ${isGuruKelas ? `Wali ${currentUser.grade_class || 'Kelas 2'} (Semua Mapel Kecuali PJOK & PAI)` : `Guru Mapel: ${currentUser.assigned_subject_name || 'PJOK'}`}`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Center Breadcrumbs */}
          <div className="hidden md:flex items-center space-x-2 text-xs">
            <span className="text-slate-400">{isDedicatedWriter ? 'Portal Penulis Naskah' : 'Portal Pendidik'}</span>
            <span className="text-slate-600">/</span>
            <span className={`font-bold ${isDedicatedWriter ? 'text-emerald-300' : 'text-amber-300'} bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-700`}>
              {getActiveTabTitle()}
            </span>
          </div>

          {/* Right Area */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Aktif</span>
            </div>

            {onSelectUser && (
              <div className="hidden sm:block">
                <RoleSwitcher currentUser={currentUser} onSelectUser={onSelectUser} onLogout={onLogout} />
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
              className={`hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                isRightPanelOpen
                  ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  : 'bg-amber-600/30 text-amber-300 border-amber-500/50 hover:bg-amber-600/50'
              }`}
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

            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN 3-COLUMN BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* KOLOM 1: LEFT SIDEBAR NAVIGATION */}
        {isMobileSidebarOpen && (
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-xs"
          />
        )}

        <aside
          className={`
            fixed lg:static top-[53px] bottom-0 left-0 z-30
            bg-slate-950 border-r border-slate-800
            transition-all duration-300 ease-in-out flex flex-col justify-between
            ${isSidebarOpen ? 'w-64' : 'w-16'}
            ${isMobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="p-3 space-y-4 overflow-y-auto">
            {menuGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isSidebarOpen ? group.groupTitle : '•••'}
                </div>

                {group.items.map(item => {
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
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
                          isActive
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title={item.label}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        
                        {isSidebarOpen && (
                          <div className="flex-1 text-left flex items-center justify-between">
                            <span className="truncate">{item.label}</span>
                            {isKisiKisi ? (
                              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isKisiKisiOpen ? 'rotate-180 text-white' : ''}`} />
                            ) : item.badge ? (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                                {item.badge}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </button>

                      {/* Sub Menu: Pemetaan Kisi-Kisi, Penulisan Soal, Bank Soal Terbit */}
                      {isKisiKisi && isKisiKisiOpen && isSidebarOpen && (
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
                                    ? 'bg-amber-500/25 text-amber-200 font-bold border border-amber-400/30 shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-amber-400' : 'bg-slate-600'}`} />
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
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800 text-slate-400 text-[10px]">
            {isSidebarOpen ? (
              <div className="flex items-center justify-between">
                <span>SASI Versi 2.0 Pendidik</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                  Online
                </span>
              </div>
            ) : (
              <div className="w-2 h-2 rounded-full bg-emerald-400 mx-auto" />
            )}
          </div>
        </aside>

        {/* KOLOM 2: TENGAH - WORKSPACE UTAMA */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:p-0 print:m-0 print:block">
          <div className="max-w-[1600px] mx-auto space-y-6 print:space-y-0 print:max-w-none print:w-full print:m-0 print:p-0">
            
            {/* Header Banner Penugasan Aktif (Jika di tab Kisi-Kisi atau Rakit Naskah) */}
            {(activeTab === 'kisi-kisi' || activeTab === 'exam-assembly') && activeAssignment && (
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-3xl border border-indigo-800/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-brand-500/20 text-brand-300 border border-brand-500/30 flex items-center justify-center font-black shrink-0">
                    <Lock className="w-5 h-5 text-brand-300" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ruang Kerja Terkunci:</span>
                      <span className="text-sm font-black text-white">{activeAssignment.subject_name}</span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-white/10 text-brand-200 font-bold text-xs">
                        {activeAssignment.grade_class} (Fase {activeAssignment.phase})
                      </span>
                      <div className="flex items-center gap-1.5">
                        {activeAssignment.assessment_types.map(t => {
                          const isSel = (selectedAssessmentType || activeAssignment.assessment_types[0]) === t;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setSelectedAssessmentType(t)}
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-black transition-all ${
                                isSel
                                  ? 'bg-amber-400 text-slate-900 shadow-sm'
                                  : 'bg-purple-500/20 text-purple-200 border border-purple-400/30 hover:bg-purple-500/40'
                              }`}
                              title={activeAssignment.assessment_types.length > 1 ? `Klik untuk beralih paket ke ${t}` : undefined}
                            >
                              {t} {isSel && activeAssignment.assessment_types.length > 1 && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Anda sedang menyusun naskah khusus untuk paket tugas ini. Mapel lain otomatis terisolasi.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('writer-tasks')}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition shrink-0"
                >
                  <span>Daftar Paket Tugas ({myAssignments.length})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 1. Tab Dashboard */}
            {activeTab === 'dashboard' && (
              <TeacherDashboardView
                teacher={currentUser}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {/* 2. Tab Meja Koreksi Cepat Isian & Uraian */}
            {activeTab === 'grading' && (
              <TeacherGradingWorkspace teacher={currentUser} />
            )}

            {/* 3. Tab Rekap & Leger Nilai Mapel */}
            {activeTab === 'ledger' && (
              <TeacherSubjectLedgerView teacher={currentUser} />
            )}

            {/* 4. Tab Cetak Nilai & Leger PDF */}
            {activeTab === 'print' && (
              <TeacherSubjectLedgerView teacher={currentUser} defaultPrintMode={true} />
            )}

            {/* 5. Tab Tugas Penulisan Soal (Daftar Paket Tugas Saya) */}
            {activeTab === 'writer-tasks' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-brand-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
                  <div className="relative z-10 space-y-2">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                      <PenTool className="w-3.5 h-3.5" />
                      <span>Ruang Kerja Khusus Penulis Soal</span>
                    </div>
                    <h2 className="text-2xl font-black text-white">
                      Paket Penugasan Naskah Soal Anda
                    </h2>
                    <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
                      Bapak/Ibu ditugaskan oleh Super Admin untuk menyusun kisi-kisi dan merakit paket soal pada daftar di bawah ini. Pilih paket tugas yang ingin dikerjakan untuk membuka lembar kerja terisolasi.
                    </p>
                  </div>
                </div>

                {myAssignments.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <h3 className="font-black text-slate-800 text-base">Belum Ada Paket Penugasan Khusus</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Akun Anda saat ini belum dipetakan ke penugasan naskah spesifik oleh Super Admin. Hubungi panitia asesmen untuk mengaktifkan penugasan mata pelajaran dan kelas Anda.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {myAssignments.map((asg) => {
                      const isCurrentActive = activeAssignment?.id === asg.id;
                      return (
                        <div
                          key={asg.id}
                          className={`p-6 rounded-3xl border transition-all duration-200 space-y-4 bg-white shadow-xs relative ${
                            isCurrentActive
                              ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md'
                              : 'border-slate-200 hover:border-brand-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {asg.grade_class} • Fase {asg.phase}
                              </span>
                              <h3 className="font-black text-lg text-slate-900 leading-snug">
                                {asg.subject_name}
                              </h3>
                              <p className="text-xs text-slate-500">
                                {asg.user_institution || 'Instansi Terdaftar'}
                              </p>
                            </div>
                            {(() => {
                              const s = (asg.status || '').toLowerCase().trim();
                              if (s === 'terverifikasi' || s === 'approved' || s === 'selesai' || s === 'selesai (terverifikasi)') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Selesai</span>
                                  </span>
                                );
                              }
                              if (s === 'perlu revisi' || s === 'needs_revision' || s === 'revisi') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1">
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    <span>Perlu Revisi</span>
                                  </span>
                                );
                              }
                              if (s === 'menunggu verifikasi' || s === 'menunggu riviu' || s === 'pending_review' || s === 'menunggu verifikasi (selesai penulis)') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                                    <Clock className="w-3 h-3 text-blue-600" />
                                    <span>Menunggu Verifikasi</span>
                                  </span>
                                );
                              }
                              if (s === 'proses penulisan' || s === 'dalam penulisan' || s === 'in_progress') {
                                return (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1">
                                    <PenTool className="w-3 h-3 text-amber-600" />
                                    <span>Proses Penulisan</span>
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  Draft
                                </span>
                              );
                            })()}
                          </div>

                          {/* Jenis Asesmen Badges */}
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                              Paket Asesmen Ditugaskan:
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {asg.assessment_types.map(t => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-black"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          {asg.notes && (
                            <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600 italic">
                              "{asg.notes}"
                            </div>
                          )}

                          {/* Action Buttons */}
                          {/* Catatan Revisi Verifikator */}
                          {Boolean(asg.revision_notes && ((asg.status || '').toLowerCase().includes('revisi') || asg.status === 'Draft' || asg.status === 'Dalam Penulisan')) && (
                            <div className="text-xs bg-rose-50 p-3.5 rounded-2xl border border-rose-200 text-rose-900 space-y-1">
                              <div className="flex items-center space-x-1.5 font-bold text-rose-800">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>Catatan Perbaikan Verifikator:</span>
                              </div>
                              <p className="text-rose-700 font-medium italic">
                                "{asg.revision_notes}"
                              </p>
                              {asg.reviewed_at && (
                                <div className="text-[10px] text-rose-500">
                                  Ditinjau: {new Date(asg.reviewed_at).toLocaleString('id-ID')}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="pt-2 flex flex-col gap-2 border-t border-slate-100">
                            {(() => {
                              const s = (asg.status || '').toLowerCase().trim();
                              const isApproved = s === 'terverifikasi' || s === 'approved' || s === 'selesai' || s === 'selesai (terverifikasi)';
                              const isNeedsRevision = s === 'perlu revisi' || s === 'needs_revision' || s === 'revisi';

                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveAssignment(asg);
                                      setActiveTab('kisi-kisi');
                                    }}
                                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-xs ${
                                      isApproved
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : isNeedsRevision
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                                        : 'bg-brand-600 hover:bg-brand-500 text-white'
                                    }`}
                                  >
                                    {isApproved ? (
                                      <>
                                        <Lock className="w-4 h-4" />
                                        <span>Lihat Naskah (Selesai - Read Only)</span>
                                      </>
                                    ) : isNeedsRevision ? (
                                      <>
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>Buka & Lakukan Revisi Naskah ➔</span>
                                      </>
                                    ) : (
                                      <>
                                        <BookOpen className="w-4 h-4" />
                                        <span>Mulai / Lanjutkan Kisi-Kisi ➔</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveAssignment(asg);
                                      setActiveTab('exam-assembly');
                                    }}
                                    className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center space-x-2 transition"
                                  >
                                    <Package className="w-4 h-4" />
                                    <span>Perakitan Naskah Soal</span>
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 6. Tab Pemetaan Kisi-Kisi (Scoped to Active Assignment) */}
            {activeTab === 'kisi-kisi' && (
              <BlueprintMatrix
                currentUser={currentUser}
                initialScope={authorScope}
                activeSubModeProp={kisiKisiSubMode}
                onSubModeChange={setKisiKisiSubMode}
              />
            )}

            {/* 7. Tab Perakitan Paket Ujian (Scoped to Active Assignment) */}
            {activeTab === 'exam-assembly' && (
              <ExamAssembly
                currentUser={currentUser}
                initialScope={authorScope}
              />
            )}

          </div>
        </main>

        {/* KOLOM 3: WIDGET KANAN */}
        {isRightPanelOpen && (
          <aside className="hidden xl:flex flex-col w-72 bg-white border-l border-slate-200 p-4 space-y-4 shrink-0 overflow-y-auto shadow-xs">
            
            {/* Digital Clock */}
            <div className="bg-gradient-to-br from-slate-900 to-amber-950 text-white rounded-2xl p-4 shadow-md text-center border border-slate-800">
              <div className="flex items-center justify-center space-x-1.5 text-amber-300 text-[10px] uppercase font-bold tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5" />
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

            {/* Identitas Guru / Penulis */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-center relative overflow-hidden">
              <div className={`w-16 h-16 rounded-full ${isDedicatedWriter ? 'bg-gradient-to-tr from-emerald-600 to-teal-400' : 'bg-gradient-to-tr from-amber-600 to-amber-400'} text-white font-black text-xl flex items-center justify-center mx-auto shadow-md border-2 border-white`}>
                {currentUser.full_name?.charAt(0) || (isDedicatedWriter ? 'P' : 'G')}
              </div>

              <div className="mt-3">
                <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                  {currentUser.full_name}
                </h4>
                <div className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isDedicatedWriter ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                  {isDedicatedWriter ? 'Penulis Ahli Eksternal' : (isGuruKelas ? 'Wali Kelas / Guru Kelas' : 'Guru Mata Pelajaran')}
                </div>
              </div>

              <div className="mt-3.5 pt-3 border-t border-slate-200/80 text-left text-xs space-y-2">
                {isDedicatedWriter ? (
                  <>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Instansi Penulis:</span>
                      <span className="font-bold text-slate-800">
                        {matchedAssignment?.user_institution || 'Universitas London'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Naskah Ditugaskan:</span>
                      <span className="font-bold text-emerald-700">
                        {activeAssignment?.subject_name || 'Bahasa Indonesia'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Sasaran / Rombel:</span>
                      <span className="font-bold text-slate-800">
                        {activeAssignment?.level || 'SD'} • {activeAssignment?.grade_class || 'Kelas 1'} (Fase {activeAssignment?.phase || 'A'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Target Butir Soal:</span>
                      <span className="font-bold text-slate-800">{activeAssignment?.target_questions || 5} Butir</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Mata Pelajaran:</span>
                      <span className="font-bold text-slate-800">
                        {isGuruKelas ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : (currentUser.assigned_subject_name || 'PJOK')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Kelas Ampuan:</span>
                      <span className="font-bold text-slate-800">{currentUser.grade_class || 'Kelas 2'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">NIP Guru:</span>
                      <span className="font-mono font-semibold text-slate-700">
                        {currentUser.nip && currentUser.nip !== '-' ? currentUser.nip : '-'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Petunjuk Praktis */}
            {isDedicatedWriter ? (
              <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-200/80 text-xs text-emerald-950 space-y-2">
                <div className="flex items-center space-x-1.5 font-black text-[11px] text-emerald-950 uppercase tracking-wide">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  <span>Petunjuk Penulis Naskah</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Susun butir soal mengacu pada indikator kisi-kisi dan level kognitif (L1, L2, L3). Gunakan menu <strong>"Rakit Naskah"</strong> untuk mengunci paket sebelum ditinjau oleh tim pengembang asesmen.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50/60 rounded-2xl p-4 border border-amber-200/80 text-xs text-amber-900 space-y-2">
                <div className="flex items-center space-x-1.5 font-black text-[11px] text-amber-950 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Petunjuk Koreksi</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Gunakan tombol <strong>"Setujui Semua Nilai AI"</strong> di meja koreksi untuk menyetujui seluruh rekomendasi nilai cerdas dalam 1 kali klik. Nilai akan langsung tersinkronisasi ke leger proktor dan kepala sekolah.
                </p>
              </div>
            )}

          </aside>
        )}

      </div>
    </div>
  );
};

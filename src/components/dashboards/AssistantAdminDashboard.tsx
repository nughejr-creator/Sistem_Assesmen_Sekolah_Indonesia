import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileCheck2, 
  CheckCircle, 
  Clock, 
  Brain, 
  Layers, 
  ArrowUpRight, 
  Sparkles, 
  FileSpreadsheet,
  RefreshCw,
  Radio,
  BookOpen,
  Package,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Archive,
  RotateCcw,
  UserCheck,
  User
} from 'lucide-react';
import { UserProfile, BlueprintItem, Blueprint, QuestionBankItem, ExamPackage, QuestionWriterAssignment } from '../../types/database';
import { isSameSubject } from '../../lib/subjectMatcher';
import { supabase } from '../../lib/supabase';
import { HourglassLoader } from '../common/HourglassLoader';
import { isBlueprintArchived, getCleanBlueprintTitle, archiveBlueprintInDb, restoreBlueprintInDb } from '../../lib/archiveHelper';

interface AssistantAdminDashboardProps {
  onNavigateToKisiKisi: () => void;
  onNavigateToExamAssembly?: () => void;
  onNavigateToUsers?: () => void;
  currentUser?: UserProfile;
}

export const AssistantAdminDashboard: React.FC<AssistantAdminDashboardProps> = ({ 
  onNavigateToKisiKisi, 
  onNavigateToExamAssembly,
  currentUser 
}) => {
  // Realtime Data States with Cache Initializers
  const [blueprintItems, setBlueprintItems] = useState<BlueprintItem[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_blueprint_items_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [blueprints, setBlueprints] = useState<Blueprint[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_blueprints_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_question_bank_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [writerAssignments, setWriterAssignments] = useState<QuestionWriterAssignment[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_writer_assignments_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [examPackages, setExamPackages] = useState<ExamPackage[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_packages_cache');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [blueprintArchiveTab, setBlueprintArchiveTab] = useState<'active' | 'archived'>('active');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  const handleArchiveBlueprint = async (bp: Blueprint) => {
    const clean = getCleanBlueprintTitle(bp.title);
    if (!confirm(`Arsipkan dokumen "${clean}"?\nDokumen akan dipindahkan ke Kotak Arsip dan disembunyikan dari lembar kerja aktif.`)) return;
    const ok = await archiveBlueprintInDb(bp.id, bp.title);
    if (ok) {
      await fetchRealtimeDashboardData(true);
    } else {
      alert('Gagal mengarsipkan dokumen kisi-kisi.');
    }
  };

  const handleRestoreBlueprint = async (bp: Blueprint) => {
    const clean = getCleanBlueprintTitle(bp.title);
    const ok = await restoreBlueprintInDb(bp.id, bp.title);
    if (ok) {
      await fetchRealtimeDashboardData(true);
    } else {
      alert('Gagal memulihkan dokumen kisi-kisi.');
    }
  };

  const activeBlueprints = useMemo(() => blueprints.filter(b => !isBlueprintArchived(b)), [blueprints]);
  const archivedBlueprints = useMemo(() => blueprints.filter(b => isBlueprintArchived(b)), [blueprints]);
  const displayedBlueprints = blueprintArchiveTab === 'active' ? activeBlueprints : archivedBlueprints;
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Function to fetch 100% Realtime Data from Supabase
  const fetchRealtimeDashboardData = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);

    try {
      // 1. Fetch Blueprints
      const { data: dbBlueprints, error: bpError } = await supabase
        .from('blueprints')
        .select('*, subject:subjects(name)')
        .order('created_at', { ascending: false });

      if (dbBlueprints && !bpError) {
        setBlueprints(dbBlueprints);
        try { localStorage.setItem('sasi_blueprints_cache', JSON.stringify(dbBlueprints)); } catch {}
      }

      // 2. Fetch Blueprint Items with Blueprint relation
      const { data: dbItems, error: itemsError } = await supabase
        .from('blueprint_items')
        .select('*, blueprint:blueprints(title, subject_id, level, phase, assessment_type, subject:subjects(name))')
        .order('question_number', { ascending: true });

      if (dbItems && !itemsError) {
        setBlueprintItems(dbItems);
        try { localStorage.setItem('sasi_blueprint_items_cache', JSON.stringify(dbItems)); } catch {}
      }

      // 3. Fetch Question Bank
      const { data: dbQuestions, error: qError } = await supabase
        .from('question_bank')
        .select('*');

      if (dbQuestions && !qError) {
        setQuestionBank(dbQuestions);
        try { localStorage.setItem('sasi_question_bank_cache', JSON.stringify(dbQuestions)); } catch {}
      }

      // 4. Fetch Exam Packages
      const { data: dbPackages, error: pkgError } = await supabase
        .from('exam_packages')
        .select('*, subject:subjects(name)')
        .order('created_at', { ascending: false });

      if (dbPackages && !pkgError) {
        setExamPackages(dbPackages);
        try { localStorage.setItem('sasi_packages_cache', JSON.stringify(dbPackages)); } catch {}
      }

      setIsLiveConnected(true);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('Realtime assistant dashboard sync warning:', err);
      setIsLiveConnected(false);
    } finally {
      if (manual) setIsRefreshing(false);
      setIsLoadingData(false);
    }
  }, []);

  // Sinkronisasi saat komponen dimuat (halaman awal/refresh) & WebSocket Realtime Supabase
  useEffect(() => {
    // 1. Sinkronisasi data saat halaman awal dibuka atau di-refresh
    fetchRealtimeDashboardData();

    // 2. Supabase Live Realtime Subscription (hanya bereaksi jika ada perubahan data riil di DB)
    const channel = supabase
      .channel('assistant_admin_dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blueprint_items' }, () => fetchRealtimeDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blueprints' }, () => fetchRealtimeDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_bank' }, () => fetchRealtimeDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_packages' }, () => fetchRealtimeDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_writer_assignments' }, () => fetchRealtimeDashboardData())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsLiveConnected(true);
        }
      });

    // Polling otomatis 10 detik dinonaktifkan untuk menghemat kuota egress Supabase.
    // Sinkronisasi selanjutnya dapat dipicu via tombol "Segarkan Data" manual atau WebSocket event.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRealtimeDashboardData]);

  // Set of finished blueprint_item_id from question bank
  const finishedBpItemIds = useMemo(() => {
    return new Set(
      questionBank
        .filter(q => q.status === 'Selesai' && q.blueprint_item_id)
        .map(q => q.blueprint_item_id)
    );
  }, [questionBank]);

  // Real KPI 1: Total Penugasan Soal
  const totalItems = blueprintItems.length;

  const subjectNames = useMemo(() => {
    const set = new Set<string>();
    blueprintItems.forEach(i => {
      const name = i.blueprint?.subject?.name || i.subject_name;
      if (name) set.add(name);
    });
    blueprints.forEach(b => {
      const name = b.subject?.name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [blueprintItems, blueprints]);

  const subjectsSubtitle = useMemo(() => {
    if (subjectNames.length === 0) return 'Belum ada data penugasan';
    if (subjectNames.length <= 2) return subjectNames.join(' & ');
    return `${subjectNames.slice(0, 2).join(', ')} +${subjectNames.length - 2} lainnya`;
  }, [subjectNames]);

  // Real KPI 2: Dalam Pengerjaan
  const completedItems = useMemo(() => {
    return blueprintItems.filter(i => 
      i.workflow_status === 'Selesai' || finishedBpItemIds.has(i.id)
    );
  }, [blueprintItems, finishedBpItemIds]);

  const completedCount = completedItems.length;

  const inProgressItems = useMemo(() => {
    return blueprintItems.filter(i => 
      i.workflow_status !== 'Selesai' && !finishedBpItemIds.has(i.id)
    );
  }, [blueprintItems, finishedBpItemIds]);

  const inProgressCount = inProgressItems.length;

  const writingCount = useMemo(() => {
    const list = inProgressItems.filter(i => 
      i.workflow_status === 'Draft' || 
      i.workflow_status === 'Dalam Penulisan' || 
      (!i.workflow_status && i.task_type === 'TULIS')
    );
    // If no specific workflow status tagged, default all in-progress to writing
    return list.length > 0 ? list.length : inProgressCount;
  }, [inProgressItems, inProgressCount]);

  const reviewCount = useMemo(() => {
    return Math.max(0, inProgressCount - writingCount);
  }, [inProgressCount, writingCount]);

  // Real KPI 3: Lolos Riviu & Siap Terbit
  const completedPercent = totalItems > 0 
    ? ((completedCount / totalItems) * 100).toFixed(1)
    : '0';

  // Real KPI 4: Paket Ujian Terkait
  const packagesCount = examPackages.length;

  const assessmentTypesSubtitle = useMemo(() => {
    const types = new Set<string>();
    examPackages.forEach(p => {
      if (p.assessment_type) types.add(p.assessment_type);
    });
    blueprints.forEach(b => {
      if (b.assessment_type) types.add(b.assessment_type);
    });
    const arr = Array.from(types).filter(Boolean);
    return arr.length > 0 ? arr.join(', ') : 'Belum ada paket ujian terbit';
  }, [examPackages, blueprints]);

  // Real Cognitive Level Distribution (Pusmendik standard)
  const cognitiveStats = useMemo(() => {
    let l1 = 0;
    let l2 = 0;
    let l3 = 0;

    blueprintItems.forEach(item => {
      const cog = (item.cognitive_level || '').toUpperCase();
      if (cog.includes('L1') || cog.includes('PENGETAHUAN') || cog.includes('PEMAHAMAN')) {
        l1++;
      } else if (cog.includes('L2') || cog.includes('APLIKASI') || cog.includes('PENERAPAN')) {
        l2++;
      } else if (cog.includes('L3') || cog.includes('PENALARAN') || cog.includes('HOTS')) {
        l3++;
      } else {
        l2++;
      }
    });

    const total = blueprintItems.length;
    const l1Pct = total > 0 ? Math.round((l1 / total) * 100) : 0;
    const l2Pct = total > 0 ? Math.round((l2 / total) * 100) : 0;
    const l3Pct = total > 0 ? Math.round((l3 / total) * 100) : 0;

    // Ideal Pusmendik standard: L1: 30%, L2: 50%, L3: 20%
    // Tolerance margin ±10%
    let balanceStatus: 'balanced' | 'unbalanced' | 'empty' = 'balanced';
    if (total === 0) {
      balanceStatus = 'empty';
    } else {
      const isL1Ok = l1Pct >= 20 && l1Pct <= 40;
      const isL2Ok = l2Pct >= 40 && l2Pct <= 60;
      const isL3Ok = l3Pct >= 10 && l3Pct <= 30;
      if (!isL1Ok || !isL2Ok || !isL3Ok) {
        balanceStatus = 'unbalanced';
      }
    }

    return {
      l1: { count: l1, pct: l1Pct },
      l2: { count: l2, pct: l2Pct },
      l3: { count: l3, pct: l3Pct },
      balanceStatus
    };
  }, [blueprintItems]);

  // Real Phase Readiness (Fase A - D)
  const phaseStats = useMemo(() => {
    const phases = [
      { key: 'A', name: 'Fase A', desc: 'SD Kelas 1 - 2', barColor: 'bg-amber-500', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
      { key: 'B', name: 'Fase B', desc: 'SD Kelas 3 - 4', barColor: 'bg-blue-600', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
      { key: 'C', name: 'Fase C', desc: 'SD Kelas 5 - 6', barColor: 'bg-emerald-600', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      { key: 'D', name: 'Fase D', desc: 'SMP Kelas 7 - 9', barColor: 'bg-purple-600', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    ];

    return phases.map(p => {
      const itemsInPhase = blueprintItems.filter(i => (i.phase || i.blueprint?.phase) === p.key);
      const finishedInPhase = itemsInPhase.filter(i => 
        i.workflow_status === 'Selesai' || finishedBpItemIds.has(i.id)
      );
      const total = itemsInPhase.length;
      const pct = total > 0 ? Math.round((finishedInPhase.length / total) * 100) : 0;
      return {
        ...p,
        total,
        finished: finishedInPhase.length,
        pct
      };
    });
  }, [blueprintItems, finishedBpItemIds]);

  return (
    <div className="space-y-6 animate-fade-in w-full">
      
      {/* 1. Realtime Status Bar & Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-brand-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Glow backdrop decoration */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-24 w-60 h-60 bg-brand-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-1.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-extrabold px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Divisi Penulis & Reviewer Soal Asesmen Nasional</span>
              </div>

              {/* Realtime Connection Status Pill */}
              <div className="inline-flex items-center space-x-1.5 bg-slate-950/60 border border-slate-700/60 text-[11px] font-bold px-2.5 py-1 rounded-full text-slate-300">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLiveConnected ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                </span>
                <span>{isLiveConnected ? 'Live Realtime' : 'Menghubungkan...'}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Dashboard Asisten Super Administrator
            </h1>
            <p className="text-sm text-indigo-200 max-w-2xl leading-relaxed">
              Selamat datang, <strong className="text-white font-extrabold">{currentUser?.full_name || 'Bapak/Ibu Asisten Admin'}</strong>. Kelola penugasan pemetaan kisi-kisi, penulisan butir soal, dan telaah riviu kualitas soal asesmen jenjang SD (Fase A-C) & SMP (Fase D).
            </p>
          </div>

          {/* Action Buttons Column: Susunan Vertikal Simetris & Proporsional */}
          <div className="flex flex-col gap-2.5 shrink-0 w-full sm:w-auto min-w-[210px] max-w-[250px] self-start md:self-center">
            {/* Baris 1: Tombol Buka Matriks Kisi-Kisi (Full Width) */}
            <button
              onClick={onNavigateToKisiKisi}
              className="w-full px-4 py-2.5 bg-white text-indigo-950 font-black rounded-xl text-xs sm:text-sm hover:bg-indigo-50 flex items-center justify-center space-x-2 shadow-lg shrink-0 transition-all transform active:scale-95 border border-white/90"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">Buka Matriks Kisi-Kisi</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
            </button>

            {/* Baris 2: Tombol Paket Ujian + Tombol Segarkan Berdampingan Simetris */}
            <div className="flex items-center gap-2 w-full">
              {onNavigateToExamAssembly && (
                <button
                  onClick={onNavigateToExamAssembly}
                  className="flex-1 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/40 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-md truncate"
                  title="Buka Perakitan Paket Soal"
                >
                  <Package className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="truncate">Paket Ujian</span>
                </button>
              )}

              {/* Tombol Segarkan (Refresh) */}
              <button
                onClick={() => fetchRealtimeDashboardData(true)}
                disabled={isRefreshing}
                className="p-2.5 bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700 text-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-60 shrink-0 flex items-center justify-center"
                title={`Segarkan data manual. Terakhir disinkron: ${lastUpdated.toLocaleTimeString('id-ID')}`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Sync Info Footer */}
        <div className="mt-4 pt-3 border-t border-indigo-500/20 flex items-center justify-between text-[11px] text-indigo-300">
          <div className="flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Sinkronisasi otomatis dengan server Supabase Cloud SASI</span>
          </div>
          <span>Terakhir diperbarui: <strong>{lastUpdated.toLocaleTimeString('id-ID')}</strong></span>
        </div>
      </div>

      {/* 2. 4 KPI Cards Asisten Super Admin (100% Realtime) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* KPI 1: Total Penugasan Soal */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-sm font-bold">
            <span>Total Penugasan Soal</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <FileCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {totalItems} Soal
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1.5 truncate" title={subjectsSubtitle}>
            {subjectsSubtitle}
          </div>
        </div>

        {/* KPI 2: Draft / Sedang Ditulis */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-sm font-bold">
            <span>Dalam Pengerjaan</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-600 mt-2">
            {inProgressCount} Soal
          </div>
          <div className="text-xs font-semibold text-amber-700 mt-1.5">
            {writingCount} Tulis • {reviewCount} Riviu Validator
          </div>
        </div>

        {/* KPI 3: Lolos Riviu & Siap Terbit */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-sm font-bold">
            <span>Lolos Riviu & Siap Terbit</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-2">
            {completedCount} Soal
          </div>
          <div className="text-xs font-semibold text-emerald-700 mt-1.5">
            {completedPercent}% dari target penugasan
          </div>
        </div>

        {/* KPI 4: Paket Asesmen Terkait */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-500 text-sm font-bold">
            <span>Paket Ujian Terkait</span>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-sky-700 mt-2">
            {packagesCount} Paket
          </div>
          <div className="text-xs font-semibold text-slate-500 mt-1.5 truncate" title={assessmentTypesSubtitle}>
            {assessmentTypesSubtitle}
          </div>
        </div>

      </div>

      {/* 3. Distribusi Proporsi Level Kognitif (Standar Pusmendik) - Realtime */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <span>Distribusi Proporsi Level Kognitif (Standar Pusmendik)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Komposisi ideal: L1 (Pengetahuan & Pemahaman) 30%, L2 (Aplikasi) 50%, L3 (Penalaran/HOTS) 20%
            </p>
          </div>

          <div>
            {cognitiveStats.balanceStatus === 'empty' && (
              <span className="text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                Belum Ada Butir Soal
              </span>
            )}
            {cognitiveStats.balanceStatus === 'balanced' && (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Komposisi Ideal Sesuai Standar</span>
              </span>
            )}
            {cognitiveStats.balanceStatus === 'unbalanced' && (
              <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full inline-flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Perlu Penyesuaian Proporsi</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-0.5">
          
          {/* L1 Card */}
          <div className="p-3.5 sm:p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex flex-col justify-between h-auto gap-2.5">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-extrabold text-emerald-900">
                <span>Level 1: Pengetahuan & Pemahaman</span>
                <span className="text-sm sm:text-base font-black">
                  {cognitiveStats.l1.count} Soal ({cognitiveStats.l1.pct}%)
                </span>
              </div>
              
              {/* Real Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-emerald-200/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, cognitiveStats.l1.pct)}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-emerald-700">
                  <span>Aktual: {cognitiveStats.l1.pct}%</span>
                  <span>Target: 30%</span>
                </div>
              </div>
            </div>

            <p className="text-justify text-xs leading-relaxed text-emerald-800">
              Mengukur kemampuan mengenali, mengingat kembali rumus, dan konsep dasar materi.
            </p>
          </div>

          {/* L2 Card */}
          <div className="p-3.5 sm:p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col justify-between h-auto gap-2.5">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-extrabold text-amber-900">
                <span>Level 2: Aplikasi (Penerapan)</span>
                <span className="text-sm sm:text-base font-black">
                  {cognitiveStats.l2.count} Soal ({cognitiveStats.l2.pct}%)
                </span>
              </div>

              {/* Real Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-amber-200/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, cognitiveStats.l2.pct)}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-amber-700">
                  <span>Aktual: {cognitiveStats.l2.pct}%</span>
                  <span>Target: 50%</span>
                </div>
              </div>
            </div>

            <p className="text-justify text-xs leading-relaxed text-amber-800">
              Mengukur kemampuan menerapkan konsep matematika/bahasa pada masalah aplikatif.
            </p>
          </div>

          {/* L3 Card */}
          <div className="p-3.5 sm:p-4 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex flex-col justify-between h-auto gap-2.5">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-extrabold text-purple-900">
                <span>Level 3: Penalaran (HOTS)</span>
                <span className="text-sm sm:text-base font-black">
                  {cognitiveStats.l3.count} Soal ({cognitiveStats.l3.pct}%)
                </span>
              </div>

              {/* Real Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-purple-200/60 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, cognitiveStats.l3.pct)}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-purple-700">
                  <span>Aktual: {cognitiveStats.l3.pct}%</span>
                  <span>Target: 20%</span>
                </div>
              </div>
            </div>

            <p className="text-justify text-xs leading-relaxed text-purple-800">
              Mengukur kemampuan menganalisis, mengevaluasi data wacana, dan berpikir kritis.
            </p>
          </div>

        </div>
      </div>

      {/* 4. Kesiapan Penugasan Soal per Jenjang & Fase (Fase A - D) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span>Kesiapan Pemetaan Soal per Fase Kurikulum Merdeka</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau progres penyelesaian butir soal per jenjang Fase A, B, C (SD) hingga Fase D (SMP)
            </p>
          </div>
          <button
            onClick={onNavigateToKisiKisi}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>Kelola di Kisi-Kisi</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-3.5">
          {phaseStats.map((phase) => (
            <div 
              key={phase.key} 
              className="p-3 sm:p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between h-auto gap-2"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="min-w-0">
                    <span className="text-sm font-black text-slate-800 block truncate">{phase.name}</span>
                    <div className="text-[11px] font-semibold text-slate-500 truncate">{phase.desc}</div>
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${phase.badgeColor}`}>
                    {phase.pct}% Siap
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 sm:h-2 rounded-full overflow-hidden mt-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${phase.barColor}`} 
                    style={{ width: `${phase.pct}%` }} 
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 font-semibold mt-2 pt-1 border-t border-slate-100/80">
                <span>Selesai: <strong className="text-slate-800">{phase.finished}</strong> butir</span>
                <span>Total: <strong className="text-slate-800">{phase.total}</strong> butir</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Daftar Kisi-Kisi Aktif Terbaru */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Daftar Dokumen Kisi-Kisi Terdaftar</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar master dokumen blueprint kisi-kisi asesmen
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              type="button"
              onClick={() => setBlueprintArchiveTab('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                blueprintArchiveTab === 'active'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kisi-Kisi Aktif ({activeBlueprints.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setBlueprintArchiveTab('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                blueprintArchiveTab === 'archived'
                  ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>Kotak Arsip ({archivedBlueprints.length})</span>
            </button>
          </div>
        </div>

        {isLoadingData ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200">
            <HourglassLoader
              title="Sedang Memuat Dokumen Kisi-Kisi..."
              subtitle="Menghubungkan ke cloud database Supabase untuk menyinkronkan seluruh daftar kisi-kisi dan status penulisan butir soal."
              badgeText="MEMUAT DOKUMEN DARI SUPABASE"
            />
          </div>
        ) : displayedBlueprints.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">
              {blueprintArchiveTab === 'active' 
                ? 'Belum ada dokumen kisi-kisi aktif' 
                : 'Kotak arsip kisi-kisi masih kosong'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {blueprintArchiveTab === 'active' 
                ? 'Buat kisi-kisi pertama melalui menu Matriks Kisi-Kisi' 
                : 'Dokumen yang telah selesai diujikan dapat diarsipkan ke sini'}
            </p>
            {blueprintArchiveTab === 'active' && (
              <button
                onClick={onNavigateToKisiKisi}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs hover:bg-indigo-700 transition-all inline-flex items-center space-x-1.5"
              >
                <span>Buka Matriks Kisi-Kisi</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="border-2 border-sky-300 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-sky-100 text-sky-950 font-black border-b-2 border-sky-300 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Judul Dokumen Kisi-Kisi</th>
                    <th className="py-3 px-4">Mata Pelajaran & Jenjang</th>
                    <th className="py-3 px-4">Guru Penulis Ditugaskan</th>
                    <th className="py-3 px-4">Progres Kisi-Kisi</th>
                    <th className="py-3 px-4">Status Penulisan Soal</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedBlueprints.map((bp) => {
                    const itemsInBp = blueprintItems.filter(i => i.blueprint_id === bp.id);
                    const finishedInBp = itemsInBp.filter(i => 
                      i.workflow_status === 'Selesai' || finishedBpItemIds.has(i.id)
                    );
                    const isArchived = isBlueprintArchived(bp);

                    // Cari Guru Penulis yang Ditugaskan
                    const matchedAsg = writerAssignments.find(a => 
                      !a.is_archived &&
                      isSameSubject(a.subject_name, bp.subject?.name || bp.title) &&
                      (
                        (bp.title && a.grade_class && bp.title.toLowerCase().includes(a.grade_class.toLowerCase())) ||
                        (bp.phase && a.phase && bp.phase === a.phase)
                      )
                    );

                    // Target Total Soal Dinamis (Mengutamakan butir asli kisi-kisi atau penugasan)
                    const targetTotal = bp.total_questions || (itemsInBp.length > 0 ? itemsInBp.length : (matchedAsg?.target_questions || 35));
                    const kisiPct = targetTotal > 0 ? Math.min(100, Math.round((itemsInBp.length / targetTotal) * 100)) : 0;
                    const finishedCount = finishedInBp.length;
                    const isComplete = finishedCount >= targetTotal && targetTotal > 0;
                    const isDraftOnly = finishedCount === 0;

                    return (
                      <tr key={bp.id} className="hover:bg-sky-50/50 transition-colors">
                        {/* 1. Judul Dokumen */}
                        <td className="py-3.5 px-4 font-bold text-slate-800">
                          <div className="flex items-center space-x-2">
                            <span>{getCleanBlueprintTitle(bp.title)}</span>
                            {isArchived && (
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                Arsip
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 block mt-0.5">
                            ID: {bp.id.substring(0, 8)}...
                          </span>
                        </td>

                        {/* 2. Mapel & Jenjang */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">
                            {bp.subject?.name || 'Umum'}
                          </span>
                          <div className="flex items-center space-x-1 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {bp.level} • Fase {bp.phase}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {bp.assessment_type || 'SAS'}
                            </span>
                          </div>
                        </td>

                        {/* 3. Guru Penulis Ditugaskan */}
                        <td className="py-3.5 px-4">
                          {matchedAsg ? (
                            <div>
                              <div className="flex items-center space-x-1.5 font-bold text-slate-900">
                                <UserCheck className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                <span className="line-clamp-1">{matchedAsg.user_name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate max-w-[160px]">
                                {matchedAsg.user_institution || 'Guru Penulis SASI'}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 italic">
                              <User className="w-3 h-3 mr-1 text-slate-400" />
                              Belum Ditugaskan
                            </span>
                          )}
                        </td>

                        {/* 4. Progres Kisi-Kisi */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5 text-xs">
                            <span className="font-black text-slate-900">{itemsInBp.length}</span>
                            <span className="text-slate-400 font-bold">/</span>
                            <span className="font-bold text-slate-600">{targetTotal} Kisi</span>
                          </div>
                          <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-200">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                itemsInBp.length >= targetTotal ? 'bg-emerald-500' : 'bg-brand-500'
                              }`}
                              style={{ width: `${kisiPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                            {kisiPct}% Lengkap
                          </span>
                        </td>

                        {/* 5. Status Penulisan Naskah Soal */}
                        <td className="py-3.5 px-4">
                          {isComplete ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0 stroke-[2.5]" />
                              {finishedCount}/{targetTotal} Selesai (100%)
                            </span>
                          ) : isDraftOnly ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <Clock className="w-3.5 h-3.5 mr-1 text-slate-500 shrink-0" />
                              Draft Penulisan (0/{targetTotal})
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                <Clock className="w-3.5 h-3.5 mr-1 text-blue-600 shrink-0" />
                                {finishedCount}/{targetTotal} Selesai ({Math.round((finishedCount / targetTotal) * 100)}%)
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                                Sisa {targetTotal - finishedCount} butir dalam riviu
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 6. Aksi */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={onNavigateToKisiKisi}
                              className="px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all border border-indigo-100"
                            >
                              Buka
                            </button>
                            {isArchived ? (
                              <button
                                onClick={() => handleRestoreBlueprint(bp)}
                                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200 flex items-center space-x-1 shadow-2xs"
                                title="Aktifkan Kembali Kisi-Kisi Ini ke Lembar Kerja"
                              >
                                <RotateCcw className="w-3 h-3 text-emerald-600" />
                                <span>Aktifkan</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleArchiveBlueprint(bp)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-slate-200"
                                title="Arsipkan Kisi-Kisi Ini dari Lembar Kerja Aktif"
                              >
                                <Archive className="w-3.5 h-3.5 text-amber-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

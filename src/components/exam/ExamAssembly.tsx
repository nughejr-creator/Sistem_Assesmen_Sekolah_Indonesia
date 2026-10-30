import React, { useState, useEffect, useMemo } from 'react';
import { 
  ExamPackage, 
  ExamSession, 
  QuestionBankItem, 
  School, 
  Subject, 
  SchoolLevel, 
  Phase, 
  AssessmentType,
  UserProfile 
} from '../../types/database';
import { 
  MOCK_EXAM_PACKAGE, 
  MOCK_EXAM_SESSION, 
  MOCK_QUESTIONS, 
  MOCK_SCHOOLS, 
  MOCK_SUBJECTS 
} from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  Package, 
  Plus, 
  Key, 
  Clock, 
  Shuffle, 
  CheckCircle2, 
  Copy, 
  Sparkles, 
  Calendar, 
  Search, 
  Layers, 
  School as SchoolIcon,
  X,
  FileText,
  AlertCircle,
  PlayCircle,
  BarChart3,
  Check,
  Eye,
  Trash2,
  RefreshCw,
  ExternalLink,
  Power,
  PowerOff,
  Edit3,
  MapPin,
  Maximize2,
  Minimize2,
  Lock,
  Archive,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { generateValidUUID, toValidUUID, mergeCloudAndLocal, safeSupabaseUpsert, isObsoleteSubject } from '../../lib/syncHelper';
import { RichMathText } from '../common/RichMathText';
import { 
  isPackageArchived, 
  getCleanPackageTitle, 
  archivePackageInDb, 
  restorePackageInDb,
  isSessionArchived,
  getCleanSessionName,
  archiveSessionInDb,
  restoreSessionInDb
} from '../../lib/archiveHelper';

interface ExamAssemblyProps {
  currentUser: UserProfile;
  initialScope?: {
    level?: SchoolLevel;
    grade?: string;
    subject?: string;
    assessment?: string;
    isLocked?: boolean;
  };
}

const PKG_STORAGE_KEY = 'sasi_packages_cache';
const SES_STORAGE_KEY = 'sasi_sessions_cache';

export const ExamAssembly: React.FC<ExamAssemblyProps> = ({ currentUser, initialScope }) => {
  // Available Subjects (Filtered from Obsolete)
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_subjects_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((s: Subject) => !isObsoleteSubject(s));
        }
      }
    } catch (e) {}
    return MOCK_SUBJECTS.filter((s: Subject) => !isObsoleteSubject(s));
  });

  // Packages and Sessions state with LocalStorage persistence (Filtering out old fake mock items)
  const [packages, setPackages] = useState<ExamPackage[]>(() => {
    try {
      const cached = localStorage.getItem(PKG_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const realOnly = parsed.filter((p: any) => p.id && !p.id.startsWith('pkg-'));
        if (realOnly.length > 0) return realOnly;
      }
    } catch (e) {}
    return [];
  });

  const [sessions, setSessions] = useState<ExamSession[]>(() => {
    try {
      const cached = localStorage.getItem(SES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const realOnly = parsed.filter((s: any) => s.id && !s.id.startsWith('ses-'));
        if (realOnly.length > 0) return realOnly;
      }
    } catch (e) {}
    return [];
  });

  // Real Blueprints & Package Questions Map from Cloud
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>('');
  const [packageQuestionsMap, setPackageQuestionsMap] = useState<Record<string, { count: number; totalWeight: number; questions: QuestionBankItem[] }>>({});

  // Preview Package Modal state
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [selectedPackageForPreview, setSelectedPackageForPreview] = useState<ExamPackage | null>(null);

  // Questions from Real Question Bank (supports multi-variant)
  const [questions, setQuestions] = useState<QuestionBankItem[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_question_bank_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return MOCK_QUESTIONS;
  });

  const [schools, setSchools] = useState<School[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_schools_cache');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return MOCK_SCHOOLS;
  });

  // Fetch packages, sessions, subjects, and question bank from cloud non-destructively on mount
  useEffect(() => {
    let isMounted = true;
    const fetchExamData = async () => {
      try {
        // 1. Fetch Subjects
        let currentSubs = availableSubjects;
        try {
          const { data: cloudSubs } = await supabase.from('subjects').select('*').order('name');
          if (cloudSubs && cloudSubs.length > 0 && isMounted) {
            const cleanSubs = cloudSubs.filter((s: Subject) => !isObsoleteSubject(s));
            currentSubs = cleanSubs;
            setAvailableSubjects(cleanSubs);
            try { localStorage.setItem('sasi_subjects_cache', JSON.stringify(cleanSubs)); } catch (e) {}
          }
        } catch (e) {}

        // 2. Fetch Questions Bank
        let currentQuestions = questions;
        try {
          const { data: cloudQs } = await supabase.from('question_bank').select('*, options:question_options(*)');
          if (cloudQs && cloudQs.length > 0 && isMounted) {
            const formatted = cloudQs.map((q: any) => ({
              ...q,
              options: Array.isArray(q.options)
                ? [...q.options].sort((a: any, b: any) => (a.option_label || '').localeCompare(b.option_label || ''))
                : []
            }));
            currentQuestions = formatted;
            setQuestions(formatted);
            try { localStorage.setItem('sasi_question_bank_cache', JSON.stringify(formatted)); } catch (e) {}
          }
        } catch (e) {}

        // 3. Fetch Blueprints
        try {
          const { data: cloudBps } = await supabase
            .from('blueprints')
            .select('id, title, subject_id, level, phase, assessment_type, subjects(id, name), items:blueprint_items(id, question_number)')
            .order('created_at', { ascending: false });
          if (cloudBps && isMounted) {
            setBlueprints(cloudBps);
          }
        } catch (e) {}

        // 4. Fetch Package Questions Mapping
        try {
          const { data: cloudEpq } = await supabase.from('exam_package_questions').select('*');
          if (cloudEpq && isMounted) {
            const map: Record<string, { count: number; totalWeight: number; questions: QuestionBankItem[] }> = {};
            cloudEpq.forEach((epq: any) => {
              if (!map[epq.package_id]) {
                map[epq.package_id] = { count: 0, totalWeight: 0, questions: [] };
              }
              const q = currentQuestions.find(item => item.id === epq.question_id);
              if (q) {
                map[epq.package_id].count += 1;
                map[epq.package_id].totalWeight += (q.weight || 1);
                map[epq.package_id].questions.push(q);
              } else {
                map[epq.package_id].count += 1;
              }
            });
            setPackageQuestionsMap(map);
          }
        } catch (e) {}

        // 5. Fetch Packages (Real from Supabase Cloud)
        try {
          const { data: cloudPkgs } = await supabase
            .from('exam_packages')
            .select('*, subject:subjects(*)')
            .order('created_at', { ascending: false });
          if (cloudPkgs && cloudPkgs.length > 0 && isMounted) {
            const cleanPkgs = (cloudPkgs as any[]).map((pkg: any) => {
              const matchedSub = currentSubs.find(s => s.id === pkg.subject_id) || pkg.subject;
              return {
                ...pkg,
                subject: matchedSub
              };
            });
            setPackages(cleanPkgs);
            try {
              localStorage.setItem(PKG_STORAGE_KEY, JSON.stringify(cleanPkgs));
            } catch (e) {}
          }
        } catch (e) {}

        // 6. Fetch Sessions (Real from Supabase Cloud)
        try {
          const { data: cloudSessions } = await supabase
            .from('exam_sessions')
            .select('*, package:exam_packages(*, subject:subjects(*)), school:schools(*)')
            .order('created_at', { ascending: false });
          if (cloudSessions && cloudSessions.length > 0 && isMounted) {
            const cleanSessions = (cloudSessions as any[]).filter((s: any) => !s.id.startsWith('ses-'));
            setSessions(cleanSessions);
            try {
              localStorage.setItem(SES_STORAGE_KEY, JSON.stringify(cleanSessions));
            } catch (e) {}
          }
        } catch (e) {}

        // 7. Fetch Schools (Real from Supabase Cloud)
        try {
          const { data: cloudSchools } = await supabase
            .from('schools')
            .select('*')
            .order('name', { ascending: true });
          if (cloudSchools && cloudSchools.length > 0 && isMounted) {
            setSchools(prev => {
              const { merged } = mergeCloudAndLocal(cloudSchools as School[], prev, s => s.npsn);
              try {
                localStorage.setItem('sasi_schools_cache', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        } catch (e) {}
      } catch (err) {
        console.warn('Sync exam data error:', err);
      }
    };
    fetchExamData();
    return () => { isMounted = false; };
  }, []);

  // Helper for hierarchical grades
  const getGradesForPhase = (phase: Phase): string[] => {
    switch (phase) {
      case 'A': return ['Kelas 1', 'Kelas 2'];
      case 'B': return ['Kelas 3', 'Kelas 4'];
      case 'C': return ['Kelas 5', 'Kelas 6'];
      case 'D': return ['Kelas 7', 'Kelas 8', 'Kelas 9'];
      default: return ['Kelas 1', 'Kelas 2'];
    }
  };

  const getPhaseForGrade = (grade?: string): Phase => {
    if (!grade) return 'A';
    if (grade.includes('1') || grade.includes('2')) return 'A';
    if (grade.includes('3') || grade.includes('4')) return 'B';
    if (grade.includes('5') || grade.includes('6')) return 'C';
    if (grade.includes('7') || grade.includes('8') || grade.includes('9')) return 'D';
    return 'A';
  };

  const parseAssessmentType = (asmt?: string): AssessmentType => {
    if (!asmt) return 'Formatif';
    const aLower = asmt.toLowerCase();
    if (aLower.includes('pts') || aLower.includes('tengah')) return 'PTS';
    if (aLower.includes('sas') || aLower.includes('akhir semester') || aLower.includes('semester')) return 'SAS';
    if (aLower.includes('sat') || aLower.includes('akhir tahun') || aLower.includes('tahun')) return 'SAT';
    if (aLower.includes('saj') || aLower.includes('akhir jenjang') || aLower.includes('jenjang')) return 'SAJ';
    if (aLower.includes('formatif')) return 'Formatif';
    return 'Formatif';
  };

  const findMatchingSubjectId = (subs: Subject[], scopeSubject?: string, lvl?: SchoolLevel): string => {
    if (scopeSubject) {
      const cleanScope = scopeSubject.toLowerCase().trim();
      const match = subs.find(s => 
        (!lvl || s.level === lvl) &&
        (s.name.toLowerCase() === cleanScope || s.name.toLowerCase().includes(cleanScope) || cleanScope.includes(s.name.toLowerCase()))
      );
      if (match) return match.id;
      const anyMatch = subs.find(s => 
        s.name.toLowerCase() === cleanScope || s.name.toLowerCase().includes(cleanScope) || cleanScope.includes(s.name.toLowerCase())
      );
      if (anyMatch) return anyMatch.id;
    }
    const sdSubs = subs.filter(s => s.level === (lvl || 'SD'));
    const mathSd = sdSubs.find(s => s.name.toLowerCase().includes('matematika'));
    return mathSd?.id || sdSubs[0]?.id || '';
  };

  // Helper for Assessment Label
  const getAssessmentLabel = (type: AssessmentType) => {
    switch (type) {
      case 'Formatif': return 'Penilaian Formatif';
      case 'PTS': return 'Penilaian Tengah Semester (PTS)';
      case 'SAS': return 'Sumatif Akhir Semester (SAS)';
      case 'SAT': return 'Sumatif Akhir Tahun (SAT)';
      case 'SAJ': return 'Sumatif Akhir Jenjang (SAJ)';
      default: return type;
    }
  };

  const getSubjectName = (subId: string) => {
    const s = availableSubjects.find(sub => sub.id === subId);
    return s?.name || initialScope?.subject || 'Mata Pelajaran';
  };

  const computeSuggestedTitle = (
    asmt: AssessmentType,
    subId: string,
    grade: string,
    lvl: SchoolLevel
  ) => {
    const subName = getSubjectName(subId);
    const asmtLabel = getAssessmentLabel(asmt);
    return `${asmtLabel} ${subName} ${grade} ${lvl}`;
  };

  // Stepped Defaults respecting initialScope
  const defaultInitLevel: SchoolLevel = initialScope?.level || 'SD';
  const defaultInitPhase: Phase = initialScope?.grade ? getPhaseForGrade(initialScope.grade) : (defaultInitLevel === 'SD' ? 'A' : 'D');
  const defaultInitGrade: string = initialScope?.grade || (defaultInitLevel === 'SD' ? 'Kelas 1' : 'Kelas 7');
  const defaultInitAsmt: AssessmentType = parseAssessmentType(initialScope?.assessment);

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>(initialScope?.level || 'ALL');
  const [assessmentFilter, setAssessmentFilter] = useState<string>(initialScope?.assessment || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [packageArchiveTab, setPackageArchiveTab] = useState<'active' | 'archived'>('active');
  const [includeArchivedQuestions, setIncludeArchivedQuestions] = useState<boolean>(false);

  // Modals
  const [showCreatePackageModal, setShowCreatePackageModal] = useState(false);
  const [showCreateSessionModal, setShowCreateSessionModal] = useState(false);
  const [selectedPackageForSession, setSelectedPackageForSession] = useState<ExamPackage | null>(null);

  // Package Form State (Hierarchical Stepped Defaults)
  const [newLevel, setNewLevel] = useState<SchoolLevel>(defaultInitLevel);
  const [newPhase, setNewPhase] = useState<Phase>(defaultInitPhase);
  const [newGrade, setNewGrade] = useState<string>(defaultInitGrade);
  const [newSubjectId, setNewSubjectId] = useState<string>(() => {
    return findMatchingSubjectId(availableSubjects, initialScope?.subject, defaultInitLevel);
  });
  const [newAssessmentType, setNewAssessmentType] = useState<AssessmentType>(defaultInitAsmt);
  const [newTitle, setNewTitle] = useState(() => {
    const subName = initialScope?.subject || 'Bahasa Indonesia';
    const asmtLabel = getAssessmentLabel(defaultInitAsmt);
    return `${asmtLabel} ${subName} ${defaultInitGrade} ${defaultInitLevel}`;
  });
  const [newDuration, setNewDuration] = useState<number>(60);
  const [randomizeQuestions, setRandomizeQuestions] = useState(true);
  const [randomizeOptions, setRandomizeOptions] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [selectedTemplatePackageId, setSelectedTemplatePackageId] = useState<string>('');

  // Sync initialScope dynamically
  useEffect(() => {
    if (initialScope) {
      const effLevel: SchoolLevel = initialScope.level || 'SD';
      const effGrade: string = initialScope.grade || (effLevel === 'SD' ? 'Kelas 1' : 'Kelas 7');
      const effPhase: Phase = getPhaseForGrade(effGrade);
      const effAsmt: AssessmentType = parseAssessmentType(initialScope.assessment);

      setLevelFilter(effLevel);
      setAssessmentFilter(effAsmt);

      setNewLevel(effLevel);
      setNewPhase(effPhase);
      setNewGrade(effGrade);
      setNewAssessmentType(effAsmt);

      const foundSubId = findMatchingSubjectId(availableSubjects, initialScope.subject, effLevel);
      if (foundSubId) {
        setNewSubjectId(foundSubId);
      }
      const subName = initialScope.subject || 'Mata Pelajaran';
      setNewTitle(`${getAssessmentLabel(effAsmt)} ${subName} ${effGrade} ${effLevel}`);
    }
  }, [initialScope, availableSubjects]);

  const handleOpenCreatePackageModal = () => {
    setSelectedTemplatePackageId('');
    setSelectedQuestionIds([]);

    const targetLevel: SchoolLevel = initialScope?.level || 'SD';
    const targetGrade: string = initialScope?.grade || (targetLevel === 'SD' ? 'Kelas 1' : 'Kelas 7');
    const targetPhase: Phase = initialScope?.grade ? getPhaseForGrade(initialScope.grade) : (targetLevel === 'SD' ? 'A' : 'D');
    const targetAssessment: AssessmentType = parseAssessmentType(initialScope?.assessment);

    const targetSubId = findMatchingSubjectId(availableSubjects, initialScope?.subject, targetLevel);

    setNewLevel(targetLevel);
    setNewPhase(targetPhase);
    setNewGrade(targetGrade);
    setNewSubjectId(targetSubId);
    setNewAssessmentType(targetAssessment);
    setNewDuration(60);
    setRandomizeQuestions(true);
    setRandomizeOptions(true);

    const subObj = availableSubjects.find(s => s.id === targetSubId);
    const subName = subObj?.name || initialScope?.subject || 'Bahasa Indonesia';
    const asmtLabel = getAssessmentLabel(targetAssessment);
    setNewTitle(`${asmtLabel} ${subName} ${targetGrade} ${targetLevel}`);

    setShowCreatePackageModal(true);
  };

  // Filter subjects for assembly modal strictly by Level (SD / SMP)
  const filteredSubjectsForAssembly = availableSubjects.filter(s => s.level === newLevel);

  // Filter questions for assembly modal strictly by Level, Phase, Subject, and Grade
  const filteredQuestionsForAssembly = questions.filter(q => {
    const matchLevel = !q.level || q.level === newLevel;
    const matchPhase = !q.phase || q.phase === newPhase;

    // Check subject matching by subject_id or subject_name or initialScope
    const selectedSub = availableSubjects.find(s => s.id === newSubjectId);
    const subName = (selectedSub?.name || initialScope?.subject || '').toLowerCase().trim();

    // Single Source of Truth: Determine effective subject ID & names from question or parent blueprint
    const effectiveSubjectId = (
      q.blueprint_item?.blueprint?.subject_id ||
      q.subject_id ||
      (q.blueprint_item as any)?.subject_id
    );

    const effectiveSubNames = [
      q.blueprint_item?.blueprint?.subject?.name,
      q.blueprint_item?.subject_name,
      q.subject_name,
      q.subject?.name
    ].filter(Boolean).map(s => (s as string).toLowerCase().trim());

    // Strict subject match: Must match either the subject ID or exact normalized subject name
    // Never allow permissive empty match (!q.subject_id) to prevent cross-subject contamination
    let matchSubject = false;
    if (newSubjectId && effectiveSubjectId) {
      matchSubject = (
        effectiveSubjectId === newSubjectId ||
        toValidUUID(effectiveSubjectId) === toValidUUID(newSubjectId)
      );
    }

    if (!matchSubject && subName && effectiveSubNames.length > 0) {
      matchSubject = effectiveSubNames.some(name => {
        if (name === subName) return true;
        const norm = (s: string) => s.replace(/[\(\)\-\/]/g, ' ').replace(/\s+/g, ' ').trim();
        return norm(name) === norm(subName);
      });
    }

    // Match Grade if question has grade_class
    const matchGrade = !q.grade_class || !newGrade || 
      q.grade_class.toLowerCase().replace(/\s+/g, '') === newGrade.toLowerCase().replace(/\s+/g, '') ||
      q.grade_class.toLowerCase().includes(newGrade.toLowerCase());

    // Match Assessment Type if question has assessment_type
    const qAsmt = q.assessment_type || q.blueprint_item?.assessment_type;
    const matchAssessment = !qAsmt || !newAssessmentType || 
      qAsmt.toString().toLowerCase().includes(newAssessmentType.toLowerCase()) ||
      newAssessmentType.toLowerCase().includes(qAsmt.toString().toLowerCase());

    const isQuestionArchived = Boolean(
      q.blueprint_item?.blueprint?.title?.startsWith('[ARSIP]') ||
      (typeof q.subject_name === 'string' && q.subject_name.startsWith('[ARSIP]'))
    );
    if (!includeArchivedQuestions && isQuestionArchived) return false;

    return matchLevel && matchPhase && matchSubject && matchGrade && matchAssessment;
  });

  // Step 1: Change Level -> strictly cascade Phase, Grade, Subject, Questions, Title
  const handleLevelChange = (lvl: SchoolLevel) => {
    setNewLevel(lvl);
    const defaultPhase: Phase = lvl === 'SD' ? 'C' : 'D';
    setNewPhase(defaultPhase);
    const grades = getGradesForPhase(defaultPhase);
    const defaultGrade = lvl === 'SD' ? 'Kelas 6' : 'Kelas 7';
    setNewGrade(defaultGrade);

    const relevantSubs = availableSubjects.filter(s => s.level === lvl);
    const mathSub = relevantSubs.find(s => s.name.toLowerCase().includes('matematika'));
    const defaultSubId = mathSub?.id || relevantSubs[0]?.id || '';
    if (defaultSubId) setNewSubjectId(defaultSubId);

    setSelectedQuestionIds([]);
    setNewTitle(computeSuggestedTitle(newAssessmentType, defaultSubId, defaultGrade, lvl));
  };

  // Step 2: Change Phase -> updates Grade options, resets Questions, updates Title
  const handlePhaseChange = (phase: Phase) => {
    setNewPhase(phase);
    const grades = getGradesForPhase(phase);
    const defaultGrade = grades[0] || 'Kelas 1';
    setNewGrade(defaultGrade);
    setSelectedQuestionIds([]);
    setNewTitle(computeSuggestedTitle(newAssessmentType, newSubjectId, defaultGrade, newLevel));
  };

  // Step 3: Change Grade -> updates Title
  const handleGradeChange = (grade: string) => {
    setNewGrade(grade);
    setNewTitle(computeSuggestedTitle(newAssessmentType, newSubjectId, grade, newLevel));
  };

  // Step 4: Change Subject -> resets Questions, updates Title
  const handleSubjectChange = (subId: string) => {
    setNewSubjectId(subId);
    setSelectedQuestionIds([]);
    setNewTitle(computeSuggestedTitle(newAssessmentType, subId, newGrade, newLevel));
  };

  // Step 5: Change Assessment -> updates Title
  const handleAssessmentChange = (asmt: AssessmentType) => {
    setNewAssessmentType(asmt);
    setNewTitle(computeSuggestedTitle(asmt, newSubjectId, newGrade, newLevel));
  };

  // Reset title to suggested
  const applySuggestedTitle = () => {
    setNewTitle(computeSuggestedTitle(newAssessmentType, newSubjectId, newGrade, newLevel));
  };

  // Auto-fill from published package (Template)
  const handleSelectTemplatePackage = (pkgId: string) => {
    setSelectedTemplatePackageId(pkgId);
    if (!pkgId) return;

    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
      setNewTitle(`${pkg.title} (Salinan)`);
      setNewLevel(pkg.level);
      setNewPhase(pkg.phase);
      const grades = getGradesForPhase(pkg.phase);
      setNewGrade(grades[0] || 'Kelas 1');

      if (pkg.subject_id) setNewSubjectId(pkg.subject_id);
      if (pkg.assessment_type) setNewAssessmentType(pkg.assessment_type);
      if (pkg.duration_minutes) setNewDuration(pkg.duration_minutes);
      setRandomizeQuestions(Boolean(pkg.randomize_questions));
      setRandomizeOptions(Boolean(pkg.randomize_options));

      // Get questions in this package
      const pkgStats = packageQuestionsMap[pkg.id];
      if (pkgStats && pkgStats.questions && pkgStats.questions.length > 0) {
        setSelectedQuestionIds(pkgStats.questions.map(q => q.id));
      } else {
        setSelectedQuestionIds([]);
      }
    }
  };

  // Session Form State (Jadwal Tanggal, Jam & Multi-Sekolah)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [sessionSchoolSearch, setSessionSchoolSearch] = useState('');
  const [sessionRegionFilter, setSessionRegionFilter] = useState('');
  const [sessionStartDate, setSessionStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionEndDate, setSessionEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionStartTime, setSessionStartTime] = useState('08:00');
  const [sessionEndTime, setSessionEndTime] = useState('16:00');
  const [tokenCode, setTokenCode] = useState('SASI26');
  const [isSessionModalFullscreen, setIsSessionModalFullscreen] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<string | null>(null);
  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Helper for Session Schedule Status
  const getSessionScheduleStatus = (session: ExamSession) => {
    if (!session.is_active) {
      return {
        status: 'closed',
        label: 'Ditutup Manual',
        color: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    }
    const now = new Date();
    const start = session.start_time ? new Date(session.start_time) : null;
    const end = session.end_time ? new Date(session.end_time) : null;

    if (start && now < start) {
      return {
        status: 'scheduled',
        label: 'Terjadwal (Belum Buka)',
        color: 'bg-amber-50 text-amber-800 border-amber-300',
        dot: 'bg-amber-500 animate-pulse'
      };
    }
    if (end && now > end) {
      return {
        status: 'expired',
        label: 'Kadaluwarsa (Waktu Habis)',
        color: 'bg-slate-100 text-slate-600 border-slate-300',
        dot: 'bg-slate-400'
      };
    }
    return {
      status: 'active',
      label: 'Sesi Aktif (Berlangsung)',
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      dot: 'bg-emerald-500 animate-pulse'
    };
  };

  const formatScheduleDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      return new Date(isoStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return isoStr;
    }
  };

  const formatScheduleTime = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WIB`;
    } catch (e) {
      return isoStr;
    }
  };

  // Group sessions by token_code to avoid card explosion in UI (multi-sekolah dalam 1 kartu)
  const groupedSessions = useMemo(() => {
    const map = new Map<string, { session: ExamSession; schools: School[]; sessionIds: string[] }>();
    sessions.forEach(s => {
      const key = s.token_code || s.id;
      if (!map.has(key)) {
        map.set(key, {
          session: s,
          schools: s.school ? [s.school] : [],
          sessionIds: [s.id]
        });
      } else {
        const item = map.get(key)!;
        item.sessionIds.push(s.id);
        if (s.school && !item.schools.some(sch => sch.id === s.school?.id)) {
          item.schools.push(s.school);
        }
      }
    });
    return Array.from(map.values());
  }, [sessions]);

  // Session Panel Collapsible & View Mode States
  const [isSessionPanelCollapsed, setIsSessionPanelCollapsed] = useState<boolean>(false);
  const [sessionViewMode, setSessionViewMode] = useState<'grid' | 'table'>('grid');
  const [sessionArchiveTab, setSessionArchiveTab] = useState<'active' | 'archived'>('active');
  const [sessionSearchTerm, setSessionSearchTerm] = useState<string>('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [sessionCurrentPage, setSessionCurrentPage] = useState<number>(1);

  const activeSessionsCount = useMemo(() => groupedSessions.filter(g => !isSessionArchived(g.session)).length, [groupedSessions]);
  const archivedSessionsCount = useMemo(() => groupedSessions.filter(g => isSessionArchived(g.session)).length, [groupedSessions]);

  // Filtered Grouped Sessions
  const filteredGroupedSessions = useMemo(() => {
    return groupedSessions.filter(group => {
      const s = group.session;
      const isArchived = isSessionArchived(s);
      if (sessionArchiveTab === 'active' && isArchived) return false;
      if (sessionArchiveTab === 'archived' && !isArchived) return false;

      const term = sessionSearchTerm.toLowerCase().trim();
      const matchSearch = !term ||
        (s.session_name || '').toLowerCase().includes(term) ||
        (s.token_code || '').toLowerCase().includes(term) ||
        group.schools.some(sch => sch.name.toLowerCase().includes(term));

      const matchStatus = 
        sessionStatusFilter === 'ALL' ||
        (sessionStatusFilter === 'ACTIVE' && s.is_active) ||
        (sessionStatusFilter === 'CLOSED' && !s.is_active);

      return matchSearch && matchStatus;
    });
  }, [groupedSessions, sessionArchiveTab, sessionSearchTerm, sessionStatusFilter]);

  const SESSIONS_PER_PAGE = sessionViewMode === 'grid' ? 6 : 10;
  const totalSessionPages = Math.max(1, Math.ceil(filteredGroupedSessions.length / SESSIONS_PER_PAGE));
  const paginatedGroupedSessions = useMemo(() => {
    const start = (sessionCurrentPage - 1) * SESSIONS_PER_PAGE;
    return filteredGroupedSessions.slice(start, start + SESSIONS_PER_PAGE);
  }, [filteredGroupedSessions, sessionCurrentPage, SESSIONS_PER_PAGE]);

  useEffect(() => {
    setSessionCurrentPage(1);
  }, [sessionSearchTerm, sessionStatusFilter, sessionViewMode, sessionArchiveTab]);

  // Filtered Schools strictly by Package Level (SD only shows SD, SMP only shows SMP) and search/region filters
  const filteredSchoolsForSession = useMemo(() => {
    if (!selectedPackageForSession?.level) return [];
    return schools.filter(s => {
      const matchLevel = s.level === selectedPackageForSession.level;
      const matchSearch = !sessionSchoolSearch || 
        s.name.toLowerCase().includes(sessionSchoolSearch.toLowerCase()) || 
        s.npsn.includes(sessionSchoolSearch);
      const matchRegion = !sessionRegionFilter || 
        (s.district && s.district.toLowerCase().includes(sessionRegionFilter.toLowerCase()));
      return matchLevel && matchSearch && matchRegion;
    });
  }, [schools, selectedPackageForSession, sessionSchoolSearch, sessionRegionFilter]);

  // Distinct region names of the relevant schools
  const distinctSessionRegions = useMemo(() => {
    if (!selectedPackageForSession?.level) return [];
    const lvlSchools = schools.filter(s => s.level === selectedPackageForSession.level);
    return Array.from(new Set(lvlSchools.map(s => s.district).filter(Boolean)));
  }, [schools, selectedPackageForSession]);

  // Multi-school checkbox toggle
  const toggleSchoolSelection = (schoolId: string) => {
    if (selectedSchoolIds.includes(schoolId)) {
      if (selectedSchoolIds.length === 1) {
        notify('Minimal 1 sekolah wajib dipilih.');
        return;
      }
      setSelectedSchoolIds(selectedSchoolIds.filter(id => id !== schoolId));
    } else {
      setSelectedSchoolIds([...selectedSchoolIds, schoolId]);
    }
  };

  const handleSelectAllSchools = () => {
    const idsToAdd = filteredSchoolsForSession.map(s => s.id);
    setSelectedSchoolIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
  };

  const handleClearAllSchools = () => {
    if (filteredSchoolsForSession.length > 0) {
      setSelectedSchoolIds([filteredSchoolsForSession[0].id]);
    }
  };

  // Generate random 6-character uppercase alphanumeric token
  const generateNewToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTokenCode(res);
  };

  // Copy token to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify(`Token "${text}" disalin ke clipboard!`);
  };

  // Copy direct student CBT link
  const handleCopyStudentLink = (token: string) => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://sistem-asesmen-sekolah-indonesia.vercel.app';
    const link = `${currentOrigin}/#token=${token}`;
    navigator.clipboard.writeText(link);
    notify(`Tautan siswa disalin: ${link}`);
  };

  // Filtered packages
  const handleArchivePackage = async (pkg: ExamPackage) => {
    const clean = getCleanPackageTitle(pkg.title);
    if (!confirm(`Arsipkan paket ujian "${clean}"?\nPaket akan dipindahkan ke Kotak Arsip dan disembunyikan dari lembar kerja aktif.`)) return;
    const ok = await archivePackageInDb(pkg.id, pkg.title);
    if (ok) {
      const newTitle = `[ARSIP] ${clean}`;
      const updated = packages.map(p => p.id === pkg.id ? { ...p, title: newTitle, is_archived: true } : p);
      setPackages(updated);
      try { localStorage.setItem(PKG_STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
      notify(`Paket ujian "${clean}" berhasil diarsipkan.`);
    } else {
      notify('Gagal mengarsipkan paket ujian.');
    }
  };

  const handleRestorePackage = async (pkg: ExamPackage) => {
    const clean = getCleanPackageTitle(pkg.title);
    const ok = await restorePackageInDb(pkg.id, pkg.title);
    if (ok) {
      const updated = packages.map(p => p.id === pkg.id ? { ...p, title: clean, is_archived: false } : p);
      setPackages(updated);
      try { localStorage.setItem(PKG_STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
      notify(`Paket ujian "${clean}" berhasil dipulihkan ke lembar kerja aktif.`);
    } else {
      notify('Gagal memulihkan paket ujian.');
    }
  };

  const activePackagesCount = useMemo(() => packages.filter(p => !isPackageArchived(p)).length, [packages]);
  const archivedPackagesCount = useMemo(() => packages.filter(p => isPackageArchived(p)).length, [packages]);

  const filteredPackages = packages.filter(pkg => {
    const isArchived = isPackageArchived(pkg);
    if (packageArchiveTab === 'active' && isArchived) return false;
    if (packageArchiveTab === 'archived' && !isArchived) return false;

    const matchLevel = levelFilter === 'ALL' || pkg.level === levelFilter;
    const matchAssessment = assessmentFilter === 'ALL' || pkg.assessment_type === assessmentFilter;
    const matchSearch = pkg.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSubject = !initialScope?.subject || 
      pkg.title.toLowerCase().includes(initialScope.subject.toLowerCase()) ||
      (pkg.subject?.name && pkg.subject.name.toLowerCase().includes(initialScope.subject.toLowerCase()));
    const matchPhase = !initialScope?.isLocked || !initialScope?.grade || pkg.phase === getPhaseForGrade(initialScope.grade);

    return matchLevel && matchAssessment && matchSearch && matchSubject && matchPhase;
  });

  // Handle Question toggle in Package Assembly
  const toggleQuestionSelection = (qId: string) => {
    if (selectedQuestionIds.includes(qId)) {
      setSelectedQuestionIds(selectedQuestionIds.filter(id => id !== qId));
    } else {
      setSelectedQuestionIds([...selectedQuestionIds, qId]);
    }
  };

  // Open session modal for specific package (Create Mode)
  const handleOpenSessionModal = (pkg: ExamPackage) => {
    setEditingSessionId(null);
    setSelectedPackageForSession(pkg);
    setSessionName(`Sesi Ujian - ${pkg.title}`);
    generateNewToken();

    // Reset school filters
    setSessionSchoolSearch('');
    setSessionRegionFilter('');

    // Auto-select all schools matching that package level
    const matchingSchools = schools.filter(s => s.level === pkg.level);
    setSelectedSchoolIds(matchingSchools.map(s => s.id));

    const todayStr = new Date().toISOString().split('T')[0];
    setSessionStartDate(todayStr);
    setSessionEndDate(todayStr);
    setSessionStartTime('08:00');
    setSessionEndTime('16:00');

    setShowCreateSessionModal(true);
  };

  // Open session modal for editing schedule (Edit Mode)
  const handleOpenEditSessionModal = (session: ExamSession, relatedSchools: School[]) => {
    setEditingSessionId(session.id);
    const pkg = session.package || packages.find(p => p.id === session.package_id) || null;
    setSelectedPackageForSession(pkg);
    setSessionName(session.session_name);
    setTokenCode(session.token_code);

    // Reset school filters
    setSessionSchoolSearch('');
    setSessionRegionFilter('');

    if (session.start_time) {
      const sDate = new Date(session.start_time);
      setSessionStartDate(sDate.toISOString().split('T')[0]);
      const sH = String(sDate.getHours()).padStart(2, '0');
      const sM = String(sDate.getMinutes()).padStart(2, '0');
      setSessionStartTime(`${sH}:${sM}`);
    }
    if (session.end_time) {
      const eDate = new Date(session.end_time);
      setSessionEndDate(eDate.toISOString().split('T')[0]);
      const eH = String(eDate.getHours()).padStart(2, '0');
      const eM = String(eDate.getMinutes()).padStart(2, '0');
      setSessionEndTime(`${eH}:${eM}`);
    }

    if (relatedSchools && relatedSchools.length > 0) {
      setSelectedSchoolIds(relatedSchools.map(s => s.id));
    } else if (session.school_id) {
      setSelectedSchoolIds([session.school_id]);
    }

    setShowCreateSessionModal(true);
  };

  // Delete Package (Safeguarded: Only allowed if no sessions exist)
  const handleDeletePackage = async (packageId: string) => {
    const hasSess = sessions.some(s => s.package_id === packageId || s.package?.id === packageId);
    if (hasSess) {
      alert('Paket ujian ini memiliki riwayat sesi CBT dan tidak dapat dihapus permanen demi menjaga keutuhan riwayat nilai siswa.');
      return;
    }
    if (!confirm('Apakah Anda yakin ingin menghapus permanen paket ujian draf ini? Seluruh pemetaan butir soal dalam paket ini juga akan dihapus.')) return;
    try {
      await supabase.from('exam_package_questions').delete().eq('package_id', packageId);
      await supabase.from('exam_packages').delete().eq('id', packageId);
      const updated = packages.filter(p => p.id !== packageId);
      setPackages(updated);
      try { localStorage.setItem(PKG_STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
      notify('Paket ujian berhasil dihapus permanen.');
    } catch (e) {
      notify('Gagal menghapus paket ujian.');
    }
  };

  // Archive Session (Soft-Archive Sesi Ujian)
  const handleArchiveSession = async (tokenCodeToArchive: string, currentSessionName: string) => {
    const clean = getCleanSessionName(currentSessionName);
    if (!confirm(`Arsipkan sesi ujian "${clean}" (Token: ${tokenCodeToArchive})?\nSesi akan dipindahkan ke Kotak Arsip dan dinonaktifkan tanpa menghapus riwayat nilai siswa.`)) return;
    try {
      const ok = await archiveSessionInDb(tokenCodeToArchive, currentSessionName);
      if (ok) {
        const newName = `[ARSIP] ${clean}`;
        const updated = sessions.map(s => s.token_code === tokenCodeToArchive ? { ...s, session_name: newName, is_active: false, is_archived: true } : s);
        setSessions(updated);
        try { localStorage.setItem(SES_STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
        notify(`Sesi ujian "${clean}" berhasil diarsipkan.`);
      } else {
        notify('Gagal mengarsipkan sesi ujian.');
      }
    } catch (e) {
      notify('Terjadi kesalahan saat mengarsipkan sesi ujian.');
    }
  };

  // Restore Session (Pulihkan Sesi Ujian dari Kotak Arsip)
  const handleRestoreSession = async (tokenCodeToRestore: string, currentSessionName: string) => {
    const clean = getCleanSessionName(currentSessionName);
    try {
      const ok = await restoreSessionInDb(tokenCodeToRestore, currentSessionName);
      if (ok) {
        const updated = sessions.map(s => s.token_code === tokenCodeToRestore ? { ...s, session_name: clean, is_archived: false } : s);
        setSessions(updated);
        try { localStorage.setItem(SES_STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
        notify(`Sesi ujian "${clean}" berhasil dipulihkan ke sesi aktif.`);
      } else {
        notify('Gagal memulihkan sesi ujian.');
      }
    } catch (e) {
      notify('Terjadi kesalahan saat memulihkan sesi ujian.');
    }
  };

  // Regenerate Session Token
  const handleRegenerateToken = async (oldTokenCode: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newToken = '';
    for (let i = 0; i < 6; i++) {
      newToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({
          token_code: newToken
        })
        .eq('token_code', oldTokenCode);

      if (error) {
        console.error('Error updating token in Supabase:', error);
        notify('Gagal memperbarui token di server cloud.');
        return;
      }
      const updated = sessions.map(s => s.token_code === oldTokenCode ? { ...s, token_code: newToken } : s);
      setSessions(updated);
      try { localStorage.setItem(SES_STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
      notify(`Token baru berhasil dirilis: ${newToken}`);
    } catch (e) {
      notify('Gagal memperbarui token.');
    }
  };

  // Toggle Session Active Status (Buka / Tutup Sesi)
  const handleToggleSessionActive = async (tokenCode: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      // Update langsung ke Supabase Cloud berbasis token_code agar seluruh sekolah serentak terupdate
      const { error } = await supabase
        .from('exam_sessions')
        .update({
          is_active: newStatus
        })
        .eq('token_code', tokenCode);

      if (error) {
        console.error('Error updating session active status in Supabase:', error);
        notify('Gagal memperbarui status sesi di server cloud.');
        return;
      }

      const updated = sessions.map(s => s.token_code === tokenCode ? { ...s, is_active: newStatus } : s);
      setSessions(updated);
      try { localStorage.setItem(SES_STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
      notify(newStatus ? 'Sesi ujian telah diaktifkan kembali!' : 'Sesi ujian telah ditutup / dijeda.');
    } catch (e) {
      notify('Gagal mengubah status sesi ujian.');
    }
  };

  // Save new Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      notify('Judul paket wajib diisi.');
      return;
    }
    if (selectedQuestionIds.length === 0) {
      notify('Pilih minimal 1 butir soal untuk dirakit ke dalam paket.');
      return;
    }

    const packageId = generateValidUUID();
    const validSubjectId = toValidUUID(newSubjectId);
    const sub = availableSubjects.find(s => s.id === newSubjectId) || MOCK_SUBJECTS.find(s => s.id === newSubjectId);
    
    const newPkg: ExamPackage = {
      id: packageId,
      blueprint_id: null,
      title: newTitle.trim(),
      subject_id: validSubjectId,
      subject: sub,
      level: newLevel,
      phase: newPhase,
      assessment_type: newAssessmentType,
      duration_minutes: newDuration,
      randomize_questions: randomizeQuestions,
      randomize_options: randomizeOptions,
      created_at: new Date().toISOString()
    };

    // Upsert into Supabase Cloud
    await safeSupabaseUpsert('exam_packages', {
      id: packageId,
      blueprint_id: newPkg.blueprint_id,
      title: newPkg.title,
      subject_id: validSubjectId,
      level: newPkg.level,
      phase: newPkg.phase,
      assessment_type: newPkg.assessment_type,
      duration_minutes: newPkg.duration_minutes,
      randomize_questions: newPkg.randomize_questions,
      randomize_options: newPkg.randomize_options
    });

    // Insert package questions mapping
    for (let idx = 0; idx < selectedQuestionIds.length; idx++) {
      const qid = selectedQuestionIds[idx];
      await safeSupabaseUpsert('exam_package_questions', {
        id: generateValidUUID(),
        package_id: packageId,
        question_id: toValidUUID(qid),
        order_number: idx + 1
      });
    }

    // Update packageQuestionsMap in local state
    const selectedQObjects = questions.filter(q => selectedQuestionIds.includes(q.id));
    const totalW = selectedQObjects.reduce((acc, q) => acc + (q.weight || 1), 0);
    setPackageQuestionsMap(prev => ({
      ...prev,
      [packageId]: {
        count: selectedQuestionIds.length,
        totalWeight: totalW,
        questions: selectedQObjects
      }
    }));

    const updatedPackages = [newPkg, ...packages];
    setPackages(updatedPackages);
    try {
      localStorage.setItem(PKG_STORAGE_KEY, JSON.stringify(updatedPackages));
    } catch (e) {}

    setShowCreatePackageModal(false);
    notify(`Paket "${newTitle}" berhasil dirakit dengan ${selectedQuestionIds.length} butir soal!`);

    // Reset
    setNewTitle('');
    setSelectedTemplatePackageId('');
    setSelectedQuestionIds([]);
  };

  // Save / Update Session (Multi-Sekolah & Jadwal Tanggal/Jam)
  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageForSession) return;
    if (selectedSchoolIds.length === 0) {
      notify('Pilih minimal 1 sekolah penyelenggara.');
      return;
    }

    const startDateTime = new Date(`${sessionStartDate}T${sessionStartTime}:00`);
    const endDateTime = new Date(`${sessionEndDate}T${sessionEndTime}:00`);

    if (endDateTime <= startDateTime) {
      notify('Jam tutup harus lebih besar dari jam buka pada rentang tanggal tersebut.');
      return;
    }

    const startISO = startDateTime.toISOString();
    const endISO = endDateTime.toISOString();
    const cleanToken = tokenCode.trim().toUpperCase();
    const validPkgId = toValidUUID(selectedPackageForSession.id);

    // Proteksi Kolisi Token: Cegah pembuatan 2 sesi aktif dengan token yang sama di sekolah yang sama
    if (!editingSessionId) {
      const tokenConflict = sessions.find(s => 
        (s.token_code || '').trim().toUpperCase() === cleanToken &&
        s.is_active &&
        selectedSchoolIds.some(schId => toValidUUID(schId) === s.school_id)
      );
      if (tokenConflict) {
        notify(`Token "${cleanToken}" sudah aktif digunakan oleh sesi "${tokenConflict.session_name}". Silakan acak atau gunakan kode token lain.`);
        return;
      }
    }

    try {
      if (editingSessionId) {
        // Edit mode: re-insert or update rows for each selected school sharing this token
        await supabase.from('exam_sessions').delete().eq('token_code', cleanToken);

        const updatedItems: ExamSession[] = [];
        for (const schId of selectedSchoolIds) {
          const sch = schools.find(s => s.id === schId) || schools[0];
          const newId = generateValidUUID();
          const newSes: ExamSession = {
            id: newId,
            package_id: validPkgId,
            package: selectedPackageForSession,
            school_id: toValidUUID(schId),
            school: sch,
            session_name: sessionName,
            token_code: cleanToken,
            start_time: startISO,
            end_time: endISO,
            is_active: true,
            created_at: new Date().toISOString()
          };
          updatedItems.push(newSes);

          await safeSupabaseUpsert('exam_sessions', {
            id: newId,
            package_id: validPkgId,
            school_id: toValidUUID(schId),
            session_name: newSes.session_name,
            token_code: cleanToken,
            start_time: startISO,
            end_time: endISO,
            is_active: true
          });
        }

        const remaining = sessions.filter(s => s.token_code !== cleanToken);
        const allUpdated = [...updatedItems, ...remaining];
        setSessions(allUpdated);
        try { localStorage.setItem(SES_STORAGE_KEY, JSON.stringify(allUpdated)); } catch (e) {}

        notify(`Jadwal sesi dan token "${cleanToken}" berhasil diperbarui untuk ${selectedSchoolIds.length} sekolah!`);
      } else {
        // Create mode: insert for each selected school
        const newSessionItems: ExamSession[] = [];
        for (const schId of selectedSchoolIds) {
          const sch = schools.find(s => s.id === schId) || schools[0];
          const newId = generateValidUUID();
          const newSes: ExamSession = {
            id: newId,
            package_id: validPkgId,
            package: selectedPackageForSession,
            school_id: toValidUUID(schId),
            school: sch,
            session_name: sessionName,
            token_code: cleanToken,
            start_time: startISO,
            end_time: endISO,
            is_active: true,
            created_at: new Date().toISOString()
          };
          newSessionItems.push(newSes);

          await safeSupabaseUpsert('exam_sessions', {
            id: newId,
            package_id: validPkgId,
            school_id: toValidUUID(schId),
            session_name: newSes.session_name,
            token_code: cleanToken,
            start_time: startISO,
            end_time: endISO,
            is_active: true
          });
        }

        const allUpdated = [...newSessionItems, ...sessions];
        setSessions(allUpdated);
        try { localStorage.setItem(SES_STORAGE_KEY, JSON.stringify(allUpdated)); } catch (e) {}

        notify(`Sesi ujian berhasil diterbitkan untuk ${selectedSchoolIds.length} sekolah! Token: ${cleanToken}`);
      }

      setShowCreateSessionModal(false);
    } catch (err) {
      notify('Terjadi kesalahan saat menyimpan sesi ujian.');
    }
  };

  // Calculate Cognitive Level Breakdown of selected questions in Assembly Modal
  const selectedQuestionsData = questions.filter(q => selectedQuestionIds.includes(q.id));
  const totalSelectedWeight = selectedQuestionsData.reduce((acc, q) => acc + (q.weight || 0), 0);

  return (
    <div className="space-y-7 animate-fade-in">
      
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-sm font-bold animate-slide-left">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-indigo-900 rounded-3xl p-7 sm:p-9 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <Layers className="w-80 h-80 text-white" />
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-brand-500/30 text-brand-200 text-xs font-black uppercase tracking-wider backdrop-blur-xs mb-3 border border-brand-400/20">
            <Package className="w-4 h-4 text-brand-300" />
            <span>Modul Perakitan Asesmen Standar Nasional</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Perakitan Paket Ujian & Manajemen Sesi CBT
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed max-w-2xl">
            Rakit bank soal terverifikasi ke dalam paket ujian (Formatif, PTS, SAS, SAT, SAJ) untuk seluruh jenjang SD (Fase A, B, C) dan SMP (Fase D), serta terbitkan Sesi Ujian & Token resmi proktor.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleOpenCreatePackageModal}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-sky-500 text-white text-sm font-black tracking-wide shadow-xl shadow-brand-500/30 hover:from-brand-600 hover:to-sky-600 transition-all flex items-center space-x-2 transform active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>Rakit Paket Ujian Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Exam Sessions Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-4">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900">Sesi Ujian & Token CBT Aktif</h2>
                <span className="text-xs font-black px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{groupedSessions.length} Sesi Terbit</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Token berikut dapat dibagikan kepada proktor atau diinput siswa di halaman CBT</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* View Mode Toggle: Grid vs Table */}
            {!isSessionPanelCollapsed && groupedSessions.length > 0 && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setSessionViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    sessionViewMode === 'grid'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilan Kartu Visual"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSessionViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                    sessionViewMode === 'table'
                      ? 'bg-white text-brand-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilan Tabel Kompak (Muat Banyak Sesi)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Collapsible Panel Button */}
            <button
              type="button"
              onClick={() => setIsSessionPanelCollapsed(!isSessionPanelCollapsed)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center space-x-1.5 border border-slate-200 transition-all"
              title={isSessionPanelCollapsed ? "Buka Tampilan Kartu Sesi" : "Ciutkan Panel Sesi agar Lembar Kerja Luas"}
            >
              {isSessionPanelCollapsed ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronUp className="w-4 h-4 text-slate-600" />}
              <span>{isSessionPanelCollapsed ? 'Buka Panel Sesi' : 'Ciutkan Panel'}</span>
            </button>
          </div>
        </div>

        {/* Collapsed State Summary Bar */}
        {isSessionPanelCollapsed ? (
          <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Panel Sesi Diciutkan: <strong>{groupedSessions.length} Sesi Aktif</strong></span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 font-medium">Token Cepat:</span>
              <div className="flex flex-wrap gap-1.5">
                {groupedSessions.slice(0, 5).map(g => (
                  <button
                    key={g.session.token_code}
                    type="button"
                    onClick={() => copyToClipboard(g.session.token_code)}
                    className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-brand-300 font-mono font-bold hover:bg-slate-800 transition-colors flex items-center space-x-1"
                    title={`Klik untuk menyalin token ${g.session.token_code} (${g.session.session_name})`}
                  >
                    <span>{g.session.token_code}</span>
                    <Copy className="w-2.5 h-2.5 opacity-60" />
                  </button>
                ))}
                {groupedSessions.length > 5 && (
                  <span className="text-slate-500 font-bold self-center">+{groupedSessions.length - 5} lainnya</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSessionPanelCollapsed(false)}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 self-end md:self-auto"
            >
              <span>Lihat Detail Sesi</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            {/* Filter & Search Bar for Sessions (if sessions exist) */}
            {groupedSessions.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2.5 flex-1">
                  
                  {/* Archive Tab Switcher for Sessions */}
                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSessionArchiveTab('active')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center space-x-1 ${
                        sessionArchiveTab === 'active'
                          ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>Sesi Aktif ({activeSessionsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionArchiveTab('archived')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center space-x-1 ${
                        sessionArchiveTab === 'archived'
                          ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Archive className="w-3 h-3 text-amber-600" />
                      <span>Kotak Arsip ({archivedSessionsCount})</span>
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative min-w-[200px] max-w-sm flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari sesi, sekolah, atau token..."
                      value={sessionSearchTerm}
                      onChange={e => setSessionSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  {/* Status Filter (only in active tab) */}
                  {sessionArchiveTab === 'active' && (
                    <select
                      value={sessionStatusFilter}
                      onChange={e => setSessionStatusFilter(e.target.value as any)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="ACTIVE">Sedang Berlangsung / Aktif</option>
                      <option value="CLOSED">Ditutup / Dijeda</option>
                    </select>
                  )}
                </div>

                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
                  {filteredGroupedSessions.length} dari {sessionArchiveTab === 'active' ? activeSessionsCount : archivedSessionsCount} Sesi Ditampilkan
                </span>
              </div>
            )}

            {filteredGroupedSessions.length === 0 ? (
              <div className="py-10 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 mt-2 space-y-2">
                <Key className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700 text-sm">
                  {sessionArchiveTab === 'archived'
                    ? 'Kotak Arsip Sesi Kosong'
                    : groupedSessions.length === 0 
                      ? 'Belum Ada Sesi Ujian yang Dibuka' 
                      : 'Tidak Ada Sesi yang Cocok dengan Filter'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {sessionArchiveTab === 'archived'
                    ? 'Belum ada sesi ujian yang dipindahkan ke arsip.'
                    : groupedSessions.length === 0 
                      ? 'Klik tombol "Buka Sesi" pada salah satu paket ujian terbit di bawah untuk merilis token resmi kepada siswa.'
                      : 'Coba ubah kata kunci pencarian atau ganti filter status di atas.'}
                </p>
              </div>
            ) : sessionViewMode === 'grid' ? (
              /* ================= MODE 1: GRID KARTU (PAGINATED) ================= */
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  {paginatedGroupedSessions.map(group => {
                    const s = group.session;
                    const statusObj = getSessionScheduleStatus(s);

                    return (
                      <div 
                        key={s.token_code || s.id} 
                        className={`p-5 rounded-3xl border transition-all space-y-3.5 relative group shadow-2xs hover:shadow-md ${
                          s.is_active 
                            ? 'border-slate-200 hover:border-brand-400 bg-slate-50/50 hover:bg-white' 
                            : 'border-slate-200 bg-slate-100/60 opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-brand-100 text-brand-800 uppercase border border-brand-200">
                                {s.package?.assessment_type || 'SAS'}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusObj.color}`}>
                                {statusObj.label}
                              </span>
                              {isSessionArchived(s) && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  Arsip
                                </span>
                              )}
                            </div>
                            <h3 className="font-extrabold text-base text-slate-900 mt-2 line-clamp-1">{getCleanSessionName(s.session_name)}</h3>
                            <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-1 font-semibold" title={group.schools.map(sch => sch.name).join(', ')}>
                              <SchoolIcon className="w-4 h-4 text-brand-600 shrink-0" />
                              <span className="line-clamp-1">
                                {group.schools.length > 1 
                                  ? `${group.schools[0]?.name} (+${group.schools.length - 1} Sekolah Lain)`
                                  : group.schools[0]?.name || 'Sekolah Terdaftar'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Rentang Jadwal Pelaksanaan & Jam Operasional */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                            <span className="flex items-center space-x-1.5 text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-brand-600" />
                              <span>{formatScheduleDate(s.start_time)} s.d. {formatScheduleDate(s.end_time)}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-1.5">
                            <span className="flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              <span>Operasional: {formatScheduleTime(s.start_time)} - {formatScheduleTime(s.end_time)}</span>
                            </span>
                            <span className="text-brand-700 font-bold">
                              {s.package?.duration_minutes || 60} Menit
                            </span>
                          </div>
                        </div>

                        {/* Token Display Box */}
                        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-inner">
                          <div>
                            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider">Token Ujian Siswa</span>
                            <div className="text-2xl font-mono font-black tracking-widest text-brand-300 mt-0.5">
                              {s.token_code}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleRegenerateToken(s.token_code)}
                              className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors border border-white/10"
                              title="Acak / Rilis Token Baru"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(s.token_code)}
                              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-white/10"
                              title="Salin Token Ujian"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </button>
                          </div>
                        </div>

                        {/* Controls & Quick Actions */}
                        <div className="flex items-center justify-between gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopyStudentLink(s.token_code)}
                            className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 rounded-xl text-[11px] font-bold border border-slate-200 transition-colors flex items-center justify-center space-x-1"
                            title="Salin Tautan Langsung ke Halaman CBT Siswa"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Link Siswa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSessionModal(s, group.schools)}
                            className="py-1.5 px-2.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl text-[11px] font-bold border border-slate-200 transition-colors flex items-center space-x-1"
                            title="Ubah Tanggal, Jam, atau Perpanjang Sesi"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-600" />
                            <span>Edit</span>
                          </button>
                          {isSessionArchived(s) ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreSession(s.token_code, s.session_name)}
                              className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center space-x-1"
                              title="Pulihkan / Aktifkan Kembali Sesi Ujian"
                            >
                              <RotateCcw className="w-3 h-3 text-emerald-600" />
                              <span>Pulihkan</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleSessionActive(s.token_code, s.is_active)}
                                className={`py-1.5 px-2.5 rounded-xl text-[11px] font-bold border transition-colors flex items-center space-x-1 ${
                                  s.is_active 
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                                title={s.is_active ? "Tutup / Akhiri Sesi Ujian" : "Buka / Aktifkan Kembali Sesi Ujian"}
                              >
                                {s.is_active ? <PowerOff className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                                <span>{s.is_active ? 'Tutup' : 'Aktifkan'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchiveSession(s.token_code, s.session_name)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-slate-200 hover:border-amber-300"
                                title="Arsipkan Sesi Ujian"
                              >
                                <Archive className="w-3.5 h-3.5 text-amber-500" />
                              </button>
                            </>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ================= MODE 2: TABEL KOMPAK HIGH-DENSITY ================= */
              <div className="border-2 border-sky-300 rounded-2xl overflow-hidden shadow-xs mt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-sky-100 text-sky-950 font-black border-b-2 border-sky-300 uppercase tracking-wider text-[11px]">
                      <tr className="divide-x divide-sky-200">
                        <th className="py-2.5 px-2.5 w-12 text-center bg-sky-200/80">NO.</th>
                        <th className="py-2.5 px-3 min-w-[200px]">NAMA SESI & PAKET</th>
                        <th className="py-2.5 px-3 min-w-[180px]">SEKOLAH PENYELENGGARA</th>
                        <th className="py-2.5 px-3 min-w-[170px]">RENTANG JADWAL</th>
                        <th className="py-2.5 px-3 text-center min-w-[160px]">TOKEN SISWA</th>
                        <th className="py-2.5 px-3 text-center w-28">STATUS</th>
                        <th className="py-2.5 px-3 text-right min-w-[160px]">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-700 bg-white">
                      {paginatedGroupedSessions.map((group, idx) => {
                        const s = group.session;
                        const statusObj = getSessionScheduleStatus(s);
                        const rowNum = (sessionCurrentPage - 1) * SESSIONS_PER_PAGE + idx + 1;

                        return (
                          <tr 
                            key={s.token_code || s.id} 
                            className="divide-x divide-slate-200 hover:bg-sky-50/60 transition-colors"
                          >
                            {/* 1. Nomor Urut */}
                            <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                              {rowNum}
                            </td>

                            {/* 2. Nama Sesi & Paket */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-brand-100 text-brand-800 uppercase border border-brand-200 shrink-0">
                                  {s.package?.assessment_type || 'SAS'}
                                </span>
                                <span className="font-extrabold text-slate-900 text-xs truncate max-w-[220px]" title={s.session_name}>
                                  {getCleanSessionName(s.session_name)}
                                </span>
                                {isSessionArchived(s) && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                    Arsip
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Durasi: <strong className="text-slate-700">{s.package?.duration_minutes || 60} Menit</strong>
                              </div>
                            </td>

                            {/* 3. Sekolah */}
                            <td className="py-2.5 px-3 text-xs">
                              <div className="flex items-center space-x-1.5 text-slate-800 font-semibold truncate max-w-[200px]" title={group.schools.map(sch => sch.name).join(', ')}>
                                <SchoolIcon className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                                <span className="truncate">
                                  {group.schools.length > 1 
                                    ? `${group.schools[0]?.name} (+${group.schools.length - 1} Lainnya)`
                                    : group.schools[0]?.name || 'Sekolah Terdaftar'}
                                </span>
                              </div>
                            </td>

                            {/* 4. Jadwal */}
                            <td className="py-2.5 px-3 text-[11px]">
                              <div className="font-bold text-slate-800 flex items-center space-x-1">
                                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{formatScheduleDate(s.start_time)} - {formatScheduleDate(s.end_time)}</span>
                              </div>
                              <div className="text-slate-500 text-[10px] flex items-center space-x-1 mt-0.5">
                                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Jam: {formatScheduleTime(s.start_time)} - {formatScheduleTime(s.end_time)}</span>
                              </div>
                            </td>

                            {/* 5. Token Siswa */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center space-x-1.5 bg-slate-900 text-white px-2.5 py-1 rounded-xl shadow-2xs">
                                <span className="font-mono font-black text-sm tracking-wider text-brand-300">{s.token_code}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(s.token_code)}
                                  className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white transition-colors"
                                  title="Salin Token"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRegenerateToken(s.token_code)}
                                  className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white transition-colors"
                                  title="Rilis Token Baru"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            {/* 6. Status */}
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusObj.color}`}>
                                {statusObj.label}
                              </span>
                            </td>

                            {/* 7. Aksi */}
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopyStudentLink(s.token_code)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors"
                                  title="Salin Link Siswa"
                                >
                                  Link
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditSessionModal(s, group.schools)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors"
                                  title="Edit Jadwal"
                                >
                                  Edit
                                </button>
                                {isSessionArchived(s) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRestoreSession(s.token_code, s.session_name)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-300 transition-colors flex items-center space-x-1"
                                    title="Pulihkan / Aktifkan Kembali Sesi Ini"
                                  >
                                    <RotateCcw className="w-3 h-3 text-emerald-600" />
                                    <span>Pulihkan</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSessionActive(s.token_code, s.is_active)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                        s.is_active 
                                          ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                      }`}
                                      title={s.is_active ? "Tutup Sesi" : "Aktifkan Sesi"}
                                    >
                                      {s.is_active ? 'Tutup' : 'Aktif'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleArchiveSession(s.token_code, s.session_name)}
                                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200 hover:border-amber-300"
                                      title="Arsipkan Sesi"
                                    >
                                      <Archive className="w-3.5 h-3.5 text-amber-500" />
                                    </button>
                                  </>
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

            {/* Pagination Controls (if total pages > 1) */}
            {totalSessionPages > 1 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 font-semibold">
                  Halaman <strong className="text-slate-900">{sessionCurrentPage}</strong> dari <strong className="text-slate-900">{totalSessionPages}</strong>
                </span>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    disabled={sessionCurrentPage === 1}
                    onClick={() => setSessionCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalSessionPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setSessionCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-xl text-xs font-bold transition-all ${
                        sessionCurrentPage === pageNum
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={sessionCurrentPage === totalSessionPages}
                    onClick={() => setSessionCurrentPage(prev => Math.min(totalSessionPages, prev + 1))}
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Exam Packages Management Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Controls & Search */}
        <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-slate-900">Daftar Paket Ujian Terbit</h2>
              {initialScope?.isLocked && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700 border border-purple-200">
                  <Lock className="w-3 h-3" />
                  <span>Penugasan Penulis</span>
                </span>
              )}
            </div>
            
            {/* Archive Tab Switcher */}
            <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl mt-2 w-fit">
              <button
                type="button"
                onClick={() => setPackageArchiveTab('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                  packageArchiveTab === 'active'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Paket Aktif ({activePackagesCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setPackageArchiveTab('archived')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                  packageArchiveTab === 'archived'
                    ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Archive className="w-3.5 h-3.5 text-amber-600" />
                <span>Kotak Arsip ({archivedPackagesCount})</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {initialScope?.isLocked 
                ? `Menampilkan paket yang sesuai penugasan Anda: ${initialScope.subject || ''} • ${initialScope.grade || initialScope.level || ''} • ${initialScope.assessment || ''}`
                : "Master paket butir soal untuk didistribusikan ke sesi ujian sekolah"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari judul paket..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none w-56"
              />
            </div>

            {/* Level Filter */}
            <select
              value={levelFilter}
              disabled={Boolean(initialScope?.isLocked)}
              onChange={e => setLevelFilter(e.target.value)}
              className={`px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 ${initialScope?.isLocked ? 'bg-slate-100 cursor-not-allowed opacity-80' : ''}`}
            >
              <option value="ALL">Semua Jenjang</option>
              <option value="SD">SD (Fase A-C)</option>
              <option value="SMP">SMP (Fase D)</option>
            </select>

            {/* Assessment Type Filter */}
            <select
              value={assessmentFilter}
              disabled={Boolean(initialScope?.isLocked)}
              onChange={e => setAssessmentFilter(e.target.value)}
              className={`px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-brand-500 ${initialScope?.isLocked ? 'bg-slate-100 cursor-not-allowed opacity-80' : ''}`}
            >
              <option value="ALL">Semua Jenis Ujian</option>
              <option value="Formatif">Formatif</option>
              <option value="PTS">PTS</option>
              <option value="SAS">SAS</option>
              <option value="SAT">SAT</option>
              <option value="SAJ">SAJ</option>
            </select>
          </div>
        </div>

        {/* Table of Packages */}
        <div className="p-6 pt-0">
          <div className="overflow-x-auto border-2 border-sky-300 rounded-2xl shadow-sm">
            <table className="w-full text-left border-collapse text-xs text-slate-700">
              <thead className="bg-sky-100 text-sky-950 font-black border-b-2 border-sky-300 uppercase tracking-wider text-[11px]">
                <tr className="divide-x divide-sky-200">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">Paket Ujian</th>
                  <th className="py-3 px-4">Jenjang & Fase</th>
                  <th className="py-3 px-4">Jenis Asesmen</th>
                  <th className="py-3 px-4">Jumlah Soal & Bobot</th>
                  <th className="py-3 px-4">Durasi</th>
                  <th className="py-3 px-4">Pengacakan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPackages.map((pkg, idx) => {
                  const getAssessmentBadge = (type: AssessmentType) => {
                    switch(type) {
                      case 'Formatif': return 'bg-sky-50 text-sky-800 border-sky-300';
                      case 'PTS': return 'bg-amber-50 text-amber-800 border-amber-300';
                      case 'SAS': return 'bg-indigo-50 text-indigo-800 border-indigo-300';
                      case 'SAT': return 'bg-purple-50 text-purple-800 border-purple-300';
                      case 'SAJ': return 'bg-rose-50 text-rose-800 border-rose-300';
                      default: return 'bg-slate-50 text-slate-700 border-slate-300';
                    }
                  };

                  const pkgStats = packageQuestionsMap[pkg.id] || { count: 0, totalWeight: 0, questions: [] };
                  const displayCount = pkgStats.count > 0 ? pkgStats.count : 10;
                  const displayWeight = pkgStats.totalWeight > 0 ? pkgStats.totalWeight : (displayCount * 10);
                  const hasSess = sessions.some(s => s.package_id === pkg.id || s.package?.id === pkg.id);
                  const rowNum = idx + 1;

                  return (
                    <tr key={pkg.id} className="divide-x divide-slate-200 hover:bg-sky-50/60 transition-colors">
                      {/* 1. Nomor Urut */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                        {rowNum}
                      </td>

                      {/* 2. Paket Ujian */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-sky-100 text-brand-700 flex items-center justify-center font-bold shrink-0 border border-sky-200">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-extrabold text-slate-900 text-sm">{getCleanPackageTitle(pkg.title)}</p>
                              {isPackageArchived(pkg) && (
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  Arsip
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-brand-700 font-bold mt-0.5">
                              {pkg.subject?.name || (pkg.title.includes('Matematika') ? 'Matematika' : pkg.title.includes('Bahasa Indonesia') ? 'Bahasa Indonesia' : 'Mata Pelajaran Umum')}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 3. Jenjang & Fase */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 font-bold">
                          <span className="font-black text-slate-900 text-xs">{pkg.level}</span>
                          <span className="text-slate-300">•</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[11px] border border-slate-200">
                            Fase {pkg.phase}
                          </span>
                        </div>
                      </td>

                      {/* 4. Jenis Asesmen */}
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getAssessmentBadge(pkg.assessment_type)}`}>
                          {pkg.assessment_type}
                        </span>
                      </td>

                      {/* 5. Jumlah Soal & Bobot */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-0.5">
                          <span className="font-extrabold text-slate-900 text-xs flex items-center space-x-1">
                            <Layers className="w-3.5 h-3.5 text-brand-600" />
                            <span>{displayCount} Butir Soal</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Total Bobot: {displayWeight}
                          </span>
                        </div>
                      </td>

                      {/* 6. Durasi */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-700 font-bold text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pkg.duration_minutes} Menit</span>
                        </div>
                      </td>

                      {/* 7. Pengacakan */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5 text-[11px]">
                          <span className={`px-2 py-0.5 rounded-md font-bold ${pkg.randomize_questions ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            Soal: {pkg.randomize_questions ? 'Acak' : 'Urut'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md font-bold ${pkg.randomize_options ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            Opsi: {pkg.randomize_options ? 'Acak' : 'Urut'}
                          </span>
                        </div>
                      </td>

                      {/* 8. Aksi */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPackageForPreview(pkg);
                              setShowPreviewModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all inline-flex items-center space-x-1 border border-slate-200"
                            title="Pratinjau Butir Soal dalam Paket"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Pratinjau</span>
                          </button>

                          {isPackageArchived(pkg) ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRestorePackage(pkg)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition-all inline-flex items-center space-x-1"
                                title="Aktifkan Kembali Paket Ujian Ini"
                              >
                                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Aktifkan</span>
                              </button>
                              
                              {/* Hapus Permanen HANYA di Kotak Arsip & HANYA jika TIDAK PUNYA sesi */}
                              {hasSess ? (
                                <button
                                  type="button"
                                  disabled
                                  className="p-1.5 rounded-xl text-slate-300 bg-slate-100 cursor-not-allowed border border-slate-200 transition-all"
                                  title="Paket ini memiliki riwayat sesi ujian dan tidak dapat dihapus permanen demi keamanan riwayat nilai siswa."
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePackage(pkg.id)}
                                  className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all"
                                  title="Hapus Permanen Paket (Draf Tanpa Sesi)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenSessionModal(pkg)}
                                className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold text-xs shadow-xs transition-all inline-flex items-center space-x-1.5 transform active:scale-95"
                                title="Buka Sesi Ujian Baru & Rilis Token"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span>Buka Sesi</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleArchivePackage(pkg)}
                                className="p-1.5 rounded-xl text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition-all"
                                title="Arsipkan Paket Ujian"
                              >
                                <Archive className="w-4 h-4 text-amber-500" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredPackages.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-500">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2.5 border border-slate-200">
                        <Package className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">
                        {packageArchiveTab === 'archived' ? 'Kotak Arsip Paket Kosong' : 'Belum Ada Paket Ujian Terbit'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {packageArchiveTab === 'archived' 
                          ? 'Belum ada paket ujian yang dipindahkan ke arsip.' 
                          : 'Klik tombol "Rakit Paket Ujian Baru" di atas untuk menyusun paket asesmen dari Bank Soal Anda.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: Rakit Paket Ujian Baru */}
      {showCreatePackageModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-indigo-900 text-white p-6 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/30 border border-brand-400/30 flex items-center justify-center">
                  <Package className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Rakit Paket Ujian Baru dari Bank Soal</h3>
                  <p className="text-xs text-slate-300">Pilih kisi-kisi atau pilih butir soal terverifikasi untuk membentuk paket asesmen</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreatePackageModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-6 sm:p-7 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Scope Lock Notification for Author */}
              {initialScope?.isLocked && (
                <div className="bg-purple-50 border border-purple-200/80 rounded-2xl p-4 flex items-center space-x-3.5 text-purple-900 shadow-2xs">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center space-x-1.5">
                      <span>Penugasan Penulis Soal Aktif</span>
                    </h4>
                    <p className="text-xs text-purple-800 mt-0.5">
                      Formulir dikunci otomatis pada penugasan Anda: <strong className="font-extrabold text-purple-950">{getSubjectName(newSubjectId)} • {newGrade} ({newLevel}) • {getAssessmentLabel(newAssessmentType)}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Opsi Auto-Fill dari Paket Ujian Terbit (Template) */}
              <div className="bg-gradient-to-r from-brand-50/70 to-indigo-50/70 border border-brand-200/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <label className="text-xs font-black text-brand-900 uppercase tracking-wide">
                    Salin Format dari Paket Ujian Terbit (Template Opsional)
                  </label>
                </div>
                <select
                  value={selectedTemplatePackageId}
                  disabled={packages.length === 0}
                  onChange={e => handleSelectTemplatePackage(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-brand-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-800 shadow-2xs disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {packages.length === 0 
                      ? "-- Belum Ada Paket Ujian yang Diterbitkan (Mulai Rakit Baru) --" 
                      : "-- Pilih Paket Ujian untuk Mengisi Otomatis Data Formulir --"}
                  </option>
                  {packages
                    .filter(pkg => {
                      if (!initialScope?.isLocked) return true;
                      const matchSubject = !initialScope?.subject || 
                        pkg.title.toLowerCase().includes(initialScope.subject.toLowerCase()) || 
                        (pkg.subject?.name && pkg.subject.name.toLowerCase().includes(initialScope.subject.toLowerCase()));
                      const matchLevel = !initialScope?.level || pkg.level === initialScope.level;
                      return matchSubject && matchLevel;
                    })
                    .map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.title} • {pkg.level} Fase {pkg.phase} ({pkg.assessment_type || 'SAS'})
                      </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  {packages.length === 0
                    ? "💡 Belum ada paket ujian yang diterbitkan di database. Silakan lengkapi formulir berjenjang di bawah untuk merakit paket perdana."
                    : "💡 Memilih paket terbit akan otomatis menduplikasi data jenjang, fase, mapel, durasi, dan butir soal dari paket tersebut."}
                </p>
              </div>

              {/* Formulir Isian Berjenjang (Hierarchical Stepped Form) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Langkah 1: Jenjang Pendidikan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
                    <span>Jenjang Pendidikan</span>
                    {initialScope?.isLocked && <Lock className="w-3 h-3 text-purple-600 ml-1" />}
                    <span className="text-rose-500">*</span>
                  </label>
                  {initialScope?.isLocked ? (
                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between">
                      <span>Jenjang {newLevel} {newLevel === 'SD' ? '(Fase A-C)' : '(Fase D)'}</span>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Terkunci</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleLevelChange('SD')}
                        className={`py-2.5 text-xs font-black rounded-xl border transition-all ${
                          newLevel === 'SD'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-2xs ring-2 ring-rose-200'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        SD (Fase A-C)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLevelChange('SMP')}
                        className={`py-2.5 text-xs font-black rounded-xl border transition-all ${
                          newLevel === 'SMP'
                            ? 'bg-sky-50 border-sky-400 text-sky-700 shadow-2xs ring-2 ring-sky-200'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        SMP (Fase D)
                      </button>
                    </div>
                  )}
                </div>

                {/* Langkah 2: Fase Kurikulum (Strict Hierarchical: Fase D disembunyikan untuk SD) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                    <span>Fase Kurikulum</span>
                    {initialScope?.isLocked && <Lock className="w-3 h-3 text-purple-600 ml-1" />}
                    <span className="text-rose-500">*</span>
                  </label>
                  {initialScope?.isLocked ? (
                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between">
                      <span>Fase {newPhase} ({newLevel === 'SD' ? (newPhase === 'A' ? 'Kelas 1 - 2 SD' : newPhase === 'B' ? 'Kelas 3 - 4 SD' : 'Kelas 5 - 6 SD') : 'Kelas 7 - 9 SMP'})</span>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Terkunci</span>
                    </div>
                  ) : (
                    <select
                      value={newPhase}
                      onChange={e => handlePhaseChange(e.target.value as Phase)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-800"
                    >
                      {newLevel === 'SD' ? (
                        <>
                          <option value="A">Fase A (Kelas 1 - 2 SD)</option>
                          <option value="B">Fase B (Kelas 3 - 4 SD)</option>
                          <option value="C">Fase C (Kelas 5 - 6 SD)</option>
                        </>
                      ) : (
                        <option value="D">Fase D (Kelas 7 - 9 SMP)</option>
                      )}
                    </select>
                  )}
                </div>

                {/* Langkah 3: Pilihan Kelas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">3</span>
                    <span>Tingkat Kelas</span>
                    {initialScope?.isLocked && <Lock className="w-3 h-3 text-purple-600 ml-1" />}
                    <span className="text-rose-500">*</span>
                  </label>
                  {initialScope?.isLocked ? (
                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center justify-between">
                      <span>{newGrade}</span>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Terkunci</span>
                    </div>
                  ) : (
                    <select
                      value={newGrade}
                      onChange={e => handleGradeChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-800"
                    >
                      {getGradesForPhase(newPhase).map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Langkah 4: Mata Pelajaran (Strict Level Filter: SD tidak memuat SMP) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">4</span>
                    <span>Mata Pelajaran ({newLevel})</span>
                    {initialScope?.isLocked && <Lock className="w-3 h-3 text-purple-600 ml-1" />}
                    <span className="text-rose-500">*</span>
                  </label>
                  {initialScope?.isLocked ? (
                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-brand-700 font-bold text-xs flex items-center justify-between">
                      <span className="truncate">{getSubjectName(newSubjectId)}</span>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md shrink-0">Terkunci</span>
                    </div>
                  ) : (
                    <select
                      value={newSubjectId}
                      onChange={e => handleSubjectChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-800"
                    >
                      {filteredSubjectsForAssembly.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code || s.level})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Langkah 5: Jenis Asesmen */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">5</span>
                    <span>Jenis Asesmen</span>
                    {initialScope?.isLocked && <Lock className="w-3 h-3 text-purple-600 ml-1" />}
                    <span className="text-rose-500">*</span>
                  </label>
                  {initialScope?.isLocked ? (
                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-brand-700 font-bold text-xs flex items-center justify-between">
                      <span className="truncate">{getAssessmentLabel(newAssessmentType)} ({newAssessmentType})</span>
                      <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md shrink-0">Terkunci</span>
                    </div>
                  ) : (
                    <select
                      value={newAssessmentType}
                      onChange={e => handleAssessmentChange(e.target.value as AssessmentType)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-black text-brand-700"
                    >
                      <option value="Formatif">Penilaian Formatif</option>
                      <option value="PTS">Penilaian Tengah Semester (PTS/STS)</option>
                      <option value="SAS">Sumatif Akhir Semester (SAS)</option>
                      <option value="SAT">Sumatif Akhir Tahun (SAT)</option>
                      <option value="SAJ">Sumatif Akhir Jenjang (SAJ)</option>
                    </select>
                  )}
                </div>

                {/* Langkah 6: Durasi Ujian */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">6</span>
                    <span>Durasi Pengerjaan (Menit)</span>
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="15"
                      max="180"
                      value={newDuration}
                      onChange={e => setNewDuration(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                    />
                  </div>
                </div>

                {/* Langkah 7: Judul Paket Ujian (Auto-suggested & editable) */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                      <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">7</span>
                      <span>Judul Paket Ujian</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={applySuggestedTitle}
                      className="text-[11px] font-black text-brand-600 hover:text-brand-800 hover:underline flex items-center space-x-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Saran Judul Otomatis</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sumatif Akhir Semester (SAS) Matematika Kelas 6 SD"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-900 shadow-2xs"
                  />
                </div>

                {/* Langkah 8: Opsi Pengacakan CBT */}
                <div className="md:col-span-2 flex flex-wrap items-center gap-6 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                  <span className="text-xs font-black text-slate-600 uppercase flex items-center space-x-1.5">
                    <span className="w-4 h-4 rounded-full bg-brand-600 text-white text-[10px] font-black flex items-center justify-center">8</span>
                    <span>Pengaturan CBT:</span>
                  </span>
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={randomizeQuestions}
                      onChange={e => setRandomizeQuestions(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-black text-slate-800">Acak Urutan Soal CBT</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={randomizeOptions}
                      onChange={e => setRandomizeOptions(e.target.checked)}
                      className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-xs font-black text-slate-800">Acak Opsi Pilihan (A/B/C/D)</span>
                  </label>
                </div>

              </div>

              {/* Selector Butir Soal dari Bank Soal */}
              <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50/70 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-brand-600" />
                      <span>Pilih Butir Soal ({filteredQuestionsForAssembly.length} Soal Tersedia untuk {getSubjectName(newSubjectId)} • {newGrade})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Centang butir soal terverifikasi yang akan dirakit ke dalam paket ini</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 cursor-pointer hover:bg-amber-50 hover:border-amber-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeArchivedQuestions}
                        onChange={e => setIncludeArchivedQuestions(e.target.checked)}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                      />
                      <Archive className="w-3 h-3 text-amber-600" />
                      <span>Termasuk Soal Arsip</span>
                    </label>
                    <button
                      type="button"
                      disabled={filteredQuestionsForAssembly.length === 0}
                      onClick={() => {
                        const allIds = filteredQuestionsForAssembly.map(q => q.id);
                        setSelectedQuestionIds(allIds);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-brand-50 hover:text-brand-700 text-slate-700 text-[11px] font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      disabled={selectedQuestionIds.length === 0}
                      onClick={() => setSelectedQuestionIds([])}
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-[11px] font-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Batal Pilih
                    </button>
                    <div className="pl-3 border-l border-slate-200 text-right">
                      <span className="text-xs font-black text-brand-700 bg-brand-100/80 px-2.5 py-1 rounded-lg">
                        {selectedQuestionIds.length} Dipilih
                      </span>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">Bobot: {totalSelectedWeight}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {filteredQuestionsForAssembly.length === 0 ? (
                    <div className="py-8 text-center bg-white rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-500">
                        Tidak ada butir soal yang sesuai dengan {getSubjectName(newSubjectId)} • {newGrade} ({newLevel}) • {getAssessmentLabel(newAssessmentType)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {initialScope?.isLocked
                          ? "Pastikan Anda sudah menyelesaikan penulisan butir soal di tab Pemetaan Kisi-Kisi / Bank Soal untuk penugasan ini."
                          : "Silakan pilih jenjang/fase lain atau tambahkan butir soal di Bank Soal."}
                      </p>
                    </div>
                  ) : (
                    filteredQuestionsForAssembly.map((q, idx) => {
                      const isSelected = selectedQuestionIds.includes(q.id);
                      return (
                        <div
                          key={q.id}
                          onClick={() => toggleQuestionSelection(q.id)}
                          className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start space-x-3 select-none ${
                            isSelected
                              ? 'bg-brand-50/90 border-brand-400 shadow-2xs ring-1 ring-brand-300'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Controlled via card click
                            className="mt-1 rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span className="font-black text-slate-900">Soal #{idx + 1}</span>
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-extrabold text-slate-700 uppercase">
                                {q.question_type}
                              </span>
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-black">
                                Level {(q as any).cognitive_level || q.blueprint_item?.cognitive_level || 'L2'}
                              </span>
                              <span className="px-2 py-0.5 bg-brand-100 text-brand-800 rounded-md text-[10px] font-bold">
                                Bobot: {q.weight || 10}
                              </span>
                              {q.stimulus_text && (
                                <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold">
                                  Ada Stimulus
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed">
                              {q.question_text.replace(/<[^>]*>?/gm, '')}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreatePackageModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg shadow-brand-500/25 transition-all transform active:scale-95"
                >
                  Simpan & Terbitkan Paket ({selectedQuestionIds.length} Soal)
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Buka Sesi Ujian & Rilis Token */}
      {showCreateSessionModal && selectedPackageForSession && (
        <div 
          className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-xs overflow-hidden transition-all duration-200 ${
            isSessionModalFullscreen ? 'p-0' : 'p-3 sm:p-5'
          }`} 
          style={{ zIndex: 9999 }}
        >
          <div 
            className={`bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up transition-all duration-200 ${
              isSessionModalFullscreen 
                ? 'w-full h-full rounded-none' 
                : 'w-full max-w-6xl h-[92vh] max-h-[92vh] rounded-3xl'
            }`}
          >
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
                  <Key className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="font-black text-lg">
                    {editingSessionId ? 'Edit Jadwal Sesi Ujian & Token' : 'Buka Sesi Ujian & Rilis Token'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {editingSessionId ? 'Ubah rentang tanggal, jam operasional, atau aktifkan kembali sesi ini' : 'Atur jadwal pelaksanaan dan generate token CBT resmi untuk siswa & proktor'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsSessionModalFullscreen(!isSessionModalFullscreen)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-1 text-xs font-semibold"
                  title={isSessionModalFullscreen ? "Kecilkan Tampilan" : "Layar Penuh (Full Screen)"}
                >
                  {isSessionModalFullscreen ? (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Normal</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Layar Penuh</span>
                    </>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowCreateSessionModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSession} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                  {/* KOLOM KIRI (7 Kolom): Area Luas Pemilihan Sekolah Penyelenggara */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                      <div>
                        <div className="flex items-center space-x-2">
                          <SchoolIcon className="w-4 h-4 text-brand-600" />
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                            Pilih Sekolah Penyelenggara ({selectedPackageForSession.level})
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tandai sekolah yang diizinkan mengikuti sesi ini dengan kode token yang sama.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 text-xs font-bold shrink-0">
                        <button
                          type="button"
                          onClick={handleSelectAllSchools}
                          className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          Pilih Semua ({filteredSchoolsForSession.length})
                        </button>
                        <button
                          type="button"
                          onClick={handleClearAllSchools}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={sessionSchoolSearch}
                          onChange={e => setSessionSchoolSearch(e.target.value)}
                          placeholder="Cari nama sekolah / NPSN..."
                          className="w-full pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-500" />
                        <input
                          type="text"
                          value={sessionRegionFilter}
                          onChange={e => setSessionRegionFilter(e.target.value)}
                          placeholder="Filter Wilayah (Kecamatan / Kab)..."
                          className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        />
                        {sessionRegionFilter && (
                          <button
                            type="button"
                            onClick={() => setSessionRegionFilter('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Counter Banner */}
                    <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                      <span>Total Sekolah Terpilih:</span>
                      <span className="px-2.5 py-0.5 bg-brand-600 text-white rounded-full text-xs font-black">
                        {selectedSchoolIds.length} Sekolah
                      </span>
                    </div>

                    {/* Grid Sekolah (Scrollable Area Luas - 2 Kolom pada Layar Lebar) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[460px] overflow-y-auto p-2 bg-slate-50/70 border border-slate-200 rounded-2xl">
                      {filteredSchoolsForSession.length === 0 ? (
                        <div className="col-span-full p-8 text-center text-slate-400 text-xs">
                          Tidak ada sekolah jenjang {selectedPackageForSession.level} yang sesuai kriteria pencarian/wilayah Anda.
                        </div>
                      ) : (
                        filteredSchoolsForSession.map(sch => {
                          const isChecked = selectedSchoolIds.includes(sch.id);
                          return (
                            <label
                              key={sch.id}
                              className={`flex items-start space-x-2.5 p-3 rounded-xl cursor-pointer transition-all border select-none ${
                                isChecked
                                  ? 'bg-brand-50/90 border-brand-300 text-brand-950 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSchoolSelection(sch.id)}
                                className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 mt-0.5 shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-extrabold text-xs text-slate-900 truncate">
                                    {sch.name}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 uppercase font-mono font-bold shrink-0">
                                    {sch.level}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono text-brand-700 mt-0.5">
                                  NPSN: {sch.npsn}
                                </div>
                                {sch.district && (
                                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-medium truncate mt-1">
                                    <MapPin className="w-3 h-3 text-brand-500 shrink-0" />
                                    <span className="truncate">{sch.district}</span>
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* KOLOM KANAN (5 Kolom): Konfigurasi Sesi, Waktu & Token CBT */}
                  <div className="lg:col-span-5 space-y-4">
                    {/* Paket Terpilih */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Paket Ujian Terpilih
                      </label>
                      <p className="font-extrabold text-xs text-slate-900 leading-snug">
                        {selectedPackageForSession.title}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-[10px] font-bold text-slate-500">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          {selectedPackageForSession.level} ({selectedPackageForSession.phase ? `Fase ${selectedPackageForSession.phase}` : ''})
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                          Durasi: {selectedPackageForSession.duration_minutes || 60} Menit
                        </span>
                      </div>
                    </div>

                    {/* Nama Sesi Ujian */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Nama Sesi Ujian <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={sessionName}
                        onChange={e => setSessionName(e.target.value)}
                        className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        placeholder="Contoh: Sesi 1 - SAS Matematika Kelas 6"
                      />
                    </div>

                    {/* Rentang Tanggal Pelaksanaan & Jam Operasional (Dapat Diatur Jauh-Jauh Hari) */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <span className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center space-x-1.5">
                        <Calendar className="w-4 h-4 text-brand-600" />
                        <span>Jadwal Operasional Sesi (Rentang Waktu & Jam)</span>
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Tanggal Mulai Ujian <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={sessionStartDate}
                            onChange={e => {
                              setSessionStartDate(e.target.value);
                              if (e.target.value > sessionEndDate) {
                                setSessionEndDate(e.target.value);
                              }
                            }}
                            className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Tanggal Selesai Ujian <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            min={sessionStartDate}
                            value={sessionEndDate}
                            onChange={e => setSessionEndDate(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          />
                        </div>

                        {/* Jam Operasional */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Jam Buka (WIB) <span className="text-rose-500">*</span></span>
                          </label>
                          <input
                            type="time"
                            required
                            value={sessionStartTime}
                            onChange={e => setSessionStartTime(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Jam Tutup (WIB) <span className="text-rose-500">*</span></span>
                          </label>
                          <input
                            type="time"
                            required
                            value={sessionEndTime}
                            onChange={e => setSessionEndTime(e.target.value)}
                            className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                          />
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium pt-1">
                        💡 Sesi otomatis aktif pada rentang jam di atas. Jika waktu operasional telah terlewati, sistem otomatis mengunci akses siswa. Cukup ubah tanggal/jam di sini kapan saja untuk mengaktifkan kembali.
                      </div>
                    </div>

                    {/* Token Code Generator Box */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                        Kode Token CBT Siswa (6 Karakter)
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={tokenCode}
                          onChange={e => setTokenCode(e.target.value.toUpperCase())}
                          className="flex-1 px-4 py-2.5 font-mono text-xl font-black tracking-widest text-center text-brand-700 uppercase rounded-xl border-2 border-brand-300 focus:outline-none focus:border-brand-600 bg-brand-50/50 shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={generateNewToken}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center space-x-1.5 transition-colors border border-slate-200"
                        >
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>Acak</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 font-medium">
                        Token ini wajib dibagikan ke proktor untuk diumumkan kepada siswa di ruangan ujian CBT.
                      </p>
                    </div>

                  </div>

                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  {selectedSchoolIds.length} sekolah penyelenggara telah dipilih.
                </span>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateSessionModal(false)}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/25 flex items-center space-x-1.5 transition-all transform active:scale-95"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>{editingSessionId ? 'Simpan Perubahan Jadwal Sesi' : 'Rilis Sesi & Buka Ujian'}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Pratinjau Paket Ujian (Preview Package & Questions) */}
      {showPreviewModal && selectedPackageForPreview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-brand-900 to-indigo-900 text-white p-6 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/30 border border-brand-400/30 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-brand-300" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Pratinjau Paket Ujian</h3>
                  <p className="text-xs text-slate-300">{selectedPackageForPreview.title}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-6 max-h-[80vh] overflow-y-auto">
              
              {/* Package Summary Badges */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedPackageForPreview.assessment_type}
                    </span>
                    <span className="text-xs font-black text-slate-700">
                      {selectedPackageForPreview.level} • Fase {selectedPackageForPreview.phase}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 mt-1">
                    {selectedPackageForPreview.subject?.name || (selectedPackageForPreview.title.includes('Matematika') ? 'Matematika' : 'Mata Pelajaran')}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedPackageForPreview.duration_minutes} Menit</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-600" />
                    <span>{packageQuestionsMap[selectedPackageForPreview.id]?.count || 10} Butir Soal</span>
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 flex items-center space-x-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Total Bobot: {packageQuestionsMap[selectedPackageForPreview.id]?.totalWeight || 100}</span>
                  </span>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span>Daftar Butir Soal dalam Paket Ujian Ini</span>
                </h4>

                {(() => {
                  const qList = packageQuestionsMap[selectedPackageForPreview.id]?.questions || [];
                  const displayQuestions = qList.length > 0 
                    ? qList 
                    : questions.filter(q => (!q.level || q.level === selectedPackageForPreview.level) && (!q.phase || q.phase === selectedPackageForPreview.phase)).slice(0, 10);

                  if (displayQuestions.length === 0) {
                    return (
                      <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm font-bold text-slate-600">Belum ada butir soal dalam paket ini.</p>
                      </div>
                    );
                  }

                  return displayQuestions.map((q, idx) => (
                    <div key={q.id} className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-300 transition-all space-y-3 shadow-2xs">
                      
                      {/* Meta Soal */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <span className="w-7 h-7 rounded-xl bg-brand-600 text-white font-black text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                            {q.question_type}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black border border-indigo-200">
                            Level {(q as any).cognitive_level || q.blueprint_item?.cognitive_level || 'L2'}
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Bobot: {q.weight || 10}
                        </span>
                      </div>

                      {/* Stimulus jika ada */}
                      {q.stimulus_text && (
                        <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Stimulus Soal</span>
                          </span>
                          <div className="text-xs text-slate-800 leading-relaxed font-serif">
                            <RichMathText content={q.stimulus_text} />
                          </div>
                        </div>
                      )}

                      {/* Teks Soal dengan KaTeX */}
                      <div className="text-sm font-semibold text-slate-900 leading-relaxed pt-1">
                        <RichMathText content={q.question_text} />
                      </div>

                      {/* Opsi Jawaban */}
                      {q.question_type === 'Benar/Salah' && Array.isArray(q.options) && q.options.length > 0 && !(q.options.length === 2 && (q.options[0].option_text === 'Benar' || q.options[0].option_text === 'Salah')) ? (
                        (() => {
                          const isSesuai = q.options.some(o => o.matching_pair_text === 'Sesuai' || o.matching_pair_text === 'Tidak Sesuai' || o.distractor_note === 'SESUAI_TIDAK_SESUAI');
                          const posH = isSesuai ? 'Sesuai' : 'Benar';
                          const negH = isSesuai ? 'Tidak Sesuai' : 'Salah';
                          return (
                            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase">
                                  <tr>
                                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                                    <th className="py-2.5 px-3">Pernyataan</th>
                                    <th className="py-2.5 px-3 text-center w-24 bg-emerald-50/50 text-emerald-800">{posH}</th>
                                    <th className="py-2.5 px-3 text-center w-24 bg-rose-50/50 text-rose-800">{negH}</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {q.options.map((opt, i) => {
                                    const isPosKey = (opt.matching_pair_text === posH) || (opt.is_correct && !opt.matching_pair_text);
                                    return (
                                      <tr key={opt.id || i} className="hover:bg-slate-50/50">
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-500">{i + 1}.</td>
                                        <td className="py-2.5 px-3 font-medium text-slate-800"><RichMathText content={opt.option_text} /></td>
                                        <td className="py-2.5 px-3 text-center">
                                          <div className="flex items-center justify-center">
                                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isPosKey ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300'}`}>
                                              {isPosKey && <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          <div className="flex items-center justify-center">
                                            <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!isPosKey ? 'border-rose-600 bg-rose-50' : 'border-slate-300'}`}>
                                              {!isPosKey && <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()
                      ) : Array.isArray(q.options) && q.options.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {q.options.map((opt) => (
                            <div 
                              key={opt.id || opt.option_label}
                              className={`p-2.5 rounded-xl border text-xs font-medium flex items-start space-x-2.5 ${
                                opt.is_correct 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-200' 
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                opt.is_correct ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {opt.option_label}
                              </span>
                              <div className="flex-1 mt-0.5">
                                <RichMathText content={opt.option_text} />
                              </div>
                              {opt.is_correct && (
                                <span className="text-[10px] uppercase font-black text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-100 shrink-0">
                                  Kunci
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (q.options && typeof q.options === 'object') ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          {Object.entries(q.options).map(([optKey, optVal]: [string, any]) => {
                            const isCorrect = (q as any).correct_answer === optKey;
                            return (
                              <div 
                                key={optKey}
                                className={`p-2.5 rounded-xl border text-xs font-medium flex items-start space-x-2.5 ${
                                  isCorrect 
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold ring-1 ring-emerald-200' 
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {optKey}
                                </span>
                                <div className="flex-1 mt-0.5">
                                  <RichMathText content={String(optVal)} />
                                </div>
                                {isCorrect && (
                                  <span className="text-[10px] uppercase font-black text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-100 shrink-0">
                                    Kunci
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                    </div>
                  ));
                })()}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleOpenSessionModal(selectedPackageForPreview);
                  }}
                  className="px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-black rounded-xl shadow-lg shadow-brand-500/25 flex items-center space-x-1.5 transition-all"
                >
                  <Key className="w-4 h-4" />
                  <span>Buka Sesi Ujian Dari Paket Ini</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

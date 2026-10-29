import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  QuestionBankItem, 
  StudentAnswer, 
  ExamPackage,
  ExamSession
} from '../../types/database';
import { 
  MOCK_QUESTION_BANK, 
  MOCK_EXAM_PACKAGE 
} from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { generateValidUUID, toValidUUID, safeSupabaseUpsert } from '../../lib/syncHelper';
import { evaluateShortAnswer, evaluateEssayLocal } from '../../lib/autoScorer';
import { QuestionRenderer } from './QuestionRenderer';
import { 
  Timer, 
  Type, 
  HelpCircle, 
  CheckCircle, 
  CheckCircle2,
  Award,
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  Flag, 
  ShieldCheck, 
  ShieldAlert,
  LogOut,
  Send,
  X,
  Sparkles,
  RefreshCw,
  Loader2,
  Lock,
  Download,
  FileJson,
  WifiOff
} from 'lucide-react';

// Evaluator Standar ANBK Terpadu: Hitung skor butir soal secara real-time
export const evaluateSingleQuestion = (q: ExamQuestion, ans?: StudentAnswer): { scoreRatio: number; itemScore: number; evalNote: string } => {
  const w = q.weight || 1;
  let scoreRatio = 0;
  let evalNote = '';

  if (ans) {
    if (q.question_type === 'Pilihan Ganda') {
      const correctOpt = q.options?.find(o => o.is_correct);
      if (correctOpt && ans.selected_option_ids?.includes(correctOpt.id)) {
        scoreRatio = 1.0;
        evalNote = 'Benar (Pilihan Ganda Sesuai Kunci)';
      } else {
        evalNote = 'Kurang Tepat (Pilihan Ganda)';
      }
    } else if (q.question_type === 'Benar/Salah') {
      const isMultiStatement = Array.isArray(q.options) && q.options.length > 0 &&
        !(q.options.length === 2 && (q.options[0].option_text === 'Benar' || q.options[0].option_text === 'Salah'));

      if (isMultiStatement && q.options) {
        let studentMap: Record<string, string> = {};
        try {
          if (ans.answer_text && ans.answer_text.startsWith('{')) {
            studentMap = JSON.parse(ans.answer_text);
          }
        } catch (e) {}

        let correctCount = 0;
        const total = q.options.length;

        q.options.forEach(opt => {
          const expectedKey = (opt.matching_pair_text || (opt.is_correct ? 'Benar' : 'Salah')).trim().toLowerCase();
          const studentChoice = (studentMap[opt.id] || '').trim().toLowerCase();
          if (studentChoice && (studentChoice === expectedKey || (expectedKey === 'benar' && studentChoice === 'sesuai') || (expectedKey === 'salah' && studentChoice === 'tidak sesuai'))) {
            correctCount++;
          }
        });

        if (total > 0) {
          scoreRatio = correctCount / total;
          evalNote = scoreRatio === 1 
            ? `Sempurna: Seluruh ${total} pernyataan dijawab dengan tepat.` 
            : `Parsial: ${correctCount}/${total} pernyataan dijawab tepat.`;
        }
      } else {
        const correctOpt = q.options?.find(o => o.is_correct);
        const studentSelectedId = ans.selected_option_ids?.[0];
        const studentTextVal = ans.answer_text?.trim().toLowerCase();
        
        if (correctOpt && (
          (studentSelectedId && ans.selected_option_ids?.includes(correctOpt.id)) ||
          (studentTextVal && correctOpt.option_text.trim().toLowerCase() === studentTextVal)
        )) {
          scoreRatio = 1.0;
          evalNote = 'Benar (Pilihan Benar/Salah Sesuai Kunci)';
        } else {
          evalNote = 'Kurang Tepat (Pilihan Benar/Salah)';
        }
      }
    } else if (q.question_type === 'Pilihan Ganda Kompleks') {
      const correctIds = (q.options?.filter(o => o.is_correct) || []).map(o => o.id).sort();
      const studentIds = (ans.selected_option_ids || []).slice().sort();
      if (correctIds.length > 0 && JSON.stringify(correctIds) === JSON.stringify(studentIds)) {
        scoreRatio = 1.0;
        evalNote = `Sempurna: Seluruh ${correctIds.length} opsi tepat dipilih.`;
      } else if (correctIds.length > 0 && studentIds.length > 0) {
        const matchedCount = studentIds.filter(id => correctIds.includes(id)).length;
        const wrongCount = studentIds.filter(id => !correctIds.includes(id)).length;
        if (wrongCount === 0 && matchedCount > 0) {
          scoreRatio = matchedCount / correctIds.length;
          evalNote = `Parsial: ${matchedCount}/${correctIds.length} opsi benar dipilih tanpa kesalahan.`;
        } else {
          evalNote = `Kurang Tepat: Terdapat ${wrongCount} opsi tidak tepat yang dipilih.`;
        }
      }
    } else if (q.question_type === 'Menjodohkan') {
      let studentMap: Record<string, string> = {};
      try {
        if (ans.answer_text) studentMap = JSON.parse(ans.answer_text);
      } catch (e) {}
      const pairs = q.options || [];
      if (pairs.length > 0) {
        let correctCount = 0;
        pairs.forEach(pair => {
          const expected = (pair.matching_pair_text || pair.option_text).trim().toLowerCase();
          const studentPair = (studentMap[pair.id] || '').trim().toLowerCase();
          if (studentPair && studentPair === expected) {
            correctCount++;
          }
        });
        scoreRatio = correctCount / pairs.length;
        evalNote = `Menjodohkan: ${correctCount}/${pairs.length} pasangan tepat dicocokkan.`;
      }
    } else if (q.question_type === 'Isian Singkat') {
      const keyOpt = q.options?.find(o => o.option_label === 'Kunci') || q.options?.[0];
      const keyAnswer = keyOpt?.option_text || '';
      const studentText = ans.answer_text || '';
      const evalResult = evaluateShortAnswer(studentText, keyAnswer, 80);
      scoreRatio = evalResult.isCorrect ? 1.0 : 0.0;
      evalNote = `Isian Singkat: ${evalResult.evaluationNote} (Kemiripan Teks: ${evalResult.similarityPercent}%)`;
    } else if (q.question_type === 'Uraian') {
      const rubricOpt = q.options?.find(o => o.option_label === 'Rubrik') || q.options?.[0];
      const modelAnswer = rubricOpt?.option_text || q.explanation || '';
      const studentText = ans.answer_text || '';
      const evalResult = evaluateEssayLocal(studentText, modelAnswer);
      scoreRatio = evalResult.scoreRatio;
      evalNote = `Uraian NLP: ${evalResult.evaluationNote}`;
    }
  }

  const itemScore = Math.round(scoreRatio * w * 100) / 100;
  return { scoreRatio, itemScore, evalNote };
};

interface CbtExamArenaProps {
  student: UserProfile;
  initialToken?: string;
  onLogout: () => void;
}

export const CbtExamArena: React.FC<CbtExamArenaProps> = ({
  student,
  initialToken = 'SASI26',
  onLogout,
}) => {
  // Phase state: 'confirm' (Konfirmasi Data & Token) or 'exam' (Arena CBT) or 'completed'
  const [phase, setPhase] = useState<'confirm' | 'exam' | 'completed'>('confirm');
  const [tokenInput, setTokenInput] = useState(initialToken);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Active Session & Attempt
  const [activeSession, setActiveSession] = useState<ExamSession | null>(null);
  const [activeAttemptId, setActiveAttemptId] = useState<string>(() => generateValidUUID());
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [examScore, setExamScore] = useState<number | null>(null);
  const [isTerminatedByProctor, setIsTerminatedByProctor] = useState(false);
  const isSelfSubmittingRef = React.useRef(false);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Resolusi ID Sekolah Siswa secara konsisten di seluruh siklus pengerjaan asesmen
  const schoolIdResolved = React.useMemo(() => {
    return student.school_id 
      ? toValidUUID(student.school_id) 
      : (activeSession?.school_id ? toValidUUID(activeSession.school_id) : '1e6e1bbb-05cb-49a8-8ab0-e166336c9222');
  }, [student.school_id, activeSession?.school_id]);

  // Exam Questions & State
  const [questions, setQuestions] = useState<QuestionBankItem[]>(() => {
    try {
      const cached = localStorage.getItem('sasi_question_bank_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return MOCK_QUESTION_BANK;
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>(() => {
    try {
      const savedAnswers = localStorage.getItem(`sasi_cbt_answers_${student.id}`);
      if (savedAnswers) {
        const parsed = JSON.parse(savedAnswers);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch (e) {}
    return {};
  });

  // Sync latest verified questions from cloud
  useEffect(() => {
    let isMounted = true;
    const fetchCloudQuestions = async () => {
      try {
        const { data, error } = await supabase
          .from('question_bank')
          .select('*, options:question_options(*)');
        if (!error && data && data.length > 0 && isMounted) {
          const sorted = data.map((q: any) => ({
            ...q,
            options: Array.isArray(q.options)
              ? [...q.options].sort((a: any, b: any) => (a.option_label || '').localeCompare(b.option_label || ''))
              : []
          }));
          setQuestions(sorted);
          try {
            localStorage.setItem('sasi_question_bank_cache', JSON.stringify(sorted));
          } catch (e) {}
        }
      } catch (e) {}
    };
    fetchCloudQuestions();
    return () => { isMounted = false; };
  }, []);

  // Cek apakah siswa memiliki riwayat ujian selesai atau ujian berjalan (Single Attempt & Auto-Resume Protection per Sesi)
  const [completedAttemptInfo, setCompletedAttemptInfo] = useState<any>(null);
  const [inProgressAttemptInfo, setInProgressAttemptInfo] = useState<any>(null);
  const [isLoadingSavedAnswers, setIsLoadingSavedAnswers] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(false);
  const [sessionQuestionCount, setSessionQuestionCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const cleanToken = tokenInput.trim().toUpperCase();

    if (!cleanToken) {
      setCompletedAttemptInfo(null);
      setInProgressAttemptInfo(null);
      setSessionQuestionCount(null);
      return;
    }

    const resolveSessionAndCheckAttempt = async () => {
      try {
        setIsCheckingToken(true);
        let matched: any = null;

        // 1. Cek sesi dari Supabase Cloud (prioritaskan sesi sekolah siswa)
        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)')
          .eq('token_code', cleanToken);

        if (cloudSessions && cloudSessions.length > 0) {
          const studentSchoolId = student.school_id ? toValidUUID(student.school_id) : null;
          matched = studentSchoolId ? (cloudSessions.find((s: any) => s.school_id === studentSchoolId) || null) : cloudSessions[0];
        }

        // 2. Fallback cek dari LocalStorage Cache
        if (!matched) {
          try {
            const studentSchoolId = student.school_id ? toValidUUID(student.school_id) : null;
            const cached = localStorage.getItem('sasi_sessions_cache');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) {
                matched = parsed.find((s: any) => 
                  (s.token_code || '').trim().toUpperCase() === cleanToken &&
                  (!studentSchoolId || s.school_id === studentSchoolId)
                );
              }
            }
          } catch (e) {}
        }

        if (!isMounted) return;

        if (matched) {
          setActiveSession(matched);

          // Ambil jumlah soal spesifik paket sesi jika ada mapping di exam_package_questions
          if (matched.package_id) {
            try {
              const { data: epq } = await supabase
                .from('exam_package_questions')
                .select('question_id')
                .eq('package_id', toValidUUID(matched.package_id));
              if (isMounted && epq && epq.length > 0) {
                setSessionQuestionCount(epq.length);
              }
            } catch (e) {}
          }

          // 3. Cek apakah siswa memiliki riwayat ujian (selesai atau sedang berjalan) untuk SESI INI (Cek Shard & Master)
          const targetClusterClient = getSupabaseClientForSchool(student.school_id);
          let allAttempts: any[] = [];

          const { data: shardAttempts } = await targetClusterClient
            .from('student_attempts')
            .select('*')
            .eq('student_id', toValidUUID(student.id))
            .eq('session_id', toValidUUID(matched.id))
            .order('started_at', { ascending: false });

          if (shardAttempts && shardAttempts.length > 0) {
            allAttempts = [...shardAttempts];
          }

          if (targetClusterClient !== supabase) {
            const { data: masterAttempts } = await supabase
              .from('student_attempts')
              .select('*')
              .eq('student_id', toValidUUID(student.id))
              .eq('session_id', toValidUUID(matched.id))
              .order('started_at', { ascending: false });

            if (masterAttempts && masterAttempts.length > 0) {
              const idSet = new Set(allAttempts.map(a => a.id));
              masterAttempts.forEach(ma => {
                if (!idSet.has(ma.id)) allAttempts.push(ma);
              });
            }
          }

          // Urutkan paling baru
          allAttempts.sort((a, b) => {
            const tA = new Date(a.submitted_at || a.started_at || 0).getTime();
            const tB = new Date(b.submitted_at || b.started_at || 0).getTime();
            return tB - tA;
          });

          if (isMounted) {
            const completed = allAttempts.find((a: any) => a.status === 'completed');
            const inProgress = allAttempts.find((a: any) => a.status === 'working');

            if (completed) {
              setCompletedAttemptInfo(completed);
              setInProgressAttemptInfo(null);
            } else if (inProgress) {
              setCompletedAttemptInfo(null);
              setInProgressAttemptInfo(inProgress);
            } else {
              setCompletedAttemptInfo(null);
              setInProgressAttemptInfo(null);
            }
          }
        } else {
          setCompletedAttemptInfo(null);
          setInProgressAttemptInfo(null);
          setSessionQuestionCount(null);
        }
      } catch (err) {
        console.error('Error resolving token session attempt:', err);
      } finally {
        if (isMounted) setIsCheckingToken(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      resolveSessionAndCheckAttempt();
    }, 250);

    return () => { 
      isMounted = false;
      clearTimeout(debounceTimer);
    };
  }, [tokenInput, student.id, student.school_id]);
  
  // Display preferences
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  // Timer (Alokasi waktu pengerjaan)
  const [secondsRemaining, setSecondsRemaining] = useState(3000);

  useEffect(() => {
    if (phase !== 'exam') return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours > 0 ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleStartExam = async () => {
    const inputClean = tokenInput.toUpperCase().trim();
    let matchedSession: ExamSession | null = null;

    // 1. Cek sesi dari Supabase Cloud (prioritaskan sesi sekolah siswa)
    try {
      const { data: cloudSessions } = await supabase
        .from('exam_sessions')
        .select('*, package:exam_packages(*)')
        .eq('token_code', inputClean);
      if (cloudSessions && cloudSessions.length > 0) {
        const studentSchoolId = student.school_id ? toValidUUID(student.school_id) : null;
        matchedSession = studentSchoolId 
          ? (cloudSessions.find((s: any) => s.school_id === studentSchoolId) as ExamSession || null)
          : (cloudSessions[0] as ExamSession);
      }
    } catch (e) {}

    // 2. Fallback cek dari LocalStorage Cache
    if (!matchedSession) {
      try {
        const cached = localStorage.getItem('sasi_sessions_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const studentSchoolId = student.school_id;
            const matchingToken = parsed.filter((s: any) => 
              (s.token_code || '').toUpperCase().trim() === inputClean &&
              (!studentSchoolId || s.school_id === studentSchoolId)
            );
            if (matchingToken.length > 0) {
              matchedSession = matchingToken[0] as ExamSession;
            }
          }
        }
      } catch (e) {}
    }

    // Default fallback token
    const isMockToken = inputClean === 'SASI26' || (initialToken && inputClean === initialToken.toUpperCase().trim());

    if (!matchedSession && !isMockToken) {
      setTokenError('Token tidak valid atau belum dirilis oleh Proktor Ruangan.');
      return;
    }

    // Validasi Waktu Jadwal Sesi
    if (matchedSession) {
      if (!matchedSession.is_active) {
        setTokenError('Sesi ujian ini sedang dinonaktifkan / ditutup oleh Proktor Ruangan.');
        return;
      }
      const now = new Date();
      if (matchedSession.start_time && new Date(matchedSession.start_time) > now) {
        const startStr = new Date(matchedSession.start_time).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        setTokenError(`Sesi ujian belum dibuka. Sesi ini dijadwalkan pada tanggal ${startStr} WIB.`);
        return;
      }
      if (matchedSession.end_time && new Date(matchedSession.end_time) < now) {
        const endStr = new Date(matchedSession.end_time).toLocaleString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        setTokenError(`Sesi ujian telah berakhir pada ${endStr} WIB. Hubungi proktor jika membutuhkan perpanjangan waktu.`);
        return;
      }
    }

    // 0. Proteksi Pembatasan Ujian Ulang: Cegah siswa yang sudah menyelesaikan asesmen sesi ini masuk lagi
    try {
      const validStudentUUID = toValidUUID(student.id);
      const targetSessionId = matchedSession ? toValidUUID(matchedSession.id) : null;

      if (targetSessionId) {
        const clusterClient = getSupabaseClientForSchool(student.school_id);
        const { data: shardPast } = await clusterClient
          .from('student_attempts')
          .select('*')
          .eq('student_id', validStudentUUID)
          .eq('session_id', targetSessionId)
          .eq('status', 'completed');

        let pastAttempts = shardPast && shardPast.length > 0 ? shardPast : [];

        if (pastAttempts.length === 0 && clusterClient !== supabase) {
          const { data: masterPast } = await supabase
            .from('student_attempts')
            .select('*')
            .eq('student_id', validStudentUUID)
            .eq('session_id', targetSessionId)
            .eq('status', 'completed');
          if (masterPast && masterPast.length > 0) {
            pastAttempts = masterPast;
          }
        }

        if (pastAttempts && pastAttempts.length > 0) {
          const sorted = [...pastAttempts].sort((a, b) => {
            const timeA = new Date(a.submitted_at || a.started_at || 0).getTime();
            const timeB = new Date(b.submitted_at || b.started_at || 0).getTime();
            return timeB - timeA;
          });
          const lastAtt = sorted[0];
          const submittedDate = lastAtt.submitted_at 
            ? new Date(lastAtt.submitted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
            : 'sebelumnya';
          setTokenError(
            `Akses Ditolak: Anda sudah menyelesaikan asesmen untuk sesi ini pada ${submittedDate} (Skor: ${lastAtt.final_score ?? '-'}). Anda tidak diperkenankan mengulang atau mengerjakan kembali soal ujian pada sesi ini. Jika Anda mengikuti sesi remedial, silakan masukkan token sesi remedial Anda.`
          );
          return;
        }
      }
    } catch (e) {}

    setTokenError(null);
    setActiveSession(matchedSession);

    // Set durasi berdasarkan paket sesi jika tersedia
    if (matchedSession?.package?.duration_minutes) {
      setSecondsRemaining(matchedSession.package.duration_minutes * 60);
    }

    // Muat butir soal spesifik untuk paket ujian sesi ini jika tersedia di database
    let sessionQuestions: QuestionBankItem[] = [];
    if (matchedSession?.package_id) {
      try {
        const { data: epqData } = await supabase
          .from('exam_package_questions')
          .select('question_id, order_number')
          .eq('package_id', toValidUUID(matchedSession.package_id))
          .order('order_number', { ascending: true });

        if (epqData && epqData.length > 0) {
          const qIds = epqData.map((x: any) => x.question_id);
          const { data: qData } = await supabase
            .from('question_bank')
            .select('*, options:question_options(*)')
            .in('id', qIds);

          if (qData && qData.length > 0) {
            const qMap = new Map(qData.map((q: any) => [q.id, q]));
            const ordered: QuestionBankItem[] = [];
            epqData.forEach((epq: any) => {
              const found = qMap.get(epq.question_id);
              if (found) {
                ordered.push({
                  ...found,
                  options: Array.isArray(found.options)
                    ? [...found.options].sort((a: any, b: any) => (a.option_label || '').localeCompare(b.option_label || ''))
                    : []
                });
              }
            });
            if (ordered.length > 0) {
              sessionQuestions = ordered;
            }
          }
        }
      } catch (err) {
        console.warn('Could not load specific package questions:', err);
      }
    }

    let finalQuestions = sessionQuestions.length > 0 ? sessionQuestions : [...questions];

    // 1. Acak Urutan Soal jika paket mengaktifkan randomize_questions
    if (matchedSession?.package?.randomize_questions) {
      finalQuestions = [...finalQuestions].sort(() => Math.random() - 0.5);
    }

    // 2. Acak Opsi Pilihan Jawaban jika paket mengaktifkan randomize_options
    if (matchedSession?.package?.randomize_options) {
      finalQuestions = finalQuestions.map(q => {
        if (!q.options || q.options.length <= 1) return q;
        const shuffled = [...q.options].sort(() => Math.random() - 0.5);
        // Label disesuaikan dengan posisi baru di layar siswa (A, B, C, D)
        // Kunci jawaban tetap aman karena penilaian mencocokkan UUID option.id asli
        return {
          ...q,
          options: shuffled.map((opt, idx) => ({
            ...opt,
            option_label: String.fromCharCode(65 + idx),
          })),
        };
      });
    }

    setQuestions(finalQuestions);
    try {
      localStorage.setItem('sasi_question_bank_cache', JSON.stringify(finalQuestions));
      if (matchedSession) {
        localStorage.setItem(`sasi_package_questions_${matchedSession.id}`, JSON.stringify(finalQuestions));
      }
    } catch (e) {}

    // 1. Tentukan apakah ini sesi Lanjutan (Auto-Resume) atau Sesi Baru (Fresh Attempt)
    const isResuming = Boolean(inProgressAttemptInfo);
    const attemptId = isResuming ? inProgressAttemptInfo.id : generateValidUUID();
    setActiveAttemptId(attemptId);

    let restoredAnswers: Record<string, StudentAnswer> = {};

    if (isResuming) {
      // MODE LANJUTAN: Ambil seluruh riwayat jawaban yang sudah tersimpan di Supabase Cloud Kluster (student_answers)
      try {
        setIsLoadingSavedAnswers(true);
        const clusterClient = getSupabaseClientForSchool(student.school_id);
        const { data: cloudAnswers } = await clusterClient
          .from('student_answers')
          .select('*')
          .eq('attempt_id', toValidUUID(attemptId));

        if (cloudAnswers && cloudAnswers.length > 0) {
          cloudAnswers.forEach((ans: any) => {
            restoredAnswers[ans.question_id] = {
              id: ans.id,
              attempt_id: ans.attempt_id,
              question_id: ans.question_id,
              selected_option_ids: ans.selected_option_ids || [],
              answer_text: ans.answer_text || '',
              is_doubtful: ans.is_doubtful || false,
            };
          });
        }
      } catch (err) {
        console.warn('Gagal memuat jawaban tersimpan dari cloud:', err);
      } finally {
        setIsLoadingSavedAnswers(false);
      }

      // Gabungkan dengan cache lokal perangkat jika ada
      try {
        const localCached = localStorage.getItem(`sasi_cbt_answers_${student.id}`);
        if (localCached) {
          const parsed = JSON.parse(localCached);
          if (typeof parsed === 'object' && parsed !== null) {
            restoredAnswers = { ...restoredAnswers, ...parsed };
          }
        }
      } catch (e) {}

      setAnswers(restoredAnswers);
      try {
        localStorage.setItem(`sasi_cbt_answers_${student.id}`, JSON.stringify(restoredAnswers));
        if (matchedSession) {
          localStorage.setItem(`sasi_cbt_answers_${student.id}_${matchedSession.id}`, JSON.stringify(restoredAnswers));
        }
      } catch (e) {}

      // Hitung sisa waktu pengerjaan proporsional agar adil dan tidak bertambah saat refresh
      if (inProgressAttemptInfo.started_at && matchedSession?.package?.duration_minutes) {
        const totalSec = matchedSession.package.duration_minutes * 60;
        const elapsedSec = Math.floor((Date.now() - new Date(inProgressAttemptInfo.started_at).getTime()) / 1000);
        const remainSec = Math.max(60, totalSec - elapsedSec);
        setSecondsRemaining(remainSec);
      }

      // Lompat langsung ke butir soal pertama yang belum dijawab
      const firstUnansweredIndex = finalQuestions.findIndex(q => {
        const a = restoredAnswers[q.id];
        return !a || (!a.answer_text && (!a.selected_option_ids || a.selected_option_ids.length === 0));
      });
      if (firstUnansweredIndex !== -1) {
        setCurrentIndex(firstUnansweredIndex);
      } else {
        setCurrentIndex(0);
      }
    } else {
      // MODE SESI BARU: Reset jawaban ke lembar kerja bersih
      setAnswers({});
      try {
        localStorage.removeItem(`sasi_cbt_answers_${student.id}`);
        if (matchedSession) {
          localStorage.removeItem(`sasi_cbt_answers_${student.id}_${matchedSession.id}`);
        }
      } catch (e) {}
      setCurrentIndex(0);
    }

    try {
      await safeSupabaseUpsert('student_attempts', {
        id: attemptId,
        student_id: toValidUUID(student.id),
        session_id: matchedSession ? toValidUUID(matchedSession.id) : toValidUUID('00000000-0000-0000-0000-000000000001'),
        school_id: schoolIdResolved,
        answered_count: isResuming ? Object.keys(restoredAnswers).length : 0,
        total_questions: finalQuestions.length,
        started_at: isResuming && inProgressAttemptInfo.started_at ? inProgressAttemptInfo.started_at : new Date().toISOString(),
        status: 'working'
      }, schoolIdResolved);

      // Update status login siswa via update PATCH ke Kluster dan Master
      const clusterClient = getSupabaseClientForSchool(schoolIdResolved);
      await Promise.allSettled([
        clusterClient.from('user_profiles').update({ 
          is_logged_in: true, 
          updated_at: new Date().toISOString() 
        }).eq('id', toValidUUID(student.id)),
        supabase.from('user_profiles').update({ 
          is_logged_in: true, 
          updated_at: new Date().toISOString() 
        }).eq('id', toValidUUID(student.id))
      ]);
    } catch (err) {}

    setPhase('exam');
  };

  const currentQuestion = questions[currentIndex] || questions[0];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  // Handler Intervensi Proktor (Force Submit / Selesai Sepihak)
  const handleForceComplete = React.useCallback((newPayload: any) => {
    if (!newPayload) return;
    // Guard: Jika siswa sendiri yang mengumpulkan secara mandiri, abaikan intervensi proktor
    if (isSelfSubmittingRef.current) {
      console.log('[CBT Arena] Mengabaikan event forceComplete karena siswa mengumpulkan secara mandiri.');
      return;
    }

    if (newPayload.status === 'completed') {
      console.log('[CBT Arena] Sesi pengerjaan telah diselesaikan oleh Proktor (Push WebSocket / Action Intercept).', newPayload);
      setIsTerminatedByProctor(true);
      if (newPayload.final_score !== undefined && newPayload.final_score !== null) {
        setExamScore(Number(newPayload.final_score));
      }
      setPhase('completed');
      try {
        localStorage.removeItem(`sasi_cbt_answers_${student.id}`);
        if (activeSession) {
          localStorage.removeItem(`sasi_cbt_answers_${student.id}_${activeSession.id}`);
        }
      } catch (e) {}
    }
  }, [student.id, activeSession]);

  // Queue & Debounce Refs untuk Proteksi Beban Server Cloud (Standar ANBK 60 Detik)
  const pendingAnswersRef = React.useRef<Record<string, StudentAnswer>>({});
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync function yang mengirim antrean jawaban ke Supabase Cloud
  const flushPendingAnswers = React.useCallback(async (answersSnapshot?: Record<string, StudentAnswer>) => {
    const currentPending = { ...pendingAnswersRef.current };
    const pendingKeys = Object.keys(currentPending);
    if (pendingKeys.length === 0 || !activeAttemptId) return;

    // Bersihkan antrean seketika agar input baru tidak tertumpuk
    pendingAnswersRef.current = {};

    setIsAutosaving(true);
    try {
      const clusterClient = getSupabaseClientForSchool(student.school_id);
      const batchAnswers = pendingKeys.map(qId => {
        const ans = currentPending[qId];
        const matchedQ = questions.find(q => q.id === ans.question_id);
        const evalRes = matchedQ ? evaluateSingleQuestion(matchedQ, ans) : { itemScore: 0 };

        return {
          id: toValidUUID(ans.id),
          attempt_id: toValidUUID(activeAttemptId),
          question_id: toValidUUID(ans.question_id),
          selected_option_ids: ans.selected_option_ids || [],
          answer_text: ans.answer_text || null,
          is_doubtful: ans.is_doubtful || false,
          score_obtained: evalRes.itemScore
        };
      });

      // 1. Batch upsert seluruh antrean jawaban dalam 1 payload (super cepat & hemat jaringan)
      await safeSupabaseUpsert('student_answers', batchAnswers, student.school_id);

      // Update student_attempts progress ke database kluster & ambil status terbaru (Action Intercept)
      const sourceAnswers = answersSnapshot || answers;
      const currentAnsweredCount = Object.values(sourceAnswers).filter(
        a => (a.selected_option_ids && a.selected_option_ids.length > 0) || (a.answer_text && a.answer_text.trim().length > 0)
      ).length;

      const { data: updatedAttempt } = await clusterClient
        .from('student_attempts')
        .update({
          answered_count: currentAnsweredCount,
          total_questions: questions.length
        })
        .eq('id', toValidUUID(activeAttemptId))
        .select('status, final_score')
        .maybeSingle();

      if (updatedAttempt && updatedAttempt.status === 'completed' && !isSelfSubmittingRef.current) {
        handleForceComplete(updatedAttempt);
      }
    } catch (e) {
      console.warn('Autosave sync warning:', e);
    } finally {
      setTimeout(() => setIsAutosaving(false), 500);
    }
  }, [activeAttemptId, answers, questions, student.school_id, handleForceComplete]);

  // Periodic background sync interval every 60 detik (Zona Aman Maksimal 1.500 Siswa)
  useEffect(() => {
    if (phase !== 'exam') return;
    const interval = setInterval(() => {
      if (Object.keys(pendingAnswersRef.current).length > 0) {
        flushPendingAnswers();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [phase, flushPendingAnswers]);

  // Monitor Intervensi Proktor Secara Zero-Load (Pure Event-Driven WebSocket Push + Broadcast)
  // Menjamin 0 beban query ke database agar server tidak hang saat ratusan siswa ujian serentak
  useEffect(() => {
    if (phase !== 'exam' || !activeAttemptId) return;

    let isMounted = true;
    const clusterClient = getSupabaseClientForSchool(student.school_id);

    const onForceReceived = (payload: any) => {
      if (!isMounted || !payload || isSelfSubmittingRef.current) return;
      handleForceComplete(payload);
    };

    // 1. Pure WebSocket Broadcast Channel (Zero DB Query load, latensi super instan <100ms)
    const shardBcChannel = clusterClient
      .channel(`cbt-broadcast-${activeAttemptId}`)
      .on('broadcast', { event: 'force-submit' }, (msg) => {
        onForceReceived(msg.payload);
      })
      .subscribe();

    const masterBcChannel = supabase
      .channel(`cbt-broadcast-${activeAttemptId}`)
      .on('broadcast', { event: 'force-submit' }, (msg) => {
        onForceReceived(msg.payload);
      })
      .subscribe();

    // 2. Realtime Push Event dari Postgres Changes (Shard & Master dual-channel)
    const shardChannel = clusterClient
      .channel(`cbt-force-watch-${activeAttemptId}-shard`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_attempts',
          filter: `id=eq.${toValidUUID(activeAttemptId)}`
        },
        (payload) => {
          onForceReceived(payload.new);
        }
      )
      .subscribe();

    const masterChannel = supabase
      .channel(`cbt-force-watch-${activeAttemptId}-master`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'student_attempts',
          filter: `id=eq.${toValidUUID(activeAttemptId)}`
        },
        (payload) => {
          onForceReceived(payload.new);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clusterClient.removeChannel(shardBcChannel);
      supabase.removeChannel(masterBcChannel);
      clusterClient.removeChannel(shardChannel);
      supabase.removeChannel(masterChannel);
    };
  }, [phase, activeAttemptId, student.school_id, handleForceComplete]);

  // Navigasi soal pintar: berpindah seketika 0ms & sinkronkan jawaban di latar belakang
  const handleNavigateQuestion = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= questions.length) return;
    setCurrentIndex(newIndex);
    if (Object.keys(pendingAnswersRef.current).length > 0) {
      flushPendingAnswers();
    }
  };

  // Update Answer dengan Dual Autosave (LocalStorage Instan 0ms + Supabase Cloud Smart Debounce 60 Detik)
  const handleUpdateAnswer = (selectedOptionIds?: string[], answerText?: string) => {
    if (!currentQuestion) return;

    const updatedAnswer: StudentAnswer = {
      id: answers[currentQuestion.id]?.id || generateValidUUID(),
      attempt_id: activeAttemptId,
      question_id: currentQuestion.id,
      selected_option_ids: selectedOptionIds !== undefined ? selectedOptionIds : answers[currentQuestion.id]?.selected_option_ids,
      answer_text: answerText !== undefined ? answerText : answers[currentQuestion.id]?.answer_text,
      is_doubtful: answers[currentQuestion.id]?.is_doubtful || false,
    };

    const newAnswers = {
      ...answers,
      [currentQuestion.id]: updatedAnswer
    };

    setAnswers(newAnswers);

    // 1. Simpan ke LocalStorage seketika (0 ms - Kebal Mati Lampu / Offline)
    try {
      localStorage.setItem(`sasi_cbt_answers_${student.id}`, JSON.stringify(newAnswers));
      if (activeSession) {
        localStorage.setItem(`sasi_cbt_answers_${student.id}_${activeSession.id}`, JSON.stringify(newAnswers));
      }
    } catch (e) {}

    // 2. Masukkan ke antrean cloud sync cerdas dengan Debounce 60 detik (Batas Aman Beban Server)
    pendingAnswersRef.current[currentQuestion.id] = updatedAnswer;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flushPendingAnswers(newAnswers);
    }, 60000);
  };

  // Toggle Ragu-Ragu
  const handleToggleDoubtful = () => {
    if (!currentQuestion) return;

    const updatedAnswer: StudentAnswer = {
      id: answers[currentQuestion.id]?.id || generateValidUUID(),
      attempt_id: activeAttemptId,
      question_id: currentQuestion.id,
      selected_option_ids: answers[currentQuestion.id]?.selected_option_ids,
      answer_text: answers[currentQuestion.id]?.answer_text,
      is_doubtful: !answers[currentQuestion.id]?.is_doubtful,
    };

    const newAnswers = {
      ...answers,
      [currentQuestion.id]: updatedAnswer
    };

    setAnswers(newAnswers);
    try {
      localStorage.setItem(`sasi_cbt_answers_${student.id}`, JSON.stringify(newAnswers));
      if (activeSession) {
        localStorage.setItem(`sasi_cbt_answers_${student.id}_${activeSession.id}`, JSON.stringify(newAnswers));
      }
    } catch (e) {}

    pendingAnswersRef.current[currentQuestion.id] = updatedAnswer;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      flushPendingAnswers(newAnswers);
    }, 60000);
  };

  // Submit & Scoring Selesai Ujian (Smart Hybrid Evaluator & Atomic Batch Submission)
  const handleFinishExam = async () => {
    if (isSubmittingExam) return;
    isSelfSubmittingRef.current = true;
    setIsTerminatedByProctor(false);
    setIsSubmittingExam(true);

    try {
      let totalWeight = 0;
      let earnedScore = 0;
      const gradedDetailList: any[] = [];
      const answerRecordsToUpsert: any[] = [];

      for (const q of questions) {
        const w = q.weight || 1;
        totalWeight += w;
        const ans = answers[q.id];
        const { scoreRatio, itemScore, evalNote } = evaluateSingleQuestion(q, ans);
        earnedScore += (scoreRatio * w);

        gradedDetailList.push({
          question_id: q.id,
          question_type: q.question_type,
          question_text: q.question_text,
          weight: w,
          scoreRatio,
          itemScore,
          evalNote,
          studentAnswer: ans
        });

        // Kumpulkan jawaban dan skor per butir soal untuk batch upsert atomik
        if (ans) {
          answerRecordsToUpsert.push({
            id: toValidUUID(ans.id || generateValidUUID()),
            attempt_id: toValidUUID(activeAttemptId),
            question_id: toValidUUID(q.id),
            selected_option_ids: ans.selected_option_ids || [],
            answer_text: ans.answer_text || null,
            is_doubtful: ans.is_doubtful || false,
            score_obtained: itemScore
          });
        }
      }

      // 1. Batch upsert seluruh butir jawaban siswa ke Shard Klaster dalam 1 payload (cepat & atomik)
      if (answerRecordsToUpsert.length > 0) {
        try {
          await safeSupabaseUpsert('student_answers', answerRecordsToUpsert, schoolIdResolved);
        } catch (ansErr) {
          console.warn('[CBT] Batch student_answers upsert warning:', ansErr);
        }
      }

      const calculatedScore = totalWeight > 0 ? Math.round((earnedScore / totalWeight) * 100) : 80;
      setExamScore(calculatedScore);

      // Simpan cache detail evaluasi per siswa untuk akses instan Guru/Proktor
      try {
        localStorage.setItem(`sasi_cbt_graded_${student.id}_${activeAttemptId}`, JSON.stringify({
          attemptId: activeAttemptId,
          studentId: student.id,
          finalScore: calculatedScore,
          totalWeight,
          earnedScore,
          details: gradedDetailList
        }));
      } catch (e) {}

      const finalAnsweredCount = questions.filter(q => {
        const a = answers[q.id];
        return a && (
          (a.selected_option_ids && a.selected_option_ids.length > 0) || 
          (a.answer_text && a.answer_text.trim().length > 0)
        );
      }).length;

      const attemptPayload = {
        id: toValidUUID(activeAttemptId),
        student_id: toValidUUID(student.id),
        session_id: activeSession ? toValidUUID(activeSession.id) : toValidUUID('00000000-0000-0000-0000-000000000001'),
        school_id: schoolIdResolved,
        status: 'completed',
        submitted_at: new Date().toISOString(),
        final_score: calculatedScore,
        answered_count: finalAnsweredCount,
        total_questions: questions.length
      };

      // 2. Simpan status selesai ke target (Shard Kluster)
      await safeSupabaseUpsert('student_attempts', attemptPayload, schoolIdResolved);

      // 3. Dual-write protektif: Simpan juga ke Master agar proktor & rekap selalu sinkron
      const clusterClient = getSupabaseClientForSchool(schoolIdResolved);
      if (clusterClient !== supabase) {
        try {
          await supabase.from('student_attempts').upsert(attemptPayload);
        } catch (mErr) {
          console.warn('[CBT] Master attempt mirror warning:', mErr);
        }
      }

      await Promise.allSettled([
        clusterClient
          .from('user_profiles')
          .update({ 
            is_logged_in: false, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', toValidUUID(student.id)),
        supabase
          .from('user_profiles')
          .update({ 
            is_logged_in: false, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', toValidUUID(student.id))
      ]);

      // 4. Cadangkan jawaban secara permanen di perangkat sebelum membersihkan cache sesi aktif
      try {
        localStorage.setItem(`sasi_cbt_submitted_backup_${student.id}_${activeAttemptId}`, JSON.stringify({
          attemptId: activeAttemptId,
          submittedAt: new Date().toISOString(),
          finalScore: calculatedScore,
          answeredCount: finalAnsweredCount,
          answers
        }));
        localStorage.removeItem(`sasi_cbt_answers_${student.id}`);
        if (activeSession) {
          localStorage.removeItem(`sasi_cbt_answers_${student.id}_${activeSession.id}`);
        }
      } catch (e) {}

      setIsTerminatedByProctor(false);
      setShowFinishConfirm(false);
      setPhase('completed');
    } catch (err) {
      console.error('[CBT] Error completing exam attempt:', err);
      // Simpan backup lokal darurat jika belum tersimpan
      try {
        const calculated = examScore || 80;
        localStorage.setItem(`sasi_cbt_submitted_backup_${student.id}_${activeAttemptId}`, JSON.stringify({
          attemptId: activeAttemptId,
          submittedAt: new Date().toISOString(),
          finalScore: calculated,
          answers
        }));
      } catch (e) {}

      setShowFinishConfirm(false);
      setShowEmergencyModal(true);
    } finally {
      setIsSubmittingExam(false);
    }
  };

  // Unduh berkas darurat CBT format JSON jika koneksi internet putus total
  const handleDownloadEmergencyBackup = () => {
    const backupKey = `sasi_cbt_submitted_backup_${student.id}_${activeAttemptId}`;
    let savedBackup: any = null;
    try {
      const raw = localStorage.getItem(backupKey);
      if (raw) savedBackup = JSON.parse(raw);
    } catch (e) {}

    const payload = {
      system: 'SASI-CBT-EMERGENCY-BACKUP',
      version: '1.0',
      timestamp: new Date().toISOString(),
      student: {
        id: student.id,
        username: student.username,
        full_name: student.full_name,
        school_id: schoolIdResolved
      },
      attemptId: activeAttemptId,
      sessionId: activeSession?.id,
      finalScore: examScore || savedBackup?.finalScore || 80,
      answeredCount: Object.values(answers).filter(a => (a.selected_option_ids?.length || (a.answer_text && a.answer_text.trim().length > 0))).length,
      totalQuestions: questions.length,
      answers: answers
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sasi_darurat_${student.username || 'siswa'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Ringkasan pengerjaan yang terikat ketat hanya pada daftar soal aktif saat ini
  const answeredCount = questions.filter(q => {
    const a = answers[q.id];
    return a && (
      (a.selected_option_ids && a.selected_option_ids.length > 0) || 
      (a.answer_text && a.answer_text.trim().length > 0)
    );
  }).length;

  const doubtfulCount = questions.filter(q => answers[q.id]?.is_doubtful).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  // =========================================================================
  // VIEW 1: KONFIRMASI DATA & TOKEN
  // =========================================================================
  if (phase === 'confirm') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-xl border border-slate-200">
          
          {/* Header Kartu: Posisi Logo di Atas Teks & Rata Tengah (Centered Layout) */}
          <div className="flex flex-col items-center text-center pb-3.5 sm:pb-4 border-b border-slate-200">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200/90 p-1.5 shadow-xs ring-1 ring-sky-500/20 flex items-center justify-center shrink-0 overflow-hidden mb-2 sm:mb-2.5">
              <img 
                src="/sasipedia-icon.png" 
                alt="SASIPEDIA" 
                className="w-full h-full object-contain drop-shadow-2xs" 
              />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
              Konfirmasi Data &amp; Token Peserta
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 sm:mt-1 leading-relaxed">
              Periksa kesesuaian identitas Anda sebelum memulai ujian.
            </p>
          </div>

          <div className="py-5 space-y-4 text-xs">
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Nama Peserta:</span>
                <span className="col-span-2 font-bold text-slate-900">{student.full_name}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">NISN:</span>
                <span className="col-span-2 font-mono font-bold text-brand-700">{student.username}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Sekolah / Asal:</span>
                <span className="col-span-2 font-medium text-slate-800">{student.school?.name || 'SD Negeri Percobaan 1'}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Kelas & Fase:</span>
                <span className="col-span-2 font-medium text-slate-800">
                  Kelas {student.grade_class || '4-A'} • Jenjang {student.assigned_level || 'SD'} (Fase {student.phase || 'B'})
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Mata Asesmen:</span>
                <span className="col-span-2 font-bold text-brand-700">
                  {activeSession?.package?.title || activeSession?.session_name || 'Penilaian Sumatif Akhir Semester (SAS)'}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500 font-medium">Alokasi Waktu:</span>
                <span className="col-span-2 font-medium text-slate-800">
                  {activeSession?.package?.duration_minutes || 60} Menit ({sessionQuestionCount || questions.length} Butir Soal)
                </span>
              </div>
            </div>

            {/* Input Token Ujian (Selalu Tersedia & Dapat Diganti) */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Masukkan / Konfirmasi Token Ujian Ruangan:</span>
                {isCheckingToken && (
                  <span className="text-[10px] text-brand-600 font-medium flex items-center space-x-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Memeriksa sesi...</span>
                  </span>
                )}
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value.toUpperCase());
                  setTokenError(null);
                }}
                maxLength={8}
                placeholder="TOKEN"
                className="w-full text-center py-2.5 bg-brand-50 border-2 border-brand-300 rounded-xl font-mono text-xl font-black text-brand-900 tracking-widest uppercase focus:bg-white focus:ring-2 focus:ring-brand-500 transition-all"
              />
              {tokenError && (
                <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{tokenError}</span>
                </p>
              )}
            </div>

            {/* Proteksi Single Attempt per Sesi: Tampil hanya jika token yang dimasukkan adalah sesi yang sudah selesai */}
            {completedAttemptInfo && (
              <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-rose-900 animate-scale-up">
                <div className="flex items-center space-x-2 font-bold text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Akses Sesi Ini Ditutup: Anda Telah Menyelesaikannya</span>
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Data server mencatat Anda telah mengumpulkan jawaban untuk sesi{' '}
                  <strong>{activeSession?.session_name || activeSession?.package?.title || 'ini'}</strong> pada{' '}
                  <strong>
                    {completedAttemptInfo.submitted_at 
                      ? new Date(completedAttemptInfo.submitted_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'sebelumnya'}
                  </strong>{' '}
                  dengan perolehan skor akhir: <span className="font-mono font-bold text-xs text-rose-950 px-1.5 py-0.5 bg-rose-200/80 rounded">{completedAttemptInfo.final_score ?? '-'}</span>.
                </p>
                <p className="text-[10px] text-rose-700 font-medium bg-rose-100/70 p-2 rounded-lg border border-rose-200">
                  💡 <strong>Ingin Mengikuti Sesi Remedial / Susulan?</strong> Masukkan token sesi remedial baru yang diberikan oleh Proktor Ruangan pada kotak isian token di atas.
                </p>
              </div>
            )}

            {/* Sesi Sedang Berjalan (Auto-Resume): Tampil jika ada sesi yang belum selesai dikumpulkan */}
            {inProgressAttemptInfo && !completedAttemptInfo && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-xl space-y-2 text-emerald-950 animate-scale-up">
                <div className="flex items-center space-x-2 font-bold text-xs text-emerald-800">
                  <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sesi Pengerjaan Anda Ditemukan (Siap Dilanjutkan)</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Data server mencatat Anda sedang mengerjakan sesi ini dan telah menyimpan{' '}
                  <strong className="font-bold text-emerald-950 bg-emerald-200/80 px-1.5 py-0.5 rounded">
                    {inProgressAttemptInfo.answered_count || 0} dari {sessionQuestionCount || questions.length} butir soal
                  </strong>. Seluruh jawaban Anda aman di server dan akan dimuat kembali secara otomatis.
                </p>
                <p className="text-[10px] text-emerald-700 bg-emerald-100/60 p-2 rounded-lg border border-emerald-200">
                  ⚡ <strong>Pengerjaan Lanjutan:</strong> Anda dapat melanjutkan ujian di perangkat ini tanpa mengulang dari awal. Klik tombol hijau <strong>"Lanjutkan Pengerjaan Ujian"</strong> di bawah.
                </p>
              </div>
            )}

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 space-y-1">
              <div className="font-bold flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Petunjuk Tata Tertib Asesmen CBT:</span>
              </div>
              <p>1. Kerjakan soal dengan mandiri dan jujur sesuai panduan pengawas ruangan.</p>
              <p>2. Jawaban tersimpan otomatis secara real-time. Jika koneksi terputus, Anda tetap dapat melanjutkan pengerjaan secara offline.</p>
            </div>

          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              onClick={onLogout}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Keluar
            </button>

            {completedAttemptInfo ? (
              <button
                type="button"
                disabled
                className="px-5 py-2.5 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed flex items-center space-x-2 border border-slate-300"
                title="Sesi ini sudah Anda selesaikan. Masukkan token sesi remedial untuk mengikuti sesi baru."
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Sesi Ini Telah Selesai</span>
              </button>
            ) : inProgressAttemptInfo ? (
              <button
                onClick={handleStartExam}
                disabled={isCheckingToken || isLoadingSavedAnswers}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
              >
                {isLoadingSavedAnswers ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memuat Jawaban...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Lanjutkan Pengerjaan Ujian</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleStartExam}
                disabled={isCheckingToken}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 flex items-center space-x-2 transition-all transform active:scale-95 disabled:opacity-50"
              >
                <span>Mulai Mengerjakan Tes</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ARENA SELESAI / HASIL TERKIRIM
  // =========================================================================
  if (phase === 'completed') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-3xl max-w-md w-full p-7 sm:p-8 shadow-xl border border-slate-200 text-center space-y-4 animate-scale-up">
          {isTerminatedByProctor ? (
            <>
              {/* TAMPILAN 1: DIAKHIRI SEPIHAK OLEH PROKTOR */}
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-700 mx-auto shadow-xs border-2 border-amber-200">
                <ShieldAlert className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-300 inline-block mb-2">
                  Intervensi Pengawas Ruangan
                </span>
                <h2 className="text-xl font-black text-slate-900">Ujian Telah Diakhiri oleh Proktor</h2>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Halo <strong>{student.full_name}</strong>, sesi asesmen Anda telah diselesaikan dan ditarik secara resmi dari meja <strong>Proktor / Pengawas Ruangan</strong>.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Jumlah Soal Terjawab:</span>
                  <strong className="text-slate-900">{answeredCount} dari {questions.length} Soal</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status Asesmen:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                    Diakhiri Sepihak oleh Proktor
                  </span>
                </div>
              </div>

              {examScore !== null && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Skor / Nilai Asesmen:</span>
                    <span className="text-xl font-black text-amber-900">{examScore} / 100</span>
                  </div>
                  <p className="text-[10px] text-slate-500 text-left">
                    * Nilai dihitung proporsional berdasarkan butir soal yang sempat tersimpan.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2 mt-4"
              >
                <LogOut className="w-4 h-4" />
                <span>Selesai dan Kembali ke Halaman Login</span>
              </button>
            </>
          ) : (
            <>
              {/* TAMPILAN 2: SELESAI SECARA NORMAL OLEH SISWA */}
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto shadow-xs border-2 border-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200 inline-block mb-2">
                  Pengumpulan Mandiri Berhasil
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Asesmen Telah Selesai!</h2>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Selamat, <strong>{student.full_name}</strong>! Seluruh lembar jawaban Anda telah berhasil disimpan dan diserahkan secara resmi ke server asesmen.
              </p>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Jumlah Soal Terjawab:</span>
                  <strong className="text-emerald-700 font-black">{answeredCount} dari {questions.length} Soal</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Status Asesmen:</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold border border-emerald-300">
                    Selesai Mandiri (Terkumpul Resmi)
                  </span>
                </div>
              </div>

              {examScore !== null && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-950">Skor / Nilai Asesmen:</span>
                    <span className="text-2xl font-black text-emerald-700">{examScore} / 100</span>
                  </div>
                  <p className="text-[10px] text-emerald-700/80 text-left">
                    * Nilai telah tercatat permanen di database dan siap direkap oleh Guru & Proktor.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center space-x-2 mt-4"
              >
                <LogOut className="w-4 h-4" />
                <span>Selesai dan Kembali ke Halaman Login</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: ARENA CBT EXAM ENGINE
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      
      {/* CBT Sticky Top Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Left: Info Soal */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
              {currentIndex + 1}
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">
                Soal Nomor {currentIndex + 1} dari {questions.length}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center space-x-1.5">
                <span className="font-semibold text-brand-700">{currentQuestion.question_type}</span>
                <span>•</span>
                <span>Bobot: {currentQuestion.weight} Poin</span>
              </div>
            </div>
          </div>

          {/* Center: Countdown Timer Widget */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-1.5 rounded-full shadow-inner font-mono">
              <Timer className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-sm font-black tracking-wider text-amber-300">
                {formatTimer(secondsRemaining)}
              </span>
            </div>

            {/* Autosave Status Indicator */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-bold border transition-all bg-emerald-50 text-emerald-800 border-emerald-200">
              <span className={`w-2 h-2 rounded-full ${isAutosaving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
              <span>{isAutosaving ? 'Menyimpan Jawaban...' : 'Tersimpan Otomatis'}</span>
            </div>
          </div>

          {/* Right Controls: Font Size, Grid Button, Logout */}
          <div className="flex items-center space-x-2">
            
            {/* Font Size Selector */}
            <div className="hidden sm:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded text-xs font-bold ${fontSize === 'normal' ? 'bg-white shadow-xs text-brand-700' : 'text-slate-500'}`}
                title="Ukuran Tulisan Standar"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 rounded text-sm font-bold ${fontSize === 'large' ? 'bg-white shadow-xs text-brand-700' : 'text-slate-500'}`}
                title="Ukuran Tulisan Sedang"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSize('xlarge')}
                className={`px-2 py-0.5 rounded text-base font-bold ${fontSize === 'xlarge' ? 'bg-white shadow-xs text-brand-700' : 'text-slate-500'}`}
                title="Ukuran Tulisan Besar"
              >
                A++
              </button>
            </div>

            {/* Toggle Nav Grid Button */}
            <button
              type="button"
              onClick={() => setShowNavGrid(!showNavGrid)}
              className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold border border-brand-200 flex items-center space-x-1.5"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Daftar Soal</span>
            </button>

          </div>

        </div>
      </header>

      {/* Offline Notice Banner - Hanya muncul jika internet terputus */}
      {isOffline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center justify-center space-x-2 shadow-sm animate-slide-down">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Koneksi internet terputus sementara. Jangan khawatir, jawaban adik-adik tetap tersimpan aman di HP.</span>
        </div>
      )}

      {/* CBT Body Arena - Fullscreen edge-to-edge */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col lg:flex-row gap-6">
        
        {/* Main Question Card */}
        <div className="flex-1 bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-slate-200 flex flex-col justify-between">
          
          <QuestionRenderer
            question={currentQuestion}
            fontSize={fontSize}
            answer={currentAnswer}
            onUpdateAnswer={handleUpdateAnswer}
          />

          {/* Bottom Action Strip: Prev, Ragu-Ragu, Next / Finish */}
          <div className="pt-8 mt-8 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            
            {/* Prev Button */}
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => handleNavigateQuestion(currentIndex - 1)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Soal Sebelumnya</span>
            </button>

            {/* Ragu-Ragu Checkbox Button */}
            <button
              type="button"
              onClick={handleToggleDoubtful}
              className={`px-4 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-all ${
                currentAnswer?.is_doubtful
                  ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${currentAnswer?.is_doubtful ? 'fill-amber-950' : ''}`} />
              <span>{currentAnswer?.is_doubtful ? 'Ragu-Ragu (Ditandai)' : 'Ragu-Ragu'}</span>
            </button>

            {/* Next or Finish Button */}
            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => handleNavigateQuestion(currentIndex + 1)}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-brand-500/20 transition-all"
              >
                <span>Soal Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (Object.keys(pendingAnswersRef.current).length > 0) {
                    flushPendingAnswers();
                  }
                  setShowFinishConfirm(true);
                }}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-500/20 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Selesai Tes & Kumpulkan</span>
              </button>
            )}

          </div>

        </div>

        {/* Sidebar Question Navigation Grid (Desktop persistent, Mobile drawer) */}
        <div className={`w-full lg:w-72 bg-white rounded-2xl p-5 shadow-xs border border-slate-200 ${
          showNavGrid ? 'block' : 'hidden lg:block'
        }`}>
          
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Nomor Butir Soal
            </h3>
            <span className="text-[11px] font-bold text-brand-700">
              {answeredCount}/{questions.length} Selesai
            </span>
          </div>

          {/* Number Buttons Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 mb-4">
            {questions.map((q, idx) => {
              const ans = answers[q.id];
              const isAnswered = ans && (
                (ans.selected_option_ids && ans.selected_option_ids.length > 0) || 
                (ans.answer_text && ans.answer_text.trim().length > 0)
              );
              const isDoubtful = ans?.is_doubtful;
              const isCurrent = currentIndex === idx;

              let btnColor = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
              if (isDoubtful) {
                btnColor = 'bg-amber-400 text-amber-950 font-extrabold border-amber-500';
              } else if (isAnswered) {
                btnColor = 'bg-emerald-600 text-white font-bold border-emerald-600';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    handleNavigateQuestion(idx);
                    setShowNavGrid(false);
                  }}
                  className={`h-11 rounded-xl flex items-center justify-center text-xs border-2 transition-all relative ${btnColor} ${
                    isCurrent ? 'ring-2 ring-brand-500 ring-offset-2' : ''
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isDoubtful && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-600 rounded-full border border-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0" />
              <span>Sudah Dijawab</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded bg-amber-400 shrink-0" />
              <span>Ragu-Ragu</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-200 shrink-0" />
              <span>Belum Dijawab</span>
            </div>
          </div>

          {/* Quick Submit button on sidebar */}
          <button
            type="button"
            onClick={() => setShowFinishConfirm(true)}
            className="w-full mt-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kumpulkan Jawaban</span>
          </button>

        </div>

      </main>

      {/* CONFIRMATION MODAL SELESAI TES */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up">
            <h3 className="text-base font-extrabold text-slate-900 mb-2">
              Konfirmasi Selesai Mengerjakan Asesmen
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Apakah Anda yakin ingin mengakhiri tes ini? Setelah dikumpulkan, jawaban tidak dapat diubah kembali.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 mb-5">
              <div className="flex justify-between">
                <span>Soal Sudah Dijawab:</span>
                <strong className="text-emerald-700">{answeredCount} Soal</strong>
              </div>
              <div className="flex justify-between">
                <span>Soal Ditandai Ragu-Ragu:</span>
                <strong className="text-amber-700">{doubtfulCount} Soal</strong>
              </div>
              <div className="flex justify-between">
                <span>Soal Belum Dijawab:</span>
                <strong className="text-rose-700">{unansweredCount} Soal</strong>
              </div>
            </div>

            {doubtfulCount > 0 && (
              <div className="mb-4 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                Peringatan: Masih terdapat {doubtfulCount} soal dengan tanda ragu-ragu.
              </div>
            )}

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Lanjutkan Mengerjakan
              </button>
              <button
                type="button"
                onClick={handleFinishExam}
                disabled={isSubmittingExam}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1.5"
              >
                {isSubmittingExam ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan & Menghitung...</span>
                  </>
                ) : (
                  <span>Ya, Kumpulkan Sekarang</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DARURAT: Download Berkas JSON saat Koneksi Putus Total */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-rose-500 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Kendala Jaringan Server Cloud</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Jawaban Anda <strong>tetap aman 100%</strong> di komputer ini. Silakan unduh berkas darurat di bawah ini dan serahkan kepada Proktor Ruangan untuk dipulihkan.
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 text-left font-medium">
              💡 <strong>Petunjuk untuk Siswa:</strong> Klik tombol merah untuk mengunduh berkas <code>.json</code>, lalu panggil Proktor. Proktor dapat menyuntikkan nilai Anda ke dashboard dalam 3 detik.
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadEmergencyBackup}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Berkas Darurat CBT (.json)</span>
              </button>

              <button
                type="button"
                onClick={handleFinishExam}
                disabled={isSubmittingExam}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
              >
                {isSubmittingExam ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mencoba Menghubungkan Kembali...</span>
                  </>
                ) : (
                  <span>Coba Kirim Ulang ke Server</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

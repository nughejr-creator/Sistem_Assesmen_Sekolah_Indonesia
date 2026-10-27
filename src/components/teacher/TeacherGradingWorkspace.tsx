import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserProfile, 
  ExamSession, 
  QuestionBankItem, 
  QuestionOption, 
  StudentAnswer, 
  StudentAttempt,
  QuestionType
} from '../../types/database';
import { MOCK_QUESTION_BANK, MOCK_EXAM_SESSION, MOCK_USERS } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { toValidUUID, safeSupabaseUpsert, generateValidUUID } from '../../lib/syncHelper';
import { 
  evaluateShortAnswer, 
  evaluateEssayLocal, 
  evaluateTrueFalseMatrix,
  evaluateEssayWithGemini,
  evaluateEssayBatchWithGemini,
  getStoredGeminiApiKey,
  saveStoredGeminiApiKey,
  testGeminiApiKey
} from '../../lib/autoScorer';
import { RichMathText } from '../common/RichMathText';
import { filterSessionsForTeacher, filterStudentsForTeacher, checkIsGuruKelas } from '../../lib/teacherScope';
import { 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Save, 
  RotateCcw, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  BookOpen, 
  Layers, 
  Award,
  Check,
  Send,
  HelpCircle,
  Clock,
  UserCheck,
  Bot,
  Settings,
  Key,
  X,
  Wifi,
  ExternalLink
} from 'lucide-react';

interface TeacherGradingWorkspaceProps {
  teacher: UserProfile;
}

export const TeacherGradingWorkspace: React.FC<TeacherGradingWorkspaceProps> = ({ teacher }) => {
  const [sessions, setSessions] = useState<ExamSession[]>([MOCK_EXAM_SESSION]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    try {
      return localStorage.getItem('sasi_teacher_session') || '';
    } catch (e) {
      return '';
    }
  });

  const [students, setStudents] = useState<UserProfile[]>([]);
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);

  // Navigation: Soal aktif yang sedang diperiksa secara massal
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [typeFilter, setTypeFilter] = useState<'all' | 'subjective' | 'objective'>('subjective'); // Default fokus ke Isian & Uraian
  const [searchStudent, setSearchStudent] = useState('');

  // Local state edit nilai guru per siswa untuk butir soal aktif: { [studentId]: score }
  const [gradesMap, setGradesMap] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Gemini AI Evaluation States
  const [aiNotesMap, setAiNotesMap] = useState<Record<string, string>>({});
  const [isGradingWithAI, setIsGradingWithAI] = useState(false);
  const [aiGradingProgress, setAiGradingProgress] = useState('');
  const [isAiSettingsOpen, setIsAiSettingsOpen] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(() => getStoredGeminiApiKey());
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ ok: boolean; latencyMs?: number; model?: string; error?: string } | null>(null);

  // Reset catatan AI saat ganti nomor soal
  useEffect(() => {
    setAiNotesMap({});
  }, [selectedQuestionIndex]);

  // 1. Fetch Sesi Ujian, Siswa, dan Attempts
  useEffect(() => {
    let isMounted = true;

    const fetchTeacherData = async () => {
      try {
        // Ambil sesi ujian sekolah
        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)')
          .order('created_at', { ascending: false });

        if (cloudSessions && isMounted) {
          const matched = teacher.school_id ? cloudSessions.filter(s => s.school_id === teacher.school_id) : cloudSessions;
          const scopedSessions = filterSessionsForTeacher(matched, teacher);
          setSessions(scopedSessions as ExamSession[]);

          setSelectedSessionId(prev => {
            if (prev && scopedSessions.some(s => s.id === prev)) return prev;
            const nonRemedial = scopedSessions.find(s => !s.session_name.toLowerCase().includes('remedial'));
            const chosen = nonRemedial ? nonRemedial.id : (scopedSessions[0]?.id || '');
            try { localStorage.setItem('sasi_teacher_session', chosen); } catch (e) {}
            return chosen;
          });
        }

        const clusterClient = getSupabaseClientForSchool(teacher.school_id);

        // Ambil data siswa (Cek Kluster Sekolah, fallback Master)
        let cloudStudentsData: any[] = [];
        const { data: shardStudents } = await clusterClient
          .from('user_profiles')
          .select('*')
          .eq('role', 'student')
          .order('full_name');

        if (shardStudents && shardStudents.length > 0) {
          cloudStudentsData = shardStudents;
        } else {
          const { data: masterStudents } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('role', 'student')
            .order('full_name');
          cloudStudentsData = masterStudents || [];
        }

        if (cloudStudentsData && cloudStudentsData.length > 0 && isMounted) {
          const matched = teacher.school_id ? cloudStudentsData.filter(s => s.school_id === teacher.school_id) : cloudStudentsData;
          const scopedStudents = filterStudentsForTeacher(matched, teacher);
          setStudents(scopedStudents);
        } else if (isMounted) {
          setStudents([]);
        }

        // Ambil student attempts dari database kluster & master (query mandiri tanpa join)
        let combinedAttempts: any[] = [];
        const { data: shardAttempts, error: shardAttErr } = await clusterClient
          .from('student_attempts')
          .select('*');

        if (!shardAttErr && shardAttempts && shardAttempts.length > 0) {
          combinedAttempts = [...shardAttempts];
        }

        const { data: masterAttempts } = await supabase
          .from('student_attempts')
          .select('*');

        if (masterAttempts && masterAttempts.length > 0) {
          const map = new Map<string, any>();
          masterAttempts.forEach(m => map.set(m.id, m));
          combinedAttempts.forEach(s => {
            const m = map.get(s.id);
            if (!m || s.status === 'completed' || (s.answered_count || 0) >= (m.answered_count || 0)) {
              map.set(s.id, s);
            }
          });
          combinedAttempts = Array.from(map.values());
        }

        if (combinedAttempts.length > 0 && isMounted) {
          const mappedAttempts = combinedAttempts.map(ca => {
            const matchedSession = cloudSessions.find((s: any) => s.id === ca.session_id);
            return {
              ...ca,
              session: matchedSession || ca.session
            };
          });
          setAttempts(mappedAttempts as StudentAttempt[]);
        }

        // Ambil student answers dari database kluster & master (hybrid merge multi-shard)
        let combinedAnswers: any[] = [];
        const { data: shardAnswers } = await clusterClient
          .from('student_answers')
          .select('*');

        if (shardAnswers && shardAnswers.length > 0) {
          combinedAnswers = [...shardAnswers];
        }

        if (clusterClient !== supabase) {
          const { data: masterAnswers } = await supabase
            .from('student_answers')
            .select('*');

          if (masterAnswers && masterAnswers.length > 0) {
            const map = new Map<string, any>();
            masterAnswers.forEach(m => {
              const key = `${m.attempt_id}_${m.question_id}`;
              map.set(key, m);
            });
            combinedAnswers.forEach(s => {
              const key = `${s.attempt_id}_${s.question_id}`;
              const existing = map.get(key);
              if (!existing || (s.updated_at && (!existing.updated_at || new Date(s.updated_at) > new Date(existing.updated_at)))) {
                map.set(key, s);
              }
            });
            combinedAnswers = Array.from(map.values());
          }
        }

        if (isMounted) {
          setStudentAnswers(combinedAnswers as StudentAnswer[]);
        }
      } catch (err) {
        console.warn('Teacher data fetch warning:', err);
      }
    };

    fetchTeacherData();
    const interval = setInterval(fetchTeacherData, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [teacher.school_id]);

  // Filter Sesi Ujian yang berhak diakses guru sesuai aturan SD
  const allowedSessions = useMemo(() => {
    return filterSessionsForTeacher(sessions, teacher);
  }, [sessions, teacher]);

  const effectiveSessions = allowedSessions;

  // Sesi aktif
  const activeSession = effectiveSessions.find(s => s.id === selectedSessionId) || effectiveSessions[0] || null;

  // Muat butir soal TERISOLASI spesifik untuk paket sesi yang aktif
  useEffect(() => {
    let isMounted = true;

    const loadSessionSpecificQuestions = async () => {
      if (!activeSession) return;

      try {
        let resolvedQuestions: QuestionBankItem[] = [];

        // 1. Cek relasi pemetaan paket di tabel exam_package_questions
        if (activeSession.package_id) {
          const { data: epqData } = await supabase
            .from('exam_package_questions')
            .select('question_id, order_number')
            .eq('package_id', toValidUUID(activeSession.package_id))
            .order('order_number', { ascending: true });

          if (epqData && epqData.length > 0) {
            const qIds = epqData.map((x: any) => x.question_id);
            const { data: qData } = await supabase
              .from('question_bank')
              .select('*, options:question_options(*)')
              .in('id', qIds);

            if (qData && qData.length > 0 && isMounted) {
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
                resolvedQuestions = ordered;
              }
            }
          }
        }

        // 2. Cek cache lokal per paket jika cloud lambat/offline
        if (resolvedQuestions.length === 0 && activeSession.package_id) {
          try {
            const cachedPkg = localStorage.getItem(`sasi_package_questions_${activeSession.package_id}`);
            if (cachedPkg) {
              const parsed = JSON.parse(cachedPkg);
              if (Array.isArray(parsed) && parsed.length > 0) {
                resolvedQuestions = parsed;
              }
            }
          } catch (e) {}
        }

        // 3. Fallback: Filter terisolasi ketat sesuai Mata Pelajaran, Jenjang, dan Kelas Sesi / Guru
        if (resolvedQuestions.length === 0) {
          const sessionTitle = (activeSession.package?.title || activeSession.session_name || '').toLowerCase();
          const targetGrade = (activeSession.package?.grade_class || teacher.grade_class || 'Kelas 1').toLowerCase();
          const isBahasaIndo = sessionTitle.includes('bahasa') || sessionTitle.includes('indonesia');

          const { data: poolData } = await supabase
            .from('question_bank')
            .select('*, options:question_options(*)')
            .order('created_at', { ascending: true });

          if (poolData && poolData.length > 0) {
            const targetNum = targetGrade.match(/[0-9]+/)?.[0] || '1';
            const isolated = poolData.filter((q: any) => {
              const qText = (q.question_text || '').toLowerCase();
              if (targetNum === '1') {
                if (qText.includes('fpb') || qText.includes('kpk') || qText.includes('pengembangan') || qText.includes('rasional')) {
                  return false;
                }
                if (isBahasaIndo && (qText.includes('matematika') || qText.includes('hitung') || qText.includes('pecahan'))) {
                  return false;
                }
              }
              return true;
            });
            resolvedQuestions = isolated.length > 0 ? isolated : poolData.slice(0, 5);
          }
        }

        if (isMounted && resolvedQuestions.length > 0) {
          setQuestions(resolvedQuestions);
          setSelectedQuestionIndex(0);
        }
      } catch (err) {
        console.warn('Gagal memuat butir soal terisolasi paket:', err);
      }
    };

    loadSessionSpecificQuestions();
  }, [activeSession?.id, activeSession?.package_id, teacher.grade_class, teacher.assigned_level]);

  // Filter siswa sesuai kelas binaan
  const allowedStudents = useMemo(() => {
    return filterStudentsForTeacher(students, teacher);
  }, [students, teacher]);

  // Filter soal berdasarkan tipe
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (typeFilter === 'subjective') {
        return q.question_type === 'Isian Singkat' || q.question_type === 'Uraian';
      }
      if (typeFilter === 'objective') {
        return q.question_type === 'Pilihan Ganda' || q.question_type === 'Pilihan Ganda Kompleks' || q.question_type === 'Benar/Salah' || q.question_type === 'Menjodohkan';
      }
      return true;
    });
  }, [questions, typeFilter]);

  const currentQuestion = filteredQuestions[selectedQuestionIndex] || null;

  // Pastikan indeks nomor soal tidak out-of-bounds saat beralih filter kategori atau sesi
  useEffect(() => {
    if (selectedQuestionIndex >= filteredQuestions.length && filteredQuestions.length > 0) {
      setSelectedQuestionIndex(0);
    }
  }, [filteredQuestions.length, selectedQuestionIndex]);

  // Siswa dan attempts yang mengikuti sesi aktif
  const sessionAttempts = useMemo(() => {
    if (!activeSession) return [];
    return attempts.filter(a => a.session_id === activeSession.id || a.session?.id === activeSession.id);
  }, [attempts, activeSession]);

  // Bangun daftar lembar jawaban siswa untuk butir soal yang sedang aktif dipilih
  const studentRows = useMemo(() => {
    if (!currentQuestion) return [];

    const w = currentQuestion.weight || 10;

    return allowedStudents.map(st => {
      const att = sessionAttempts.find(a => a.student_id === st.id);
      const isAttempted = !!att;
      const isCompleted = att?.status === 'completed';

      // Cari jawaban butir soal ini
      const ans = studentAnswers.find(a => a.question_id === currentQuestion.id && (a.attempt_id === att?.id));

      let autoScore = 0;
      let evalNote = '';
      let typoSimilarity = 0;
      let conceptCoverage = 0;

      if (ans) {
        if (currentQuestion.question_type === 'Isian Singkat') {
          const keyOpt = currentQuestion.options?.find(o => o.option_label === 'Kunci') || currentQuestion.options?.[0];
          const keyAnswer = keyOpt?.option_text || '';
          const studentText = ans.answer_text || '';
          const evalRes = evaluateShortAnswer(studentText, keyAnswer, 80);
          autoScore = evalRes.isCorrect ? w : 0;
          typoSimilarity = evalRes.similarityPercent;
          evalNote = evalRes.evaluationNote;
        } else if (currentQuestion.question_type === 'Uraian') {
          const rubrikOpt = currentQuestion.options?.find(o => o.option_label === 'Rubrik') || currentQuestion.options?.[0];
          const modelAnswer = rubrikOpt?.option_text || currentQuestion.explanation || '';
          const studentText = ans.answer_text || '';
          const evalRes = evaluateEssayLocal(studentText, modelAnswer);
          autoScore = Math.round(evalRes.scoreRatio * w * 10) / 10;
          conceptCoverage = evalRes.conceptCoveragePercent;
          evalNote = evalRes.evaluationNote;
        } else if (currentQuestion.question_type === 'Pilihan Ganda') {
          const correctOpt = currentQuestion.options?.find(o => o.is_correct);
          const isCorrect = correctOpt && ans.selected_option_ids?.includes(correctOpt.id);
          autoScore = isCorrect ? w : 0;
          evalNote = isCorrect ? 'Sesuai Kunci' : 'Tidak Sesuai Kunci';
        } else if (currentQuestion.question_type === 'Pilihan Ganda Kompleks') {
          const correctIds = (currentQuestion.options?.filter(o => o.is_correct) || []).map(o => o.id).sort();
          const studentIds = (ans.selected_option_ids || []).slice().sort();
          if (correctIds.length > 0 && JSON.stringify(correctIds) === JSON.stringify(studentIds)) {
            autoScore = w;
            evalNote = `Sempurna: Seluruh ${correctIds.length} opsi tepat dipilih.`;
          } else if (correctIds.length > 0 && studentIds.length > 0) {
            const matchedCount = studentIds.filter(id => correctIds.includes(id)).length;
            const wrongCount = studentIds.filter(id => !correctIds.includes(id)).length;
            if (wrongCount === 0 && matchedCount > 0) {
              autoScore = Math.round((matchedCount / correctIds.length) * w * 10) / 10;
              evalNote = `Parsial: ${matchedCount}/${correctIds.length} opsi tepat dipilih.`;
            } else {
              autoScore = 0;
              evalNote = `Kurang Tepat: Terdapat ${wrongCount} opsi keliru dipilih.`;
            }
          }
        } else if (currentQuestion.question_type === 'Menjodohkan') {
          let studentMap: Record<string, string> = {};
          try {
            if (ans.answer_text) studentMap = JSON.parse(ans.answer_text);
          } catch (e) {}
          const pairs = currentQuestion.options || [];
          if (pairs.length > 0) {
            let correctCount = 0;
            pairs.forEach(pair => {
              const expected = (pair.matching_pair_text || pair.option_text).trim().toLowerCase();
              const studentPair = (studentMap[pair.id] || '').trim().toLowerCase();
              if (studentPair && studentPair === expected) {
                correctCount++;
              }
            });
            autoScore = Math.round((correctCount / pairs.length) * w * 10) / 10;
            evalNote = `Menjodohkan: ${correctCount}/${pairs.length} pasangan tepat.`;
          }
        } else if (currentQuestion.question_type === 'Benar/Salah') {
          const isMulti = currentQuestion.options && currentQuestion.options.length > 0 &&
            !(currentQuestion.options.length === 2 && (currentQuestion.options[0].option_text === 'Benar' || currentQuestion.options[0].option_text === 'Salah'));

          if (isMulti && currentQuestion.options) {
            const evalRes = evaluateTrueFalseMatrix(ans.answer_text || '', currentQuestion.options, w);
            autoScore = evalRes.earnedScore;
            evalNote = evalRes.evaluationNote;
          } else {
            const correctOpt = currentQuestion.options?.find(o => o.is_correct);
            const isCorrect = correctOpt && (
              ans.selected_option_ids?.includes(correctOpt.id) ||
              (ans.answer_text && correctOpt.option_text.trim().toLowerCase() === ans.answer_text.trim().toLowerCase())
            );
            autoScore = isCorrect ? w : 0;
            evalNote = isCorrect ? 'Sesuai Kunci' : 'Tidak Sesuai Kunci';
          }
        }
      }

      // Skor efektif saat ini (prioritaskan yang diedit guru di gradesMap, lalu ans.score_obtained, lalu autoScore)
      const currentGrade = gradesMap[st.id] !== undefined
        ? gradesMap[st.id]
        : ((ans?.score_obtained !== undefined && ans?.score_obtained !== null) ? Number(ans.score_obtained) : autoScore);

      return {
        student: st,
        attempt: att,
        answer: ans,
        isAttempted,
        isCompleted,
        autoScore,
        currentGrade,
        maxScore: w,
        evalNote,
        typoSimilarity,
        conceptCoverage,
        isOverridden: currentGrade !== autoScore
      };
    }).filter(row => {
      if (!searchStudent.trim()) return true;
      const q = searchStudent.toLowerCase();
      return row.student.full_name.toLowerCase().includes(q) || row.student.username.toLowerCase().includes(q);
    });
  }, [students, sessionAttempts, studentAnswers, currentQuestion, gradesMap, searchStudent]);

  // Handler ubah nilai satu siswa
  const handleScoreChange = (studentId: string, val: number) => {
    if (!currentQuestion) return;
    const max = currentQuestion.weight || 10;
    const clamped = Math.max(0, Math.min(max, val));
    setGradesMap(prev => ({
      ...prev,
      [studentId]: clamped
    }));
  };

  // Handler 1-Klik: Setujui Semua Rekomendasi AI untuk butir soal ini
  const handleApproveAllAI = () => {
    const updated: Record<string, number> = {};
    studentRows.forEach(row => {
      updated[row.student.id] = row.autoScore;
    });
    setGradesMap(prev => ({
      ...prev,
      ...updated
    }));
  };

  // Handler Evaluasi Soal Uraian Menggunakan Google Gemini AI
  const handleRunGeminiEssayGrading = async () => {
    if (!currentQuestion || currentQuestion.question_type !== 'Uraian') return;
    setIsGradingWithAI(true);
    setAiGradingProgress('Menghubungi Gemini AI...');

    try {
      const rubrikOpt = currentQuestion.options?.find(o => o.option_label === 'Rubrik') || currentQuestion.options?.[0];
      const modelAnswer = rubrikOpt?.option_text || currentQuestion.explanation || '';
      const w = currentQuestion.weight || 10;
      const key = getStoredGeminiApiKey();

      const newGrades: Record<string, number> = {};
      const newNotes: Record<string, string> = {};

      const answeringRows = studentRows.filter(r => r.answer && r.answer.answer_text && r.answer.answer_text.trim().length > 0);
      
      if (answeringRows.length === 0) {
        alert('Tidak ada siswa yang mengisi jawaban uraian untuk butir soal ini.');
        return;
      }

      setAiGradingProgress(`Menilai ${answeringRows.length} siswa (Mode Borongan + Paralel)...`);

      // Eksekusi Borongan (Batch 10 per request) + Paralel Serentak
      const batchItems = answeringRows.map(row => ({
        studentId: row.student.id,
        studentAnswer: row.answer!.answer_text!
      }));

      const evaluations = await evaluateEssayBatchWithGemini(
        batchItems,
        modelAnswer,
        currentQuestion.question_text,
        key
      );

      evaluations.forEach(ev => {
        const earned = Math.round(ev.scoreRatio * w * 10) / 10;
        newGrades[ev.studentId] = earned;
        newNotes[ev.studentId] = ev.evaluationNote;
      });

      setGradesMap(prev => ({ ...prev, ...newGrades }));
      setAiNotesMap(prev => ({ ...prev, ...newNotes }));
      setSaveSuccessMsg(`Sukses! ${answeringRows.length} jawaban uraian dinilai dengan Gemini AI.`);
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err: any) {
      alert('Gagal evaluasi dengan Gemini: ' + (err.message || 'Error'));
    } finally {
      setIsGradingWithAI(false);
      setAiGradingProgress('');
    }
  };

  // Uji koneksi kunci Gemini
  const handleTestGeminiKey = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await testGeminiApiKey(geminiApiKeyInput);
      setGeminiTestResult(res);
    } catch (e: any) {
      setGeminiTestResult({ ok: false, error: e.message || 'Koneksi gagal' });
    } finally {
      setIsTestingGemini(false);
    }
  };

  // Simpan API key baru
  const handleSaveGeminiKey = () => {
    saveStoredGeminiApiKey(geminiApiKeyInput);
    alert('Kunci API Gemini berhasil disimpan!');
    setIsAiSettingsOpen(false);
  };

  // Handler Simpan Perubahan Nilai ke Cloud Supabase
  const handleSaveAllGrades = async () => {
    if (!currentQuestion) return;
    setIsSaving(true);

    try {
      for (const row of studentRows) {
        if (!row.attempt) continue;

        const effectiveScore = gradesMap[row.student.id] !== undefined
          ? gradesMap[row.student.id]
          : row.currentGrade;

        const answerId = row.answer?.id ? toValidUUID(row.answer.id) : generateValidUUID();

        // 1. Simpan skor butir soal ke student_answers di Kluster Sekolah
        await safeSupabaseUpsert('student_answers', {
          id: answerId,
          attempt_id: toValidUUID(row.attempt.id),
          question_id: toValidUUID(currentQuestion.id),
          selected_option_ids: row.answer?.selected_option_ids || [],
          answer_text: row.answer?.answer_text || null,
          is_doubtful: row.answer?.is_doubtful || false,
          score_obtained: effectiveScore
        }, teacher.school_id);

        // 2. Hitung ulang total nilai final_score untuk attempt siswa ini
        const studentAllAnswers = studentAnswers.filter(a => a.attempt_id === row.attempt?.id && a.question_id !== currentQuestion.id);
        const otherScores = studentAllAnswers.reduce((sum, a) => sum + (Number(a.score_obtained) || 0), 0);
        const totalWeight = questions.reduce((sum, q) => sum + (q.weight || 10), 0);
        const newEarned = otherScores + effectiveScore;
        const recalculatedFinal = totalWeight > 0 ? Math.round((newEarned / totalWeight) * 100) : 80;

        const clusterClient = getSupabaseClientForSchool(teacher.school_id);
        const attemptUpdatePayload = {
          final_score: recalculatedFinal,
          updated_at: new Date().toISOString()
        };

        await Promise.allSettled([
          clusterClient
            .from('student_attempts')
            .update(attemptUpdatePayload)
            .eq('id', toValidUUID(row.attempt.id)),
          supabase
            .from('student_attempts')
            .update(attemptUpdatePayload)
            .eq('id', toValidUUID(row.attempt.id))
        ]);
      }

      setSaveSuccessMsg(`Berhasil menyimpan koreksi nilai untuk Soal No. ${selectedQuestionIndex + 1}! Nilai leger siswa telah ter-update.`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err) {
      alert('Terjadi kendala saat menyimpan nilai.');
    } finally {
      setIsSaving(false);
    }
  };

  // Format Kunci / Rubrik
  const getKeyRubricText = () => {
    if (!currentQuestion) return '-';
    if (currentQuestion.question_type === 'Isian Singkat') {
      const opt = currentQuestion.options?.find(o => o.option_label === 'Kunci') || currentQuestion.options?.[0];
      return opt?.option_text || '-';
    }
    if (currentQuestion.question_type === 'Uraian') {
      const opt = currentQuestion.options?.find(o => o.option_label === 'Rubrik') || currentQuestion.options?.[0];
      return opt?.option_text || currentQuestion.explanation || '-';
    }
    if (currentQuestion.question_type === 'Benar/Salah') {
      const isMulti = currentQuestion.options && currentQuestion.options.length > 0 &&
        !(currentQuestion.options.length === 2 && (currentQuestion.options[0].option_text === 'Benar' || currentQuestion.options[0].option_text === 'Salah'));
      if (isMulti && currentQuestion.options) {
        return currentQuestion.options.map((o, idx) => `${idx + 1}. ${o.option_text} ➔ [Kunci: ${o.matching_pair_text || (o.is_correct ? 'Benar' : 'Salah')}]`).join(' • ');
      }
      const correct = currentQuestion.options?.find(o => o.is_correct);
      return correct ? `Kunci: ${correct.option_text}` : '-';
    }
    if (currentQuestion.question_type === 'Pilihan Ganda Kompleks') {
      const corrects = currentQuestion.options?.filter(o => o.is_correct) || [];
      return corrects.map(o => `${o.option_label}. ${o.option_text}`).join(' • ');
    }
    if (currentQuestion.question_type === 'Menjodohkan') {
      return (currentQuestion.options || []).map(p => `${p.option_text} ➔ ${p.matching_pair_text || p.option_text}`).join(' • ');
    }
    const correct = currentQuestion.options?.find(o => o.is_correct);
    return correct ? `${correct.option_label}. ${correct.option_text}` : '-';
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-24">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center space-x-3">
          <span className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Award className="w-5 h-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Meja Koreksi &amp; Pemeriksaan Jawaban Siswa
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                Mode Cepat Butir per Butir
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>Pendidik: <strong className="text-slate-800">{teacher.full_name}</strong></span>
              <span>•</span>
              {checkIsGuruKelas(teacher) ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                  <span>Guru Kelas &amp; Wali {teacher.grade_class || 'Kelas 2'}</span>
                  <span className="text-[10px] text-emerald-600 font-medium">(Kecuali PJOK &amp; PAI)</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[11px]">
                  <span>Guru Mapel Khusus: {teacher.assigned_subject_name || 'PJOK'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter Sesi Ujian */}
        <div className="flex items-center space-x-2 w-full md:w-auto shrink-0 justify-end">
          <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Sesi Ujian:</label>
          <select
            value={selectedSessionId}
            disabled={effectiveSessions.length === 0}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedSessionId(id);
              try { localStorage.setItem('sasi_teacher_session', id); } catch (err) {}
            }}
            className="w-full md:w-auto px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
          >
            {effectiveSessions.length === 0 ? (
              <option value="">Belum Ada Sesi untuk {teacher.grade_class || 'Kelas Ini'}</option>
            ) : (
              effectiveSessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.session_name} ({s.package?.subject?.name || 'Umum'})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {effectiveSessions.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200 shadow-sm max-w-2xl mx-auto my-6 space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Belum Ada Sesi Ujian Aktif untuk {teacher.grade_class || 'Kelas Anda'}
            </h3>
            <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
              Saat ini belum ada sesi ujian CBT yang dijadwalkan untuk rombel binaan Anda (<strong className="text-slate-800">{teacher.grade_class || 'Kelas 2'}</strong>). Meja koreksi dan daftar jawaban siswa akan otomatis tampil di sini saat proktor merilis sesi ujian kelas ini.
            </p>
          </div>
          <div className="pt-2">
            <span className="inline-flex items-center space-x-2 text-xs font-bold text-amber-800 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Sesi kelas lain (seperti Kelas 6) otomatis disaring demi keamanan penilaian.</span>
            </span>
          </div>
        </div>
      ) : (
        <>
      {/* Info Card Hybrid */}
      <div className="bg-gradient-to-r from-amber-50 via-emerald-50 to-indigo-50 border border-amber-200/80 rounded-2xl p-3 sm:p-3.5 text-xs text-slate-700 flex items-start space-x-2.5 shadow-2xs">
        <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-0.5">
          <p className="font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5">
            <span>Kemudahan Pemeriksaan Mandiri Guru:</span>
            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
              Auto-Accepted by Default
            </span>
          </p>
          <p className="leading-relaxed text-[11px] sm:text-xs">
            Sistem telah memberikan rekomendasi skor otomatis (toleransi typo isian ≥ 80% &amp; analisis konsep uraian). 
            Guru dapat mengoreksi <strong>seluruh siswa sekaligus untuk satu nomor soal</strong> di bawah ini. Anda dapat menyetujui rekomendasi nilai AI secara massal atau mengubah nilai siswa tertentu sesuai kebijakan Anda.
          </p>
        </div>
      </div>

      {/* 1. Toolbar Navigasi Soal Terpadu (1 Baris Efisien) */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        
        {/* Sisi Kiri: Filter Toggle Kategori Soal */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setTypeFilter('subjective'); setSelectedQuestionIndex(0); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'subjective' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Isian &amp; Uraian (Fokus Guru)
            </button>
            <button
              type="button"
              onClick={() => { setTypeFilter('all'); setSelectedQuestionIndex(0); }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                typeFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Nomor Soal
            </button>
          </div>
        </div>

        {/* Sisi Tengah: Daftar Badge Nomor Soal Horizontal (Scrollable jika banyak) */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 scrollbar-thin scrollbar-thumb-slate-200">
          {filteredQuestions.length > 0 ? (
            filteredQuestions.map((q, idx) => {
              const isCurrent = idx === selectedQuestionIndex;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQuestionIndex(idx)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 shrink-0 ${
                    isCurrent
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>No. {idx + 1}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                    isCurrent ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {q.question_type === 'Isian Singkat' ? 'Isian' : q.question_type === 'Uraian' ? 'Uraian' : 'PG'}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg font-medium whitespace-nowrap">
              Tidak ada soal bertipe <strong>{typeFilter === 'subjective' ? 'Isian & Uraian' : 'Objektif'}</strong> pada paket ini.
            </p>
          )}
        </div>

        {/* Sisi Kanan: Kontrol Navigasi Ringkas [ < ] [ Soal X dari Y ] [ > ] */}
        <div className="flex items-center gap-1 shrink-0 bg-slate-50 border border-slate-200 p-0.5 rounded-xl self-end md:self-auto">
          <button
            type="button"
            disabled={!currentQuestion || selectedQuestionIndex === 0}
            onClick={() => setSelectedQuestionIndex(prev => prev - 1)}
            className="p-1 hover:bg-white text-slate-700 disabled:opacity-30 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed"
            title="Soal Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-xs font-bold text-slate-700 px-2 font-mono whitespace-nowrap">
            Soal {filteredQuestions.length > 0 ? selectedQuestionIndex + 1 : 0} dari {filteredQuestions.length}
          </span>

          <button
            type="button"
            disabled={!currentQuestion || selectedQuestionIndex >= filteredQuestions.length - 1}
            onClick={() => setSelectedQuestionIndex(prev => prev + 1)}
            className="p-1 hover:bg-white text-slate-700 disabled:opacity-30 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed"
            title="Soal Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 2. Lembar Soal Aktif & Kunci Rubrik Guru (Header & Konten Padat) */}
      {currentQuestion ? (
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs space-y-2.5 sm:space-y-3">
          
          {/* Header Soal: Detail Kiri & Aksi Nilai Kanan */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            {/* Sisi Kiri: Badge Grup [Nomor] [Tipe] [Bobot] */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs shadow-2xs">
                Nomor {selectedQuestionIndex + 1}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                Tipe: {currentQuestion.question_type}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                Bobot: <strong>{currentQuestion.weight || 10} Poin</strong>
              </span>
            </div>

            {/* Sisi Kanan: Tombol Aksi Kompak */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {currentQuestion.question_type === 'Uraian' && (
                <button
                  type="button"
                  onClick={handleRunGeminiEssayGrading}
                  disabled={isGradingWithAI}
                  className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shadow-purple-600/20 transition-all disabled:opacity-50"
                  title="Nilai seluruh jawaban uraian siswa untuk soal ini menggunakan model Google Gemini AI"
                >
                  <Bot className={`w-3.5 h-3.5 ${isGradingWithAI ? 'animate-spin' : 'text-amber-300'}`} />
                  <span>{isGradingWithAI ? (aiGradingProgress || 'Menganalisis...') : 'Koreksi Gemini AI'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleApproveAllAI}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
                title="Terapkan seluruh nilai rekomendasi AI untuk semua siswa pada soal ini"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Setujui Rekomendasi</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAiSettingsOpen(true)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200"
                title="Pengaturan Kunci API Gemini AI"
              >
                <Settings className="w-3.5 h-3.5 text-purple-600" />
              </button>

              <button
                type="button"
                onClick={handleSaveAllGrades}
                disabled={isSaving}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-amber-500/25 transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Nilai'}</span>
              </button>
            </div>
          </div>

          {/* 3. Pokok Pertanyaan (Padding Proporsional p-3 sm:p-3.5) */}
          <div className="text-xs sm:text-sm text-slate-900 leading-relaxed bg-slate-50/90 p-3 sm:p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Pokok Pertanyaan:</span>
            <RichMathText content={currentQuestion.question_text} />
          </div>

          {/* 3. Kunci / Rubrik Pedoman Penskoran (Padding Proporsional p-3 sm:p-3.5) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
              Kunci Jawaban Ideal / Pedoman Penskoran Guru:
            </span>
            <div className="text-xs font-bold text-emerald-950 leading-relaxed">
              <RichMathText content={getKeyRubricText()} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-xs space-y-2.5 sm:space-y-3">
          <div className="flex items-center space-x-2 pb-2.5 border-b border-slate-100">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Kategori: {typeFilter === 'subjective' ? 'Isian & Uraian' : 'Objektif'}
            </span>
          </div>

          {/* Pokok Pertanyaan saat tidak ada isian/uraian */}
          <div className="text-xs sm:text-sm text-slate-900 leading-relaxed bg-slate-50/90 p-3 sm:p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Pokok Pertanyaan:</span>
            <p className="font-semibold text-slate-700">
              Tes ini tidak menyertakan jenis soal isian dan uraian.
            </p>
          </div>

          {/* Kunci Jawaban Ideal saat tidak ada isian/uraian */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
              Kunci Jawaban Ideal / Pedoman Penskoran Guru:
            </span>
            <div className="text-xs font-bold text-emerald-950 leading-relaxed">
              Tes ini tidak menyertakan jenis soal isian dan uraian.
            </div>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              💡 Paket asesmen ini seluruhnya terdiri dari butir soal pilihan ganda yang diperiksa dan dinilai otomatis 100% oleh sistem CBT.
            </p>
            <button
              type="button"
              onClick={() => { setTypeFilter('all'); setSelectedQuestionIndex(0); }}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <span>Beralih ke Tab "Semua Nomor Soal"</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabel Lembar Jawaban Seluruh Siswa untuk Soal Ini */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-3 sm:p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Daftar Jawaban Siswa ({studentRows.length} Siswa Terdata)
            </span>
            {saveSuccessMsg && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{saveSuccessMsg}</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Navigation Atas Tabel */}
            <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
              <button
                type="button"
                disabled={!currentQuestion || selectedQuestionIndex === 0}
                onClick={() => setSelectedQuestionIndex(prev => prev - 1)}
                className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:cursor-not-allowed"
                title="Pindah ke Soal Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              <span className="text-xs font-black text-amber-700 px-2.5 py-0.5 border-x border-slate-100 font-mono">
                #{filteredQuestions.length > 0 ? selectedQuestionIndex + 1 : 0} / {filteredQuestions.length}
              </span>
              <button
                type="button"
                disabled={!currentQuestion || selectedQuestionIndex >= filteredQuestions.length - 1}
                onClick={() => setSelectedQuestionIndex(prev => prev + 1)}
                className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 disabled:opacity-30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:cursor-not-allowed"
                title="Pindah ke Soal Berikutnya"
              >
                <span className="hidden sm:inline">Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-3 text-center w-12">No</th>
              <th className="py-3 px-4 w-48">Siswa & Kelas</th>
              <th className="py-3 px-4">Jawaban Siswa</th>
              <th className="py-3 px-4 w-64">Analisis AI & Typo</th>
              <th className="py-3 px-4 text-center w-36">Nilai Guru</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-slate-800">
            {!currentQuestion ? (
              <tr>
                <td colSpan={5} className="py-12 px-4 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
                      <p className="text-xs font-bold">
                        Tes ini tidak menyertakan jenis soal isian dan uraian.
                      </p>
                      <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                        Seluruh butir soal telah diperiksa dan dinilai secara otomatis oleh sistem CBT. Untuk melihat rincian opsi pilihan siswa, silakan beralih ke tab "Semua Nomor Soal".
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => { setTypeFilter('all'); setSelectedQuestionIndex(0); }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Beralih ke Tab "Semua Nomor Soal"</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : studentRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada data siswa yang cocok dengan filter saat ini.
                </td>
              </tr>
            ) : (
              studentRows.map((row, idx) => {
                const ans = row.answer;
                const studentText = ans?.answer_text || '(Belum / Tidak Menjawab)';
                const hasTextAnswer = !!ans?.answer_text && ans.answer_text.trim().length > 0;
                const hasSelectedOptions = Array.isArray(ans?.selected_option_ids) && ans.selected_option_ids.length > 0;
                const hasAnswer = !!ans && (hasTextAnswer || hasSelectedOptions);

                return (
                  <tr key={row.student.id} className="hover:bg-slate-50 transition-colors">
                    
                    {/* No */}
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Siswa */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900">{row.student.full_name}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        NISN: {row.student.username} • {row.student.grade_class || 'Kelas 6'}
                      </div>
                    </td>

                    {/* Jawaban Siswa */}
                    <td className="py-3 px-4">
                      {hasAnswer ? (
                        currentQuestion.question_type === 'Pilihan Ganda' ? (
                          (() => {
                            const selectedOpt = (currentQuestion.options || []).find(o => ans?.selected_option_ids?.includes(o.id));
                            const correctOpt = (currentQuestion.options || []).find(o => o.is_correct);
                            const isCorrect = selectedOpt && selectedOpt.is_correct;

                            return (
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 py-1">
                                {selectedOpt ? (
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 border shadow-2xs ${
                                    isCorrect
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-rose-50 text-rose-800 border-rose-300'
                                  }`}>
                                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border text-[11px]">
                                      {selectedOpt.option_label || 'Pilihan'}
                                    </span>
                                    <span>{selectedOpt.option_text}</span>
                                    <span className="font-black">{isCorrect ? '✓' : '✕'}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic font-mono text-[11px]">
                                    {ans?.selected_option_ids?.[0] || '(Opsi Terpilih)'}
                                  </span>
                                )}
                                {!isCorrect && correctOpt && (
                                  <span className="text-[11px] text-slate-500 italic">
                                    (Kunci: <strong>{correctOpt.option_label}. {correctOpt.option_text}</strong>)
                                  </span>
                                )}
                              </div>
                            );
                          })()
                        ) : currentQuestion.question_type === 'Pilihan Ganda Kompleks' ? (
                          (() => {
                            const selectedOpts = (currentQuestion.options || []).filter(o => ans?.selected_option_ids?.includes(o.id));
                            const correctOpts = (currentQuestion.options || []).filter(o => o.is_correct);
                            const isAllCorrect = selectedOpts.length === correctOpts.length && selectedOpts.every(o => o.is_correct);

                            return (
                              <div className="space-y-1.5 py-1">
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedOpts.length > 0 ? (
                                    selectedOpts.map(opt => {
                                      const isThisCorrect = opt.is_correct;
                                      return (
                                        <span key={opt.id} className={`px-2 py-0.5 rounded-md text-[11px] font-bold inline-flex items-center space-x-1 border shadow-2xs ${
                                          isThisCorrect
                                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                            : 'bg-rose-100 text-rose-800 border-rose-300'
                                        }`}>
                                          <span className="font-mono bg-white/70 px-1 rounded">{opt.option_label || '•'}</span>
                                          <span>{opt.option_text}</span>
                                          <span className="font-black">{isThisCorrect ? '✓' : '✕'}</span>
                                        </span>
                                      );
                                    })
                                  ) : (
                                    <span className="text-slate-400 italic">
                                      Terpilih {ans?.selected_option_ids?.length || 0} opsi
                                    </span>
                                  )}
                                </div>
                                {!isAllCorrect && correctOpts.length > 0 && (
                                  <div className="text-[10px] text-slate-500 italic">
                                    Kunci: {correctOpts.map(o => `${o.option_label}. ${o.option_text}`).join(' • ')}
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        ) : currentQuestion.question_type === 'Menjodohkan' && studentText.startsWith('{') ? (
                          (() => {
                            let map: Record<string, string> = {};
                            try { map = JSON.parse(studentText); } catch (e) {}
                            return (
                              <div className="space-y-1 py-1">
                                {(currentQuestion.options || []).map((pair) => {
                                  const studentPair = map[pair.id] || '-';
                                  const expectedPair = pair.matching_pair_text || pair.option_text;
                                  const isMatched = studentPair.trim().toLowerCase() === expectedPair.trim().toLowerCase();
                                  return (
                                    <div key={pair.id} className="text-[11px] flex items-center space-x-1.5">
                                      <span className="font-bold text-slate-600">{pair.option_text}</span>
                                      <span className="text-slate-400">➔</span>
                                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                                        isMatched ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                      }`}>
                                        {studentPair} {isMatched ? '✓' : '✕'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()
                        ) : currentQuestion.question_type === 'Benar/Salah' && studentText.startsWith('{') ? (
                          (() => {
                            let map: Record<string, string> = {};
                            try { map = JSON.parse(studentText); } catch (e) {}
                            return (
                              <div className="space-y-1.5 py-1">
                                {(currentQuestion.options || []).map((opt, i) => {
                                  const choice = map[opt.id];
                                  const expected = (opt.matching_pair_text || (opt.is_correct ? 'Benar' : 'Salah')).trim();
                                  const isMatched = choice && (
                                    choice.toLowerCase() === expected.toLowerCase() ||
                                    (expected.toLowerCase() === 'benar' && choice.toLowerCase() === 'sesuai') ||
                                    (expected.toLowerCase() === 'salah' && choice.toLowerCase() === 'tidak sesuai')
                                  );
                                  return (
                                    <div key={opt.id} className="flex flex-wrap items-center gap-1.5 text-xs">
                                      <span className="font-bold text-slate-500">#{i + 1}:</span>
                                      <span className={`px-2 py-0.5 rounded-md font-black text-[11px] inline-flex items-center space-x-1 ${
                                        isMatched
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : choice
                                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                          : 'bg-slate-100 text-slate-500'
                                      }`}>
                                        <span>{choice || '(Kosong)'}</span>
                                        <span>{isMatched ? '✓' : choice ? '✕' : ''}</span>
                                      </span>
                                      {!isMatched && (
                                        <span className="text-[10px] text-slate-400 italic">
                                          (Kunci: {expected})
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()
                        ) : (
                          <div className="font-mono text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200 break-words leading-relaxed">
                            {studentText}
                          </div>
                        )
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">
                          {row.isCompleted ? '(Jawaban Dikosongkan Siswa)' : 'Belum Menyelesaikan Ujian'}
                        </span>
                      )}
                    </td>

                    {/* Analisis AI & Typo */}
                    <td className="py-3 px-4">
                      {hasAnswer ? (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {row.typoSimilarity > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Typo Match: {row.typoSimilarity}%
                              </span>
                            )}
                            {row.conceptCoverage > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                                Ketercakupan: {row.conceptCoverage}%
                              </span>
                            )}
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                              Saran Skor: {row.autoScore}
                            </span>
                          </div>
                          {aiNotesMap[row.student.id] ? (
                            <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-0.5">
                              <span className="text-[9px] font-black uppercase text-purple-700 tracking-wider flex items-center gap-1">
                                <Bot className="w-3 h-3 text-purple-600" />
                                <span>Evaluasi Gemini AI:</span>
                              </span>
                              <p className="text-[11px] leading-relaxed font-semibold">
                                {aiNotesMap[row.student.id]}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-600 line-clamp-2">
                              {row.evalNote || 'Tercatat otomatis'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">-</span>
                      )}
                    </td>

                    {/* Nilai Guru (Editable) */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={row.maxScore}
                          value={row.currentGrade}
                          onChange={(e) => handleScoreChange(row.student.id, parseFloat(e.target.value))}
                          className={`w-16 text-center text-sm font-mono font-black py-1 px-1.5 rounded-xl border-2 transition-all outline-none ${
                            row.isOverridden
                              ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                              : 'border-slate-300 bg-white text-slate-900 focus:border-amber-500'
                          }`}
                        />
                        <span className="text-xs text-slate-400 font-semibold">/ {row.maxScore}</span>
                      </div>
                      {row.isOverridden && (
                        <span className="text-[9px] font-bold text-amber-700 block mt-1">
                          (Disesuaikan Guru)
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer Navigation & Save Action */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Quick Navigation Bawah Tabel */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!currentQuestion || selectedQuestionIndex === 0}
              onClick={() => {
                setSelectedQuestionIndex(prev => prev - 1);
                window.scrollTo({ top: 320, behavior: 'smooth' });
              }}
              className="px-3 py-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              title="Pindah ke Soal Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
              <span>Soal Sebelumnya</span>
            </button>

            <span className="text-xs font-black text-amber-900 bg-amber-50 px-3 py-2 rounded-xl border border-amber-300 shadow-2xs font-mono">
              Soal #{filteredQuestions.length > 0 ? selectedQuestionIndex + 1 : 0} / {filteredQuestions.length}
            </span>

            <button
              type="button"
              disabled={!currentQuestion || selectedQuestionIndex >= filteredQuestions.length - 1}
              onClick={() => {
                setSelectedQuestionIndex(prev => prev + 1);
                window.scrollTo({ top: 320, behavior: 'smooth' });
              }}
              className="px-3 py-2 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              title="Pindah ke Soal Berikutnya"
            >
              <span>Soal Berikutnya</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSaveAllGrades}
              disabled={isSaving || !currentQuestion}
              className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md shadow-amber-500/25 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Nilai Butir Soal Ini'}</span>
            </button>
          </div>
        </div>

      </div>
      </>
      )}

      {/* Modal: Setelan Google Gemini AI Koreksi */}
      {isAiSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Setelan Google Gemini AI</h3>
                  <p className="text-xs text-slate-500">Koreksi otomatis jawaban uraian dengan kecerdasan buatan</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiSettingsOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Google Gemini API Key</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 normal-case"
                  >
                    <span>Dapatkan Kunci Gratis</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="text"
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder="AQ.Ab... atau AIzaSy..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Kunci tersimpan aman di browser Anda dan secara otomatis membaca konfigurasi sekolah jika dikosongkan.
                </p>
              </div>

              {/* Status & Uji Koneksi */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Validasi Koneksi AI</span>
                  <span className="text-[11px] text-slate-500">Model aktif: Gemini 3.8 / 3.5 Flash</span>
                </div>

                <div className="flex items-center gap-2">
                  {geminiTestResult && (
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      geminiTestResult.ok ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {geminiTestResult.ok ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Aktif ({geminiTestResult.latencyMs} ms)</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          <span className="truncate max-w-[120px]">{geminiTestResult.error}</span>
                        </>
                      )}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleTestGeminiKey}
                    disabled={isTestingGemini}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Wifi className={`w-3.5 h-3.5 ${isTestingGemini ? 'animate-pulse' : ''}`} />
                    <span>{isTestingGemini ? 'Menguji...' : 'Uji Koneksi'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAiSettingsOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveGeminiKey}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-colors"
              >
                Simpan Setelan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { UserProfile, StudentAttempt, ExamSession, QuestionBankItem, QuestionOption, StudentAnswer } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { toValidUUID, safeSupabaseUpsert, generateValidUUID } from '../../lib/syncHelper';
import { evaluateShortAnswer, evaluateEssayLocal } from '../../lib/autoScorer';
import { RichMathText } from '../common/RichMathText';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Save, 
  RotateCcw, 
  Edit3, 
  HelpCircle, 
  Award,
  Layers,
  FileText
} from 'lucide-react';

interface StudentAnswerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserProfile;
  attempt?: StudentAttempt | null;
  session?: ExamSession | null;
  questions: QuestionBankItem[];
  kktpThreshold?: number;
  onSaved: (studentId: string, newFinalScore: number) => void;
}

interface QuestionReviewItem {
  question: QuestionBankItem;
  answer?: StudentAnswer;
  scoreObtained: number;
  autoScoreObtained: number;
  maxScore: number;
  evalNote: string;
  isOverridden: boolean;
  similarityPercent?: number;
  coveragePercent?: number;
}

export const StudentAnswerReviewModal: React.FC<StudentAnswerReviewModalProps> = ({
  isOpen,
  onClose,
  student,
  attempt,
  session,
  questions,
  kktpThreshold = 75,
  onSaved
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewItems, setReviewItems] = useState<QuestionReviewItem[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadStudentData = async () => {
      setLoading(true);

      let answersList: StudentAnswer[] = [];

      // 1. Coba baca dari Supabase Cloud (Router Kluster Sekolah & Master)
      if (attempt?.id) {
        try {
          const clusterClient = getSupabaseClientForSchool(student.school_id);
          const { data, error } = await clusterClient
            .from('student_answers')
            .select('*')
            .eq('attempt_id', toValidUUID(attempt.id));

          if (!error && data && data.length > 0) {
            answersList = data as StudentAnswer[];
          }

          if (clusterClient !== supabase) {
            const { data: masterData } = await supabase
              .from('student_answers')
              .select('*')
              .eq('attempt_id', toValidUUID(attempt.id));

            if (masterData && masterData.length > 0) {
              const map = new Map<string, any>();
              masterData.forEach(m => map.set(m.question_id, m));
              answersList.forEach(s => map.set(s.question_id, s));
              answersList = Array.from(map.values());
            }
          }
        } catch (e) {}
      }

      // 2. Fallback baca dari LocalStorage
      if (answersList.length === 0) {
        try {
          const cachedAnswers = localStorage.getItem(`sasi_cbt_answers_${student.id}`);
          if (cachedAnswers) {
            const parsed = JSON.parse(cachedAnswers);
            answersList = Object.values(parsed);
          }
        } catch (e) {}
      }

      // 3. Bangun item evaluasi per butir soal
      const items: QuestionReviewItem[] = questions.map((q) => {
        const w = q.weight || 10;
        const ans = answersList.find(a => a.question_id === q.id);
        
        let autoScore = 0;
        let note = '';
        let similarity = 0;
        let coverage = 0;

        if (ans) {
          if (q.question_type === 'Pilihan Ganda') {
            const correctOpt = q.options?.find(o => o.is_correct);
            const isMatch = correctOpt && ans.selected_option_ids?.includes(correctOpt.id);
            autoScore = isMatch ? w : 0;
            note = isMatch ? 'Benar (Kunci PG Sesuai)' : 'Kurang Tepat (Kunci PG Tidak Cocok)';
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
                const ratio = correctCount / total;
                autoScore = Math.round(ratio * w);
                note = ratio === 1 ? `Sempurna (${total}/${total} tepat)` : `Parsial (${correctCount}/${total} tepat)`;
              }
            } else {
              const correctOpt = q.options?.find(o => o.is_correct);
              const isMatch = correctOpt && (
                ans.selected_option_ids?.includes(correctOpt.id) ||
                (ans.answer_text && correctOpt.option_text.trim().toLowerCase() === ans.answer_text.trim().toLowerCase())
              );
              autoScore = isMatch ? w : 0;
              note = isMatch ? 'Benar (Benar/Salah Sesuai)' : 'Kurang Tepat';
            }
          } else if (q.question_type === 'Pilihan Ganda Kompleks') {
            const correctIds = (q.options?.filter(o => o.is_correct) || []).map(o => o.id).sort();
            const studentIds = (ans.selected_option_ids || []).slice().sort();
            if (correctIds.length > 0 && JSON.stringify(correctIds) === JSON.stringify(studentIds)) {
              autoScore = w;
              note = `Sempurna (${correctIds.length} opsi tepat)`;
            } else if (correctIds.length > 0 && studentIds.length > 0) {
              const matchedCount = studentIds.filter(id => correctIds.includes(id)).length;
              const wrongCount = studentIds.filter(id => !correctIds.includes(id)).length;
              if (wrongCount === 0 && matchedCount > 0) {
                const ratio = matchedCount / correctIds.length;
                autoScore = Math.round(ratio * w * 10) / 10;
                note = `Parsial (${matchedCount}/${correctIds.length} opsi benar)`;
              } else {
                autoScore = 0;
                note = `Terdapat ${wrongCount} opsi salah`;
              }
            }
          } else if (q.question_type === 'Menjodohkan') {
            let studentMap: Record<string, string> = {};
            try {
              if (ans.answer_text) studentMap = JSON.parse(ans.answer_text);
            } catch (e) {}
            const pairs = q.options || [];
            let correctCount = 0;
            pairs.forEach(pair => {
              const expected = (pair.matching_pair_text || pair.option_text).trim().toLowerCase();
              const studentPair = (studentMap[pair.id] || '').trim().toLowerCase();
              if (studentPair && studentPair === expected) correctCount++;
            });
            const ratio = pairs.length > 0 ? (correctCount / pairs.length) : 0;
            autoScore = Math.round(ratio * w * 10) / 10;
            note = `Menjodohkan: ${correctCount}/${pairs.length} pasangan tepat`;
          } else if (q.question_type === 'Isian Singkat') {
            const keyOpt = q.options?.find(o => o.option_label === 'Kunci') || q.options?.[0];
            const keyAnswer = keyOpt?.option_text || '';
            const studentText = ans.answer_text || '';
            const evalResult = evaluateShortAnswer(studentText, keyAnswer, 80);
            autoScore = evalResult.isCorrect ? w : 0;
            similarity = evalResult.similarityPercent;
            note = evalResult.evaluationNote;
          } else if (q.question_type === 'Uraian') {
            const rubricOpt = q.options?.find(o => o.option_label === 'Rubrik') || q.options?.[0];
            const modelAnswer = rubricOpt?.option_text || q.explanation || '';
            const studentText = ans.answer_text || '';
            const evalResult = evaluateEssayLocal(studentText, modelAnswer);
            autoScore = Math.round(evalResult.scoreRatio * w * 10) / 10;
            coverage = evalResult.conceptCoveragePercent;
            note = evalResult.evaluationNote;
          }
        }

        const effectiveScore = (ans?.score_obtained !== undefined && ans?.score_obtained !== null)
          ? Number(ans.score_obtained)
          : autoScore;

        return {
          question: q,
          answer: ans,
          scoreObtained: effectiveScore,
          autoScoreObtained: autoScore,
          maxScore: w,
          evalNote: note,
          isOverridden: (ans?.score_obtained !== undefined && ans?.score_obtained !== null && ans.score_obtained !== autoScore),
          similarityPercent: similarity,
          coveragePercent: coverage
        };
      });

      setReviewItems(items);
      setLoading(false);
    };

    loadStudentData();
  }, [isOpen, student.id, attempt?.id, questions]);

  if (!isOpen) return null;

  // Kalkulasi Skor Total Saat Ini
  const totalWeight = reviewItems.reduce((acc, item) => acc + item.maxScore, 0);
  const totalEarned = reviewItems.reduce((acc, item) => acc + item.scoreObtained, 0);
  const finalCalculatedScore = totalWeight > 0 ? Math.round((totalEarned / totalWeight) * 100) : 0;
  const isPassed = finalCalculatedScore >= kktpThreshold;

  const handleScoreChange = (qId: string, newScoreVal: number) => {
    setReviewItems(prev => prev.map(item => {
      if (item.question.id !== qId) return item;
      const clamped = Math.max(0, Math.min(item.maxScore, Number(newScoreVal) || 0));
      return {
        ...item,
        scoreObtained: clamped,
        isOverridden: clamped !== item.autoScoreObtained
      };
    }));
  };

  const handleResetToAuto = () => {
    setReviewItems(prev => prev.map(item => ({
      ...item,
      scoreObtained: item.autoScoreObtained,
      isOverridden: false
    })));
  };

  const handleSaveGrades = async () => {
    setSaving(true);
    try {
      const validAttemptId = attempt?.id ? toValidUUID(attempt.id) : generateValidUUID();

      // 1. Simpan perolehan nilai setiap butir soal ke student_answers
      for (const item of reviewItems) {
        const validAnswerId = item.answer?.id ? toValidUUID(item.answer.id) : generateValidUUID();
        await safeSupabaseUpsert('student_answers', {
          id: validAnswerId,
          attempt_id: validAttemptId,
          question_id: toValidUUID(item.question.id),
          selected_option_ids: item.answer?.selected_option_ids || [],
          answer_text: item.answer?.answer_text || null,
          is_doubtful: item.answer?.is_doubtful || false,
          score_obtained: item.scoreObtained
        }, student.school_id);
      }

      // 2. Perbarui nilai akhir (final_score) di student_attempts Kluster Sekolah
      if (attempt?.id) {
        const clusterClient = getSupabaseClientForSchool(student.school_id);
        await clusterClient
          .from('student_attempts')
          .update({
            final_score: finalCalculatedScore,
            updated_at: new Date().toISOString()
          })
          .eq('id', toValidUUID(attempt.id));
      }

      setSuccessToast('Nilai dan koreksi berhasil disimpan! Rekap nilai telah diperbarui.');
      onSaved(student.id, finalCalculatedScore);

      setTimeout(() => {
        setSuccessToast(null);
        onClose();
      }, 1400);
    } catch (err) {
      console.error('Error saving teacher grades:', err);
      alert('Terjadi kendala saat menyimpan koreksi nilai.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 to-brand-950 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/20 text-brand-300 border border-brand-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base text-white">
                  Tinjau & Koreksi Jawaban Siswa
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Mode Hybrid Smart NLP
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {student.full_name} • NISN: {student.username} • Kelas {student.grade_class || '6-A'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Skor Summary Strip */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Skor Akhir Siswa
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black font-mono text-slate-900">
                  {finalCalculatedScore}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  / 100 ({totalEarned.toFixed(1)} dari total bobot {totalWeight})
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200" />

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Status Ketuntasan (KKTP: {kktpThreshold})
              </span>
              {isPassed ? (
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>TUNTAS</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>REMEDIAL</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetToAuto}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl flex items-center space-x-1.5 transition-colors shadow-2xs"
              title="Kembalikan semua nilai ke penilaian cerdas otomatis"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Nilai AI</span>
            </button>
          </div>
        </div>

        {/* Content Body: List Soal & Jawaban */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Notification Info Banner */}
          <div className="bg-brand-50/70 border border-brand-200 rounded-2xl p-4 text-xs text-brand-900 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-slate-900">
                Kebijakan Otoritas & Penerimaan Nilai Otomatis:
              </p>
              <p className="text-slate-600 leading-relaxed">
                Nilai di bawah ini telah dikalkulasi secara otomatis oleh mesin cerdas SASI (termasuk toleransi typo <strong>≥ 80%</strong> untuk Isian Singkat dan pemindaian konsep semantik untuk Uraian). <strong>Jika tidak diubah, nilai ini sah dan diterima secara otomatis</strong> sehingga dapat langsung dicetak. Anda berwenang penuh mengubah angka perolehan pada kolom kanan jika diperlukan.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Memuat data jawaban & hasil evaluasi siswa...</p>
            </div>
          ) : reviewItems.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Tidak ada data butir soal untuk sesi ujian ini.
            </div>
          ) : (
            <div className="space-y-5">
              {reviewItems.map((item, idx) => {
                const q = item.question;
                const studentAns = item.answer;

                // Format Kunci Jawaban
                let keyText = '-';
                if (q.question_type === 'Pilihan Ganda') {
                  const correct = q.options?.find(o => o.is_correct);
                  keyText = correct ? `${correct.option_label}. ${correct.option_text}` : '-';
                } else if (q.question_type === 'Benar/Salah') {
                  const isMultiStatement = Array.isArray(q.options) && q.options.length > 0 &&
                    !(q.options.length === 2 && (q.options[0].option_text === 'Benar' || q.options[0].option_text === 'Salah'));
                  if (isMultiStatement && q.options) {
                    keyText = q.options.map((o, i) => `${i + 1}. [${o.matching_pair_text || (o.is_correct ? 'Benar' : 'Salah')}]`).join(' | ');
                  } else {
                    const correct = q.options?.find(o => o.is_correct);
                    keyText = correct ? correct.option_text : '-';
                  }
                } else if (q.question_type === 'Pilihan Ganda Kompleks') {
                  const corrects = q.options?.filter(o => o.is_correct) || [];
                  keyText = corrects.map(o => `${o.option_label}. ${o.option_text}`).join(' | ');
                } else if (q.question_type === 'Isian Singkat') {
                  const keyOpt = q.options?.find(o => o.option_label === 'Kunci') || q.options?.[0];
                  keyText = keyOpt?.option_text || '-';
                } else if (q.question_type === 'Uraian') {
                  const rubrikOpt = q.options?.find(o => o.option_label === 'Rubrik') || q.options?.[0];
                  keyText = rubrikOpt?.option_text || q.explanation || '-';
                } else if (q.question_type === 'Menjodohkan') {
                  keyText = (q.options || []).map(p => `${p.option_text} ➔ ${p.matching_pair_text || p.option_text}`).join('; ');
                }

                // Format Jawaban Siswa
                let studentDisplayAnswer = '(Tidak Dijawab)';
                if (studentAns) {
                  if (q.question_type === 'Pilihan Ganda') {
                    const selId = studentAns.selected_option_ids?.[0];
                    const selOpt = q.options?.find(o => o.id === selId);
                    studentDisplayAnswer = selOpt ? `${selOpt.option_label}. ${selOpt.option_text}` : '(Kosong)';
                  } else if (q.question_type === 'Benar/Salah') {
                    if (studentAns.answer_text && studentAns.answer_text.startsWith('{')) {
                      try {
                        const parsed = JSON.parse(studentAns.answer_text);
                        const parts = (q.options || []).map((o, i) => `${i + 1}. ${parsed[o.id] || '-'}`);
                        studentDisplayAnswer = parts.join(' | ');
                      } catch (e) {
                        studentDisplayAnswer = studentAns.answer_text;
                      }
                    } else {
                      const selId = studentAns.selected_option_ids?.[0];
                      const selOpt = q.options?.find(o => o.id === selId);
                      studentDisplayAnswer = selOpt ? selOpt.option_text : (studentAns.answer_text || '(Kosong)');
                    }
                  } else if (q.question_type === 'Pilihan Ganda Kompleks') {
                    const selIds = studentAns.selected_option_ids || [];
                    const selOpts = q.options?.filter(o => selIds.includes(o.id)) || [];
                    studentDisplayAnswer = selOpts.length > 0 
                      ? selOpts.map(o => `${o.option_label}. ${o.option_text}`).join(' | ')
                      : '(Kosong)';
                  } else if (q.question_type === 'Menjodohkan') {
                    studentDisplayAnswer = studentAns.answer_text || '(Kosong)';
                  } else {
                    studentDisplayAnswer = studentAns.answer_text || '(Kosong)';
                  }
                }

                return (
                  <div 
                    key={q.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
                  >
                    {/* Header Butir */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          {q.question_type}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Bobot Maksimal: {item.maxScore}
                        </span>
                      </div>

                      {/* Skor Input Guru */}
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                          <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                          <span>Nilai Guru:</span>
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={item.maxScore}
                          value={item.scoreObtained}
                          onChange={(e) => handleScoreChange(q.id, parseFloat(e.target.value))}
                          className={`w-20 text-center text-sm font-mono font-black py-1 px-2 rounded-xl border-2 transition-all outline-none ${
                            item.isOverridden
                              ? 'border-brand-500 bg-brand-50/50 text-brand-900 ring-2 ring-brand-500/20'
                              : 'border-slate-300 bg-slate-50 text-slate-900 focus:border-brand-500'
                          }`}
                        />
                        <span className="text-xs text-slate-400 font-semibold">/ {item.maxScore}</span>
                      </div>
                    </div>

                    {/* Pertanyaan */}
                    <div className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                      <RichMathText content={q.question_text} />
                    </div>

                    {/* Perbandingan Jawaban Siswa vs Kunci Guru */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Jawaban Siswa */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Jawaban Siswa:
                        </span>
                        <div className="text-xs font-bold text-slate-900 break-words font-mono">
                          {studentDisplayAnswer}
                        </div>
                      </div>

                      {/* Kunci / Rubrik Guru */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                          Kunci / Rubrik Guru:
                        </span>
                        <div className="text-xs font-bold text-emerald-900 break-words">
                          <RichMathText content={keyText} />
                        </div>
                      </div>
                    </div>

                    {/* Evaluasi Mesin AI / Smart NLP */}
                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-bold text-indigo-950">
                          Catatan Evaluator:
                        </span>
                        <span className="text-indigo-800">
                          {item.evalNote || 'Tercatat otomatis'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {item.similarityPercent !== undefined && item.similarityPercent > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Kemiripan Typo: {item.similarityPercent}%
                          </span>
                        )}
                        {item.coveragePercent !== undefined && item.coveragePercent > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                            Ketercakupan Konsep: {item.coveragePercent}%
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                          Skor AI: {item.autoScoreObtained}
                        </span>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {successToast ? (
              <span className="font-bold text-emerald-700 flex items-center space-x-1.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successToast}</span>
              </span>
            ) : (
              <span>* Perubahan nilai akan langsung memperbarui leger dan cetak rapor hasil ujian.</span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Tutup (Terima Otomatis)
            </button>

            <button
              type="button"
              onClick={handleSaveGrades}
              disabled={saving}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-brand-500/25 transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan & Terapkan Nilai'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

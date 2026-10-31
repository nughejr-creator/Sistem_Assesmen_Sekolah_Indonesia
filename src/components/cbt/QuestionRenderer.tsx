import React from 'react';
import { QuestionBankItem, QuestionOption, StudentAnswer } from '../../types/database';
import { Sparkles, CheckSquare, Square, Check, Layers } from 'lucide-react';
import { RichMathText } from '../common/RichMathText';

interface QuestionRendererProps {
  question: QuestionBankItem;
  fontSize: 'normal' | 'large' | 'xlarge';
  answer?: StudentAnswer;
  onUpdateAnswer: (selectedOptionIds?: string[], answerText?: string) => void;
  showAnswerKey?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  fontSize,
  answer,
  onUpdateAnswer,
  showAnswerKey = false,
}) => {
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'large':
        return 'text-lg leading-relaxed';
      case 'xlarge':
        return 'text-xl leading-loose';
      default:
        return 'text-base leading-relaxed';
    }
  };

  // 1. Pilihan Ganda Single Answer
  const handleSelectRadio = (optionId: string) => {
    onUpdateAnswer([optionId], undefined);
  };

  // 2. Pilihan Ganda Kompleks Multiple Answers
  const handleToggleCheckbox = (optionId: string) => {
    const current = answer?.selected_option_ids || [];
    const exists = current.includes(optionId);
    const updated = exists 
      ? current.filter(id => id !== optionId)
      : [...current, optionId];
    onUpdateAnswer(updated, undefined);
  };

  // 3. Menjodohkan
  const handleMatchingSelect = (pairId: string, matchedVal: string) => {
    let currentMap: Record<string, string> = {};
    try {
      if (answer?.answer_text) {
        currentMap = JSON.parse(answer.answer_text);
      }
    } catch (e) {
      currentMap = {};
    }
    currentMap[pairId] = matchedVal;
    onUpdateAnswer(undefined, JSON.stringify(currentMap));
  };

  // 4. Benar / Salah (Model Tunggal Legacy)
  const handleSelectBenarSalah = (val: 'Benar' | 'Salah') => {
    onUpdateAnswer(undefined, val);
  };

  // 4b. Benar / Salah & Sesuai / Tidak Sesuai (Model Matriks Tabel Pernyataan)
  const handleSelectBenarSalahMatrix = (statementId: string, choiceVal: string) => {
    let currentMap: Record<string, string> = {};
    try {
      if (answer?.answer_text && answer.answer_text.startsWith('{')) {
        currentMap = JSON.parse(answer.answer_text);
      }
    } catch (e) {
      currentMap = {};
    }
    currentMap[statementId] = choiceVal;
    const answeredIds = Object.keys(currentMap);
    onUpdateAnswer(answeredIds, JSON.stringify(currentMap));
  };

  // Image layout helper
  const getImageContainerClass = () => {
    switch (question.stimulus_media_align) {
      case 'left':
        return 'flex justify-start';
      case 'right':
        return 'flex justify-end';
      case 'float-left':
        return 'float-left mr-5 mb-4 max-w-[50%]';
      case 'float-right':
        return 'float-right ml-5 mb-4 max-w-[50%]';
      case 'center':
      default:
        return 'flex flex-col items-center justify-center';
    }
  };

  const renderStimulusMedia = () => {
    if (!question.stimulus_media_url) return null;

    let width = question.stimulus_media_width;
    let align = question.stimulus_media_align;
    let caption = question.stimulus_media_caption;
    let cleanUrl = question.stimulus_media_url;

    // Ekstrak metadata ukuran, tata letak, dan caption dari URL jika tersimpan sebagai fragment #meta:
    if (cleanUrl.includes('#meta:')) {
      const parts = cleanUrl.split('#meta:');
      cleanUrl = parts[0];
      const params = new URLSearchParams(parts[1] || '');
      if (!width && params.get('w')) width = params.get('w')!;
      if (!align && params.get('a')) align = params.get('a') as any;
      if (!caption && params.get('c')) caption = decodeURIComponent(params.get('c')!);
    }

    const containerClass = align === 'left' 
      ? 'flex justify-start' 
      : align === 'right' 
      ? 'flex justify-end' 
      : align === 'float-left' 
      ? 'float-left mr-5 mb-4 max-w-[50%]' 
      : align === 'float-right' 
      ? 'float-right ml-5 mb-4 max-w-[50%]' 
      : 'flex flex-col items-center justify-center';

    return (
      <div className={containerClass}>
        <div 
          className="bg-white p-2.5 rounded-xl border border-slate-200 inline-block shadow-2xs"
          style={{ width: width ? width : 'auto', maxWidth: '100%' }}
        >
          <img
            src={cleanUrl}
            alt={caption || "Stimulus Asesmen"}
            className="max-h-72 w-full object-contain rounded-lg"
          />
          {caption && (
            <p className="text-[11px] text-slate-500 text-center italic mt-1.5 font-serif">
              {caption}
            </p>
          )}
        </div>
      </div>
    );
  };

  // User Requirement: jika stimulus kosong (termasuk tag HTML kosong &nbsp; / spasi), jangan tampilkan sama sekali
  const cleanStimulusText = question.stimulus_text 
    ? question.stimulus_text
        .replace(/&nbsp;/gi, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .trim()
    : '';
  const hasStimulusText = Boolean(question.stimulus_text && cleanStimulusText.length > 0);
  const hasStimulusMedia = Boolean(question.stimulus_media_url && question.stimulus_media_url.trim().length > 0);
  const hasStimulus = hasStimulusText || hasStimulusMedia;

  return (
    <div className={`space-y-6 font-serif ${getFontSizeClass()}`}>
      
      {/* Stimulus Box (HANYA MUNCUL JIKA STIMULUS TEKS / MEDIA BENAR-BENAR ADA) */}
      {hasStimulus && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 overflow-hidden clearfix font-serif">
          <div className="flex items-center space-x-1.5 text-xs font-sans font-bold text-brand-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Wacana / Stimulus Soal</span>
          </div>

          {/* Posisi Gambar: Di Atas Teks (default) */}
          {question.stimulus_media_position !== 'below' && renderStimulusMedia()}

          {hasStimulusText && (
            <div className="text-slate-800 leading-relaxed font-serif bg-white/70 p-4 rounded-xl border border-slate-200/60 shadow-2xs">
              <RichMathText content={question.stimulus_text!} />
            </div>
          )}

          {/* Posisi Gambar: Di Bawah Teks (Sesuai Permintaan User) */}
          {question.stimulus_media_position === 'below' && renderStimulusMedia()}
        </div>
      )}

      {/* Pokok Pertanyaan (Stem) - Menggunakan Font Serif Ramping yang Sama Persis dengan Stimulus (Default font-normal, tebal hanya jika diformat bold) */}
      <div className="font-serif font-normal text-slate-900 tracking-normal leading-relaxed">
        <RichMathText content={question.question_text || '(Pertanyaan belum diisi)'} />
      </div>

      {/* TIPE 1: PILIHAN GANDA */}
      {question.question_type === 'Pilihan Ganda' && (
        <div className="space-y-3 pt-2">
          {question.options?.map((opt) => {
            const isSelected = answer?.selected_option_ids?.includes(opt.id);
            const isKey = showAnswerKey && Boolean(opt.is_correct);

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectRadio(opt.id)}
                className={`w-full text-left p-3.5 rounded-xl border-2 flex items-start space-x-3 transition-all ${
                  isKey
                    ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-medium shadow-xs ring-2 ring-emerald-500/20'
                    : isSelected
                    ? 'border-brand-600 bg-brand-50/70 text-brand-900 font-semibold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isKey
                      ? 'bg-emerald-600 text-white font-black'
                      : isSelected
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {opt.option_label}
                </span>
                <div className="pt-0.5 flex-1">
                  <RichMathText content={opt.option_text} />
                </div>
                {isKey && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    <Check className="w-3 h-3 mr-1 text-emerald-600 stroke-[3]" /> KUNCI JAWABAN
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* TIPE 2: PILIHAN GANDA KOMPLEKS */}
      {question.question_type === 'Pilihan Ganda Kompleks' && (
        <div className="space-y-3 pt-2">
          <div className="text-xs text-brand-700 font-bold bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200 inline-block">
            * Jawaban benar lebih dari satu. Centang semua pilihan yang tepat.
          </div>
          {question.options?.map((opt) => {
            const isSelected = answer?.selected_option_ids?.includes(opt.id);
            const isKey = showAnswerKey && Boolean(opt.is_correct);

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleToggleCheckbox(opt.id)}
                className={`w-full text-left p-3.5 rounded-xl border-2 flex items-start space-x-3 transition-all ${
                  isKey
                    ? 'border-emerald-500 bg-emerald-50/90 text-emerald-950 font-medium shadow-xs ring-2 ring-emerald-500/20'
                    : isSelected
                    ? 'border-brand-600 bg-brand-50/70 text-brand-900 font-semibold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0 transition-colors ${
                    isKey
                      ? 'bg-emerald-600 text-white border-2 border-emerald-600'
                      : isSelected
                      ? 'bg-brand-600 text-white'
                      : 'border-2 border-slate-300 bg-white'
                  }`}
                >
                  {(isSelected || isKey) && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
                <div className="pt-0.5 flex-1">
                  <RichMathText content={opt.option_text} />
                </div>
                {isKey && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    <Check className="w-3 h-3 mr-1 text-emerald-600 stroke-[3]" /> Kunci Benar
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* TIPE 3: MENJODOHKAN */}
      {question.question_type === 'Menjodohkan' && (
        <div className="space-y-3 pt-2">
          <div className="text-xs text-slate-500 font-medium mb-1">
            Pilihlah pasangan yang sesuai pada kolom sebelah kanan:
          </div>
          {question.options?.map((opt, idx) => {
            let currentMatches: Record<string, string> = {};
            try {
              if (answer?.answer_text) currentMatches = JSON.parse(answer.answer_text);
            } catch (e) {}

            const selectedVal = currentMatches[opt.id] || '';

            return (
              <div
                key={opt.id}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white border border-slate-200 rounded-xl items-center"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="font-semibold text-slate-800 flex-1">
                    <RichMathText content={opt.option_text} />
                  </div>
                </div>

                <div>
                  {showAnswerKey ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg font-bold text-emerald-900 flex items-center justify-between shadow-2xs">
                      <span>{opt.matching_pair_text || opt.option_text}</span>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-flex items-center">
                        <Check className="w-3 h-3 mr-1 text-emerald-600 stroke-[3]" /> Pasangan Kunci
                      </span>
                    </div>
                  ) : (
                    <select
                      value={selectedVal}
                      onChange={(e) => handleMatchingSelect(opt.id, e.target.value)}
                      className="w-full font-bold text-brand-800 p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">-- Pilih Pasangan --</option>
                      {question.options?.map((pairOpt) => (
                        <option key={pairOpt.id} value={pairOpt.matching_pair_text || pairOpt.option_text}>
                          {pairOpt.matching_pair_text || pairOpt.option_text}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TIPE 4: BENAR / SALAH & SESUAI / TIDAK SESUAI */}
      {question.question_type === 'Benar/Salah' && (() => {
        // Deteksi apakah format matriks pernyataan jamak atau model tunggal legacy
        const isMultiStatement = Array.isArray(question.options) && question.options.length > 0 &&
          !(question.options.length === 2 && (question.options[0].option_text === 'Benar' || question.options[0].option_text === 'Salah'));

        if (!isMultiStatement) {
          const isBenarKey = showAnswerKey && (question.options?.[0]?.is_correct === true || question.options?.[0]?.matching_pair_text === 'Benar');
          const isSalahKey = showAnswerKey && (question.options?.[1]?.is_correct === true || question.options?.[1]?.matching_pair_text === 'Salah' || (question.options?.[0] && !question.options[0].is_correct));

          // Fallback model tunggal legacy
          return (
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => handleSelectBenarSalah('Benar')}
                className={`flex-1 py-4 px-6 rounded-xl border-2 text-center font-bold text-base transition-all ${
                  isBenarKey
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                    : answer?.answer_text === 'Benar'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                ✓ BENAR {isBenarKey && ' (KUNCI)'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectBenarSalah('Salah')}
                className={`flex-1 py-4 px-6 rounded-xl border-2 text-center font-bold text-base transition-all ${
                  isSalahKey
                    ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20 shadow-xs'
                    : answer?.answer_text === 'Salah'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                ✕ SALAH {isSalahKey && ' (KUNCI)'}
              </button>
            </div>
          );
        }

        // Tentukan label kolom: (Sesuai - Tidak Sesuai) atau (Benar - Salah)
        const isSesuaiMode = question.options?.some(o => 
          o.matching_pair_text === 'Sesuai' || 
          o.matching_pair_text === 'Tidak Sesuai' || 
          o.distractor_note === 'SESUAI_TIDAK_SESUAI'
        );
        const posHeader = isSesuaiMode ? 'Sesuai' : 'Benar';
        const negHeader = isSesuaiMode ? 'Tidak Sesuai' : 'Salah';

        // Parse jawaban siswa
        let studentAnswers: Record<string, string> = {};
        try {
          if (answer?.answer_text && answer.answer_text.startsWith('{')) {
            studentAnswers = JSON.parse(answer.answer_text);
          }
        } catch (e) {
          studentAnswers = {};
        }

        return (
          <div className="pt-4 space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
              <span>Tentukan apakah pernyataan-pernyataan di bawah ini bernilai {posHeader} atau {negHeader}:</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Pernyataan</th>
                    <th className="py-3.5 px-4 text-center w-28 sm:w-36 text-emerald-800 bg-emerald-50/50">
                      {posHeader}
                    </th>
                    <th className="py-3.5 px-4 text-center w-28 sm:w-36 text-rose-800 bg-rose-50/50">
                      {negHeader}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {question.options?.map((statement, idx) => {
                    const stVal = studentAnswers[statement.id];
                    const isPosSelected = stVal === posHeader;
                    const isNegSelected = stVal === negHeader;

                    const isStatementPosKey = showAnswerKey && (
                      statement.matching_pair_text === posHeader || 
                      (statement.is_correct === true && !statement.matching_pair_text)
                    );
                    const isStatementNegKey = showAnswerKey && (
                      statement.matching_pair_text === negHeader || 
                      (statement.is_correct === false && !statement.matching_pair_text)
                    );

                    return (
                      <tr key={statement.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* No */}
                        <td className="py-4 px-4 text-center font-black text-slate-500 bg-slate-50/30">
                          {idx + 1}.
                        </td>

                        {/* Teks Pernyataan */}
                        <td className="py-4 px-4 font-medium text-slate-800 leading-relaxed">
                          <RichMathText content={statement.option_text} />
                        </td>

                        {/* Circular Radio Button: Benar / Sesuai */}
                        <td 
                          onClick={() => handleSelectBenarSalahMatrix(statement.id, posHeader)}
                          className={`py-4 px-4 text-center cursor-pointer transition-colors ${
                            isStatementPosKey
                              ? 'bg-emerald-100/70'
                              : isPosSelected ? 'bg-emerald-50/60' : 'hover:bg-emerald-50/20'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                              isStatementPosKey
                                ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/20'
                                : isPosSelected
                                ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'border-slate-300 hover:border-emerald-500 bg-white'
                            }`}>
                              {isStatementPosKey ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : isPosSelected ? (
                                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 animate-scale-in" />
                              ) : null}
                            </span>
                            <span className={`text-[10px] font-bold mt-1 ${
                              isStatementPosKey ? 'text-emerald-800 font-black' : isPosSelected ? 'text-emerald-700 font-black' : 'text-slate-400'
                            }`}>
                              {posHeader} {isStatementPosKey && '✓ Kunci'}
                            </span>
                          </div>
                        </td>

                        {/* Circular Radio Button: Salah / Tidak Sesuai */}
                        <td 
                          onClick={() => handleSelectBenarSalahMatrix(statement.id, negHeader)}
                          className={`py-4 px-4 text-center cursor-pointer transition-colors ${
                            isStatementNegKey
                              ? 'bg-rose-100/70'
                              : isNegSelected ? 'bg-rose-50/60' : 'hover:bg-rose-50/20'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                              isStatementNegKey
                                ? 'border-rose-600 bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/20'
                                : isNegSelected
                                ? 'border-rose-600 bg-rose-50 ring-2 ring-rose-500/20 shadow-xs'
                                : 'border-slate-300 hover:border-rose-500 bg-white'
                            }`}>
                              {isStatementNegKey ? (
                                <Check className="w-4 h-4 stroke-[3]" />
                              ) : isNegSelected ? (
                                <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-scale-in" />
                              ) : null}
                            </span>
                            <span className={`text-[10px] font-bold mt-1 ${
                              isStatementNegKey ? 'text-rose-800 font-black' : isNegSelected ? 'text-rose-700 font-black' : 'text-slate-400'
                            }`}>
                              {negHeader} {isStatementNegKey && '✓ Kunci'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* TIPE 5: ISIAN SINGKAT */}
      {question.question_type === 'Isian Singkat' && (
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-600 mb-2">
            Ketikkan Jawaban Singkat Anda (Huruf atau Angka):
          </label>
          <input
            type="text"
            value={answer?.answer_text || ''}
            onChange={(e) => onUpdateAnswer(undefined, e.target.value)}
            placeholder="Ketik jawaban di sini..."
            className="w-full max-w-md p-3 font-bold text-slate-900 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono"
          />
          {showAnswerKey && (
            <div className="mt-3 p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-1">
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider flex items-center">
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600 stroke-[3]" /> Kunci Jawaban / Kata Kunci Acuan:
              </span>
              <p className="text-xs font-bold text-slate-800">
                {question.options?.[0]?.option_text || '(Periksa rubrik penilaian pada pembahasan)'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TIPE 6: URAIAN */}
      {question.question_type === 'Uraian' && (
        <div className="pt-2">
          <label className="block text-xs font-bold text-slate-600 mb-2">
            Tuliskan Uraian Penjelasan Lengkap:
          </label>
          <textarea
            rows={5}
            value={answer?.answer_text || ''}
            onChange={(e) => onUpdateAnswer(undefined, e.target.value)}
            placeholder="Uraikan jawaban dan langkah-langkah penyelesaian Anda secara terperinci..."
            className="w-full p-3.5 text-slate-900 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 leading-relaxed font-sans"
          />
          {showAnswerKey && (
            <div className="mt-3 p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl space-y-1">
              <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider flex items-center">
                <Check className="w-3.5 h-3.5 mr-1 text-emerald-600 stroke-[3]" /> Rubrik & Kunci Acuan Penilaian:
              </span>
              <p className="text-xs font-bold text-slate-800">
                {question.options?.[0]?.option_text || '(Periksa panduan penskoran pada pembahasan di bawah)'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pembahasan Soal & Kunci Jawaban Lengkap */}
      {question.explanation && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <details open={showAnswerKey} className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-emerald-950 group">
            <summary className="font-black text-xs uppercase tracking-wider text-emerald-800 cursor-pointer flex items-center justify-between select-none">
              <span className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Kunci Jawaban & Pembahasan Lengkap</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                Klik untuk Buka/Tutup
              </span>
            </summary>
            <div className="mt-3 pt-3 border-t border-emerald-200/60 text-xs sm:text-sm leading-relaxed text-slate-800 bg-white p-4 rounded-xl border border-emerald-100 shadow-2xs">
              <RichMathText content={question.explanation} />
            </div>
          </details>
        </div>
      )}

    </div>
  );
};

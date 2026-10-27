import React, { useState, useRef } from 'react';
import { School, UserProfile } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { toValidUUID, generateValidUUID, safeSupabaseUpsert } from '../../lib/syncHelper';
import { 
  X, 
  Upload, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ShieldAlert, 
  Award, 
  UserCheck, 
  Layers, 
  Check, 
  ArrowRight
} from 'lucide-react';

export interface EmergencyCbtPayload {
  system: string;
  version: string;
  timestamp: string;
  student: {
    id: string;
    username: string; // NISN
    full_name: string;
    school_id?: string;
  };
  attemptId: string;
  sessionId?: string;
  finalScore?: number;
  answeredCount?: number;
  totalQuestions?: number;
  answers: Record<string, {
    id?: string;
    question_id: string;
    selected_option_ids?: string[];
    answer_text?: string;
    is_doubtful?: boolean;
    score_obtained?: number;
  }>;
}

interface EmergencyRecoveryModalProps {
  school: School;
  onClose: () => void;
  onRecoverySuccess: (recoveredStudentName: string, finalScore: number) => void;
}

export const EmergencyRecoveryModal: React.FC<EmergencyRecoveryModalProps> = ({
  school,
  onClose,
  onRecoverySuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedPayload, setParsedPayload] = useState<EmergencyCbtPayload | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processJsonContent = (text: string, name: string) => {
    setErrorMessage(null);
    setSuccessStatus(null);
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') {
        throw new Error('Format berkas tidak valid.');
      }

      // Validasi struktur berkas darurat
      if (!data.student || !data.attemptId || !data.answers) {
        throw new Error('Berkas JSON tidak memiliki format darurat SASI CBT (student/attemptId/answers tidak ditemukan).');
      }

      setParsedPayload(data);
      setFileName(name);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membaca berkas JSON.');
      setParsedPayload(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        processJsonContent(event.target?.result as string, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        processJsonContent(event.target?.result as string, file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleExecuteRecovery = async () => {
    if (!parsedPayload) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const schoolIdResolved = toValidUUID(school.id || parsedPayload.student.school_id || '38414ebe-ea97-4d19-9940-9dab0029c4f8');
      const studentIdResolved = toValidUUID(parsedPayload.student.id);
      const attemptIdResolved = toValidUUID(parsedPayload.attemptId);
      const sessionIdResolved = parsedPayload.sessionId ? toValidUUID(parsedPayload.sessionId) : toValidUUID('00000000-0000-0000-0000-000000000001');

      // 1. Reconstruct batch student_answers
      const answerKeys = Object.keys(parsedPayload.answers);
      const answersBatch = answerKeys.map(qId => {
        const item = parsedPayload.answers[qId];
        return {
          id: toValidUUID(item.id || generateValidUUID()),
          attempt_id: attemptIdResolved,
          question_id: toValidUUID(item.question_id || qId),
          selected_option_ids: item.selected_option_ids || [],
          answer_text: item.answer_text || null,
          is_doubtful: item.is_doubtful || false,
          score_obtained: item.score_obtained !== undefined ? item.score_obtained : 0
        };
      });

      // 2. Simpan jawaban ke Shard Klaster
      if (answersBatch.length > 0) {
        await safeSupabaseUpsert('student_answers', answersBatch, schoolIdResolved);
      }

      // 3. Simpan attempt berstatus 'completed' ke Shard Klaster
      const finalScore = parsedPayload.finalScore !== undefined ? Math.round(parsedPayload.finalScore) : 80;
      const answeredCount = parsedPayload.answeredCount !== undefined ? parsedPayload.answeredCount : answerKeys.length;
      const totalQuestions = parsedPayload.totalQuestions || answerKeys.length;

      const attemptPayload = {
        id: attemptIdResolved,
        student_id: studentIdResolved,
        session_id: sessionIdResolved,
        school_id: schoolIdResolved,
        status: 'completed',
        submitted_at: parsedPayload.timestamp || new Date().toISOString(),
        final_score: finalScore,
        answered_count: answeredCount,
        total_questions: totalQuestions
      };

      await safeSupabaseUpsert('student_attempts', attemptPayload, schoolIdResolved);

      // 4. Dual-write mirror ke Master Hub
      const clusterClient = getSupabaseClientForSchool(schoolIdResolved);
      if (clusterClient !== supabase) {
        try {
          await supabase.from('student_attempts').upsert(attemptPayload);
        } catch (mErr) {
          console.warn('[EmergencyRecovery] Master attempt mirror warning:', mErr);
        }
      }

      // 5. Update user_profiles logout state
      await Promise.allSettled([
        clusterClient.from('user_profiles').update({ is_logged_in: false, updated_at: new Date().toISOString() }).eq('id', studentIdResolved),
        supabase.from('user_profiles').update({ is_logged_in: false, updated_at: new Date().toISOString() }).eq('id', studentIdResolved)
      ]);

      setSuccessStatus(`Berhasil memulihkan nilai ujian ${parsedPayload.student.full_name} (Skor: ${finalScore}).`);
      setTimeout(() => {
        onRecoverySuccess(parsedPayload.student.full_name, finalScore);
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error('[EmergencyRecovery] Execution error:', err);
      setErrorMessage(err.message || 'Gagal mengeksekusi pemulihan data ke database.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-rose-900 text-white flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center space-x-3 z-10">
            <span className="p-2.5 bg-rose-800/80 rounded-2xl border border-rose-700/60 shadow-xs">
              <ShieldAlert className="w-6 h-6 text-rose-300" />
            </span>
            <div>
              <h3 className="text-base font-black tracking-wide flex items-center space-x-2">
                <span>Darurat Proktor: Pulihkan Berkas Jawaban CBT</span>
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                Unggah berkas JSON cadangan dari komputer siswa jika pengumpulan otomatis sempat gagal.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-rose-200 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">

          {/* Info Notice */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 flex items-start space-x-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Berkas darurat diperoleh dari tombol <strong>"Unduh Berkas Darurat (.json)"</strong> di layar siswa saat kendala jaringan, atau diambil dari memori lokal browser siswa.
            </div>
          </div>

          {/* Drag & Drop Zone */}
          {!parsedPayload ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-rose-500 bg-rose-50/50 scale-[1.01]' 
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Tarik & Lepas Berkas JSON di Sini
              </p>
              <p className="text-xs text-slate-400 mt-1">
                atau klik untuk memilih berkas dari flashdisk / komputer proktor
              </p>
            </div>
          ) : (
            /* Payload Preview Card */
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center space-x-2.5">
                  <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <FileJson className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{fileName}</h4>
                    <p className="text-[10px] text-slate-400">Berkas Darurat SASI CBT Valid</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setParsedPayload(null); setFileName(''); }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Ganti Berkas
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Nama Peserta:</span>
                  <strong className="text-slate-900">{parsedPayload.student?.full_name || '-'}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">NISN / Username:</span>
                  <strong className="text-slate-900 font-mono">{parsedPayload.student?.username || '-'}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Jawaban Terekam:</span>
                  <strong className="text-emerald-700">{Object.keys(parsedPayload.answers || {}).length} Butir Soal</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kalkulasi Skor Akhir:</span>
                  <strong className="text-rose-700 font-black text-sm">{parsedPayload.finalScore !== undefined ? Math.round(parsedPayload.finalScore) : 80} / 100</strong>
                </div>
              </div>
            </div>
          )}

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successStatus}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteRecovery}
              disabled={!parsedPayload || isProcessing}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/30 flex items-center space-x-1.5"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memulihkan ke Database Klaster...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Suntikkan & Pulihkan Nilai Siswa</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

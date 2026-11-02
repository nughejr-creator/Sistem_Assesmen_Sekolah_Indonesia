import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  CheckCircle2, 
  RotateCcw, 
  User, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { 
  ItemDiscussionThread, 
  ItemDiscussionMessage,
  parseReviewThreads,
  serializeReviewThreads,
  getThreadForItem
} from '../../lib/revisionThreadHelper';
import { QuestionWriterAssignment } from '../../types/database';

interface ItemDiscussionModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: QuestionWriterAssignment;
  itemNumber: number;
  variantNumber?: number;
  questionId?: string;
  currentUser?: {
    id?: string;
    name?: string;
    full_name?: string;
    role?: string;
  } | null;
  onUpdateAssignment: (updated: QuestionWriterAssignment) => void | Promise<void>;
}

export const ItemDiscussionModal: React.FC<ItemDiscussionModalProps> = ({
  isOpen,
  onClose,
  assignment,
  itemNumber,
  variantNumber = 1,
  questionId,
  currentUser,
  onUpdateAssignment
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const parsed = parseReviewThreads(assignment.revision_notes);
  const activeThread = getThreadForItem(parsed.threads, itemNumber, variantNumber);
  const messages: ItemDiscussionMessage[] = activeThread?.messages || [];
  const isResolved = Boolean(activeThread?.is_resolved);

  const isReviewerRole = currentUser?.role === 'assistant_admin' || 
                         currentUser?.role === 'super_admin' || 
                         currentUser?.role === 'admin';
  const senderRole: 'reviewer' | 'teacher' = isReviewerRole ? 'reviewer' : 'teacher';
  const senderName = currentUser?.full_name || 
                     currentUser?.name || 
                     (isReviewerRole ? 'Reviewer (Asisten Admin)' : 'Guru Penulis');

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, messages.length]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newMessage: ItemDiscussionMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender_id: currentUser?.id,
        sender_name: senderName,
        sender_role: senderRole,
        message: inputText.trim(),
        created_at: new Date().toISOString()
      };

      const existingThreads = [...parsed.threads];
      const threadIndex = existingThreads.findIndex(
        t => Number(t.item_number) === Number(itemNumber) && 
             Number(t.variant_number || 1) === Number(variantNumber)
      );

      if (threadIndex >= 0) {
        existingThreads[threadIndex] = {
          ...existingThreads[threadIndex],
          messages: [...(existingThreads[threadIndex].messages || []), newMessage],
          is_resolved: false // Reopen thread on new message
        };
      } else {
        existingThreads.push({
          item_number: itemNumber,
          variant_number: variantNumber,
          question_id: questionId,
          messages: [newMessage],
          is_resolved: false
        });
      }

      const updatedSerialized = serializeReviewThreads(parsed.generalNotes, existingThreads);
      const updatedAsg: QuestionWriterAssignment = {
        ...assignment,
        revision_notes: updatedSerialized,
        reviewed_by: isReviewerRole ? senderName : assignment.reviewed_by,
        reviewed_at: isReviewerRole ? new Date().toISOString() : assignment.reviewed_at,
        updated_at: new Date().toISOString()
      };

      await onUpdateAssignment(updatedAsg);
      setInputText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleResolve = async () => {
    const existingThreads = [...parsed.threads];
    const threadIndex = existingThreads.findIndex(
      t => Number(t.item_number) === Number(itemNumber) && 
           Number(t.variant_number || 1) === Number(variantNumber)
    );

    if (threadIndex >= 0) {
      existingThreads[threadIndex] = {
        ...existingThreads[threadIndex],
        is_resolved: !isResolved
      };
    } else {
      existingThreads.push({
        item_number: itemNumber,
        variant_number: variantNumber,
        question_id: questionId,
        messages: [],
        is_resolved: true
      });
    }

    const updatedSerialized = serializeReviewThreads(parsed.generalNotes, existingThreads);
    const updatedAsg: QuestionWriterAssignment = {
      ...assignment,
      revision_notes: updatedSerialized,
      updated_at: new Date().toISOString()
    };

    await onUpdateAssignment(updatedAsg);
  };

  return (
    <div 
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Dialog */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Diskusi Soal No. {itemNumber}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-indigo-200 border border-white/10">
                  Varian #{variantNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Pesan 2-arah interaktif Reviewer & Penulis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-bar Status & Quick Actions */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-slate-500 font-semibold text-[11px]">Status Butir:</span>
            {isResolved ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Sudah Disepakati / Selesai</span>
              </span>
            ) : messages.length > 0 ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Dalam Perbaikan / Diskusi</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                <span>Belum Ada Catatan</span>
              </span>
            )}
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleToggleResolve}
              className={`text-[11px] font-bold px-3 py-1 rounded-xl transition flex items-center space-x-1 ${
                isResolved
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}
            >
              {isResolved ? (
                <>
                  <RotateCcw className="w-3 h-3 text-amber-600" />
                  <span>Buka Kembali</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Tandai Disepakati</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Message Thread List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/50">
          {messages.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                Belum Ada Catatan Perbaikan
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Reviewer dapat menuliskan arahan perbaikan di bawah, atau Guru Penulis dapat memberikan catatan klarifikasi terkait butir soal ini.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isReviewerMsg = msg.sender_role === 'reviewer';
              const isMine = (senderRole === 'reviewer' && isReviewerMsg) || 
                             (senderRole === 'teacher' && !isReviewerMsg);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 px-1">
                    <span className="font-bold text-slate-700">{msg.sender_name}</span>
                    <span className={`px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider text-[9px] ${
                      isReviewerMsg 
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {isReviewerMsg ? 'Reviewer' : 'Penulis'}
                    </span>
                    <span>•</span>
                    <span>{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                      isReviewerMsg
                        ? 'bg-gradient-to-br from-indigo-50 to-blue-50/70 border border-indigo-200/90 text-indigo-950 font-medium'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <form 
          onSubmit={handleSendMessage}
          className="p-4 bg-white border-t border-slate-200 space-y-2 shrink-0"
        >
          <div className="relative">
            <textarea
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                isReviewerRole 
                  ? "Tulis arahan revisi untuk penulis (Tekan Enter untuk kirim)..." 
                  : "Tulis balasan konfirmasi/klarifikasi perbaikan..."
              }
              className="w-full text-xs p-3 pr-12 rounded-2xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/60 text-slate-800 placeholder:text-slate-400 resize-none transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSubmitting}
              className="absolute right-2.5 bottom-3.5 w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center transition shadow-xs active:scale-95"
              title="Kirim pesan"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 px-1 flex items-center justify-between">
            <span>Pesan tersimpan seketika & tersinkronisasi langsung.</span>
            <span>Shift + Enter untuk baris baru</span>
          </p>
        </form>
      </div>
    </div>
  );
};

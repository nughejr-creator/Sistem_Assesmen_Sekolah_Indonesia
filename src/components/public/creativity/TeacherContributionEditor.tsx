import React, { useState, useRef } from 'react';
import { 
  PenTool, 
  Save, 
  Send, 
  CheckCircle2, 
  FileText, 
  Paperclip,
  Award,
  AlertCircle,
  HelpCircle,
  Eye,
  Sparkles
} from 'lucide-react';
import { submitTeacherContribution, executeSafeSupabaseUpdate } from '../../../lib/publicPortalService';
import { ContributionContentType } from '../../../types/publicPortal';
import { WordRibbonEditor, WordRibbonEditorRef } from '../../admin/portal/WordRibbonEditor';
import { PublicArticlePreviewModal } from '../../admin/portal/PublicArticlePreviewModal';
import { calculateReadTime } from '../../../lib/safeHtmlSanitizer';

interface TeacherContributionEditorProps {
  initialContent?: string;
  initialTitle?: string;
  onOpenLogin: (tab: 'student' | 'officer') => void;
}

export const TeacherContributionEditor: React.FC<TeacherContributionEditorProps> = ({
  initialContent = '',
  initialTitle = '',
  onOpenLogin
}) => {
  const [title, setTitle] = useState(initialTitle || '');
  const [authorName, setAuthorName] = useState('Guru Pendidik SASI');
  const [authorSchool, setAuthorSchool] = useState('SDN Contoh Indonesia');
  const [contentType, setContentType] = useState<ContributionContentType>('Modul Ajar');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState(initialContent || '');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [activeContributionId, setActiveContributionId] = useState<string | null>(null);
  const editorRef = useRef<WordRibbonEditorRef>(null);
  
  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'draft' | 'error'; text: string } | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleSave = async (status: 'draft' | 'pending_review') => {
    // 1. Ekstrak snapshot konten HTML terbaru langsung dari editor aktif (Visual maupun HTML)
    const latestHtml = editorRef.current ? editorRef.current.getLatestContent() : body;

    if (!title.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Mohon isi judul karya terlebih dahulu.' });
      return;
    }
    if (!latestHtml.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Mohon tuliskan konten utama karya Anda.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      if (activeContributionId) {
        // MODE UPDATE: Gunakan safe update wrapper dengan deteksi RLS
        const updateRes = await executeSafeSupabaseUpdate<any>(
          'teacher_contributions',
          { id: activeContributionId },
          {
            title: title.trim(),
            content_type: contentType,
            summary: summary.trim() || title.trim(),
            body: latestHtml.trim(),
            attachment_url: attachmentUrl.trim() || null,
            status: status
          }
        );

        if (status === 'draft') {
          setFeedbackMessage({
            type: 'draft',
            text: 'Pembaruan draf karya Anda berhasil disimpan secara aman di database Cloud.'
          });
        } else {
          setFeedbackMessage({
            type: 'success',
            text: 'Pembaruan karya Anda berhasil diajukan untuk kurasi tim SASI!'
          });
        }
      } else {
        // MODE INSERT: Buat entri naskah baru
        const result = await submitTeacherContribution({
          teacher_id: '00000000-0000-0000-0000-000000000000',
          teacher_name: authorName,
          teacher_school: authorSchool,
          title: title.trim(),
          content_type: contentType,
          summary: summary.trim() || title.trim(),
          body: latestHtml.trim(),
          attachment_url: attachmentUrl.trim() || undefined,
          status: status
        });

        if (result.success && result.data) {
          setActiveContributionId(result.data.id); // Simpan ID agar aksi simpan berikutnya menjadi UPDATE
          if (status === 'draft') {
            setFeedbackMessage({
              type: 'draft',
              text: 'Draf karya Anda berhasil disimpan ke sistem. Anda dapat melanjutkan menyuntingnya kapan saja.'
            });
          } else {
            setFeedbackMessage({
              type: 'success',
              text: 'Karya Anda berhasil diajukan untuk kurasi! Tim Super Admin SASI akan meninjau kelayakan pedagogis sebelum diterbitkan secara resmi.'
            });
          }
        } else {
          throw new Error(result.error || 'Gagal menyimpan karya.');
        }
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Terjadi kendala saat menyimpan karya. Pastikan izin akses database telah aktif.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Pilar 2: Ruang Publikasi & Kontribusi Edukatif Guru</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">
            Editor Karya & Praktik Baik Guru
          </h2>
          <p className="text-xs text-slate-500">
            Tulis modul ajar, lembar kerja siswa, atau artikel asesmen dengan Ribbon Editor Word. Karya berkualitas akan diterbitkan di portal publik SASIPEDIA.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsPreviewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black flex items-center space-x-1.5 transition-all shadow-xs"
          >
            <Eye className="w-4 h-4" />
            <span>Preview Tampilan Publik</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {feedbackMessage && (
        <div className={`p-4 rounded-2xl border-2 text-xs flex items-start space-x-3 animate-in fade-in duration-150 ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : feedbackMessage.type === 'draft'
            ? 'bg-sky-50 border-sky-300 text-sky-900'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <strong className="block font-bold">
              {feedbackMessage.type === 'success' ? 'Pengajuan Terkirim!' : feedbackMessage.type === 'draft' ? 'Draf Tersimpan!' : 'Perhatian!'}
            </strong>
            <span>{feedbackMessage.text}</span>
          </div>
        </div>
      )}

      {/* Editor & Metadata Form */}
      <div className="bg-white rounded-3xl border-2 border-slate-300 shadow-sm overflow-hidden">
        
        {/* Top Metadata Fields */}
        <div className="p-6 border-b-2 border-slate-100 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Karya / Modul / Praktik Baik <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Modul Ajar IPAS Berdiferensiasi Materi Siklus Air Fase B"
                className="w-full px-4 py-2.5 rounded-xl border-2 border-slate-300 text-xs font-bold focus:border-amber-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori Konten <span className="text-rose-500">*</span>
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContributionContentType)}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 text-xs font-semibold bg-slate-50 focus:bg-white"
              >
                <option value="Modul Ajar">Modul Ajar</option>
                <option value="LKPD">Lembar Kerja Peserta Didik (LKPD)</option>
                <option value="Artikel Edukasi">Artikel Evaluasi & Edukasi</option>
                <option value="Soal & Rubrik">Naskah Soal & Rubrik</option>
                <option value="Praktik Baik">Praktik Baik (Best Practice)</option>
              </select>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Pendidik</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 bg-slate-50 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Asal Sekolah</label>
              <input
                type="text"
                value={authorSchool}
                onChange={(e) => setAuthorSchool(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 bg-slate-50 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tautan Lampiran Dokumen (Opsional)</label>
              <input
                type="text"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://... (Google Drive / PDF)"
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 bg-slate-50 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Word Ribbon Rich Text Editor */}
        <div className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-black text-slate-800 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Naskah Utama (Word Ribbon Rich Text Editor)</span>
              <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-500">
              Mendukung font Word, tabel interaktif, KaTeX math equation, gambar, dan palet simbol
            </span>
          </div>

          <WordRibbonEditor
            ref={editorRef}
            value={body}
            onChange={(html) => setBody(html)}
            placeholder="Mulai tuliskan naskah perangkat ajar, skenario pembelajaran, butir soal, atau praktik baik Anda di sini..."
            minHeight="400px"
          />
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-slate-500">
            Alur kurasi: <strong>Draft</strong> $\rightarrow$ <strong>Review Tim SASI</strong> $\rightarrow$ <strong>Terbit Publik</strong>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-black shadow-2xs flex items-center space-x-1.5 transition-colors"
            >
              <Eye className="w-4 h-4 text-sky-600" />
              <span>Preview Tampilan Publik</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave('draft')}
              className="px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors"
            >
              <Save className="w-4 h-4 text-slate-500" />
              <span>Simpan Draf</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave('pending_review')}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-md border-2 border-amber-600/50 flex items-center space-x-1.5 transition-all transform active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengajukan...' : 'Ajukan Kurasi & Terbitkan'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* =======================================================================
          MODAL: PRATINJAU PUBLIK KARYA GURU
      ======================================================================= */}
      {isPreviewModalOpen && (
        <PublicArticlePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          article={{
            title: title || 'Judul Karya Belum Diisi',
            category: contentType,
            author_name: `${authorName} (${authorSchool})`,
            content: body,
            read_time: calculateReadTime(body),
            views_count: 1,
            is_published: false,
            published_at: new Date().toISOString()
          }}
        />
      )}

    </div>
  );
};

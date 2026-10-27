import React, { useState } from 'react';
import { 
  PenTool, 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Heading1, 
  Heading2, 
  Table, 
  Quote, 
  Save, 
  Send, 
  CheckCircle2, 
  FileText, 
  Paperclip,
  Award,
  AlertCircle,
  HelpCircle,
  Eye,
  Edit3
} from 'lucide-react';
import { submitTeacherContribution } from '../../../lib/publicPortalService';
import { ContributionContentType } from '../../../types/publicPortal';

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
  
  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'draft' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  // Toolbar helper actions
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('editor-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = body.substring(start, end) || 'Teks Contoh';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(newBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 50);
  };

  const insertTableTemplate = () => {
    const tableTemplate = `\n| No | Komponen Pembelajaran | Keterangan & Aktivitas Siswa |\n|---|---|---|\n| 1 | Pendahuluan / Apersepsi | Pertanyaan pemantik dan asesmen awal |\n| 2 | Kegiatan Inti | Eksplorasi kontekstual & diskusi kelompok |\n| 3 | Penutup & Refleksi | Penguatan konsep dan kuis mandiri |\n\n`;
    setBody(prev => prev + tableTemplate);
  };

  const handleSave = async (status: 'draft' | 'pending_review') => {
    if (!title.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Mohon isi judul karya terlebih dahulu.' });
      return;
    }
    if (!body.trim()) {
      setFeedbackMessage({ type: 'error', text: 'Mohon tuliskan konten utama karya Anda.' });
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    const result = await submitTeacherContribution({
      teacher_id: '00000000-0000-0000-0000-000000000000', // Mock authenticated teacher session
      teacher_name: authorName,
      teacher_school: authorSchool,
      title: title.trim(),
      content_type: contentType,
      summary: summary.trim() || title.trim(),
      body: body.trim(),
      attachment_url: attachmentUrl.trim() || undefined,
      status: status
    });

    setIsSubmitting(false);

    if (result.success) {
      if (status === 'draft') {
        setFeedbackMessage({
          type: 'draft',
          text: 'Draf karya Anda berhasil disimpan secara aman di sistem. Anda dapat melanjutkannya kapan saja.'
        });
      } else {
        setFeedbackMessage({
          type: 'success',
          text: 'Karya Anda berhasil diajukan untuk kurasi! Tim Super Admin SASI akan meninjau kelayakan pedagogis sebelum diterbitkan secara resmi.'
        });
      }
    } else {
      setFeedbackMessage({
        type: 'error',
        text: result.error || 'Terjadi kendala saat menyimpan karya. Pastikan server aktif.'
      });
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
            Tulis modul ajar, lembar kerja siswa, atau artikel asesmen. Karya berkualitas akan diterbitkan di portal publik SASIPEDIA.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors"
          >
            {viewMode === 'edit' ? (
              <>
                <Eye className="w-4 h-4 text-slate-500" />
                <span>Lihat Pratinjau Tampilan</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 text-slate-500" />
                <span>Kembali Menyunting</span>
              </>
            )}
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

        {/* WYSIWYG Formatting Toolbar */}
        {viewMode === 'edit' && (
          <div className="px-6 py-2.5 bg-slate-50 border-b-2 border-slate-200 flex flex-wrap items-center gap-1.5 text-slate-700">
            
            <button
              type="button"
              onClick={() => insertFormatting('### ', '\n')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center space-x-1"
              title="Heading 2"
            >
              <Heading1 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting('#### ', '\n')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center space-x-1"
              title="Heading 3"
            >
              <Heading2 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 font-bold"
              title="Cetak Tebal (Bold)"
            >
              <Bold className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting('*', '*')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 italic"
              title="Cetak Miring (Italic)"
            >
              <Italic className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting('<u>', '</u>')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 underline"
              title="Garis Bawah (Underline)"
            >
              <Underline className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting('- ', '\n')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700"
              title="Daftar Poin (Bullet List)"
            >
              <List className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => insertFormatting('1. ', '\n')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700"
              title="Daftar Nomor (Numbered List)"
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-slate-300 mx-1" />

            <button
              type="button"
              onClick={insertTableTemplate}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 flex items-center space-x-1 text-xs"
              title="Sisipkan Tabel Baku"
            >
              <Table className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-semibold">Tabel</span>
            </button>

            <button
              type="button"
              onClick={() => insertFormatting('> ', '\n')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700"
              title="Kutipan / Catatan Khusus"
            >
              <Quote className="w-4 h-4" />
            </button>

          </div>
        )}

        {/* Text Area / Preview Content Area */}
        <div className="p-6">
          {viewMode === 'edit' ? (
            <textarea
              id="editor-textarea"
              rows={16}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Mulai tuliskan naskah perangkat ajar, skenario pembelajaran, butir soal, atau praktik baik Anda di sini..."
              className="w-full font-mono text-xs text-slate-800 leading-relaxed focus:outline-hidden resize-y min-h-[350px] p-2 bg-transparent"
            />
          ) : (
            <div className="min-h-[350px] p-4 bg-slate-50 rounded-2xl border-2 border-slate-300 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans text-justify">
              <h2 className="text-xl font-black text-slate-900 mb-2">{title || 'Judul Belum Diisi'}</h2>
              <div className="text-[11px] text-slate-500 mb-4 pb-3 border-b-2 border-slate-200">
                Ditulis oleh: <strong>{authorName}</strong> ({authorSchool}) • Kategori: <strong>{contentType}</strong>
              </div>
              {body || <span className="italic text-slate-400">Belum ada konten yang ditulis.</span>}
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-6 py-4 bg-slate-50 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-slate-500">
            Alur kurasi: <strong>Draft</strong> $\rightarrow$ <strong>Review Tim SASI</strong> $\rightarrow$ <strong>Terbit Publik</strong>
          </div>

          <div className="flex items-center space-x-3">
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

    </div>
  );
};

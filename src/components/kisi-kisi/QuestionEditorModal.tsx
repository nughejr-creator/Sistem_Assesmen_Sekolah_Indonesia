import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BlueprintItem, QuestionBankItem, QuestionOption, WorkflowStatus } from '../../types/database';
import { generateValidUUID, isValidUUID, toValidUUID } from '../../lib/syncHelper';
import { 
  X, 
  Save, 
  Sparkles, 
  Image as ImageIcon, 
  HelpCircle, 
  CheckCircle2, 
  Layers, 
  Plus, 
  Trash2,
  FileCheck2,
  Sliders,
  Check,
  UploadCloud,
  Maximize2,
  Minimize2,
  Eye,
  SlidersHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FolderOpen,
  Monitor,
  FileText,
  BookOpen,
  CheckSquare,
  Upload,
  Link,
  ArrowUp,
  ArrowDown,
  Columns,
  Edit3
} from 'lucide-react';
import { WordEquationToolbar } from './WordEquationToolbar';
import { QuestionRenderer } from '../cbt/QuestionRenderer';
import { VisualFormulaEditor } from '../common/VisualFormulaEditor';

export type EditorViewMode = 'split' | 'editor-focus' | 'preview-focus';

interface QuestionEditorModalProps {
  blueprintItem: BlueprintItem;
  existingQuestion?: QuestionBankItem;
  variantNumber?: number;
  totalVariants?: number;
  onClose: () => void;
  onSave: (savedQuestion: QuestionBankItem, updatedStatus: WorkflowStatus) => void | Promise<void>;
  userRole?: string;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  blueprintItem,
  existingQuestion,
  variantNumber = 1,
  totalVariants = 1,
  onClose,
  onSave,
  userRole = 'assistant_admin',
}) => {
  // Full-screen Theater & View Modes (Fokus Tulis Soal, Split Berdampingan, Pratinjau Utuh Siswa)
  const [viewMode, setViewMode] = useState<EditorViewMode>('split');
  const [isSaving, setIsSaving] = useState(false);

  // Independent Scroll Containers Refs & Quick Scroll Helpers
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const scrollEditor = (direction: 'top' | 'bottom') => {
    if (!editorScrollRef.current) return;
    editorScrollRef.current.scrollTo({
      top: direction === 'top' ? 0 : editorScrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  const scrollPreview = (direction: 'top' | 'bottom') => {
    if (!previewScrollRef.current) return;
    previewScrollRef.current.scrollTo({
      top: direction === 'top' ? 0 : previewScrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  };

  // Active Focused Field for Floating Toolbar
  // 'stimulus' | 'question' | 'explanation' | 'option-0' | 'option-1' | 'distractor-0' | 'matching-left-0' etc.
  const [activeField, setActiveField] = useState<string | null>('question');

  // Modals for Fraction & Image Inserters (Centered & Unclipped)
  const [showFractionModal, setShowFractionModal] = useState(false);
  const [fractionNum, setFractionNum] = useState('1');
  const [fractionDen, setFractionDen] = useState('2');
  const [showBlueprintDetailModal, setShowBlueprintDetailModal] = useState(false);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState('');
  const [imageModalAlign, setImageModalAlign] = useState<'left' | 'center' | 'right' | 'float-left'>('center');
  const [imageModalWidth, setImageModalWidth] = useState('200px');
  const [imageModalCaption, setImageModalCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [stimulusText, setStimulusText] = useState(existingQuestion?.stimulus_text || '');

  // Ekstrak metadata ukuran dan posisi permanen jika tersimpan di stimulus_media_url (#meta:w=120px&a=left...)
  const initialMediaMeta = React.useMemo(() => {
    const rawUrl = existingQuestion?.stimulus_media_url || '';
    let width = existingQuestion?.stimulus_media_width;
    let align = existingQuestion?.stimulus_media_align;
    let pos = existingQuestion?.stimulus_media_position;
    let caption = existingQuestion?.stimulus_media_caption;

    if (rawUrl && rawUrl.includes('#meta:')) {
      const parts = rawUrl.split('#meta:');
      const params = new URLSearchParams(parts[1] || '');
      if (params.get('w')) width = params.get('w')!;
      if (params.get('a')) align = params.get('a') as any;
      if (params.get('p')) pos = params.get('p') as any;
      if (params.get('c')) caption = decodeURIComponent(params.get('c')!);
    }
    return {
      width: width || '120px',
      align: align || 'left',
      pos: pos || 'above',
      caption: caption || ''
    };
  }, [existingQuestion]);

  const [stimulusMediaUrl, setStimulusMediaUrl] = useState(existingQuestion?.stimulus_media_url || '');
  const [stimulusMediaAlign, setStimulusMediaAlign] = useState<'left' | 'center' | 'right' | 'float-left' | 'float-right'>(
    initialMediaMeta.align
  );
  const [stimulusMediaWidth, setStimulusMediaWidth] = useState(initialMediaMeta.width);
  const [stimulusMediaCaption, setStimulusMediaCaption] = useState(initialMediaMeta.caption);
  const [stimulusMediaPosition, setStimulusMediaPosition] = useState<'above' | 'below'>(initialMediaMeta.pos);

  const [questionText, setQuestionText] = useState(existingQuestion?.question_text || '');
  const [explanationText, setExplanationText] = useState(existingQuestion?.explanation || '');
  const [weight, setWeight] = useState(existingQuestion?.weight || 10);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(
    existingQuestion?.status || blueprintItem.workflow_status || 'Draft'
  );

  // Dynamic Options (Otomatis normalisasi urutan alfabetis A, B, C, D, ...)
  const [options, setOptions] = useState<QuestionOption[]>(
    existingQuestion?.options && existingQuestion.options.length > 0
      ? existingQuestion.options.map((opt, idx) => ({
          ...opt,
          id: (opt.id && isValidUUID(opt.id) && !opt.id.startsWith('00000000-0000-4000-8000-00000000003'))
            ? opt.id
            : generateValidUUID(),
          option_label: String.fromCharCode(65 + idx),
        }))
      : [
          { id: generateValidUUID(), question_id: 'temp', option_label: 'A', option_text: '', is_correct: true, distractor_note: '' },
          { id: generateValidUUID(), question_id: 'temp', option_label: 'B', option_text: '', is_correct: false, distractor_note: '' },
          { id: generateValidUUID(), question_id: 'temp', option_label: 'C', option_text: '', is_correct: false, distractor_note: '' },
          { id: generateValidUUID(), question_id: 'temp', option_label: 'D', option_text: '', is_correct: false, distractor_note: '' },
        ]
  );

  // Menjodohkan Pairs
  const [matchingPairs, setMatchingPairs] = useState<{ id: string; left: string; right: string }[]>(
    existingQuestion?.options && existingQuestion.options.length > 0 && blueprintItem.question_type === 'Menjodohkan'
      ? existingQuestion.options.map((opt) => ({
          id: (opt.id && isValidUUID(opt.id) && !opt.id.startsWith('00000000-0000-4000-8000-00000000003'))
            ? opt.id
            : generateValidUUID(),
          left: opt.option_text,
          right: opt.matching_pair_text || '',
        }))
      : [
          { id: generateValidUUID(), left: 'Segitiga Sama Sisi', right: '3 sisi sama panjang' },
          { id: generateValidUUID(), left: 'Persegi', right: '4 sisi sama panjang dan 4 sudut siku-siku' },
          { id: generateValidUUID(), left: 'Lingkaran', right: 'Memiliki 1 sisi lengkung tanpa sudut' },
        ]
  );

  const [isianKey, setIsianKey] = useState(
    existingQuestion?.options?.find(o => o.option_label === 'Kunci')?.option_text || 
    existingQuestion?.options?.[0]?.option_text || 
    ''
  );
  const [rubrikUraian, setRubrikUraian] = useState(
    existingQuestion?.options?.find(o => o.option_label === 'Rubrik')?.option_text || 
    existingQuestion?.explanation || 
    ''
  );

  const [previewAnswer, setPreviewAnswer] = useState<StudentAnswer | undefined>(undefined);

  // Kategori Pilihan: 'BENAR_SALAH' (Benar - Salah) atau 'SESUAI_TIDAK_SESUAI' (Sesuai - Tidak Sesuai)
  const [bsCategory, setBsCategory] = useState<'BENAR_SALAH' | 'SESUAI_TIDAK_SESUAI'>(() => {
    if (existingQuestion?.options && existingQuestion.options.length > 0) {
      const hasSesuai = existingQuestion.options.some(o => 
        o.matching_pair_text === 'Sesuai' || 
        o.matching_pair_text === 'Tidak Sesuai' || 
        o.distractor_note === 'SESUAI_TIDAK_SESUAI'
      );
      if (hasSesuai) return 'SESUAI_TIDAK_SESUAI';
    }
    return 'BENAR_SALAH';
  });

  // State Daftar Pernyataan Benar/Salah (Multi-Baris Matriks Asesmen)
  const [bsStatements, setBsStatements] = useState<{ id: string; text: string; key: 'Benar' | 'Salah' | 'Sesuai' | 'Tidak Sesuai' }[]>(() => {
    if (existingQuestion?.options && existingQuestion.options.length > 0 && blueprintItem.question_type === 'Benar/Salah') {
      // Cek apakah data lama (2 opsi 'Benar' & 'Salah') atau format multi-pernyataan
      const isLegacy2Option = existingQuestion.options.length === 2 && 
        (existingQuestion.options[0].option_text === 'Benar' || existingQuestion.options[0].option_text === 'Salah');
      if (!isLegacy2Option) {
        return existingQuestion.options.map(opt => ({
          id: opt.id && isValidUUID(opt.id) ? opt.id : generateValidUUID(),
          text: opt.option_text,
          key: (opt.matching_pair_text as any) || (opt.is_correct ? 'Benar' : 'Salah'),
        }));
      }
    }
    // Default 3 butir pernyataan standar format AKM / SAS
    return [
      { id: generateValidUUID(), text: '', key: 'Benar' },
      { id: generateValidUUID(), text: '', key: 'Salah' },
      { id: generateValidUUID(), text: '', key: 'Benar' },
    ];
  });

  // Fungsi ganti kategori antara (Benar - Salah) dan (Sesuai - Tidak Sesuai)
  const handleSwitchBsCategory = (newCat: 'BENAR_SALAH' | 'SESUAI_TIDAK_SESUAI') => {
    setBsCategory(newCat);
    setBsStatements(prev => prev.map(st => {
      if (newCat === 'SESUAI_TIDAK_SESUAI') {
        const isPos = st.key === 'Benar' || st.key === 'Sesuai';
        return { ...st, key: isPos ? 'Sesuai' : 'Tidak Sesuai' };
      } else {
        const isPos = st.key === 'Sesuai' || st.key === 'Benar';
        return { ...st, key: isPos ? 'Benar' : 'Salah' };
      }
    }));
  };

  const handleAddBsStatement = () => {
    const defaultPosKey = bsCategory === 'SESUAI_TIDAK_SESUAI' ? 'Sesuai' : 'Benar';
    setBsStatements(prev => [
      ...prev,
      { id: generateValidUUID(), text: '', key: defaultPosKey }
    ]);
  };

  const handleRemoveBsStatement = (idToRemove: string) => {
    if (bsStatements.length <= 2) {
      alert('Minimal harus memiliki 2 butir pernyataan.');
      return;
    }
    setBsStatements(prev => prev.filter(st => st.id !== idToRemove));
  };

  const handleUpdateBsStatementText = (id: string, newText: string) => {
    setBsStatements(prev => prev.map(st => st.id === id ? { ...st, text: newText } : st));
  };

  const handleUpdateBsStatementKey = (id: string, newKey: 'Benar' | 'Salah' | 'Sesuai' | 'Tidak Sesuai') => {
    setBsStatements(prev => prev.map(st => st.id === id ? { ...st, key: newKey } : st));
  };

  // Human-friendly label for current active target
  const getTargetFriendlyLabel = (field: string | null): string => {
    if (!field) return 'Pilih Bagian Soal';
    if (field === 'stimulus') return 'Stimulus Wacana';
    if (field === 'question') return 'Pokok Pertanyaan';
    if (field === 'explanation') return 'Pembahasan & Solusi';
    if (field.startsWith('option-')) {
      const idx = parseInt(field.replace('option-', ''), 10);
      const label = options[idx]?.option_label || String.fromCharCode(65 + idx);
      return `Pilihan Jawaban ${label}`;
    }
    if (field.startsWith('distractor-')) {
      const idx = parseInt(field.replace('distractor-', ''), 10);
      const label = options[idx]?.option_label || String.fromCharCode(65 + idx);
      return `Catatan Pengecoh ${label}`;
    }
    if (field.startsWith('matching-left-')) {
      const idx = parseInt(field.replace('matching-left-', ''), 10);
      return `Pernyataan Kiri #${idx + 1}`;
    }
    if (field.startsWith('matching-right-')) {
      const idx = parseInt(field.replace('matching-right-', ''), 10);
      return `Pasangan Kanan #${idx + 1}`;
    }
    if (field.startsWith('bs-statement-')) {
      const idx = parseInt(field.replace('bs-statement-', ''), 10);
      return `Pernyataan #${idx + 1}`;
    }
    if (field === 'isian-key') return 'Kunci Isian Singkat';
    if (field === 'rubrik-uraian') return 'Rubrik Penskoran Uraian';
    return 'Teks';
  };

  // Insert snippet or wrap around current value
  const handleInsertSnippet = (snippet: string, wrap?: { before: string; after: string }) => {
    const toInsert = wrap ? `${wrap.before}${snippet || 'teks'}${wrap.after}` : snippet;

    if (activeField === 'stimulus') {
      setStimulusText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + toInsert);
    } else if (activeField === 'question') {
      setQuestionText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + toInsert);
    } else if (activeField === 'explanation') {
      setExplanationText(prev => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + toInsert);
    } else if (activeField?.startsWith('option-')) {
      const idx = parseInt(activeField.replace('option-', ''), 10);
      const updated = [...options];
      if (updated[idx]) {
        updated[idx].option_text = updated[idx].option_text + (updated[idx].option_text.endsWith(' ') || updated[idx].option_text === '' ? '' : ' ') + toInsert;
        setOptions(updated);
      }
    } else if (activeField?.startsWith('distractor-')) {
      const idx = parseInt(activeField.replace('distractor-', ''), 10);
      const updated = [...options];
      if (updated[idx]) {
        updated[idx].distractor_note = (updated[idx].distractor_note || '') + toInsert;
        setOptions(updated);
      }
    } else if (activeField?.startsWith('matching-left-')) {
      const idx = parseInt(activeField.replace('matching-left-', ''), 10);
      const updated = [...matchingPairs];
      if (updated[idx]) {
        updated[idx].left = updated[idx].left + toInsert;
        setMatchingPairs(updated);
      }
    } else if (activeField?.startsWith('matching-right-')) {
      const idx = parseInt(activeField.replace('matching-right-', ''), 10);
      const updated = [...matchingPairs];
      if (updated[idx]) {
        updated[idx].right = updated[idx].right + toInsert;
        setMatchingPairs(updated);
      }
    } else if (activeField?.startsWith('bs-statement-')) {
      const idx = parseInt(activeField.replace('bs-statement-', ''), 10);
      const updated = [...bsStatements];
      if (updated[idx]) {
        updated[idx].text = updated[idx].text + toInsert;
        setBsStatements(updated);
      }
    } else if (activeField === 'isian-key') {
      setIsianKey(prev => prev + toInsert);
    } else if (activeField === 'rubrik-uraian') {
      setRubrikUraian(prev => prev + toInsert);
    }
  };

  // Fraction Inserter Action: Inserts standard fraction representation that VisualFormulaEditor renders as stacked visual fraction
  const handleConfirmInsertFraction = () => {
    const num = fractionNum.trim() || '1';
    const den = fractionDen.trim() || '2';
    const fractionCode = `$\\frac{${num}}{${den}}$`;

    handleInsertSnippet(fractionCode);
    setShowFractionModal(false);
  };

  // Image Upload Handler from File Picker
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageModalUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Image Inserter Action: Applies to Stimulus media or inserts inline markdown image with precise width & align
  const handleConfirmInsertImage = () => {
    if (!imageModalUrl) return;

    const safeWidth = imageModalWidth || (activeField?.startsWith('option-') ? '120px' : '200px');
    const safeAlign = imageModalAlign || 'center';
    const safeCaption = imageModalCaption.trim();

    if (activeField === 'stimulus') {
      setStimulusMediaUrl(imageModalUrl);
      setStimulusMediaAlign(safeAlign);
      setStimulusMediaWidth(safeWidth === 'default' ? 'auto' : safeWidth);
      if (safeCaption) setStimulusMediaCaption(safeCaption);
    } else {
      // Insert with width & align metadata so RichMathText and VisualFormulaEditor render it accurately
      const metaStr = `${safeCaption || 'Gambar'}|width:${safeWidth}|align:${safeAlign}`;
      const imgMarkdown = `\n\n![${metaStr}](${imageModalUrl})\n\n`;
      handleInsertSnippet(imgMarkdown);
    }

    setShowImageModal(false);
    setImageModalUrl('');
    setImageModalCaption('');
  };

  // Options Handlers (Selalu menjaga keteraturan alfabetis A, B, C, D, E, ...)
  const handleAddOption = () => {
    const newOptions = [
      ...options,
      {
        id: generateValidUUID(),
        question_id: 'temp',
        option_label: String.fromCharCode(65 + options.length),
        option_text: '',
        is_correct: false,
        distractor_note: ''
      }
    ];
    // Re-index seluruh opsi agar terjamin berurutan alfabetis A, B, C, D, ...
    const reindexed = newOptions.map((opt, idx) => ({
      ...opt,
      option_label: String.fromCharCode(65 + idx),
    }));
    setOptions(reindexed);
  };

  const handleRemoveOption = (index: number) => {
    // Re-index seluruh opsi yang tersisa agar tidak ada huruf yang bolong/loncat
    const updated = options
      .filter((_, idx) => idx !== index)
      .map((opt, idx) => ({
        ...opt,
        option_label: String.fromCharCode(65 + idx),
      }));
    setOptions(updated);
  };

  const handleOptionChange = (index: number, field: keyof QuestionOption, val: any) => {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: val };
    setOptions(updated);
  };

  const handleSetCorrectRadio = (index: number) => {
    const updated = options.map((opt, idx) => ({
      ...opt,
      is_correct: idx === index
    }));
    setOptions(updated);
  };

  const handleSave = async () => {
    const validQuestionId = existingQuestion?.id ? toValidUUID(existingQuestion.id) : generateValidUUID();
    let finalOptions: QuestionOption[] = [];

    if (blueprintItem.question_type === 'Pilihan Ganda' || blueprintItem.question_type === 'Pilihan Ganda Kompleks') {
      finalOptions = options.map((opt, idx) => ({
        ...opt,
        id: (opt.id && isValidUUID(opt.id) && !opt.id.startsWith('00000000-0000-4000-8000-00000000003'))
          ? opt.id
          : generateValidUUID(),
        question_id: validQuestionId,
        option_label: String.fromCharCode(65 + idx), // Selalu konsisten urut A, B, C, D...
      }));
    } else if (blueprintItem.question_type === 'Menjodohkan') {
      finalOptions = matchingPairs.map((p, idx) => ({
        id: (p.id && isValidUUID(p.id) && !p.id.startsWith('00000000-0000-4000-8000-00000000003'))
          ? p.id
          : generateValidUUID(),
        question_id: validQuestionId,
        option_label: String(idx + 1),
        option_text: p.left,
        matching_pair_text: p.right,
        is_correct: true,
      }));
    } else if (blueprintItem.question_type === 'Benar/Salah') {
      finalOptions = bsStatements.map((st, idx) => ({
        id: (st.id && isValidUUID(st.id) && !st.id.startsWith('00000000-0000-4000-8000-00000000003'))
          ? st.id
          : generateValidUUID(),
        question_id: validQuestionId,
        option_label: String(idx + 1),
        option_text: st.text,
        matching_pair_text: st.key,
        is_correct: st.key === 'Benar' || st.key === 'Sesuai',
        distractor_note: bsCategory,
      }));
    } else if (blueprintItem.question_type === 'Isian Singkat') {
      finalOptions = [
        { id: generateValidUUID(), question_id: validQuestionId, option_label: 'Kunci', option_text: isianKey, is_correct: true }
      ];
    } else if (blueprintItem.question_type === 'Uraian') {
      finalOptions = [
        { id: generateValidUUID(), question_id: validQuestionId, option_label: 'Rubrik', option_text: rubrikUraian, is_correct: true }
      ];
    }

    // Sisipkan metadata ukuran, tata letak, posisi, dan caption ke dalam stimulus_media_url
    // agar 100% permanen dan tidak hilang saat disimpan ke database Cloud Supabase
    const cleanMediaUrl = stimulusMediaUrl ? stimulusMediaUrl.split('#meta:')[0] : '';
    const encodedMediaUrl = cleanMediaUrl
      ? `${cleanMediaUrl}#meta:w=${stimulusMediaWidth || '120px'}&a=${stimulusMediaAlign || 'left'}&p=${stimulusMediaPosition || 'above'}&c=${encodeURIComponent(stimulusMediaCaption || '')}`
      : '';

    const payload: QuestionBankItem = {
      id: validQuestionId,
      blueprint_item_id: blueprintItem.id,
      blueprint_item: blueprintItem,
      subject_id: blueprintItem.subject_name || 'sub-01',
      level: (blueprintItem.level as any) || 'SD',
      phase: (blueprintItem.phase as any) || 'B',
      assessment_type: blueprintItem.assessment_type || 'SAS',
      stimulus_text: stimulusText,
      stimulus_media_url: encodedMediaUrl,
      stimulus_media_position: stimulusMediaPosition,
      stimulus_media_align: stimulusMediaAlign,
      stimulus_media_width: stimulusMediaWidth,
      stimulus_media_caption: stimulusMediaCaption,
      question_text: questionText,
      question_type: blueprintItem.question_type,
      weight: Number(weight),
      status: workflowStatus,
      options: finalOptions,
      explanation: explanationText,
      updated_at: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await Promise.resolve(onSave(payload, workflowStatus));
    } catch (err) {
      console.error('Error saving question:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Synthetic item for live CBT student preview
  const livePreviewQuestion: QuestionBankItem = {
    id: 'preview-current',
    blueprint_item_id: blueprintItem.id,
    blueprint_item: blueprintItem,
    subject_id: blueprintItem.subject_name || 'sub-01',
    level: (blueprintItem.level as any) || 'SD',
    phase: (blueprintItem.phase as any) || 'B',
    stimulus_text: stimulusText,
    stimulus_media_url: stimulusMediaUrl ? `${stimulusMediaUrl.split('#meta:')[0]}#meta:w=${stimulusMediaWidth || '120px'}&a=${stimulusMediaAlign || 'left'}&p=${stimulusMediaPosition || 'above'}&c=${encodeURIComponent(stimulusMediaCaption || '')}` : '',
    stimulus_media_position: stimulusMediaPosition,
    stimulus_media_align: stimulusMediaAlign,
    stimulus_media_width: stimulusMediaWidth,
    stimulus_media_caption: stimulusMediaCaption,
    question_text: questionText,
    question_type: blueprintItem.question_type,
    weight: Number(weight),
    status: workflowStatus,
    explanation: explanationText,
    options: blueprintItem.question_type === 'Menjodohkan'
      ? matchingPairs.map((p, idx) => ({
          id: p.id,
          question_id: 'preview-current',
          option_label: String(idx + 1),
          option_text: p.left,
          matching_pair_text: p.right,
          is_correct: true,
        }))
      : blueprintItem.question_type === 'Benar/Salah'
      ? bsStatements.map((st, idx) => ({
          id: st.id || `bs-${idx + 1}`,
          question_id: 'preview-current',
          option_label: String(idx + 1),
          option_text: st.text || `(Pernyataan #${idx + 1})`,
          matching_pair_text: st.key,
          is_correct: st.key === 'Benar' || st.key === 'Sesuai',
          distractor_note: bsCategory,
        }))
      : options,
    updated_at: new Date().toISOString(),
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] w-screen h-screen bg-slate-950 flex flex-col overflow-hidden animate-fade-in select-none"
      style={{ zIndex: 9999 }}
    >
      <div className="w-full h-full bg-white flex flex-col overflow-hidden">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-brand-950 via-slate-900 to-indigo-950 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0 shadow-md">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-brand-600/30 text-brand-300 border border-brand-500/40 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-bold text-slate-300">
                <span className="bg-brand-600 text-white px-2.5 py-0.5 rounded-md font-extrabold text-[11px] shadow-xs">
                  Butir #{blueprintItem.question_number}
                </span>
                <span className="bg-amber-500/30 text-amber-300 border border-amber-400/50 px-2.5 py-0.5 rounded-md font-black text-[11px] flex items-center space-x-1">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>Soal Varian #{variantNumber}</span>
                </span>
                <span>•</span>
                <span className="text-amber-300 font-extrabold">{blueprintItem.question_type}</span>
                <span>•</span>
                <span className="text-slate-300 truncate">{blueprintItem.subject_name || blueprintItem.element}</span>
              </div>
              <h2 className="text-xs sm:text-sm font-black tracking-tight text-white truncate mt-0.5">
                Editor Soal Varian #{variantNumber}: Pecahan Visual, Gambar & Pembahasan
              </h2>
            </div>
          </div>

          {/* Switcher 3 Mode Tampilan Layar: Fokus Tulis Soal | Split Berdampingan | Pratinjau Utuh Siswa */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700/80 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('editor-focus')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                viewMode === 'editor-focus'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Fokus 100% pada penulisan soal (sembunyikan panel pratinjau)"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Fokus Tulis Soal</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                viewMode === 'split'
                  ? 'bg-white text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Tampilkan berdampingan: editor di kiri dan pratinjau di kanan"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split Berdampingan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview-focus')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 ${
                viewMode === 'preview-focus'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Fokus 100% pada tampilan utuh siswa CBT (sembunyikan panel editor)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Pratinjau Utuh Siswa</span>
            </button>
          </div>

          {/* Tombol Tegas [✕ Tutup / Kembali ke Portal] */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center space-x-2 shadow-lg border border-rose-500 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Tutup Editor / Kembali ke Portal"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
              <span>Tutup / Kembali ke Portal</span>
            </button>
          </div>
        </div>

        {/* Inherited 11-Attributes Summary Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 text-xs grid grid-cols-2 sm:grid-cols-5 gap-3 text-slate-700 shrink-0">
          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Elemen & Subelemen</span>
            <span className="font-extrabold text-slate-900 truncate block">{blueprintItem.element}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Level Kognitif</span>
            <span className="font-bold text-brand-700 block">{blueprintItem.cognitive_level}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Konteks Soal</span>
            <span className="font-bold text-emerald-700 truncate block">{blueprintItem.context || '(Belum diset)'}</span>
          </div>

          <div>
            <span className="text-slate-400 font-bold block text-[10px] uppercase">Penugasan & Jenis</span>
            <span className="font-extrabold text-blue-700 block">{blueprintItem.task_type} ({blueprintItem.question_category})</span>
          </div>

          <div className="col-span-2 sm:col-span-1 flex items-center justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <span className="text-slate-400 font-bold block text-[10px] uppercase">Indikator Acuan</span>
              <span className="text-slate-600 truncate block italic" title={blueprintItem.indicator}>{blueprintItem.indicator}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBlueprintDetailModal(true)}
              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-black shrink-0 flex items-center space-x-1 transition-all shadow-2xs hover:shadow-xs active:scale-95"
              title="Buka pratinjau pemetaan kisi-kisi dan indikator lengkap"
            >
              <Eye className="w-3 h-3 text-indigo-600" />
              <span>Detail</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-0 relative">
          
          {/* Left Column: Editor Sections with Top Toolbars */}
          {viewMode !== 'preview-focus' && (
            <div 
              ref={editorScrollRef}
              className={`${viewMode === 'split' ? 'lg:col-span-7' : 'lg:col-span-12'} p-6 space-y-6 overflow-y-auto border-r border-slate-200 relative`}
            >
              {/* Quick Scroll & Panel Control Bar */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-800 flex items-center space-x-1.5">
                    <Edit3 className="w-4 h-4 text-brand-600" />
                    <span>Lembar Kerja Penulisan Soal</span>
                  </span>
                  {viewMode === 'editor-focus' && (
                    <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[10px] font-black">
                      Mode Fokus Penuh (100%)
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'editor-focus' ? 'split' : 'editor-focus')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center space-x-1 transition-all"
                    title={viewMode === 'editor-focus' ? 'Kembali ke mode berdampingan (split)' : 'Perlebar editor ke 100% layar'}
                  >
                    {viewMode === 'editor-focus' ? <Columns className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    <span>{viewMode === 'editor-focus' ? 'Mode Split' : 'Full Layar'}</span>
                  </button>
                  <div className="h-4 w-px bg-slate-200 mx-1" />
                  <button
                    type="button"
                    onClick={() => scrollEditor('top')}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-all hover:scale-105 active:scale-95"
                    title="Gulir Editor ke Paling Atas"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollEditor('bottom')}
                    className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-all hover:scale-105 active:scale-95"
                    title="Gulir Editor ke Paling Bawah"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            
              {/* Section 1: Stimulus (Wacana, Media & Gambar) */}
              <div 
                className={`bg-white p-5 rounded-2xl border transition-all shadow-2xs space-y-3.5 ${
                  activeField === 'stimulus' ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-black text-slate-900 flex items-center space-x-2 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <span>1. Stimulus / Wacana / Narasi Masalah (Opsional)</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'editor-focus' ? 'split' : 'editor-focus')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center space-x-1.5 ${
                        viewMode === 'editor-focus'
                          ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                      title={viewMode === 'editor-focus' ? "Kembalikan ke mode berdampingan (dengan pratinjau CBT)" : "Perlebar editor stimulus ke 100% layar untuk membaca/menulis teks panjang"}
                    >
                      {viewMode === 'editor-focus' ? <Minimize2 className="w-3.5 h-3.5 text-amber-700" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{viewMode === 'editor-focus' ? 'Mode Berdampingan' : 'Lebarkan Editor (100%)'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    {activeField === 'stimulus' ? 'Editor Stimulus Aktif' : ''}
                  </span>
                </div>
              </div>

              {/* Integrated Editor Box: Top Toolbar + Text Editor */}
              <div className="border border-slate-300 rounded-2xl relative shadow-2xs focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 bg-white transition-all">
                <WordEquationToolbar 
                  targetName="Stimulus Wacana"
                  onInsert={(snippet, wrap) => {
                    setActiveField('stimulus');
                    handleInsertSnippet(snippet, wrap);
                  }}
                  onOpenFractionModal={() => {
                    setActiveField('stimulus');
                    setShowFractionModal(true);
                  }}
                  onOpenImageModal={() => {
                    setActiveField('stimulus');
                    setShowImageModal(true);
                  }}
                  floating={false}
                />
                <VisualFormulaEditor
                  value={stimulusText}
                  onChange={setStimulusText}
                  onFocus={() => setActiveField('stimulus')}
                  placeholder="Tuliskan stimulus wacana konteks aplikatif di sini. Kotak ini dinamis mengikuti panjang teks, atau tarik sudut kanan bawah untuk memperbesar secara bebas..."
                  minHeight="140px"
                  className="border-0 rounded-b-2xl focus:ring-0 focus:outline-none p-4 text-sm sm:text-base leading-relaxed resize-y"
                />
              </div>

              {/* Stimulus Media Preview & Controls if Media is attached */}
              {stimulusMediaUrl && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                      <span>Media Gambar Wacana Terpasang:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStimulusMediaUrl('')}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Gambar</span>
                    </button>
                  </div>

                  {/* Pratinjau Visual Gambar Stimulus Langsung di Editor Kiri */}
                  <div className={`p-3 bg-white rounded-xl border border-slate-200 overflow-hidden flex ${
                    stimulusMediaAlign === 'left' ? 'justify-start' : stimulusMediaAlign === 'right' ? 'justify-end' : 'justify-center'
                  }`}>
                    <div 
                      className="inline-block relative rounded-xl border border-slate-300 p-1.5 shadow-2xs bg-slate-50"
                      style={{ width: stimulusMediaWidth !== '100%' ? stimulusMediaWidth : '100%', maxWidth: '100%' }}
                    >
                      <img
                        src={stimulusMediaUrl.split('#meta:')[0]}
                        alt={stimulusMediaCaption || 'Pratinjau Gambar Stimulus'}
                        className="w-full h-auto object-contain rounded-lg max-h-64"
                      />
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded mt-1 border border-slate-200 font-sans">
                        <span>{stimulusMediaWidth} • {stimulusMediaAlign === 'left' ? 'Rata Kiri' : stimulusMediaAlign === 'right' ? 'Rata Kanan' : 'Rata Tengah'}</span>
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-black">Aktif di Wacana</span>
                      </div>
                      {stimulusMediaCaption && (
                        <p className="text-[11px] text-slate-600 text-center italic mt-1 font-serif">
                          {stimulusMediaCaption}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Tata Letak:</span>
                      <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-300">
                        {(['left', 'center', 'right', 'float-left'] as const).map((aln) => (
                          <button
                            key={aln}
                            type="button"
                            onClick={() => setStimulusMediaAlign(aln)}
                            className={`flex-1 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                              stimulusMediaAlign === aln ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {aln === 'float-left' ? 'Melayang' : aln}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-7 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Ukuran Lebar:</span>
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {stimulusMediaWidth}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        {['120px', '180px', '240px', '320px', '480px', '100%'].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setStimulusMediaWidth(w)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                              stimulusMediaWidth === w ? 'bg-amber-500 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="sm:col-span-12 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Posisi Gambar Terhadap Teks Wacana:</span>
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setStimulusMediaPosition('above')}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                            stimulusMediaPosition === 'above'
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          <span>⬆ Gambar Di Atas Teks</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStimulusMediaPosition('below')}
                          className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                            stimulusMediaPosition === 'below'
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'text-slate-600 hover:bg-white'
                          }`}
                        >
                          <span>⬇ Gambar Di Bawah Teks</span>
                        </button>
                      </div>
                    </div>

                    <div className="sm:col-span-12">
                      <input
                        type="text"
                        value={stimulusMediaCaption}
                        onFocus={() => setActiveField('stimulus')}
                        onChange={(e) => setStimulusMediaCaption(e.target.value)}
                        placeholder="Keterangan teks di bawah gambar (caption opsional)..."
                        className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg italic"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Question Stem (Pokok Pertanyaan) */}
            <div 
              className={`bg-white p-5 rounded-2xl border transition-all shadow-2xs space-y-3 ${
                activeField === 'question' ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 flex items-center space-x-2 uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4 text-brand-600" />
                  <span>2. Pokok Pertanyaan (Stem Butir Soal) *</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {activeField === 'question' ? 'Editor Soal Aktif' : 'Klik untuk edit'}
                </span>
              </div>

              {/* Integrated Editor Box: Top Toolbar + Text Editor */}
              <div className="border border-slate-300 rounded-2xl relative shadow-2xs focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 bg-white transition-all">
                <WordEquationToolbar 
                  targetName="Pokok Pertanyaan"
                  onInsert={(snippet, wrap) => {
                    setActiveField('question');
                    handleInsertSnippet(snippet, wrap);
                  }}
                  onOpenFractionModal={() => {
                    setActiveField('question');
                    setShowFractionModal(true);
                  }}
                  onOpenImageModal={() => {
                    setActiveField('question');
                    setShowImageModal(true);
                  }}
                  floating={false}
                />
                <VisualFormulaEditor
                  value={questionText}
                  onChange={setQuestionText}
                  onFocus={() => setActiveField('question')}
                  placeholder="Ketikkan rumusan pokok pertanyaan di sini... Kotak ini fleksibel menyesuaikan panjang soal atau bisa ditarik sudut kanan bawah."
                  minHeight="100px"
                  className="border-0 rounded-b-2xl focus:ring-0 focus:outline-none p-4 font-normal text-slate-900 text-sm sm:text-base leading-relaxed resize-y"
                />
              </div>
            </div>

            {/* Section 3: Dynamic Answer Options Based on Question Type */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    3. Kunci & Opsi Jawaban: {blueprintItem.question_type}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Setiap opsi mendukung pecahan visual & gambar. Klik opsi di bawah untuk memformat opsi tersebut.
                  </p>
                </div>

                {(blueprintItem.question_type === 'Pilihan Ganda' || blueprintItem.question_type === 'Pilihan Ganda Kompleks') && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Opsi</span>
                  </button>
                )}
              </div>

              {/* Toolbar Khusus Opsi Jawaban */}
              <div className="border border-slate-300 rounded-2xl relative shadow-2xs bg-white">
                <WordEquationToolbar 
                  targetName={
                    activeField?.startsWith('option-')
                      ? `Opsi ${options[parseInt(activeField.split('-')[1], 10)]?.option_label || 'Pilihan'}`
                      : activeField?.startsWith('distractor-')
                        ? `Catatan Pengecoh ${options[parseInt(activeField.split('-')[1], 10)]?.option_label || ''}`
                        : 'Opsi Jawaban (Klik opsi di bawah)'
                  }
                  onInsert={(snippet, wrap) => {
                    if (!activeField || (!activeField.startsWith('option-') && !activeField.startsWith('distractor-') && !activeField.startsWith('matching-') && activeField !== 'rubrik-uraian')) {
                      setActiveField('option-0');
                    }
                    handleInsertSnippet(snippet, wrap);
                  }}
                  onOpenFractionModal={() => {
                    if (!activeField || (!activeField.startsWith('option-') && !activeField.startsWith('distractor-') && !activeField.startsWith('matching-') && activeField !== 'rubrik-uraian')) {
                      setActiveField('option-0');
                    }
                    setShowFractionModal(true);
                  }}
                  onOpenImageModal={() => {
                    if (!activeField || (!activeField.startsWith('option-') && !activeField.startsWith('distractor-') && !activeField.startsWith('matching-') && activeField !== 'rubrik-uraian')) {
                      setActiveField('option-0');
                    }
                    setShowImageModal(true);
                  }}
                  floating={false}
                />
              </div>

              {/* Render Pilihan Ganda / Pilihan Ganda Kompleks */}
              {(blueprintItem.question_type === 'Pilihan Ganda' || blueprintItem.question_type === 'Pilihan Ganda Kompleks') && (
                <div className="space-y-3 mt-3">
                  {options.map((option, idx) => {
                    const isOptionActive = activeField === `option-${idx}`;

                    return (
                      <div 
                        key={option.id || idx} 
                        className={`bg-white p-3.5 rounded-xl border transition-all space-y-2 ${
                          isOptionActive ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-sm' : 'border-slate-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          {blueprintItem.question_type === 'Pilihan Ganda' ? (
                            <input
                              type="radio"
                              name="correct_answer"
                              checked={option.is_correct}
                              onChange={() => handleSetCorrectRadio(idx)}
                              className="w-5 h-5 text-brand-600 focus:ring-brand-500 cursor-pointer"
                              title="Tandai sebagai kunci jawaban"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              checked={option.is_correct}
                              onChange={(e) => handleOptionChange(idx, 'is_correct', e.target.checked)}
                              className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                              title="Tandai opsi benar"
                            />
                          )}

                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                            option.is_correct ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {option.option_label}
                          </span>

                          {/* Visual Formula Editor for Option Text */}
                          <div className="flex-1 min-w-0">
                            <VisualFormulaEditor
                              value={option.option_text}
                              onChange={(val) => handleOptionChange(idx, 'option_text', val)}
                              onFocus={() => setActiveField(`option-${idx}`)}
                              placeholder={`Teks pilihan ${option.option_label}... (Mendukung pecahan visual langsung)`}
                              isSingleLine={true}
                              minHeight="42px"
                              className="w-full text-xs sm:text-sm"
                            />
                          </div>

                          {options.length > 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(idx)}
                              className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
                              title="Hapus opsi ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Distractor Note */}
                        <div className="pl-10 pr-1">
                          <input
                            type="text"
                            value={option.distractor_note || ''}
                            onFocus={() => setActiveField(`distractor-${idx}`)}
                            onChange={(e) => handleOptionChange(idx, 'distractor_note', e.target.value)}
                            placeholder="Catatan analisis pengecoh (distractor) atau penjelasan opsi..."
                            className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 italic focus:bg-white"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Render Menjodohkan */}
              {blueprintItem.question_type === 'Menjodohkan' && (
                <div className="space-y-2.5 mt-3">
                  {matchingPairs.map((pair, idx) => (
                    <div key={pair.id} className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Pernyataan Kiri #{idx + 1}</span>
                        <VisualFormulaEditor
                          value={pair.left}
                          onChange={(val) => {
                            const updated = [...matchingPairs];
                            updated[idx].left = val;
                            setMatchingPairs(updated);
                          }}
                          onFocus={() => setActiveField(`matching-left-${idx}`)}
                          placeholder="Pernyataan konsep..."
                          isSingleLine={true}
                          minHeight="40px"
                          className="w-full text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">Pasangan Kanan (Kunci Jawaban)</span>
                        <VisualFormulaEditor
                          value={pair.right}
                          onChange={(val) => {
                            const updated = [...matchingPairs];
                            updated[idx].right = val;
                            setMatchingPairs(updated);
                          }}
                          onFocus={() => setActiveField(`matching-right-${idx}`)}
                          placeholder="Pasangan yang cocok..."
                          isSingleLine={true}
                          minHeight="40px"
                          className="w-full text-xs font-bold text-brand-700"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Render Benar / Salah & Sesuai / Tidak Sesuai (Multi-Baris Matriks Asesmen) */}
              {blueprintItem.question_type === 'Benar/Salah' && (
                <div className="space-y-4">
                  {/* Header Pilihan Kategori */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl border border-indigo-900/50 shadow-sm">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <h4 className="font-extrabold text-sm text-white">Tabel Matriks Pernyataan (Standar AKM / SAS)</h4>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Pilih format label kategori dan tentukan kunci respons per baris menggunakan radio button lingkaran.
                      </p>
                    </div>

                    {/* Selector Kategori: (Benar - Salah) atau (Sesuai - Tidak Sesuai) */}
                    <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/15 gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSwitchBsCategory('BENAR_SALAH')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                          bsCategory === 'BENAR_SALAH'
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          bsCategory === 'BENAR_SALAH' ? 'border-slate-950' : 'border-white/60'
                        }`}>
                          {bsCategory === 'BENAR_SALAH' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </span>
                        <span>Benar - Salah</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSwitchBsCategory('SESUAI_TIDAK_SESUAI')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center space-x-1.5 ${
                          bsCategory === 'SESUAI_TIDAK_SESUAI'
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          bsCategory === 'SESUAI_TIDAK_SESUAI' ? 'border-slate-950' : 'border-white/60'
                        }`}>
                          {bsCategory === 'SESUAI_TIDAK_SESUAI' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </span>
                        <span>Sesuai - Tidak Sesuai</span>
                      </button>
                    </div>
                  </div>

                  {/* Tabel Konstruksi Butir Pernyataan */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-100 border-b border-slate-200 font-extrabold text-slate-700 uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-3 px-3 text-center w-12">No</th>
                          <th className="py-3 px-4">Pernyataan Soal</th>
                          <th className="py-3 px-3 text-center w-28 sm:w-36 text-emerald-800 bg-emerald-50/60">
                            {bsCategory === 'SESUAI_TIDAK_SESUAI' ? 'Sesuai' : 'Benar'}
                          </th>
                          <th className="py-3 px-3 text-center w-28 sm:w-36 text-rose-800 bg-rose-50/60">
                            {bsCategory === 'SESUAI_TIDAK_SESUAI' ? 'Tidak Sesuai' : 'Salah'}
                          </th>
                          <th className="py-3 px-3 text-center w-14">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bsStatements.map((st, idx) => {
                          const posLabel = bsCategory === 'SESUAI_TIDAK_SESUAI' ? 'Sesuai' : 'Benar';
                          const negLabel = bsCategory === 'SESUAI_TIDAK_SESUAI' ? 'Tidak Sesuai' : 'Salah';
                          const isPos = st.key === posLabel;
                          const isNeg = st.key === negLabel;

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                              {/* Nomor */}
                              <td className="py-3 px-3 text-center font-black text-slate-600 bg-slate-50/30">
                                #{idx + 1}
                              </td>

                              {/* Teks Pernyataan */}
                              <td className="py-3 px-4">
                                <VisualFormulaEditor
                                  value={st.text}
                                  onChange={(val) => handleUpdateBsStatementText(st.id, val)}
                                  onFocus={() => setActiveField(`bs-statement-${idx}`)}
                                  placeholder={`Ketikkan teks pernyataan #${idx + 1}... (Mendukung rumus matematika & KaTeX)`}
                                  isSingleLine={true}
                                  minHeight="40px"
                                  className="w-full text-xs sm:text-sm"
                                />
                              </td>

                              {/* Radio Button Lingkaran: Benar / Sesuai */}
                              <td className="py-3 px-3 text-center bg-emerald-50/20">
                                <div className="flex flex-col items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateBsStatementKey(st.id, posLabel)}
                                    className="group flex flex-col items-center justify-center p-1 cursor-pointer focus:outline-none"
                                    title={`Pilih kunci "${posLabel}" untuk baris #${idx + 1}`}
                                  >
                                    <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isPos
                                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                                        : 'border-slate-300 group-hover:border-emerald-500 bg-white'
                                    }`}>
                                      {isPos && (
                                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 animate-scale-in" />
                                      )}
                                    </span>
                                    <span className={`text-[10px] font-bold mt-1 ${isPos ? 'text-emerald-700 font-black' : 'text-slate-400'}`}>
                                      {posLabel}
                                    </span>
                                  </button>
                                </div>
                              </td>

                              {/* Radio Button Lingkaran: Salah / Tidak Sesuai */}
                              <td className="py-3 px-3 text-center bg-rose-50/20">
                                <div className="flex flex-col items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateBsStatementKey(st.id, negLabel)}
                                    className="group flex flex-col items-center justify-center p-1 cursor-pointer focus:outline-none"
                                    title={`Pilih kunci "${negLabel}" untuk baris #${idx + 1}`}
                                  >
                                    <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isNeg
                                        ? 'border-rose-600 bg-rose-50 ring-2 ring-rose-500/20'
                                        : 'border-slate-300 group-hover:border-rose-500 bg-white'
                                    }`}>
                                      {isNeg && (
                                        <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-scale-in" />
                                      )}
                                    </span>
                                    <span className={`text-[10px] font-bold mt-1 ${isNeg ? 'text-rose-700 font-black' : 'text-slate-400'}`}>
                                      {negLabel}
                                    </span>
                                  </button>
                                </div>
                              </td>

                              {/* Aksi Hapus */}
                              <td className="py-3 px-3 text-center">
                                {bsStatements.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBsStatement(st.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                    title="Hapus baris pernyataan ini"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Footer Tambah Baris */}
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        Total {bsStatements.length} butir pernyataan aktif.
                      </span>
                      <button
                        type="button"
                        onClick={handleAddBsStatement}
                        className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-black inline-flex items-center space-x-1.5 transition-all shadow-2xs active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Tambah Pernyataan</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Render Isian Singkat */}
              {blueprintItem.question_type === 'Isian Singkat' && (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span>Kunci Jawaban Tepat (Kata / Angka Pasti):</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Auto-Scoring Smart NLP (Toleransi Typo ≥ 80%)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={isianKey}
                    onFocus={() => setActiveField('isian-key')}
                    onChange={(e) => setIsianKey(e.target.value)}
                    placeholder="Contoh: Fotosintesis, Evaporasi, atau 45"
                    className="w-full max-w-md text-sm font-black text-emerald-800 px-3.5 py-2.5 bg-white border border-emerald-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 outline-none shadow-xs"
                  />
                  <p className="text-[11px] text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                    💡 <strong>Kemudahan untuk Guru:</strong> Cukup tulis 1 kunci jawaban tepat di atas. Mesin cerdas SASI akan otomatis menilai jawaban siswa dengan toleransi salah ketik/typo ringan hingga 80% (misal: <em>"fotosintetis"</em> atau <em>"foto sintesis"</em> tetap bernilai 100% benar).
                  </p>
                </div>
              )}

              {/* Render Uraian */}
              {blueprintItem.question_type === 'Uraian' && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
                      <span>Kunci Jawaban Ideal / Konsep Inti (Rubrik):</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                      Hybrid Semantic NLP & AI Evaluator
                    </span>
                  </div>
                  <VisualFormulaEditor
                    value={rubrikUraian}
                    onChange={setRubrikUraian}
                    onFocus={() => setActiveField('rubrik-uraian')}
                    placeholder="Tuliskan contoh jawaban ideal lengkap atau poin-poin konsep penting yang diharapkan..."
                    minHeight="80px"
                    className="w-full text-xs bg-white rounded-lg border-indigo-200"
                  />
                  <p className="text-[11px] text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-indigo-100">
                    💡 <strong>Penilaian Semantik Otomatis:</strong> Guru cukup menuliskan 1 model jawaban ideal. Mesin NLP cerdas SASI akan memindai kepadatan konsep dan sinonim yang ditulis siswa, lalu mengkalkulasi skor otomatis (0-100) dan catatan penjelasannya. Guru tetap dapat meninjau atau menyetujui langsung.
                  </p>
                </div>
              )}

            </div>

            {/* Section 4: Pembahasan & Kunci Jawaban Lengkap (Permintaan User: Fitur Pembahasan) */}
            <div 
              className={`bg-white p-5 rounded-2xl border transition-all shadow-2xs space-y-3 ${
                activeField === 'explanation' ? 'border-brand-500 ring-2 ring-brand-500/20 shadow-md' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 flex items-center space-x-2 uppercase tracking-wider">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>4. Pembahasan Soal & Solusi Lengkap (Opsional)</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {activeField === 'explanation' ? 'Editor Pembahasan Aktif' : 'Klik untuk edit'}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tuliskan langkah penyelesaian dan alasan kunci jawaban. Pecahan akan tampil langsung bertumpuk rapi di editor dan pratinjau CBT.
              </p>
              
              {/* Integrated Editor Box: Top Toolbar + Text Editor */}
              <div className="border border-slate-300 rounded-2xl relative shadow-2xs focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 bg-white transition-all">
                <WordEquationToolbar 
                  targetName="Pembahasan Soal"
                  onInsert={(snippet, wrap) => {
                    setActiveField('explanation');
                    handleInsertSnippet(snippet, wrap);
                  }}
                  onOpenFractionModal={() => {
                    setActiveField('explanation');
                    setShowFractionModal(true);
                  }}
                  onOpenImageModal={() => {
                    setActiveField('explanation');
                    setShowImageModal(true);
                  }}
                  floating={false}
                />
                <VisualFormulaEditor
                  value={explanationText}
                  onChange={setExplanationText}
                  onFocus={() => setActiveField('explanation')}
                  placeholder="Tuliskan pembahasan soal terperinci di sini... Kotak ini fleksibel menyesuaikan panjang teks atau bisa ditarik sudut kanan bawah."
                  minHeight="110px"
                  className="border-0 rounded-b-2xl focus:ring-0 focus:outline-none p-4 text-sm sm:text-base leading-relaxed resize-y"
                />
              </div>
            </div>

            {/* Section 5: Bobot Skor & Alur Kerja */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Bobot Skor Soal
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Status Alur Kerja Soal (Workflow Status)
                </label>
                <select
                  value={workflowStatus}
                  onChange={(e) => setWorkflowStatus(e.target.value as WorkflowStatus)}
                  className="w-full text-sm px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-brand-700 bg-white focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Dalam Penulisan">Dalam Penulisan</option>
                  <option value="Draft">Draft</option>
                  <option value="Menunggu Riviu">Menunggu Riviu (Reviewer)</option>
                  <option value="Selesai">Selesai (Masuk Bank Soal Siap Uji)</option>
                </select>
              </div>
            </div>

          </div>
          )}

          {/* Right Column: Authentic Live Student CBT Preview */}
          {viewMode !== 'editor-focus' && (
            <div 
              ref={previewScrollRef}
              className={`${viewMode === 'split' ? 'lg:col-span-5' : 'lg:col-span-12'} bg-slate-100/70 p-6 overflow-y-auto flex flex-col space-y-4 relative`}
            >
              {/* CBT Preview Arena Header Card */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2 shrink-0">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Pratinjau Antarmuka Siswa (CBT)
                    </span>
                    {viewMode === 'preview-focus' && (
                      <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-black">
                        Tampilan Penuh (100%)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === 'preview-focus' ? 'split' : 'preview-focus')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 flex items-center space-x-1 transition-all"
                      title={viewMode === 'preview-focus' ? 'Kembali ke mode berdampingan (split)' : 'Perlebar tampilan soal siswa ke 100% layar'}
                    >
                      {viewMode === 'preview-focus' ? <Columns className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      <span>{viewMode === 'preview-focus' ? 'Mode Split' : 'Full Layar'}</span>
                    </button>
                    <div className="h-4 w-px bg-slate-200 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => scrollPreview('top')}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-all hover:scale-105 active:scale-95"
                      title="Gulir Pratinjau ke Paling Atas"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollPreview('bottom')}
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 shadow-2xs transition-all hover:scale-105 active:scale-95"
                      title="Gulir Pratinjau ke Paling Bawah"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tampilan di bawah adalah <strong>persis sama</strong> dengan apa yang akan dilihat siswa di layar ujian CBT SASI.
                </p>
              </div>

              {/* Student CBT Card Container */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-md flex-1">
                {/* Question Info Bar */}
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                  <span className="px-3 py-1 rounded-xl bg-brand-600 text-white font-black text-xs shadow-2xs">
                    Soal No. {blueprintItem.question_number}
                  </span>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold">
                    <span>Ukuran Teks:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">Normal</span>
                  </div>
                </div>

                {/* Render Question using QuestionRenderer with Pembahasan */}
                <QuestionRenderer
                  question={livePreviewQuestion}
                  fontSize="normal"
                  answer={previewAnswer}
                  onUpdateAnswer={(ids, txt) => setPreviewAnswer(prev => ({
                    question_id: 'preview-current',
                    selected_option_ids: ids !== undefined ? ids : prev?.selected_option_ids,
                    answer_text: txt !== undefined ? txt : prev?.answer_text,
                  }))}
                />
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 rounded-2xl hover:bg-slate-200/50 transition-colors"
          >
            Batal
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 disabled:opacity-75 disabled:cursor-wait text-white text-sm font-black rounded-2xl shadow-lg shadow-brand-500/25 flex items-center space-x-2 transition-all transform active:scale-95"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Butir Soal & Pembahasan</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

      {/* MODAL 1: SISIPKAN PECAHAN MATEMATIKA (VISUAL TUMPUK LANGSUNG) */}
      {showFractionModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-serif font-black text-sm shadow-sm">
                  ½
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Sisipkan Pecahan Langsung</h3>
                  <p className="text-xs text-slate-500">Tampil bertumpuk rapi di editor tanpa kode rumus</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFractionModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Visual Preview of Fraction */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block mb-2">
                Pratinjau Tampilan Pecahan di Editor:
              </span>
              <div className="inline-flex flex-col items-center font-serif bg-white px-5 py-2.5 rounded-xl border border-amber-300 shadow-xs">
                <span className="border-b-2 border-slate-900 px-3 text-lg font-black text-amber-950 leading-none pb-1">
                  {fractionNum || '1'}
                </span>
                <span className="px-3 text-lg font-black text-amber-950 leading-none pt-1">
                  {fractionDen || '2'}
                </span>
              </div>
              <div className="text-[11px] text-amber-900 font-medium mt-2 bg-amber-100/60 py-1 px-2.5 rounded-lg inline-block">
                💡 Di editor, Anda bisa langsung klik angkanya untuk diedit kapan saja seperti di Microsoft Word!
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-1.5">Pilihan Pecahan Populer:</span>
              <div className="grid grid-cols-5 gap-1.5">
                {['1/2', '1/3', '1/4', '2/3', '3/4', '1/5', '2/5', '3/5', '4/5', '1/8'].map((frac) => {
                  const [n, d] = frac.split('/');
                  const isSel = fractionNum === n && fractionDen === d;
                  return (
                    <button
                      key={frac}
                      type="button"
                      onClick={() => {
                        setFractionNum(n);
                        setFractionDen(d);
                      }}
                      className={`py-1 px-1.5 rounded-xl border font-serif font-bold text-xs flex flex-col items-center transition-all ${
                        isSel
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-amber-50 text-slate-800 border-slate-200'
                      }`}
                    >
                      <span className="leading-none">{n}</span>
                      <span className="border-t border-current w-3.5 my-0.5"></span>
                      <span className="leading-none">{d}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Pembilang & Penyebut */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Pembilang (Angka Atas):
                </label>
                <input
                  type="text"
                  value={fractionNum}
                  onChange={(e) => setFractionNum(e.target.value)}
                  placeholder="misal: 1 atau x"
                  className="w-full text-center font-bold text-sm px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Penyebut (Angka Bawah):
                </label>
                <input
                  type="text"
                  value={fractionDen}
                  onChange={(e) => setFractionDen(e.target.value)}
                  placeholder="misal: 4 atau y"
                  className="w-full text-center font-bold text-sm px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFractionModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertFraction}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
              >
                Sisipkan Pecahan ke {getTargetFriendlyLabel(activeField)}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: SISIPKAN GAMBAR LENGKAP & TIDAK TERPOTONG (CENTERED MODAL DIALOG) */}
      {showImageModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    Sisipkan Gambar ke {getTargetFriendlyLabel(activeField)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unggah dari komputer atau masukkan link gambar dengan tata letak rapi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sumber Gambar: Upload Komputer atau URL */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-slate-600 block">Pilih Sumber Gambar:</span>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileChange}
                accept="image/*"
                className="hidden"
              />

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all active:scale-95"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Pilih Gambar Dari Komputer (Laptop/PC)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setImageModalUrl('https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=60')}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300"
                >
                  Contoh Foto
                </button>
              </div>

              <div>
                <input
                  type="text"
                  value={imageModalUrl}
                  onChange={(e) => setImageModalUrl(e.target.value)}
                  placeholder="Atau tempel tautan URL gambar (https://...)..."
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Pengaturan Tata Letak & Ukuran */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <span className="font-bold text-slate-700 block mb-1 text-xs">Tata Letak Posisi Gambar:</span>
                <div className="grid grid-cols-4 gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setImageModalAlign('left')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      imageModalAlign === 'left' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    Rata Kiri
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageModalAlign('center')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      imageModalAlign === 'center' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    Rata Tengah
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageModalAlign('right')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      imageModalAlign === 'right' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    Rata Kanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageModalAlign('float-left')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      imageModalAlign === 'float-left' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-white'
                    }`}
                    title="Teks mengalir di sebelah kanan gambar"
                  >
                    Melayang Kiri
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700 text-xs">Ukuran Fisik Gambar (Pixel):</span>
                  <span className="text-[10px] text-slate-400 font-medium">Satuan pixel agar serasi & presisi</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { label: '120 px', value: '120px', desc: 'Pas Opsi' },
                    { label: '180 px', value: '180px', desc: 'Ringkas' },
                    { label: '240 px', value: '240px', desc: 'Sedang' },
                    { label: '320 px', value: '320px', desc: 'Besar' },
                    { label: '480 px', value: '480px', desc: 'Ekstra' },
                    { label: 'Default', value: 'default', desc: 'Alami' },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setImageModalWidth(item.value)}
                      className={`py-1.5 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center ${
                        imageModalWidth === item.value 
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[9px] font-normal leading-tight ${imageModalWidth === item.value ? 'text-amber-100' : 'text-slate-400'}`}>
                        {item.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Keterangan Gambar (Caption Teks Bawah):
                </label>
                <input
                  type="text"
                  value={imageModalCaption}
                  onChange={(e) => setImageModalCaption(e.target.value)}
                  placeholder="misal: Gambar 1. Pola pembagian kue..."
                  className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl italic"
                />
              </div>

              {/* Pratinjau Gambar di Dialog */}
              {imageModalUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Pratinjau Gambar:</span>
                  <img
                    src={imageModalUrl}
                    alt="Pratinjau"
                    className="max-h-36 mx-auto rounded-xl object-contain border border-slate-200 shadow-2xs"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!imageModalUrl}
                onClick={handleConfirmInsertImage}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
              >
                Sisipkan Gambar Sekarang
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DETAIL KISI-KISI LENGKAP SAAT PENULISAN SOAL */}
      {showBlueprintDetailModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in overflow-y-auto" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[92vh] overflow-y-auto animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    Pemetaan Kisi-Kisi Butir #{blueprintItem.question_number}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acuan lengkap spesifikasi dan pemetaan kisi-kisi SASI
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlueprintDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-black bg-brand-600 text-white shadow-xs">
                Butir #{blueprintItem.question_number}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                Level {blueprintItem.cognitive_level}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {blueprintItem.question_type}
              </span>
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Tugas: {blueprintItem.task_type}
              </span>
            </div>

            {/* Isi Matriks 11 Kolom */}
            <div className="space-y-3.5 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                    1. Elemen
                  </span>
                  <p className="font-black text-slate-900">{blueprintItem.element}</p>
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                    2. Subelemen / Lingkup Materi
                  </span>
                  <p className="font-bold text-slate-700">{blueprintItem.sub_element}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                  3. Indikator Soal Acuan (Lengkap)
                </span>
                <p className="font-bold text-slate-900 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed text-sm">
                  {blueprintItem.indicator}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                  4. Konteks Masalah
                </span>
                <p className="font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200">
                  {blueprintItem.context || '(Belum dispesifikasikan)'} ({blueprintItem.question_category})
                </p>
              </div>

              {blueprintItem.competency && (
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                    5. Capaian Pembelajaran / Kompetensi (CP/TP)
                  </span>
                  <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                    {blueprintItem.competency}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowBlueprintDetailModal(false)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all"
              >
                Lanjutkan Menulis Soal
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

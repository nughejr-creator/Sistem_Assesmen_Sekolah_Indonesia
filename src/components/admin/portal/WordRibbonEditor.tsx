import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useLayoutEffect } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Subscript, 
  Superscript, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Indent, 
  Outdent, 
  Heading1, 
  Heading2, 
  Heading3, 
  Quote, 
  Minus, 
  Image as ImageIcon, 
  Table as TableIcon, 
  Sigma, 
  Link as LinkIcon, 
  Unlink, 
  Undo, 
  Redo, 
  Palette, 
  Highlighter, 
  Type, 
  RemoveFormatting, 
  Code, 
  Maximize2, 
  Minimize2, 
  Check, 
  X, 
  Plus, 
  Trash2, 
  Upload, 
  Sparkles,
  Rows,
  Columns,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import katex from 'katex';
import { compressImageFile, CompressionResult, HARD_SIZE_LIMIT_BYTES } from '../../../lib/imageCompressor';
import { countWords, countCharacters, calculateReadTime } from '../../../lib/safeHtmlSanitizer';

export interface WordRibbonEditorRef {
  getLatestContent: () => string;
}

interface WordRibbonEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const FONT_FAMILIES = [
  { label: 'Plus Jakarta Sans (Default)', value: "'Plus Jakarta Sans', sans-serif" },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Courier New (Monospace)', value: "'Courier New', Courier, monospace" }
];

const FONT_SIZES = [
  { label: '9 pt', value: '1' },
  { label: '10 pt', value: '2' },
  { label: '12 pt (Standar)', value: '3' },
  { label: '14 pt', value: '4' },
  { label: '18 pt', value: '5' },
  { label: '24 pt', value: '6' },
  { label: '36 pt', value: '7' }
];

const QUICK_COLORS = [
  '#0f172a', '#334155', '#475569', '#dc2626', '#ea580c', 
  '#d97706', '#16a34a', '#0284c7', '#2563eb', '#7c3aed', '#db2777'
];

const QUICK_HIGHLIGHTS = [
  { label: 'Kuning', value: '#fef08a' },
  { label: 'Hijau Terang', value: '#bbf7d0' },
  { label: 'Biru Muda', value: '#bae6fd' },
  { label: 'Merah Muda', value: '#fbcfe8' },
  { label: 'Oranye', value: '#fed7aa' },
  { label: 'Hapus Highlight', value: 'transparent' }
];

const MATH_SYMBOLS = [
  '±', '×', '÷', '≠', '≈', '≤', '≥', '∞', 'π', 'α', 'β', 'γ', 'θ', 'λ', 'μ', 
  '∑', '∏', '√', '∫', '∆', '∂', '∈', '∉', '⊂', '⊆', '∪', '∩', '°', '‰', 
  '²', '³', '¼', '½', '¾', '€', '£', '¥', '₹', '—', '–', '•', '…', '©', '®', '™'
];

const LATEX_TEMPLATES = [
  { label: 'Pecahan', code: '\\frac{a}{b}' },
  { label: 'Akar Kuadrat', code: '\\sqrt{x}' },
  { label: 'Pangkat & Indeks', code: 'x_{1}^{2}' },
  { label: 'Penjumlahan (Sigma)', code: '\\sum_{i=1}^{n} x_i' },
  { label: 'Integral', code: '\\int_{a}^{b} f(x) dx' },
  { label: 'Rumus Kuadratik', code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: 'Limit', code: '\\lim_{x \\to \\infty} f(x)' },
  { label: 'Matriks 2x2', code: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' }
];

/**
 * Menormalkan kode HTML yang di-paste atau diketik di editor:
 * - Mengekstrak isi <body> jika user menyalin dokumen HTML utuh (<html>...</html>)
 * - Membersihkan tag doctype, html, head, meta
 * - Menormalkan karakter baris baru
 */
export function normalizeHtmlForEditor(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // 1. Ekstrak isi <body> jika user menyalin seluruh dokumen HTML
  const bodyMatch = str.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    str = bodyMatch[1].trim();
  } else {
    // Bersihkan tag pembungkus doctype, html, head jika ada
    str = str
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '');
  }

  // 2. Normalisasi literal escape \n atau \r\n jika ada
  str = str
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n');

  return str.trim();
}

export const WordRibbonEditor = forwardRef<WordRibbonEditorRef, WordRibbonEditorProps>(({
  value,
  onChange,
  placeholder = 'Mulai ketik materi artikel Anda di sini...',
  minHeight = '380px'
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'beranda' | 'sisipkan' | 'tata_letak'>('beranda');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [sourceCode, setSourceCode] = useState<string>(normalizeHtmlForEditor(value || ''));

  // Single Source of Truth buffer ref
  const contentBufferRef = useRef<string>(normalizeHtmlForEditor(value || ''));

  // Guard flag untuk mencegah siklus useEffect prop 'value' menimpa input pengguna
  const isInternalEditingRef = useRef<boolean>(false);

  // Snapshot extractor untuk memastikan state terbaru diambil sebelum submit
  const getLatestContent = useCallback((): string => {
    if (isSourceMode) {
      return textareaRef.current?.value ?? contentBufferRef.current ?? '';
    } else {
      const visual = editorRef.current?.innerHTML;
      return (visual && visual.trim() !== '' && visual.trim() !== '<br>') 
        ? visual 
        : (contentBufferRef.current || '');
    }
  }, [isSourceMode]);

  useImperativeHandle(ref, () => ({
    getLatestContent
  }), [getLatestContent]);

  // Modals state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(true);

  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageAlign, setImageAlign] = useState<'left' | 'center' | 'right'>('center');
  const [imageWidth, setImageWidth] = useState<'w-1/2' | 'w-3/4' | 'w-full'>('w-full');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageCompressionStats, setImageCompressionStats] = useState<CompressionResult | null>(null);

  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableHoverRows, setTableHoverRows] = useState(3);
  const [tableHoverCols, setTableHoverCols] = useState(3);

  const [showEquationModal, setShowEquationModal] = useState(false);
  const [equationLatex, setEquationLatex] = useState('\\frac{a}{b}');
  const [equationDisplayMode, setEquationDisplayMode] = useState(false);
  const [equationPreviewError, setEquationPreviewError] = useState('');

  const [showSymbolModal, setShowSymbolModal] = useState(false);

  // Color Pickers
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Status metrics
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [readTime, setReadTime] = useState(1);
  const [lastAutoSave, setLastAutoSave] = useState<string>('Baru saja');

  // Initialize on mount
  useEffect(() => {
    const initialContent = normalizeHtmlForEditor(value || '');
    contentBufferRef.current = initialContent;
    setSourceCode(initialContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
    }
    if (textareaRef.current) {
      textareaRef.current.value = initialContent;
    }
    updateMetrics(initialContent);
  }, []);

  // Sync prop 'value' HANYA saat ada perubahan dari luar (bukan dari ketikan / toggle sendiri)
  useEffect(() => {
    if (isInternalEditingRef.current) {
      isInternalEditingRef.current = false;
      return;
    }
    if (value !== undefined && value !== contentBufferRef.current) {
      const normalized = normalizeHtmlForEditor(value);
      contentBufferRef.current = normalized;
      setSourceCode(normalized);
      if (editorRef.current) {
        editorRef.current.innerHTML = normalized;
      }
      if (textareaRef.current) {
        textareaRef.current.value = normalized;
      }
      updateMetrics(normalized);
    }
  }, [value]);

  const updateMetrics = (html: string) => {
    const words = countWords(html);
    const chars = countCharacters(html);
    const time = calculateReadTime(html);
    setWordCount(words);
    setCharCount(chars);
    setReadTime(time);
    const now = new Date();
    setLastAutoSave(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    contentBufferRef.current = html;
    isInternalEditingRef.current = true;
    setSourceCode(html);
    onChange(html);
    updateMetrics(html);
  };

  // Helper execCommand wrapper
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, val);
    handleEditorInput();
  };

  // Font formatting
  const handleFontFamily = (font: string) => {
    execCmd('fontName', font);
  };

  const handleFontSize = (size: string) => {
    execCmd('fontSize', size);
  };

  const handleClearFormatting = () => {
    execCmd('removeFormat');
    execCmd('unlink');
  };

  // Case transforms on selected text
  const handleChangeCase = (mode: 'upper' | 'lower' | 'title') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    if (!selectedText) return;

    let transformed = selectedText;
    if (mode === 'upper') {
      transformed = selectedText.toUpperCase();
    } else if (mode === 'lower') {
      transformed = selectedText.toLowerCase();
    } else if (mode === 'title') {
      transformed = selectedText.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
    }

    execCmd('insertText', transformed);
  };

  // Alignment
  const handleAlign = (alignment: 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull') => {
    execCmd(alignment);
  };

  // Headings
  const handleFormatBlock = (tag: 'p' | 'h1' | 'h2' | 'h3' | 'blockquote') => {
    if (tag === 'p') {
      execCmd('formatBlock', '<p>');
    } else if (tag === 'blockquote') {
      execCmd('formatBlock', '<blockquote>');
    } else {
      execCmd('formatBlock', `<${tag}>`);
    }
  };

  // Insert Horizontal Rule
  const handleInsertHR = () => {
    execCmd('insertHorizontalRule');
  };

  // Link Handling
  const handleOpenLinkModal = () => {
    const selection = window.getSelection();
    if (selection) {
      setLinkText(selection.toString());
    }
    setShowLinkModal(true);
  };

  const handleConfirmLink = () => {
    if (!linkUrl) return;
    if (editorRef.current) editorRef.current.focus();

    const targetAttr = linkNewTab ? ' target="_blank" rel="noopener noreferrer"' : '';
    const displayText = linkText || linkUrl;
    const linkHtml = `<a href="${linkUrl}"${targetAttr} class="text-sky-600 underline hover:text-sky-800 font-medium">${displayText}</a>`;

    document.execCommand('insertHTML', false, linkHtml);
    handleEditorInput();
    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  // Image Handling
  const handleInsertImageUrl = () => {
    if (!imageUrl) return;
    if (editorRef.current) editorRef.current.focus();

    const alignClass = imageAlign === 'center' ? 'mx-auto' : imageAlign === 'right' ? 'ml-auto' : 'mr-auto';
    const figureHtml = `
      <figure class="my-4 text-center ${alignClass} ${imageWidth}">
        <img src="${imageUrl}" alt="${imageCaption || 'Gambar Artikel'}" class="rounded-xl border border-slate-300 shadow-sm max-w-full inline-block" />
        ${imageCaption ? `<figcaption class="mt-1.5 text-xs text-slate-500 italic">${imageCaption}</figcaption>` : ''}
      </figure>
      <p><br></p>
    `;

    document.execCommand('insertHTML', false, figureHtml);
    handleEditorInput();
    setShowImageModal(false);
    setImageUrl('');
    setImageCaption('');
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setImageUrl('');
    setImageCaption('');
    setImageCompressionStats(null);
  };

  const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    setImageCompressionStats(null);

    try {
      const res = await compressImageFile(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.75,
        maxSizeBytes: HARD_SIZE_LIMIT_BYTES
      });
      setImageUrl(res.dataUrl);
      setImageCompressionStats(res);
    } catch (err: any) {
      console.error('Gagal memproses gambar:', err);
      alert('Gagal memproses gambar: ' + (err.message || 'Format tidak didukung'));
    } finally {
      setIsCompressingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Table Handling
  const handleInsertTable = (rows: number, cols: number) => {
    setShowTablePicker(false);
    if (editorRef.current) editorRef.current.focus();

    let tableHtml = '<table class="w-full my-4 border-collapse border border-slate-300 text-xs text-slate-800 rounded-lg overflow-hidden">';
    tableHtml += '<thead><tr class="bg-slate-100 border-b border-slate-300 font-bold">';
    for (let c = 1; c <= cols; c++) {
      tableHtml += `<th class="border border-slate-300 px-3 py-2 text-left bg-slate-100">Kolom ${c}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    for (let r = 1; r <= rows; r++) {
      const rowBg = r % 2 === 0 ? 'bg-slate-50/50' : 'bg-white';
      tableHtml += `<tr class="${rowBg}">`;
      for (let c = 1; c <= cols; c++) {
        tableHtml += `<td class="border border-slate-300 px-3 py-2">Baris ${r}, Kolom ${c}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';

    document.execCommand('insertHTML', false, tableHtml);
    handleEditorInput();
  };

  // Insert KaTeX Equation
  const handleInsertEquation = () => {
    if (!equationLatex.trim()) return;
    try {
      const renderedHtml = katex.renderToString(equationLatex.trim(), {
        throwOnError: false,
        displayMode: equationDisplayMode
      });

      const encodedLatex = encodeURIComponent(equationLatex.trim());
      const wrapperHtml = equationDisplayMode
        ? `<div class="my-4 py-2 text-center overflow-x-auto" data-latex="${encodedLatex}">${renderedHtml}</div><p><br></p>`
        : `<span class="inline-block px-1" data-latex="${encodedLatex}">${renderedHtml}</span>`;

      if (editorRef.current) editorRef.current.focus();
      document.execCommand('insertHTML', false, wrapperHtml);
      handleEditorInput();
      setShowEquationModal(false);
    } catch (err: unknown) {
      setEquationPreviewError(err instanceof Error ? err.message : 'Kesalahan sintaks LaTeX');
    }
  };

  // Insert Special Symbol
  const handleInsertSymbol = (sym: string) => {
    if (editorRef.current) editorRef.current.focus();
    document.execCommand('insertText', false, sym);
    handleEditorInput();
  };

  // Toggle Source Mode (Sinkronisasi Dua Arah Visual <-> HTML Persistent-DOM Anti-Hilang)
  const handleToggleSourceMode = () => {
    if (!isSourceMode) {
      // 1. Sedang di Mode Visual -> Beralih ke Mode HTML
      // Ambil konten visual terkini langsung dari innerHTML jika ada isinya
      const visualHtml = editorRef.current?.innerHTML;
      const hasContent = visualHtml !== undefined && visualHtml.trim() !== '' && visualHtml.trim() !== '<br>';
      const targetContent = hasContent ? visualHtml : contentBufferRef.current;

      contentBufferRef.current = targetContent;
      isInternalEditingRef.current = true;
      setSourceCode(targetContent);

      // Injeksi nilai ke textarea DOM secara sinkron seketika
      if (textareaRef.current) {
        textareaRef.current.value = targetContent;
      }

      setIsSourceMode(true);
      onChange(targetContent);
      updateMetrics(targetContent);
    } else {
      // 2. Sedang di Mode HTML -> Beralih ke Mode Visual
      // Ambil teks dari textarea atau buffer
      const rawCode = textareaRef.current?.value ?? sourceCode ?? contentBufferRef.current ?? '';
      const cleanHtml = normalizeHtmlForEditor(rawCode);

      contentBufferRef.current = cleanHtml;
      isInternalEditingRef.current = true;
      setSourceCode(cleanHtml);

      // INJEKSI LANGSUNG SECARA SINKRON SEBELUM/BERSAMAAN DENGAN STATE SWITCH (TANPA SETTIMEOUT!)
      if (editorRef.current) {
        editorRef.current.innerHTML = cleanHtml;
      }

      setIsSourceMode(false);
      onChange(cleanHtml);
      updateMetrics(cleanHtml);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const code = e.target.value;
    contentBufferRef.current = code;
    isInternalEditingRef.current = true;
    setSourceCode(code);
    onChange(code);
    updateMetrics(code);
  };

  // Handler paste khusus jika user mem-paste potongan kode HTML langsung di mode visual
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');
    if (text && /<[a-z][\s\S]*>/i.test(text) && !html) {
      e.preventDefault();
      document.execCommand('insertHTML', false, text);
      handleEditorInput();
    }
  };

  // Keyboard shortcut listener
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      execCmd('bold');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      execCmd('italic');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      execCmd('underline');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      handleOpenLinkModal();
    }
  };

  return (
    <div 
      className={`bg-white rounded-2xl border-2 border-slate-300 shadow-sm flex flex-col transition-all overflow-hidden ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : 'relative'
      }`}
    >
      {/* =====================================================================
          1. TOP RIBBON TABS (BERANDA / SISIPKAN / TATA LETAK)
      ===================================================================== */}
      <div className="bg-slate-100/90 border-b-2 border-slate-200 px-3 py-1 flex items-center justify-between">
        <div className="flex items-center space-x-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('beranda')}
            className={`px-3 py-1 rounded-t-lg transition-colors ${
              activeTab === 'beranda'
                ? 'bg-white text-sky-800 border-t-2 border-sky-600 font-black shadow-2xs'
                : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Beranda
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sisipkan')}
            className={`px-3 py-1 rounded-t-lg transition-colors ${
              activeTab === 'sisipkan'
                ? 'bg-white text-sky-800 border-t-2 border-sky-600 font-black shadow-2xs'
                : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Sisipkan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tata_letak')}
            className={`px-3 py-1 rounded-t-lg transition-colors ${
              activeTab === 'tata_letak'
                ? 'bg-white text-sky-800 border-t-2 border-sky-600 font-black shadow-2xs'
                : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            Tata Letak & Gaya
          </button>
        </div>

        {/* Right utility buttons: Source Code & Fullscreen */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleToggleSourceMode}
            title={isSourceMode ? 'Kembali ke Visual Editor' : 'Lihat Kode HTML Sumber'}
            className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center space-x-1 border transition-all ${
              isSourceMode
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isSourceMode ? 'Mode Visual' : 'HTML'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
            className="p-1.5 rounded-md bg-white border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. RIBBON TOOLBAR CLUSTERS (BERDASARKAN TAB AKTIF)
      ===================================================================== */}
      {!isSourceMode && (
        <div className="bg-slate-50/80 border-b border-slate-200 p-2 text-xs flex flex-wrap items-center gap-y-2 gap-x-3">
          
          {/* TAB 1: BERANDA (FONT & PARAGRAF DASAR) */}
          {activeTab === 'beranda' && (
            <>
              {/* Cluster 1: Undo / Redo */}
              <div className="flex items-center space-x-0.5 border-r border-slate-300 pr-2">
                <button
                  type="button"
                  onClick={() => execCmd('undo')}
                  title="Undo (Ctrl+Z)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <Undo className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('redo')}
                  title="Redo (Ctrl+Y)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <Redo className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cluster 2: Font Family & Size */}
              <div className="flex items-center space-x-1.5 border-r border-slate-300 pr-2">
                <select
                  onChange={(e) => handleFontFamily(e.target.value)}
                  className="px-2 py-1 rounded-md border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:ring-1 focus:ring-sky-500"
                  defaultValue="'Plus Jakarta Sans', sans-serif"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <select
                  onChange={(e) => handleFontSize(e.target.value)}
                  className="px-2 py-1 rounded-md border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:ring-1 focus:ring-sky-500"
                  defaultValue="3"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>

                {/* Grow / Shrink Font */}
                <button
                  type="button"
                  onClick={() => execCmd('fontSize', '4')}
                  title="Perbesar Huruf (Grow Font)"
                  className="px-1.5 py-1 rounded-md bg-white border border-slate-300 text-[11px] font-black text-slate-700 hover:bg-slate-100"
                >
                  A+
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('fontSize', '2')}
                  title="Perkecil Huruf (Shrink Font)"
                  className="px-1.5 py-1 rounded-md bg-white border border-slate-300 text-[11px] font-black text-slate-700 hover:bg-slate-100"
                >
                  A-
                </button>
              </div>

              {/* Cluster 3: Bold, Italic, Underline, Strikethrough, Sub/Sup */}
              <div className="flex items-center space-x-0.5 border-r border-slate-300 pr-2">
                <button
                  type="button"
                  onClick={() => execCmd('bold')}
                  title="Tebal (Ctrl+B)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-800 font-black"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('italic')}
                  title="Miring (Ctrl+I)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-800 italic"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('underline')}
                  title="Garis Bawah (Ctrl+U)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-800 underline"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('strikeThrough')}
                  title="Coret Teks (Strikethrough)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('subscript')}
                  title="Subscript (X₂)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <Subscript className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('superscript')}
                  title="Superscript (X²)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <Superscript className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cluster 4: Color & Highlight */}
              <div className="flex items-center space-x-1 border-r border-slate-300 pr-2 relative">
                {/* Font Color */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                    title="Warna Teks"
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-800 flex items-center space-x-0.5"
                  >
                    <Palette className="w-3.5 h-3.5 text-rose-600" />
                  </button>

                  {showTextColorPicker && (
                    <div className="absolute left-0 top-full mt-1.5 bg-white p-2.5 rounded-xl border-2 border-slate-300 shadow-xl z-20 w-44">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Warna Teks</div>
                      <div className="grid grid-cols-5 gap-1.5 mb-2">
                        {QUICK_COLORS.map((col) => (
                          <button
                            key={col}
                            type="button"
                            onClick={() => {
                              execCmd('foreColor', col);
                              setShowTextColorPicker(false);
                            }}
                            className="w-6 h-6 rounded-md border border-slate-300 hover:scale-110 transition-transform"
                            style={{ backgroundColor: col }}
                          />
                        ))}
                      </div>
                      <input
                        type="color"
                        onChange={(e) => {
                          execCmd('foreColor', e.target.value);
                          setShowTextColorPicker(false);
                        }}
                        className="w-full h-7 rounded cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Highlight / Stabilo */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                    title="Sorotan Teks (Stabilo)"
                    className="p-1.5 rounded-md hover:bg-slate-200 text-slate-800 flex items-center space-x-0.5"
                  >
                    <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  {showHighlightPicker && (
                    <div className="absolute left-0 top-full mt-1.5 bg-white p-2.5 rounded-xl border-2 border-slate-300 shadow-xl z-20 w-44">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Warna Stabilo</div>
                      <div className="space-y-1">
                        {QUICK_HIGHLIGHTS.map((h) => (
                          <button
                            key={h.value}
                            type="button"
                            onClick={() => {
                              execCmd('hiliteColor', h.value);
                              setShowHighlightPicker(false);
                            }}
                            className="w-full text-left px-2 py-1 rounded text-[11px] font-bold flex items-center space-x-2 hover:opacity-80"
                            style={{ backgroundColor: h.value === 'transparent' ? '#f1f5f9' : h.value }}
                          >
                            <span className="w-3 h-3 rounded-full border border-slate-400" style={{ backgroundColor: h.value }} />
                            <span className="text-slate-800">{h.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Clear Formatting */}
                <button
                  type="button"
                  onClick={handleClearFormatting}
                  title="Hapus Pemformatan (Clear Formatting)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600"
                >
                  <RemoveFormatting className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cluster 5: Case Changer */}
              <div className="flex items-center space-x-1 border-r border-slate-300 pr-2">
                <button
                  type="button"
                  onClick={() => handleChangeCase('upper')}
                  title="Ubah ke HURUF BESAR SEMUA"
                  className="px-1.5 py-1 rounded-md bg-white border border-slate-300 text-[10px] font-black text-slate-700 hover:bg-slate-100"
                >
                  AA
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeCase('lower')}
                  title="Ubah ke huruf kecil semua"
                  className="px-1.5 py-1 rounded-md bg-white border border-slate-300 text-[10px] font-black text-slate-700 hover:bg-slate-100"
                >
                  aa
                </button>
                <button
                  type="button"
                  onClick={() => handleChangeCase('title')}
                  title="Ubah ke Huruf Kapital Di Awal Kata"
                  className="px-1.5 py-1 rounded-md bg-white border border-slate-300 text-[10px] font-black text-slate-700 hover:bg-slate-100"
                >
                  Aa
                </button>
              </div>

              {/* Cluster 6: Alignment */}
              <div className="flex items-center space-x-0.5">
                <button
                  type="button"
                  onClick={() => handleAlign('justifyLeft')}
                  title="Rata Kiri"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAlign('justifyCenter')}
                  title="Rata Tengah"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAlign('justifyRight')}
                  title="Rata Kanan"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAlign('justifyFull')}
                  title="Rata Kanan Kiri (Justify)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <AlignJustify className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}

          {/* TAB 2: SISIPKAN (TABLE, IMAGE, EQUATION, SYMBOL, LINK) */}
          {activeTab === 'sisipkan' && (
            <>
              {/* Insert Table */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTablePicker(!showTablePicker)}
                  className="px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold flex items-center space-x-1.5 shadow-2xs"
                >
                  <TableIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Tabel</span>
                </button>

                {showTablePicker && (
                  <div className="absolute left-0 top-full mt-1.5 bg-white p-3 rounded-xl border-2 border-slate-300 shadow-xl z-20">
                    <div className="text-[11px] font-bold text-slate-700 mb-2">
                      Pilih Ukuran Grid: {tableHoverCols} × {tableHoverRows}
                    </div>
                    <div className="grid grid-cols-6 gap-1 p-1 bg-slate-50 border border-slate-200 rounded-lg">
                      {[1, 2, 3, 4, 5, 6].map((row) =>
                        [1, 2, 3, 4, 5, 6].map((col) => {
                          const isActive = row <= tableHoverRows && col <= tableHoverCols;
                          return (
                            <div
                              key={`${row}-${col}`}
                              onMouseEnter={() => {
                                setTableHoverRows(row);
                                setTableHoverCols(col);
                              }}
                              onClick={() => handleInsertTable(row, col)}
                              className={`w-5 h-5 rounded-xs border cursor-pointer transition-colors ${
                                isActive
                                  ? 'bg-sky-500 border-sky-600'
                                  : 'bg-white border-slate-300 hover:bg-sky-100'
                              }`}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Insert Image */}
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold flex items-center space-x-1.5 shadow-2xs"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gambar</span>
              </button>

              {/* Insert KaTeX Equation */}
              <button
                type="button"
                onClick={() => setShowEquationModal(true)}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold flex items-center space-x-1.5 shadow-2xs"
              >
                <Sigma className="w-3.5 h-3.5 text-indigo-600" />
                <span>Rumus Matematika (KaTeX)</span>
              </button>

              {/* Insert Symbol */}
              <button
                type="button"
                onClick={() => setShowSymbolModal(true)}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold flex items-center space-x-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Simbol Khusus</span>
              </button>

              {/* Insert Link */}
              <button
                type="button"
                onClick={handleOpenLinkModal}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold flex items-center space-x-1.5 shadow-2xs"
              >
                <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Tautan (Link)</span>
              </button>

              {/* Unlink */}
              <button
                type="button"
                onClick={() => execCmd('unlink')}
                title="Hapus Tautan"
                className="p-1.5 rounded-md hover:bg-slate-200 text-slate-600"
              >
                <Unlink className="w-3.5 h-3.5" />
              </button>

              {/* Horizontal Divider */}
              <button
                type="button"
                onClick={handleInsertHR}
                className="px-2.5 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold flex items-center space-x-1.5 shadow-2xs"
              >
                <Minus className="w-3.5 h-3.5 text-slate-600" />
                <span>Garis Pemisah (HR)</span>
              </button>
            </>
          )}

          {/* TAB 3: TATA LETAK & GAYA (HEADINGS, LISTS, INDENT, QUOTE) */}
          {activeTab === 'tata_letak' && (
            <>
              {/* Headings */}
              <div className="flex items-center space-x-1 border-r border-slate-300 pr-2">
                <button
                  type="button"
                  onClick={() => handleFormatBlock('p')}
                  className="px-2 py-1 rounded-md bg-white border border-slate-300 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                >
                  Paragraf
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatBlock('h1')}
                  className="px-2 py-1 rounded-md bg-white border border-slate-300 text-[11px] font-black text-slate-800 hover:bg-slate-100 flex items-center space-x-1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                  <span>H1</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatBlock('h2')}
                  className="px-2 py-1 rounded-md bg-white border border-slate-300 text-[11px] font-black text-slate-800 hover:bg-slate-100 flex items-center space-x-1"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                  <span>H2</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatBlock('h3')}
                  className="px-2 py-1 rounded-md bg-white border border-slate-300 text-[11px] font-black text-slate-800 hover:bg-slate-100 flex items-center space-x-1"
                >
                  <Heading3 className="w-3.5 h-3.5" />
                  <span>H3</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatBlock('blockquote')}
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                  title="Kutipan (Blockquote)"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Lists */}
              <div className="flex items-center space-x-0.5 border-r border-slate-300 pr-2">
                <button
                  type="button"
                  onClick={() => execCmd('insertUnorderedList')}
                  title="Daftar Poin (Bullets)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('insertOrderedList')}
                  title="Daftar Nomor (Numbered List)"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Indentation */}
              <div className="flex items-center space-x-0.5 border-r border-slate-300 pr-2">
                <button
                  type="button"
                  onClick={() => execCmd('outdent')}
                  title="Kurangi Indentasi"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <Outdent className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('indent')}
                  title="Tambah Indentasi"
                  className="p-1.5 rounded-md hover:bg-slate-200 text-slate-700"
                >
                  <Indent className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Line Spacing Presets */}
              <div className="flex items-center space-x-1">
                <span className="text-[11px] text-slate-500 font-bold">Spasi Baris:</span>
                {[
                  { label: '1.0', lh: '1.25' },
                  { label: '1.15', lh: '1.4' },
                  { label: '1.5', lh: '1.75' },
                  { label: '2.0', lh: '2.25' }
                ].map((sp) => (
                  <button
                    key={sp.label}
                    type="button"
                    onClick={() => {
                      if (editorRef.current) {
                        editorRef.current.style.lineHeight = sp.lh;
                      }
                    }}
                    className="px-1.5 py-0.5 rounded bg-white border border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </>
          )}

        </div>
      )}

      {/* =====================================================================
          3. MAIN EDITOR CONTENT AREA (PERSISTENT DOM: KEDUA ELEMEN SELALU DI DOM)
      ===================================================================== */}
      <div className="flex-1 bg-white relative overflow-y-auto">
        <textarea
          ref={textareaRef}
          value={sourceCode}
          onChange={handleSourceChange}
          style={{ display: isSourceMode ? 'block' : 'none', minHeight }}
          className="w-full h-full p-4 font-mono text-xs text-slate-100 bg-slate-900 resize-none outline-none focus:ring-0 leading-relaxed"
          spellCheck={false}
        />
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning={true}
          onInput={handleEditorInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder={placeholder}
          style={{ display: isSourceMode ? 'none' : 'block', minHeight }}
          className="w-full p-6 outline-none text-xs sm:text-sm text-slate-800 leading-relaxed text-justify font-sans focus:outline-none min-h-[380px] prose prose-slate max-w-none [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-slate-400 [&:empty]:before:pointer-events-none"
        />
      </div>

      {/* =====================================================================
          4. BOTTOM STATUS BAR (METRICS & AUTO-SAVE INDICATOR)
      ===================================================================== */}
      <div className="bg-slate-100 border-t-2 border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-[11px] text-slate-600 font-medium">
        <div className="flex items-center space-x-4">
          <span className="font-bold text-slate-800">
            {wordCount} <span className="font-normal text-slate-500">Kata</span>
          </span>
          <span>•</span>
          <span>
            {charCount} <span className="text-slate-500">Karakter</span>
          </span>
          <span>•</span>
          <span>
            Estimasi baca: <strong className="text-sky-700 font-bold">{readTime} menit</strong>
          </span>
        </div>

        <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-[11px]">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tersimpan otomatis ({lastAutoSave})</span>
        </div>
      </div>

      {/* =====================================================================
          MODAL: INSERT HYPERLINK
      ===================================================================== */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border-2 border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                <LinkIcon className="w-4 h-4 text-sky-600" />
                <span>Sisipkan Tautan (Hyperlink)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teks Tampilan</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Contoh: Baca panduan selengkapnya di sini"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat URL Tautan <span className="text-rose-500">*</span></label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://kemdikbud.go.id/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  autoFocus
                />
              </div>

              <label className="flex items-center space-x-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={linkNewTab}
                  onChange={(e) => setLinkNewTab(e.target.checked)}
                  className="rounded text-sky-600"
                />
                <span className="text-slate-700 font-bold text-[11px]">Buka tautan di tab baru (target="_blank")</span>
              </label>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                disabled={!linkUrl}
                className="px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-black shadow-xs"
              >
                Terapkan Tautan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: INSERT IMAGE
      ===================================================================== */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border-2 border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span>Manajemen Gambar Terintegrasi</span>
              </h4>
              <button
                type="button"
                onClick={handleCloseImageModal}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Local upload file */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unggah Berkas Gambar Lokal (Kompresi Otomatis)</label>
                <div className="flex items-center space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLocalImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    disabled={isCompressingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-300 text-slate-800 font-bold flex items-center space-x-1.5"
                  >
                    {isCompressingImage ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        <span>Mengompres...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        <span>Pilih Berkas Foto</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-slate-500">Otomatis kompresi sisi klien (Maks 100 KB)</span>
                </div>
              </div>

              {/* Status Banner Kompresi */}
              {isCompressingImage && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                  <span>Mengompresi gambar otomatis agar hemat kuota server...</span>
                </div>
              )}

              {imageCompressionStats && !isCompressingImage && (
                <div className={`p-2.5 rounded-xl border ${
                  imageCompressionStats.exceedsLimit 
                    ? 'bg-rose-50 border-rose-200 text-rose-800' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span>
                      {imageCompressionStats.exceedsLimit 
                        ? '⚠️ Gambar Melebihi Batas 100 KB' 
                        : '✓ Kompresi Berhasil (Hemat Kuota)'}
                    </span>
                    <span className="text-[10px] bg-white/80 px-2 py-0.5 rounded-full border">
                      Hemat {imageCompressionStats.compressionRatioPercent}%
                    </span>
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5">
                    {imageCompressionStats.originalSizeKb} KB ➔ <strong>{imageCompressionStats.fileSizeKb} KB</strong> • {imageCompressionStats.width}×{imageCompressionStats.height}px
                  </div>
                </div>
              )}

              <div className="flex items-center my-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <div className="flex-1 border-t border-slate-200" />
                <span className="px-2">Atau Gunakan Tautan URL</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">URL Gambar Online</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Preview image */}
              {imageUrl && (
                <div className="p-2 border rounded-xl bg-slate-50 text-center max-h-40 overflow-hidden">
                  <img src={imageUrl} alt="Pratinjau" className="max-h-36 mx-auto rounded-lg object-contain" />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan Gambar (Caption / Sumber)</label>
                <input
                  type="text"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  placeholder="Contoh: Infografik Alur Asesmen Nasional (Sumber: Kemdikbudristek)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Perataan Gambar</label>
                  <select
                    value={imageAlign}
                    onChange={(e) => setImageAlign(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="center">Rata Tengah (Tengah)</option>
                    <option value="left">Rata Kiri</option>
                    <option value="right">Rata Kanan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ukuran Lebar Dimensi</label>
                  <select
                    value={imageWidth}
                    onChange={(e) => setImageWidth(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  >
                    <option value="w-full">Lebar Penuh (100%)</option>
                    <option value="w-3/4">Sedang (75%)</option>
                    <option value="w-1/2">Kompak (50%)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={handleCloseImageModal}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertImageUrl}
                disabled={!imageUrl || isCompressingImage || (imageCompressionStats?.exceedsLimit ?? false)}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-400 text-white text-xs font-black shadow-xs"
                title={imageCompressionStats?.exceedsLimit ? 'Gambar ditolak karena melebihi batas 100 KB' : 'Sematkan gambar'}
              >
                {imageCompressionStats?.exceedsLimit ? 'Gambar Melebihi 100 KB' : 'Sematkan Gambar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: INSERT EQUATION (KaTeX)
      ===================================================================== */}
      {showEquationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border-2 border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                <Sigma className="w-4 h-4 text-indigo-600" />
                <span>Penyusun Rumus Matematika (KaTeX / LaTeX)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowEquationModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Formula template shortcuts */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Templat Cepat Rumus</label>
                <div className="flex flex-wrap gap-1.5">
                  {LATEX_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.label}
                      type="button"
                      onClick={() => setEquationLatex(tmpl.code)}
                      className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold hover:bg-indigo-100"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sintaks Kode LaTeX</label>
                <textarea
                  rows={3}
                  value={equationLatex}
                  onChange={(e) => {
                    setEquationLatex(e.target.value);
                    setEquationPreviewError('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  placeholder="Contoh: \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                />
              </div>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={equationDisplayMode}
                  onChange={(e) => setEquationDisplayMode(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="text-slate-700 font-bold text-[11px]">
                  Mode Blok Mandiri (Display Mode - berada di baris tersendiri dan rata tengah)
                </span>
              </label>

              {/* Live Render Preview */}
              <div className="p-4 rounded-xl bg-slate-50 border-2 border-indigo-100 text-center min-h-[60px] flex items-center justify-center">
                {(() => {
                  try {
                    const html = katex.renderToString(equationLatex || '...', {
                      throwOnError: false,
                      displayMode: equationDisplayMode
                    });
                    return <div dangerouslySetInnerHTML={{ __html: html }} className="text-base" />;
                  } catch (err: any) {
                    return <span className="text-rose-500 font-bold text-xs">{err?.message}</span>;
                  }
                })()}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowEquationModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleInsertEquation}
                disabled={!equationLatex.trim()}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black shadow-xs"
              >
                Sematkan Rumus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: SPECIAL SYMBOL PALETTE
      ===================================================================== */}
      {showSymbolModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border-2 border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="text-xs font-black text-slate-900 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Palet Simbol Khusus & Tipografi</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowSymbolModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-8 gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
              {MATH_SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => {
                    handleInsertSymbol(sym);
                    setShowSymbolModal(false);
                  }}
                  className="w-9 h-9 rounded-lg bg-white border border-slate-300 hover:bg-amber-100 hover:border-amber-400 text-sm font-bold text-slate-800 transition-all flex items-center justify-center shadow-2xs"
                >
                  {sym}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t">
              <span>Klik simbol untuk langsung menyisipkan ke naskah</span>
              <button
                type="button"
                onClick={() => setShowSymbolModal(false)}
                className="px-3 py-1 rounded-lg border border-slate-300 font-bold text-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

WordRibbonEditor.displayName = 'WordRibbonEditor';

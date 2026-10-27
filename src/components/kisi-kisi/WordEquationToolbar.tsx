import React, { useState, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Superscript,
  Subscript,
  Sparkles,
  ChevronDown,
  Sigma,
  BookOpen,
  Image as ImageIcon,
  Camera,
  X,
  Sliders
} from 'lucide-react';
import { insertVisualFractionAtCursor } from '../common/VisualFormulaEditor';

interface WordEquationToolbarProps {
  onInsert: (snippet: string, wrap?: { before: string; after: string }) => void;
  onOpenFractionModal?: () => void;
  onOpenImageModal?: () => void;
  targetName?: string;
  onClose?: () => void;
  floating?: boolean;
}

export const WordEquationToolbar: React.FC<WordEquationToolbarProps> = ({
  onInsert,
  onOpenFractionModal,
  onOpenImageModal,
  targetName = 'Teks',
  onClose,
  floating = false,
}) => {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [showSymbolPalette, setShowSymbolPalette] = useState(false);
  const [showFormulaTemplates, setShowFormulaTemplates] = useState(false);
  const [showFractionMenu, setShowFractionMenu] = useState(false);
  const [showBulletMenu, setShowBulletMenu] = useState(false);
  const [showNumberMenu, setShowNumberMenu] = useState(false);
  const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);

  // Helper untuk mencari elemen editor yang ditargetkan toolbar ini
  const getTargetEditor = (): HTMLElement | null => {
    const activeEl = document.activeElement as HTMLElement | null;
    return (
      activeEl?.closest('.visual-formula-editor') ||
      (activeEl?.classList.contains('visual-formula-editor') ? activeEl : null) ||
      toolbarRef.current?.parentElement?.querySelector('.visual-formula-editor') ||
      activeEl?.closest('.border')?.querySelector('.visual-formula-editor') ||
      (document.querySelector('.visual-formula-editor:focus') as HTMLElement | null) ||
      (document.querySelector('.visual-formula-editor') as HTMLElement | null)
    ) as HTMLElement | null;
  };

  // Helper untuk menyisipkan pecahan MS Word ke editor aktif secara langsung di posisi kursor
  const handleInsertFraction = (num: string = '', den: string = '') => {
    const targetEditor = getTargetEditor();

    if (targetEditor) {
      insertVisualFractionAtCursor(num, den, targetEditor);
    } else {
      onInsert(num || den ? `$\\frac{${num || '1'}}{${den || '2'}}$` : '$\\frac{1}{2}$');
    }
    setShowFractionMenu(false);
  };

  // Handler untuk Daftar Butir & Penomoran (Bullets and Numbering)
  const applyList = (type: 'ul' | 'ol', styleType?: string) => {
    const editor = getTargetEditor();
    if (editor) {
      editor.focus();
      const cmd = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
      if (styleType === 'none') {
        document.execCommand(cmd, false, undefined);
      } else {
        document.execCommand(cmd, false, undefined);
        if (styleType) {
          const sel = window.getSelection();
          if (sel && sel.anchorNode) {
            const listEl = (sel.anchorNode.parentElement?.closest(type) as HTMLElement) || editor.querySelector(type);
            if (listEl) {
              listEl.style.listStyleType = styleType;
            }
          }
        }
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      onInsert(type === 'ul' ? '\n- ' : '\n1. ');
    }
    setShowBulletMenu(false);
    setShowNumberMenu(false);
  };

  // Handler untuk Jarak Spasi Baris & Paragraf (Line Spacing)
  const applyLineSpacing = (spacing: string) => {
    const editor = getTargetEditor();
    if (editor) {
      editor.focus();
      editor.style.lineHeight = spacing;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    setShowLineSpacingMenu(false);
  };

  const mathSymbols = [
    { label: '×', insert: '×', title: 'Kali (Multiplication)' },
    { label: '÷', insert: '÷', title: 'Bagi (Division)' },
    { label: '±', insert: '±', title: 'Plus Minus' },
    { label: '≤', insert: '≤', title: 'Kurang Dari atau Sama Dengan' },
    { label: '≥', insert: '≥', title: 'Lebih Dari atau Sama Dengan' },
    { label: '≠', insert: '≠', title: 'Tidak Sama Dengan' },
    { label: '≈', insert: '≈', title: 'Mendekati / Kira-kira' },
    { label: 'π', insert: 'π', title: 'Pi (3.14 / 22/7)' },
    { label: '°', insert: '°', title: 'Derajat (Suhu / Sudut)' },
    { label: '%', insert: '%', title: 'Persen' },
    { label: '∞', insert: '∞', title: 'Tak Hingga' },
    { label: '∠', insert: '∠', title: 'Sudut' },
    { label: 'Δ', insert: 'Δ', title: 'Delta / Selisih' },
    { label: '√', insert: '√', title: 'Akar Kuadrat' },
    { label: 'α', insert: 'α', title: 'Alpha' },
    { label: 'β', insert: 'β', title: 'Beta' },
    { label: 'θ', insert: 'θ', title: 'Theta' },
  ];

  const formulaTemplates = [
    { name: 'Teorema Pythagoras', template: 'a² + b² = c²', desc: 'Rumus segitiga siku-siku' },
    { name: 'Luas Persegi', template: 'L = s × s', desc: 'Sisi kali sisi' },
    { name: 'Luas Persegi Panjang', template: 'L = p × l', desc: 'Panjang kali lebar' },
    { name: 'Luas Lingkaran', template: 'L = π × r²', desc: 'Pi kali jari-jari kuadrat' },
    { name: 'Keliling Lingkaran', template: 'K = 2 × π × r', desc: 'Dua pi r' },
    { name: 'Volume Balok', template: 'V = p × l × t', desc: 'Panjang kali lebar kali tinggi' },
    { name: 'Kecepatan Rata-rata', template: 'v = s / t', desc: 'Jarak dibagi waktu' },
  ];

  const alignMap: Record<string, string> = {
    justifyLeft: 'left',
    justifyCenter: 'center',
    justifyRight: 'right',
    justifyFull: 'justify',
  };

  // MS Word-style formatting handler: Applies native execCommand to selected text without inserting BBCode text
  const applyWordCommand = (command: string, fallbackSnippet?: string, wrap?: { before: string; after: string }) => {
    const activeEl = document.activeElement as HTMLElement | null;
    const targetEditor = (activeEl?.closest('.visual-formula-editor') || 
      (activeEl?.classList.contains('visual-formula-editor') ? activeEl : null)) as HTMLElement | null;

    // JIKA PERINTAH PERATAAN (Align Left, Center, Right, Justify):
    // Jangan gunakan execCommand browser yang memecah elemen pecahan inline menjadi baris-baris terpisah!
    // Sebaliknya, terapkan langsung style text-align pada targetEditor secara utuh.
    if (alignMap[command]) {
      const alignment = alignMap[command];
      const editor = targetEditor || (document.querySelector('.visual-formula-editor:focus') as HTMLElement | null) ||
        (document.querySelector('.visual-formula-editor') as HTMLElement | null);
      if (editor) {
        editor.style.textAlign = alignment;
        editor.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        onInsert('', { before: `[${alignment}]`, after: `[/${alignment}]` });
      }
      return;
    }

    const isContentEditable = activeEl && (
      activeEl.getAttribute('contenteditable') === 'true' || 
      activeEl.classList.contains('visual-formula-editor') ||
      Boolean(activeEl.closest('.visual-formula-editor'))
    );

    if (isContentEditable) {
      document.execCommand(command, false, undefined);
      const editor = activeEl.closest('.visual-formula-editor') || activeEl;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      if (fallbackSnippet || wrap) {
        onInsert(fallbackSnippet || '', wrap);
      } else {
        document.execCommand(command, false, undefined);
        if (activeEl) {
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  };

  return (
    <div 
      ref={toolbarRef}
      className={`select-none transition-all duration-200 ${
        floating
          ? 'sticky top-1 mb-3 bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 shadow-2xl rounded-2xl p-2 z-40 animate-scale-up'
          : 'bg-slate-50/95 border-b border-slate-200 px-3 py-2 text-slate-800 rounded-t-2xl relative z-30'
      }`}
      onMouseDown={(e) => {
        // Prevent stealing focus from active editor
        if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'SELECT') {
          e.preventDefault();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        
        {/* Active Target Indicator Badge */}
        <div className={`px-2.5 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center space-x-1.5 ${
          floating 
            ? 'bg-brand-500/30 text-brand-300 border border-brand-400/40' 
            : 'bg-brand-50 border border-brand-200 text-brand-800 shadow-2xs'
        }`}>
          <Sparkles className="w-3 h-3 text-brand-600 animate-pulse" />
          <span>Editor: {targetName}</span>
        </div>

        {/* 1. Format Huruf (Word-Style: Blok Teks lalu Klik) */}
        <div className={`flex items-center space-x-0.5 p-0.5 rounded-xl border ${
          floating ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('bold', '', { before: '**', after: '**' }); }}
            className={`p-1.5 rounded-lg transition-colors font-bold ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Tebal (Bold) - Blok teks lalu klik"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('italic', '', { before: '*', after: '*' }); }}
            className={`p-1.5 rounded-lg transition-colors ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Miring (Italic) - Blok teks lalu klik"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('underline', '', { before: '<u>', after: '</u>' }); }}
            className={`p-1.5 rounded-lg transition-colors ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Garis Bawah (Underline) - Blok teks lalu klik"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('strikeThrough', '', { before: '~~', after: '~~' }); }}
            className={`p-1.5 rounded-lg transition-colors ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Coret (Strikethrough) - Blok teks lalu klik"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`h-5 w-px ${floating ? 'bg-slate-700' : 'bg-slate-300'}`} />

        {/* 2. Daftar & Tata Letak Paragraf (Word-Style: Bullets, Numbering, Line Spacing, & Alignment) */}
        <div className={`flex items-center space-x-1 p-0.5 rounded-xl border ${
          floating ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          {/* A. Bullets List (Daftar Butir) */}
          <div className="relative inline-flex items-center">
            <div className={`inline-flex items-center rounded-lg border ${floating ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200/80 bg-slate-50/50'}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyList('ul', 'disc');
                }}
                className={`p-1.5 rounded-l-lg transition-colors flex items-center ${
                  floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-200/70 text-slate-700'
                }`}
                title="Daftar Butir (Bullets) - Klik untuk membuat daftar berbutir"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle cx="4" cy="6" r="2.2" fill="#2563eb" />
                  <circle cx="4" cy="12" r="2.2" fill="#2563eb" />
                  <circle cx="4" cy="18" r="2.2" fill="#2563eb" />
                  <line x1="9" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  <line x1="9" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  <line x1="9" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowBulletMenu(!showBulletMenu);
                  setShowNumberMenu(false);
                  setShowLineSpacingMenu(false);
                  setShowFractionMenu(false);
                  setShowSymbolPalette(false);
                  setShowFormulaTemplates(false);
                }}
                className={`px-1 py-1.5 rounded-r-lg border-l transition-colors ${
                  floating ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-200/70 text-slate-600'
                }`}
                title="Pilihan Format Butir (Bullets)"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>

            {showBulletMenu && (
              <div
                className="absolute left-0 top-full mt-1.5 z-50 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-xl p-1.5 w-48 animate-fade-in space-y-1 font-sans"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 tracking-wider border-b border-slate-100">
                  Format Butir (Bullets)
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyList('ul', 'disc'); }}
                  className="w-full flex items-center space-x-2.5 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <span className="text-base leading-none text-blue-600 font-bold">•</span>
                  <span className="font-medium">Bulat Penuh (Disc)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyList('ul', 'circle'); }}
                  className="w-full flex items-center space-x-2.5 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <span className="text-base leading-none text-blue-600 font-bold">○</span>
                  <span className="font-medium">Lingkaran (Circle)</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyList('ul', 'square'); }}
                  className="w-full flex items-center space-x-2.5 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <span className="text-sm leading-none text-blue-600 font-bold">■</span>
                  <span className="font-medium">Kotak (Square)</span>
                </button>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyList('ul', 'none'); }}
                    className="w-full flex items-center space-x-2 px-2 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                  >
                    <span>✕</span>
                    <span>Hapus Format Butir</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* B. Numbering List (Daftar Penomoran) */}
          <div className="relative inline-flex items-center">
            <div className={`inline-flex items-center rounded-lg border ${floating ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200/80 bg-slate-50/50'}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyList('ol', 'decimal');
                }}
                className={`p-1.5 rounded-l-lg transition-colors flex items-center ${
                  floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-200/70 text-slate-700'
                }`}
                title="Daftar Nomor (Numbering) - Klik untuk membuat daftar bernomor 1, 2, 3"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <text x="1" y="7" fontSize="7.5" fontWeight="900" fill="#2563eb" fontFamily="sans-serif">1.</text>
                  <line x1="10" y1="5.5" x2="21" y2="5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <text x="1" y="13.5" fontSize="7.5" fontWeight="900" fill="#2563eb" fontFamily="sans-serif">2.</text>
                  <line x1="10" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <text x="1" y="20.5" fontSize="7.5" fontWeight="900" fill="#2563eb" fontFamily="sans-serif">3.</text>
                  <line x1="10" y1="18.5" x2="21" y2="18.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowNumberMenu(!showNumberMenu);
                  setShowBulletMenu(false);
                  setShowLineSpacingMenu(false);
                  setShowFractionMenu(false);
                  setShowSymbolPalette(false);
                  setShowFormulaTemplates(false);
                }}
                className={`px-1 py-1.5 rounded-r-lg border-l transition-colors ${
                  floating ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-200/70 text-slate-600'
                }`}
                title="Pilihan Format Penomoran (Numbering)"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>

            {showNumberMenu && (
              <div
                className="absolute left-0 top-full mt-1.5 z-50 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-xl p-1.5 w-52 animate-fade-in space-y-1 font-sans"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 tracking-wider border-b border-slate-100">
                  Format Penomoran
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyList('ol', 'decimal'); }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <span className="font-bold text-blue-600 w-10">1. 2. 3.</span>
                  <span className="font-medium">Angka Biasa</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyList('ol', 'lower-alpha'); }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <span className="font-bold text-blue-600 w-10">a. b. c.</span>
                  <span className="font-medium">Huruf Kecil</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyList('ol', 'upper-alpha'); }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <span className="font-bold text-blue-600 w-10">A. B. C.</span>
                  <span className="font-medium">Huruf Kapital</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyList('ol', 'lower-roman'); }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <span className="font-bold text-blue-600 w-10">i. ii. iii.</span>
                  <span className="font-medium">Romawi Kecil</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applyList('ol', 'upper-roman'); }}
                  className="w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                >
                  <span className="font-bold text-blue-600 w-10">I. II. III.</span>
                  <span className="font-medium">Romawi Kapital</span>
                </button>
                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyList('ol', 'none'); }}
                    className="w-full flex items-center space-x-2 px-2 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                  >
                    <span>✕</span>
                    <span>Hapus Format Nomor</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* C. Line and Paragraph Spacing (Jarak Spasi Baris) */}
          <div className="relative inline-flex items-center">
            <div className={`inline-flex items-center rounded-lg border ${floating ? 'border-slate-700 bg-slate-800/80' : 'border-slate-200/80 bg-slate-50/50'}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowLineSpacingMenu(!showLineSpacingMenu);
                  setShowBulletMenu(false);
                  setShowNumberMenu(false);
                  setShowFractionMenu(false);
                  setShowSymbolPalette(false);
                  setShowFormulaTemplates(false);
                }}
                className={`p-1.5 rounded-l-lg transition-colors flex items-center ${
                  floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-200/70 text-slate-700'
                }`}
                title="Spasi Garis dan Paragraf (Line Spacing)"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  {/* Blue Vertical Double Arrow */}
                  <path d="M5 6L2.5 8.5M5 6L7.5 8.5M5 6V18M5 18L2.5 15.5M5 18L7.5 15.5" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Horizontal Lines */}
                  <line x1="11" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="11" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="11" y1="14" x2="22" y2="14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="11" y1="18" x2="22" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowLineSpacingMenu(!showLineSpacingMenu);
                  setShowBulletMenu(false);
                  setShowNumberMenu(false);
                  setShowFractionMenu(false);
                  setShowSymbolPalette(false);
                  setShowFormulaTemplates(false);
                }}
                className={`px-1 py-1.5 rounded-r-lg border-l transition-colors ${
                  floating ? 'border-slate-700 hover:bg-slate-700 text-slate-300' : 'border-slate-200 hover:bg-slate-200/70 text-slate-600'
                }`}
                title="Pilihan Jarak Spasi Baris"
              >
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>

            {showLineSpacingMenu && (
              <div
                className="absolute left-0 top-full mt-1.5 z-50 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-xl p-1.5 w-52 animate-fade-in space-y-1 font-sans"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1 tracking-wider border-b border-slate-100">
                  Jarak Baris (Line Spacing)
                </div>
                {[
                  { value: '1.0', label: '1.0', desc: 'Single / Rapat' },
                  { value: '1.15', label: '1.15', desc: 'Standar Word' },
                  { value: '1.5', label: '1.5', desc: '1.5 Baris (Standar Soal)' },
                  { value: '2.0', label: '2.0', desc: 'Double / Ganda' },
                  { value: '2.5', label: '2.5', desc: 'Ekstra Renggang' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyLineSpacing(opt.value); }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                  >
                    <span className="font-bold text-slate-900">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`h-4 w-px mx-0.5 ${floating ? 'bg-slate-700' : 'bg-slate-200'}`} />

          {/* D. Alignment Buttons (Perataan Paragraf) */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('justifyLeft'); }}
            className={`p-1.5 rounded-lg transition-colors ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Rata Kiri (Align Left) - Klik untuk meratakan paragraf ke kiri"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('justifyCenter'); }}
            className={`p-1.5 rounded-lg transition-colors ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Rata Tengah (Center) - Klik untuk meratakan ke tengah"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('justifyRight'); }}
            className={`p-1.5 rounded-lg transition-colors ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Rata Kanan (Align Right) - Klik untuk meratakan ke kanan"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('justifyFull'); }}
            className={`p-1.5 rounded-lg transition-colors ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Rata Kanan-Kiri (Justify) - Klik untuk meratakan penuh kanan-kiri"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`h-5 w-px ${floating ? 'bg-slate-700' : 'bg-slate-300'}`} />

        {/* 3. Equation Matematika Lengkap */}
        <div className={`flex items-center space-x-1 p-0.5 rounded-xl border ${
          floating ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          {/* Dropdown Pecahan MS Word Equation */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowFractionMenu(!showFractionMenu);
                setShowSymbolPalette(false);
                setShowFormulaTemplates(false);
                setShowBulletMenu(false);
                setShowNumberMenu(false);
                setShowLineSpacingMenu(false);
              }}
              className={`px-2.5 py-1 rounded-lg font-serif font-black flex items-center space-x-1.5 shadow-xs transition-all active:scale-95 ${
                showFractionMenu 
                  ? 'bg-amber-600 text-white ring-2 ring-amber-400' 
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
              title="Menu Pecahan MS Word Equation: Klik untuk memilih model pecahan atau langsung ketik angka di kotaknya"
            >
              <span className="text-sm font-black">½</span>
              <span className="text-[11px] font-sans font-bold">Pecahan</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {showFractionMenu && (
              <div 
                className="absolute left-0 top-full mt-2 z-50 bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-2xl p-3 w-80 animate-fade-in space-y-3 max-h-[420px] overflow-y-auto"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center space-x-1">
                    <span>Pecahan MS Word (Equation)</span>
                  </div>
                  <span className="text-[9px] text-slate-400">In-place Editable</span>
                </div>

                {/* 1. Model Struktur Pecahan MS Word */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    1. Pilih Struktur Pecahan:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    
                    {/* Model 1: Stacked Fraction (Pecahan Bertumpuk Kotak Putus-putus) */}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleInsertFraction('', '');
                      }}
                      className="p-2.5 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-50/70 bg-slate-50/50 flex flex-col items-center justify-center transition-all group text-center"
                      title="Sisipkan Pecahan Bertumpuk Kosong (Ketik angka langsung di kotaknya)"
                    >
                      <div className="flex flex-col items-center font-serif mb-1 group-hover:scale-105 transition-transform">
                        <span className="w-5 h-4 border border-dashed border-slate-500 rounded text-[10px] text-slate-400 flex items-center justify-center bg-white">▢</span>
                        <span className="w-6 border-b-2 border-slate-900 my-0.5"></span>
                        <span className="w-5 h-4 border border-dashed border-slate-500 rounded text-[10px] text-slate-400 flex items-center justify-center bg-white">▢</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 group-hover:text-amber-900 leading-tight">Bertumpuk</span>
                      <span className="text-[9px] text-slate-400 leading-tight">Format Kotak ▢/▢</span>
                    </button>

                    {/* Model 2: Skewed Fraction (Pecahan Garis Miring) */}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onInsert('^{1}/_{2}');
                        setShowFractionMenu(false);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/60 bg-slate-50/50 flex flex-col items-center justify-center transition-all group text-center"
                      title="Sisipkan Pecahan Miring (Diagonal)"
                    >
                      <div className="font-serif text-sm font-bold text-slate-700 mb-1 group-hover:scale-105 transition-transform">
                        <sup>▢</sup>/<sub>▢</sub>
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 group-hover:text-blue-900 leading-tight">Miring (Skewed)</span>
                      <span className="text-[9px] text-slate-400 leading-tight">Diagonal Slash</span>
                    </button>

                    {/* Model 3: Linear Fraction (Pecahan Sejajar / Mendatar) */}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onInsert(' 1/2 ');
                        setShowFractionMenu(false);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 bg-slate-50/50 flex flex-col items-center justify-center transition-all group text-center"
                      title="Sisipkan Pecahan Sejajar (Linear)"
                    >
                      <div className="font-serif text-sm font-bold text-slate-700 mb-1 group-hover:scale-105 transition-transform">
                        ▢ / ▢
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 group-hover:text-emerald-900 leading-tight">Sejajar (Linear)</span>
                      <span className="text-[9px] text-slate-400 leading-tight">Teks Mendatar</span>
                    </button>

                    {/* Model 4: Kotak Dialog Preset Lengkap */}
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setShowFractionMenu(false);
                        if (onOpenFractionModal) onOpenFractionModal();
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-purple-400 hover:bg-purple-50/60 bg-slate-50/50 flex flex-col items-center justify-center transition-all group text-center"
                      title="Buka dialog lengkap dengan pratinjau interaktif"
                    >
                      <Sliders className="w-5 h-5 text-purple-600 mb-1 group-hover:scale-105 transition-transform" />
                      <span className="text-[11px] font-bold text-slate-800 group-hover:text-purple-900 leading-tight">Kotak Dialog</span>
                      <span className="text-[9px] text-slate-400 leading-tight">Preset Lengkap</span>
                    </button>

                  </div>
                </div>

                {/* 2. Pecahan Cepat Siap Pakai (In-place Editable) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      2. Pecahan Cepat (Bisa Diedit):
                    </span>
                    <span className="text-[9px] text-amber-700 font-medium">Klik angka untuk edit</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      ['1', '2'], ['1', '3'], ['1', '4'], ['2', '3'], ['3', '4'], ['1', '5'], ['2', '5'],
                      ['3', '5'], ['4', '5'], ['1', '8'], ['1', '10'], ['2', '10'], ['3', '10'], ['7', '10']
                    ].map(([num, den], idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleInsertFraction(num, den);
                        }}
                        className="py-1 px-1 rounded-lg border border-slate-200 hover:border-amber-400 hover:bg-amber-50 text-slate-800 font-serif font-bold text-xs flex flex-col items-center transition-all active:scale-95"
                        title={`Sisipkan pecahan ${num}/${den} (Bisa langsung diedit)`}
                      >
                        <span className="leading-none text-[10px]">{num}</span>
                        <span className="border-t border-current w-3 my-0.5"></span>
                        <span className="leading-none text-[10px]">{den}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Tombol Pangkat */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('superscript', '', { before: '^{', after: '}' }); }}
            className={`px-2 py-1 rounded-lg font-serif font-bold flex items-center space-x-1 ${
              floating ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30' : 'hover:bg-blue-50 text-blue-900 border border-blue-200'
            }`}
            title="Sisipkan Pangkat (Superscript): Blok angka lalu klik atau klik untuk mulai mengetik pangkat"
          >
            <Superscript className="w-3.5 h-3.5" />
            <span className="text-[10px] font-sans font-bold">Pangkat</span>
          </button>

          {/* Tombol Akar Kuadrat */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onInsert('', { before: '$\\sqrt{', after: '}$' }); }}
            className={`px-2 py-1 rounded-lg font-serif font-bold flex items-center space-x-1 ${
              floating ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30' : 'hover:bg-emerald-50 text-emerald-900 border border-emerald-200'
            }`}
            title="Sisipkan Akar Kuadrat: √x"
          >
            <span className="text-xs">√x</span>
            <span className="text-[10px] font-sans font-bold">Akar</span>
          </button>

          {/* Tombol Akar-n */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onInsert('', { before: '$\\sqrt[3]{', after: '}$' }); }}
            className={`px-2 py-1 rounded-lg font-serif font-bold flex items-center space-x-1 ${
              floating ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30' : 'hover:bg-purple-50 text-purple-900 border border-purple-200'
            }`}
            title="Sisipkan Akar Pangkat-n: ⁿ√x"
          >
            <span className="text-xs">∛x</span>
          </button>

          {/* Subscript */}
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyWordCommand('subscript', '', { before: '_{', after: '}' }); }}
            className={`p-1.5 rounded-lg transition-colors ${
              floating ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
            }`}
            title="Sisipkan Indeks Bawah (Subscript): Blok teks lalu klik"
          >
            <Subscript className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4. Simbol Matematika Populer Dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowSymbolPalette(!showSymbolPalette);
              setShowFormulaTemplates(false);
              setShowFractionMenu(false);
              setShowBulletMenu(false);
              setShowNumberMenu(false);
              setShowLineSpacingMenu(false);
            }}
            className={`px-2.5 py-1 rounded-xl border font-bold flex items-center space-x-1 transition-all ${
              showSymbolPalette 
                ? 'bg-brand-600 text-white border-brand-500' 
                : floating 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="Daftar Simbol Matematika (×, ÷, ±, ≤, ≥, π, °, dll.)"
          >
            <Sigma className="w-3.5 h-3.5" />
            <span>Simbol</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showSymbolPalette && (
            <div className="absolute left-0 top-full mt-2 z-50 bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-2xl p-3 w-64 animate-fade-in">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Klik Simbol Matematika:
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {mathSymbols.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onInsert(` ${item.insert} `);
                      setShowSymbolPalette(false);
                    }}
                    className="h-8 rounded-lg bg-slate-50 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 border border-slate-200 text-sm font-bold flex items-center justify-center transition-all"
                    title={item.title}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Template Rumus Populer */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowFormulaTemplates(!showFormulaTemplates);
              setShowSymbolPalette(false);
              setShowFractionMenu(false);
              setShowBulletMenu(false);
              setShowNumberMenu(false);
              setShowLineSpacingMenu(false);
            }}
            className={`px-2.5 py-1 rounded-xl border font-bold flex items-center space-x-1 transition-all ${
              showFormulaTemplates 
                ? 'bg-purple-600 text-white border-purple-500' 
                : floating 
                  ? 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-slate-700' 
                  : 'bg-white hover:bg-slate-50 text-purple-800 border-purple-300'
            }`}
            title="Koleksi Rumus Standar Pelajaran"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Rumus</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showFormulaTemplates && (
            <div className="absolute left-0 top-full mt-2 z-50 bg-white text-slate-900 border border-slate-300 rounded-2xl shadow-2xl p-3 w-72 animate-fade-in max-h-64 overflow-y-auto">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Template Formula Pelajaran:
              </div>
              <div className="space-y-1.5">
                {formulaTemplates.map((f, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onInsert(` ${f.template} `);
                      setShowFormulaTemplates(false);
                    }}
                    className="w-full text-left p-2 rounded-xl hover:bg-purple-50 hover:border-purple-200 border border-transparent transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 text-xs group-hover:text-purple-700">{f.name}</div>
                      <div className="text-[10px] text-slate-400">{f.desc}</div>
                    </div>
                    <span className="font-mono text-xs text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-lg font-semibold shrink-0">
                      {f.template}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={`h-5 w-px ${floating ? 'bg-slate-700' : 'bg-slate-300'}`} />

        {/* 6. Fitur Sisipkan Gambar (Ikon Kamera Ringkas & Elegan) */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            if (onOpenImageModal) onOpenImageModal();
          }}
          className="p-1.5 rounded-xl font-bold flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
          title="Sisipkan Gambar (Unggah / URL)"
        >
          <Camera className="w-3.5 h-3.5" />
        </button>

        {/* Close Button if floating */}
        {onClose && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onClose(); }}
            className={`p-1.5 ml-auto rounded-xl transition-colors ${
              floating ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-500'
            }`}
            title="Sembunyikan Toolbar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

      </div>
    </div>
  );
};

import React, { useMemo } from 'react';
import { autoHealBrokenText } from './VisualFormulaEditor';

interface RichMathTextProps {
  content: string;
  className?: string;
}

/**
 * RichMathText: Renderer teks cerdas yang mendukung:
 * 1. KaTeX Math Equations ($...$, $$...$$, \frac, \sqrt, pangkat, dll.)
 * 2. HTML text alignment (text-left, text-center, text-right, text-justify)
 * 3. Text formatting: bold (**), italic (*), underline (<u>), strikethrough (~~)
 * 4. Fallback visual matematika jika KaTeX belum siap
 */
export const RichMathText: React.FC<RichMathTextProps> = ({ content, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // 0. Auto-healing cerdas: satukan kembali baris-baris pecahan yang sempat terpecah
    let text = autoHealBrokenText(content);

    // 0. Auto-healing: Bersihkan bug angka penyebut duplikat yang tercecer tepat setelah pecahan KaTeX (misal $\frac{2}{10}$10 -> $\frac{2}{10}$)
    text = text.replace(/\$\\frac\{([^{}]+)\}\{([0-9a-zA-Z]+)\}\$\s*\2(?!\d)/g, '$\\frac{$1}{$2}$');
    text = text.replace(/\\frac\{([^{}]+)\}\{([0-9a-zA-Z]+)\}\s*\2(?!\d)/g, '\\frac{$1}{$2}');

    // 1. Process display math $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
      try {
        if (typeof window !== 'undefined' && (window as any).katex) {
          return `<div class="my-2.5 text-center overflow-x-auto py-1">${(window as any).katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
        }
      } catch (e) {}
      return `<div class="my-2 text-center font-mono bg-slate-100 p-2 rounded">${math}</div>`;
    });

    // 2. Process inline math $...$
    text = text.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
      try {
        if (typeof window !== 'undefined' && (window as any).katex) {
          return (window as any).katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
        }
      } catch (e) {}
      // Fallback: render clean readable math
      return `<span class="font-serif italic font-semibold px-0.5">${math}</span>`;
    });

    // 3. Process direct LaTeX formulas if not wrapped in $ (e.g. \frac{a}{b}, \sqrt{x})
    if (text.includes('\\frac') || text.includes('\\sqrt')) {
      try {
        if (typeof window !== 'undefined' && (window as any).katex) {
          text = text.replace(/(\\frac\{[^{}]+\}\{[^{}]+\})/g, (match) => {
            return (window as any).katex.renderToString(match, { displayMode: false, throwOnError: false });
          });
          text = text.replace(/(\\sqrt(?:\[[^{}]+\])?\{[^{}]+\})/g, (match) => {
            return (window as any).katex.renderToString(match, { displayMode: false, throwOnError: false });
          });
        }
      } catch (e) {}
    }

    // 4. Common Math Symbols Outside Math Delimiters
    text = text
      .replace(/\\times\b/g, '×')
      .replace(/\\div\b/g, '÷')
      .replace(/\\pm\b/g, '±')
      .replace(/\\le\b/g, '≤')
      .replace(/\\ge\b/g, '≥')
      .replace(/\\neq\b/g, '≠')
      .replace(/\\approx\b/g, '≈')
      .replace(/\\pi\b/g, 'π')
      .replace(/\\infty\b/g, '∞')
      .replace(/\\degree\b|\^\{\\circ\}/g, '°')
      .replace(/\\angle\b/g, '∠')
      .replace(/\\Delta\b/g, 'Δ');

    // 5. Fallback formatting for superscripts and subscripts (e.g. x^2, H_2O, cm^3)
    text = text.replace(/\^([0-9a-zA-Z\+\-]+|\{[^}]+\})/g, (_, exp) => {
      const clean = exp.replace(/[\{\}]/g, '');
      return `<sup>${clean}</sup>`;
    });
    text = text.replace(/_([0-9a-zA-Z\+\-]+|\{[^}]+\})/g, (_, sub) => {
      const clean = sub.replace(/[\{\}]/g, '');
      return `<sub>${clean}</sub>`;
    });

    // 6. Text Alignment & Line Spacing BBCode & HTML support
    text = text.replace(/\[spacing:([0-9.]+)\]([\s\S]*?)\[\/spacing\]/gi, '<div style="line-height: $1;" class="my-0.5">$2</div>');
    text = text.replace(/\[\/?spacing(?::[0-9.]+)?\]/gi, '');
    text = text.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div class="text-center my-1">$1</div>');
    text = text.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '<div class="text-right my-1">$1</div>');
    text = text.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '<div class="text-left my-1">$1</div>');
    text = text.replace(/\[justify\]([\s\S]*?)\[\/justify\]/gi, '<div class="text-justify my-1">$1</div>');

    // Bersihkan sisa tag alignment jika ada yang tidak berpasangan
    text = text.replace(/\[\/?(center|right|left|justify)\]/gi, '');

    // 7. Inline Markdown Images ![alt|width:120px|align:center](url)
    text = text.replace(/!\[(.*?)\]\((.*?)\)/g, (_, rawMeta, src) => {
      let alt = rawMeta || 'Gambar';
      let widthStyle = 'max-width: 100%;';
      let alignClass = 'text-center flex justify-center';

      if (rawMeta && rawMeta.includes('|')) {
        const parts = rawMeta.split('|');
        alt = parts[0] || 'Gambar';
        for (let i = 1; i < parts.length; i++) {
          const p = parts[i].trim().toLowerCase();
          if (p.startsWith('width:')) {
            const wVal = p.replace('width:', '').trim();
            if (wVal && wVal !== 'default' && wVal !== 'auto') {
              widthStyle = `width: ${wVal}; max-width: 100%;`;
            }
          } else if (p.startsWith('align:')) {
            const aVal = p.replace('align:', '').trim();
            if (aVal === 'left') alignClass = 'text-left flex justify-start';
            else if (aVal === 'right') alignClass = 'text-right flex justify-end';
            else if (aVal === 'float-left') alignClass = 'float-left mr-4 mb-2';
            else if (aVal === 'float-right') alignClass = 'float-right ml-4 mb-2';
            else alignClass = 'text-center flex justify-center';
          } else if (p === 'left' || p === 'right' || p === 'center') {
            if (p === 'left') alignClass = 'text-left flex justify-start';
            else if (p === 'right') alignClass = 'text-right flex justify-end';
            else alignClass = 'text-center flex justify-center';
          } else if (p.endsWith('px') || p.endsWith('%')) {
            widthStyle = `width: ${p}; max-width: 100%;`;
          }
        }
      }

      return `<div class="my-2.5 ${alignClass}"><div class="inline-block bg-white p-1 rounded-xl border border-slate-200 shadow-2xs" style="${widthStyle}"><img src="${src}" alt="${alt}" class="w-full h-auto object-contain rounded-lg" />${alt && alt !== 'Gambar' ? `<p class="text-[11px] text-slate-500 text-center italic mt-1">${alt}</p>` : ''}</div></div>`;
    });

    // 8. Basic Markdown Formatting (Bold, Italic, Underline, Strikethrough)
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/<u>(.*?)<\/u>/gi, '<u class="underline underline-offset-2">$1</u>');
    text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');
    
    // Convert remaining newlines to <br/> only when not directly following a div or list
    text = text.replace(/\n/g, '<br/>');
    text = text.replace(/<br\s*\/?>\s*(<\/?(?:ul|ol|li))/gi, '$1');
    text = text.replace(/(<\/?(?:ul|ol|li)[^>]*>)\s*<br\s*\/?>/gi, '$1');

    return text;
  }, [content]);

  return (
    <div 
      className={`rich-math-content font-serif text-slate-900 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

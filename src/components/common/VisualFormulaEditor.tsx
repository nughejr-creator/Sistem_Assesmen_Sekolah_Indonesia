import React, { useRef, useEffect } from 'react';

interface VisualFormulaEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  isSingleLine?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  editorRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Auto-healing cerdas: Menyatukan kembali teks, pecahan, dan tanda baca yang sempat terpotong
 * menjadi baris-baris terpisah akibat perintah perataan (justify) browser.
 */
export const autoHealBrokenText = (raw: string): string => {
  if (!raw) return '';
  let str = raw;

  // 1. Satukan kembali tag alignment bersebelahan yang sempat terpecah oleh browser
  str = str.replace(/\[\/justify\]\s*\[justify\]/gi, ' ');
  str = str.replace(/\[\/center\]\s*\[center\]/gi, ' ');
  str = str.replace(/\[\/right\]\s*\[right\]/gi, ' ');
  str = str.replace(/\[\/left\]\s*\[left\]/gi, ' ');

  // 1b. Bersihkan tag pembungkus spasi/alignment kosong tanpa teks yang bisa merusak layout
  str = str.replace(/\[(justify|center|right|left)\]\s*\[spacing:[0-9.]+\]\s*\[\/\1\]\s*\[\/spacing\]/gi, '');
  str = str.replace(/\[spacing:[0-9.]+\]\s*\[(justify|center|right|left)\]\s*\[\/spacing\]\s*\[\/\1\]/gi, '');
  str = str.replace(/\[(justify|center|right|left)\]\s*\[\/\1\]/gi, '');
  str = str.replace(/\[spacing:[0-9.]+\]\s*\[\/spacing\]/gi, '');

  // 1c. Normalisasi tag spacing jika nilainya tanpa tanda desimal (misal [spacing:115] -> [spacing:1.15])
  str = str.replace(/\[spacing:([0-9.]+)\]/gi, (_, val) => {
    let num = parseFloat(val);
    if (isNaN(num) || num <= 0) num = 1.15;
    if (num > 10) num = num / 100;
    if (num > 3) num = 3;
    if (num < 0.8) num = 1.0;
    return `[spacing:${num}]`;
  });

  // 2. Hilangkan baris baru sebelum tanda baca (koma, titik, titik dua, tanda tanya)
  str = str.replace(/\s*\n+\s*([,\.\?\!;\:])/g, '$1');

  // 3. Hilangkan baris baru artifisial tepat sebelum atau sesudah rumus matematika (pecahan, akar, pangkat, formula $)
  str = str.replace(/([^\n])\s*\n+\s*(\$\s*\\(?:frac|sqrt)[^$]*\$\s*)/g, '$1 $2');
  str = str.replace(/(\$\s*\\(?:frac|sqrt)[^$]*\$\s*)\s*\n+\s*([^\n])/g, '$1 $2');
  str = str.replace(/([^\n])\s*\n+\s*(\$[^\$\n]+?\$)/g, '$1 $2');
  str = str.replace(/(\$[^\$\n]+?\$)\s*\n+\s*([^\n])/g, '$1 $2');

  // 4. Bersihkan spasi sebelum koma atau titik
  str = str.replace(/\s+([,\.])/g, '$1');

  // 5. Bersihkan duplikat spasi horizontal
  str = str.replace(/[ \t]{2,}/g, ' ');

  return str;
};

/**
 * Konversi teks string (database/KaTeX format) ke visual HTML (WYSIWYG format)
 * Pecahan KaTeX $\frac{num}{den}$ diubah langsung menjadi elemen visual pecahan tumpuk!
 */
export const stringToVisualHtml = (text: string): string => {
  if (!text) return '';

  text = autoHealBrokenText(text);

  // 0. Auto-healing: bersihkan duplikat penyebut yang tercecer dari string input
  let html = text
    .replace(/\$\\frac\{([^{}]+)\}\{([0-9a-zA-Z]+)\}\$\s*\2(?!\d)/g, '$\\frac{$1}{$2}$')
    .replace(/\\frac\{([^{}]+)\}\{([0-9a-zA-Z]+)\}\s*\2(?!\d)/g, '\\frac{$1}{$2}');

  // 0. Ubah perataan teks (left, center, right, justify) dan line spacing menjadi elemen div visual
  html = html.replace(/\[spacing:([0-9.]+)\]([\s\S]*?)\[\/spacing\]/gi, (_, rawVal, content) => {
    let num = parseFloat(rawVal);
    if (isNaN(num) || num <= 0) num = 1.15;
    if (num > 10) num = num / 100;
    if (num > 3) num = 3;
    if (num < 0.8) num = 1.0;
    return `<div style="line-height: ${num};">${content}</div>`;
  });
  html = html.replace(/\[justify\]([\s\S]*?)\[\/justify\]/gi, '<div style="text-align: justify;">$1</div>');
  html = html.replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align: center;">$1</div>');
  html = html.replace(/\[right\]([\s\S]*?)\[\/right\]/gi, '<div style="text-align: right;">$1</div>');
  html = html.replace(/\[left\]([\s\S]*?)\[\/left\]/gi, '<div style="text-align: left;">$1</div>');

  // 1. Ubah rumus pecahan $\frac{a}{b}$ atau \frac{a}{b} menjadi pecahan visual tumpuk gaya MS Word Equation (In-place editable!)
  html = html.replace(/\$?(\\frac\{([^{}]+)\}\{([^{}]+)\})\$?|(\\frac\{([^{}]+)\}\{([^{}]+)\})/g, (_, _m1, num1, den1, _m2, num2, den2) => {
    const num = (num1 || num2 || '').trim();
    const den = (den1 || den2 || '').trim();
    return `<span class="ms-word-fraction inline-flex flex-col items-center align-middle mx-1 font-serif text-center bg-slate-50/90 hover:bg-amber-50/50 px-1 py-0.5 rounded-lg border border-slate-300 hover:border-amber-400 shadow-2xs select-none transition-colors" contenteditable="false" title="Pecahan MS Word: Klik kotak untuk mengedit angka"><span class="fraction-num inline-block min-w-[18px] min-h-[18px] px-1 text-center text-xs font-black text-slate-900 border border-dashed border-slate-400 hover:border-brand-500 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-400/40 rounded cursor-text select-text outline-none leading-none" contenteditable="true" data-placeholder="▢" spellcheck="false">${num}</span><span class="fraction-line w-full border-b-2 border-slate-900 my-0.5 pointer-events-none"></span><span class="fraction-den inline-block min-w-[18px] min-h-[18px] px-1 text-center text-xs font-black text-slate-900 border border-dashed border-slate-400 hover:border-brand-500 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-400/40 rounded cursor-text select-text outline-none leading-none" contenteditable="true" data-placeholder="▢" spellcheck="false">${den}</span></span> `;
  });

  // 2. Ubah pangkat ^{2} atau ^2 menjadi <sup>2</sup>
  html = html.replace(/\^\{?([0-9a-zA-Z\+\-]+)\}?/g, '<sup class="font-bold text-blue-700">$1</sup>');

  // 3. Ubah indeks bawah _{1} atau _1 menjadi <sub>1</sub>
  html = html.replace(/_\{?([0-9a-zA-Z\+\-]+)\}?/g, '<sub class="font-bold text-slate-700">$1</sub>');

  // 4. Ubah akar kuadrat $\sqrt{x}$ menjadi visual akar
  html = html.replace(/\$?(\\sqrt\{([^{}]+)\})\$?|(\\sqrt\{([^{}]+)\})/g, (_, _m1, val1, _m2, val2) => {
    const val = (val1 || val2 || '').trim();
    return `<span class="inline-root-pill inline-flex items-center align-middle mx-1 font-serif select-none bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-300 text-xs font-bold text-emerald-950" contenteditable="false">√<span class="border-t border-slate-900 px-1 ml-0.5">${val}</span></span>&nbsp;`;
  });

  // 5. Ubah akar-n $\sqrt[n]{x}$
  html = html.replace(/\$?(\\sqrt\[([^{}]+)\]\{([^{}]+)\})\$?|(\\sqrt\[([^{}]+)\]\{([^{}]+)\})/g, (_, _m1, n1, val1, _m2, n2, val2) => {
    const n = (n1 || n2 || '').trim();
    const val = (val1 || val2 || '').trim();
    return `<span class="inline-root-pill inline-flex items-center align-middle mx-1 font-serif select-none bg-purple-50 px-2 py-0.5 rounded-md border border-purple-300 text-xs font-bold text-purple-950" contenteditable="false"><sup>${n}</sup>√<span class="border-t border-slate-900 px-1 ml-0.5">${val}</span></span>&nbsp;`;
  });

  // 6. Ubah simbol matematika latex ke karakter visual unicode
  html = html
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\le\b/g, '≤')
    .replace(/\\ge\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\degree\b|\^\{\\circ\}/g, '°')
    .replace(/\\angle\b/g, '∠')
    .replace(/\\Delta\b/g, 'Δ');

  // 7. Ubah markdown text styles
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // 8. Ubah markdown image ![alt|width:120px|align:center](src) ke inline img dengan kontrol visual & perataan presisi
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (_, rawMeta, src) => {
    let alt = rawMeta || 'Gambar';
    let width = 'default';
    let align = 'center';

    if (rawMeta && rawMeta.includes('|')) {
      const parts = rawMeta.split('|');
      alt = parts[0] || 'Gambar';
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i].trim().toLowerCase();
        if (p.startsWith('width:')) width = p.replace('width:', '').trim();
        else if (p.startsWith('align:')) align = p.replace('align:', '').trim();
        else if (p === 'left' || p === 'right' || p === 'center') align = p;
        else if (p.endsWith('px') || p.endsWith('%')) width = p;
      }
    }

    const alignClass = align === 'left' ? 'text-left flex justify-start' : align === 'right' ? 'text-right flex justify-end' : 'text-center flex justify-center';
    const widthStyle = width && width !== 'default' && width !== 'auto' ? `width: ${width}; max-width: 100%;` : 'max-width: 100%;';

    return `<div class="visual-img-container my-2.5 select-all ${alignClass}" data-meta="${rawMeta}" contenteditable="false"><div class="inline-block relative bg-white p-1 rounded-xl border border-slate-300 shadow-2xs" style="${widthStyle}"><img src="${src}" alt="${alt}" data-raw-meta="${rawMeta}" class="w-full h-auto object-contain rounded-lg" /><div class="flex items-center justify-between text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded mt-1 font-sans"><span>${width !== 'default' ? width : 'Default'} • ${align === 'left' ? 'Kiri' : align === 'right' ? 'Kanan' : 'Tengah'}</span><button type="button" class="remove-img-btn text-rose-600 hover:text-rose-800 font-bold ml-2 cursor-pointer" onclick="this.closest('.visual-img-container').remove(); const ed = this.closest('.visual-formula-editor'); if(ed) ed.dispatchEvent(new Event('input', { bubbles: true }));">✕ Hapus</button></div></div></div>&nbsp;`;
  });

  // 9. Ubah newline ke <br> (dengan pembersihan otomatis di sekitar elemen list)
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/<br\s*\/?>\s*(<\/?(?:ul|ol|li))/gi, '$1');
  html = html.replace(/(<\/?(?:ul|ol|li)[^>]*>)\s*<br\s*\/?>/gi, '$1');

  return html;
};

/**
 * Konversi visual HTML (dari contenteditable editor) kembali ke string bersih untuk disimpan ke database
 */
export const visualHtmlToString = (html: string): string => {
  if (!html) return '';

  let str = html;

  // 1. DOM Element Traversal (Jika berjalan di browser):
  // Mengganti seluruh kontainer elemen pecahan & akar beserta child span-nya dengan TextNode KaTeX.
  // Ini mencegah bug di mana child span kedua (.fraction-den) tertinggal dan menjadi angka duplikat di luar pecahan!
  if (typeof document !== 'undefined') {
    try {
      const temp = document.createElement('div');
      temp.innerHTML = str;

      // Ganti seluruh elemen pecahan .ms-word-fraction, .inline-fraction-pill, atau yang memiliki data-num & data-den
      const fractionEls = temp.querySelectorAll('.ms-word-fraction, .inline-fraction-pill, span[data-num][data-den]');
      fractionEls.forEach(el => {
        const numEl = el.querySelector('.fraction-num');
        const denEl = el.querySelector('.fraction-den');
        // Prioritaskan textContent langsung dari kotak yang diedit guru secara in-place
        const num = (numEl ? (numEl.textContent || '') : (el.getAttribute('data-num') || '')).trim();
        const den = (denEl ? (denEl.textContent || '') : (el.getAttribute('data-den') || '')).trim();
        const finalNum = num || '1';
        const finalDen = den || '2';
        const textNode = document.createTextNode(`$\\frac{${finalNum}}{${finalDen}}$`);
        el.parentNode?.replaceChild(textNode, el);
      });

      // Ganti seluruh elemen akar .inline-root-pill
      const rootEls = temp.querySelectorAll('.inline-root-pill');
      rootEls.forEach(el => {
        const supEl = el.querySelector('sup');
        const n = supEl ? (supEl.textContent || '').trim() : '';
        const spans = el.querySelectorAll('span');
        let val = '';
        if (spans.length > 0) {
          val = (spans[spans.length - 1].textContent || '').trim();
        }
        const textNode = document.createTextNode(n ? `$\\sqrt[${n}]{${val}}$` : `$\\sqrt{${val}}$`);
        el.parentNode?.replaceChild(textNode, el);
      });

      str = temp.innerHTML;
    } catch (e) {
      console.warn('DOM processing visualHtmlToString error:', e);
    }
  }

  // 0. Ekstrak perataan teks & line-spacing dari style align / execCommand tanpa menyisipkan baris baru artifisial
  str = str.replace(/<(?:div|p)[^>]*(?:style="[^"]*text-align:\s*justify[^"]*"|align="justify")[^>]*>([\s\S]*?)<\/(?:div|p)>/gi, '[justify]$1[/justify]');
  str = str.replace(/<(?:div|p)[^>]*(?:style="[^"]*text-align:\s*center[^"]*"|align="center")[^>]*>([\s\S]*?)<\/(?:div|p)>/gi, '[center]$1[/center]');
  str = str.replace(/<(?:div|p)[^>]*(?:style="[^"]*text-align:\s*right[^"]*"|align="right")[^>]*>([\s\S]*?)<\/(?:div|p)>/gi, '[right]$1[/right]');
  str = str.replace(/<(?:div|p)[^>]*(?:style="[^"]*text-align:\s*left[^"]*"|align="left")[^>]*>([\s\S]*?)<\/(?:div|p)>/gi, '[left]$1[/left]');
  str = str.replace(/<(?:div|p)[^>]*style="[^"]*line-height:\s*([0-9.]+)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|p)>/gi, (_, rawVal, content) => {
    let num = parseFloat(rawVal);
    if (isNaN(num) || num <= 0) num = 1.15;
    if (num > 10) num = num / 100;
    if (num > 3) num = 3;
    if (num < 0.8) num = 1.0;
    return `[spacing:${num}]${content}[/spacing]`;
  });
  // Bersihkan jika ada nested duplicate [spacing:X][spacing:X]...[/spacing][/spacing]
  str = str.replace(/\[spacing:([0-9.]+)\]\s*\[spacing:\1\]([\s\S]*?)\[\/spacing\]\s*\[\/spacing\]/gi, '[spacing:$1]$2[/spacing]');
  // Bersihkan jika tag pembungkus kosong tanpa konten
  str = str.replace(/\[(justify|center|right|left)\]\s*\[spacing:[0-9.]+\]\s*\[\/\1\]\s*\[\/spacing\]/gi, '');
  str = str.replace(/\[spacing:[0-9.]+\]\s*\[(justify|center|right|left)\]\s*\[\/spacing\]\s*\[\/\1\]/gi, '');
  str = str.replace(/\[(justify|center|right|left)\]\s*\[\/\1\]/gi, '');
  str = str.replace(/\[spacing:[0-9.]+\]\s*\[\/spacing\]/gi, '');

  // Fallback Regex jika DOM tidak aktif atau ada sisa (mencakup elemen pecahan MS Word maupun legacy pill)
  str = str.replace(/<span[^>]*class="[^"]*ms-word-fraction[^"]*"[^>]*>[\s\S]*?<span[^>]*class="[^"]*fraction-num[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*fraction-den[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/span>/gi, '$\\frac{$1}{$2}$');
  str = str.replace(/<span[^>]*class="[^"]*inline-fraction-pill[^"]*"[^>]*data-num="([^"]+)"[^>]*data-den="([^"]+)"[^>]*>[\s\S]*?<\/span>\s*<\/span>\s*<\/span>/gi, '$\\frac{$1}{$2}$');
  str = str.replace(/<span[^>]*data-num="([^"]+)"[^>]*data-den="([^"]+)"[^>]*>[\s\S]*?<\/span>\s*<\/span>/gi, '$\\frac{$1}{$2}$');
  str = str.replace(/<span[^>]*data-num="([^"]+)"[^>]*data-den="([^"]+)"[^>]*>[\s\S]*?<\/span>/gi, '$\\frac{$1}{$2}$');

  // 2. Ekstrak visual akar fallback
  str = str.replace(/<span[^>]*class="[^"]*inline-root-pill[^"]*"[^>]*>.*?<sup>(.*?)<\/sup>√.*?<span[^>]*>(.*?)<\/span>.*?<\/span>/gi, '$\\sqrt[$1]{$2}$');
  str = str.replace(/<span[^>]*class="[^"]*inline-root-pill[^"]*"[^>]*>.*?√.*?<span[^>]*>(.*?)<\/span>.*?<\/span>/gi, '$\\sqrt{$1}$');

  // 3. Ekstrak <sup> dan <sub>
  str = str.replace(/<sup[^>]*>(.*?)<\/sup>/gi, '^{$1}');
  str = str.replace(/<sub[^>]*>(.*?)<\/sub>/gi, '_{$1}');

  // 4. Ekstrak formatting
  str = str.replace(/<(strong|b)>(.*?)<\/(strong|b)>/gi, '**$2**');
  str = str.replace(/<(em|i)>(.*?)<\/(em|i)>/gi, '*$2*');
  str = str.replace(/<(?:del|strike|s)>(.*?)<\/(?:del|strike|s)>/gi, '~~$1~~');
  str = str.replace(/<span[^>]*style="[^"]*text-decoration:\s*line-through[^"]*"[^>]*>(.*?)<\/span>/gi, '~~$1~~');
  str = str.replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>');
  str = str.replace(/<span[^>]*style="[^"]*text-decoration:\s*underline[^"]*"[^>]*>(.*?)<\/span>/gi, '<u>$1</u>');

  // 5. Ekstrak inline gambar beserta metadata width & align
  str = str.replace(/<div[^>]*class="[^"]*visual-img-container[^"]*"[^>]*data-meta="([^"]*)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/div>/gi, '\n\n![$1]($2)\n\n');
  str = str.replace(/<img[^>]*data-raw-meta="([^"]*)"[^>]*src="([^"]+)"[^>]*>/gi, '\n\n![$1]($2)\n\n');
  str = str.replace(/<img[^>]*src="([^"]+)"[^>]*data-raw-meta="([^"]*)"[^>]*>/gi, '\n\n![$2]($1)\n\n');
  str = str.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, '\n\n![$2]($1)\n\n');
  str = str.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]+)"[^>]*>/gi, '\n\n![$1]($2)\n\n');

  // 6. Ekstrak breaks & divs ke baris baru
  str = str.replace(/<br\s*\/?>/gi, '\n');
  str = str.replace(/<div>(.*?)<\/div>/gi, '\n$1');
  str = str.replace(/<p>(.*?)<\/p>/gi, '\n$1\n');

  // 7. Decode HTML entities
  str = str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  // 8. Bersihkan tag HTML lain yang tidak dibutuhkan (kecuali format yang didukung: u, img, ul, ol, li)
  str = str.replace(/<(?!\/?(u|img|ul|ol|li)\b)[^>]+>/gi, '');

  // 9. Auto-healing: Bersihkan jika masih ada angka penyebut yang tercecer tepat di samping pecahan KaTeX
  str = str.replace(/\$\\frac\{([^{}]+)\}\{([0-9a-zA-Z]+)\}\$\s*\2(?!\d)/g, '$\\frac{$1}{$2}$');

  // 10. Auto-healing: Satukan kembali teks dan pecahan yang terpecah
  str = autoHealBrokenText(str);

  return str.trim();
};

/**
 * Helper untuk menyisipkan pecahan visual langsung di posisi kursor gaya MS Word
 * Guru bisa langsung mengetik angka di kotak atas / bawah atau mengganti angka yang salah secara in-place
 */
export const insertVisualFractionAtCursor = (num: string = '', den: string = '', containerEl?: HTMLElement | null) => {
  const fractionHtml = `<span class="ms-word-fraction inline-flex flex-col items-center align-middle mx-1 font-serif text-center bg-slate-50/90 hover:bg-amber-50/50 px-1 py-0.5 rounded-lg border border-slate-300 hover:border-amber-400 shadow-2xs select-none transition-colors" contenteditable="false" title="Pecahan MS Word: Klik kotak untuk mengedit angka"><span class="fraction-num inline-block min-w-[18px] min-h-[18px] px-1 text-center text-xs font-black text-slate-900 border border-dashed border-slate-400 hover:border-brand-500 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-400/40 rounded cursor-text select-text outline-none leading-none" contenteditable="true" data-placeholder="▢" spellcheck="false">${num}</span><span class="fraction-line w-full border-b-2 border-slate-900 my-0.5 pointer-events-none"></span><span class="fraction-den inline-block min-w-[18px] min-h-[18px] px-1 text-center text-xs font-black text-slate-900 border border-dashed border-slate-400 hover:border-brand-500 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-400/40 rounded cursor-text select-text outline-none leading-none" contenteditable="true" data-placeholder="▢" spellcheck="false">${den}</span></span> `;

  const sel = window.getSelection();
  let insertedFractionNode: HTMLElement | null = null;

  if (sel && sel.rangeCount > 0 && containerEl && containerEl.contains(sel.anchorNode)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fractionHtml;
    const frag = document.createDocumentFragment();
    let node;
    let firstFraction: HTMLElement | null = null;
    while ((node = tempDiv.firstChild)) {
      if (!firstFraction && node instanceof HTMLElement && node.classList.contains('ms-word-fraction')) {
        firstFraction = node;
      }
      frag.appendChild(node);
    }
    insertedFractionNode = firstFraction;
    range.insertNode(frag);
    containerEl.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (containerEl) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fractionHtml;
    insertedFractionNode = tempDiv.querySelector('.ms-word-fraction');
    while (tempDiv.firstChild) {
      containerEl.appendChild(tempDiv.firstChild);
    }
    containerEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Fokuskan kursor keyboard langsung ke kotak pembilang (atau penyebut jika pembilang terisi)
  if (insertedFractionNode) {
    const targetSlot = (num ? insertedFractionNode.querySelector('.fraction-den') : insertedFractionNode.querySelector('.fraction-num')) as HTMLElement | null;
    if (targetSlot) {
      setTimeout(() => {
        targetSlot.focus();
        const s = window.getSelection();
        const r = document.createRange();
        r.selectNodeContents(targetSlot);
        s?.removeAllRanges();
        s?.addRange(r);
      }, 20);
    }
  }
};

/**
 * VisualFormulaEditor Component:
 * Editor teks interaktif di mana pecahan langsung tampil bertumpuk (bukan kode rumus $\frac$),
 * pangkat langsung tampil di atas, dan akar langsung tampil sebagai simbol akar!
 * Mendukung in-place editing pecahan ala Microsoft Word Equation.
 */
export const VisualFormulaEditor: React.FC<VisualFormulaEditorProps> = ({
  value,
  onChange,
  placeholder = 'Ketik di sini...',
  className = '',
  minHeight = '80px',
  isSingleLine = false,
  onFocus,
  onBlur,
  editorRef,
}) => {
  const localRef = useRef<HTMLDivElement | null>(null);
  const divRef = editorRef || localRef;
  const isInternalUpdate = useRef(false);

  // Sync value from outside if not internally triggered
  useEffect(() => {
    if (!divRef.current) return;
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const currentStr = visualHtmlToString(divRef.current.innerHTML);
    if (currentStr !== value) {
      divRef.current.innerHTML = stringToVisualHtml(value);
      // Sinkronkan perataan teks langsung ke style editor
      if (value.includes('[justify]')) divRef.current.style.textAlign = 'justify';
      else if (value.includes('[center]')) divRef.current.style.textAlign = 'center';
      else if (value.includes('[right]')) divRef.current.style.textAlign = 'right';
      else if (value.includes('[left]')) divRef.current.style.textAlign = 'left';

      // Sinkronkan line-spacing langsung ke style editor dengan batas aman
      const spacingMatch = value.match(/\[spacing:([0-9.]+)\]/);
      if (spacingMatch && spacingMatch[1]) {
        let num = parseFloat(spacingMatch[1]);
        if (!isNaN(num) && num > 0) {
          if (num > 10) num = num / 100;
          if (num > 3) num = 3;
          if (num < 0.8) num = 1.0;
          divRef.current.style.lineHeight = num.toString();
        }
      } else {
        divRef.current.style.lineHeight = '1.5';
      }
    }
  }, [value, divRef]);

  const handleInput = () => {
    if (!divRef.current) return;
    isInternalUpdate.current = true;
    let rawHtml = divRef.current.innerHTML;
    // Sertakan alignment jika targetEditor memiliki text-align aktif
    const align = divRef.current.style.textAlign;
    if (align && align !== 'left' && align !== 'start') {
      rawHtml = `<div style="text-align: ${align};">${rawHtml}</div>`;
    }
    // Sertakan line-spacing jika editor memiliki line-height aktif
    const lineHeight = divRef.current.style.lineHeight;
    if (lineHeight && lineHeight !== 'normal' && lineHeight !== 'initial' && !rawHtml.includes(`line-height: ${lineHeight}`)) {
      let num = parseFloat(lineHeight);
      if (!isNaN(num) && num > 0) {
        if (num > 10) num = num / 100;
        if (num > 3) num = 3;
        if (num < 0.8) num = 1.0;
        rawHtml = `<div style="line-height: ${num};">${rawHtml}</div>`;
      }
    }
    const cleanStr = visualHtmlToString(rawHtml);
    onChange(cleanStr);
  };

  // Keyboard navigation MS Word Equation:
  // - Enter / Down Arrow / Tab dari Pembilang -> pindah ke Penyebut
  // - Up Arrow / Shift+Tab dari Penyebut -> kembali ke Pembilang
  // - Enter / Tab dari Penyebut -> keluar dari pecahan ke teks selanjutnya
  // - Backspace di kotak kosong -> hapus pecahan
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (target.classList.contains('fraction-num')) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        const parent = target.closest('.ms-word-fraction');
        const den = parent?.querySelector('.fraction-den') as HTMLElement | null;
        if (den) {
          den.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(den);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } else if (e.key === 'Backspace' && target.textContent?.trim() === '') {
        const parent = target.closest('.ms-word-fraction');
        if (parent) {
          e.preventDefault();
          parent.remove();
          handleInput();
        }
      }
    } else if (target.classList.contains('fraction-den')) {
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        const parent = target.closest('.ms-word-fraction');
        const num = parent?.querySelector('.fraction-num') as HTMLElement | null;
        if (num) {
          num.focus();
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(num);
          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        const parent = target.closest('.ms-word-fraction');
        if (parent) {
          const sel = window.getSelection();
          const range = document.createRange();
          range.setStartAfter(parent);
          range.collapse(true);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      } else if (e.key === 'Backspace' && target.textContent?.trim() === '') {
        const parent = target.closest('.ms-word-fraction');
        if (parent) {
          e.preventDefault();
          parent.remove();
          handleInput();
        }
      }
    } else if (isSingleLine && e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('fraction-num') || target.classList.contains('fraction-den')) {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }
  };

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onFocus={onFocus}
      onBlur={onBlur}
      style={{ minHeight: isSingleLine ? 'auto' : minHeight }}
      data-placeholder={placeholder}
      className={`visual-formula-editor p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white text-slate-900 leading-relaxed font-serif empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none select-text overflow-y-auto ${className}`}
    />
  );
};

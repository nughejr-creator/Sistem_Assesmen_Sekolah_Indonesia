/**
 * Helper komprehensif untuk normalisasi dan pencocokan nama mata pelajaran di SASI.
 * Menangani variasi penamaan Kurikulum Merdeka / K13, akronim, serta urutan kata:
 * - "IPAS (Ilmu Pengetahuan Alam dan Sosial)" vs "Ilmu Pengetahuan Alam dan Sosial (IPAS)" vs "IPAS"
 * - "Pendidikan Agama dan Budi Pekerti" vs "Pendidikan Agama Islam dan Budi Pekerti" vs "PAB" / "PAIBP"
 * - "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)" vs "PJOK"
 * - "Pendidikan Pancasila" vs "PPKN" / "Pendidikan Pancasila dan Kewarganegaraan"
 * - "Seni Rupa", "Seni Musik", "Seni Tari"
 * - Jenjang SMP: "IPA" vs "IPS" (tetap terpisah dan tidak tertukar dengan IPAS)
 */

export function normalizeSubjectName(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\(\)\-\/\,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getSubjectCanonicalKey(str?: string | null): string {
  const norm = normalizeSubjectName(str);
  if (!norm) return '';

  // 1. IPAS (SD) - Pastikan didahulukan sebelum IPA/IPS umum
  if (norm.includes('ipas') || (norm.includes('alam') && norm.includes('sosial'))) {
    return 'ipas';
  }

  // 2. IPA (SMP) - Khusus IPA murni, bukan IPAS
  if (/\bipa\b/.test(norm) || (norm.includes('alam') && !norm.includes('sosial'))) {
    return 'ipa_smp';
  }

  // 3. IPS (SMP) - Khusus IPS murni, bukan IPAS
  if (/\bips\b/.test(norm) || (!norm.includes('alam') && norm.includes('sosial'))) {
    return 'ips_smp';
  }

  // 4. Pendidikan Agama & Budi Pekerti (PAI / PAIBP / PAB)
  if (norm.includes('agama') || /\bpaibp\b/.test(norm) || /\bpab\b/.test(norm) || /\bpai\b/.test(norm)) {
    return 'agama';
  }

  // 5. PJOK / Olahraga
  if (norm.includes('pjok') || norm.includes('jasmani') || norm.includes('olahraga')) {
    return 'pjok';
  }

  // 6. Pendidikan Pancasila / PPKn
  if (norm.includes('pancasila') || norm.includes('ppkn') || norm.includes('kewarganegaraan')) {
    return 'pancasila';
  }

  // 7. Sub-bidang Seni
  if (norm.includes('seni rupa')) return 'seni_rupa';
  if (norm.includes('seni musik')) return 'seni_musik';
  if (norm.includes('seni tari')) return 'seni_tari';
  if (norm.includes('seni budaya') || norm.includes('seni dan budaya') || norm.includes('prakarya')) return 'seni_budaya';

  // 8. Bahasa
  if (norm.includes('sunda')) return 'bahasa_sunda';
  if (norm.includes('jawa')) return 'bahasa_jawa';
  if (norm.includes('inggris')) return 'bahasa_inggris';
  if (norm.includes('indonesia')) return 'bahasa_indonesia';
  if (norm.includes('muatan lokal') || norm.includes('mulok')) return 'muatan_lokal';

  // 9. Matematika & Informatika
  if (norm.includes('matematika') || /\bmat\b/.test(norm)) return 'matematika';
  if (norm.includes('informatika') || /\binf\b/.test(norm)) return 'informatika';

  return norm;
}

export function isSameSubject(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const rawA = a.toLowerCase().trim();
  const rawB = b.toLowerCase().trim();
  if (rawA === rawB) return true;

  const keyA = getSubjectCanonicalKey(a);
  const keyB = getSubjectKey(b);
  if (keyA && keyB && keyA === keyB) return true;

  // Substring check hanya jika panjang minimal 5 karakter (mencegah "ipa" match "ipas")
  if (rawA.length >= 5 && rawB.length >= 5) {
    if (rawA.includes(rawB) || rawB.includes(rawA)) return true;
  }

  // Token set overlap fallback (minimal 2 kata bermakna yang persis sama)
  const filterWords = (words: string[]) => words.filter(w => w.length > 2 && !['dan', 'untuk', 'pada', 'fase'].includes(w));
  const tokensA = new Set(filterWords(rawA.replace(/[^a-z0-9]/g, ' ').split(/\s+/)));
  const tokensB = new Set(filterWords(rawB.replace(/[^a-z0-9]/g, ' ').split(/\s+/)));

  if (tokensA.size > 0 && tokensB.size > 0) {
    let intersect = 0;
    tokensA.forEach(t => { if (tokensB.has(t)) intersect++; });
    if (intersect === Math.min(tokensA.size, tokensB.size) && intersect >= 2) {
      return true;
    }
  }

  return false;
}

const getSubjectKey = getSubjectCanonicalKey;

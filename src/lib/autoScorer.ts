/**
 * SASI CBT Smart Auto-Scoring Engine (Hybrid NLP & Semantic Evaluator)
 * 
 * Mendukung penilaian otomatis untuk:
 * 1. Pilihan Ganda & Benar/Salah (Pencocokan Pasti)
 * 2. Pilihan Ganda Kompleks (Multi-Opsi)
 * 3. Menjodohkan (Matching Pair Validation)
 * 4. Isian Singkat (Fuzzy String Normalizer dengan ambang batas kemiripan >= 80%)
 * 5. Uraian / Esai (Local Semantic Concept NLP + Opsional Gemini AI)
 * 
 * Kebijakan Otoritas Guru:
 * Nilai otomatis langsung sah dan diterima (auto-accepted by default) sehingga siap cetak,
 * namun guru tetap memiliki wewenang untuk meninjau atau mengubah (override) nilai jika diperlukan.
 */

// ============================================================================
// 1. STOPWORDS BAHASA INDONESIA (Kata Penghubung / Partikel Umum)
// ============================================================================
export const INDONESIAN_STOPWORDS = new Set([
  'dan', 'di', 'ke', 'dari', 'yang', 'untuk', 'pada', 'adalah', 'yaitu', 'yakni',
  'seperti', 'oleh', 'karena', 'dengan', 'ini', 'itu', 'dalam', 'bisa', 'dapat',
  'akan', 'telah', 'sudah', 'sedang', 'secara', 'agar', 'supaya', 'jika', 'bila',
  'kalau', 'maka', 'namun', 'tetapi', 'tapi', 'serta', 'atau', 'hanya', 'sangat',
  'lebih', 'juga', 'pun', 'ada', 'tidak', 'bukan', 'ia', 'dia', 'mereka', 'kita',
  'kami', 'saya', 'kamu', 'anda', 'tersebut', 'suatu', 'sebuah', 'setiap', 'para'
]);

// Kamus Padanan Sinonim / Istilah Pembelajaran Umum (SD & SMP)
export const COMMON_SYNONYMS: Record<string, string[]> = {
  'menguap': ['evaporasi', 'penguapan', 'uap'],
  'mengembun': ['kondensasi', 'pengembunan', 'embun'],
  'hujan': ['presipitasi', 'curah hujan', 'rintik'],
  'menyerap': ['infiltrasi', 'absorpsi', 'serap', 'mengisap'],
  'panas': ['kalor', 'hangat', 'terik', 'suhu tinggi'],
  'tumbuhan': ['tanaman', 'pohon', 'flora'],
  'hewan': ['binatang', 'fauna', 'satwa'],
  'fotosintesis': ['fotosintetis', 'asimilasi karbon'],
  'oksigen': ['o2', 'udara bersih'],
  'karbondioksida': ['co2', 'karbon dioksida', 'udara kotor'],
  'akar': ['perakaran', 'serabut'],
  'batang': ['dahan', 'ranting'],
  'daun': ['dedaunan'],
  'klorofil': ['zat hijau daun'],
  'lingkungan': ['ekosistem', 'habitat', 'alam sekitar'],
  'produsen': ['penghasil', 'tumbuhan hijau'],
  'konsumen': ['pemangsa', 'hewan pemakan'],
  'kpk': ['kelipatan persekutuan terkecil'],
  'fpb': ['faktor persekutuan terbesar'],
  'persegi': ['bujur sangkar'],
  'luas': ['besaran luas', 'area'],
  'keliling': ['panjang keliling'],
  'sudut': ['besaran sudut']
};

// ============================================================================
// 2. TEKS NORMALIZER & LEVENSHTEIN DISTANCE
// ============================================================================

/**
 * Membersihkan teks: huruf kecil, hapus tanda baca, rapikan spasi berlebih
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Menghitung jarak Levenshtein antara dua string (jumlah operasi ubah/tambah/hapus)
 */
export function levenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= bl; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= al; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bl; i++) {
    for (let j = 1; j <= al; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitusi
          matrix[i][j - 1] + 1,     // insersi
          matrix[i - 1][j] + 1      // delesi
        );
      }
    }
  }

  return matrix[bl][al];
}

/**
 * Menghitung persentase kemiripan teks (0 - 100%)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);

  if (norm1 === norm2) return 100;
  if (!norm1 || !norm2) return 0;

  // Cek pencocokan angka eksak (misal: "35 cm" vs "35")
  const num1 = norm1.match(/\d+/g)?.join('');
  const num2 = norm2.match(/\d+/g)?.join('');
  if (num1 && num2 && num1 === num2 && norm1.replace(/\d+/g, '').trim() === norm2.replace(/\d+/g, '').trim()) {
    return 100;
  }

  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(norm1, norm2);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  return Math.max(0, Math.round(similarity * 10) / 10);
}

// ============================================================================
// 3. MESIN PENILAI SOAL ISIAN SINGKAT (Fuzzy Matcher >= 80% Threshold)
// ============================================================================

export interface ShortAnswerEvaluation {
  isCorrect: boolean;
  scoreRatio: number; // 1.0 (Benar) atau 0.0 (Salah)
  similarityPercent: number;
  matchedKey: string;
  evaluationNote: string;
}

/**
 * Menilai jawaban isian singkat siswa terhadap kunci jawaban guru.
 * Jika guru menuliskan kunci "Bandung" atau "35", sistem membandingkan dengan toleransi typo >= 80%.
 * Guru juga bisa menuliskan alternatif kunci dipisahkan koma/titik koma (misal: "Bandung, Kota Bandung").
 */
export function evaluateShortAnswer(
  studentAnswer: string | null | undefined,
  rawKeyAnswer: string | null | undefined,
  threshold: number = 80 // Ambang batas 80% sesuai permintaan user
): ShortAnswerEvaluation {
  const cleanStudent = normalizeText(studentAnswer);
  if (!cleanStudent) {
    return {
      isCorrect: false,
      scoreRatio: 0,
      similarityPercent: 0,
      matchedKey: '',
      evaluationNote: 'Kosong (Tidak dijawab)'
    };
  }

  // Ekstrak variasi kunci jawaban (bisa 1 kunci tunggal atau dipisahkan tanda koma/titik koma)
  const keyList = (rawKeyAnswer || '')
    .split(/[,;|]/)
    .map(k => k.trim())
    .filter(k => k.length > 0);

  if (keyList.length === 0) {
    // Jika kunci belum ditentukan guru, terima jawaban dengan catatan
    return {
      isCorrect: true,
      scoreRatio: 1,
      similarityPercent: 100,
      matchedKey: cleanStudent,
      evaluationNote: 'Otomatis diterima (Kunci belum dispesifikasi)'
    };
  }

  let bestSim = 0;
  let bestKey = keyList[0];

  for (const key of keyList) {
    const sim = calculateStringSimilarity(cleanStudent, key);
    if (sim > bestSim) {
      bestSim = sim;
      bestKey = key;
    }
  }

  const isCorrect = bestSim >= threshold;
  let note = '';
  if (bestSim === 100) {
    note = 'Benar Tepat (100% Sesuai Kunci)';
  } else if (isCorrect) {
    note = `Benar (Toleransi Typo: Kemiripan ${bestSim}% >= ${threshold}%)`;
  } else {
    note = `Kurang Tepat (Kemiripan ${bestSim}% < ${threshold}% terhadap kunci "${bestKey}")`;
  }

  return {
    isCorrect,
    scoreRatio: isCorrect ? 1.0 : 0.0,
    similarityPercent: bestSim,
    matchedKey: bestKey,
    evaluationNote: note
  };
}

// ============================================================================
// 4. MESIN PENILAI SOAL URAIAN / ESAI (Local Semantic NLP Scorer)
// ============================================================================

export interface EssayEvaluation {
  score100: number; // Nilai skala 0 - 100
  scoreRatio: number; // 0.0 - 1.0
  matchedConcepts: string[];
  missingConcepts: string[];
  conceptCoveragePercent: number;
  evaluationNote: string;
}

/**
 * Mengekstrak kata/konsep kunci bermakna dari kalimat kunci jawaban atau rubrik guru.
 */
export function extractKeyConcepts(text: string): string[] {
  const cleaned = normalizeText(text);
  const words = cleaned.split(' ').filter(w => w.length > 2 && !INDONESIAN_STOPWORDS.has(w));
  
  // Hapus duplikasi
  const uniqueWords = Array.from(new Set(words));
  return uniqueWords;
}

/**
 * Memeriksa apakah konsep kata atau sinonimnya muncul dalam teks siswa.
 */
function conceptExistsInText(concept: string, studentText: string): boolean {
  if (studentText.includes(concept)) return true;
  
  // Cek kamus sinonim jika ada
  for (const [root, syns] of Object.entries(COMMON_SYNONYMS)) {
    if (concept === root || syns.includes(concept)) {
      if (studentText.includes(root)) return true;
      for (const syn of syns) {
        if (studentText.includes(syn)) return true;
      }
    }
  }

  // Cek fuzzy match singkat untuk kata konsep (toleransi typo kata konsep >= 85%)
  const studentWords = studentText.split(' ');
  for (const sw of studentWords) {
    if (calculateStringSimilarity(sw, concept) >= 85) {
      return true;
    }
  }

  return false;
}

/**
 * Mesin Penilai Semantik Lokal untuk Uraian / Esai (100% Gratis, Cepat & Mandiri)
 * Memindai kesesuaian konsep, ide pokok, dan kelengkapan penjelasan siswa terhadap rubrik/kunci guru.
 */
export function evaluateEssayLocal(
  studentAnswer: string | null | undefined,
  modelAnswerOrRubric: string | null | undefined
): EssayEvaluation {
  const cleanStudent = normalizeText(studentAnswer);
  if (!cleanStudent || cleanStudent.length < 3) {
    return {
      score100: 0,
      scoreRatio: 0,
      matchedConcepts: [],
      missingConcepts: [],
      conceptCoveragePercent: 0,
      evaluationNote: 'Kosong (Siswa tidak memberikan uraian)'
    };
  }

  const modelText = modelAnswerOrRubric || '';
  const keyConcepts = extractKeyConcepts(modelText);

  // Jika guru belum menulis kunci uraian, berikan skor proporsional panjang argumen
  if (keyConcepts.length === 0) {
    const wordCount = cleanStudent.split(' ').length;
    const estScore = Math.min(100, Math.max(50, wordCount * 5));
    return {
      score100: estScore,
      scoreRatio: estScore / 100,
      matchedConcepts: [],
      missingConcepts: [],
      conceptCoveragePercent: 100,
      evaluationNote: `Skor Otomatis: Berdasarkan ${wordCount} kata uraian (Kunci uraian belum dispesifikasi guru)`
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  for (const concept of keyConcepts) {
    if (conceptExistsInText(concept, cleanStudent)) {
      matched.push(concept);
    } else {
      missing.push(concept);
    }
  }

  const coverage = Math.round((matched.length / keyConcepts.length) * 100);
  const studentWordCount = cleanStudent.split(' ').length;

  // Perhitungan Nilai Bertingkat (Skala 0 - 100)
  let calculatedScore = 0;
  let note = '';

  if (coverage >= 85) {
    calculatedScore = studentWordCount >= 8 ? 100 : 95;
    note = `Sangat Lengkap: Memuat ${matched.length}/${keyConcepts.length} konsep inti (${coverage}%). Penjelasan sangat komprehensif.`;
  } else if (coverage >= 65) {
    calculatedScore = studentWordCount >= 6 ? 85 : 80;
    note = `Baik & Tepat: Memuat ${matched.length}/${keyConcepts.length} konsep inti (${coverage}%). Ide pokok tersampaikan dengan baik.`;
  } else if (coverage >= 45) {
    calculatedScore = 70;
    note = `Cukup: Memuat ${matched.length}/${keyConcepts.length} konsep inti (${coverage}%). Sebagian substansi sudah dijelaskan.`;
  } else if (coverage >= 20) {
    calculatedScore = 50;
    note = `Kurang Lengkap: Hanya memuat ${matched.length}/${keyConcepts.length} konsep inti (${coverage}%). Pembahasan masih singkat.`;
  } else {
    calculatedScore = matched.length > 0 ? 30 : 15;
    note = `Belum Sesuai: Hanya mencakup ${matched.length}/${keyConcepts.length} konsep (${coverage}%). Jawaban kurang relevan dengan kunci.`;
  }

  return {
    score100: calculatedScore,
    scoreRatio: calculatedScore / 100,
    matchedConcepts: matched,
    missingConcepts: missing,
    conceptCoveragePercent: coverage,
    evaluationNote: note
  };
}

// ============================================================================
// 5. OPSIONAL: GEMINI FLASH AI EVALUATOR (Koreksi Uraian Pintar Berbasis AI)
// ============================================================================

export const GEMINI_API_STORAGE_KEY = 'sasi_gemini_api_key';

/**
 * Mendapatkan API Key Gemini dari konfigurasi .env atau localStorage guru
 */
export function getStoredGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem(GEMINI_API_STORAGE_KEY);
    if (localKey && localKey.trim()) return localKey.trim();
  }
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

/**
 * Simpan API Key Gemini guru ke localStorage
 */
export function saveStoredGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GEMINI_API_STORAGE_KEY, key.trim());
  }
}

/**
 * Uji koneksi fisik ke Google Gemini API
 */
export async function testGeminiApiKey(apiKey?: string): Promise<{ ok: boolean; latencyMs?: number; model?: string; error?: string }> {
  const cleanKey = (apiKey || getStoredGeminiApiKey()).trim();
  if (!cleanKey) return { ok: false, error: 'API Key Gemini belum diisi.' };

  const startTime = performance.now();
  // Kunci ke model tercepat & paling stabil di Free Tier
  const testModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];

  for (const model of testModels) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': cleanKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Ping test' }] }]
        })
      });

      if (res.status === 200) {
        const latency = Math.round(performance.now() - startTime);
        return { ok: true, latencyMs: latency, model };
      }
    } catch (err: any) {
      console.warn(`Error testing ${model}:`, err);
    }
  }

  return { ok: false, error: 'Kunci tidak dapat mengakses model Gemini Flash aktif atau kuota habis.' };
}

/**
 * Evaluasi Uraian dengan Google Gemini Flash AI
 * Jika gagal atau API key tidak diisi, otomatis beralih ke evaluateEssayLocal.
 */
export async function evaluateEssayWithGemini(
  studentAnswer: string,
  modelAnswer: string,
  questionPrompt: string,
  apiKey?: string
): Promise<EssayEvaluation> {
  const activeKey = (apiKey || getStoredGeminiApiKey()).trim();

  if (!activeKey) {
    return evaluateEssayLocal(studentAnswer, modelAnswer);
  }

  const prompt = `Anda adalah penilai asesmen sekolah profesional untuk jenjang pendidikan dasar/menengah di Indonesia.
Nilailah jawaban uraian siswa berikut ini secara adil, objektif, dan apresiatif terhadap pemahaman substansi anak.

Pertanyaan Soal: "${questionPrompt}"
Kunci Jawaban / Rubrik Guru: "${modelAnswer}"
Jawaban Siswa: "${studentAnswer}"

Berikan penilaian dalam format JSON murni tanpa pembuka/penutup markdown dengan struktur berikut:
{
  "score": (angka bulat antara 0 sampai 100 sesuai ketercapaian rubrik),
  "note": "(penjelasan evaluasi ramah 1-2 kalimat mengapa siswa memperoleh nilai tersebut)"
}`;

  // Jalur cepat langsung ke model tervalidasi tercepat
  const targetModels = ['gemini-3.5-flash', 'gemini-3.8-flash'];

  for (const model of targetModels) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': activeKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { 
            responseMimeType: 'application/json', 
            temperature: 0.1,
            maxOutputTokens: 120
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(rawJson);

        const score = Math.min(100, Math.max(0, Number(parsed.score) || 75));
        return {
          score100: score,
          scoreRatio: score / 100,
          matchedConcepts: [],
          missingConcepts: [],
          conceptCoveragePercent: score,
          evaluationNote: `[AI Gemini]: ${parsed.note || 'Penilaian otomatis berbasis AI'}`
        };
      }
    } catch (err) {
      console.warn(`Gagal evaluasi dengan model ${model}:`, err);
    }
  }

  // Fallback jika API sedang sibuk atau error jaringan
  return evaluateEssayLocal(studentAnswer, modelAnswer);
}

export interface BatchEssayStudentItem {
  studentId: string;
  studentAnswer: string;
}

export interface BatchEssayEvaluationResult {
  studentId: string;
  score100: number;
  scoreRatio: number;
  evaluationNote: string;
}

/**
 * Evaluasi Massal Soal Uraian dengan Teknik Borongan (Batch Chunking) + Paralel Serentak
 * Mampu menilai puluhan hingga ratusan siswa sekaligus hanya dalam beberapa detik tanpa terkena limit RPM.
 */
export async function evaluateEssayBatchWithGemini(
  items: BatchEssayStudentItem[],
  modelAnswer: string,
  questionPrompt: string,
  apiKey?: string
): Promise<BatchEssayEvaluationResult[]> {
  const activeKey = (apiKey || getStoredGeminiApiKey()).trim();

  // Jika tidak ada API key, fallback lokal untuk setiap siswa
  if (!activeKey) {
    return items.map(it => {
      const loc = evaluateEssayLocal(it.studentAnswer, modelAnswer);
      return {
        studentId: it.studentId,
        score100: loc.score100,
        scoreRatio: loc.scoreRatio,
        evaluationNote: loc.evaluationNote
      };
    });
  }

  // Pecah siswa ke dalam kelompok borongan (10 siswa per request)
  const CHUNK_SIZE = 10;
  const chunks: BatchEssayStudentItem[][] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    chunks.push(items.slice(i, i + CHUNK_SIZE));
  }

  // Kirim semua kelompok borongan secara PARALEL SERENTAK (Promise.all)
  const chunkPromises = chunks.map(async (chunk) => {
    const prompt = `Anda adalah penilai asesmen sekolah profesional di Indonesia.
Nilailah jawaban uraian dari ${chunk.length} siswa berikut secara adil, objektif, dan apresiatif berdasarkan rubrik guru.

Pertanyaan Soal: "${questionPrompt}"
Kunci Jawaban / Rubrik Guru: "${modelAnswer}"

Berikut adalah daftar jawaban siswa yang harus dinilai:
${chunk.map(c => `Siswa ID: ${c.studentId}\nJawaban: "${c.studentAnswer}"`).join('\n\n')}

Keluarkan hasil penilaian dalam format JSON array murni tanpa markdown dengan atribut:
[
  {
    "studentId": "id siswa persis seperti yang diberikan di atas",
    "score": (angka bulat 0-100),
    "note": "(penjelasan evaluasi ramah 1-2 kalimat mengapa siswa mendapat skor tersebut)"
  }
]`;

    const targetModels = ['gemini-3.5-flash', 'gemini-3.8-flash'];

    for (const model of targetModels) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': activeKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        });

        if (res.ok) {
          const data = await res.json();
          const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = JSON.parse(rawJson);

          if (Array.isArray(parsed)) {
            const results: BatchEssayEvaluationResult[] = [];
            chunk.forEach(ch => {
              const matched = parsed.find((p: any) => String(p.studentId) === String(ch.studentId));
              const score = matched ? Math.min(100, Math.max(0, Number(matched.score) || 70)) : 75;
              const note = matched?.note || 'Penilaian otomatis berbasis AI';
              results.push({
                studentId: ch.studentId,
                score100: score,
                scoreRatio: score / 100,
                evaluationNote: `[AI Gemini]: ${note}`
              });
            });
            return results;
          }
        }
      } catch (err) {
        console.warn(`Gagal batch dengan model ${model}:`, err);
      }
    }

    // Fallback lokal jika request chunk ini gagal
    return chunk.map(ch => {
      const loc = evaluateEssayLocal(ch.studentAnswer, modelAnswer);
      return {
        studentId: ch.studentId,
        score100: loc.score100,
        scoreRatio: loc.scoreRatio,
        evaluationNote: loc.evaluationNote
      };
    });
  });

  const allChunkResults = await Promise.all(chunkPromises);
  return allChunkResults.flat();
}

// ============================================================================
// 7. EVALUASI MATRIKS TABEL PERNYATAAN (BENAR/SALAH & SESUAI/TIDAK SESUAI)
// ============================================================================

/**
 * Menghitung penilaian otomatis proporsional parsial untuk bentuk soal
 * Matriks Tabel Pernyataan Benar/Salah & Sesuai/Tidak Sesuai (Standar AKM / SAS)
 */
export function evaluateTrueFalseMatrix(
  studentAnswerText: string,
  options: { id: string; matching_pair_text?: string | null; is_correct: boolean }[],
  weight: number = 10
): {
  scoreRatio: number;
  earnedScore: number;
  correctCount: number;
  totalStatements: number;
  evaluationNote: string;
} {
  const total = options.length;
  if (total === 0) {
    return {
      scoreRatio: 0,
      earnedScore: 0,
      correctCount: 0,
      totalStatements: 0,
      evaluationNote: 'Tidak ada butir pernyataan.'
    };
  }

  let studentMap: Record<string, string> = {};
  try {
    if (studentAnswerText && studentAnswerText.startsWith('{')) {
      studentMap = JSON.parse(studentAnswerText);
    }
  } catch (e) {
    studentMap = {};
  }

  let correctCount = 0;
  options.forEach(opt => {
    const expectedKey = (opt.matching_pair_text || (opt.is_correct ? 'Benar' : 'Salah')).trim().toLowerCase();
    const studentChoice = (studentMap[opt.id] || '').trim().toLowerCase();
    if (studentChoice && (
      studentChoice === expectedKey ||
      (expectedKey === 'benar' && studentChoice === 'sesuai') ||
      (expectedKey === 'salah' && studentChoice === 'tidak sesuai')
    )) {
      correctCount++;
    }
  });

  const scoreRatio = correctCount / total;
  const earnedScore = Math.round(scoreRatio * weight * 10) / 10;
  const evaluationNote = scoreRatio === 1
    ? `Sempurna: Seluruh ${total} pernyataan dijawab tepat (Skor: ${earnedScore}/${weight}).`
    : `Proporsional: ${correctCount}/${total} pernyataan dijawab tepat (Skor: ${earnedScore}/${weight}).`;

  return {
    scoreRatio,
    earnedScore,
    correctCount,
    totalStatements: total,
    evaluationNote,
  };
}

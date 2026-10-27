import { supabase } from './supabase';
import { 
  PublicArticle, 
  TeachingResource, 
  TeacherContribution, 
  DeveloperProfile 
} from '../types/publicPortal';

// ==============================================================================
// SEED FALLBACK DATA (Untuk Preview Lokal & Kesiapan Offline)
// ==============================================================================

export const FALLBACK_DEVELOPER_PROFILE: DeveloperProfile = {
  id: 'dev-agi-hamdani',
  full_name: 'Agi Hamdani, M.Pd',
  title: 'Inisiator & Lead Architect Sistem Asesmen Sekolah Indonesia (SASI)',
  role_description: 'Pendidik Sekolah Dasar, Praktisi Evaluasi Pendidikan, dan Pengembang Sistem CBT Terdesentralisasi',
  bio: 'Berpengalaman lebih dari satu dekade dalam dunia pendidikan dasar dan pengembangan instrumen evaluasi pembelajaran. Menginisiasi platform SASI dan SASIPEDIA sebagai solusi asesmen berstandar nasional yang adil, mandiri, dan berpusat pada kemudahan guru serta peserta didik di seluruh Indonesia.',
  credentials: [
    'Magister Pendidikan (M.Pd) - Evaluasi & Kebijakan Pendidikan',
    'Sarjana Pendidikan Guru Sekolah Dasar (S.Pd)',
    'Sertifikasi Asesor Kompetensi & Penulis Butir Soal AKM',
    'Pengembang Arsitektur Sistem Asesmen CBT Sharding Sekolah'
  ],
  expertise: [
    'Penyusunan Kisi-Kisi & Kartu Soal Berstandar AKM/TKA',
    'Pengembangan Modul Ajar Berdiferensiasi & Pembelajaran Bermakna',
    'Evaluasi Butir Soal Berbasis Teori Respon Butir (IRT)',
    'Arsitektur Database Cloud & CBT Klaster Terdesentralisasi'
  ],
  email: 'agihamdani88@gmail.com',
  phone: '+6281234567890',
  social_links: {
    github: 'https://github.com/nughejr-creator',
    website: 'https://sasipedia.my.id'
  },
  avatar_url: '/sasipedia-icon.png',
  is_primary: true
};

export const FALLBACK_PUBLIC_ARTICLES: PublicArticle[] = [
  {
    id: 'art-1',
    slug: 'kaidah-penulisan-soal-asesmen-sekolah-sd',
    title: 'Kaidah Baku Penulisan Soal Asesmen Sekolah Tingkat Sekolah Dasar',
    excerpt: 'Panduan komprehensif bagi pendidik dalam merumuskan stimulus kontekstual, pokok soal bebas bias, dan opsi jawaban yang logis sesuai standar asesmen nasional.',
    content: `## Pendahuluan
Penulisan butir soal yang bermutu merupakan prasyarat utama dalam memperoleh data capaian kompetensi peserta didik yang valid dan reliabel. Pada jenjang Sekolah Dasar, butir soal harus memperhatikan perkembangan kognitif anak serta menggunakan bahasa yang lugas dan tidak menimbulkan penafsiran ganda.

### 1. Kaidah Materi
- Soal harus sesuai dengan indikator pencapaian kompetensi dalam kisi-kisi.
- Pilihan jawaban harus homogen dan logis ditinjau dari segi materi.
- Setiap butir soal harus mempunyai satu jawaban yang benar atau paling tepat.

### 2. Kaidah Konstruksi
- Pokok soal harus dirumuskan secara jelas dan tegas.
- Pokok soal tidak boleh memberi petunjuk ke arah jawaban yang benar.
- Pokok soal tidak boleh mengandung pernyataan yang bersifat negatif ganda.
- Pilihan jawaban tidak mengandung pernyataan "Semua pilihan jawaban di atas salah" atau sejenisnya.

### 3. Kaidah Bahasa
- Menggunakan bahasa yang sesuai dengan kaidah Bahasa Indonesia baku.
- Menggunakan bahasa yang komunikatif dan sesuai jenjang usia peserta didik.
- Pilihan jawaban tidak mengulang kata atau frase yang bukan merupakan satu kesatuan pengertian.`,
    category: 'Panduan Asesmen',
    author_name: 'Agi Hamdani, M.Pd',
    read_time: 6,
    views_count: 1420,
    is_published: true,
    published_at: '2026-10-25T08:00:00Z'
  },
  {
    id: 'art-2',
    slug: 'bedah-instrumen-akm-literasi-numerasi-fase-c',
    title: 'Bedah Tuntas Karakteristik Stimulus AKM Literasi dan Numerasi Fase C (Kelas 5-6 SD)',
    excerpt: 'Memahami anatomi stimulus teks informasi, teks sastra, serta konteks saintifik-sosial budaya dalam Asesmen Kompetensi Minimum.',
    content: `## Memahami Stimulus AKM
Berbeda dengan ujian konvensional yang kerap menguji hafalan rumus atau definisi semata, Asesmen Kompetensi Minimum (AKM) menakar daya nalar peserta didik dalam memproses informasi dan memecahkan persoalan dunia nyata.

### Karakteristik Stimulus Literasi Membaca
1. **Teks Informasi:** Menyajikan fakta, data grafis, atau infografik yang menuntut peserta didik menemukan informasi eksplisit, membuat inferensi, serta mengevaluasi kredibilitas teks.
2. **Teks Fiksi / Sastra:** Menggali refleksi emosional, amanat cerita, dan keterkaitan nilai-nilai karakter dengan kehidupan sehari-hari.

### Karakteristik Stimulus Numerasi
Numerasi berfokus pada penerapan konsep matematika (Bilangan, Aljabar, Geometri, Data & Ketidakpastian) dalam tiga domain konteks: Personal, Sosial Budaya, dan Saintifik.`,
    category: 'Bedah AKM',
    author_name: 'Agi Hamdani, M.Pd',
    read_time: 8,
    views_count: 980,
    is_published: true,
    published_at: '2026-10-26T09:30:00Z'
  },
  {
    id: 'art-3',
    slug: 'analisis-daya-beda-tingkat-kesukaran-soal',
    title: 'Teknik Analisis Kualitas Butir Soal: Menghitung Indeks Kesukaran dan Daya Beda',
    excerpt: 'Langkah praktis bagi guru dalam mengukur efektivitas butir soal sumatif guna membedakan siswa kelompok tinggi dan kelompok rendah.',
    content: `## Mengapa Analisis Butir Soal Diperlukan?
Setelah instrumen ujian diujikan kepada peserta didik, guru perlu mengevaluasi apakah butir soal yang dibuat berfungsi dengan baik atau perlu direvisi.

### 1. Tingkat Kesukaran (P)
Indeks kesukaran mengukur proporsi siswa yang menjawab benar:
- **0.00 - 0.30**: Kategori Sukar
- **0.31 - 0.70**: Kategori Sedang (Ideal)
- **0.71 - 1.00**: Kategori Mudah

### 2. Daya Beda (D)
Daya beda menunjukkan kemampuan butir soal membedakan siswa yang menguasai materi dengan yang belum menguasai:
- **D >= 0.40**: Sangat Baik
- **0.30 - 0.39**: Baik (Dapat digunakan tanpa revisi)
- **0.20 - 0.29**: Cukup (Perlu perbaikan redaksional)
- **D < 0.20**: Jelek (Harus diganti atau dibuang)`,
    category: 'Analisis Butir',
    author_name: 'Agi Hamdani, M.Pd',
    read_time: 7,
    views_count: 1150,
    is_published: true,
    published_at: '2026-10-27T10:15:00Z'
  }
];

export const FALLBACK_TEACHING_RESOURCES: TeachingResource[] = [
  {
    id: 'res-1',
    title: 'Format Baku Kisi-Kisi & Kartu Soal Sumatif Akhir Semester (SAS) SD',
    description: 'Template matriks kisi-kisi lengkap dengan sebaran indikator, level kognitif (L1-L3), dan format kartu soal siap cetak.',
    category: 'Kisi-Kisi & Kartu Soal',
    phase: 'Umum',
    grade_level: 'Semua Kelas',
    subject: 'Umum',
    file_type: 'DOCX',
    file_url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx',
    file_size: '1.2 MB',
    download_count: 840,
    is_active: true
  },
  {
    id: 'res-2',
    title: 'Rekap Administrasi Guru: Buku Nilai & Jurnal Harian Mengajar Otomatis',
    description: 'Spreadsheet XLSX terintegrasi dengan rumus rekap rata-rata formatif, sumatif lingkup materi, dan deskripsi rapor IKTP otomatis.',
    category: 'Administrasi Guru',
    phase: 'Umum',
    grade_level: 'Semua Kelas',
    subject: 'Umum',
    file_type: 'XLSX',
    file_url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/buku-nilai-jurnal-guru-otomatis.xlsx',
    file_size: '2.5 MB',
    download_count: 1250,
    is_active: true
  },
  {
    id: 'res-3',
    title: 'Paket LKPD Eksplorasi Sains IPAS Fase B (Kelas 4 SD)',
    description: 'Kumpulan 12 lembar aktivitas berbasis penemuan terbimbing (Guided Inquiry) materi wujud zat dan perubahan wujud energi.',
    category: 'LKPD',
    phase: 'Fase B',
    grade_level: 'Kelas 4',
    subject: 'IPAS',
    file_type: 'PDF',
    file_url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/lkpd/paket-lkpd-ipas-fase-b-kelas4.pdf',
    file_size: '3.8 MB',
    download_count: 670,
    is_active: true
  }
];

// ==============================================================================
// PUBLIC PORTAL DATA ACCESS FUNCTIONS
// ==============================================================================

/**
 * Mengambil daftar artikel wawasan publik dari Supabase (dengan fallback)
 */
export async function getPublicArticles(category?: string): Promise<PublicArticle[]> {
  try {
    let query = supabase
      .from('public_articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false });

    if (category && category !== 'Semua Kategori') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      if (category && category !== 'Semua Kategori') {
        return FALLBACK_PUBLIC_ARTICLES.filter(a => a.category === category);
      }
      return FALLBACK_PUBLIC_ARTICLES;
    }
    return data as PublicArticle[];
  } catch (err) {
    return FALLBACK_PUBLIC_ARTICLES;
  }
}

/**
 * Mengambil satu artikel berdasarkan slug unik
 */
export async function getArticleBySlug(slug: string): Promise<PublicArticle | null> {
  try {
    const { data, error } = await supabase
      .from('public_articles')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single();

    if (error || !data) {
      const fallback = FALLBACK_PUBLIC_ARTICLES.find(a => a.slug === slug);
      return fallback || null;
    }
    return data as PublicArticle;
  } catch (err) {
    const fallback = FALLBACK_PUBLIC_ARTICLES.find(a => a.slug === slug);
    return fallback || null;
  }
}

/**
 * Mengambil katalog perangkat ajar dan berkas unduhan
 */
export async function getTeachingResources(filter?: {
  category?: string;
  phase?: string;
  grade?: string;
}): Promise<TeachingResource[]> {
  try {
    let query = supabase
      .from('teaching_resources')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filter?.category && filter.category !== 'Semua Kategori') {
      query = query.eq('category', filter.category);
    }
    if (filter?.phase && filter.phase !== 'Semua Fase') {
      query = query.eq('phase', filter.phase);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      let filtered = [...FALLBACK_TEACHING_RESOURCES];
      if (filter?.category && filter.category !== 'Semua Kategori') {
        filtered = filtered.filter(r => r.category === filter.category);
      }
      if (filter?.phase && filter.phase !== 'Semua Fase') {
        filtered = filtered.filter(r => r.phase === filter.phase || r.phase === 'Umum');
      }
      return filtered;
    }
    return data as TeachingResource[];
  } catch (err) {
    return FALLBACK_TEACHING_RESOURCES;
  }
}

/**
 * Mengambil profil pengembang resmi untuk halaman E-E-A-T
 */
export async function getDeveloperProfile(): Promise<DeveloperProfile> {
  try {
    const { data, error } = await supabase
      .from('developer_profiles')
      .select('*')
      .eq('is_primary', true)
      .single();

    if (error || !data) {
      return FALLBACK_DEVELOPER_PROFILE;
    }
    return data as DeveloperProfile;
  } catch (err) {
    return FALLBACK_DEVELOPER_PROFILE;
  }
}

/**
 * Mengirimkan kontribusi karya guru ke antrean moderasi
 */
export async function submitTeacherContribution(contribution: Omit<TeacherContribution, 'id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; data?: TeacherContribution; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('teacher_contributions')
      .insert([contribution])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as TeacherContribution };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengirim karya' };
  }
}

/**
 * Mengunggah berkas fisik ke Supabase Storage bucket 'educational-resources'
 */
export async function uploadEducationalResourceFile(
  file: File, 
  path: string
): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
  try {
    const fileExt = file.name.split('.').pop();
    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const fullPath = `${path.replace(/^\/+|\/+$/g, '')}/${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('educational-resources')
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data } = supabase.storage
      .from('educational-resources')
      .getPublicUrl(fullPath);

    return { success: true, publicUrl: data.publicUrl };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal mengunggah berkas' };
  }
}

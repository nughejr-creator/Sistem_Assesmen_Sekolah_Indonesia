import { supabase } from './supabase';
import { 
  PublicArticle, 
  TeachingResource, 
  TeacherContribution, 
  DeveloperProfile,
  BlueprintMatrixRow 
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

---

### 1. Kaidah Materi (Content Validity)
- **Kesesuaian Indikator:** Butir soal harus mengukur indikator pencapaian kompetensi yang telah dirumuskan dalam kisi-kisi.
- **Homogenitas Opsi:** Pilihan jawaban (distractor) harus homogen dan logis ditinjau dari materi yang diujikan.
- **Ketunggalan Jawaban:** Setiap butir soal pilihan ganda hanya memiliki satu kunci jawaban yang benar atau paling tepat.
- **Bebas Bias Budaya & SARA:** Pokok soal tidak boleh merugikan kelompok suku, agama, ras, atau gender tertentu.

---

### 2. Kaidah Konstruksi (Structural Rules)
- **Ketegasan Pokok Soal:** Pokok soal (stem) dirumuskan dengan jelas, ringkas, dan tidak mengandung kalimat pengantar yang tidak perlu.
- **Bebas Petunjuk Kunci:** Pokok soal tidak boleh secara terselubung memberi petunjuk (*clue*) ke arah jawaban yang benar.
- **Hindari Negatif Ganda:** Hindari penggunaan kata seperti *"tidak"*, *"bukan"*, atau *"kecuali"* jika memungkinkan. Jika terpaksa digunakan, kata tersebut wajib dicetak tebal (*bold*) atau diberi garis bawah.
- **Larangan Opsi Absolut:** Pilihan jawaban tidak boleh berbunyi *"Semua jawaban di atas benar"* atau *"Semua pilihan salah"* karena mengaburkan daya ukur butir soal.

---

### 3. Kaidah Bahasa & Komunikasi
- **Bahasa Baku & Ramah Anak:** Menggunakan kaidah Bahasa Indonesia yang baik dan benar dengan tingkat keterbacaan yang sesuai usia siswa SD.
- **Efisiensi Kata:** Pilihan jawaban tidak mengulang kata atau frase yang sama jika dapat ditarik ke dalam pokok soal.
- **Panjang Opsi Seimbang:** Panjang pilihan jawaban diupayakan relatif sama agar tidak memicu siswa menebak opsi terpanjang.`,
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
    excerpt: 'Memahami anatomi stimulus teks informasi, teks fiksi, serta konteks saintifik-sosial budaya dalam Asesmen Kompetensi Minimum.',
    content: `## Memahami Anatomi Stimulus AKM
Asesmen Kompetensi Minimum (AKM) menakar daya nalar peserta didik dalam memproses informasi dan memecahkan persoalan dunia nyata. Keberhasilan butir AKM 80% ditentukan oleh kualitas stimulus yang disajikan.

---

### Karakteristik Stimulus Literasi Membaca
1. **Teks Informasi (Expository):** 
   - Menyajikan fakta, tabel perbandingan, diagram alur, atau infografik ilmiah sederhana.
   - Menguji 3 level kognitif: Menemukan informasi (*Retrieve & Access*), Memahami dan menginterpretasi (*Interpret & Integrate*), serta Merefleksi & mengevaluasi pesan teks (*Evaluate & Reflect*).
2. **Teks Sastra / Fiksi:** 
   - Mengangkat narasi cerita rakyat, fabel bermakna budi pekerti, atau kisah inspiratif persahabatan anak.
   - Menggali pemahaman amanat implisit, karakter tokoh, dan sudut pandang pencerita.

---

### Karakteristik Stimulus Numerasi
Numerasi bukan sekadar berhitung cepat, melainkan bernalar matematis dalam tiga domain konteks:
- **Konteks Personal:** Berkaitan langsung dengan aktivitas harian anak (jadwal bermain, tabungan jajan, resep kue keluarga).
- **Konteks Sosial Budaya:** Tradisi pasar tradisional, kerajinan daerah, atau statistik kegiatan gotong royong warga desa.
- **Konteks Saintifik:** Pengukuran suhu cuaca, daur hidup serangga, atau kecepatan sepeda.`,
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
Setelah pelaksanaan asesmen sumatif (SAS atau SAT), guru perlu menganalisis instrumen ujian untuk mengetahui butir soal mana yang layak disimpan di bank soal, mana yang perlu direvisi redaksinya, dan mana yang harus digugurkan.

---

### 1. Tingkat Kesukaran (Facility Value - P)
Indeks kesukaran mengukur proporsi siswa yang menjawab benar terhadap total peserta:
- Rumus: P = B / N (B: Jumlah siswa menjawab benar, N: Total peserta).
- **0.00 s.d. 0.30**: Kategori Sukar (Periksa apakah materi belum diajarkan atau soal terlalu rumit).
- **0.31 s.d. 0.70**: Kategori Sedang (Ideal untuk bank soal ujian sekolah).
- **0.71 s.d. 1.00**: Kategori Mudah (Cocok untuk pertanyaan pemantik atau apersepsi).

---

### 2. Daya Pembeda (Discrimination Index - D)
Daya beda menunjukkan kemampuan butir soal membedakan siswa kelompok atas (pandai) dengan kelompok bawah:
- **D >= 0.40**: Sangat Baik (Butir soal sangat efektif).
- **0.30 s.d. 0.39**: Baik (Dapat langsung digunakan).
- **0.20 s.d. 0.29**: Cukup (Perlu perbaikan opsi pengecoh atau kejelasan kalimat).
- **D < 0.20**: Jelek / Negatif (Harus dibuang karena siswa pintar justru terkecoh).

---

### 3. Efektivitas Pengecoh (Distractor Function)
Pengecoh berfungsi baik jika dipilih oleh minimal **5%** peserta tes dari kelompok bawah dan lebih sedikit dipilih oleh kelompok atas.`,
    category: 'Analisis Butir',
    author_name: 'Agi Hamdani, M.Pd',
    read_time: 7,
    views_count: 1150,
    is_published: true,
    published_at: '2026-10-27T10:15:00Z'
  },
  {
    id: 'art-4',
    slug: 'pedoman-rubrik-penskoran-esai-hots',
    title: 'Pedoman Penyusunan Rubrik Penskoran Soal Uraian / Esai Penalaran Tinggi (HOTS)',
    excerpt: 'Menghindari subjektivitas penilaian guru dengan rubrik analitik berbobot jelas untuk soal-soal penalaran terbuka jenjang SD.',
    content: `## Menghadirkan Keadilan dalam Menilai Soal Uraian
Kelemahan terbesar bentuk soal uraian/esai adalah potensi bias subjektif pemeriksa. Tanpa rubrik yang terukur, dua guru yang memeriksa jawaban siswa yang sama dapat memberikan skor yang terpaut jauh.

---

### Rubrik Holistik vs Rubrik Analitik
- **Rubrik Holistik:** Memberikan skor tunggal berdasarkan kesan keseluruhan mutu jawaban. Cocok untuk penilaian esai sastra bebas.
- **Rubrik Analitik (Direkomendasikan untuk Ujian Sekolah):** Membagi penilaian ke dalam beberapa kriteria spesifik (misal: Ketepatan Konsep, Langkah Penyelesaian, dan Alasan Logis).

---

### Contoh Skala Penskoran Soal Penalaran Matematika (Bobot 4 Poin):
1. **Skor 4 (Sempurna):** Konsep tepat, rumus benar, perhitungan akurat, dan disertai kesimpulan operasional.
2. **Skor 3:** Konsep dan alur benar, namun terdapat kesalahan kecil komputasi angka akhir.
3. **Skor 2:** Mengetahui rumus yang digunakan, namun langkah penerapan belum tuntas.
4. **Skor 1:** Hanya menuliskan informasi yang diketahui pada pokok soal tanpa mampu merangkai solusi.
5. **Skor 0:** Tidak menjawab atau jawaban tidak memiliki relevansi konsep sama sekali.`,
    category: 'Rubrik & Penskoran',
    author_name: 'Agi Hamdani, M.Pd',
    read_time: 5,
    views_count: 890,
    is_published: true,
    published_at: '2026-10-27T12:00:00Z'
  },
  {
    id: 'art-5',
    slug: 'asesmen-diagnostik-awal-kurikulum-merdeka',
    title: 'Strategi Melaksanakan Asesmen Diagnostik Kognitif dan Non-Kognitif di Awal Tahun Ajaran',
    excerpt: 'Langkah memetakan kesiapan belajar, gaya belajar, dan kondisi sosio-emosional murid sebelum memulai pembelajaran berdiferensiasi.',
    content: `## Mengapa Asesmen Awal Krusial?
Dalam paradigma Kurikulum Merdeka, guru dilarang berasumsi bahwa semua murid berangkat dari garis awal yang sama. Pembelajaran berdiferensiasi hanya dapat berjalan efektif jika didahului oleh asesmen diagnostik yang tepat.

---

### 1. Asesmen Diagnostik Non-Kognitif
Bertujuan menggali profil kesejahteraan psikologis dan latar belakang murid:
- **Kondisi Emosional:** Apa yang kamu rasakan hari ini? Hal apa yang paling membuatmu bersemangat ke sekolah?
- **Lingkungan Belajar di Rumah:** Siapa yang menemanimu belajar di rumah? Apakah ada meja belajar yang tenang?
- **Gaya Belajar:** Apakah murid lebih cepat memahami lewat gambar/warna (Visual), cerita/lagu (Auditori), atau praktik gerak (Kinestetik).

---

### 2. Asesmen Diagnostik Kognitif
Bertujuan mendeteksi ketercapaian kompetensi prasyarat:
- Berikan 10 butir soal sederhana yang mencakup:
  * 2 soal dari materi prasyarat 2 tingkat kelas di bawahnya.
  * 6 soal dari materi kelas sebelumnya.
  * 2 soal materi pengantar yang akan dipelajari.
- Kelompokkan hasil asesmen ke dalam 3 level: Paham Utuh, Paham Sebagian, dan Belum Paham.`,
    category: 'Panduan Asesmen',
    author_name: 'Agi Hamdani, M.Pd',
    read_time: 6,
    views_count: 1310,
    is_published: true,
    published_at: '2026-10-27T14:20:00Z'
  }
];

export const FALLBACK_TEACHING_RESOURCES: TeachingResource[] = [
  {
    id: 'res-1',
    title: 'Matriks Kisi-Kisi & Kartu Soal Sumatif Akhir Semester (SAS) Bahasa Indonesia Fase C',
    description: 'Dokumen kisi-kisi terstandar lengkap dengan capaian pembelajaran membaca teks narasi, menulis laporan, sebaran level kognitif L1-L3, dan 30 butir kartu soal.',
    category: 'Matriks Kisi-Kisi',
    phase: 'Fase C',
    grade_level: 'Kelas 5 & 6',
    subject: 'Bahasa Indonesia',
    file_type: 'DOCX',
    file_url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx',
    file_size: '1.4 MB',
    download_count: 940,
    is_active: true,
    matrix_preview: [
      { no: 1, cp: 'Menganalisis ide pokok dan ide pendukung pada teks informasi', indicator: 'Disajikan kutipan teks eksposisi, siswa dapat menentukan ide pokok paragraf', question_type: 'Pilihan Ganda', cognitive_level: 'L1', points: 2 },
      { no: 2, cp: 'Menganalisis makna tersurat dan tersirat dalam teks narasi', indicator: 'Disajikan fabel, siswa dapat menyimpulkan amanat moral yang terkandung di dalamnya', question_type: 'Pilihan Ganda Kompleks', cognitive_level: 'L2', points: 3 },
      { no: 3, cp: 'Mengevaluasi akurasi data dalam infografis lingkungan', indicator: 'Disajikan infografik daur ulang, siswa membandingkan dua data persentase sampah', question_type: 'Menjodohkan', cognitive_level: 'L2', points: 3 },
      { no: 4, cp: 'Menulis teks eksplanasi sederhana fenomena alam', indicator: 'Siswa menuliskan 3 urutan sebab-akibat terjadinya banjir secara runtut dan logis', question_type: 'Uraian', cognitive_level: 'L3', points: 5 }
    ]
  },
  {
    id: 'res-2',
    title: 'Matriks Kisi-Kisi & Kartu Soal Asesmen Diagnostik Numerasi Fase B',
    description: 'Instrumen asesmen awal operasi hitung perkalian, pembagian, dan penalaran pecahan kontekstual untuk memetakan kesiapan murid kelas 4 SD.',
    category: 'Instrumen Diagnostik Awal',
    phase: 'Fase B',
    grade_level: 'Kelas 4',
    subject: 'Matematika',
    file_type: 'PDF',
    file_url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/lkpd/paket-lkpd-ipas-fase-b-kelas4.pdf',
    file_size: '2.1 MB',
    download_count: 1420,
    is_active: true,
    matrix_preview: [
      { no: 1, cp: 'Memahami nilai tempat bilangan cacah hingga 10.000', indicator: 'Siswa menentukan nilai tempat ratusan dan puluhan pada harga barang pasar', question_type: 'Pilihan Ganda', cognitive_level: 'L1', points: 2 },
      { no: 2, cp: 'Menerapkan operasi hitung perkalian susun', indicator: 'Disajikan masalah pembagian bibit tanaman, siswa menghitung sisa bibit yang belum tertanam', question_type: 'Isian Singkat', cognitive_level: 'L2', points: 3 },
      { no: 3, cp: 'Memecahkan masalah pecahan senilai dalam kehidupan sehari-hari', indicator: 'Siswa membuktikan kesetaraan potongan kue cokelat menggunakan gambar pecahan', question_type: 'Uraian', cognitive_level: 'L3', points: 5 }
    ]
  },
  {
    id: 'res-3',
    title: 'Paket Kartu Soal IPAS Fase B - Hubungan Antar Mahluk Hidup & Rantai Makanan',
    description: 'Kumpulan 25 kartu soal pilihan ganda kompleks dan uraian saintifik dengan stimulus visual rantai makanan ekosistem sawah dan hutan tropis.',
    category: 'Naskah Kartu Soal',
    phase: 'Fase B',
    grade_level: 'Kelas 4',
    subject: 'IPAS',
    file_type: 'DOCX',
    file_url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx',
    file_size: '1.8 MB',
    download_count: 810,
    is_active: true,
    matrix_preview: [
      { no: 1, cp: 'Mengidentifikasi peran organisme dalam rantai makanan', indicator: 'Disajikan diagram jaring-jaring makanan, siswa membedakan produsen dan konsumen tersier', question_type: 'Pilihan Ganda', cognitive_level: 'L1', points: 2 },
      { no: 2, cp: 'Menganalisis dampak kepunahan suatu spesies pada ekosistem', indicator: 'Siswa memprediksi ledakan populasi hama tikus jika burung hantu diburu', question_type: 'Uraian', cognitive_level: 'L3', points: 5 }
    ]
  },
  {
    id: 'res-4',
    title: 'Instrumen Tes Kemampuan Awal (TKA) Membaca Permulaan & Fonik Fase A',
    description: 'Instrumen asesmen diagnostik individu untuk siswa kelas 1 SD mencakup pengenalan huruf vokal-konsonan, suku kata terbuka, dan membaca kalimat sederhana.',
    category: 'Instrumen Diagnostik Awal',
    phase: 'Fase A',
    grade_level: 'Kelas 1',
    subject: 'Bahasa Indonesia',
    file_type: 'PDF',
    file_url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/lkpd/paket-lkpd-ipas-fase-b-kelas4.pdf',
    file_size: '3.2 MB',
    download_count: 1750,
    is_active: true,
    matrix_preview: [
      { no: 1, cp: 'Mengenal fonem dan pola bunyi huruf', indicator: 'Siswa melafalkan bunyi huruf awal pada benda yang ditunjukkan', question_type: 'Observasi Lisan', cognitive_level: 'L1', points: 2 },
      { no: 2, cp: 'Merangkai suku kata terbuka pola KV-KV', indicator: 'Siswa membaca lancar 5 kata bersuku kata dua (bola, meja, buku, mata, sapi)', question_type: 'Membaca Nyaring', cognitive_level: 'L1', points: 3 }
    ]
  },
  {
    id: 'res-5',
    title: 'Kisi-Kisi & Rubrik Sumatif Pendidikan Pancasila Fase C - Norma, Hak, & Kewajiban',
    description: 'Matriks evaluasi ketaatan norma di rumah, sekolah, dan masyarakat, dilengkapi skenario studi kasus dilema etika siswa sekolah dasar.',
    category: 'Matriks Kisi-Kisi',
    phase: 'Fase C',
    grade_level: 'Kelas 5',
    subject: 'Pendidikan Pancasila',
    file_type: 'DOCX',
    file_url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx',
    file_size: '1.1 MB',
    download_count: 620,
    is_active: true,
    matrix_preview: [
      { no: 1, cp: 'Mengidentifikasi norma hukum, agama, dan kesopanan', indicator: 'Disajikan 4 situasi pergaulan, siswa mengklasifikasikan jenis norma yang berlaku', question_type: 'Pilihan Ganda Kompleks', cognitive_level: 'L2', points: 3 },
      { no: 2, cp: 'Menjelaskan hak dan kewajiban warga sekolah secara berimbang', indicator: 'Siswa memberikan 2 solusi musyawarah kelas saat menghadapi perbedaan pendapat piket', question_type: 'Uraian', cognitive_level: 'L3', points: 5 }
    ]
  }
];

// In-memory download counter store for local interactive preview
const localDownloadCounts: Record<string, number> = {};

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

    if (category && category !== 'Semua Topik') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      if (category && category !== 'Semua Topik') {
        return FALLBACK_PUBLIC_ARTICLES.filter(a => a.category === category);
      }
      return FALLBACK_PUBLIC_ARTICLES;
    }
    return data as PublicArticle[];
  } catch (err) {
    if (category && category !== 'Semua Topik') {
      return FALLBACK_PUBLIC_ARTICLES.filter(a => a.category === category);
    }
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
  subject?: string;
}): Promise<TeachingResource[]> {
  try {
    let query = supabase
      .from('teaching_resources')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (filter?.category && filter.category !== 'Semua') {
      query = query.eq('category', filter.category);
    }
    if (filter?.phase && filter.phase !== 'Semua Fase') {
      query = query.eq('phase', filter.phase);
    }
    if (filter?.subject && filter.subject !== 'Semua') {
      query = query.eq('subject', filter.subject);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      let filtered = FALLBACK_TEACHING_RESOURCES.map(r => ({
        ...r,
        download_count: r.download_count + (localDownloadCounts[r.id] || 0)
      }));

      if (filter?.category && filter.category !== 'Semua') {
        filtered = filtered.filter(r => r.category === filter.category);
      }
      if (filter?.phase && filter.phase !== 'Semua Fase') {
        filtered = filtered.filter(r => r.phase === filter.phase || r.phase === 'Umum');
      }
      if (filter?.subject && filter.subject !== 'Semua') {
        filtered = filtered.filter(r => r.subject === filter.subject || r.subject === 'Umum');
      }
      return filtered;
    }
    return data as TeachingResource[];
  } catch (err) {
    return FALLBACK_TEACHING_RESOURCES;
  }
}

/**
 * Menyimulasikan dan mencatat penambahan jumlah unduhan
 */
export async function trackResourceDownload(resourceId: string): Promise<number> {
  localDownloadCounts[resourceId] = (localDownloadCounts[resourceId] || 0) + 1;
  try {
    await supabase.rpc('increment_resource_download', { resource_id: resourceId });
  } catch (e) {}
  const res = FALLBACK_TEACHING_RESOURCES.find(r => r.id === resourceId);
  return (res?.download_count || 0) + localDownloadCounts[resourceId];
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

// ==============================================================================
// ADMIN CMS PORTAL MANAGER FUNCTIONS (CRUD & KURASI)
// ==============================================================================

// Mutable in-memory stores with full fallback sync
let adminArticlesStore: PublicArticle[] = [...FALLBACK_PUBLIC_ARTICLES];
let adminResourcesStore: TeachingResource[] = [...FALLBACK_TEACHING_RESOURCES];
let adminContributionsStore: TeacherContribution[] = [
  {
    id: 'contrib-1',
    teacher_id: 't-1',
    teacher_name: 'Dewi Rahmawati, S.Pd',
    teacher_school: 'SDN 2 Sukamaju',
    title: 'Modul Ajar Matematika Operasi Pecahan Berbantuan Media Roti Lipat',
    content_type: 'Modul Ajar',
    summary: 'Pembelajaran bermakna pecahan senilai menggunakan bahan konkret roti tawar di kelas 4 SD.',
    body: '## Latar Belakang Pembelajaran\nSiswa kerap kesulitan memahami pecahan abstrak jika hanya diajarkan dengan angka di papan tulis. Melalui modul roti lipat ini, siswa mengamati langsung pembagian 1/2, 1/4, dan 1/8 secara visual dan kinestetik.\n\n### Langkah Pembelajaran\n1. Siswa dibagi ke dalam kelompok kecil beranggotakan 4 anak.\n2. Setiap kelompok menerima 2 lembar roti tawar dan pisau plastik.\n3. Siswa memotong roti sesuai instruksi kartu pecahan.\n4. Membandingkan ukuran pecahan senilai 2/4 dengan 1/2.',
    status: 'pending_review',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'contrib-2',
    teacher_id: 't-2',
    teacher_name: 'Budi Hartono, M.Pd',
    teacher_school: 'SD Pertiwi Mandiri',
    title: 'Paket LKPD Eksplorasi Sains: Siklus Air dan Pelestarian Sumber Air Bersih',
    content_type: 'LKPD',
    summary: 'Lembar observasi kelompok untuk penyelidikan evaporasi dan kondensasi sederhana.',
    body: '## Petunjuk LKPD\nAmati perubahan uap air dalam stoples kaca yang ditutup rapat dan diletakkan di bawah sinar matahari.',
    status: 'draft',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'contrib-3',
    teacher_id: 't-3',
    teacher_name: 'Siti Aminah, S.Pd.SD',
    teacher_school: 'SDN Mekarwangi',
    title: 'Praktik Baik: Penerapan Pojok Baca Digital & Asesmen Formatif Menyenangkan',
    content_type: 'Praktik Baik',
    summary: 'Peningkatan literasi membaca siswa Fase B dengan pemanfaatan gawai kelas bergantian.',
    body: '## Praktik Baik\nDengan menghadirkan pojok baca digital sederhana di sudut kelas, motivasi membaca siswa meningkat hingga 75%.',
    status: 'published',
    review_notes: 'Sangat inspiratif dan aplikatif untuk sekolah dengan sarana sederhana.',
    reviewed_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 72).toISOString()
  }
];
let adminProfileStore: DeveloperProfile = { ...FALLBACK_DEVELOPER_PROFILE };

/**
 * Mengambil semua artikel untuk dashboard admin (termasuk draf)
 */
export async function getAllPublicArticlesAdmin(): Promise<PublicArticle[]> {
  try {
    const { data, error } = await supabase
      .from('public_articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      adminArticlesStore = data as PublicArticle[];
      return adminArticlesStore;
    }
  } catch (e) {}
  return adminArticlesStore;
}

/**
 * Menyimpan atau memperbarui artikel publik
 */
export async function savePublicArticle(
  article: Partial<PublicArticle>
): Promise<{ success: boolean; data?: PublicArticle; error?: string }> {
  try {
    const isNew = !article.id;
    const articlePayload = {
      ...article,
      slug: article.slug || article.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `artikel-${Date.now()}`,
      updated_at: new Date().toISOString()
    };

    if (isNew) {
      const { data, error } = await supabase
        .from('public_articles')
        .insert([{
          ...articlePayload,
          id: undefined,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (!error && data) {
        adminArticlesStore.unshift(data as PublicArticle);
        return { success: true, data: data as PublicArticle };
      }
    } else {
      const { data, error } = await supabase
        .from('public_articles')
        .update(articlePayload)
        .eq('id', article.id)
        .select()
        .single();

      if (!error && data) {
        adminArticlesStore = adminArticlesStore.map(a => a.id === article.id ? (data as PublicArticle) : a);
        return { success: true, data: data as PublicArticle };
      }
    }
  } catch (e) {}

  // Fallback in-memory update
  if (article.id) {
    adminArticlesStore = adminArticlesStore.map(a => 
      a.id === article.id ? ({ ...a, ...article, updated_at: new Date().toISOString() } as PublicArticle) : a
    );
    const updated = adminArticlesStore.find(a => a.id === article.id);
    return { success: true, data: updated };
  } else {
    const newArt: PublicArticle = {
      id: `art-${Date.now()}`,
      slug: article.slug || article.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `artikel-${Date.now()}`,
      title: article.title || 'Artikel Tanpa Judul',
      excerpt: article.excerpt || '',
      content: article.content || '',
      category: article.category || 'Panduan Asesmen',
      author_name: article.author_name || 'Agi Hamdani, M.Pd',
      read_time: article.read_time || 5,
      views_count: 0,
      is_published: article.is_published ?? true,
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...article
    };
    adminArticlesStore.unshift(newArt);
    return { success: true, data: newArt };
  }
}

/**
 * Menghapus artikel publik
 */
export async function deletePublicArticle(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('public_articles').delete().eq('id', id);
  } catch (e) {}
  adminArticlesStore = adminArticlesStore.filter(a => a.id !== id);
  return { success: true };
}

/**
 * Mengubah status publish artikel (toggle cepat)
 */
export async function toggleArticlePublish(id: string, is_published: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('public_articles').update({ is_published }).eq('id', id);
  } catch (e) {}
  adminArticlesStore = adminArticlesStore.map(a => a.id === id ? { ...a, is_published } : a);
  return { success: true };
}

/**
 * Mengambil seluruh dokumen sumber belajar untuk admin
 */
export async function getAllTeachingResourcesAdmin(): Promise<TeachingResource[]> {
  try {
    const { data, error } = await supabase
      .from('teaching_resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      adminResourcesStore = data as TeachingResource[];
      return adminResourcesStore;
    }
  } catch (e) {}
  return adminResourcesStore;
}

/**
 * Menyimpan atau memperbarui dokumen sumber belajar
 */
export async function saveTeachingResource(
  resource: Partial<TeachingResource>
): Promise<{ success: boolean; data?: TeachingResource; error?: string }> {
  try {
    const isNew = !resource.id;
    const payload = {
      ...resource,
      updated_at: new Date().toISOString()
    };

    if (isNew) {
      const { data, error } = await supabase
        .from('teaching_resources')
        .insert([{
          ...payload,
          id: undefined,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (!error && data) {
        adminResourcesStore.unshift(data as TeachingResource);
        return { success: true, data: data as TeachingResource };
      }
    } else {
      const { data, error } = await supabase
        .from('teaching_resources')
        .update(payload)
        .eq('id', resource.id)
        .select()
        .single();

      if (!error && data) {
        adminResourcesStore = adminResourcesStore.map(r => r.id === resource.id ? (data as TeachingResource) : r);
        return { success: true, data: data as TeachingResource };
      }
    }
  } catch (e) {}

  // Fallback in-memory
  if (resource.id) {
    adminResourcesStore = adminResourcesStore.map(r => 
      r.id === resource.id ? ({ ...r, ...resource, updated_at: new Date().toISOString() } as TeachingResource) : r
    );
    const updated = adminResourcesStore.find(r => r.id === resource.id);
    return { success: true, data: updated };
  } else {
    const newRes: TeachingResource = {
      id: `res-${Date.now()}`,
      title: resource.title || 'Dokumen Baru',
      description: resource.description || '',
      category: resource.category || 'Matriks Kisi-Kisi',
      phase: resource.phase || 'Fase B',
      grade_level: resource.grade_level || 'Kelas 4',
      subject: resource.subject || 'Bahasa Indonesia',
      file_type: resource.file_type || 'PDF',
      file_url: resource.file_url || 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx',
      file_size: resource.file_size || '1.5 MB',
      download_count: 0,
      is_active: resource.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...resource
    };
    adminResourcesStore.unshift(newRes);
    return { success: true, data: newRes };
  }
}

/**
 * Menghapus dokumen sumber belajar
 */
export async function deleteTeachingResource(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await supabase.from('teaching_resources').delete().eq('id', id);
  } catch (e) {}
  adminResourcesStore = adminResourcesStore.filter(r => r.id !== id);
  return { success: true };
}

/**
 * Mengambil antrean kontribusi guru untuk kurasi Super Admin
 */
export async function getAllTeacherContributionsAdmin(): Promise<TeacherContribution[]> {
  try {
    const { data, error } = await supabase
      .from('teacher_contributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      adminContributionsStore = data as TeacherContribution[];
      return adminContributionsStore;
    }
  } catch (e) {}
  return adminContributionsStore;
}

/**
 * Memproses status kurasi karya guru
 */
export async function updateTeacherContributionStatus(
  id: string,
  status: ContributionStatus,
  review_notes?: string,
  reviewed_by?: string
): Promise<{ success: boolean; data?: TeacherContribution; error?: string }> {
  try {
    const payload = {
      status,
      review_notes: review_notes || null,
      reviewed_by: reviewed_by || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('teacher_contributions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      adminContributionsStore = adminContributionsStore.map(c => c.id === id ? (data as TeacherContribution) : c);
      return { success: true, data: data as TeacherContribution };
    }
  } catch (e) {}

  adminContributionsStore = adminContributionsStore.map(c => {
    if (c.id === id) {
      return {
        ...c,
        status,
        review_notes: review_notes || c.review_notes,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
    return c;
  });

  const updated = adminContributionsStore.find(c => c.id === id);
  return { success: true, data: updated };
}

/**
 * Memperbarui data profil pengembang resmi
 */
export async function saveDeveloperProfile(
  profile: Partial<DeveloperProfile>
): Promise<{ success: boolean; data?: DeveloperProfile; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('developer_profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString()
      })
      .eq('is_primary', true)
      .select()
      .single();

    if (!error && data) {
      adminProfileStore = data as DeveloperProfile;
      return { success: true, data: adminProfileStore };
    }
  } catch (e) {}

  adminProfileStore = {
    ...adminProfileStore,
    ...profile,
    updated_at: new Date().toISOString()
  };
  return { success: true, data: adminProfileStore };
}

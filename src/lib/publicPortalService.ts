import { supabase } from './supabase';
import { 
  PublicArticle, 
  TeachingResource, 
  TeacherContribution, 
  DeveloperProfile,
  BlueprintMatrixRow,
  SidebarWidgetConfig,
  PortalQuickLink,
  QuickLinkItem,
  PortalWidgetSettings,
  PublicSidebarAggregatePayload
} from '../types/publicPortal';
import { sanitizeHtml } from './safeHtmlSanitizer';
import { INITIAL_EDUCATIONAL_ARTICLES } from './educationalContentSeeds';

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

export const FALLBACK_SIDEBAR_CONFIG: SidebarWidgetConfig = {
  show_search: true,
  show_pinned: true,
  show_popular_tabs: true,
  show_categories: true,
  show_quick_links: true
};

export const FALLBACK_QUICK_LINKS: PortalQuickLink[] = [
  {
    id: 'ql-1',
    title: 'Kalender Asesmen Nasional',
    url: 'https://pusmendik.kemdikbud.go.id/an',
    icon: 'Calendar',
    description: 'Jadwal resmi simulasi & ANBK Kemdikbud',
    is_new_tab: true,
    is_active: true,
    order_index: 1
  },
  {
    id: 'ql-2',
    title: 'Download Modul & RPP',
    url: '#resources',
    icon: 'Download',
    description: 'Kumpulan perangkat ajar SD siap pakai',
    is_new_tab: false,
    is_active: true,
    order_index: 2
  },
  {
    id: 'ql-3',
    title: 'Portal Guru & Layanan CBT',
    url: '#cbt',
    icon: 'Globe',
    description: 'Akses instan modul ujian CBT mandiri',
    is_new_tab: false,
    is_active: true,
    order_index: 3
  },
  {
    id: 'ql-4',
    title: 'Pusat Bantuan & Panduan',
    url: '#about',
    icon: 'HelpCircle',
    description: 'Konsultasi kaidah penulisan kisi-kisi',
    is_new_tab: false,
    is_active: true,
    order_index: 4
  }
];

export const FALLBACK_PUBLIC_ARTICLES: PublicArticle[] = INITIAL_EDUCATIONAL_ARTICLES;

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
    const dbArticles = (!error && data) ? (data as PublicArticle[]) : [];
    const dbSlugs = new Set(dbArticles.map(a => a.slug));
    const unseeded = FALLBACK_PUBLIC_ARTICLES.filter(a => !dbSlugs.has(a.slug));
    let combined = [...dbArticles, ...unseeded];

    if (category && category !== 'Semua Topik') {
      combined = combined.filter(a => a.category === category);
    }
    return combined;
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
      const dbArticles = data as PublicArticle[];
      const dbSlugs = new Set(dbArticles.map(a => a.slug));
      const unseeded = FALLBACK_PUBLIC_ARTICLES.filter(a => !dbSlugs.has(a.slug));
      adminArticlesStore = [...dbArticles, ...unseeded];
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
    // Sanitasi HTML menyeluruh untuk mencegah celah XSS sambil mempertahankan tag kaya
    const sanitizedContent = article.content ? sanitizeHtml(article.content) : '';
    const pinExpiry = article.pin_expires_at || article.pinned_until || null;
    const viewCount = article.view_count !== undefined ? article.view_count : (article.views_count || 0);

    const articlePayload: Partial<PublicArticle> = {
      ...article,
      content: sanitizedContent,
      is_pinned: !!article.is_pinned,
      pin_expires_at: pinExpiry,
      pinned_until: pinExpiry,
      is_featured: !!article.is_featured,
      view_count: viewCount,
      views_count: viewCount,
      slug: article.slug || article.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `artikel-${Date.now()}`,
      updated_at: new Date().toISOString()
    };

    sidebarAggregateCache = null; // Invalidate aggregate cache

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
  sidebarAggregateCache = null;
  const pinExpiry = article.pin_expires_at || article.pinned_until || null;
  const viewCount = article.view_count !== undefined ? article.view_count : (article.views_count || 0);

  if (article.id) {
    adminArticlesStore = adminArticlesStore.map(a => 
      a.id === article.id ? ({ 
        ...a, 
        ...article, 
        content: article.content ? sanitizeHtml(article.content) : a.content,
        is_pinned: article.is_pinned !== undefined ? !!article.is_pinned : a.is_pinned,
        pin_expires_at: pinExpiry !== undefined ? pinExpiry : a.pin_expires_at,
        pinned_until: pinExpiry !== undefined ? pinExpiry : a.pinned_until,
        is_featured: article.is_featured !== undefined ? !!article.is_featured : a.is_featured,
        view_count: viewCount,
        views_count: viewCount,
        updated_at: new Date().toISOString() 
      } as PublicArticle) : a
    );
    const updated = adminArticlesStore.find(a => a.id === article.id);
    return { success: true, data: updated };
  } else {
    const newArt: PublicArticle = {
      id: `art-${Date.now()}`,
      slug: article.slug || article.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `artikel-${Date.now()}`,
      title: article.title || 'Artikel Tanpa Judul',
      excerpt: article.excerpt || '',
      content: article.content ? sanitizeHtml(article.content) : '',
      category: article.category || 'Panduan Asesmen',
      author_name: article.author_name || 'Agi Hamdani, M.Pd',
      read_time: article.read_time || 5,
      view_count: viewCount,
      views_count: viewCount,
      is_pinned: !!article.is_pinned,
      pin_expires_at: pinExpiry,
      pinned_until: pinExpiry,
      is_featured: !!article.is_featured,
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

// ==============================================================================
// SIDEBAR WIDGETS & QUICK LINKS FUNCTIONS
// ==============================================================================

let adminSidebarConfigStore: SidebarWidgetConfig = { ...FALLBACK_SIDEBAR_CONFIG };
let adminQuickLinksStore: PortalQuickLink[] = [...FALLBACK_QUICK_LINKS];
let sidebarAggregateCache: { data: PublicSidebarAggregatePayload; timestamp: number } | null = null;
const CACHE_TTL_MS = 30000; // 30 detik untuk efisiensi data fetching & anti-CLS

/**
 * Mengambil konfigurasi visibilitas widget sidebar dari Supabase atau fallback
 */
export async function getSidebarWidgetConfig(): Promise<SidebarWidgetConfig> {
  try {
    const { data, error } = await supabase
      .from('portal_widget_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (!error && data) {
      adminSidebarConfigStore = data as SidebarWidgetConfig;
      try {
        localStorage.setItem('sasi_sidebar_config', JSON.stringify(adminSidebarConfigStore));
      } catch (e) {}
      return adminSidebarConfigStore;
    }
  } catch (e) {}

  try {
    const local = localStorage.getItem('sasi_sidebar_config');
    if (local) {
      adminSidebarConfigStore = JSON.parse(local);
      return adminSidebarConfigStore;
    }
  } catch (e) {}
  return adminSidebarConfigStore;
}

/**
 * Menyimpan konfigurasi visibilitas widget sidebar
 */
export async function saveSidebarWidgetConfig(
  config: SidebarWidgetConfig
): Promise<{ success: boolean; data?: SidebarWidgetConfig }> {
  sidebarAggregateCache = null; // Invalidate cache
  adminSidebarConfigStore = { ...config, updated_at: new Date().toISOString() };

  try {
    localStorage.setItem('sasi_sidebar_config', JSON.stringify(adminSidebarConfigStore));
  } catch (e) {}

  try {
    const { data, error } = await supabase
      .from('portal_widget_settings')
      .upsert({
        id: 'default',
        show_search: config.show_search,
        show_pinned: config.show_pinned,
        show_popular_tabs: config.show_popular_tabs,
        show_categories: config.show_categories,
        show_quick_links: config.show_quick_links,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (!error && data) {
      adminSidebarConfigStore = data as SidebarWidgetConfig;
      return { success: true, data: adminSidebarConfigStore };
    }
  } catch (err: any) {}

  return { success: true, data: adminSidebarConfigStore };
}

/**
 * Mengambil daftar tautan cepat (Quick Links) aktif
 */
export async function getPortalQuickLinks(): Promise<PortalQuickLink[]> {
  try {
    const { data, error } = await supabase
      .from('quick_links')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      adminQuickLinksStore = data.map((d: any) => ({
        id: d.id,
        label: d.label,
        title: d.label,
        url: d.url,
        icon_name: d.icon_name || 'ExternalLink',
        icon: d.icon_name || 'ExternalLink',
        description: d.description || '',
        target_blank: d.target_blank ?? true,
        is_new_tab: d.target_blank ?? true,
        sort_order: d.sort_order || 1,
        order_index: d.sort_order || 1,
        is_active: d.is_active ?? true,
        created_at: d.created_at,
        updated_at: d.updated_at
      }));
      try {
        localStorage.setItem('sasi_quick_links', JSON.stringify(adminQuickLinksStore));
      } catch (e) {}
      return adminQuickLinksStore;
    }
  } catch (e) {}

  try {
    const local = localStorage.getItem('sasi_quick_links');
    if (local) {
      adminQuickLinksStore = JSON.parse(local);
      return adminQuickLinksStore.sort((a, b) => (a.sort_order || a.order_index || 1) - (b.sort_order || b.order_index || 1));
    }
  } catch (e) {}

  return adminQuickLinksStore.sort((a, b) => (a.sort_order || a.order_index || 1) - (b.sort_order || b.order_index || 1));
}

/**
 * Menyimpan atau memperbarui tautan cepat (Quick Link)
 */
export async function savePortalQuickLink(
  link: Partial<PortalQuickLink>
): Promise<{ success: boolean; data?: PortalQuickLink }> {
  sidebarAggregateCache = null; // Invalidate cache
  const normalizedLabel = link.label || link.title || 'Tautan Cepat';
  const normalizedIcon = link.icon_name || link.icon || 'ExternalLink';
  const normalizedTargetBlank = link.target_blank !== undefined ? link.target_blank : (link.is_new_tab ?? true);
  const normalizedSortOrder = link.sort_order !== undefined ? link.sort_order : (link.order_index || adminQuickLinksStore.length + 1);

  const payload = {
    label: normalizedLabel,
    url: link.url || '#',
    icon_name: normalizedIcon,
    description: link.description || '',
    target_blank: normalizedTargetBlank,
    sort_order: normalizedSortOrder,
    is_active: link.is_active ?? true,
    updated_at: new Date().toISOString()
  };

  try {
    if (link.id && !link.id.startsWith('ql-')) {
      const { data, error } = await supabase
        .from('quick_links')
        .update(payload)
        .eq('id', link.id)
        .select()
        .single();

      if (!error && data) {
        const item: PortalQuickLink = {
          id: data.id,
          label: data.label,
          title: data.label,
          url: data.url,
          icon_name: data.icon_name,
          icon: data.icon_name,
          description: data.description,
          target_blank: data.target_blank,
          is_new_tab: data.target_blank,
          sort_order: data.sort_order,
          order_index: data.sort_order,
          is_active: data.is_active,
          updated_at: data.updated_at
        };
        adminQuickLinksStore = adminQuickLinksStore.map(q => q.id === item.id ? item : q);
        return { success: true, data: item };
      }
    } else {
      const { data, error } = await supabase
        .from('quick_links')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        const item: PortalQuickLink = {
          id: data.id,
          label: data.label,
          title: data.label,
          url: data.url,
          icon_name: data.icon_name,
          icon: data.icon_name,
          description: data.description,
          target_blank: data.target_blank,
          is_new_tab: data.target_blank,
          sort_order: data.sort_order,
          order_index: data.sort_order,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
        adminQuickLinksStore.push(item);
        return { success: true, data: item };
      }
    }
  } catch (err: any) {}

  // Fallback in-memory
  if (link.id) {
    const idx = adminQuickLinksStore.findIndex(q => q.id === link.id);
    if (idx >= 0) {
      adminQuickLinksStore[idx] = {
        ...adminQuickLinksStore[idx],
        ...link,
        label: normalizedLabel,
        title: normalizedLabel,
        icon_name: normalizedIcon,
        icon: normalizedIcon,
        target_blank: normalizedTargetBlank,
        is_new_tab: normalizedTargetBlank,
        sort_order: normalizedSortOrder,
        order_index: normalizedSortOrder,
        updated_at: new Date().toISOString()
      };
    }
  } else {
    const newLink: PortalQuickLink = {
      id: `ql-${Date.now()}`,
      label: normalizedLabel,
      title: normalizedLabel,
      url: link.url || '#',
      icon_name: normalizedIcon,
      icon: normalizedIcon,
      description: link.description || '',
      target_blank: normalizedTargetBlank,
      is_new_tab: normalizedTargetBlank,
      sort_order: normalizedSortOrder,
      order_index: normalizedSortOrder,
      is_active: link.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    adminQuickLinksStore.push(newLink);
  }

  try {
    localStorage.setItem('sasi_quick_links', JSON.stringify(adminQuickLinksStore));
  } catch (e) {}

  const item = link.id 
    ? adminQuickLinksStore.find(q => q.id === link.id) 
    : adminQuickLinksStore[adminQuickLinksStore.length - 1];

  return { success: true, data: item };
}

/**
 * Menghapus tautan cepat
 */
export async function deletePortalQuickLink(id: string): Promise<{ success: boolean }> {
  sidebarAggregateCache = null; // Invalidate cache
  try {
    if (!id.startsWith('ql-')) {
      await supabase.from('quick_links').delete().eq('id', id);
    }
  } catch (e) {}

  adminQuickLinksStore = adminQuickLinksStore.filter(q => q.id !== id);
  try {
    localStorage.setItem('sasi_quick_links', JSON.stringify(adminQuickLinksStore));
  } catch (e) {}
  return { success: true };
}

/**
 * RUTE API AGREGAT PUBLIK (Public Aggregate Endpoint)
 * Mengembalikan payload JSON agregat ringkas untuk panel samping secara efisien dan anti-CLS:
 * - pinned_posts (pos tersemat aktif & belum kedaluwarsa)
 * - popular_posts (5 artikel paling banyak dibaca)
 * - latest_posts (5 artikel teranyar)
 * - category_counts (jumlah artikel per kategori)
 * - quick_links (tautan cepat aktif)
 * - widget_settings (visibilitas widget)
 */
export async function getPublicSidebarAggregateData(
  forceRefresh = false
): Promise<PublicSidebarAggregatePayload> {
  const now = Date.now();
  if (!forceRefresh && sidebarAggregateCache && (now - sidebarAggregateCache.timestamp < CACHE_TTL_MS)) {
    return sidebarAggregateCache.data;
  }

  // Ambil data artikel, tautan cepat, dan pengaturan widget secara paralel
  const [articles, allLinks, config] = await Promise.all([
    getPublicArticles(),
    getPortalQuickLinks(),
    getSidebarWidgetConfig()
  ]);

  const nowDate = new Date();

  // 1. Pinned Posts
  const pinnedPosts = articles.filter(a => {
    if (!a.is_pinned) return false;
    const expiry = a.pin_expires_at || a.pinned_until;
    if (expiry) {
      return new Date(expiry) > nowDate;
    }
    return true;
  });

  // 2. Popular Posts (top 5 by view_count / views_count)
  const popularPosts = [...articles]
    .sort((a, b) => {
      const vA = a.view_count !== undefined ? a.view_count : (a.views_count || 0);
      const vB = b.view_count !== undefined ? b.view_count : (b.views_count || 0);
      return vB - vA;
    })
    .slice(0, 5);

  // 3. Latest Posts (top 5 by published_at / created_at)
  const latestPosts = [...articles]
    .sort((a, b) => {
      const tA = new Date(a.published_at || a.created_at || 0).getTime();
      const tB = new Date(b.published_at || b.created_at || 0).getTime();
      return tB - tA;
    })
    .slice(0, 5);

  // 4. Category Counts
  const categoryCounts: Record<string, number> = {};
  articles.forEach(a => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });

  // 5. Active Quick Links
  const activeQuickLinks = allLinks
    .filter(l => l.is_active)
    .sort((a, b) => (a.sort_order || a.order_index || 1) - (b.sort_order || b.order_index || 1));

  const aggregateResult: PublicSidebarAggregatePayload = {
    pinned_posts: pinnedPosts,
    popular_posts: popularPosts,
    latest_posts: latestPosts,
    category_counts: categoryCounts,
    quick_links: activeQuickLinks,
    widget_settings: config
  };

  sidebarAggregateCache = {
    data: aggregateResult,
    timestamp: now
  };

  return aggregateResult;
}



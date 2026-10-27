-- ==============================================================================
-- MIGRASI DATABASE: FASE 1 - ZONA PUBLIK & EDUKASI SASIPEDIA
-- Domain: sasipedia.my.id
-- Sifat: Non-intrusif, terisolasi 100% dari tabel operasional CBT
-- ==============================================================================

-- 1. TABEL: public_articles (Wawasan Asesmen, Berita, & Panduan Pendidikan)
CREATE TABLE IF NOT EXISTS public.public_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Wawasan Asesmen',
  author_name TEXT NOT NULL DEFAULT 'Tim SASI',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  featured_image TEXT,
  read_time INTEGER DEFAULT 5,
  views_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indeks untuk pencarian dan pemuatan cepat
CREATE INDEX IF NOT EXISTS idx_public_articles_slug ON public.public_articles (slug);
CREATE INDEX IF NOT EXISTS idx_public_articles_category ON public.public_articles (category);
CREATE INDEX IF NOT EXISTS idx_public_articles_published ON public.public_articles (is_published, published_at DESC);

-- 2. TABEL: teaching_resources (Katalog Perangkat Ajar, Kisi-kisi, Modul, & Administrasi)
CREATE TABLE IF NOT EXISTS public.teaching_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'Modul Ajar', 'LKPD', 'Kisi-Kisi', 'Administrasi Guru', 'Media Belajar'
  phase TEXT, -- 'Fase A', 'Fase B', 'Fase C', 'Umum'
  grade_level TEXT, -- 'Kelas 1', 'Kelas 2', ..., 'Semua Kelas'
  subject TEXT, -- 'Bahasa Indonesia', 'Matematika', 'IPAS', 'Pendidikan Pancasila', 'Umum'
  file_type TEXT NOT NULL DEFAULT 'PDF', -- 'PDF', 'DOCX', 'XLSX', 'ZIP'
  file_url TEXT NOT NULL, -- URL file fisik di Supabase Storage bucket 'educational-resources'
  file_size TEXT, -- contoh '1.8 MB'
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teaching_resources_category ON public.teaching_resources (category);
CREATE INDEX IF NOT EXISTS idx_teaching_resources_phase ON public.teaching_resources (phase);
CREATE INDEX IF NOT EXISTS idx_teaching_resources_active ON public.teaching_resources (is_active);

-- 3. TABEL: teacher_contributions (Karya Tulis & Praktik Baik Guru)
CREATE TABLE IF NOT EXISTS public.teacher_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  teacher_school TEXT,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'Modul Ajar', -- 'Modul Ajar', 'LKPD', 'Artikel Edukasi', 'Praktik Baik'
  summary TEXT,
  body TEXT NOT NULL,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_contributions_status ON public.teacher_contributions (status);
CREATE INDEX IF NOT EXISTS idx_teacher_contributions_teacher ON public.teacher_contributions (teacher_id);

-- 4. TABEL: developer_profiles (Standar E-E-A-T & Kredibilitas Pengembang)
CREATE TABLE IF NOT EXISTS public.developer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  title TEXT NOT NULL,
  role_description TEXT,
  bio TEXT,
  credentials TEXT[] DEFAULT '{}',
  expertise TEXT[] DEFAULT '{}',
  email TEXT,
  phone TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  avatar_url TEXT,
  is_primary BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- PENGATURAN ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- A. RLS public_articles
ALTER TABLE public.public_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published articles" ON public.public_articles;
CREATE POLICY "Public can view published articles"
  ON public.public_articles
  FOR SELECT
  USING (is_published = true);

DROP POLICY IF EXISTS "Super Admin full access to public articles" ON public.public_articles;
CREATE POLICY "Super Admin full access to public articles"
  ON public.public_articles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
    )
  );

-- B. RLS teaching_resources
ALTER TABLE public.teaching_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active resources" ON public.teaching_resources;
CREATE POLICY "Public can view active resources"
  ON public.teaching_resources
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Super Admin full access to teaching resources" ON public.teaching_resources;
CREATE POLICY "Super Admin full access to teaching resources"
  ON public.teaching_resources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
    )
  );

-- C. RLS teacher_contributions
ALTER TABLE public.teacher_contributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published teacher contributions" ON public.teacher_contributions;
CREATE POLICY "Public can view published teacher contributions"
  ON public.teacher_contributions
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Teachers can view their own contributions" ON public.teacher_contributions;
CREATE POLICY "Teachers can view their own contributions"
  ON public.teacher_contributions
  FOR SELECT
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can insert contributions" ON public.teacher_contributions;
CREATE POLICY "Teachers can insert contributions"
  ON public.teacher_contributions
  FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() 
    AND status IN ('draft', 'pending_review')
  );

DROP POLICY IF EXISTS "Teachers can update their own drafts" ON public.teacher_contributions;
CREATE POLICY "Teachers can update their own drafts"
  ON public.teacher_contributions
  FOR UPDATE
  USING (
    teacher_id = auth.uid() 
    AND status IN ('draft', 'rejected')
  )
  WITH CHECK (
    teacher_id = auth.uid() 
    AND status IN ('draft', 'pending_review')
  );

DROP POLICY IF EXISTS "Super Admin can manage all contributions" ON public.teacher_contributions;
CREATE POLICY "Super Admin can manage all contributions"
  ON public.teacher_contributions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
    )
  );

-- D. RLS developer_profiles
ALTER TABLE public.developer_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view developer profile" ON public.developer_profiles;
CREATE POLICY "Public can view developer profile"
  ON public.developer_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super Admin can update developer profile" ON public.developer_profiles;
CREATE POLICY "Super Admin can update developer profile"
  ON public.developer_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
    )
  );

-- ==============================================================================
-- KONFIGURASI SUPABASE STORAGE: BUCKET 'educational-resources'
-- ==============================================================================

-- Buat bucket publik khusus berkas edukasi (maksimal 50MB per berkas)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'educational-resources',
  'educational-resources',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE 
SET public = true,
    file_size_limit = 52428800;

-- Kebijakan Akses Storage:
-- 1. Semua pengunjung publik diizinkan membaca/mengunduh berkas
DROP POLICY IF EXISTS "Public can read educational resources" ON storage.objects;
CREATE POLICY "Public can read educational resources"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'educational-resources');

-- 2. Guru & Admin yang terautentikasi dapat mengunggah berkas
DROP POLICY IF EXISTS "Authenticated users can upload educational resources" ON storage.objects;
CREATE POLICY "Authenticated users can upload educational resources"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'educational-resources' 
    AND auth.role() = 'authenticated'
  );

-- 3. Super Admin dapat menghapus atau memperbarui berkas
DROP POLICY IF EXISTS "Super Admin can delete educational resources" ON storage.objects;
CREATE POLICY "Super Admin can delete educational resources"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'educational-resources'
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
    )
  );

-- ==============================================================================
-- DATA AWAL (SEED): PROFIL PENGEMBANG (E-E-A-T) & ARTIKEL AWAL
-- ==============================================================================

-- Seed Profil Pengembang Resmi
INSERT INTO public.developer_profiles (
  full_name,
  title,
  role_description,
  bio,
  credentials,
  expertise,
  email,
  phone,
  social_links,
  avatar_url,
  is_primary
) VALUES (
  'Agi Hamdani, M.Pd',
  'Inisiator & Lead Architect Sistem Asesmen Sekolah Indonesia (SASI)',
  'Pendidik Sekolah Dasar, Praktisi Evaluasi Pendidikan, dan Pengembang Sistem CBT Terdesentralisasi',
  'Berpengalaman lebih dari satu dekade dalam dunia pendidikan dasar dan pengembangan instrumen evaluasi pembelajaran. Menginisiasi platform SASI dan SASIPEDIA sebagai solusi asesmen berstandar nasional yang adil, mandiri, dan berpusat pada kemudahan guru serta peserta didik di seluruh Indonesia.',
  ARRAY[
    'Magister Pendidikan (M.Pd) - Evaluasi & Kebijakan Pendidikan',
    'Sarjana Pendidikan Guru Sekolah Dasar (S.Pd)',
    'Sertifikasi Asesor Kompetensi & Penulis Butir Soal AKM',
    'Pengembang Arsitektur Sistem Asesmen CBT Sharding Sekolah'
  ],
  ARRAY[
    'Penyusunan Kisi-Kisi & Kartu Soal Berstandar AKM/TKA',
    'Pengembangan Modul Ajar Berdiferensiasi & Pembelajaran Bermakna',
    'Evaluasi Butir Soal Berbasis Teori Respon Butir (IRT)',
    'Arsitektur Database Cloud & CBT Klaster Terdesentralisasi'
  ],
  'agihamdani88@gmail.com',
  '+6281234567890',
  '{"github": "https://github.com/nughejr-creator", "website": "https://sasipedia.my.id"}'::jsonb,
  '/sasipedia-icon.png',
  true
)
ON CONFLICT DO NOTHING;

-- Seed Artikel Wawasan Awal
INSERT INTO public.public_articles (slug, title, excerpt, content, category, author_name, read_time, is_published)
VALUES 
(
  'kaidah-penulisan-soal-asesmen-sekolah-sd',
  'Kaidah Baku Penulisan Soal Asesmen Sekolah Tingkat Sekolah Dasar',
  'Panduan komprehensif bagi pendidik dalam merumuskan stimulus kontekstual, pokok soal bebas bias, dan opsi jawaban yang logis sesuai standar asesmen nasional.',
  '## Pendahuluan\nPenulisan butir soal yang bermutu merupakan prasyarat utama dalam memperoleh data capaian kompetensi peserta didik yang valid dan reliabel. Pada jenjang Sekolah Dasar, butir soal harus memperhatikan perkembangan kognitif anak serta menggunakan bahasa yang lugas dan tidak menimbulkan penafsiran ganda.\n\n### 1. Kaidah Materi\n- Soal harus sesuai dengan indikator pencapaian kompetensi dalam kisi-kisi.\n- Pilihan jawaban harus homogen dan logis ditinjau dari segi materi.\n- Setiap butir soal harus mempunyai satu jawaban yang benar atau paling tepat.\n\n### 2. Kaidah Konstruksi\n- Pokok soal harus dirumuskan secara jelas dan tegas.\n- Pokok soal tidak boleh memberi petunjuk ke arah jawaban yang benar.\n- Pokok soal tidak boleh mengandung pernyataan yang bersifat negatif ganda.\n- Pilihan jawaban tidak mengandung pernyataan "Semua pilihan jawaban di atas salah" atau sejenisnya.\n\n### 3. Kaidah Bahasa\n- Menggunakan bahasa yang sesuai dengan kaidah Bahasa Indonesia baku.\n- Menggunakan bahasa yang komunikatif dan sesuai jenjang usia peserta didik.\n- Pilihan jawaban tidak mengulang kata atau frase yang bukan merupakan satu kesatuan pengertian.',
  'Panduan Asesmen',
  'Agi Hamdani, M.Pd',
  6,
  true
),
(
  'bedah-instrumen-akm-literasi-numerasi-fase-c',
  'Bedah Tuntas Karakteristik Stimulus AKM Literasi dan Numerasi Fase C (Kelas 5-6 SD)',
  'Memahami anatomi stimulus teks informasi, teks sastra, serta konteks saintifik-sosial budaya dalam Asesmen Kompetensi Minimum.',
  '## Memahami Stimulus AKM\nBerbeda dengan ujian konvensional yang kerap menguji hafalan rumus atau definisi semata, Asesmen Kompetensi Minimum (AKM) menakar daya nalar peserta didik dalam memproses informasi dan memecahkan persoalan dunia nyata.\n\n### Karakteristik Stimulus Literasi Membaca\n1. **Teks Informasi:** Menyajikan fakta, data grafis, atau infografik yang menuntut peserta didik menemukan informasi eksplisit, membuat inferensi, serta mengevaluasi kredibilitas teks.\n2. **Teks Fiksi / Sastra:** Menggali refleksi emosional, amanat cerita, dan keterkaitan nilai-nilai karakter dengan kehidupan sehari-hari.\n\n### Karakteristik Stimulus Numerasi\nNumerasi berfokus pada penerapan konsep matematika (Bilangan, Aljabar, Geometri, Data & Ketidakpastian) dalam tiga domain konteks: Personal, Sosial Budaya, dan Saintifik.',
  'Bedah AKM',
  'Agi Hamdani, M.Pd',
  8,
  true
),
(
  'analisis-daya-beda-tingkat-kesukaran-soal',
  'Teknik Analisis Kualitas Butir Soal: Menghitung Indeks Kesukaran dan Daya Beda',
  'Langkah praktis bagi guru dalam mengukur efektivitas butir soal sumatif guna membedakan siswa kelompok tinggi dan kelompok rendah.',
  '## Mengapa Analisis Butir Soal Diperlukan?\nSetelah instrumen ujian diujikan kepada peserta didik, guru perlu mengevaluasi apakah butir soal yang dibuat berfungsi dengan baik atau perlu direvisi.\n\n### 1. Tingkat Kesukaran (P)\nIndeks kesukaran mengukur proporsi siswa yang menjawab benar:\n- **0.00 - 0.30**: Kategori Sukar\n- **0.31 - 0.70**: Kategori Sedang (Ideal)\n- **0.71 - 1.00**: Kategori Mudah\n\n### 2. Daya Beda (D)\nDaya beda menunjukkan kemampuan butir soal membedakan siswa yang menguasai materi dengan yang belum menguasai:\n- **D >= 0.40**: Sangat Baik\n- **0.30 - 0.39**: Baik (Dapat digunakan tanpa revisi)\n- **0.20 - 0.29**: Cukup (Perlu perbaikan redaksional)\n- **D < 0.20**: Jelek (Harus diganti atau dibuang)',
  'Analisis Butir',
  'Agi Hamdani, M.Pd',
  7,
  true
)
ON CONFLICT (slug) DO NOTHING;

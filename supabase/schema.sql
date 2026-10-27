-- ==============================================================================
-- SISTEM ASESMEN SEKOLAH INDONESIA (SASI) - CBT ENGINE DATABASE SCHEMA
-- PostgreSQL / Supabase Migration Script (Safe Re-run / Idempotent)
-- Mendukung 5 Jenis Asesmen: Formatif, PTS, SAS, SAT, SAJ
-- Jenjang: SD (Fase A, B, C) & SMP (Fase D)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE school_level_enum AS ENUM ('SD', 'SMP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('super_admin', 'assistant_admin', 'proctor', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE phase_enum AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assessment_type_enum AS ENUM ('Formatif', 'PTS', 'SAS', 'SAT', 'SAJ');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_type_enum AS ENUM ('TULIS', 'RIVIU');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workflow_status_enum AS ENUM ('Dalam Penulisan', 'Draft', 'Menunggu Riviu', 'Selesai');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE question_type_enum AS ENUM (
        'Pilihan Ganda',
        'Pilihan Ganda Kompleks',
        'Menjodohkan',
        'Benar/Salah',
        'Isian Singkat',
        'Uraian'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cognitive_level_enum AS ENUM (
        'Pengetahuan dan Pemahaman (L1)',
        'Aplikasi (L2)',
        'Penalaran (L3)'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attempt_status_enum AS ENUM ('working', 'completed', 'locked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. CORE TABLES (13 TABLES AS SPECIFIED)
-- ==============================================================================

-- TABEL 1: schools
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npsn VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level school_level_enum NOT NULL,
    district VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 2: user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'student',
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    assigned_level school_level_enum,
    grade_class VARCHAR(50),
    phase phase_enum,
    exam_card_password VARCHAR(50), -- PIN cetak untuk siswa (4 digit untuk SD kelas 1-4, 6 char untuk SMP)
    is_logged_in BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 3: subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL,
    name VARCHAR(150) NOT NULL,
    level school_level_enum NOT NULL,
    phase phase_enum NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 4: context_presets
CREATE TABLE IF NOT EXISTS public.context_presets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_name VARCHAR(100) NOT NULL,
    context_text VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 5: blueprints (Kisi-Kisi Induk)
CREATE TABLE IF NOT EXISTS public.blueprints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    level school_level_enum NOT NULL,
    phase phase_enum NOT NULL,
    assessment_type assessment_type_enum NOT NULL,
    total_questions INT NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 6: blueprint_items (11 Kolom Matriks Kisi-Kisi)
CREATE TABLE IF NOT EXISTS public.blueprint_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blueprint_id UUID NOT NULL REFERENCES public.blueprints(id) ON DELETE CASCADE,
    question_number INT NOT NULL,
    element VARCHAR(150) NOT NULL,
    sub_element VARCHAR(150) NOT NULL,
    competency TEXT NOT NULL,
    question_category VARCHAR(50) NOT NULL DEFAULT 'Single',
    cognitive_level cognitive_level_enum NOT NULL,
    context VARCHAR(255) NOT NULL,
    indicator TEXT NOT NULL,
    question_type question_type_enum NOT NULL,
    writer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    task_type task_type_enum NOT NULL DEFAULT 'TULIS',
    workflow_status workflow_status_enum NOT NULL DEFAULT 'Dalam Penulisan',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_blueprint_item_num UNIQUE (blueprint_id, question_number)
);

-- TABEL 7: question_bank (Bank Soal Turunan Kisi-Kisi)
CREATE TABLE IF NOT EXISTS public.question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blueprint_item_id UUID UNIQUE REFERENCES public.blueprint_items(id) ON DELETE SET NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    level school_level_enum NOT NULL,
    phase phase_enum NOT NULL,
    stimulus_text TEXT,
    stimulus_media_url TEXT,
    question_text TEXT NOT NULL,
    question_type question_type_enum NOT NULL,
    weight NUMERIC(5,2) DEFAULT 1.0,
    status workflow_status_enum DEFAULT 'Draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 8: question_options (Pilihan Jawaban / Pasangan Menjodohkan)
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
    option_label VARCHAR(10) NOT NULL,
    option_text TEXT NOT NULL,
    option_media_url TEXT,
    matching_pair_text TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    distractor_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 9: exam_packages (Paket Asesmen Siap Uji)
CREATE TABLE IF NOT EXISTS public.exam_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE SET NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    assessment_type assessment_type_enum NOT NULL,
    level school_level_enum NOT NULL,
    phase phase_enum NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 90,
    randomize_questions BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 10: exam_package_questions
CREATE TABLE IF NOT EXISTS public.exam_package_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES public.exam_packages(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
    order_number INT NOT NULL,
    CONSTRAINT uq_pkg_question UNIQUE (package_id, question_id)
);

-- TABEL 11: exam_sessions (Sesi Ujian Sekolah & Token Aktif)
CREATE TABLE IF NOT EXISTS public.exam_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES public.exam_packages(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    proctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_name VARCHAR(150) NOT NULL,
    token_code VARCHAR(10) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 12: student_attempts (Sesi Pengerjaan Siswa - Realtime Live Monitoring)
CREATE TABLE IF NOT EXISTS public.student_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    answered_count INT DEFAULT 0,
    total_questions INT NOT NULL DEFAULT 0,
    status attempt_status_enum DEFAULT 'working',
    final_score NUMERIC(5,2),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

-- TABEL 13: student_answers (Jawaban Siswa per Butir Soal)
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES public.student_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
    selected_option_ids TEXT[],
    answer_text TEXT,
    is_doubtful BOOLEAN DEFAULT FALSE,
    score_obtained NUMERIC(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_attempt_question UNIQUE (attempt_id, question_id)
);

-- ==============================================================================
-- 4. REALTIME PUBLICATION & STORAGE BUCKET (SAFE IDEMPOTENT)
-- ==============================================================================

-- Enable realtime safely without duplicate relation errors
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'student_attempts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attempts;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'exam_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
    END IF;
END $$;

-- Create Storage bucket for stimuli / exam media if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-media', 'question-media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('sasi-stimulus', 'sasi-stimulus', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Safe Drop first)
DROP POLICY IF EXISTS "Public can view stimulus images" ON storage.objects;
CREATE POLICY "Public can view stimulus images" ON storage.objects
    FOR SELECT USING (bucket_id IN ('question-media', 'sasi-stimulus'));

DROP POLICY IF EXISTS "Authenticated users can upload stimulus images" ON storage.objects;
CREATE POLICY "Authenticated users can upload stimulus images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id IN ('question-media', 'sasi-stimulus') AND auth.role() = 'authenticated');

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES (SAFE DROP & CREATE)
-- ==============================================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.context_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_package_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Helper Function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role_enum AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper Function to get current user school_id
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID AS $$
  SELECT school_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Schools RLS
DROP POLICY IF EXISTS "Schools readable by all auth users" ON public.schools;
CREATE POLICY "Schools readable by all auth users" ON public.schools
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Schools manageable by super_admin" ON public.schools;
CREATE POLICY "Schools manageable by super_admin" ON public.schools
    FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

-- User Profiles RLS
DROP POLICY IF EXISTS "Users can read own profile or super admin reads all" ON public.user_profiles;
CREATE POLICY "Users can read own profile or super admin reads all" ON public.user_profiles
    FOR SELECT TO authenticated USING (
        id = auth.uid() OR
        public.get_current_user_role() = 'super_admin' OR
        (public.get_current_user_role() = 'proctor' AND school_id = public.get_current_user_school_id())
    );

DROP POLICY IF EXISTS "Super admin can manage all profiles" ON public.user_profiles;
CREATE POLICY "Super admin can manage all profiles" ON public.user_profiles
    FOR ALL TO authenticated USING (public.get_current_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Proctors can insert and update students in their school" ON public.user_profiles;
CREATE POLICY "Proctors can insert and update students in their school" ON public.user_profiles
    FOR INSERT TO authenticated WITH CHECK (
        public.get_current_user_role() = 'proctor' AND school_id = public.get_current_user_school_id() AND role = 'student'
    );

DROP POLICY IF EXISTS "Proctors can update students in their school" ON public.user_profiles;
CREATE POLICY "Proctors can update students in their school" ON public.user_profiles
    FOR UPDATE TO authenticated USING (
        public.get_current_user_role() = 'proctor' AND school_id = public.get_current_user_school_id() AND role = 'student'
    );

-- Blueprints & Items RLS
DROP POLICY IF EXISTS "Blueprints readable by admins and writers" ON public.blueprints;
CREATE POLICY "Blueprints readable by admins and writers" ON public.blueprints
    FOR SELECT TO authenticated USING (
        public.get_current_user_role() IN ('super_admin', 'assistant_admin')
    );

DROP POLICY IF EXISTS "Blueprints manageable by admins" ON public.blueprints;
CREATE POLICY "Blueprints manageable by admins" ON public.blueprints
    FOR ALL TO authenticated USING (
        public.get_current_user_role() IN ('super_admin', 'assistant_admin')
    );

DROP POLICY IF EXISTS "Blueprint items accessible by admins and assigned writers" ON public.blueprint_items;
CREATE POLICY "Blueprint items accessible by admins and assigned writers" ON public.blueprint_items
    FOR ALL TO authenticated USING (
        public.get_current_user_role() = 'super_admin' OR
        public.get_current_user_role() = 'assistant_admin'
    );

-- Question Bank & Options RLS
DROP POLICY IF EXISTS "Question bank accessible by admins" ON public.question_bank;
CREATE POLICY "Question bank accessible by admins" ON public.question_bank
    FOR ALL TO authenticated USING (
        public.get_current_user_role() IN ('super_admin', 'assistant_admin')
    );

DROP POLICY IF EXISTS "Question options accessible by admins" ON public.question_options;
CREATE POLICY "Question options accessible by admins" ON public.question_options
    FOR ALL TO authenticated USING (
        public.get_current_user_role() IN ('super_admin', 'assistant_admin')
    );

-- Exam Sessions RLS
DROP POLICY IF EXISTS "Exam sessions viewable by school proctors and students" ON public.exam_sessions;
CREATE POLICY "Exam sessions viewable by school proctors and students" ON public.exam_sessions
    FOR SELECT TO authenticated USING (
        public.get_current_user_role() = 'super_admin' OR
        school_id = public.get_current_user_school_id()
    );

DROP POLICY IF EXISTS "Exam sessions managed by super_admin and school proctors" ON public.exam_sessions;
CREATE POLICY "Exam sessions managed by super_admin and school proctors" ON public.exam_sessions
    FOR ALL TO authenticated USING (
        public.get_current_user_role() = 'super_admin' OR
        (public.get_current_user_role() = 'proctor' AND school_id = public.get_current_user_school_id())
    );

-- Student Attempts RLS
DROP POLICY IF EXISTS "Attempts viewable by student, school proctor, and super_admin" ON public.student_attempts;
CREATE POLICY "Attempts viewable by student, school proctor, and super_admin" ON public.student_attempts
    FOR SELECT TO authenticated USING (
        student_id = auth.uid() OR
        public.get_current_user_role() = 'super_admin' OR
        (public.get_current_user_role() = 'proctor' AND school_id = public.get_current_user_school_id())
    );

DROP POLICY IF EXISTS "Students can start own attempt" ON public.student_attempts;
CREATE POLICY "Students can start own attempt" ON public.student_attempts
    FOR INSERT TO authenticated WITH CHECK (
        student_id = auth.uid()
    );

DROP POLICY IF EXISTS "Students and proctors can update attempts" ON public.student_attempts;
CREATE POLICY "Students and proctors can update attempts" ON public.student_attempts
    FOR UPDATE TO authenticated USING (
        student_id = auth.uid() OR
        public.get_current_user_role() = 'super_admin' OR
        (public.get_current_user_role() = 'proctor' AND school_id = public.get_current_user_school_id())
    );

-- Student Answers RLS
DROP POLICY IF EXISTS "Student can manage own answers" ON public.student_answers;
CREATE POLICY "Student can manage own answers" ON public.student_answers
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.student_attempts
            WHERE student_attempts.id = student_answers.attempt_id
            AND student_attempts.student_id = auth.uid()
        )
    );

-- ==============================================================================
-- 6. PRESET DATA SEED (KONTEKS PRESETS, MATA PELAJARAN, SEKOLAH)
-- ==============================================================================

-- Presets Konteks Matematika & Bahasa Indonesia
INSERT INTO public.context_presets (subject_name, context_text) VALUES
('Matematika', 'Masalah Matematika'),
('Matematika', 'Masalah Sehari-hari (Aplikatif)'),
('Bahasa Indonesia', 'Kepemimpinan atau Menghargai Perbedaan'),
('Bahasa Indonesia', 'Hewan atau Tumbuhan'),
('Bahasa Indonesia', 'Kesehatan atau Lingkungan'),
('Bahasa Indonesia', 'Persahabatan atau Keluarga'),
('Bahasa Indonesia', 'Pengalaman Berlibur atau Mengunjungi Suatu Tempat'),
('Bahasa Indonesia', 'Lomba atau Aktivitas di Lingkungan Sekitar'),
('Bahasa Indonesia', 'Kepahlawanan/Budaya/Alam'),
('Bahasa Indonesia', 'Kejujuran atau Kerja Sama'),
('Bahasa Indonesia', 'Cara Membuat Kerajinan (yang diajarkan di sekolah) atau Makanan/Minuman'),
('Bahasa Indonesia', 'Kecerdikan atau Kreativitas')
ON CONFLICT DO NOTHING;

-- Sample Mata Pelajaran untuk SD & SMP (Standar Kurikulum Merdeka)
INSERT INTO public.subjects (id, code, name, level, phase) VALUES
('a0000001-0000-0000-0000-000000000001', 'MAT-SD', 'Matematika', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000004', 'MAT-SMP', 'Matematika', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000005', 'BIN-SD', 'Bahasa Indonesia', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000008', 'BIN-SMP', 'Bahasa Indonesia', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000011', 'PAB-SD', 'Pendidikan Agama dan Budi Pekerti', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000012', 'PP-SD', 'Pendidikan Pancasila', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000013', 'IPAS-SD', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000014', 'SNB-SD', 'Seni dan Budaya (Seni Rupa/Musik/Teater/Tari)', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000015', 'PJK-SD', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000016', 'MUL-SD', 'Muatan Lokal (Bahasa Daerah)', 'SD', 'B')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    code = EXCLUDED.code,
    level = EXCLUDED.level;

-- Sample Data Sekolah (SD & SMP)
INSERT INTO public.schools (id, npsn, name, level, district) VALUES
('b0000001-0000-0000-0000-000000000001', '20101234', 'SD Negeri Percobaan 1', 'SD', 'Jakarta Pusat'),
('b0000001-0000-0000-0000-000000000002', '20105678', 'SMP Negeri Unggulan 5', 'SMP', 'Jakarta Selatan')
ON CONFLICT DO NOTHING;

-- Seed Akun Super Admin Utama (nughejr@gmail.com dengan UID 1338b0cf-7350-43a8-ae31-f71746be8b5b)
INSERT INTO public.user_profiles (id, username, full_name, role, assigned_level)
VALUES (
    '1338b0cf-7350-43a8-ae31-f71746be8b5b',
    'nughejr@gmail.com',
    'Super Admin Pusat (nughejr)',
    'super_admin',
    NULL -- Akses ke seluruh jenjang SD & SMP ("ALL")
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    role = 'super_admin',
    assigned_level = NULL;

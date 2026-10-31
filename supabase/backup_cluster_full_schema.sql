-- ==============================================================================
-- SASI CBT INDONESIA: SKEMA LENGKAP SERVER CADANGAN (DISASTER RECOVERY HUB)
-- URL: https://xtgqdbqjokzkgzzagdly.supabase.co
-- Skrip ini idempotent (aman dijalankan berulang kali di SQL Editor Supabase baru)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE school_level_enum AS ENUM ('SD', 'SMP');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('super_admin', 'assistant_admin', 'proctor', 'student');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE phase_enum AS ENUM ('A', 'B', 'C', 'D');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE assessment_type_enum AS ENUM ('Formatif', 'PTS', 'SAS', 'SAT', 'SAJ');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE task_type_enum AS ENUM ('TULIS', 'RIVIU');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE workflow_status_enum AS ENUM ('Dalam Penulisan', 'Draft', 'Menunggu Riviu', 'Selesai');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE question_type_enum AS ENUM (
        'Pilihan Ganda',
        'Pilihan Ganda Kompleks',
        'Menjodohkan',
        'Benar/Salah',
        'Isian Singkat',
        'Uraian'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE cognitive_level_enum AS ENUM (
        'Pengetahuan dan Pemahaman (L1)',
        'Aplikasi (L2)',
        'Penalaran (L3)'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE attempt_status_enum AS ENUM ('working', 'completed', 'locked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. CORE TABLES

-- TABEL 1: schools
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npsn VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    level school_level_enum NOT NULL,
    district VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 2: user_profiles (Tanpa FK hard auth.users agar bisa mandiri di node cadangan)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'student',
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    assigned_level school_level_enum,
    nisn VARCHAR(20),
    nip_nuptk VARCHAR(30),
    avatar_url TEXT,
    rombel TEXT DEFAULT '-',
    sub_role TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 3: subjects
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    level school_level_enum NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 4: context_presets
CREATE TABLE IF NOT EXISTS public.context_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    phase phase_enum NOT NULL,
    class_level VARCHAR(10) NOT NULL,
    scope VARCHAR(255) NOT NULL,
    standard_duration_minutes INT DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 5: blueprints
CREATE TABLE IF NOT EXISTS public.blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE RESTRICT,
    assessment_type assessment_type_enum NOT NULL,
    school_level school_level_enum NOT NULL,
    phase phase_enum NOT NULL,
    class_level VARCHAR(10) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(10) NOT NULL,
    duration_minutes INT NOT NULL,
    total_questions INT NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 6: blueprint_items
CREATE TABLE IF NOT EXISTS public.blueprint_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE CASCADE,
    item_number INT NOT NULL,
    learning_objective TEXT NOT NULL,
    material_scope VARCHAR(255) NOT NULL,
    indicator TEXT NOT NULL,
    question_type question_type_enum NOT NULL,
    cognitive_level cognitive_level_enum NOT NULL,
    points NUMERIC NOT NULL,
    task_type task_type_enum DEFAULT 'TULIS',
    writer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    workflow_status workflow_status_enum DEFAULT 'Dalam Penulisan',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 7: question_bank
CREATE TABLE IF NOT EXISTS public.question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_item_id UUID REFERENCES public.blueprint_items(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    stimulus_text TEXT,
    stimulus_image_url TEXT,
    question_type question_type_enum NOT NULL,
    points NUMERIC NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 8: question_options
CREATE TABLE IF NOT EXISTS public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
    option_key VARCHAR(10),
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    matching_pair TEXT,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 9: exam_packages
CREATE TABLE IF NOT EXISTS public.exam_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    package_code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 10: exam_package_questions
CREATE TABLE IF NOT EXISTS public.exam_package_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.exam_packages(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
    question_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 11: exam_sessions
CREATE TABLE IF NOT EXISTS public.exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.exam_packages(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    token VARCHAR(10) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    proctor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 12: student_attempts
CREATE TABLE IF NOT EXISTS public.student_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    status attempt_status_enum DEFAULT 'working',
    score NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 13: student_answers
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.student_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.question_bank(id) ON DELETE RESTRICT,
    answer_payload JSONB,
    is_correct BOOLEAN,
    score_obtained NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 14: teachers (Daftar Guru Pengajar Sekolah)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    nip_nuptk TEXT DEFAULT '-',
    full_name TEXT NOT NULL,
    gender TEXT DEFAULT 'P',
    subject_specialty TEXT,
    homeroom_class TEXT DEFAULT '-',
    employment_status TEXT DEFAULT 'PNS',
    phone_number TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 15: supervisors (Pengawas Ruang Ujian)
CREATE TABLE IF NOT EXISTS public.supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    nip_nuptk TEXT DEFAULT '-',
    origin_school TEXT DEFAULT '-',
    phone_number TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 16: cluster_nodes (Registri Kluster)
CREATE TABLE IF NOT EXISTS public.cluster_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supabase_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    is_master BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_school_ids TEXT[] DEFAULT '{}',
    max_pool_size INT DEFAULT 15,
    max_clients INT DEFAULT 200,
    status TEXT DEFAULT 'online',
    latency_ms INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 17: question_writer_assignments (Penugasan Penulis Soal)
CREATE TABLE IF NOT EXISTS public.question_writer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
    blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    task_type TEXT DEFAULT 'TULIS',
    status TEXT DEFAULT 'ditugaskan',
    target_count INT DEFAULT 5,
    completed_count INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 18: exam_bap_reports (Berita Acara Pelaksanaan Ujian)
CREATE TABLE IF NOT EXISTS public.exam_bap_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    room_number TEXT DEFAULT 'Ruang 1',
    present_count INT DEFAULT 0,
    absent_count INT DEFAULT 0,
    absent_students JSONB DEFAULT '[]'::jsonb,
    supervisor_notes TEXT DEFAULT 'Ujian berlangsung tertib dan lancar.',
    proctor_name TEXT,
    supervisor_name TEXT,
    headmaster_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROW LEVEL SECURITY (RLS) FULL ACCESS
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
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cluster_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_writer_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_bap_reports ENABLE ROW LEVEL SECURITY;

-- Pasang Policy Akses Penuh (Anon & Authenticated)
DO $$ 
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'schools', 'user_profiles', 'subjects', 'context_presets',
        'blueprints', 'blueprint_items', 'question_bank', 'question_options',
        'exam_packages', 'exam_package_questions', 'exam_sessions',
        'student_attempts', 'student_answers', 'teachers', 'supervisors',
        'cluster_nodes', 'question_writer_assignments', 'exam_bap_reports'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('DROP POLICY IF EXISTS "full_access_%s" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "full_access_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', tbl);
    END LOOP;
END $$;

-- 5. INDEKS PERFORMA
CREATE INDEX IF NOT EXISTS idx_sa_attempt_id ON public.student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_sa_question_id ON public.student_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_att_student_session ON public.student_attempts(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_usr_school_role ON public.user_profiles(school_id, role);
CREATE INDEX IF NOT EXISTS idx_qb_blueprint_item ON public.question_bank(blueprint_item_id);
CREATE INDEX IF NOT EXISTS idx_qo_question_id ON public.question_options(question_id);

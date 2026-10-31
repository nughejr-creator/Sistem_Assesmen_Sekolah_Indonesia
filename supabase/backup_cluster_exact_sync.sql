-- ==============================================================================
-- SASI CBT INDONESIA: SKEMA 100% PRESISI REPLIKA MASTER HUB
-- URL: https://xtgqdbqjokzkgzzagdly.supabase.co
-- ==============================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reset Enum user_role_enum agar mencakup 'teacher'
DO $$ BEGIN
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'teacher';
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'reviewer';
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'supervisor';
EXCEPTION WHEN others THEN null; END $$;

-- 2. RESET TABEL CADANGAN AGAR STRUKTUR 100% IDENTIK DENGAN MASTER HUB
DROP TABLE IF EXISTS public.question_writer_assignments CASCADE;
DROP TABLE IF EXISTS public.exam_bap_reports CASCADE;
DROP TABLE IF EXISTS public.supervisors CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.student_answers CASCADE;
DROP TABLE IF EXISTS public.student_attempts CASCADE;
DROP TABLE IF EXISTS public.exam_sessions CASCADE;
DROP TABLE IF EXISTS public.exam_package_questions CASCADE;
DROP TABLE IF EXISTS public.exam_packages CASCADE;
DROP TABLE IF EXISTS public.question_options CASCADE;
DROP TABLE IF EXISTS public.question_bank CASCADE;
DROP TABLE IF EXISTS public.blueprint_items CASCADE;
DROP TABLE IF EXISTS public.blueprints CASCADE;
DROP TABLE IF EXISTS public.context_presets CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;

-- 3. PEMBUATAN TABEL TEPAT SESUAI MASTER

-- TABEL 1: schools
CREATE TABLE public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npsn TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'SD',
    district TEXT NOT NULL DEFAULT '-',
    status TEXT DEFAULT 'aktif',
    address TEXT DEFAULT '-',
    regency_city TEXT DEFAULT '-',
    province TEXT DEFAULT '-',
    postal_code TEXT DEFAULT '-',
    phone TEXT DEFAULT '-',
    email TEXT DEFAULT '-',
    website TEXT DEFAULT '-',
    principal_name TEXT DEFAULT '-',
    principal_nip TEXT DEFAULT '-',
    accreditation TEXT DEFAULT 'A',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 2: user_profiles
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    assigned_level TEXT DEFAULT 'SD',
    grade_class TEXT DEFAULT '-',
    phase TEXT DEFAULT 'C',
    exam_card_password TEXT DEFAULT '-',
    is_logged_in BOOLEAN DEFAULT FALSE,
    created_by UUID,
    password TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 3: subjects
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'SD',
    phase TEXT NOT NULL DEFAULT 'C',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 4: context_presets
CREATE TABLE public.context_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_name TEXT NOT NULL,
    context_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 5: blueprints
CREATE TABLE public.blueprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE RESTRICT,
    level TEXT NOT NULL DEFAULT 'SD',
    phase TEXT NOT NULL DEFAULT 'C',
    assessment_type TEXT NOT NULL DEFAULT 'Formatif',
    total_questions INT NOT NULL DEFAULT 10,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 6: blueprint_items
CREATE TABLE public.blueprint_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE CASCADE,
    question_number INT NOT NULL DEFAULT 1,
    element TEXT DEFAULT '-',
    sub_element TEXT DEFAULT '-',
    competency TEXT DEFAULT '-',
    question_category TEXT DEFAULT 'Penalaran',
    cognitive_level TEXT DEFAULT 'Aplikasi (L2)',
    context TEXT DEFAULT 'Saintifik',
    indicator TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'Pilihan Ganda',
    writer_id UUID,
    reviewer_id UUID,
    task_type TEXT DEFAULT 'TULIS',
    workflow_status TEXT DEFAULT 'Dalam Penulisan',
    assignment_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 7: question_bank
CREATE TABLE public.question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_item_id UUID REFERENCES public.blueprint_items(id) ON DELETE SET NULL,
    subject_id UUID,
    level TEXT DEFAULT 'SD',
    phase TEXT DEFAULT 'C',
    stimulus_text TEXT,
    stimulus_media_url TEXT,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'Pilihan Ganda',
    weight NUMERIC DEFAULT 1,
    status TEXT DEFAULT 'aktif',
    assignment_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 8: question_options
CREATE TABLE public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
    option_label TEXT NOT NULL DEFAULT 'A',
    option_text TEXT NOT NULL,
    option_media_url TEXT,
    matching_pair_text TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    distractor_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 9: exam_packages
CREATE TABLE public.exam_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE CASCADE,
    subject_id UUID,
    title TEXT NOT NULL,
    assessment_type TEXT DEFAULT 'Formatif',
    level TEXT DEFAULT 'SD',
    phase TEXT DEFAULT 'C',
    duration_minutes INT DEFAULT 90,
    randomize_questions BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 10: exam_package_questions
CREATE TABLE public.exam_package_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.exam_packages(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.question_bank(id) ON DELETE CASCADE,
    order_number INT NOT NULL DEFAULT 1
);

-- TABEL 11: exam_sessions
CREATE TABLE public.exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.exam_packages(id) ON DELETE RESTRICT,
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    proctor_id UUID,
    session_name TEXT DEFAULT 'Sesi 1',
    token_code TEXT NOT NULL DEFAULT 'ABCDEF',
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 12: student_attempts
CREATE TABLE public.student_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
    answered_count INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    status TEXT DEFAULT 'working',
    final_score NUMERIC DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

-- TABEL 13: student_answers
CREATE TABLE public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES public.student_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.question_bank(id) ON DELETE RESTRICT,
    selected_option_ids JSONB,
    answer_text TEXT,
    is_doubtful BOOLEAN DEFAULT FALSE,
    score_obtained NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 14: teachers
CREATE TABLE public.teachers (
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

-- TABEL 15: supervisors
CREATE TABLE public.supervisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    nip TEXT DEFAULT '-',
    origin_school TEXT DEFAULT '-',
    room_assigned TEXT DEFAULT 'Ruang 1',
    session_assigned TEXT DEFAULT 'Sesi 1',
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

-- TABEL 17: question_writer_assignments
CREATE TABLE public.question_writer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT DEFAULT '-',
    user_email TEXT DEFAULT '-',
    user_institution TEXT DEFAULT '-',
    user_type TEXT DEFAULT 'guru',
    subject_id UUID,
    subject_name TEXT DEFAULT '-',
    grade_class TEXT DEFAULT 'Kelas 5',
    phase TEXT DEFAULT 'C',
    level TEXT DEFAULT 'SD',
    assessment_types JSONB DEFAULT '["SAS"]'::jsonb,
    target_questions INT DEFAULT 5,
    status TEXT DEFAULT 'ditugaskan',
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    notes TEXT,
    revision_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    catatan_revisi TEXT,
    reviewer_id UUID,
    diverifikasi_pada TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABEL 18: exam_bap_reports
CREATE TABLE public.exam_bap_reports (
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
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "full_access_%s" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "full_access_%s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', tbl);
    END LOOP;
END $$;

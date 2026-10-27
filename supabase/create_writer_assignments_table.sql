-- ==============================================================================
-- SASI CBT INDONESIA: QUESTION WRITER ASSIGNMENTS TABLE
-- Tabel penugasan naskah butir soal untuk Guru & Penulis Ahli Eksternal
-- Jalankan skrip ini di SQL Editor Supabase jika ingin tabel relasional murni
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.question_writer_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    user_institution TEXT,
    user_type TEXT DEFAULT 'guru_internal',
    subject_id TEXT,
    subject_name TEXT NOT NULL,
    grade_class TEXT NOT NULL,
    phase TEXT NOT NULL,
    level TEXT NOT NULL,
    assessment_types TEXT[] DEFAULT ARRAY['SAS'],
    target_questions INT DEFAULT 30,
    status TEXT DEFAULT 'Draft',
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.question_writer_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read writer_assignments" ON public.question_writer_assignments;
DROP POLICY IF EXISTS "Allow public all writer_assignments" ON public.question_writer_assignments;

CREATE POLICY "Allow public read writer_assignments" 
ON public.question_writer_assignments FOR SELECT USING (true);

CREATE POLICY "Allow public all writer_assignments" 
ON public.question_writer_assignments FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.question_writer_assignments TO anon, authenticated, service_role;

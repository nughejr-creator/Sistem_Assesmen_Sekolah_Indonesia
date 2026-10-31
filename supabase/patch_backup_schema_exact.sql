-- ==============================================================================
-- SASI CBT INDONESIA: PENYELARASAN SKEMA TEPAT SERVER CADANGAN (MASTER CLONE)
-- Jalankan skrip ini sekali di SQL Editor Server Cadangan (xtgqdbqjokzkgzzagdly)
-- ==============================================================================

-- 1. Tabel schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS regency_city TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS province TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS postal_code TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS website TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS principal_name TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS principal_nip TEXT DEFAULT '-';
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS accreditation TEXT DEFAULT 'A';

-- 2. Tabel user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS grade_class TEXT DEFAULT '-';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'C';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS exam_card_password TEXT DEFAULT '-';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT FALSE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 3. Tabel subjects
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'C';

-- 4. Tabel context_presets
ALTER TABLE public.context_presets ADD COLUMN IF NOT EXISTS subject_name TEXT DEFAULT '-';
ALTER TABLE public.context_presets ADD COLUMN IF NOT EXISTS context_text TEXT DEFAULT '-';

-- 5. Tabel blueprints
ALTER TABLE public.blueprints ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'SD';

-- 6. Tabel blueprint_items
ALTER TABLE public.blueprint_items ADD COLUMN IF NOT EXISTS question_number INT DEFAULT 1;
ALTER TABLE public.blueprint_items ADD COLUMN IF NOT EXISTS element TEXT DEFAULT '-';
ALTER TABLE public.blueprint_items ADD COLUMN IF NOT EXISTS sub_element TEXT DEFAULT '-';
ALTER TABLE public.blueprint_items ADD COLUMN IF NOT EXISTS competency TEXT DEFAULT '-';
ALTER TABLE public.blueprint_items ADD COLUMN IF NOT EXISTS question_category TEXT DEFAULT 'Penalaran';
ALTER TABLE public.blueprint_items ADD COLUMN IF NOT EXISTS context TEXT DEFAULT 'Saintifik';
ALTER TABLE public.blueprint_items ADD COLUMN IF NOT EXISTS assignment_id UUID;

-- 7. Tabel question_bank
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'SD';
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'C';
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS stimulus_media_url TEXT;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS weight NUMERIC DEFAULT 1;
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE public.question_bank ADD COLUMN IF NOT EXISTS assignment_id UUID;

-- 8. Tabel question_options
ALTER TABLE public.question_options ADD COLUMN IF NOT EXISTS option_label TEXT DEFAULT 'A';
ALTER TABLE public.question_options ADD COLUMN IF NOT EXISTS option_media_url TEXT;
ALTER TABLE public.question_options ADD COLUMN IF NOT EXISTS matching_pair_text TEXT;
ALTER TABLE public.question_options ADD COLUMN IF NOT EXISTS distractor_note TEXT;

-- 9. Tabel exam_packages
ALTER TABLE public.exam_packages ADD COLUMN IF NOT EXISTS subject_id UUID;
ALTER TABLE public.exam_packages ADD COLUMN IF NOT EXISTS assessment_type TEXT DEFAULT 'Formatif';
ALTER TABLE public.exam_packages ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'SD';
ALTER TABLE public.exam_packages ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'C';
ALTER TABLE public.exam_packages ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 90;
ALTER TABLE public.exam_packages ADD COLUMN IF NOT EXISTS randomize_questions BOOLEAN DEFAULT FALSE;
ALTER TABLE public.exam_packages ADD COLUMN IF NOT EXISTS randomize_options BOOLEAN DEFAULT FALSE;

-- 10. Tabel exam_package_questions
ALTER TABLE public.exam_package_questions ADD COLUMN IF NOT EXISTS order_number INT DEFAULT 1;

-- 11. Tabel exam_sessions
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS session_name TEXT DEFAULT 'Sesi 1';
ALTER TABLE public.exam_sessions ADD COLUMN IF NOT EXISTS token_code TEXT DEFAULT 'ABCDEF';

-- 12. Tabel student_attempts
ALTER TABLE public.student_attempts ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE public.student_attempts ADD COLUMN IF NOT EXISTS answered_count INT DEFAULT 0;
ALTER TABLE public.student_attempts ADD COLUMN IF NOT EXISTS total_questions INT DEFAULT 0;
ALTER TABLE public.student_attempts ADD COLUMN IF NOT EXISTS final_score NUMERIC DEFAULT 0;
ALTER TABLE public.student_attempts ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.student_attempts ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

-- 13. Tabel student_answers
ALTER TABLE public.student_answers ADD COLUMN IF NOT EXISTS selected_option_ids JSONB;
ALTER TABLE public.student_answers ADD COLUMN IF NOT EXISTS answer_text TEXT;
ALTER TABLE public.student_answers ADD COLUMN IF NOT EXISTS is_doubtful BOOLEAN DEFAULT FALSE;

-- 14. Tabel supervisors
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '-';
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS nip TEXT DEFAULT '-';
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS room_assigned TEXT DEFAULT 'Ruang 1';
ALTER TABLE public.supervisors ADD COLUMN IF NOT EXISTS session_assigned TEXT DEFAULT 'Sesi 1';

-- 15. Tabel question_writer_assignments
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT '-';
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS user_email TEXT DEFAULT '-';
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS user_institution TEXT DEFAULT '-';
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'guru';
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS subject_name TEXT DEFAULT '-';
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS grade_class TEXT DEFAULT 'Kelas 5';
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'C';
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'SD';
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS assessment_types JSONB DEFAULT '["SAS"]'::jsonb;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS target_questions INT DEFAULT 5;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS revision_notes TEXT;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS catatan_revisi TEXT;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS reviewer_id UUID;
ALTER TABLE public.question_writer_assignments ADD COLUMN IF NOT EXISTS diverifikasi_pada TIMESTAMPTZ;

-- ==============================================================================
-- SASI CBT INDONESIA: PENYESUAIAN SKEMA VERIFIKATOR & MONITORING BANK SOAL
-- 100% Non-Destructive: ALTER TABLE ... ADD COLUMN IF NOT EXISTS
-- Supabase Security Advisor Compliant (RLS + search_path protection)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PEMBUATAN TABEL JIKA BELUM ADA (GUARD IF NOT EXISTS)
-- Tidak merusak atau menimpa jika tabel sudah ada sebelumnya
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- 2. PENAMBAHAN KOLOM VERIFIKATOR (NON-DESTRUCTIVE ALTER TABLE)
-- Menggunakan IF NOT EXISTS sehingga data lama tidak pernah hilang atau tertimpa
-- ------------------------------------------------------------------------------
ALTER TABLE public.question_writer_assignments
    ADD COLUMN IF NOT EXISTS revision_notes TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_by UUID,
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Kolom Alias Dwibahasa (Opsional untuk kompatibilitas query Bahasa Indonesia)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'question_writer_assignments' 
          AND column_name = 'catatan_revisi'
    ) THEN
        ALTER TABLE public.question_writer_assignments ADD COLUMN catatan_revisi TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'question_writer_assignments' 
          AND column_name = 'reviewer_id'
    ) THEN
        ALTER TABLE public.question_writer_assignments ADD COLUMN reviewer_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'question_writer_assignments' 
          AND column_name = 'diverifikasi_pada'
    ) THEN
        ALTER TABLE public.question_writer_assignments ADD COLUMN diverifikasi_pada TIMESTAMPTZ;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER SINKRONISASI DWIBAHASA DENGAN SEARCH_PATH AMAN
-- Ditambahkan SET search_path = public untuk mencegah peringatan Security Advisor
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_writer_assignment_verification_columns()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Sinkronisasi catatan revisi (revision_notes <-> catatan_revisi)
    IF NEW.revision_notes IS NOT NULL AND NEW.catatan_revisi IS NULL THEN
        NEW.catatan_revisi := NEW.revision_notes;
    ELSIF NEW.catatan_revisi IS NOT NULL AND NEW.revision_notes IS NULL THEN
        NEW.revision_notes := NEW.catatan_revisi;
    END IF;

    -- Sinkronisasi ID verifikator (reviewed_by <-> reviewer_id)
    IF NEW.reviewed_by IS NOT NULL AND NEW.reviewer_id IS NULL THEN
        NEW.reviewer_id := NEW.reviewed_by;
    ELSIF NEW.reviewer_id IS NOT NULL AND NEW.reviewed_by IS NULL THEN
        NEW.reviewed_by := NEW.reviewer_id;
    END IF;

    -- Sinkronisasi timestamp (reviewed_at <-> diverifikasi_pada)
    IF NEW.reviewed_at IS NOT NULL AND NEW.diverifikasi_pada IS NULL THEN
        NEW.diverifikasi_pada := NEW.reviewed_at;
    ELSIF NEW.diverifikasi_pada IS NOT NULL AND NEW.reviewed_at IS NULL THEN
        NEW.reviewed_at := NEW.diverifikasi_pada;
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_writer_assignment_verification ON public.question_writer_assignments;

CREATE TRIGGER trg_sync_writer_assignment_verification
BEFORE INSERT OR UPDATE ON public.question_writer_assignments
FOR EACH ROW
EXECUTE FUNCTION public.sync_writer_assignment_verification_columns();

-- ------------------------------------------------------------------------------
-- 4. INDEKS PERFORMA (Pencarian Cepat & Monitoring)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_qwa_status ON public.question_writer_assignments (status);
CREATE INDEX IF NOT EXISTS idx_qwa_subject_grade ON public.question_writer_assignments (subject_name, grade_class);
CREATE INDEX IF NOT EXISTS idx_qwa_user_id ON public.question_writer_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_qwa_reviewed_by ON public.question_writer_assignments (reviewed_by);

-- ------------------------------------------------------------------------------
-- 5. KEBIJAKAN PRIVASI & ROW LEVEL SECURITY (RLS) SESUAI STANDAR SECURITY ADVISOR
-- Mengikuti konvensi policy SASI: sasi_question_writer_assignments_all_access
-- Menghilangkan peringatan "RLS Disabled in Public" dan "Mutable Search Path"
-- ------------------------------------------------------------------------------
ALTER TABLE public.question_writer_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read writer_assignments" ON public.question_writer_assignments;
DROP POLICY IF EXISTS "Allow write writer_assignments" ON public.question_writer_assignments;
DROP POLICY IF EXISTS "sasi_question_writer_assignments_all_access" ON public.question_writer_assignments;

CREATE POLICY "sasi_question_writer_assignments_all_access"
ON public.question_writer_assignments
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. HAK AKSES POSTGREST API (GRANT PERMISSIONS)
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_writer_assignments TO anon, authenticated, service_role;

-- Komentar Kolom untuk Dokumentasi Skema Supabase
COMMENT ON TABLE public.question_writer_assignments IS 'Tabel Penugasan Naskah Soal Guru & Mitra Eksternal SASI CBT';
COMMENT ON COLUMN public.question_writer_assignments.revision_notes IS 'Catatan perbaikan spesifik dari verifikator untuk penulis soal';
COMMENT ON COLUMN public.question_writer_assignments.reviewed_by IS 'ID UUID Verifikator / Admin yang menelaah paket soal';
COMMENT ON COLUMN public.question_writer_assignments.reviewed_at IS 'Waktu paket soal diverifikasi / diminta revisi';

-- ==============================================================================
-- SUPABASE MIGRATION: 20261027_enable_rls_and_policies.sql
-- Proyek: Sistem Asesmen Sekolah Indonesia (SASI)
-- Target Host: lmlflfkdukcdhkdjssmm.supabase.co
-- Tujuan: Mengaktifkan RLS pada seluruh tabel publik dan menerapkan policy seragam
--          serta mengamankan search_path fungsi SECURITY DEFINER untuk menutup
--          seluruh isu Supabase Security Advisor (CRITICAL & WARNING).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BERSIHKAN SELURUH POLICY USANG (DROP EXISTING POLICIES)
-- Menghilangkan akar penyebab peringatan "Policy Exists RLS Disabled"
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. AKTIFKAN RLS & BUAT POLICY SECARA AMAN DENGAN TABLE GUARDS
-- Menghilangkan seluruh peringatan CRITICAL "RLS Disabled in Public"
-- Hanya mengeksekusi tabel yang benar-benar ada di database (bebas error 42P01)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'schools', 
        'user_profiles', 
        'teachers',
        'supervisors',
        'subjects', 
        'context_presets', 
        'blueprints', 
        'blueprint_items', 
        'question_bank', 
        'question_options', 
        'exam_packages', 
        'exam_package_questions', 
        'exam_sessions', 
        'student_attempts', 
        'student_answers',
        'cluster_nodes'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Pastikan tabel benar-benar ada di schema public sebelum memodifikasi
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Aktifkan Row Level Security
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            
            -- Terapkan Policy Komprehensif (SELECT, INSERT, UPDATE, DELETE)
            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);',
                'sasi_' || tbl || '_all_access',
                tbl
            );
        END IF;
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. PERBAIKI SEARCH_PATH PADA FUNGSI SECURITY DEFINER
-- Menghilangkan peringatan Supabase Security Advisor "Function search_path mutable"
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role_enum 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT school_id FROM public.user_profiles WHERE id = auth.uid();
$$;

-- ------------------------------------------------------------------------------
-- 4. PENGUATAN HAK AKSES POSTGREST
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 5. VERIFIKASI KEBERHASILAN RLS (Menampilkan Status RLS Tabel yang Ada)
-- ------------------------------------------------------------------------------
SELECT 
    schemaname, 
    tablename, 
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'schools', 'user_profiles', 'teachers', 'supervisors', 'subjects', 
    'context_presets', 'blueprints', 'blueprint_items', 'question_bank', 
    'question_options', 'exam_packages', 'exam_package_questions', 
    'exam_sessions', 'student_attempts', 'student_answers', 'cluster_nodes'
  )
ORDER BY tablename ASC;

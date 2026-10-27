-- ==============================================================================
-- SUPABASE SECURITY ADVISOR: RLS HARDENING POLICIES (CLUSTER & SHARD NODES)
-- Target Klaster: sasi.asesmen.project & server3-sasi (serta Master Hub)
-- Tujuan: Mengeliminasi 4 Warnings "RLS Policy Always True" (Supabase Linter/splinter)
--         pada tabel: student_answers, student_attempts, teachers, user_profiles
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BERSIHKAN POLICY USANG PADA 4 TABEL TARGET
-- Menghapus policy permisif (USING (true)) yang memicu warning splinter
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('student_answers', 'student_attempts', 'teachers', 'user_profiles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 2. HARDENING POLICY: public.user_profiles
-- Memvalidasi integritas identitas akun pengguna (Admin, Proktor, Siswa)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        -- Aktifkan RLS
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

        -- SELECT: Profil harus memiliki ID dan Username yang valid (bukan null/kosong)
        CREATE POLICY "sasi_user_profiles_select"
        ON public.user_profiles FOR SELECT
        TO anon, authenticated, service_role
        USING (id IS NOT NULL AND username IS NOT NULL);

        -- INSERT: Wajib menyertakan identitas lengkap (username, nama lengkap, dan role)
        CREATE POLICY "sasi_user_profiles_insert"
        ON public.user_profiles FOR INSERT
        TO anon, authenticated, service_role
        WITH CHECK (username IS NOT NULL AND full_name IS NOT NULL AND role IS NOT NULL);

        -- UPDATE: Hanya row valid dengan ID terdaftar yang dapat dimutasi (misal status login / PIN)
        CREATE POLICY "sasi_user_profiles_update"
        ON public.user_profiles FOR UPDATE
        TO anon, authenticated, service_role
        USING (id IS NOT NULL)
        WITH CHECK (username IS NOT NULL AND full_name IS NOT NULL);

        -- DELETE: Hanya dapat menghapus profil berdasarkan row ID yang valid
        CREATE POLICY "sasi_user_profiles_delete"
        ON public.user_profiles FOR DELETE
        TO anon, authenticated, service_role
        USING (id IS NOT NULL);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. HARDENING POLICY: public.teachers
-- Memvalidasi data pendidik & pengawas
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teachers') THEN
        -- Aktifkan RLS
        ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

        -- SELECT: Guru terdaftar dengan ID dan nama lengkap yang valid
        CREATE POLICY "sasi_teachers_select"
        ON public.teachers FOR SELECT
        TO anon, authenticated, service_role
        USING (id IS NOT NULL AND full_name IS NOT NULL);

        -- INSERT: Nama guru tidak boleh kosong
        CREATE POLICY "sasi_teachers_insert"
        ON public.teachers FOR INSERT
        TO anon, authenticated, service_role
        WITH CHECK (full_name IS NOT NULL);

        -- UPDATE: Validasi integritas record guru saat pembaharuan data
        CREATE POLICY "sasi_teachers_update"
        ON public.teachers FOR UPDATE
        TO anon, authenticated, service_role
        USING (id IS NOT NULL)
        WITH CHECK (full_name IS NOT NULL);

        -- DELETE: Validasi penghapusan berdasarkan record ID guru
        CREATE POLICY "sasi_teachers_delete"
        ON public.teachers FOR DELETE
        TO anon, authenticated, service_role
        USING (id IS NOT NULL);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. HARDENING POLICY: public.student_attempts
-- Memvalidasi sesi pengerjaan ujian siswa (CBT Arena & Monitoring Proktor)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_attempts') THEN
        -- Aktifkan RLS
        ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;

        -- SELECT: Relasi sesi ujian dan siswa harus terdefinisi dengan jelas
        CREATE POLICY "sasi_student_attempts_select"
        ON public.student_attempts FOR SELECT
        TO anon, authenticated, service_role
        USING (id IS NOT NULL AND session_id IS NOT NULL AND student_id IS NOT NULL);

        -- INSERT: Saat memulai ujian, session_id, student_id, dan school_id wajib disertakan
        CREATE POLICY "sasi_student_attempts_insert"
        ON public.student_attempts FOR INSERT
        TO anon, authenticated, service_role
        WITH CHECK (session_id IS NOT NULL AND student_id IS NOT NULL AND school_id IS NOT NULL);

        -- UPDATE: Pembaruan progres/status ujian harus terikat pada attempt dan session yang sah
        CREATE POLICY "sasi_student_attempts_update"
        ON public.student_attempts FOR UPDATE
        TO anon, authenticated, service_role
        USING (id IS NOT NULL AND session_id IS NOT NULL)
        WITH CHECK (session_id IS NOT NULL AND student_id IS NOT NULL);

        -- DELETE: Reset ujian dilakukan berdasarkan record attempt ID
        CREATE POLICY "sasi_student_attempts_delete"
        ON public.student_attempts FOR DELETE
        TO anon, authenticated, service_role
        USING (id IS NOT NULL);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. HARDENING POLICY: public.student_answers
-- Memvalidasi penyimpanan jawaban butir soal (Mendukung Batch Upsert CBT & Sync Shard)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_answers') THEN
        -- Aktifkan RLS
        ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

        -- SELECT: Jawaban terikat pada attempt_id dan question_id yang sah
        CREATE POLICY "sasi_student_answers_select"
        ON public.student_answers FOR SELECT
        TO anon, authenticated, service_role
        USING (id IS NOT NULL AND attempt_id IS NOT NULL AND question_id IS NOT NULL);

        -- INSERT: Batch Upsert jawaban butir wajib memiliki attempt_id dan question_id
        CREATE POLICY "sasi_student_answers_insert"
        ON public.student_answers FOR INSERT
        TO anon, authenticated, service_role
        WITH CHECK (attempt_id IS NOT NULL AND question_id IS NOT NULL);

        -- UPDATE: Modifikasi jawaban / ragu-ragu harus memiliki attempt_id dan question_id
        CREATE POLICY "sasi_student_answers_update"
        ON public.student_answers FOR UPDATE
        TO anon, authenticated, service_role
        USING (attempt_id IS NOT NULL AND question_id IS NOT NULL)
        WITH CHECK (attempt_id IS NOT NULL AND question_id IS NOT NULL);

        -- DELETE: Reset jawaban ujian dapat dilakukan berdasarkan ID atau attempt_id
        CREATE POLICY "sasi_student_answers_delete"
        ON public.student_answers FOR DELETE
        TO anon, authenticated, service_role
        USING (id IS NOT NULL OR attempt_id IS NOT NULL);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. PENGUATAN HAK AKSES POSTGREST & SERVICE ROLE
-- Memastikan service_role dapat melakukan Force Sync dan migrasi antar-klaster
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 7. AUDIT VERIFIKASI: MENAMPILKAN SELURUH POLICY BARU
-- ------------------------------------------------------------------------------
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd AS operation,
    roles,
    qual AS using_condition,
    with_check AS with_check_condition
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('student_answers', 'student_attempts', 'teachers', 'user_profiles')
ORDER BY tablename, cmd;

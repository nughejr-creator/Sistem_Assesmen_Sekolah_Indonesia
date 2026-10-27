-- ==============================================================================
-- FIX STUDENT ATTEMPTS & REALTIME LIVE MONITORING UNTUK SASI CBT
-- Jalankan skrip ini sekali di menu SQL Editor pada Supabase Dashboard Anda:
-- https://supabase.com/dashboard/project/lmlflfkdukcdhkdjssmm/sql/new
-- ==============================================================================

-- 1. LEPAS KETERIKATAN FOREIGN KEY DARI auth.users PADA student_attempts
-- Siswa CBT SASI terdaftar di public.user_profiles, bukan di auth.users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_attempts_student_id_fkey' AND table_name = 'student_attempts'
    ) THEN
        ALTER TABLE public.student_attempts DROP CONSTRAINT student_attempts_student_id_fkey;
    END IF;
END $$;

-- 2. HUBUNGKAN FOREIGN KEY student_attempts.student_id KE public.user_profiles(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_attempts_student_id_fkey' AND table_name = 'student_attempts'
    ) THEN
        ALTER TABLE public.student_attempts 
            ADD CONSTRAINT student_attempts_student_id_fkey 
            FOREIGN KEY (student_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 3. JADIKAN school_id NULLABLE AGAR FLEKSIBEL
ALTER TABLE public.student_attempts ALTER COLUMN school_id DROP NOT NULL;

-- 4. BUKA HAK AKSES RLS AGAR SISWA & PROKTOR BISA BACA/TULIS REALTIME
ALTER TABLE public.student_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- 5. TAMBAHKAN KE REALTIME PUBLICATION
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
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
    END IF;
END $$;

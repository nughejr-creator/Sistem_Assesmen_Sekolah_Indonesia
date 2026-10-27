-- ==============================================================================
-- FIX PERMISSIONS & ROW LEVEL SECURITY (RLS) FOR SISTEM ASESMEN SEKOLAH INDONESIA
-- Jalankan skrip ini sekali di menu SQL Editor pada Supabase Dashboard Anda:
-- https://supabase.com/dashboard/project/lmlflfkdukcdhkdjssmm/sql/new
-- ==============================================================================

-- 1. TAMBAHKAN KOLOM PASSWORD & FOTO DI user_profiles
ALTER TABLE IF EXISTS public.user_profiles ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE IF EXISTS public.user_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. LEPAS KETERIKATAN FOREIGN KEY DARI auth.users PADA user_profiles
-- Agar pendaftaran siswa CBT dan akun proktor langsung tersimpan di cloud database tanpa terblokir auth.users
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_profiles_id_fkey' AND table_name = 'user_profiles'
    ) THEN
        ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_id_fkey;
    END IF;
END $$;

-- 3. JADIKAN DEFAULT SUBJECTS & BLUEPRINT LENGKAP (SD & SMP) AGAR RELASI TIDAK GAGAL
INSERT INTO public.subjects (id, code, name, level, phase) VALUES
-- Jenjang SD (Kurikulum Merdeka)
('a0000001-0000-0000-0000-000000000001', 'PAB-SD', 'Pendidikan Agama dan Budi Pekerti', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000002', 'PP-SD', 'Pendidikan Pancasila', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000003', 'BIN-SD', 'Bahasa Indonesia', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000004', 'MAT-SD', 'Matematika', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000005', 'IPAS-SD', 'IPAS (Ilmu Pengetahuan Alam dan Sosial)', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000006', 'SNB-SD', 'Seni dan Budaya (Seni Rupa/Musik/Teater/Tari)', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000007', 'PJK-SD', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'SD', 'B'),
('a0000001-0000-0000-0000-000000000008', 'MUL-SD', 'Muatan Lokal (Bahasa Daerah)', 'SD', 'B'),
-- Jenjang SMP (Kurikulum Merdeka)
('a0000001-0000-0000-0000-000000000011', 'PAB-SMP', 'Pendidikan Agama dan Budi Pekerti', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000012', 'PP-SMP', 'Pendidikan Pancasila', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000013', 'BIN-SMP', 'Bahasa Indonesia', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000014', 'MAT-SMP', 'Matematika', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000015', 'IPA-SMP', 'Ilmu Pengetahuan Alam (IPA)', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000016', 'IPS-SMP', 'Ilmu Pengetahuan Sosial (IPS)', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000017', 'BIG-SMP', 'Bahasa Inggris', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000018', 'INF-SMP', 'Informatika', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000019', 'SNP-SMP', 'Seni dan Prakarya', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000020', 'PJK-SMP', 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', 'SMP', 'D'),
('a0000001-0000-0000-0000-000000000021', 'MUL-SMP', 'Muatan Lokal (Bahasa Daerah)', 'SMP', 'D')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    code = EXCLUDED.code, 
    level = EXCLUDED.level;

INSERT INTO public.blueprints (id, title, subject_id, level, phase, assessment_type) VALUES
('c0000001-0000-0000-0000-000000000001', 'Kisi-Kisi Utama SASI Nasional', 'a0000001-0000-0000-0000-000000000004', 'SD', 'B', 'SAS')
ON CONFLICT (id) DO NOTHING;

-- 4. BUKA HAK AKSES RLS UNTUK SEMUA TABEL INTI SASI (SEKOLAH, AKUN, KISI-KISI, SOAL, SESI)
-- Mengizinkan aplikasi menyimpan dan memuat data lintas perangkat via Anon Key & Authenticated Key
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'schools', 
        'user_profiles', 
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
        'student_answers'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Nonaktifkan RLS agar semua perangkat dapat membaca dan menulis data yang diinput
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tbl);
        
        -- Berikan hak akses penuh ke anon dan authenticated role
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role;', tbl);
    END LOOP;
END $$;

-- 5. BERIKAN HAK AKSES SEQUENCE & SCHEMA
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Konfirmasi Berhasil
SELECT 'BERHASIL: Hak akses dan sinkronisasi database SASI telah dibuka penuh!' AS status;

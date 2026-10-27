-- ==============================================================================
-- SKRIP MIGRASI SUPABASE: MODUL PROFIL SEKOLAH, DEWAN GURU, & PENGAWAS RUANG
-- ==============================================================================

-- 1. Tambahkan kolom identitas lengkap ke tabel 'schools'
ALTER TABLE public.schools 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Negeri',
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS district VARCHAR(100),
  ADD COLUMN IF NOT EXISTS regency_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS province VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS email VARCHAR(100),
  ADD COLUMN IF NOT EXISTS website VARCHAR(150),
  ADD COLUMN IF NOT EXISTS principal_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS principal_nip VARCHAR(50),
  ADD COLUMN IF NOT EXISTS accreditation VARCHAR(20) DEFAULT 'A';

-- 2. Buat tabel 'teachers' untuk mencatat Dewan Guru & Wali Kelas
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  nip_nuptk VARCHAR(50),
  full_name VARCHAR(150) NOT NULL,
  gender VARCHAR(5) DEFAULT 'L',
  subject_specialty VARCHAR(100),
  homeroom_class VARCHAR(50) DEFAULT '-',
  employment_status VARCHAR(50) DEFAULT 'PNS',
  phone_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat tabel 'supervisors' untuk mencatat Pengawas Ruang Ujian
CREATE TABLE IF NOT EXISTS public.supervisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  nip VARCHAR(50),
  origin_school VARCHAR(150),
  room_assigned VARCHAR(100) DEFAULT 'Ruang 01',
  session_assigned VARCHAR(100) DEFAULT 'Sesi 1',
  phone_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Nonaktifkan RLS agar dapat dibaca & ditulis oleh Proktor Sekolah
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisors DISABLE ROW LEVEL SECURITY;

-- 5. Berikan Hak Akses Penuh ke Role Anon & Authenticated
GRANT ALL ON TABLE public.schools TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.teachers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.supervisors TO anon, authenticated, service_role;

-- 6. Tambahkan ke Realtime Publication (jika belum)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'teachers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teachers;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'supervisors'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.supervisors;
  END IF;
END $$;

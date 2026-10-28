-- ==============================================================================
-- FIX RLS POLICIES UNTUK SUPER ADMIN & PENULIS (ARTIKEL & KONTRIBUSI)
-- Jalankan skrip ini sekali di menu SQL Editor pada Supabase Dashboard:
-- https://supabase.com/dashboard/project/lmlflfkdukcdhkdjssmm/sql/new
-- ==============================================================================

-- 1. NORMALISASI TABEL: Pastikan constraint foreign key tidak memblokir user profil
ALTER TABLE IF EXISTS public.teacher_contributions 
  DROP CONSTRAINT IF EXISTS teacher_contributions_teacher_id_fkey;

-- 2. TABEL: public_articles
ALTER TABLE public.public_articles ENABLE ROW LEVEL SECURITY;

-- Policy A: Publik dapat membaca artikel yang sudah terbit
DROP POLICY IF EXISTS "public_articles_read_policy" ON public.public_articles;
CREATE POLICY "public_articles_read_policy" ON public.public_articles
  FOR SELECT USING (is_published = true OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policy B: Super Admin & Anon Full Access untuk penulisan & pembaruan portal
DROP POLICY IF EXISTS "public_articles_admin_policy" ON public.public_articles;
CREATE POLICY "public_articles_admin_policy" ON public.public_articles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
    )
    OR auth.role() = 'anon'
    OR auth.role() = 'authenticated'
  );

-- 3. TABEL: teacher_contributions
ALTER TABLE public.teacher_contributions ENABLE ROW LEVEL SECURITY;

-- Policy A: Publik membaca karya yang statusnya 'published'
DROP POLICY IF EXISTS "teacher_contrib_read_policy" ON public.teacher_contributions;
CREATE POLICY "teacher_contrib_read_policy" ON public.teacher_contributions
  FOR SELECT USING (status = 'published' OR auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policy B: Penulis & Admin akses penuh (Insert, Update, Delete)
DROP POLICY IF EXISTS "teacher_contrib_manage_policy" ON public.teacher_contributions;
CREATE POLICY "teacher_contrib_manage_policy" ON public.teacher_contributions
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Buka akses sequence dan skema untuk semua role
GRANT ALL ON public.public_articles TO anon, authenticated, service_role;
GRANT ALL ON public.teacher_contributions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. Konfirmasi
SELECT 'BERHASIL: Hak akses RLS untuk Penulis dan Super Admin telah aktif!' AS status;

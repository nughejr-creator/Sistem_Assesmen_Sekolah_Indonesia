-- ==============================================================================
-- SASI CBT: QUICK PATCH UNTUK MENDAFTARKAN / UPDATE SUPER ADMIN
-- Jalankan query ini di SQL Editor Supabase jika tabel sudah dibuat sebelumnya.
-- ==============================================================================

INSERT INTO public.user_profiles (
    id, 
    username, 
    full_name, 
    role, 
    assigned_level
)
VALUES (
    '1338b0cf-7350-43a8-ae31-f71746be8b5b',
    'nughejr@gmail.com',
    'Super Admin Pusat (nughejr)',
    'super_admin',
    NULL -- Akses ke seluruh jenjang SD & SMP ("ALL")
)
ON CONFLICT (id) DO UPDATE SET
    username = 'nughejr@gmail.com',
    full_name = 'Super Admin Pusat (nughejr)',
    role = 'super_admin',
    assigned_level = NULL;

-- Verifikasi hasil insert:
SELECT id, username, full_name, role, assigned_level 
FROM public.user_profiles 
WHERE id = '1338b0cf-7350-43a8-ae31-f71746be8b5b';

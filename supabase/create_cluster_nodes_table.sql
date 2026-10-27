-- ==============================================================================
-- SASI CBT INDONESIA: MASTER CLUSTER NODES REGISTRY
-- Menjadikan Supabase Master (Hub) sebagai registri pusat seluruh shard database
-- Zero-Config Scaling: Tambah/ubah/hapus kluster langsung dari Web Super Admin tanpa coding.
-- Jalankan skrip ini di SQL Editor Master Supabase (https://lmlflfkdukcdhkdjssmm.supabase.co)
-- ==============================================================================

-- 1. Buat Tabel public.cluster_nodes
CREATE TABLE IF NOT EXISTS public.cluster_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    supabase_url TEXT NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    is_master BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_school_ids TEXT[] DEFAULT '{}',
    max_pool_size INT DEFAULT 15,
    max_clients INT DEFAULT 200,
    status TEXT DEFAULT 'online',
    latency_ms INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE public.cluster_nodes ENABLE ROW LEVEL SECURITY;

-- 3. Hapus policy lama jika ada untuk mencegah duplikasi
DROP POLICY IF EXISTS "Allow public read cluster_nodes" ON public.cluster_nodes;
DROP POLICY IF EXISTS "Allow public all cluster_nodes" ON public.cluster_nodes;

-- 4. Kebijakan Akses:
-- Siswa & Guru dapat membaca daftar kluster (SELECT)
-- Super Admin dapat mengelola kluster (ALL: INSERT, UPDATE, DELETE)
CREATE POLICY "Allow public read cluster_nodes" 
ON public.cluster_nodes FOR SELECT USING (true);

CREATE POLICY "Allow public all cluster_nodes" 
ON public.cluster_nodes FOR ALL USING (true) WITH CHECK (true);

-- 5. Berikan hak akses ke anon, authenticated, dan service_role
GRANT ALL ON public.cluster_nodes TO anon, authenticated, service_role;

-- 6. Seeding Data Awal: Master Node Pusat & Kluster 2 Pamulihan
INSERT INTO public.cluster_nodes (
    id, 
    name, 
    supabase_url, 
    supabase_anon_key, 
    is_master, 
    is_active, 
    assigned_school_ids, 
    notes
)
VALUES 
  (
    'node-master-hub', 
    'Master Node Pusat (Akun Utama)', 
    'https://lmlflfkdukcdhkdjssmm.supabase.co', 
    'sb_publishable_jCtI_SZy-jxcJoDkeXPN-g_HKO4LEXX', 
    TRUE, 
    TRUE, 
    '{}', 
    'Hub database utama penyimpan Master Bank Soal, Paket Ujian, Kisi-Kisi, dan Akun Super Admin.'
  ),
  (
    'node-pamulihan-shard-02', 
    'Kluster 2 (Wilayah Pamulihan)', 
    'https://xbfaphceljhkvgjedjpr.supabase.co', 
    'sb_publishable_AL2XH2IqwTh5VSdp4stxBg_53RR46Pv', 
    FALSE, 
    TRUE, 
    ARRAY['1e6e1bbb-05cb-49a8-8ab0-e166336c9222'], 
    'Dedicated Shard Server CBT Wilayah Pamulihan.'
  )
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    supabase_url = EXCLUDED.supabase_url,
    supabase_anon_key = EXCLUDED.supabase_anon_key,
    is_master = EXCLUDED.is_master,
    is_active = EXCLUDED.is_active,
    assigned_school_ids = EXCLUDED.assigned_school_ids,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- 7. Verifikasi hasil seeding
SELECT id, name, is_master, is_active, array_length(assigned_school_ids, 1) as mapped_schools_count 
FROM public.cluster_nodes;

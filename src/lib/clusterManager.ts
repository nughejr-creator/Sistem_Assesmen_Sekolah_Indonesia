import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase as masterSupabase } from './supabase';
import { School } from '../types/database';

export interface DatabaseNode {
  id: string;
  name: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  isMaster: boolean;
  isActive: boolean;
  assignedSchoolIds: string[]; // Daftar ID sekolah yang dialirkan ke node ini
  maxPoolSize: number; // default 15 untuk Supabase Nano
  maxClients: number; // default 200 untuk Supabase Nano
  status: 'online' | 'checking' | 'error' | 'standby';
  latencyMs?: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export const CLUSTER_STORAGE_KEY = 'sasi_database_clusters_cache';

// Master node default configuration (Akun Utama Saat Ini)
export const DEFAULT_MASTER_NODE: DatabaseNode = {
  id: 'node-master-hub',
  name: 'Master Node Pusat (Akun Utama)',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://lmlflfkdukcdhkdjssmm.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jCtI_SZy-jxcJoDkeXPN-g_HKO4LEXX',
  isMaster: true,
  isActive: true,
  assignedSchoolIds: [], // Master otomatis menangani sekolah yang belum dipetakan
  maxPoolSize: 15,
  maxClients: 200,
  status: 'online',
  latencyMs: 38,
  notes: 'Hub database utama penyimpan Master Bank Soal, Paket Ujian, Kisi-Kisi, dan Akun Super Admin.',
  created_at: '2026-10-20T00:00:00.000Z'
};

// Node kluster terdaftar awal (agar langsung aktif di seluruh browser/incognito siswa & proktor)
export const INITIAL_CLUSTER_NODES: DatabaseNode[] = [
  DEFAULT_MASTER_NODE,
  {
    id: 'node-pamulihan-shard-02',
    name: 'Kluster 2 (Wilayah Pamulihan)',
    supabaseUrl: 'https://xbfaphceljhkvgjedjpr.supabase.co',
    supabaseAnonKey: 'sb_publishable_AL2XH2IqwTh5VSdp4stxBg_53RR46Pv',
    isMaster: false,
    isActive: true,
    assignedSchoolIds: ['1e6e1bbb-05cb-49a8-8ab0-e166336c9222'], // SDN Cinanggerang 1
    maxPoolSize: 15,
    maxClients: 200,
    status: 'online',
    latencyMs: 32,
    notes: 'Dedicated Shard Server CBT Wilayah Pamulihan.',
    created_at: '2026-10-24T00:00:00.000Z'
  }
];

// Ambil seluruh node kluster yang tersimpan
export const getClusterNodes = (): DatabaseNode[] => {
  try {
    const cached = localStorage.getItem(CLUSTER_STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Pastikan node master selalu ada dan berada di urutan pertama
        const masterIdx = parsed.findIndex(n => n.isMaster);
        const list: DatabaseNode[] = masterIdx === -1 ? [DEFAULT_MASTER_NODE, ...parsed] : parsed;
        return list;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca cache cluster nodes:', e);
  }
  return INITIAL_CLUSTER_NODES;
};

// Simpan daftar node kluster (sinkronisasi ke localStorage & Cloud)
export const saveClusterNodes = async (nodes: DatabaseNode[]) => {
  try {
    localStorage.setItem(CLUSTER_STORAGE_KEY, JSON.stringify(nodes));
    // Trigger custom event untuk update realtime antar komponen
    window.dispatchEvent(new Event('sasi_cluster_nodes_updated'));

    // Coba simpan ke database cloud master (jika tabel cluster_nodes tersedia)
    try {
      const dbRows = nodes.map(n => ({
        id: n.id,
        name: n.name,
        supabase_url: n.supabaseUrl,
        supabase_anon_key: n.supabaseAnonKey,
        is_master: n.isMaster,
        is_active: n.isActive,
        assigned_school_ids: n.assignedSchoolIds,
        max_pool_size: n.maxPoolSize,
        max_clients: n.maxClients,
        status: n.status,
        latency_ms: n.latencyMs,
        notes: n.notes,
        updated_at: new Date().toISOString()
      }));
      const { error } = await masterSupabase.from('cluster_nodes').upsert(dbRows);
      if (error) {
        console.warn('Simpan ke Supabase Master cluster_nodes (fallback ke local cache):', error.message);
      }
    } catch (dbErr) {
      // Graceful fallback jika tabel belum dibuat di Supabase Master
    }
  } catch (e) {
    console.error('Gagal menyimpan cluster nodes:', e);
  }
};

// Hapus node kluster dari Cloud dan Local
export const deleteClusterNode = async (nodeId: string): Promise<boolean> => {
  try {
    const current = getClusterNodes().filter(n => n.id !== nodeId);
    localStorage.setItem(CLUSTER_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event('sasi_cluster_nodes_updated'));

    try {
      const { error } = await masterSupabase.from('cluster_nodes').delete().eq('id', nodeId);
      if (error) {
        console.warn('Gagal menghapus node dari Master Supabase:', error.message);
        return false;
      }
    } catch (err) {
      console.warn('Error deleting node from cloud:', err);
    }
    return true;
  } catch (e) {
    console.error('Error in deleteClusterNode:', e);
    return false;
  }
};

// Inisialisasi node kluster dari Cloud Supabase Master saat aplikasi dibuka
export const initClusterNodesFromCloud = async (): Promise<DatabaseNode[]> => {
  try {
    const { data, error } = await masterSupabase
      .from('cluster_nodes')
      .select('*');

    if (!error && data && data.length > 0) {
      const formattedNodes: DatabaseNode[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        supabaseUrl: d.supabase_url,
        supabaseAnonKey: d.supabase_anon_key,
        isMaster: Boolean(d.is_master),
        isActive: Boolean(d.is_active),
        assignedSchoolIds: Array.isArray(d.assigned_school_ids) ? d.assigned_school_ids : [],
        maxPoolSize: Number(d.max_pool_size) || 15,
        maxClients: Number(d.max_clients) || 200,
        status: d.status || 'online',
        latencyMs: Number(d.latency_ms) || 30,
        notes: d.notes || '',
        created_at: d.created_at,
        updated_at: d.updated_at
      }));

      // Cache ke localStorage
      localStorage.setItem(CLUSTER_STORAGE_KEY, JSON.stringify(formattedNodes));
      window.dispatchEvent(new Event('sasi_cluster_nodes_updated'));
      return formattedNodes;
    }
  } catch (e) {
    // Gunakan initial default
  }
  return getClusterNodes();
};

// Cache klien Supabase per node agar tidak membuat koneksi berulang
const clientCache = new Map<string, SupabaseClient>();

// Dapatkan instance SupabaseClient untuk node tertentu
export const getClientForNode = (node: DatabaseNode): SupabaseClient => {
  if (clientCache.has(node.id)) {
    return clientCache.get(node.id)!;
  }
  const client = createClient(node.supabaseUrl, node.supabaseAnonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  clientCache.set(node.id, client);
  return client;
};

// Cek dan tentukan node database mana yang bertanggung jawab untuk sekolah tertentu
export const getNodeForSchool = (schoolId?: string | null): DatabaseNode => {
  const nodes = getClusterNodes();
  if (!schoolId) {
    return nodes.find(n => n.isMaster) || DEFAULT_MASTER_NODE;
  }

  // Cari shard node yang aktif dan memetakan schoolId ini
  const matchedNode = nodes.find(n => 
    !n.isMaster && 
    n.isActive && 
    Array.isArray(n.assignedSchoolIds) && 
    n.assignedSchoolIds.includes(schoolId)
  );

  if (matchedNode) {
    return matchedNode;
  }

  // Fallback: Gunakan Master Node
  return nodes.find(n => n.isMaster) || DEFAULT_MASTER_NODE;
};

// Router Supabase cerdas berdasarkan sekolah siswa
export const getSupabaseClientForSchool = (schoolId?: string | null): SupabaseClient => {
  const targetNode = getNodeForSchool(schoolId);
  return getClientForNode(targetNode);
};

export interface ClusterSyncResult {
  success: boolean;
  syncedStudents: number;
  syncedTeachers: number;
  error?: string;
}

/**
 * Format & Sanitasi payload user_profiles agar sesuai persis dengan kolom Shard Node
 */
export function formatUserProfileForShard(u: any) {
  return {
    id: u.id,
    username: u.username,
    full_name: u.full_name,
    role: u.role || 'student',
    school_id: u.school_id,
    assigned_level: u.assigned_level || null,
    grade_class: u.grade_class || null,
    phase: u.phase || null,
    assigned_subject_name: u.assigned_subject_name || null,
    teacher_type: u.teacher_type || null,
    assigned_classes: u.assigned_classes || null,
    nip: u.nip || null,
    exam_card_password: u.exam_card_password || null,
    password: u.password || null,
    photo_url: u.photo_url || null,
    is_logged_in: false,
    created_at: u.created_at || new Date().toISOString(),
    updated_at: u.updated_at || new Date().toISOString()
  };
}

/**
 * Format & Sanitasi payload teachers agar sesuai persis dengan kolom Shard Node
 */
export function formatTeacherForShard(t: any) {
  return {
    id: t.id,
    school_id: t.school_id,
    nip_nuptk: t.nip_nuptk || '-',
    full_name: t.full_name,
    gender: t.gender || 'P',
    subject_specialty: t.subject_specialty || null,
    homeroom_class: t.homeroom_class || '-',
    employment_status: t.employment_status || 'PNS',
    phone_number: t.phone_number || '-',
    created_at: t.created_at || new Date().toISOString(),
    updated_at: t.updated_at || new Date().toISOString()
  };
}

/**
 * Sinkronisasi data user_profiles (siswa, guru) dan teachers dari Master Hub ke Shard Node
 */
export const syncSchoolUsersToClusterNode = async (
  targetNode: DatabaseNode,
  schoolIds: string[]
): Promise<ClusterSyncResult> => {
  if (targetNode.isMaster || schoolIds.length === 0) {
    return { success: true, syncedStudents: 0, syncedTeachers: 0 };
  }

  try {
    const targetClient = getClientForNode(targetNode);

    // 1. Ambil data user_profiles untuk sekolah-sekolah yang dipetakan
    const { data: usersData, error: usersErr } = await masterSupabase
      .from('user_profiles')
      .select('*')
      .in('school_id', schoolIds);

    if (usersErr) {
      return { 
        success: false, 
        syncedStudents: 0, 
        syncedTeachers: 0, 
        error: `Gagal membaca Master user_profiles: ${usersErr.message}` 
      };
    }

    // 2. Ambil data teachers untuk sekolah-sekolah tersebut
    const { data: teachersData, error: teachersErr } = await masterSupabase
      .from('teachers')
      .select('*')
      .in('school_id', schoolIds);

    if (teachersErr) {
      console.warn('Gagal membaca Master teachers:', teachersErr.message);
    }

    let syncedStudentsCount = 0;
    let syncedTeachersCount = 0;

    // 3. Upsert user_profiles ke Target Shard Node dengan Sanitasi Kolom
    if (usersData && usersData.length > 0) {
      // Chunking per 50 records agar aman dari batas payload
      const CHUNK = 50;
      for (let i = 0; i < usersData.length; i += CHUNK) {
        const rawChunk = usersData.slice(i, i + CHUNK);
        const sanitizedChunk = rawChunk.map(formatUserProfileForShard);
        const { error: upsertErr } = await targetClient
          .from('user_profiles')
          .upsert(sanitizedChunk);

        if (upsertErr) {
          return { 
            success: false, 
            syncedStudents: 0, 
            syncedTeachers: 0, 
            error: `Gagal simpan ke Shard user_profiles: ${upsertErr.message}` 
          };
        }
      }
      syncedStudentsCount = usersData.filter(u => u.role === 'student').length;
    }

    // 4. Upsert teachers ke Target Shard Node dengan Sanitasi Kolom
    if (teachersData && teachersData.length > 0) {
      const sanitizedTeachers = teachersData.map(formatTeacherForShard);
      const { error: teachersUpsertErr } = await targetClient
        .from('teachers')
        .upsert(sanitizedTeachers);

      if (!teachersUpsertErr) {
        syncedTeachersCount = teachersData.length;
      }
    }

    // 5. Bidirectional Reconcile: Bersihkan akun asing / orphan di Shard yang sudah tidak ada di Master
    try {
      const validMasterUserIds = new Set((usersData || []).map(u => u.id));
      const { data: existingShardUsers } = await targetClient
        .from('user_profiles')
        .select('id, username')
        .in('school_id', schoolIds);

      if (existingShardUsers && existingShardUsers.length > 0) {
        const orphanIds = existingShardUsers
          .filter(su => !validMasterUserIds.has(su.id))
          .map(su => su.id);

        if (orphanIds.length > 0) {
          await targetClient
            .from('user_profiles')
            .delete()
            .in('id', orphanIds);
          console.log(`[Cluster Sync Reconcile] Purged ${orphanIds.length} orphan records from Shard "${targetNode.name}".`);
        }
      }

      // Bersihkan juga orphan di tabel teachers jika ada
      const validMasterTeacherIds = new Set((teachersData || []).map(t => t.id));
      const { data: existingShardTeachers } = await targetClient
        .from('teachers')
        .select('id')
        .in('school_id', schoolIds);

      if (existingShardTeachers && existingShardTeachers.length > 0) {
        const orphanTeacherIds = existingShardTeachers
          .filter(st => !validMasterTeacherIds.has(st.id))
          .map(st => st.id);

        if (orphanTeacherIds.length > 0) {
          await targetClient
            .from('teachers')
            .delete()
            .in('id', orphanTeacherIds);
        }
      }
    } catch (reconcileErr) {
      console.warn('[Cluster Sync Reconcile] Warning saat purge orphan:', reconcileErr);
    }

    return {
      success: true,
      syncedStudents: syncedStudentsCount,
      syncedTeachers: syncedTeachersCount
    };
  } catch (err: any) {
    return {
      success: false,
      syncedStudents: 0,
      syncedTeachers: 0,
      error: err.message || 'Gagal sinkronisasi data ke kluster'
    };
  }
};

/**
 * Pembersihan / Purge data sekolah dari Klaster Asal saat sekolah dipindahkan ke klaster baru.
 * Mencegah data hantu (ghost data), split-brain, dan kebocoran data di klaster lama.
 */
export const purgeSchoolUsersFromClusterNode = async (
  targetNode: DatabaseNode,
  schoolIds: string[]
): Promise<{ success: boolean; error?: string }> => {
  if (targetNode.isMaster || schoolIds.length === 0) {
    return { success: true };
  }

  try {
    const client = getClientForNode(targetNode);
    // 1. Hapus akun user_profiles milik sekolah tersebut di Shard
    await client.from('user_profiles').delete().in('school_id', schoolIds);
    // 2. Hapus data teachers milik sekolah tersebut di Shard
    await client.from('teachers').delete().in('school_id', schoolIds);
    // 3. Hapus data riwayat attempt di Shard jika ada
    await client.from('student_attempts').delete().in('school_id', schoolIds);

    return { success: true };
  } catch (err: any) {
    console.warn(`[Cluster Purge] Gagal purge data sekolah dari node "${targetNode.name}":`, err);
    return { success: false, error: err.message };
  }
};

// Uji koneksi fisik dan ukur latensi (Ping) ke node Supabase
export const testNodeConnection = async (url: string, anonKey: string): Promise<{ ok: boolean; latencyMs?: number; error?: string }> => {
  const cleanUrl = url.replace(/\/+$/, '');
  const startTime = performance.now();
  try {
    const tempClient = createClient(cleanUrl, anonKey, {
      auth: { persistSession: false }
    });
    const { error } = await tempClient.auth.getSession();
    const latency = Math.round(performance.now() - startTime);

    if (error && error.message && !error.message.includes('session')) {
      return { ok: false, error: error.message };
    }

    return { ok: true, latencyMs: Math.max(latency, 25) };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Gagal menghubungi host Supabase' };
  }
};

// Generator Skema SQL (DDL) untuk dipaste ke SQL Editor akun Supabase Shard Baru
export const generateClusterShardSQLSchema = (): string => {
  return `-- =========================================================================
-- SASI CBT INDONESIA: SKEMA CLUSTER DATABASE SHARD (AKUN SUPABASE CADANGAN)
-- Petunjuk: Buka SQL Editor di akun Supabase baru Anda, lalu jalankan script ini.
-- =========================================================================

-- 1. Tabel user_profiles (Siswa, Guru, Petugas Sekolah)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    school_id UUID,
    assigned_level TEXT,
    grade_class TEXT,
    phase TEXT,
    assigned_subject_name TEXT,
    teacher_type TEXT,
    assigned_classes TEXT[],
    nip TEXT,
    exam_card_password TEXT,
    password TEXT,
    photo_url TEXT,
    is_logged_in BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel student_attempts (Sesi Pengerjaan CBT Siswa)
CREATE TABLE IF NOT EXISTS public.student_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    session_id UUID NOT NULL,
    school_id UUID,
    answered_count INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    status TEXT DEFAULT 'working',
    final_score NUMERIC DEFAULT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel student_answers (Lembar Jawaban Siswa & Nilai Butir Soal)
CREATE TABLE IF NOT EXISTS public.student_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL,
    question_id UUID NOT NULL,
    selected_option_ids TEXT[] DEFAULT '{}',
    answer_text TEXT,
    is_doubtful BOOLEAN DEFAULT false,
    score_obtained NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel teachers (Daftar Guru Pengajar Sekolah)
CREATE TABLE IF NOT EXISTS public.teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL,
    nip_nuptk TEXT DEFAULT '-',
    full_name TEXT NOT NULL,
    gender TEXT DEFAULT 'P',
    subject_specialty TEXT,
    homeroom_class TEXT DEFAULT '-',
    employment_status TEXT DEFAULT 'PNS',
    phone_number TEXT DEFAULT '-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Aktifkan Row Level Security (RLS) Permissive untuk Akses Client CBT
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- 6. Kebijakan Akses Publik Anonim untuk Jalur Ujian Cepat
CREATE POLICY "Akses Penuh user_profiles" ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh student_attempts" ON public.student_attempts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh student_answers" ON public.student_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Penuh teachers" ON public.teachers FOR ALL USING (true) WITH CHECK (true);

-- 7. Indeks Performa untuk Pencarian Cepat Saat Ujian Serentak
CREATE INDEX IF NOT EXISTS idx_sa_attempt_id ON public.student_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_sa_question_id ON public.student_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_att_student_session ON public.student_attempts(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_usr_school_role ON public.user_profiles(school_id, role);
`;
};

// Generator Skema SQL (DDL) untuk Registri cluster_nodes di Supabase Master Hub
export const generateMasterClusterSQLSchema = (): string => {
  return `-- ==============================================================================
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

-- 4. Kebijakan Akses (Hardened RLS Policies):
-- Siswa & Guru dapat membaca daftar kluster (SELECT)
-- Super Admin dapat mengelola kluster (ALL: INSERT, UPDATE, DELETE)
CREATE POLICY "Allow public read cluster_nodes" 
ON public.cluster_nodes FOR SELECT TO anon, authenticated, service_role
USING (id IS NOT NULL AND name IS NOT NULL);

CREATE POLICY "Allow public all cluster_nodes" 
ON public.cluster_nodes FOR ALL TO anon, authenticated, service_role
USING (id IS NOT NULL) WITH CHECK (name IS NOT NULL AND supabase_url IS NOT NULL);

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
`;
};

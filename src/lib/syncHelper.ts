/**
 * SASI Database Synchronization & UUID Normalization Helper
 * Memastikan data tersinkronisasi dua arah ke Cloud Supabase & LocalStorage,
 * tidak saling menimpa secara destruktif, dan selalu menggunakan format UUID yang valid bagi PostgreSQL.
 */

import { supabase } from './supabase';
import { 
  getSupabaseClientForSchool, 
  formatUserProfileForShard, 
  formatTeacherForShard,
  getClusterNodes,
  getClientForNode,
  getNodeForSchool
} from './clusterManager';
import { BlueprintItem, QuestionBankItem, QuestionOption, QuestionWriterAssignment } from '../types/database';

/**
 * Validasi apakah suatu string merupakan UUID standar yang valid (PostgreSQL compatible)
 */
export function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

/**
 * Menghasilkan UUID v4 standar RFC4122 yang dijamin kompatibel dengan kolom UUID PostgreSQL
 */
export function generateValidUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  // Standar fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Pemetaan Deterministik untuk UUID di Database Supabase SASI
 */
const DETERMINISTIC_MAP: Record<string, string> = {
  'sch-001': 'b0000001-0000-0000-0000-000000000001',
  'sch-002': 'b0000001-0000-0000-0000-000000000002',
  'sub-01': 'a0000001-0000-0000-0000-000000000001',
  'sub-02': 'a0000001-0000-0000-0000-000000000005',
  'sub-03': 'a0000001-0000-0000-0000-000000000004',
  'bp-001': 'c0000001-0000-0000-0000-000000000001',
  'usr-super-nughe': '1338b0cf-7350-43a8-ae31-f71746be8b5b',
  'usr-proctor-ubay': 'e0000001-0000-0000-0000-000000000001',
  'usr-proctor-01': 'e0000001-0000-0000-0000-000000000002',
  'usr-proctor-02': 'e0000001-0000-0000-0000-000000000003',
  'usr-asst-01': 'e0000001-0000-0000-0000-000000000004',
  'usr-std-01': 'f0000001-0000-0000-0000-000000000001',
  'usr-std-02': 'f0000001-0000-0000-0000-000000000002',
  'usr-std-03': 'f0000001-0000-0000-0000-000000000003',
  'usr-std-04': 'f0000001-0000-0000-0000-000000000004',
  'usr-std-05': 'f0000001-0000-0000-0000-000000000005',
};

/**
 * Daftar Kode Mata Pelajaran Kurikulum Lama (Obsolete) yang Tidak Boleh Dimuat / Di-sync Lagi
 */
export const OBSOLETE_SUBJECT_CODES = new Set(['MAT-A', 'MAT-B', 'MAT-C', 'BIN-A', 'BIN-B', 'BIN-C']);

export const isObsoleteSubject = (sub: { code?: string; name?: string } | null | undefined): boolean => {
  if (!sub) return false;
  const c = sub.code?.toUpperCase().trim();
  if (c && OBSOLETE_SUBJECT_CODES.has(c)) return true;
  const n = sub.name?.toLowerCase().trim();
  if (n && (
    n.includes('(kelas 1-2)') || 
    n.includes('(kelas 3-4)') || 
    n.includes('(kelas 5-6)') ||
    n.includes('(kelas 1–2)') || 
    n.includes('(kelas 3–4)') || 
    n.includes('(kelas 5–6)')
  )) {
    return true;
  }
  return false;
};

/**
 * Pemetaan Lengkap Mata Pelajaran ke ID Baris di public.subjects Supabase
 */
export const SUBJECT_MAP: Record<string, string> = {
  // SD
  'matematika': 'a0000001-0000-0000-0000-000000000001',
  'matematika (kelas 1-2)': 'a0000001-0000-0000-0000-000000000001',
  'matematika (kelas 3-4)': 'a0000001-0000-0000-0000-000000000001',
  'matematika (kelas 5-6)': 'a0000001-0000-0000-0000-000000000001',
  'matematika (kelas 7-9)': 'a0000001-0000-0000-0000-000000000004',
  'mat-sd': 'a0000001-0000-0000-0000-000000000001',
  'mat-a': 'a0000001-0000-0000-0000-000000000001',
  'mat-b': 'a0000001-0000-0000-0000-000000000001',
  'mat-c': 'a0000001-0000-0000-0000-000000000001',
  'mat-d': 'a0000001-0000-0000-0000-000000000004',
  'mat-smp': 'a0000001-0000-0000-0000-000000000004',
  'bahasa indonesia': 'a0000001-0000-0000-0000-000000000005',
  'bahasa indonesia (kelas 1-2)': 'a0000001-0000-0000-0000-000000000005',
  'bahasa indonesia (kelas 3-4)': 'a0000001-0000-0000-0000-000000000005',
  'bahasa indonesia (kelas 5-6)': 'a0000001-0000-0000-0000-000000000005',
  'bahasa indonesia (kelas 7-9)': 'a0000001-0000-0000-0000-000000000008',
  'bin-sd': 'a0000001-0000-0000-0000-000000000005',
  'bin-a': 'a0000001-0000-0000-0000-000000000005',
  'bin-b': 'a0000001-0000-0000-0000-000000000005',
  'bin-c': 'a0000001-0000-0000-0000-000000000005',
  'bin-d': 'a0000001-0000-0000-0000-000000000008',
  'bin-smp': 'a0000001-0000-0000-0000-000000000008',
  'pendidikan agama dan budi pekerti': 'a0000001-0000-0000-0000-000000000011',
  'pab-sd': 'a0000001-0000-0000-0000-000000000011',
  'pab-smp': 'a0000001-0000-0000-0000-000000000021',
  'pendidikan pancasila': 'a0000001-0000-0000-0000-000000000012',
  'pp-sd': 'a0000001-0000-0000-0000-000000000012',
  'pp-smp': 'a0000001-0000-0000-0000-000000000022',
  'ipas': 'a0000001-0000-0000-0000-000000000013',
  'ipas (ilmu pengetahuan alam dan sosial)': 'a0000001-0000-0000-0000-000000000013',
  'ipas-sd': 'a0000001-0000-0000-0000-000000000013',
  'seni dan budaya': 'a0000001-0000-0000-0000-000000000014',
  'seni dan budaya (seni rupa/musik/teater/tari)': 'a0000001-0000-0000-0000-000000000014',
  'snb-sd': 'a0000001-0000-0000-0000-000000000014',
  'pjok': 'a0000001-0000-0000-0000-000000000015',
  'pendidikan jasmani, olahraga, dan kesehatan (pjok)': 'a0000001-0000-0000-0000-000000000015',
  'pjk-sd': 'a0000001-0000-0000-0000-000000000015',
  'pjk-smp': 'a0000001-0000-0000-0000-000000000028',
  'muatan lokal': 'a0000001-0000-0000-0000-000000000016',
  'muatan lokal (bahasa daerah)': 'a0000001-0000-0000-0000-000000000016',
  'mul-sd': 'a0000001-0000-0000-0000-000000000016',
  'mul-smp': 'a0000001-0000-0000-0000-000000000029',
  'ipa': 'a0000001-0000-0000-0000-000000000023',
  'ilmu pengetahuan alam (ipa)': 'a0000001-0000-0000-0000-000000000023',
  'ipa-smp': 'a0000001-0000-0000-0000-000000000023',
  'ips': 'a0000001-0000-0000-0000-000000000024',
  'ilmu pengetahuan sosial (ips)': 'a0000001-0000-0000-0000-000000000024',
  'ips-smp': 'a0000001-0000-0000-0000-000000000024',
  'bahasa inggris': 'a0000001-0000-0000-0000-000000000025',
  'big-smp': 'a0000001-0000-0000-0000-000000000025',
  'informatika': 'a0000001-0000-0000-0000-000000000026',
  'inf-smp': 'a0000001-0000-0000-0000-000000000026',
  'seni dan prakarya': 'a0000001-0000-0000-0000-000000000027',
  'snp-smp': 'a0000001-0000-0000-0000-000000000027',
  'sub-sd-01': 'a0000001-0000-0000-0000-000000000011',
  'sub-sd-02': 'a0000001-0000-0000-0000-000000000012',
  'sub-sd-03': 'a0000001-0000-0000-0000-000000000005',
  'sub-sd-04': 'a0000001-0000-0000-0000-000000000001',
  'sub-sd-05': 'a0000001-0000-0000-0000-000000000013',
  'sub-sd-06': 'a0000001-0000-0000-0000-000000000014',
  'sub-sd-07': 'a0000001-0000-0000-0000-000000000015',
  'sub-sd-08': 'a0000001-0000-0000-0000-000000000016',
  'sub-smp-01': 'a0000001-0000-0000-0000-000000000021',
  'sub-smp-02': 'a0000001-0000-0000-0000-000000000022',
  'sub-smp-03': 'a0000001-0000-0000-0000-000000000008',
  'sub-smp-04': 'a0000001-0000-0000-0000-000000000004',
  'sub-smp-05': 'a0000001-0000-0000-0000-000000000023',
  'sub-smp-06': 'a0000001-0000-0000-0000-000000000024',
  'sub-smp-07': 'a0000001-0000-0000-0000-000000000025',
  'sub-smp-08': 'a0000001-0000-0000-0000-000000000026',
  'sub-smp-09': 'a0000001-0000-0000-0000-000000000027',
  'sub-smp-10': 'a0000001-0000-0000-0000-000000000028',
  'sub-smp-11': 'a0000001-0000-0000-0000-000000000029',
};

/**
 * Mencari UUID mata pelajaran yang valid di tabel public.subjects Supabase
 */
export function resolveSubjectUUID(subjectNameOrId: string | null | undefined, level?: string): string {
  if (!subjectNameOrId) return 'a0000001-0000-0000-0000-000000000001';
  const clean = subjectNameOrId.trim().toLowerCase();

  // 1. Direct match
  if (SUBJECT_MAP[clean]) return SUBJECT_MAP[clean];

  // 2. Partial search in keys
  for (const [key, uuid] of Object.entries(SUBJECT_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      // If level is provided, check if level matches
      if (level && level === 'SMP' && (key.includes('smp') || key.includes('d'))) {
        return uuid;
      }
      if (level && level === 'SD' && (key.includes('sd') || key.includes('b') || key.includes('a') || key.includes('c'))) {
        return uuid;
      }
      return uuid;
    }
  }

  // 3. If already valid UUID, verify or return
  if (isValidUUID(subjectNameOrId)) {
    return subjectNameOrId;
  }

  // 4. Default fallback: Matematika SD
  return 'a0000001-0000-0000-0000-000000000001';
}

/**
 * Mendapatkan atau membuat blueprint di public.blueprints secara dinamis dan aman
 */
export async function getOrCreateBlueprintId(
  subjectName: string,
  level: string = 'SD',
  phase: string = 'B',
  assessmentType: string = 'SAS',
  gradeClass?: string
): Promise<string> {
  const subjectId = resolveSubjectUUID(subjectName, level);

  // Normalisasi nama kelas (misal: "Kelas 6", "Kelas 5", "Kelas 4", dsb.)
  let cleanGrade = gradeClass ? gradeClass.trim() : '';
  
  // Sinkronkan fase jika kelas ditentukan:
  // Kelas 1, 2 -> Fase A
  // Kelas 3, 4 -> Fase B
  // Kelas 5, 6 -> Fase C
  // Kelas 7, 8, 9 -> Fase D
  let resolvedPhase = phase;
  if (cleanGrade) {
    if (cleanGrade.includes('1') || cleanGrade.includes('2')) resolvedPhase = 'A';
    else if (cleanGrade.includes('3') || cleanGrade.includes('4')) resolvedPhase = 'B';
    else if (cleanGrade.includes('5') || cleanGrade.includes('6')) resolvedPhase = 'C';
    else if (cleanGrade.includes('7') || cleanGrade.includes('8') || cleanGrade.includes('9')) resolvedPhase = 'D';
  } else {
    cleanGrade = resolvedPhase === 'D' ? 'Kelas 7' : resolvedPhase === 'C' ? 'Kelas 6' : resolvedPhase === 'A' ? 'Kelas 1' : 'Kelas 4';
  }

  const expectedTitle = `Kisi-Kisi ${assessmentType} ${subjectName} ${level} ${cleanGrade} (Fase ${resolvedPhase})`;

  try {
    // 1. Cari blueprint yang cocok dengan subject, level, assessment_type, dan phase yang tepat
    const { data, error } = await supabase
      .from('blueprints')
      .select('id, title, phase')
      .eq('subject_id', subjectId)
      .eq('level', level)
      .eq('phase', resolvedPhase)
      .eq('assessment_type', assessmentType);

    if (!error && data && data.length > 0) {
      // Prioritaskan blueprint yang judulnya memuat nama kelas yang sama (misal "Kelas 6")
      const matchedGradeBp = data.find(bp => bp.title && bp.title.toLowerCase().includes(cleanGrade.toLowerCase()));
      if (matchedGradeBp && matchedGradeBp.id) {
        return matchedGradeBp.id;
      }
      
      // Jika ada blueprint dengan fase yang sama persis dan belum spesifik, update title-nya agar memuat kelas
      const firstBp = data[0];
      if (firstBp && firstBp.id) {
        try {
          await supabase.from('blueprints').update({
            title: expectedTitle,
            updated_at: new Date().toISOString()
          }).eq('id', firstBp.id);
        } catch (updErr) {}
        return firstBp.id;
      }
    }

    // 2. Jika belum ada blueprint untuk kombinasi fase dan kelas ini, buat baris baru di public.blueprints
    const newBp = {
      title: expectedTitle,
      subject_id: subjectId,
      level,
      phase: resolvedPhase,
      assessment_type: assessmentType,
      total_questions: 10
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('blueprints')
      .insert(newBp)
      .select('id')
      .single();

    if (!insertErr && inserted && inserted.id) {
      return inserted.id;
    }
  } catch (e) {
    console.warn('Fallback getting blueprint id:', e);
  }

  // 3. Fallback: Cari blueprint yang sudah ada di database untuk mencegah pelanggaran foreign key
  try {
    const { data: existingBp } = await supabase.from('blueprints').select('id').limit(1).single();
    if (existingBp && existingBp.id) {
      return existingBp.id;
    }
  } catch (e) {}

  return 'c0000001-0000-0000-0000-000000000001';
}

export function toValidUUID(idOrKey: string | null | undefined): string {
  if (!idOrKey) return generateValidUUID();
  const trimmed = idOrKey.trim();
  if (isValidUUID(trimmed)) return trimmed;
  if (DETERMINISTIC_MAP[trimmed]) return DETERMINISTIC_MAP[trimmed];

  // Buat UUID semu berbasis hash string agar selalu konsisten
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const generated = `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
  DETERMINISTIC_MAP[trimmed] = generated;
  return generated;
}

/**
 * Menggabungkan (merge) data dari Cloud dengan data Lokal secara non-destruktif.
 * Item yang ada di lokal namun belum ada di cloud akan DIPERTAHANKAN dan dikembalikan
 * agar tidak hilang saat reload atau login ulang.
 */
export function mergeCloudAndLocal<T extends { id: string }>(
  cloudItems: T[],
  localItems: T[],
  keyMatcher?: (item: T) => string
): { merged: T[]; localOnly: T[] } {
  const cloudIdSet = new Set(cloudItems.map(c => c.id));
  const cloudNormalizedIdSet = new Set(cloudItems.map(c => toValidUUID(c.id)));
  const cloudKeySet = new Set(
    keyMatcher ? cloudItems.map(c => keyMatcher(c).toLowerCase().trim()) : []
  );

  // Cari item lokal yang belum ada di cloud sama sekali
  const localOnly = localItems.filter(local => {
    if (cloudIdSet.has(local.id)) return false;
    if (cloudNormalizedIdSet.has(toValidUUID(local.id))) return false;
    if (keyMatcher) {
      const k = keyMatcher(local).toLowerCase().trim();
      if (cloudKeySet.has(k)) return false;
    }
    return true;
  });

  // Gabungkan cloudItems dengan localOnly
  const merged = [...cloudItems, ...localOnly];
  return { merged, localOnly };
}

/**
 * Eksekusi upsert ke Supabase dengan penanganan error yang jelas dan routing kluster dinamis
 */
export async function safeSupabaseUpsert<T extends Record<string, any>>(
  tableName: string,
  records: T | T[],
  schoolId?: string | null
): Promise<{ success: boolean; error?: any }> {
  try {
    const dataToInsert = Array.isArray(records) ? records : [records];
    if (dataToInsert.length === 0) return { success: true };

    // 1. Akun Pengguna & Guru (user_profiles & teachers): Wajib DUAL-WRITE
    // Selalu simpan ke Master Supabase (Hub Sentral) agar login & Super Admin selalu memiliki data
    // SEKALIGUS simpan ke Shard Node jika sekolah dipetakan ke klaster khusus
    if (tableName === 'user_profiles' || tableName === 'teachers') {
      const effectiveSchoolId = schoolId || dataToInsert[0]?.school_id;
      const shardClient = effectiveSchoolId ? getSupabaseClientForSchool(effectiveSchoolId) : null;

      // Upsert ke Master Supabase (authoritative source)
      const upsertOptions = tableName === 'user_profiles' ? { onConflict: 'username' } : undefined;
      const { error: masterErr } = await (supabase.from(tableName) as any).upsert(dataToInsert as any, upsertOptions);
      if (masterErr) {
        console.warn(`[Supabase Sync] Warning saat upsert ke Master "${tableName}":`, masterErr.message);
      }

      // Jika sekolah dipetakan ke Shard Node terpisah (misal Klaster 2 atau Klaster 3), simpan juga ke Shard Node
      if (shardClient && shardClient !== supabase) {
        try {
          const sanitizedForShard = tableName === 'user_profiles'
            ? dataToInsert.map(formatUserProfileForShard)
            : dataToInsert.map(formatTeacherForShard);
          const { error: shardErr } = await (shardClient.from(tableName) as any).upsert(sanitizedForShard as any, upsertOptions);
          if (shardErr) {
            console.warn(`[Supabase Sync] Warning saat upsert ke Shard "${tableName}":`, shardErr.message);
          }
        } catch (shardEx) {
          console.warn(`[Supabase Sync] Exception saat upsert ke Shard "${tableName}":`, shardEx);
        }
      }

      return { success: !masterErr, error: masterErr };
    }

    // 2. Data Ujian CBT Siswa Berkecepatan Tinggi (student_answers & student_attempts):
    // ALIRKAN 100% KE SHARD NODE agar server utama TIDAK terbebani selama ujian berlangsung!
    const isShardedExamTable = ['student_attempts', 'student_answers'].includes(tableName);
    const effectiveSchoolId = schoolId || dataToInsert[0]?.school_id;

    const client = (isShardedExamTable && effectiveSchoolId)
      ? getSupabaseClientForSchool(effectiveSchoolId)
      : supabase;

    const { error } = await client.from(tableName).upsert(dataToInsert as any);
    if (error) {
      console.warn(`[Supabase Sync] Warning saat upsert ke tabel "${tableName}":`, error.message, error.details || '');
      return { success: false, error };
    }
    return { success: true };
  } catch (err) {
    console.warn(`[Supabase Sync] Exception saat upsert ke tabel "${tableName}":`, err);
    return { success: false, error: err };
  }
}

export interface DistributedDeleteOptions {
  tableName: 'user_profiles' | 'teachers';
  id?: string;
  username?: string;
  fullName?: string;
  nip?: string;
  schoolId?: string | null;
  role?: string;
  bulkFilter?: {
    schoolId?: string;
    role?: string;
    keepSuperAdmin?: boolean;
    keepUsername?: string;
  };
}

/**
 * Eksekusi penghapusan terdistribusi (Distributed Delete) untuk Siswa, Guru, dan Proktor.
 * Menghapus akun di Master Hub SEKALIGUS di seluruh Shard Klaster aktif (Klaster 2, Klaster 3)
 * untuk menjamin Zero Ghost Data dan mencegah kebangkitan kembali saat F5/Auto-Heal.
 */
export async function safeSupabaseDistributedDelete(options: DistributedDeleteOptions): Promise<{
  success: boolean;
  deletedMaster: boolean;
  shardsCount: number;
  errors: any[];
}> {
  const errors: any[] = [];
  let deletedMaster = false;
  let shardsCount = 0;

  try {
    const { tableName, id, username, schoolId, bulkFilter } = options;

    // 1. Eksekusi Hapus di Master Hub Supabase (Primary Source)
    try {
      if (bulkFilter) {
        let q = supabase.from(tableName).delete();
        if (bulkFilter.keepSuperAdmin) {
          q = q.neq('username', 'nughejr@gmail.com').neq('role', 'super_admin');
        }
        if (bulkFilter.keepUsername) {
          q = q.neq('username', bulkFilter.keepUsername);
        }
        if (bulkFilter.role && bulkFilter.role !== 'ALL') {
          q = q.eq('role', bulkFilter.role);
        }
        if (bulkFilter.schoolId && bulkFilter.schoolId !== 'ALL') {
          const vSchoolId = toValidUUID(bulkFilter.schoolId);
          if (vSchoolId) q = q.eq('school_id', vSchoolId);
        }
        const { error } = await q;
        if (error) {
          console.warn('[Distributed Delete] Master bulk delete error:', error.message);
          errors.push({ node: 'master', error });
        } else {
          deletedMaster = true;
        }
      } else {
        if (id) {
          const vId = toValidUUID(id);
          const { error } = await supabase.from(tableName).delete().eq('id', vId);
          if (error) {
            console.warn('[Distributed Delete] Master delete by id error:', error.message);
            errors.push({ node: 'master_id', error });
          } else {
            deletedMaster = true;
          }
        }
        if (username) {
          await supabase.from(tableName).delete().eq('username', username.trim());
        }
        // Jika menghapus guru dari user_profiles, hapus juga dari tabel teachers di Master
        if (tableName === 'user_profiles' && options.role === 'teacher') {
          if (id) await supabase.from('teachers').delete().eq('id', toValidUUID(id));
          if (options.fullName) await supabase.from('teachers').delete().eq('full_name', options.fullName.trim());
          if (options.nip) await supabase.from('teachers').delete().eq('nip_nuptk', options.nip.trim());
        }
        // Jika menghapus dari teachers, hapus juga dari user_profiles di Master
        if (tableName === 'teachers') {
          if (id) await supabase.from('user_profiles').delete().eq('id', toValidUUID(id));
          if (username) await supabase.from('user_profiles').delete().eq('username', username.trim());
          if (options.fullName) await supabase.from('user_profiles').delete().eq('full_name', options.fullName.trim());
        }
      }
    } catch (e: any) {
      console.warn('[Distributed Delete] Master catch:', e);
      errors.push({ node: 'master_catch', error: e.message });
    }

    // 2. Broadcast Deletion ke Seluruh Shard Node Aktif (Klaster 2, Klaster 3, dst)
    try {
      const activeShardNodes = getClusterNodes().filter(n => !n.isMaster && n.isActive);
      for (const node of activeShardNodes) {
        try {
          const client = getClientForNode(node);
          if (bulkFilter) {
            let q = client.from(tableName).delete();
            if (bulkFilter.keepSuperAdmin) {
              q = q.neq('username', 'nughejr@gmail.com').neq('role', 'super_admin');
            }
            if (bulkFilter.keepUsername) {
              q = q.neq('username', bulkFilter.keepUsername);
            }
            if (bulkFilter.role && bulkFilter.role !== 'ALL') {
              q = q.eq('role', bulkFilter.role);
            }
            if (bulkFilter.schoolId && bulkFilter.schoolId !== 'ALL') {
              const vSchoolId = toValidUUID(bulkFilter.schoolId);
              if (vSchoolId) q = q.eq('school_id', vSchoolId);
            }
            const { error: shardErr } = await q;
            if (!shardErr) {
              shardsCount++;
            } else {
              errors.push({ node: node.id, error: shardErr });
            }

            // Jika bulk delete siswa per sekolah, bersihkan juga sesi attempt terkait di shard
            if (tableName === 'user_profiles' && (bulkFilter.role === 'student' || bulkFilter.role === 'ALL') && bulkFilter.schoolId && bulkFilter.schoolId !== 'ALL') {
              const vSchoolId = toValidUUID(bulkFilter.schoolId);
              if (vSchoolId) {
                await client.from('student_attempts').delete().eq('school_id', vSchoolId);
              }
            }
          } else {
            let shardDeletedThisNode = false;
            if (id) {
              const vId = toValidUUID(id);
              const { error } = await client.from(tableName).delete().eq('id', vId);
              if (!error) shardDeletedThisNode = true;
            }
            if (username) {
              const { error } = await client.from(tableName).delete().eq('username', username.trim());
              if (!error) shardDeletedThisNode = true;
            }
            if (shardDeletedThisNode) shardsCount++;

            // Cascade cleanup tabel terkait di Shard Node
            if (tableName === 'user_profiles') {
              if (options.role === 'student' && id) {
                const vId = toValidUUID(id);
                await client.from('student_attempts').delete().eq('student_id', vId);
              }
              if (options.role === 'teacher') {
                if (id) await client.from('teachers').delete().eq('id', toValidUUID(id));
                if (options.fullName) await client.from('teachers').delete().eq('full_name', options.fullName.trim());
                if (options.nip) await client.from('teachers').delete().eq('nip_nuptk', options.nip.trim());
              }
            }
            if (tableName === 'teachers') {
              if (id) await client.from('user_profiles').delete().eq('id', toValidUUID(id));
              if (username) await client.from('user_profiles').delete().eq('username', username.trim());
              if (options.fullName) await client.from('user_profiles').delete().eq('full_name', options.fullName.trim());
            }
          }
        } catch (nodeErr: any) {
          errors.push({ node: node.id, error: nodeErr.message });
        }
      }
    } catch (e: any) {
      errors.push({ node: 'shards_loop', error: e.message });
    }

    return {
      success: errors.length === 0 || deletedMaster || shardsCount > 0,
      deletedMaster,
      shardsCount,
      errors
    };
  } catch (err: any) {
    return { success: false, deletedMaster: false, shardsCount: 0, errors: [err] };
  }
}

export interface DistributedUpdateOptions {
  tableName: 'user_profiles' | 'teachers';
  id?: string;
  username?: string;
  schoolId?: string | null;
  previousSchoolId?: string | null;
  role?: string;
  payload: Record<string, any>;
}

/**
 * Eksekusi mutasi UPDATE terdistribusi untuk Siswa, Guru, dan Proktor.
 * Mempropagasi perubahan (Profil, PIN, Password, Status Login, Rombel) ke Master Hub
 * SEKALIGUS ke seluruh Shard Klaster yang relevan secara serentak.
 * Menangani pembersihan Shard lama jika pengguna dipindahkan sekolah (School Transfer).
 */
export async function safeSupabaseDistributedUpdate(options: DistributedUpdateOptions): Promise<{
  success: boolean;
  updatedMaster: boolean;
  shardsCount: number;
  errors: any[];
}> {
  const errors: any[] = [];
  let updatedMaster = false;
  let shardsCount = 0;

  try {
    const { tableName, id, username, schoolId, previousSchoolId, role, payload } = options;
    const sanitizedPayload = { ...payload, updated_at: new Date().toISOString() };

    // 1. Eksekusi UPDATE di Master Hub Supabase
    try {
      if (id) {
        const vId = toValidUUID(id);
        const { error } = await supabase.from(tableName).update(sanitizedPayload).eq('id', vId);
        if (error) {
          console.warn('[Distributed Update] Master update by ID error:', error.message);
          errors.push({ node: 'master_id', error });
        } else {
          updatedMaster = true;
        }
      } else if (username) {
        const { error } = await supabase.from(tableName).update(sanitizedPayload).eq('username', username.trim());
        if (error) {
          console.warn('[Distributed Update] Master update by username error:', error.message);
          errors.push({ node: 'master_user', error });
        } else {
          updatedMaster = true;
        }
      }
    } catch (e: any) {
      errors.push({ node: 'master_catch', error: e.message });
    }

    // 2. Propagasi UPDATE ke Shard Klaster
    try {
      const targetShard = schoolId ? getNodeForSchool(schoolId) : null;
      const activeShardNodes = getClusterNodes().filter(n => !n.isMaster && n.isActive);

      // Broadcast update ke seluruh Shard Klaster aktif untuk memastikan sinkronisasi menyeluruh & 0 stale copy
      const nodesToUpdate = activeShardNodes;

      for (const node of nodesToUpdate) {
        try {
          const client = getClientForNode(node);
          let updatedThisShard = false;

          if (id) {
            const vId = toValidUUID(id);
            const { data: updateData, error: shardErr } = await client
              .from(tableName)
              .update(sanitizedPayload)
              .eq('id', vId)
              .select('id');

            if (!shardErr) {
              if (updateData && updateData.length > 0) {
                updatedThisShard = true;
              } else if (targetShard && targetShard.id === node.id) {
                // Jika node ini adalah shard resmi sekolah pengguna dan belum memiliki record-nya, lakukan upsert
                const formatted = tableName === 'user_profiles'
                  ? formatUserProfileForShard({ ...sanitizedPayload, id: vId })
                  : { ...sanitizedPayload, id: vId };
                await client.from(tableName).upsert(formatted);
                updatedThisShard = true;
              }
            }
          } else if (username) {
            const { error: shardUserErr } = await client.from(tableName).update(sanitizedPayload).eq('username', username.trim());
            if (!shardUserErr) updatedThisShard = true;
          }

          if (updatedThisShard) shardsCount++;
        } catch (nodeErr: any) {
          errors.push({ node: node.id, error: nodeErr.message });
        }
      }

      // 3. Tangani Perpindahan Sekolah (School Transfer): Purge akun dari Shard Klaster lama jika sekolah berubah
      if (previousSchoolId && schoolId && previousSchoolId !== schoolId) {
        const oldNode = getNodeForSchool(previousSchoolId);
        const newNode = getNodeForSchool(schoolId);
        if (oldNode && !oldNode.isMaster && oldNode.id !== newNode.id) {
          try {
            const oldClient = getClientForNode(oldNode);
            if (id) await oldClient.from(tableName).delete().eq('id', toValidUUID(id));
            if (username) await oldClient.from(tableName).delete().eq('username', username.trim());
            console.log(`[Distributed Update] Purged old record from previous shard "${oldNode.name}" due to school transfer.`);
          } catch (purgeErr) {}
        }
      }
    } catch (shardLoopErr: any) {
      errors.push({ node: 'shards_loop', error: shardLoopErr.message });
    }

    return {
      success: errors.length === 0 || updatedMaster || shardsCount > 0,
      updatedMaster,
      shardsCount,
      errors
    };
  } catch (err: any) {
    return { success: false, updatedMaster: false, shardsCount: 0, errors: [err] };
  }
}

/**
 * Memastikan payload blueprint_item hanya memuat kolom valid di public.blueprint_items PostgreSQL
 */
export function formatBlueprintItemForCloud(item: Partial<BlueprintItem>, blueprintId?: string) {
  const resolvedBpId = blueprintId ? toValidUUID(blueprintId) : toValidUUID(item.blueprint_id);
  return {
    id: toValidUUID(item.id),
    blueprint_id: resolvedBpId,
    question_number: Number(item.question_number) || 1,
    element: (item.element && item.element.trim()) ? item.element.trim() : 'Umum',
    sub_element: (item.sub_element && item.sub_element.trim()) ? item.sub_element.trim() : ((item.element && item.element.trim()) || '-'),
    competency: (item.competency && item.competency.trim()) ? item.competency.trim() : '-',
    question_category: item.question_category || 'Single',
    cognitive_level: item.cognitive_level || 'Aplikasi (L2)',
    context: (item.context && item.context.trim()) ? item.context.trim() : 'Personal',
    indicator: (item.indicator && item.indicator.trim()) ? item.indicator.trim() : '-',
    question_type: item.question_type || 'Pilihan Ganda',
    writer_id: item.writer_id ? toValidUUID(item.writer_id) : null,
    reviewer_id: item.reviewer_id ? toValidUUID(item.reviewer_id) : null,
    task_type: item.task_type || 'TULIS',
    workflow_status: item.workflow_status || 'Dalam Penulisan',
    created_at: item.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Memastikan payload question_bank hanya memuat kolom valid di public.question_bank PostgreSQL
 * (Mencegah kolom seperti explanation memicu error PGRST204)
 */
export function formatQuestionForCloud(
  q: Partial<QuestionBankItem>,
  resolvedSubjectId: string,
  bpItemId?: string | null
) {
  return {
    id: toValidUUID(q.id),
    blueprint_item_id: bpItemId ? toValidUUID(bpItemId) : (q.blueprint_item_id ? toValidUUID(q.blueprint_item_id) : null),
    subject_id: resolvedSubjectId,
    level: q.level || 'SD',
    phase: q.phase || 'B',
    stimulus_text: q.stimulus_text || null,
    stimulus_media_url: q.stimulus_media_url || null,
    question_text: q.question_text || '',
    question_type: q.question_type || 'Pilihan Ganda',
    weight: Number(q.weight) || 1.0,
    status: q.status || 'Draft',
    created_at: q.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Memastikan payload question_options memiliki UUID valid dan kolom yang sesuai dengan schema
 */
export function formatOptionsForCloud(options: QuestionOption[] | undefined, questionId: string) {
  if (!options || options.length === 0) return [];
  const validQId = toValidUUID(questionId);
  return options.map((opt, idx) => {
    let optId = opt.id;
    // Cegah tabrakan UUID: jika opt.id kosong, tidak valid UUID, atau memakai ID hash bawaan statis ('1', '2', dst)
    if (!optId || !isValidUUID(optId) || optId.startsWith('00000000-0000-4000-8000-00000000003')) {
      optId = generateValidUUID();
    }
    return {
      id: optId,
      question_id: validQId,
      option_label: opt.option_label || String.fromCharCode(65 + idx),
      option_text: opt.option_text || '',
      option_media_url: opt.option_media_url || null,
      matching_pair_text: opt.matching_pair_text || null,
      is_correct: Boolean(opt.is_correct),
      distractor_note: opt.distractor_note || null,
      created_at: new Date().toISOString()
    };
  });
}

/**
 * Sinkronisasi Penulis Butir Soal (Dual-Engine: direct table column + universal context_presets namespace)
 * Memastikan atribusi penulis tersimpan 100% konsisten lintas perangkat bahkan jika ada kendala foreign key constraint
 */
export async function fetchBlueprintItemWritersFromCloud(): Promise<Record<string, { writer_id: string; writer_name: string }>> {
  const result: Record<string, { writer_id: string; writer_name: string }> = {};
  try {
    const { data, error } = await supabase
      .from('context_presets')
      .select('*')
      .eq('subject_name', '__SASI_BP_ITEM_WRITER__');

    if (!error && data && data.length > 0) {
      data.forEach(row => {
        if (row.id && row.context_text) {
          const parts = row.context_text.split('|');
          const writerId = parts[0]?.trim() || '';
          const writerName = parts[1]?.trim() || '';
          if (writerId || writerName) {
            result[row.id] = { writer_id: writerId, writer_name: writerName };
          }
        }
      });
    }
  } catch (e) {
    console.warn('Fetch blueprint item writers fallback:', e);
  }
  return result;
}

export async function saveBlueprintItemWriterToCloud(itemId: string, writerId: string | null | undefined, writerName?: string) {
  try {
    if (!itemId) return;
    const cloudId = toValidUUID(itemId);
    const resolvedWriterId = writerId ? toValidUUID(writerId) : '';
    const resolvedWriterName = writerName || '';
    if (!resolvedWriterId && !resolvedWriterName) return;

    await safeSupabaseUpsert('context_presets', {
      id: cloudId,
      subject_name: '__SASI_BP_ITEM_WRITER__',
      context_text: `${resolvedWriterId}|${resolvedWriterName}`
    });
  } catch (e) {
    console.warn('Save blueprint item writer fallback:', e);
  }
}

export async function deleteBlueprintItemWriterFromCloud(itemId: string) {
  try {
    if (!itemId) return;
    const cloudId = toValidUUID(itemId);
    await supabase.from('context_presets').delete().eq('id', cloudId);
  } catch (e) {}
}

/**
 * Helper Serialisasi Pipe untuk Penyimpanan Hemat Ruang di PostgreSQL VARCHAR(255)
 */
export function encodeWriterAssignmentToPipe(a: QuestionWriterAssignment): string {
  const parts = [
    a.user_id || '',
    a.user_name || '',
    a.user_email || '',
    a.user_institution || '',
    a.user_type || '',
    a.subject_name || '',
    a.grade_class || '',
    a.phase || '',
    a.level || '',
    (a.assessment_types || []).join(','),
    a.target_questions ?? 30,
    a.status || 'Draft',
    a.is_archived ? '1' : '0',
    a.created_at || new Date().toISOString()
  ];
  return `SASI_P1:${parts.join('|')}`;
}

export function decodeWriterAssignmentFromPipe(id: string, text: string): QuestionWriterAssignment | null {
  if (!text) return null;
  
  // Format JSON (jika data disimpan sebagai JSON utuh)
  if (text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      return { ...parsed, id };
    } catch (e) {}
  }

  // Format SASI_P1 Pipe Compact
  const cleanText = text.startsWith('SASI_P1:') ? text.slice(8) : text;
  const parts = cleanText.split('|');
  if (parts.length < 9) return null;

  const [
    user_id,
    user_name,
    user_email,
    user_institution,
    user_type,
    subject_name,
    grade_class,
    phase,
    level,
    assessment_types_str,
    target_questions_str,
    status,
    is_archived_str,
    created_at
  ] = parts;

  return {
    id,
    user_id: user_id || '',
    user_name: user_name || '',
    user_email: user_email || undefined,
    user_institution: user_institution || undefined,
    user_type: (user_type as any) || undefined,
    subject_name: subject_name || '',
    grade_class: grade_class || '',
    phase: (phase as any) || 'A',
    level: (level as any) || 'SD',
    assessment_types: assessment_types_str ? (assessment_types_str.split(',') as any[]) : ['SAS'],
    target_questions: target_questions_str ? parseInt(target_questions_str, 10) : 30,
    status: (status as any) || 'Draft',
    is_archived: is_archived_str === '1',
    created_at: created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Deduplikasi daftar QuestionWriterAssignment berdasarkan kunci unik logis
 * (user_id/user_name + subject_name + grade_class).
 * Memberikan prioritas pada item dari Cloud (UUID valid) dibanding ID lokal statis lama ('asg-001', dst).
 */
export function deduplicateWriterAssignments(
  items: QuestionWriterAssignment[]
): QuestionWriterAssignment[] {
  if (!items || items.length === 0) return [];

  // Filter out dummy test items
  const cleanList = items.filter(
    a => a && a.id !== 'asg-003' && a.id !== 'asg-004' && a.id !== 'asg-005' && a.id !== 'asg-006'
  );

  const resultMap = new Map<string, QuestionWriterAssignment>();

  for (const item of cleanList) {
    const teacherKey = (item.user_name || item.user_id || '').trim().toLowerCase();
    const subjectKey = (item.subject_name || '').trim().toLowerCase();
    const gradeKey = (item.grade_class || '').trim().toLowerCase();
    const uniqueKey = `${teacherKey}_${subjectKey}_${gradeKey}`;

    if (!resultMap.has(uniqueKey)) {
      resultMap.set(uniqueKey, item);
    } else {
      const existing = resultMap.get(uniqueKey)!;
      const itemIsUUID = isValidUUID(item.id);
      const existingIsUUID = isValidUUID(existing.id);

      if (itemIsUUID && !existingIsUUID) {
        // Prioritaskan ID UUID dari Cloud
        resultMap.set(uniqueKey, item);
      } else if (itemIsUUID === existingIsUUID) {
        const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
        const itemTime = new Date(item.updated_at || item.created_at || 0).getTime();
        if (itemTime > existingTime) {
          resultMap.set(uniqueKey, item);
        }
      }
    }
  }

  return Array.from(resultMap.values());
}

/**
 * Sinkronisasi Penugasan Penulis Soal ke Supabase Cloud (Dual Engine: Dedicated Table + context_presets namespace)
 */
export async function fetchWriterAssignmentsFromCloud(): Promise<QuestionWriterAssignment[]> {
  try {
    // 1. Coba baca dari dedicated table jika tersedia di Supabase Cloud
    const { data: dedicatedData, error: dedicatedErr } = await supabase
      .from('question_writer_assignments')
      .select('*')
      .order('created_at', { ascending: false });

    if (!dedicatedErr && dedicatedData && Array.isArray(dedicatedData) && dedicatedData.length > 0) {
      return dedicatedData as QuestionWriterAssignment[];
    }
  } catch (e) {}

  // 2. Universal cloud storage fallback via context_presets namespace (Always 100% active & cross-device)
  try {
    const { data, error } = await supabase
      .from('context_presets')
      .select('*')
      .eq('subject_name', '__SASI_WRITER_ASSIGNMENT__');

    if (!error && data && data.length > 0) {
      const parsed: QuestionWriterAssignment[] = [];
      data.forEach(row => {
        const item = decodeWriterAssignmentFromPipe(row.id, row.context_text);
        if (item) {
          parsed.push(item);
        }
      });
      return parsed;
    }
  } catch (e) {
    console.warn('Fetch writer assignments fallback:', e);
  }
  return [];
}

export async function saveWriterAssignmentToCloud(assignment: QuestionWriterAssignment) {
  try {
    const cloudId = toValidUUID(assignment.id);
    const normalized = { ...assignment, id: cloudId };

    // 1. Simpan ke context_presets namespace menggunakan format pipe compact (menjamin muat di VARCHAR(255))
    const encodedPayload = encodeWriterAssignmentToPipe(normalized);
    await safeSupabaseUpsert('context_presets', {
      id: cloudId,
      subject_name: '__SASI_WRITER_ASSIGNMENT__',
      context_text: encodedPayload
    });

    // 2. Juga upsert ke tabel dedicated jika sudah terpasang di database
    try {
      await supabase.from('question_writer_assignments').upsert(normalized);
    } catch (e) {}
  } catch (e) {
    console.warn('Save writer assignment fallback:', e);
  }
}

export async function deleteWriterAssignmentFromCloud(id: string) {
  try {
    const cloudId = toValidUUID(id);
    await supabase.from('context_presets').delete().eq('id', cloudId);
    try {
      await supabase.from('question_writer_assignments').delete().eq('id', cloudId);
    } catch (e) {}
  } catch (e) {
    console.warn('Delete writer assignment fallback:', e);
  }
}

export interface BapReportPayload {
  examDay: string;
  examDate: string;
  roomName: string;
  timeStart: string;
  timeEnd: string;
  subjectName?: string;
  totalRegistered: number;
  totalPresent: number;
  totalAbsent: number;
  absentNames: string;
  incidentNotes: string;
  supervisorName: string;
  supervisorNip: string;
  proctorName: string;
  proctorNip: string;
}

/**
 * Persistensi Cloud Berita Acara Ujian (BAP) (Dual Engine: Dedicated Table + context_presets namespace)
 */
export async function fetchBapReportFromCloud(
  schoolId: string,
  sessionId: string
): Promise<Partial<BapReportPayload> | null> {
  const cleanSchoolId = toValidUUID(schoolId);
  const cleanSessionId = toValidUUID(sessionId);

  // 1. Coba baca dari dedicated table jika tersedia di Supabase Cloud
  try {
    const { data: dedicatedData, error: dedicatedErr } = await supabase
      .from('exam_bap_reports')
      .select('*')
      .eq('school_id', cleanSchoolId)
      .eq('session_id', cleanSessionId)
      .maybeSingle();

    if (!dedicatedErr && dedicatedData) {
      return {
        examDay: dedicatedData.exam_day,
        examDate: dedicatedData.exam_date,
        roomName: dedicatedData.room_name,
        timeStart: dedicatedData.time_start,
        timeEnd: dedicatedData.time_end,
        subjectName: dedicatedData.subject_name,
        totalRegistered: Number(dedicatedData.total_registered) || 0,
        totalPresent: Number(dedicatedData.total_present) || 0,
        totalAbsent: Number(dedicatedData.total_absent) || 0,
        absentNames: dedicatedData.absent_names,
        incidentNotes: dedicatedData.incident_notes,
        supervisorName: dedicatedData.supervisor_name,
        supervisorNip: dedicatedData.supervisor_nip,
        proctorName: dedicatedData.proctor_name,
        proctorNip: dedicatedData.proctor_nip
      };
    }
  } catch (e) {}

  // 2. Universal cloud storage fallback via context_presets namespace
  try {
    const metaId = toValidUUID(`bap_meta_${cleanSchoolId}_${cleanSessionId}`);
    const notesId = toValidUUID(`bap_notes_${cleanSchoolId}_${cleanSessionId}`);
    const absentId = toValidUUID(`bap_absent_${cleanSchoolId}_${cleanSessionId}`);

    const { data: rows, error } = await supabase
      .from('context_presets')
      .select('*')
      .in('id', [metaId, notesId, absentId]);

    if (!error && rows && rows.length > 0) {
      const metaRow = rows.find(r => r.id === metaId);
      const notesRow = rows.find(r => r.id === notesId);
      const absentRow = rows.find(r => r.id === absentId);

      if (metaRow && metaRow.context_text) {
        const parts = metaRow.context_text.split('|');
        return {
          examDay: parts[0] || '',
          examDate: parts[1] || '',
          roomName: parts[2] || '',
          timeStart: parts[3] || '',
          timeEnd: parts[4] || '',
          totalRegistered: Number(parts[5]) || 0,
          totalPresent: Number(parts[6]) || 0,
          totalAbsent: Number(parts[7]) || 0,
          proctorName: parts[8] || '',
          proctorNip: parts[9] || '',
          supervisorName: parts[10] || '',
          supervisorNip: parts[11] || '',
          incidentNotes: notesRow?.context_text || '',
          absentNames: absentRow?.context_text || ''
        };
      }
    }
  } catch (e) {
    console.warn('Fetch BAP fallback warning:', e);
  }
  return null;
}

export async function saveBapReportToCloud(
  schoolId: string,
  sessionId: string,
  bap: BapReportPayload
): Promise<void> {
  const cleanSchoolId = toValidUUID(schoolId);
  const cleanSessionId = toValidUUID(sessionId);

  // 1. Simpan ke context_presets namespace (universal cloud storage)
  try {
    const metaId = toValidUUID(`bap_meta_${cleanSchoolId}_${cleanSessionId}`);
    const notesId = toValidUUID(`bap_notes_${cleanSchoolId}_${cleanSessionId}`);
    const absentId = toValidUUID(`bap_absent_${cleanSchoolId}_${cleanSessionId}`);

    const metaPayload = [
      bap.examDay || '',
      bap.examDate || '',
      bap.roomName || '',
      bap.timeStart || '',
      bap.timeEnd || '',
      bap.totalRegistered ?? 0,
      bap.totalPresent ?? 0,
      bap.totalAbsent ?? 0,
      bap.proctorName || '',
      bap.proctorNip || '',
      bap.supervisorName || '',
      bap.supervisorNip || ''
    ].join('|');

    await Promise.allSettled([
      safeSupabaseUpsert('context_presets', {
        id: metaId,
        subject_name: '__SASI_BAP_META__',
        context_text: metaPayload
      }),
      safeSupabaseUpsert('context_presets', {
        id: notesId,
        subject_name: '__SASI_BAP_NOTES__',
        context_text: (bap.incidentNotes || '').slice(0, 250)
      }),
      safeSupabaseUpsert('context_presets', {
        id: absentId,
        subject_name: '__SASI_BAP_ABSENT__',
        context_text: (bap.absentNames || '').slice(0, 250)
      })
    ]);
  } catch (e) {
    console.warn('Save BAP to context_presets fallback:', e);
  }

  // 2. Juga coba upsert ke tabel dedicated jika tersedia
  try {
    await supabase.from('exam_bap_reports').upsert({
      id: toValidUUID(`bap_rep_${cleanSchoolId}_${cleanSessionId}`),
      school_id: cleanSchoolId,
      session_id: cleanSessionId,
      exam_day: bap.examDay,
      exam_date: bap.examDate,
      room_name: bap.roomName,
      time_start: bap.timeStart,
      time_end: bap.timeEnd,
      subject_name: bap.subjectName,
      total_registered: bap.totalRegistered,
      total_present: bap.totalPresent,
      total_absent: bap.totalAbsent,
      absent_names: bap.absentNames,
      incident_notes: bap.incidentNotes,
      supervisor_name: bap.supervisorName,
      supervisor_nip: bap.supervisorNip,
      proctor_name: bap.proctorName,
      proctor_nip: bap.proctorNip,
      updated_at: new Date().toISOString()
    });
  } catch (e) {}
}


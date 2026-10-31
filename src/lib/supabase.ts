import { createClient } from '@supabase/supabase-js';
import { 
  UserProfile, 
  Blueprint, 
  BlueprintItem, 
  QuestionBankItem, 
  ExamSession, 
  StudentAttempt, 
  StudentAnswer 
} from '../types/database';

// Safe environment variable resolution (Vite browser + Node test runner)
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) 
  ? (import.meta as any).env 
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://lmlflfkdukcdhkdjssmm.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jCtI_SZy-jxcJoDkeXPN-g_HKO4LEXX';

// Server Cadangan Darurat (Disaster Recovery Project Baru)
export const BACKUP_SUPABASE_URL = 'https://xtgqdbqjokzkgzzagdly.supabase.co';
export const BACKUP_SUPABASE_ANON_KEY = 'sb_publishable_oBxW-P4ypotuVHxTl1nEtw_-7ZTeUOK';

export const isLiveSupabase = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  SUPABASE_URL.includes('lmlflfkdukcdhkdjssmm')
);

// Client Master Utama
export const primarySupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Client Cadangan Darurat (Standby Disaster Recovery)
export const backupSupabase = createClient(BACKUP_SUPABASE_URL, BACKUP_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Tabel yang dilindungi fitur Dual-Write (Replikasi Instan Tanpa Blokir untuk Guru & Asesmen)
export const DUAL_WRITE_TABLES = new Set([
  'question_bank',
  'question_options',
  'blueprints',
  'blueprint_items',
  'exam_packages',
  'exam_package_questions',
  'exam_sessions',
  'user_profiles',
  'schools',
  'teachers',
  'supervisors',
  'question_writer_assignments'
]);

// Dynamic Failover & Dual-Write Proxy:
// 1. Secara otomatis membaca dari Master saat normal, atau dari Backup saat Failover aktif
// 2. Setiap kali Guru menyimpan/mengubah/menghapus bank soal, kisi-kisi, atau paket ujian,
//    data otomatis direplikasi ke Server Cadangan di latar belakang (Non-Blocking Dual-Write)
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    let isFailover = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        isFailover = window.localStorage.getItem('sasi_cluster_failover_active') === 'true';
      }
    } catch {}

    if (prop === 'from') {
      return function(tableName: string) {
        const client = isFailover ? backupSupabase : primarySupabase;
        const targetBuilder = client.from(tableName as any);

        // Jika Failover aktif atau tabel bukan tabel data penting, kembalikan builder standar
        if (isFailover || !DUAL_WRITE_TABLES.has(tableName)) {
          return targetBuilder;
        }

        // DUAL-WRITE INTERCEPTOR: Replikasi perubahan ke Server Cadangan di latar belakang
        const backupBuilder = backupSupabase.from(tableName as any);
        return new Proxy(targetBuilder, {
          get(bTarget, bProp) {
            const orig = (bTarget as any)[bProp];
            if (typeof orig !== 'function') return orig;

            // Replikasi INSERT & UPSERT ke Server Cadangan
            if (bProp === 'insert' || bProp === 'upsert') {
              return function(values: any, options: any) {
                try {
                  const bMethod = (backupBuilder as any)[bProp];
                  if (typeof bMethod === 'function') {
                    bMethod.call(backupBuilder, values, options)
                      .then(() => {})
                      .catch((err: any) => console.warn(`[Dual-Write Silent Warning on ${tableName}]:`, err?.message));
                  }
                } catch {}
                return orig.apply(bTarget, arguments);
              };
            }

            // Replikasi DELETE ke Server Cadangan
            if (bProp === 'delete') {
              return function() {
                const pDelete = orig.apply(bTarget, arguments);
                const bDelete = backupBuilder.delete();
                return new Proxy(pDelete, {
                  get(dTarget, dProp) {
                    const dOrig = (dTarget as any)[dProp];
                    if (typeof dOrig !== 'function') return dOrig;
                    if (dProp === 'eq' || dProp === 'in') {
                      return function(col: string, val: any) {
                        try {
                          (bDelete as any)[dProp](col, val)
                            .then(() => {})
                            .catch((err: any) => console.warn(`[Dual-Write Delete Warning on ${tableName}]:`, err?.message));
                        } catch {}
                        return dOrig.apply(dTarget, arguments);
                      };
                    }
                    return dOrig.bind(dTarget);
                  }
                });
              };
            }

            return orig.bind(bTarget);
          }
        });
      };
    }

    const client = isFailover ? backupSupabase : primarySupabase;
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

// ==============================================================================
// AUTHENTICATION SERVICES
// ==============================================================================

/**
 * Siswa login with automatic email masking: [nisn]@siswa.sasi.id
 */
export async function authenticateStudent(nisn: string, pin: string) {
  const maskedEmail = `${nisn.trim()}@siswa.sasi.id`;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: maskedEmail,
      password: pin.trim(),
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Fetch user profile from public.user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*, school:schools(*)')
      .eq('id', data.user.id)
      .single();

    return { success: true, user: profile, session: data.session };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Petugas login (Super Admin, Assistant Admin, Proctor)
 */
export async function authenticateOfficer(email: string, pass: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*, school:schools(*)')
      .eq('id', data.user.id)
      .single();

    return { success: true, user: profile, session: data.session };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==============================================================================
// REALTIME SUBSCRIPTIONS
// ==============================================================================

export function subscribeToExamMonitoring(
  sessionId: string,
  onAttemptChange: (payload: any) => void
) {
  return supabase
    .channel(`exam-session-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'student_attempts',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onAttemptChange(payload);
      }
    )
    .subscribe();
}

// ==============================================================================
// PROCTOR EMERGENCY ACTIONS
// ==============================================================================

export async function proctorResetStudentPassword(studentId: string, newPin: string) {
  // Update in user_profiles
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ exam_card_password: newPin, updated_at: new Date().toISOString() })
    .eq('id', studentId);

  return { success: !error, error };
}

export async function proctorResetLoginStatus(studentId: string) {
  // Release device lock
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ is_logged_in: false, updated_at: new Date().toISOString() })
    .eq('id', studentId);

  return { success: !error, error };
}

export async function proctorForceSubmit(attemptId: string, score: number) {
  const { data, error } = await supabase
    .from('student_attempts')
    .update({
      status: 'completed',
      submitted_at: new Date().toISOString(),
      final_score: score,
    })
    .eq('id', attemptId);

  return { success: !error, error };
}

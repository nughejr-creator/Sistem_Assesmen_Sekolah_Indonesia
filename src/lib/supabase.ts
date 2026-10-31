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

// Dynamic Failover Proxy: Otomatis mengarahkan seluruh query ke Server Cadangan jika Failover aktif
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    let isFailover = false;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        isFailover = window.localStorage.getItem('sasi_cluster_failover_active') === 'true';
      }
    } catch {}

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

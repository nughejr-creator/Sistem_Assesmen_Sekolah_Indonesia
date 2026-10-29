// Self-contained Vercel Serverless Function Types (Zero External Dependency)
interface VercelRequest {
  method?: string;
  body?: any;
  query?: Record<string, string | string[]>;
}

interface VercelResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
}

declare const process: {
  env: Record<string, string | undefined>;
};

import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { schoolId, shardUrl, shardAnonKey } = req.body || {};

    if (!schoolId || !shardUrl || !shardAnonKey) {
      return res.status(400).json({
        error: 'Parameter schoolId, shardUrl, dan shardAnonKey wajib disertakan.'
      });
    }

    const masterUrl = process.env.VITE_SUPABASE_URL || 'https://cvjhuzpgybtyxphmsrqt.supabase.co';
    const masterKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

    const masterClient = createClient(masterUrl, masterKey, { auth: { persistSession: false } });
    const shardClient = createClient(shardUrl, shardAnonKey, { auth: { persistSession: false } });

    // 1. Fetch Master Users
    const { data: masterData, error: masterErr } = await masterClient
      .from('user_profiles')
      .select('id, username, full_name, role, exam_card_password, password')
      .eq('school_id', schoolId);

    if (masterErr) {
      return res.status(500).json({ error: `Gagal membaca Master Hub: ${masterErr.message}` });
    }

    // 2. Fetch Shard Users
    const { data: shardData, error: shardErr } = await shardClient
      .from('user_profiles')
      .select('id, username, full_name, role, exam_card_password, password')
      .eq('school_id', schoolId);

    if (shardErr) {
      return res.status(502).json({ error: `Gagal menghubungi Shard Node: ${shardErr.message}` });
    }

    const masterUsers = masterData || [];
    const shardUsers = shardData || [];

    const shardById = new Map(shardUsers.map(u => [u.id, u]));
    const shardByUsername = new Map(shardUsers.map(u => [(u.username || '').toLowerCase().trim(), u]));

    let matchedStudents = 0;
    let mismatchedStudents = 0;
    const discrepancies: any[] = [];

    for (const mUser of masterUsers) {
      const match = shardById.get(mUser.id) || shardByUsername.get((mUser.username || '').toLowerCase().trim());

      if (!match) {
        mismatchedStudents++;
        discrepancies.push({
          userId: mUser.id,
          username: mUser.username,
          name: mUser.full_name,
          issue: 'Data akun siswa ada di Master Cloud tetapi belum tersinkronisasi di Shard Node lokal.'
        });
        continue;
      }

      // Check parity on password/hash
      const passParity = (mUser.password === match.password) || (mUser.exam_card_password === match.exam_card_password);
      if (!passParity) {
        mismatchedStudents++;
        discrepancies.push({
          userId: mUser.id,
          username: mUser.username,
          name: mUser.full_name,
          issue: 'Kredensial / Password kartu ujian siswa di Shard tidak identik dengan Master Hub.'
        });
      } else {
        matchedStudents++;
      }
    }

    const totalStudents = masterUsers.length;
    const isHealthy = mismatchedStudents === 0 && totalStudents > 0;

    return res.status(200).json({
      success: true,
      schoolId,
      healthy: isHealthy,
      audit: {
        totalMaster: totalStudents,
        totalShard: shardUsers.length,
        matchedStudents,
        mismatchedStudents,
        discrepancies: discrepancies.slice(0, 15) // Top 15 samples
      },
      checkedAt: new Date().toISOString()
    });

  } catch (error: any) {
    return res.status(500).json({
      error: 'Terjadi kesalahan sistem saat validasi partisi kluster.',
      details: error.message
    });
  }
}

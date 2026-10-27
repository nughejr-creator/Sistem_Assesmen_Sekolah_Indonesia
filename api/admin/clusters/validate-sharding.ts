import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { schoolId, shardUrl, shardAnonKey } = req.body;

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
    let matchedProctors = 0;
    let credMismatches = 0;
    const missing: string[] = [];

    const mStudents = masterUsers.filter(u => u.role === 'student');
    const mProctors = masterUsers.filter(u => u.role === 'proctor');
    const sStudents = shardUsers.filter(u => u.role === 'student');
    const sProctors = shardUsers.filter(u => u.role === 'proctor');

    for (const mu of masterUsers) {
      const uName = (mu.username || '').toLowerCase().trim();
      const su = shardById.get(mu.id) || shardByUsername.get(uName);
      if (!su) {
        missing.push(mu.username);
        continue;
      }
      if (mu.role === 'student') matchedStudents++;
      if (mu.role === 'proctor') matchedProctors++;

      if ((mu.exam_card_password || '') !== (su.exam_card_password || '') || (mu.password || '') !== (su.password || '')) {
        credMismatches++;
      }
    }

    const isValid = mStudents.length === sStudents.length && mProctors.length === sProctors.length && missing.length === 0 && credMismatches === 0;

    return res.status(200).json({
      status: isValid ? 'VALID_READY_FOR_CBT' : 'MISMATCH_DETECTED',
      schoolId,
      summary: {
        students: { master: mStudents.length, shard: sStudents.length, matched: matchedStudents, missing: mStudents.length - matchedStudents },
        proctors: { master: mProctors.length, shard: sProctors.length, matched: matchedProctors, missing: mProctors.length - matchedProctors },
        credentialMismatches: credMismatches
      },
      diagnostics: {
        missingUsernames: missing
      },
      auditedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal audit error' });
  }
}

import { supabase } from './supabase';
import { DatabaseNode, getClientForNode } from './clusterManager';
import { School } from '../types/database';

export interface AuditCountDetail {
  master: number;
  shard: number;
  matched: number;
  missing: number;
  status: 'MATCH' | 'MISMATCH';
}

export interface SchoolAuditResult {
  schoolId: string;
  schoolName: string;
  npsn?: string;
  status: 'VALID_READY_FOR_CBT' | 'MISMATCH_DETECTED' | 'OFFLINE_OR_ERROR';
  students: AuditCountDetail;
  proctors: AuditCountDetail;
  teachers: AuditCountDetail;
  credentialMismatches: number;
  orphanInShard: number;
  diagnostics: {
    missingUsernames: string[];
    credentialMismatchUsernames: string[];
    orphanUsernames: string[];
  };
  errorMessage?: string;
  durationMs: number;
}

export interface NodeAuditSummary {
  nodeId: string;
  nodeName: string;
  supabaseUrl: string;
  overallStatus: 'VALID_READY_FOR_CBT' | 'MISMATCH_DETECTED' | 'OFFLINE_OR_ERROR';
  totalSchoolsAudited: number;
  results: SchoolAuditResult[];
  auditedAt: string;
  totalDurationMs: number;
  errorMessage?: string;
}

/**
 * Audit integritas data satu sekolah antara Master Hub dan Target Shard Node
 */
export async function auditSchoolSharding(
  node: DatabaseNode,
  schoolId: string,
  schoolName: string = 'Sekolah',
  npsn?: string
): Promise<SchoolAuditResult> {
  const startTime = performance.now();

  try {
    if (!node.supabaseUrl || !node.supabaseAnonKey) {
      return {
        schoolId,
        schoolName,
        npsn,
        status: 'OFFLINE_OR_ERROR',
        students: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        proctors: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        teachers: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        credentialMismatches: 0,
        orphanInShard: 0,
        diagnostics: { missingUsernames: [], credentialMismatchUsernames: [], orphanUsernames: [] },
        errorMessage: 'Kredensial URL / Anon Key node klaster tidak lengkap.',
        durationMs: Math.round(performance.now() - startTime)
      };
    }

    const shardClient = getClientForNode(node);

    // 1. Ambil data Master Hub untuk sekolah target secara terproyeksi (hemat memori)
    const { data: masterData, error: masterErr } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, role, exam_card_password, password')
      .eq('school_id', schoolId);

    if (masterErr) {
      return {
        schoolId,
        schoolName,
        npsn,
        status: 'OFFLINE_OR_ERROR',
        students: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        proctors: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        teachers: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        credentialMismatches: 0,
        orphanInShard: 0,
        diagnostics: { missingUsernames: [], credentialMismatchUsernames: [], orphanUsernames: [] },
        errorMessage: `Gagal membaca Master Hub: ${masterErr.message}`,
        durationMs: Math.round(performance.now() - startTime)
      };
    }

    // 2. Ambil data Shard Node untuk sekolah target
    let shardData: any[] = [];
    try {
      const { data: sData, error: sErr } = await shardClient
        .from('user_profiles')
        .select('id, username, full_name, role, exam_card_password, password')
        .eq('school_id', schoolId);

      if (sErr) {
        return {
          schoolId,
          schoolName,
          npsn,
          status: 'OFFLINE_OR_ERROR',
          students: { master: masterData?.filter(u => u.role === 'student').length || 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
          proctors: { master: masterData?.filter(u => u.role === 'proctor').length || 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
          teachers: { master: masterData?.filter(u => u.role === 'teacher').length || 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
          credentialMismatches: 0,
          orphanInShard: 0,
          diagnostics: { missingUsernames: [], credentialMismatchUsernames: [], orphanUsernames: [] },
          errorMessage: `Gagal menghubungi Shard Node (${node.name}): ${sErr.message}`,
          durationMs: Math.round(performance.now() - startTime)
        };
      }
      shardData = sData || [];
    } catch (netErr: any) {
      return {
        schoolId,
        schoolName,
        npsn,
        status: 'OFFLINE_OR_ERROR',
        students: { master: masterData?.filter(u => u.role === 'student').length || 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        proctors: { master: masterData?.filter(u => u.role === 'proctor').length || 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        teachers: { master: masterData?.filter(u => u.role === 'teacher').length || 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
        credentialMismatches: 0,
        orphanInShard: 0,
        diagnostics: { missingUsernames: [], credentialMismatchUsernames: [], orphanUsernames: [] },
        errorMessage: `Koneksi ke Shard Node gagal / timeout: ${netErr.message || 'Network unreachable'}`,
        durationMs: Math.round(performance.now() - startTime)
      };
    }

    // 3. Bangun Lookup Map untuk verifikasi O(N)
    const masterUsers = masterData || [];
    const shardById = new Map<string, any>();
    const shardByUsername = new Map<string, any>();

    shardData.forEach(su => {
      if (su.id) shardById.set(su.id, su);
      if (su.username) shardByUsername.set(su.username.toLowerCase().trim(), su);
    });

    const masterUsernames = new Set(masterUsers.map(u => (u.username || '').toLowerCase().trim()));
    const missingUsernames: string[] = [];
    const credentialMismatchUsernames: string[] = [];

    let matchedStudents = 0;
    let matchedProctors = 0;
    let matchedTeachers = 0;
    let credMismatches = 0;

    // Hitung Master counts
    const mStudents = masterUsers.filter(u => u.role === 'student');
    const mProctors = masterUsers.filter(u => u.role === 'proctor');
    const mTeachers = masterUsers.filter(u => u.role === 'teacher');

    // Hitung Shard counts
    const sStudents = shardData.filter(u => u.role === 'student');
    const sProctors = shardData.filter(u => u.role === 'proctor');
    const sTeachers = shardData.filter(u => u.role === 'teacher');

    // 4. Verifikasi setiap user di Master Hub terhadap Shard
    for (const mu of masterUsers) {
      const uName = (mu.username || '').toLowerCase().trim();
      const su = shardById.get(mu.id) || shardByUsername.get(uName);

      if (!su) {
        missingUsernames.push(`${mu.full_name} (${mu.username}) [${mu.role}]`);
        continue;
      }

      // Cek kecocokan role
      if (mu.role === 'student') matchedStudents++;
      else if (mu.role === 'proctor') matchedProctors++;
      else if (mu.role === 'teacher') matchedTeachers++;

      // Cek integritas kredensial (PIN dan Password)
      const pinMatch = (mu.exam_card_password || '') === (su.exam_card_password || '');
      const pwdMatch = (mu.password || '') === (su.password || '');
      if (!pinMatch || !pwdMatch) {
        credMismatches++;
        credentialMismatchUsernames.push(`${mu.full_name} (${mu.username})`);
      }
    }

    // 5. Deteksi orphan records di Shard (ada di Shard tapi tidak ada di Master)
    const orphanUsernames: string[] = [];
    shardData.forEach(su => {
      const uName = (su.username || '').toLowerCase().trim();
      if (!masterUsernames.has(uName)) {
        orphanUsernames.push(`${su.full_name || su.username} (${su.username})`);
      }
    });

    // 6. Evaluasi Kelayakan CBT
    const isStudentMatch = mStudents.length === sStudents.length && missingUsernames.filter(u => u.includes('[student]')).length === 0;
    const isProctorMatch = mProctors.length === sProctors.length && missingUsernames.filter(u => u.includes('[proctor]')).length === 0;
    const isTeacherMatch = mTeachers.length === sTeachers.length;
    const hasZeroMismatches = missingUsernames.length === 0 && credMismatches === 0 && orphanUsernames.length === 0;

    const isValid = isStudentMatch && isProctorMatch && isTeacherMatch && hasZeroMismatches;

    return {
      schoolId,
      schoolName,
      npsn,
      status: isValid ? 'VALID_READY_FOR_CBT' : 'MISMATCH_DETECTED',
      students: {
        master: mStudents.length,
        shard: sStudents.length,
        matched: matchedStudents,
        missing: mStudents.length - matchedStudents,
        status: isStudentMatch ? 'MATCH' : 'MISMATCH'
      },
      proctors: {
        master: mProctors.length,
        shard: sProctors.length,
        matched: matchedProctors,
        missing: mProctors.length - matchedProctors,
        status: isProctorMatch ? 'MATCH' : 'MISMATCH'
      },
      teachers: {
        master: mTeachers.length,
        shard: sTeachers.length,
        matched: matchedTeachers,
        missing: mTeachers.length - matchedTeachers,
        status: isTeacherMatch ? 'MATCH' : 'MISMATCH'
      },
      credentialMismatches: credMismatches,
      orphanInShard: orphanUsernames.length,
      diagnostics: {
        missingUsernames,
        credentialMismatchUsernames,
        orphanUsernames
      },
      durationMs: Math.round(performance.now() - startTime)
    };
  } catch (err: any) {
    return {
      schoolId,
      schoolName,
      npsn,
      status: 'OFFLINE_OR_ERROR',
      students: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
      proctors: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
      teachers: { master: 0, shard: 0, matched: 0, missing: 0, status: 'MISMATCH' },
      credentialMismatches: 0,
      orphanInShard: 0,
      diagnostics: { missingUsernames: [], credentialMismatchUsernames: [], orphanUsernames: [] },
      errorMessage: err.message || 'Kesalahan audit sistem internal.',
      durationMs: Math.round(performance.now() - startTime)
    };
  }
}

/**
 * Audit menyeluruh untuk seluruh sekolah yang dialokasikan pada satu Shard Node
 */
export async function auditClusterNode(
  node: DatabaseNode,
  schools: School[]
): Promise<NodeAuditSummary> {
  const startTime = performance.now();
  const assignedIds = node.assignedSchoolIds || [];

  if (node.isMaster) {
    return {
      nodeId: node.id,
      nodeName: node.name,
      supabaseUrl: node.supabaseUrl,
      overallStatus: 'VALID_READY_FOR_CBT',
      totalSchoolsAudited: 0,
      results: [],
      auditedAt: new Date().toISOString(),
      totalDurationMs: 0,
      errorMessage: 'Master Node adalah database pusat direktori primer.'
    };
  }

  if (assignedIds.length === 0) {
    return {
      nodeId: node.id,
      nodeName: node.name,
      supabaseUrl: node.supabaseUrl,
      overallStatus: 'VALID_READY_FOR_CBT',
      totalSchoolsAudited: 0,
      results: [],
      auditedAt: new Date().toISOString(),
      totalDurationMs: Math.round(performance.now() - startTime),
      errorMessage: 'Belum ada sekolah yang dialokasikan ke kluster ini.'
    };
  }

  const results: SchoolAuditResult[] = [];

  for (const sId of assignedIds) {
    const schoolObj = schools.find(s => s.id === sId);
    const sName = schoolObj?.name || 'Sekolah Terpetakan';
    const sNpsn = schoolObj?.npsn;

    const res = await auditSchoolSharding(node, sId, sName, sNpsn);
    results.push(res);
  }

  // Tentukan overall status
  let overallStatus: 'VALID_READY_FOR_CBT' | 'MISMATCH_DETECTED' | 'OFFLINE_OR_ERROR' = 'VALID_READY_FOR_CBT';

  const hasError = results.some(r => r.status === 'OFFLINE_OR_ERROR');
  const hasMismatch = results.some(r => r.status === 'MISMATCH_DETECTED');

  if (hasError) {
    overallStatus = 'OFFLINE_OR_ERROR';
  } else if (hasMismatch) {
    overallStatus = 'MISMATCH_DETECTED';
  }

  return {
    nodeId: node.id,
    nodeName: node.name,
    supabaseUrl: node.supabaseUrl,
    overallStatus,
    totalSchoolsAudited: results.length,
    results,
    auditedAt: new Date().toISOString(),
    totalDurationMs: Math.round(performance.now() - startTime)
  };
}

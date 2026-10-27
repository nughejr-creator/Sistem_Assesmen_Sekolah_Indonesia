import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseNode } from '../../lib/clusterManager';
import { School } from '../../types/database';
import {
  NodeAuditSummary,
  SchoolAuditResult,
  auditClusterNode
} from '../../lib/clusterAuditHelper';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Server,
  Building2,
  Users,
  KeyRound,
  Wrench,
  Clock,
  Sparkles,
  WifiOff
} from 'lucide-react';

interface ClusterAuditModalProps {
  isOpen: boolean;
  node: DatabaseNode | null;
  schools: School[];
  onClose: () => void;
  onTriggerAutoRepair?: (node: DatabaseNode, schoolIds: string[]) => Promise<boolean>;
}

export const ClusterAuditModal: React.FC<ClusterAuditModalProps> = ({
  isOpen,
  node,
  schools,
  onClose,
  onTriggerAutoRepair
}) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<NodeAuditSummary | null>(null);
  const [repairingSchoolId, setRepairingSchoolId] = useState<string | null>(null);
  const [repairSuccessMsg, setRepairSuccessMsg] = useState<string | null>(null);

  // Jalankan audit
  const runAudit = useCallback(async () => {
    if (!node) return;
    setLoading(true);
    setRepairSuccessMsg(null);
    try {
      const res = await auditClusterNode(node, schools);
      setSummary(res);
    } catch (err: any) {
      console.error('Audit failed:', err);
    } finally {
      setLoading(false);
    }
  }, [node, schools]);

  useEffect(() => {
    if (isOpen && node) {
      runAudit();
    } else {
      setSummary(null);
    }
  }, [isOpen, node, runAudit]);

  // Handler Auto-Repair per sekolah
  const handleRepairSchool = async (schoolId: string, schoolName: string) => {
    if (!node || !onTriggerAutoRepair) return;
    setRepairingSchoolId(schoolId);
    try {
      const ok = await onTriggerAutoRepair(node, [schoolId]);
      if (ok) {
        setRepairSuccessMsg(`Akun siswa & proktor untuk "${schoolName}" berhasil disinkronkan ulang.`);
        // Re-audit secara otomatis
        await runAudit();
      } else {
        alert('Gagal menyinkronkan data perbaikan. Silakan periksa koneksi klaster.');
      }
    } catch (e: any) {
      alert(`Error perbaikan: ${e.message}`);
    } finally {
      setRepairingSchoolId(null);
    }
  };

  // Handler Auto-Repair Semua Sekolah yang bermasalah
  const handleRepairAll = async () => {
    if (!node || !onTriggerAutoRepair || !summary) return;
    const faultySchoolIds = summary.results
      .filter(r => r.status === 'MISMATCH_DETECTED')
      .map(r => r.schoolId);

    if (faultySchoolIds.length === 0) return;

    setRepairingSchoolId('ALL');
    try {
      const ok = await onTriggerAutoRepair(node, faultySchoolIds);
      if (ok) {
        setRepairSuccessMsg(`Seluruh ${faultySchoolIds.length} sekolah berhasil disinkronkan ulang.`);
        await runAudit();
      }
    } catch (e: any) {
      alert(`Error perbaikan masal: ${e.message}`);
    } finally {
      setRepairingSchoolId(null);
    }
  };

  if (!isOpen || !node) return null;

  const isReady = summary?.overallStatus === 'VALID_READY_FOR_CBT';
  const hasMismatch = summary?.overallStatus === 'MISMATCH_DETECTED';
  const hasError = summary?.overallStatus === 'OFFLINE_OR_ERROR';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* 1. Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Audit & Validasi Sinkronisasi Sharding
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600/60 text-indigo-200 border border-indigo-400/30">
                  Dual-Database Check
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Target Node: <strong className="text-white">{node.name}</strong> • Latensi: {node.latencyMs ?? 35}ms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Modal Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/60">
          
          {/* Status Banner */}
          {loading ? (
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3 py-10">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <div className="text-center">
                <div className="text-sm font-bold text-slate-800">Menjalankan Audit Integritas Data...</div>
                <div className="text-xs text-slate-500">Membandingkan Master Hub vs Shard Node secara instan</div>
              </div>
            </div>
          ) : (
            <>
              {/* Hasil Banner Status Terpadu */}
              <div className={`p-4 rounded-2xl border shadow-xs transition-all ${
                isReady
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : hasMismatch
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : 'bg-rose-50/90 border-rose-300 text-rose-950'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                      isReady ? 'bg-emerald-500 text-white' : hasMismatch ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {isReady ? <CheckCircle2 className="w-5 h-5" /> : hasMismatch ? <AlertTriangle className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-sm tracking-tight">
                          {isReady ? 'STATUS: JALUR CBT SIAP & TERVERIFIKASI 100%' : hasMismatch ? 'STATUS: SELISIH DATA TERDETEKSI' : 'STATUS: NODE GAGAL DIHUBUNGI / ERROR'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isReady ? 'bg-emerald-200 text-emerald-900' : hasMismatch ? 'bg-amber-200 text-amber-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          {summary?.overallStatus}
                        </span>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">
                        {isReady
                          ? 'Seluruh akun Siswa CBT, Proktor, dan integritas Kredensial (PIN/Password) telah identik 100% antara Master Hub dan Shard Node klaster ini.'
                          : hasMismatch
                          ? 'Ditemukan perbedaan jumlah akun atau kredensial yang belum tersinkronisasi. Jalankan Auto-Repair Sync di bawah untuk menyelaraskan data.'
                          : summary?.errorMessage || 'Gagal menghubungi host Supabase Shard. Pastikan database aktif dan anon key valid.'}
                      </p>
                    </div>
                  </div>

                  {hasMismatch && onTriggerAutoRepair && (
                    <button
                      onClick={handleRepairAll}
                      disabled={repairingSchoolId !== null}
                      className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center space-x-1.5 shrink-0"
                    >
                      <Wrench className={`w-3.5 h-3.5 ${repairingSchoolId === 'ALL' ? 'animate-spin' : ''}`} />
                      <span>{repairingSchoolId === 'ALL' ? 'Menyelaraskan...' : 'Jalankan Auto-Repair Semua'}</span>
                    </button>
                  )}
                </div>
              </div>

              {repairSuccessMsg && (
                <div className="p-3 bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-xl border border-emerald-300 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{repairSuccessMsg}</span>
                </div>
              )}

              {/* Ringkasan Metrik Cepat */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sekolah Diaudit</div>
                  <div className="text-xl font-black text-slate-800 mt-0.5">{summary?.totalSchoolsAudited || 0}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Sekolah aktif terpetakan</div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa Shard</div>
                  <div className="text-xl font-black text-indigo-600 mt-0.5">
                    {summary?.results.reduce((acc, r) => acc + r.students.shard, 0) || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Master: {summary?.results.reduce((acc, r) => acc + r.students.master, 0) || 0} Siswa
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Proktor</div>
                  <div className="text-xl font-black text-sky-600 mt-0.5">
                    {summary?.results.reduce((acc, r) => acc + r.proctors.shard, 0) || 0}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Master: {summary?.results.reduce((acc, r) => acc + r.proctors.master, 0) || 0} Proktor
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Durasi Audit</div>
                  <div className="text-xl font-black text-emerald-600 mt-0.5">{summary?.totalDurationMs || 0} ms</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Low-latency projection</div>
                </div>
              </div>

              {/* Detail Sekolah Per Sekolah */}
              <div className="space-y-3">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                  <span>Rincian Hasil Pemeriksaan per Satuan Pendidikan:</span>
                  <span className="text-slate-400 font-mono text-[11px]">{summary?.auditedAt ? new Date(summary.auditedAt).toLocaleTimeString('id-ID') : ''}</span>
                </div>

                {summary?.results && summary.results.length > 0 ? (
                  summary.results.map((res: SchoolAuditResult) => {
                    const schoolMatch = res.status === 'VALID_READY_FOR_CBT';
                    const isRepairing = repairingSchoolId === res.schoolId;

                    return (
                      <div
                        key={res.schoolId}
                        className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                          schoolMatch ? 'border-slate-200 hover:border-emerald-300' : 'border-amber-300 ring-2 ring-amber-100'
                        }`}
                      >
                        {/* School Card Header */}
                        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2.5">
                            <div className={`p-2 rounded-xl text-white ${
                              schoolMatch ? 'bg-emerald-500' : res.status === 'OFFLINE_OR_ERROR' ? 'bg-rose-500' : 'bg-amber-500'
                            }`}>
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                                <span>{res.schoolName}</span>
                                {res.npsn && (
                                  <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-slate-200 text-slate-700 font-semibold">
                                    NPSN: {res.npsn}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                School UUID: {res.schoolId}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center space-x-1 ${
                              schoolMatch
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : res.status === 'OFFLINE_OR_ERROR'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {schoolMatch ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                              <span>{schoolMatch ? '100% Cocok (Siap CBT)' : res.status === 'OFFLINE_OR_ERROR' ? 'Error / Offline' : 'Selisih Terdeteksi'}</span>
                            </span>

                            {!schoolMatch && onTriggerAutoRepair && (
                              <button
                                onClick={() => handleRepairSchool(res.schoolId, res.schoolName)}
                                disabled={isRepairing}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1"
                                title="Sinkronkan ulang data sekolah ini ke Shard"
                              >
                                <Wrench className={`w-3 h-3 ${isRepairing ? 'animate-spin' : ''}`} />
                                <span>{isRepairing ? 'Menyelaraskan...' : 'Auto-Repair'}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Comparison Grid */}
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          {/* Siswa */}
                          <div className={`p-3 rounded-xl border ${
                            res.students.status === 'MATCH' ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200'
                          }`}>
                            <div className="flex items-center justify-between font-bold text-slate-700">
                              <span className="flex items-center space-x-1">
                                <Users className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Akun Siswa CBT</span>
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                res.students.status === 'MATCH' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {res.students.status === 'MATCH' ? '✓ Cocok' : `Selisih ${res.students.missing}`}
                              </span>
                            </div>
                            <div className="mt-2 flex items-baseline justify-between text-[11px]">
                              <span className="text-slate-500">Master Hub: <strong className="text-slate-800">{res.students.master}</strong></span>
                              <span className="text-slate-500">Shard Node: <strong className="text-indigo-700">{res.students.shard}</strong></span>
                            </div>
                          </div>

                          {/* Proktor */}
                          <div className={`p-3 rounded-xl border ${
                            res.proctors.status === 'MATCH' ? 'bg-slate-50 border-slate-200' : 'bg-rose-50 border-rose-200'
                          }`}>
                            <div className="flex items-center justify-between font-bold text-slate-700">
                              <span className="flex items-center space-x-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                                <span>Akun Proktor</span>
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                res.proctors.status === 'MATCH' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {res.proctors.status === 'MATCH' ? '✓ Cocok' : `Selisih ${res.proctors.missing}`}
                              </span>
                            </div>
                            <div className="mt-2 flex items-baseline justify-between text-[11px]">
                              <span className="text-slate-500">Master Hub: <strong className="text-slate-800">{res.proctors.master}</strong></span>
                              <span className="text-slate-500">Shard Node: <strong className="text-sky-700">{res.proctors.shard}</strong></span>
                            </div>
                          </div>

                          {/* Kredensial & UUID */}
                          <div className={`p-3 rounded-xl border ${
                            res.credentialMismatches === 0 ? 'bg-slate-50 border-slate-200' : 'bg-amber-50 border-amber-200'
                          }`}>
                            <div className="flex items-center justify-between font-bold text-slate-700">
                              <span className="flex items-center space-x-1">
                                <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                                <span>Integritas Kredensial</span>
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                res.credentialMismatches === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {res.credentialMismatches === 0 ? '✓ 100% Identik' : `${res.credentialMismatches} Beda PIN`}
                              </span>
                            </div>
                            <div className="mt-2 flex items-baseline justify-between text-[11px]">
                              <span className="text-slate-500">Hash/PIN Cocok: <strong className="text-slate-800">{res.students.matched + res.proctors.matched}</strong></span>
                              <span className="text-slate-500">Orphan Data: <strong className="text-slate-800">{res.orphanInShard}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Error Diagnostic Details if any */}
                        {res.diagnostics.missingUsernames.length > 0 && (
                          <div className="px-4 pb-4">
                            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] space-y-1">
                              <div className="font-bold">Akun belum ada di Shard ({res.diagnostics.missingUsernames.length}):</div>
                              <div className="max-h-24 overflow-y-auto space-y-0.5 font-mono text-[10px] text-rose-800">
                                {res.diagnostics.missingUsernames.map((u, uIdx) => (
                                  <div key={uIdx}>• {u}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs italic bg-white rounded-2xl border border-dashed border-slate-300">
                    Belum ada sekolah yang dialokasikan ke kluster ini.
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {/* 3. Modal Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Audit berlangsung secara realtime langsung ke server Master dan Shard.</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={runAudit}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-300 flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Audit</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  DatabaseNode,
  getClusterNodes,
  saveClusterNodes,
  deleteClusterNode,
  testNodeConnection,
  generateClusterShardSQLSchema,
  generateMasterClusterSQLSchema,
  syncSchoolUsersToClusterNode,
  purgeSchoolUsersFromClusterNode,
  DEFAULT_MASTER_NODE
} from '../../lib/clusterManager';
import { UserProfile, School } from '../../types/database';
import { ClusterAuditModal } from './ClusterAuditModal';
import {
  Database,
  Server,
  Layers,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit3,
  Copy,
  Check,
  Activity,
  Wifi,
  ShieldCheck,
  Cpu,
  Zap,
  Building2,
  X,
  FileCode,
  Info
} from 'lucide-react';

interface DatabaseClusterManagerProps {
  currentUser: UserProfile;
}

export const DatabaseClusterManager: React.FC<DatabaseClusterManagerProps> = ({ currentUser }) => {
  const [nodes, setNodes] = useState<DatabaseNode[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingNodeId, setTestingNodeId] = useState<string | null>(null);
  const [syncingNodeId, setSyncingNodeId] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<{ nodeId: string; msg: string; type: 'success' | 'error' } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [selectedSqlTab, setSelectedSqlTab] = useState<'master' | 'shard'>('master');
  const [cloudRegistryStatus, setCloudRegistryStatus] = useState<'checking' | 'active' | 'missing_table' | 'error'>('checking');
  const [editingNode, setEditingNode] = useState<DatabaseNode | null>(null);

  // Audit Modal States & Handlers
  const [auditNode, setAuditNode] = useState<DatabaseNode | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const handleOpenAuditModal = (node: DatabaseNode) => {
    setAuditNode(node);
    setIsAuditModalOpen(true);
  };

  const handleTriggerAutoRepair = async (targetNode: DatabaseNode, schoolIds: string[]): Promise<boolean> => {
    const res = await syncSchoolUsersToClusterNode(targetNode, schoolIds);
    return res.success;
  };

  // Form State
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSchoolIds, setFormSchoolIds] = useState<string[]>([]);
  const [formTestStatus, setFormTestStatus] = useState<{ testing: boolean; result?: { ok: boolean; latencyMs?: number; error?: string } }>({
    testing: false
  });
  const [copiedSql, setCopiedSql] = useState(false);

  // Load cluster nodes & schools
  const loadData = async () => {
    setLoading(true);
    try {
      const loadedNodes = getClusterNodes();
      setNodes(loadedNodes);

      // Cek status tabel registri cluster_nodes di Supabase Master Hub
      try {
        const { data: clusterData, error: clusterError } = await supabase
          .from('cluster_nodes')
          .select('id');

        if (clusterError) {
          if (clusterError.code === 'PGRST205' || clusterError.message?.toLowerCase().includes('schema cache') || clusterError.message?.toLowerCase().includes('not find')) {
            setCloudRegistryStatus('missing_table');
          } else {
            setCloudRegistryStatus('error');
          }
        } else {
          setCloudRegistryStatus('active');
        }
      } catch {
        setCloudRegistryStatus('error');
      }

      // Load schools from Master database
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .order('name', { ascending: true });

      if (!schoolsError && schoolsData) {
        setSchools(schoolsData as School[]);
      }
    } catch (err) {
      console.error('Error loading cluster data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to updates across tabs/components
    const handleUpdate = () => {
      setNodes(getClusterNodes());
    };
    window.addEventListener('sasi_cluster_nodes_updated', handleUpdate);
    return () => window.removeEventListener('sasi_cluster_nodes_updated', handleUpdate);
  }, []);

  // Ping a specific node
  const handlePingNode = async (node: DatabaseNode) => {
    setTestingNodeId(node.id);
    try {
      const res = await testNodeConnection(node.supabaseUrl, node.supabaseAnonKey);
      const updatedNodes = nodes.map(n => {
        if (n.id === node.id) {
          return {
            ...n,
            status: (res.ok ? 'online' : 'error') as 'online' | 'error',
            latencyMs: res.latencyMs ?? n.latencyMs
          };
        }
        return n;
      });
      setNodes(updatedNodes);
      saveClusterNodes(updatedNodes);
    } catch (err) {
      console.error('Ping failed:', err);
    } finally {
      setTestingNodeId(null);
    }
  };

  // Ping all nodes
  const handlePingAll = async () => {
    for (const node of nodes) {
      await handlePingNode(node);
    }
  };

  // Open modal to add or edit
  const handleOpenAddModal = () => {
    setEditingNode(null);
    setFormName('');
    setFormUrl('');
    setFormKey('');
    setFormNotes('');
    setFormSchoolIds([]);
    setFormTestStatus({ testing: false });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (node: DatabaseNode) => {
    setEditingNode(node);
    setFormName(node.name);
    setFormUrl(node.supabaseUrl);
    setFormKey(node.supabaseAnonKey);
    setFormNotes(node.notes || '');
    setFormSchoolIds(node.assignedSchoolIds || []);
    setFormTestStatus({ testing: false });
    setIsModalOpen(true);
  };

  // Test form connection
  const handleTestFormConnection = async () => {
    if (!formUrl.trim() || !formKey.trim()) {
      alert('Masukkan URL Supabase dan Anon Key terlebih dahulu.');
      return;
    }
    setFormTestStatus({ testing: true });
    try {
      const res = await testNodeConnection(formUrl.trim(), formKey.trim());
      setFormTestStatus({ testing: false, result: res });
    } catch (e: any) {
      setFormTestStatus({
        testing: false,
        result: { ok: false, error: e.message || 'Koneksi gagal' }
      });
    }
  };

  // Sinkronkan akun siswa & guru ke node kluster
  const handleSyncSchoolData = async (node: DatabaseNode) => {
    if (node.isMaster || !node.assignedSchoolIds || node.assignedSchoolIds.length === 0) {
      alert('Kluster ini belum memiliki sekolah yang dialokasikan.');
      return;
    }

    setSyncingNodeId(node.id);
    setSyncMessage(null);
    try {
      const res = await syncSchoolUsersToClusterNode(node, node.assignedSchoolIds);
      if (res.success) {
        setSyncMessage({
          nodeId: node.id,
          msg: `Sukses! ${res.syncedStudents} akun siswa dan ${res.syncedTeachers} guru berhasil disalin ke kluster ini.`,
          type: 'success'
        });
        setTimeout(() => setSyncMessage(null), 8000);
      } else {
        setSyncMessage({
          nodeId: node.id,
          msg: `Gagal sinkronisasi: ${res.error || 'Terjadi kesalahan'}`,
          type: 'error'
        });
      }
    } catch (e: any) {
      setSyncMessage({
        nodeId: node.id,
        msg: `Error: ${e.message}`,
        type: 'error'
      });
    } finally {
      setSyncingNodeId(null);
    }
  };

  // Save Node (Create or Update)
  const handleSaveNode = async () => {
    if (!formName.trim() || !formUrl.trim() || !formKey.trim()) {
      alert('Nama kluster, Supabase URL, dan Anon Key wajib diisi.');
      return;
    }

    let updated: DatabaseNode[];
    let targetToSync: DatabaseNode | null = null;

    if (editingNode) {
      // Deteksi sekolah yang dipindahkan/dikeluarkan dari klaster ini untuk dibersihkan (Purge)
      const removedSchools = (editingNode.assignedSchoolIds || []).filter(id => !formSchoolIds.includes(id));
      if (removedSchools.length > 0) {
        purgeSchoolUsersFromClusterNode(editingNode, removedSchools).catch(() => {});
      }

      // Update existing
      updated = nodes.map(n => {
        if (n.id === editingNode.id) {
          const u = {
            ...n,
            name: formName.trim(),
            supabaseUrl: formUrl.trim(),
            supabaseAnonKey: formKey.trim(),
            assignedSchoolIds: formSchoolIds,
            notes: formNotes.trim(),
            updated_at: new Date().toISOString()
          };
          targetToSync = u;
          return u;
        }
        return n;
      });
    } else {
      // Create new Shard Node
      const newNode: DatabaseNode = {
        id: `node-shard-${Date.now()}`,
        name: formName.trim(),
        supabaseUrl: formUrl.trim(),
        supabaseAnonKey: formKey.trim(),
        isMaster: false,
        isActive: true,
        assignedSchoolIds: formSchoolIds,
        maxPoolSize: 15,
        maxClients: 200,
        status: formTestStatus.result?.ok ? 'online' : 'standby',
        latencyMs: formTestStatus.result?.latencyMs,
        notes: formNotes.trim() || 'Kluster Shard Sekunder untuk beban sekolah terdistribusi.',
        created_at: new Date().toISOString()
      };
      targetToSync = newNode;
      updated = [...nodes, newNode];
    }

    setNodes(updated);
    await saveClusterNodes(updated);
    setIsModalOpen(false);

    // Tawarkan sinkronisasi otomatis jika ada sekolah yang dipetakan
    if (targetToSync && !targetToSync.isMaster && formSchoolIds.length > 0) {
      const nodeRef = targetToSync;
      setTimeout(() => {
        if (confirm(`Alokasi sekolah berhasil disimpan!\nApakah Anda ingin langsung menyinkronkan data akun siswa & guru dari ${formSchoolIds.length} sekolah ini ke database kluster sekarang?`)) {
          handleSyncSchoolData(nodeRef);
        }
      }, 250);
    }
  };

  // Delete Shard Node
  const handleDeleteNode = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus Kluster "${name}"?\nSekolah yang dialokasikan ke kluster ini akan otomatis dialihkan kembali ke Master Hub.`)) {
      const targetNode = nodes.find(n => n.id === id);
      if (targetNode && targetNode.assignedSchoolIds && targetNode.assignedSchoolIds.length > 0) {
        await purgeSchoolUsersFromClusterNode(targetNode, targetNode.assignedSchoolIds).catch(() => {});
      }
      await deleteClusterNode(id);
      setNodes(getClusterNodes());
    }
  };

  // Toggle Node Active Status
  const handleToggleActive = (node: DatabaseNode) => {
    if (node.isMaster) {
      alert('Master Node tidak dapat dinonaktifkan.');
      return;
    }
    const updated = nodes.map(n => {
      if (n.id === node.id) {
        return { ...n, isActive: !n.isActive };
      }
      return n;
    });
    setNodes(updated);
    saveClusterNodes(updated);
  };

  // Copy SQL Schema to clipboard
  const handleCopySql = () => {
    const schema = selectedSqlTab === 'master' ? generateMasterClusterSQLSchema() : generateClusterShardSQLSchema();
    navigator.clipboard.writeText(schema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Metrics Calculations
  const activeNodesCount = nodes.filter(n => n.isActive).length;
  const totalPoolCapacity = activeNodesCount * 15;
  const totalClientCapacity = activeNodesCount * 200;
  const assignedSchoolsCount = nodes.reduce((acc, n) => acc + (n.assignedSchoolIds?.length || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Banner & Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Multi-Database Clustering Architecture (Sharding)</span>
              </div>

              {cloudRegistryStatus === 'active' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloud Registry: Terhubung (cluster_nodes)</span>
                </div>
              )}

              {cloudRegistryStatus === 'missing_table' && (
                <button
                  onClick={() => { setSelectedSqlTab('master'); setIsSqlModalOpen(true); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold cursor-pointer animate-pulse transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Registri Dinamis Belum Dibuat (Klik Setup)</span>
                </button>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Manajemen Kluster Database
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Distribusikan beban pengerjaan CBT siswa ke beberapa akun Supabase Free Tier secara transparan. 
              Meningkatkan kapasitas dari <strong className="text-white">15 pool connection</strong> menjadi puluhan koneksi tanpa risiko bottleneck saat ujian serentak.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => { setSelectedSqlTab('master'); setIsSqlModalOpen(true); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-sm transition-all hover:border-indigo-500/50"
            >
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Skema SQL (Hub & Shard)</span>
            </button>

            <button
              onClick={handlePingAll}
              disabled={testingNodeId !== null}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${testingNodeId ? 'animate-spin' : ''}`} />
              <span>Ping Semua Node</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kluster Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Warning Callout jika tabel cluster_nodes belum dibuat di Master Hub */}
      {cloudRegistryStatus === 'missing_table' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="text-amber-100 text-sm font-bold block">Registri Dinamis cluster_nodes Belum Aktif di Master Hub</strong>
              <p className="text-amber-200/90 leading-relaxed">
                Tabel <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-300 font-mono">public.cluster_nodes</code> belum dibuat di Supabase Master. 
                Sistem saat ini berjalan dalam mode <em>Local Fallback</em> (hanya tersimpan di peramban ini). 
                Jalankan skrip registri sekali di SQL Editor Master Hub agar semua penambahan kluster langsung sinkron otomatis ke seluruh siswa, guru, dan proktor tanpa perlu ubah kode (Zero-Config Scaling).
              </p>
            </div>
          </div>
          <button
            onClick={() => { setSelectedSqlTab('master'); setIsSqlModalOpen(true); }}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <FileCode className="w-4 h-4 text-slate-900" />
            <span>Setup Registri Master</span>
          </button>
        </div>
      )}

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Node Terdaftar</div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">
              {nodes.length} <span className="text-xs font-normal text-emerald-600 font-medium">({activeNodesCount} Aktif)</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">1 Master Hub + {nodes.length - 1} Shards</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pooler Capacity</div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">
              {totalPoolCapacity} <span className="text-xs font-semibold text-slate-400">Poles</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">15 per instance Supabase</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Max Concurrent Clients</div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">
              {totalClientCapacity} <span className="text-xs font-semibold text-slate-400">Siswa</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Beban terbagi merata</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sekolah Terpetakan</div>
            <div className="text-2xl font-black text-slate-800 mt-0.5">
              {assignedSchoolsCount} <span className="text-xs font-semibold text-slate-400">/ {schools.length} Sekolah</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Sisa dialirkan ke Master Hub</div>
          </div>
        </div>

      </div>

      {/* 3. Architecture Info Box */}
      <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-2xl p-4.5 text-xs text-indigo-900 flex items-start gap-3.5">
        <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700 mt-0.5 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-indigo-950 text-sm">Bagaimana Arsitektur Multi-Kluster Bekerja?</h4>
          <p className="text-indigo-800 leading-relaxed">
            <strong>1. Master Hub (Akun Utama):</strong> Menyimpan Bank Soal, Kisi-kisi, Paket Perakitan, dan Akun Super Admin.<br />
            <strong>2. Shard Nodes (Akun Cadangan):</strong> Menyimpan lembar jawaban (student_answers), sesi ujian (student_attempts), dan akun siswa khusus sekolah yang dipetakan.<br />
            <strong>3. Otomatis & Nol Gangguan:</strong> Siswa login seperti biasa dengan kartu ujian, sistem secara otomatis mengarahkan ke database sekolah masing-masing tanpa konfigurasi manual di sisi siswa/guru.
          </p>
        </div>
      </div>

      {/* 4. Cluster Nodes List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-slate-800">Daftar Node Supabase Cluster</h3>
            <p className="text-xs text-slate-500 mt-0.5">Monitor latensi, status kesehatan, dan alokasi sekolah tiap kluster</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{nodes.length} Node Terdaftar</span>
        </div>

        <div className="divide-y divide-slate-100">
          {nodes.map((node) => {
            const isTesting = testingNodeId === node.id;
            const mappedSchools = schools.filter(s => node.assignedSchoolIds?.includes(s.id));

            return (
              <div key={node.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Node Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className={`p-2 rounded-xl ${node.isMaster ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {node.isMaster ? <Database className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
                      </div>
                      <h4 className="font-extrabold text-base text-slate-900">{node.name}</h4>
                      
                      {node.isMaster ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          MASTER HUB (PUSAT)
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          SHARD NODE
                        </span>
                      )}

                      {/* Active Status Badge */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        node.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}>
                        {node.isActive ? 'Aktif' : 'Standby / Nonaktif'}
                      </span>

                      {/* Latency / Online Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        node.status === 'online'
                          ? 'bg-emerald-100 text-emerald-800'
                          : node.status === 'checking'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          node.status === 'online' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`} />
                        <span>{node.status === 'online' ? `Online (${node.latencyMs ?? 35} ms)` : 'Perlu Cek'}</span>
                      </span>
                    </div>

                    {/* URL & Key */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                      <span>URL: <span className="text-slate-700 font-semibold">{node.supabaseUrl}</span></span>
                      <span>•</span>
                      <span>Pool: <span className="text-slate-700 font-semibold">{node.maxPoolSize} max</span></span>
                      <span>•</span>
                      <span>Clients: <span className="text-slate-700 font-semibold">{node.maxClients} limit</span></span>
                    </div>

                    {/* Notes */}
                    {node.notes && (
                      <p className="text-xs text-slate-500 italic max-w-2xl">{node.notes}</p>
                    )}

                    {/* Assigned Schools Pills */}
                    <div className="pt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>Sekolah Terpetakan:</span>
                      </span>

                      {node.isMaster ? (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                          {node.assignedSchoolIds?.length > 0 
                            ? `${mappedSchools.map(s => s.name).join(', ')} (+ Default untuk sekolah tak terpetakan)`
                            : 'Otomatis menangani seluruh sekolah yang belum dialokasikan ke Shard'}
                        </span>
                      ) : mappedSchools.length > 0 ? (
                        mappedSchools.map(school => (
                          <span
                            key={school.id}
                            className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200"
                          >
                            {school.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold italic">
                          Belum ada sekolah yang dialirkan ke kluster ini.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      onClick={() => handlePingNode(node)}
                      disabled={isTesting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      title="Tes Ping Latensi"
                    >
                      <Wifi className={`w-3.5 h-3.5 text-emerald-600 ${isTesting ? 'animate-pulse' : ''}`} />
                      <span>{isTesting ? 'Pinging...' : 'Uji Ping'}</span>
                    </button>

                    {!node.isMaster && (
                      <>
                        {node.assignedSchoolIds && node.assignedSchoolIds.length > 0 && (
                          <>
                            <button
                              onClick={() => handleOpenAuditModal(node)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors border border-purple-200"
                              title="Audit & Validasi Integritas Sharding: Periksa kesesuaian jumlah siswa, proktor, dan kredensial"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                              <span>Audit Integritas Shard</span>
                            </button>

                            <button
                              onClick={() => handleSyncSchoolData(node)}
                              disabled={syncingNodeId === node.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors border border-indigo-200"
                              title="Salin dan sinkronkan akun siswa & guru dari sekolah yang dipetakan ke database kluster ini"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${syncingNodeId === node.id ? 'animate-spin' : ''}`} />
                              <span>{syncingNodeId === node.id ? 'Menyalin...' : 'Sinkronkan Akun Siswa'}</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleToggleActive(node)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                            node.isActive
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {node.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(node)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Edit Kluster & Alokasi Sekolah"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteNode(node.id, node.name)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                          title="Hapus Kluster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {node.isMaster && (
                      <button
                        onClick={() => handleOpenEditModal(node)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Petakan Sekolah</span>
                      </button>
                    )}
                  </div>

                </div>

                {/* Status Notifikasi Sinkronisasi Data */}
                {syncMessage && syncMessage.nodeId === node.id && (
                  <div className={`mt-3 p-3 rounded-2xl text-xs flex items-center justify-between gap-3 animate-fadeIn ${
                    syncMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {syncMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-semibold">{syncMessage.msg}</span>
                    </div>
                    <button 
                      onClick={() => setSyncMessage(null)}
                      className="text-slate-400 hover:text-slate-600 font-bold px-2 py-0.5"
                    >
                      Tutup
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Modal: Tambah / Edit Kluster */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    {editingNode ? (editingNode.isMaster ? 'Konfigurasi Master Node' : 'Edit Kluster Shard') : 'Tambah Kluster Supabase Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">Hubungkan akun Supabase tambahan untuk membagi beban traffic</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-5 space-y-4">
              
              {/* Nama Kluster */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Kluster / Proyek Supabase
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Kluster Shard 02 - Wilayah Cisitu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                />
              </div>

              {/* URL Supabase */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={formUrl}
                  disabled={editingNode?.isMaster}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                />
              </div>

              {/* Supabase Anon Key */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Supabase Anon / Publishable Key
                </label>
                <input
                  type="text"
                  value={formKey}
                  disabled={editingNode?.isMaster}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="sb_publishable_... atau eyJhbGciOi..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                />
              </div>

              {/* Tombol Uji Koneksi */}
              {!editingNode?.isMaster && (
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Validasi Koneksi Server</span>
                    <span className="text-[11px] text-slate-500">Kirim ping request untuk memastikan URL dan API key valid</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {formTestStatus.result && (
                      <span className={`text-xs font-bold flex items-center gap-1 ${
                        formTestStatus.result.ok ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {formTestStatus.result.ok ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Sukses ({formTestStatus.result.latencyMs} ms)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-4 h-4" />
                            <span className="truncate max-w-[150px]">{formTestStatus.result.error || 'Gagal'}</span>
                          </>
                        )}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleTestFormConnection}
                      disabled={formTestStatus.testing}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Wifi className={`w-3.5 h-3.5 ${formTestStatus.testing ? 'animate-spin' : ''}`} />
                      <span>{formTestStatus.testing ? 'Menguji...' : 'Uji Koneksi'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sekolah yang dialokasikan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Alokasi Sekolah ke Kluster Ini
                </label>
                <div className="border border-slate-200 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-50/50">
                  {schools.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada sekolah di database Master.</p>
                  ) : (
                    schools.map(school => {
                      const isSelected = formSchoolIds.includes(school.id);
                      return (
                        <label
                          key={school.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormSchoolIds([...formSchoolIds, school.id]);
                                } else {
                                  setFormSchoolIds(formSchoolIds.filter(id => id !== school.id));
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{school.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">NPSN: {school.npsn || '-'}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Siswa dan guru dari sekolah yang dipilih akan otomatis menggunakan database kluster ini saat mengerjakan ujian.
                </p>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Catatan Internal
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  placeholder="Misal: Proyek Supabase akun Gmail Pak Guru A (Batas kuota 500MB)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveNode}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors"
              >
                {editingNode ? 'Perbarui Kluster' : 'Simpan Kluster Baru'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modal: Skema SQL (Master Hub Registry & Shard Nodes) */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-slate-950 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-800 my-8 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    Skema Database SQL (DDL Script)
                  </h3>
                  <p className="text-xs text-slate-400">Pilih tab skrip sesuai tujuan konfigurasi Supabase Anda</p>
                </div>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex items-center gap-2 pt-4 border-b border-slate-800 pb-3">
              <button
                onClick={() => setSelectedSqlTab('master')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedSqlTab === 'master'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>1. Registri Master Hub (cluster_nodes)</span>
                {cloudRegistryStatus === 'missing_table' && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>

              <button
                onClick={() => setSelectedSqlTab('shard')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedSqlTab === 'shard'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>2. Skema CBT Shard Baru</span>
              </button>
            </div>

            <div className="py-4 space-y-3">
              {selectedSqlTab === 'master' ? (
                <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl text-xs text-amber-300 leading-relaxed">
                  <strong>Tujuan Master Hub:</strong> Jalankan skrip ini <strong>SEKALI</strong> di SQL Editor proyek <strong>Supabase Master Hub</strong> (<code>https://lmlflfkdukcdhkdjssmm.supabase.co</code>). 
                  Ini akan membuat tabel <code className="bg-amber-900/50 px-1 py-0.5 rounded text-amber-200">public.cluster_nodes</code> dan mengisi data awal sehingga Anda bisa menambah, mengubah, atau menghapus kluster langsung dari Web UI Super Admin tanpa perlu coding atau redeploy (Zero-Config Scaling).
                </div>
              ) : (
                <div className="p-3 bg-indigo-950/40 border border-indigo-800/50 rounded-xl text-xs text-indigo-300 leading-relaxed">
                  <strong>Tujuan Shard Baru:</strong> Jalankan skrip ini di SQL Editor setiap kali Anda membuat akun <strong>Supabase Free Tier baru</strong> untuk kluster kecamatan/wilayah lain. 
                  Ini akan membuat tabel pengerjaan CBT (<code className="bg-indigo-900/50 px-1 py-0.5 rounded text-indigo-200">user_profiles</code>, <code className="bg-indigo-900/50 px-1 py-0.5 rounded text-indigo-200">student_attempts</code>, <code className="bg-indigo-900/50 px-1 py-0.5 rounded text-indigo-200">student_answers</code>, <code className="bg-indigo-900/50 px-1 py-0.5 rounded text-indigo-200">teachers</code>).
                </div>
              )}

              <div className="relative">
                <button
                  onClick={handleCopySql}
                  className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-indigo-200" />}
                  <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>

                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-300 text-xs font-mono max-h-96 overflow-y-auto border border-slate-800 leading-relaxed">
                  {selectedSqlTab === 'master' ? generateMasterClusterSQLSchema() : generateClusterShardSQLSchema()}
                </pre>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                {selectedSqlTab === 'master' ? 'Target: Supabase Master Hub' : 'Target: Supabase Shard Node Cadangan'}
              </span>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Audit & Validasi Integritas Sharding */}
      <ClusterAuditModal
        isOpen={isAuditModalOpen}
        node={auditNode}
        schools={schools}
        onClose={() => setIsAuditModalOpen(false)}
        onTriggerAutoRepair={handleTriggerAutoRepair}
      />

    </div>
  );
};

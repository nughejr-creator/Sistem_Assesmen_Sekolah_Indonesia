import React, { useState } from 'react';
import { School, UserRole } from '../../types/database';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  RefreshCw, 
  Users, 
  FileSpreadsheet, 
  CheckCircle2, 
  School as SchoolIcon,
  ShieldAlert,
  Database
} from 'lucide-react';

interface ResetDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: School[];
  onResetUsers: (filter: { role?: UserRole | 'ALL'; schoolId?: string | 'ALL'; keepSuperAdmin?: boolean }) => void;
  onResetBlueprintAndQuestions: () => void;
  onResetAllSystemData: () => void;
}

export const ResetDataModal: React.FC<ResetDataModalProps> = ({
  isOpen,
  onClose,
  schools,
  onResetUsers,
  onResetBlueprintAndQuestions,
  onResetAllSystemData
}) => {
  // Tabs: 'users' | 'kisi-kisi' | 'all'
  const [activeTab, setActiveTab] = useState<'users' | 'kisi-kisi' | 'all'>('users');

  // Filter state for resetting users
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [userSchoolFilter, setUserSchoolFilter] = useState<string | 'ALL'>('ALL');
  const [keepSuperAdmin, setKeepSuperAdmin] = useState(true);

  // Confirmation input
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Action 1: Reset Users with Filter
  const handleExecuteResetUsers = () => {
    if (confirmText.trim().toUpperCase() !== 'RESET') {
      alert('Ketik kata "RESET" (huruf besar) untuk mengonfirmasi penghapusan data pengguna.');
      return;
    }

    setIsProcessing(true);
    try {
      onResetUsers({
        role: userRoleFilter,
        schoolId: userSchoolFilter,
        keepSuperAdmin
      });
      setFeedback('Data pengguna sesuai filter yang dipilih berhasil direset/dihapus.');
      setConfirmText('');
      setTimeout(() => {
        setFeedback(null);
        setIsProcessing(false);
        onClose();
      }, 1500);
    } catch (e: any) {
      alert(`Terjadi kesalahan: ${e.message}`);
      setIsProcessing(false);
    }
  };

  // Handle Action 2: Reset Kisi-Kisi & Soal
  const handleExecuteResetBlueprintAndQuestions = () => {
    if (confirmText.trim().toUpperCase() !== 'RESET') {
      alert('Ketik kata "RESET" (huruf besar) untuk mengonfirmasi penghapusan data kisi-kisi & butir soal.');
      return;
    }

    setIsProcessing(true);
    try {
      onResetBlueprintAndQuestions();
      setFeedback('Seluruh data pemetaan kisi-kisi dan bank butir soal berhasil direset/dikosongkan.');
      setConfirmText('');
      setTimeout(() => {
        setFeedback(null);
        setIsProcessing(false);
        onClose();
      }, 1500);
    } catch (e: any) {
      alert(`Terjadi kesalahan: ${e.message}`);
      setIsProcessing(false);
    }
  };

  // Handle Action 3: Reset Semua Data Sistem
  const handleExecuteResetAll = () => {
    if (confirmText.trim().toUpperCase() !== 'RESET SEMUA') {
      alert('Ketik kata "RESET SEMUA" (huruf besar) untuk mengonfirmasi penghapusan total seluruh data.');
      return;
    }

    setIsProcessing(true);
    try {
      onResetAllSystemData();
      setFeedback('Seluruh data aplikasi (pengguna, kisi-kisi, bank soal, dan paket ujian) berhasil direset ke kondisi awal.');
      setConfirmText('');
      setTimeout(() => {
        setFeedback(null);
        setIsProcessing(false);
        onClose();
      }, 1500);
    } catch (e: any) {
      alert(`Terjadi kesalahan: ${e.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-rose-900 via-rose-800 to-red-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-rose-300">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Pusat Reset & Pembersihan Data</h2>
              <p className="text-xs text-rose-200">Hak Akses Khusus Super Administrator</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-rose-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex gap-2">
          
          <button
            type="button"
            onClick={() => { setActiveTab('users'); setConfirmText(''); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'users'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Reset Akun Pengguna</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('kisi-kisi'); setConfirmText(''); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'kisi-kisi'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Reset Kisi-Kisi & Soal</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('all'); setConfirmText(''); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Reset Semua Data</span>
          </button>

        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          
          {feedback && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 font-bold flex items-center space-x-2 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* TAB 1: RESET PENGGUNA DENGAN FILTER */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Aturan Pembersihan Akun Pengguna:</span>
                </div>
                <p>
                  Pilih kriteria akun yang ingin dihapus secara massal (berdasarkan asal sekolah dan peran). Akun yang terhapus tidak dapat dipulihkan kembali.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Filter Berdasarkan Peran */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hapus Berdasarkan Peran:
                  </label>
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as any)}
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="ALL">Semua Peran (Kecuali Super Admin Utama)</option>
                    <option value="student">Hanya Siswa CBT</option>
                    <option value="proctor">Hanya Proktor Sekolah</option>
                    <option value="assistant_admin">Hanya Asisten Super Admin</option>
                  </select>
                </div>

                {/* Filter Berdasarkan Sekolah */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hapus Berdasarkan Sekolah:
                  </label>
                  <select
                    value={userSchoolFilter}
                    onChange={(e) => setUserSchoolFilter(e.target.value)}
                    className="w-full text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="ALL">Semua Sekolah (Nasional)</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.npsn})</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Checkbox Amankan Super Admin */}
              <label className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepSuperAdmin}
                  onChange={(e) => setKeepSuperAdmin(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                />
                <span className="text-xs font-bold text-slate-700">
                  Tetap pertahankan akun Super Admin utama (<strong className="text-brand-700">nughejr@gmail.com</strong>) agar tidak kehilangan akses.
                </span>
              </label>

              {/* Konfirmasi Text */}
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-extrabold text-slate-700">
                  Ketik kata <strong className="text-rose-600 tracking-wider">RESET</strong> di bawah ini untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Ketik RESET"
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl font-bold uppercase focus:border-rose-600 focus:outline-none text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={confirmText.trim().toUpperCase() !== 'RESET' || isProcessing}
                  onClick={handleExecuteResetUsers}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isProcessing ? 'Memproses...' : 'Hapus Akun Pengguna Terpilih'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: RESET KISI-KISI & BUTIR SOAL */}
          {activeTab === 'kisi-kisi' && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 text-xs leading-relaxed space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Peringatan Penghapusan Butir Soal:</span>
                </div>
                <p>
                  Tindakan ini akan mengosongkan seluruh matriks pemetaan kisi-kisi dan seluruh bank butir soal (stimulus, opsi jawaban, pembahasan, dan bobot nilai). Seluruh data akan direset kembali ke template awal.
                </p>
              </div>

              {/* Konfirmasi Text */}
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-extrabold text-slate-700">
                  Ketik kata <strong className="text-rose-600 tracking-wider">RESET</strong> di bawah ini untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Ketik RESET"
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl font-bold uppercase focus:border-rose-600 focus:outline-none text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={confirmText.trim().toUpperCase() !== 'RESET' || isProcessing}
                  onClick={handleExecuteResetBlueprintAndQuestions}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isProcessing ? 'Memproses...' : 'Reset Semua Kisi-Kisi & Soal'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: RESET SEMUA DATA SISTEM */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 rounded-2xl text-white text-xs leading-relaxed space-y-2">
                <div className="font-extrabold text-rose-400 flex items-center space-x-1.5 text-sm">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Factory Reset / Pembersihan Total:</span>
                </div>
                <p className="text-slate-300">
                  Tindakan ini akan mengembalikan seluruh database ke kondisi awal (Initial Factory State):
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>Menghapus semua akun pengguna dan mengembalikan ke akun default Super Admin.</li>
                  <li>Mengosongkan semua input kisi-kisi dan bank butir soal.</li>
                  <li>Mereset cache paket ujian dan sesi aktif.</li>
                </ul>
              </div>

              {/* Konfirmasi Text */}
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-extrabold text-slate-700">
                  Ketik kata <strong className="text-rose-600 tracking-wider">RESET SEMUA</strong> untuk konfirmasi total:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Ketik RESET SEMUA"
                  className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl font-bold uppercase focus:border-rose-600 focus:outline-none text-sm"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={confirmText.trim().toUpperCase() !== 'RESET SEMUA' || isProcessing}
                  onClick={handleExecuteResetAll}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-black disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4 text-rose-400" />
                  <span>{isProcessing ? 'Memproses...' : 'Eksekusi Reset Semua Data'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

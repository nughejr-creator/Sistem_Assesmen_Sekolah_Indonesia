import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types/database';
import { 
  Users, 
  ShieldCheck, 
  School, 
  GraduationCap, 
  ChevronDown, 
  LogOut, 
  UserCheck, 
  KeyRound, 
  Camera, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Image as ImageIcon 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RoleSwitcherProps {
  currentUser: UserProfile;
  onSelectUser?: (user: UserProfile) => void;
  onLogout?: () => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentUser, onSelectUser, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Modal States
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Edit Profile Form State
  const [editFullName, setEditFullName] = useState(currentUser.full_name || '');
  const [editUsername, setEditUsername] = useState(currentUser.username || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(currentUser.photo_url || '');

  // Change Password Form State
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Toast notification
  const [notification, setNotification] = useState<string | null>(null);
  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-0.5 rounded-md border border-purple-200">Super Admin</span>;
      case 'assistant_admin':
        return <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-0.5 rounded-md border border-indigo-200">Asisten</span>;
      case 'proctor':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-md border border-blue-200">Proktor</span>;
      case 'teacher':
        if (currentUser.teacher_type === 'penulis_soal' || currentUser.full_name?.toLowerCase().includes('zyandru') || currentUser.username?.toLowerCase().includes('zyandru')) {
          return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-md border border-emerald-200">Penulis Soal</span>;
        }
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-md border border-amber-200">Pendidik / Guru</span>;
      case 'student':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-md border border-emerald-200">Siswa CBT</span>;
    }
  };

  const getRoleTitle = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'Super Administrator SASI';
      case 'assistant_admin': return 'Asisten Super Admin';
      case 'proctor': return 'Proktor Ruang Asesmen';
      case 'teacher':
        if (currentUser.teacher_type === 'penulis_soal' || currentUser.full_name?.toLowerCase().includes('zyandru') || currentUser.username?.toLowerCase().includes('zyandru')) {
          return `Penulis Naskah Soal (${currentUser.assigned_subject_name || 'Mitra Ahli'})`;
        }
        return `Guru ${currentUser.assigned_subject_name || 'Mata Pelajaran'}`;
      case 'student': return 'Peserta Ujian (Siswa)';
    }
  };

  // Handle Photo Selection & Conversion
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Ukuran foto maksimal 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditPhotoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFullName.trim()) return;

    const updatedUser: UserProfile = {
      ...currentUser,
      full_name: editFullName.trim(),
      username: editUsername.trim(),
      photo_url: editPhotoUrl.trim() || null,
    };

    // 1. Update sasi_current_user
    try {
      localStorage.setItem('sasi_current_user', JSON.stringify(updatedUser));
    } catch (e) {}

    // 2. Update sasi_users_cache
    try {
      const cached = localStorage.getItem('sasi_users_cache');
      if (cached) {
        const users = JSON.parse(cached);
        const updatedList = users.map((u: UserProfile) => u.id === currentUser.id ? { ...u, ...updatedUser } : u);
        localStorage.setItem('sasi_users_cache', JSON.stringify(updatedList));
      }
    } catch (e) {}

    // 3. Update Supabase Cloud if available
    try {
      await supabase.from('user_profiles').update({
        full_name: updatedUser.full_name,
        username: updatedUser.username,
        photo_url: updatedUser.photo_url,
        updated_at: new Date().toISOString()
      }).eq('username', currentUser.username);

      if (currentUser.id) {
        await supabase.from('user_profiles').update({
          full_name: updatedUser.full_name,
          username: updatedUser.username,
          photo_url: updatedUser.photo_url,
          updated_at: new Date().toISOString()
        }).eq('id', currentUser.id);
      }
    } catch (e) {}

    // 4. Update parent state
    if (onSelectUser) {
      onSelectUser(updatedUser);
    }

    notify('Profil & foto berhasil diperbarui!');
    setShowEditProfileModal(false);
  };

  // Save Password Change
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPasswordInput.length < 4) {
      setPasswordError('Kata sandi baru minimal 4 karakter.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    const updatedUser: UserProfile = {
      ...currentUser,
      password: newPasswordInput.trim(),
    };

    // 1. Update sasi_current_user
    try {
      localStorage.setItem('sasi_current_user', JSON.stringify(updatedUser));
    } catch (e) {}

    // 2. Update sasi_users_cache
    try {
      const cached = localStorage.getItem('sasi_users_cache');
      if (cached) {
        const users = JSON.parse(cached);
        const updatedList = users.map((u: UserProfile) => u.id === currentUser.id ? { ...u, password: newPasswordInput.trim() } : u);
        localStorage.setItem('sasi_users_cache', JSON.stringify(updatedList));
      }
    } catch (e) {}

    // 3. Update Supabase Cloud if available
    try {
      await supabase.from('user_profiles').update({
        password: newPasswordInput.trim(),
        updated_at: new Date().toISOString()
      }).eq('username', currentUser.username);

      if (currentUser.id) {
        await supabase.from('user_profiles').update({
          password: newPasswordInput.trim(),
          updated_at: new Date().toISOString()
        }).eq('id', currentUser.id);
      }
      await supabase.auth.updateUser({ password: newPasswordInput.trim() });
    } catch (e) {}

    // 4. Update parent state
    if (onSelectUser) {
      onSelectUser(updatedUser);
    }

    notify('Kata sandi akun berhasil diganti!');
    setShowChangePasswordModal(false);
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  return (
    <div className="relative">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-sm font-bold animate-slide-left">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Trigger Button with User Avatar / Photo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-full text-sm font-semibold text-slate-800 transition-all shadow-2xs"
        title="Buka Profil Pengguna"
      >
        <div className="relative shrink-0">
          {currentUser.photo_url ? (
            <img
              src={currentUser.photo_url}
              alt={currentUser.full_name}
              className="w-8 h-8 rounded-full object-cover border border-slate-300"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-black text-xs">
              {currentUser.full_name ? currentUser.full_name.charAt(0) : 'U'}
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
        </div>
        <span className="font-black text-xs max-w-[130px] sm:max-w-[180px] truncate">{currentUser.full_name}</span>
        {getRoleBadge(currentUser.role)}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 z-50 animate-scale-up space-y-4">
            
            {/* Header Profil Pengguna yang Sedang Login */}
            <div className="flex items-center space-x-3 pb-3.5 border-b border-slate-100">
              <div className="relative shrink-0">
                {currentUser.photo_url ? (
                  <img
                    src={currentUser.photo_url}
                    alt={currentUser.full_name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-brand-500 shadow-md shadow-brand-500/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-brand-500/20">
                    {currentUser.full_name ? currentUser.full_name.charAt(0) : 'U'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-black text-sm text-slate-900 truncate" title={currentUser.full_name}>
                  {currentUser.full_name}
                </h4>
                <p className="text-xs text-slate-500 truncate mt-0.5" title={currentUser.username}>
                  {currentUser.username}
                </p>
                <div className="mt-1.5">
                  {getRoleBadge(currentUser.role)}
                </div>
              </div>
            </div>

            {/* Rincian Akun Aktif */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Otoritas Akun:</span>
                <span className="font-bold text-slate-800 text-right truncate max-w-[150px]">
                  {getRoleTitle(currentUser.role)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-500 font-medium">Status Sesi:</span>
                <span className="font-extrabold text-emerald-700 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Aktif (Online)</span>
                </span>
              </div>

              {currentUser.role === 'assistant_admin' ? (
                <>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-blue-50/80 border border-blue-200">
                    <span className="text-blue-700 font-bold">Instansi / Naungan:</span>
                    <span className="font-extrabold text-blue-950 truncate max-w-[155px]" title={currentUser.institution || (currentUser.exam_card_password?.startsWith('ASST:') ? currentUser.exam_card_password.replace('ASST:', '') : 'Dinas Pendidikan (Pengawas Sekolah)')}>
                      {currentUser.institution || (currentUser.exam_card_password?.startsWith('ASST:') ? currentUser.exam_card_password.replace('ASST:', '') : 'Dinas Pendidikan (Pengawas Sekolah)')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-blue-50/80 border border-blue-200">
                    <span className="text-blue-700 font-bold">Cakupan Supervisi:</span>
                    <span className="font-bold text-blue-900">
                      Lintas Sekolah (Fase A-D)
                    </span>
                  </div>
                </>
              ) : currentUser.role === 'super_admin' ? (
                <>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-purple-50/80 border border-purple-200">
                    <span className="text-purple-700 font-bold">Instansi / Naungan:</span>
                    <span className="font-extrabold text-purple-950 truncate max-w-[155px]">
                      {currentUser.institution || 'Pusat / Super Admin'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-purple-50/80 border border-purple-200">
                    <span className="text-purple-700 font-bold">Cakupan Otoritas:</span>
                    <span className="font-bold text-purple-900">
                      Seluruh Jenjang & Mapel
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {currentUser.school && (
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 font-medium">Sekolah Asal:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[140px]" title={currentUser.school.name}>
                        {currentUser.school.name}
                      </span>
                    </div>
                  )}

                  {currentUser.assigned_level && (
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 font-medium">Jenjang Asesmen:</span>
                      <span className="font-bold text-brand-700">
                        {currentUser.assigned_level} (Fase {currentUser.phase || 'A-D'})
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Tombol Aksi: Edit Profil & Ganti Password (Khusus Petugas sampai dengan Proktor) */}
            {currentUser.role !== 'student' && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setEditFullName(currentUser.full_name || '');
                    setEditUsername(currentUser.username || '');
                    setEditPhotoUrl(currentUser.photo_url || '');
                    setShowEditProfileModal(true);
                  }}
                  className="w-full py-2 px-3 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all border border-brand-200"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Edit Profil & Foto Pengguna</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setPasswordError(null);
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                    setShowChangePasswordModal(true);
                  }}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all border border-slate-200"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Ganti Kata Sandi Akun</span>
                </button>
              </div>
            )}

            {/* Tombol Logout Akun */}
            {onLogout && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-black flex items-center justify-center space-x-2 transition-all border border-rose-200 shadow-2xs active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar dari Akun (Logout)</span>
                </button>
              </div>
            )}

          </div>
        </>
      )}

      {/* MODAL 1: EDIT PROFIL & FOTO */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Edit Profil & Foto Pengguna</h3>
                  <p className="text-xs text-slate-500">Khusus akun petugas sampai dengan proktor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              
              {/* Photo Upload Area */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center space-x-4">
                <div className="relative shrink-0">
                  {editPhotoUrl ? (
                    <img
                      src={editPhotoUrl}
                      alt="Avatar"
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-brand-500 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-200 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-6 h-6" />
                      <span className="text-[10px] font-bold mt-0.5">Foto</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-slate-700 font-bold mb-1">
                    Foto Profil Pengguna (Maks 2MB)
                  </label>
                  <div className="flex items-center space-x-2">
                    <label className="cursor-pointer px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{editPhotoUrl ? 'Ganti Foto' : 'Pilih Foto'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                    {editPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditPhotoUrl('')}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-800 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Email / Username *</label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-slate-700 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
                >
                  Simpan Profil
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: GANTI KATA SANDI */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Ganti Kata Sandi Akun</h3>
                  <p className="text-xs text-slate-500">Perbarui kata sandi untuk keamanan akun Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePasswordModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-slate-700 font-bold mb-1">Kata Sandi Baru *</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? "text" : "password"}
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Minimal 4 karakter"
                    className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl font-mono text-slate-800 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Konfirmasi Kata Sandi Baru *</label>
                <input
                  type={showPasswordText ? "text" : "password"}
                  required
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-slate-800 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
                >
                  Simpan Sandi Baru
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};

// Semantik modern alias untuk arsitektur portal
export const UserProfileMenu = RoleSwitcher;

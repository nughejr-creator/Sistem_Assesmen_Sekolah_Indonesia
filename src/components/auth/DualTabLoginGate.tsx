import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types/database';
import { MOCK_USERS } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { getClusterNodes, getClientForNode } from '../../lib/clusterManager';
import { isPjokTeacher, isAgamaTeacher } from '../../lib/teacherScope';
import { safeSupabaseDistributedUpdate } from '../../lib/syncHelper';
import { 
  GraduationCap, 
  ShieldCheck, 
  KeyRound, 
  Hash, 
  Mail, 
  Lock, 
  AlertCircle, 
  HelpCircle, 
  School,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  Loader2,
  Send,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface DualTabLoginGateProps {
  onLoginSuccess: (user: UserProfile, token?: string) => void;
  initialTab?: 'student' | 'officer';
  initialToken?: string;
  onBackToLanding?: () => void;
}

export const DualTabLoginGate: React.FC<DualTabLoginGateProps> = ({ 
  onLoginSuccess,
  initialTab = 'student',
  initialToken = 'SASI26',
  onBackToLanding
}) => {
  const [activeTab, setActiveTab] = useState<'student' | 'officer'>(initialTab);
  
  // Student Form State - Mulai dalam kondisi bersih
  const [nisn, setNisn] = useState('');
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(initialToken);
  const [showPin, setShowPin] = useState(false);
  const [showStudentForgotModal, setShowStudentForgotModal] = useState(false);

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);

  // Officer Form State - Mulai dalam kondisi bersih (tidak memunculkan email/password secara langsung)
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerPassword, setOfficerPassword] = useState('');
  const [showOfficerPassword, setShowOfficerPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isEmailPlaceholder = officerEmail === 'Masukkan user/email' || officerEmail === 'Masukan user/email';
  const isPasswordPlaceholder = officerPassword === 'Masukkan Password anda' || officerPassword === 'Masukan Password anda';

  // Officer Forgot Password Multi-Step Workflow State
  const [showOfficerForgotModal, setShowOfficerForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password' | 'success'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotTargetUser, setForgotTargetUser] = useState<UserProfile | null>(null);
  const [forgotGeneratedOtp, setForgotGeneratedOtp] = useState('');
  const [forgotInputOtp, setForgotInputOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number>(60);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Error & loading state
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-prefetch latest users from Supabase Cloud on mount (Cross-device Sync)
  useEffect(() => {
    let isMounted = true;
    const prefetchUsersFromCloud = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*, school:schools(*)');

        if (!error && data && data.length > 0 && isMounted) {
          try {
            const decodeTeacherProfile = (u: any): UserProfile => {
              if (u.exam_card_password && typeof u.exam_card_password === 'string' && u.exam_card_password.startsWith('TEACHER:')) {
                try {
                  const meta = JSON.parse(u.exam_card_password.replace('TEACHER:', ''));
                  return {
                    ...u,
                    role: 'teacher',
                    teacher_type: meta.type || 'guru_kelas',
                    grade_class: meta.rombel || u.grade_class,
                    assigned_subject_name: meta.subject || u.assigned_subject_name,
                    assigned_classes: meta.assigned || (u.grade_class ? [u.grade_class] : []),
                    nip: meta.nip || u.nip
                  };
                } catch (e) {}
              }
              if (u.role === 'teacher') {
                return {
                  ...u,
                  role: 'teacher',
                  teacher_type: u.teacher_type || (u.assigned_subject_name?.includes('PJOK') || u.assigned_subject_name?.includes('Agama') ? 'guru_mapel' : 'guru_kelas'),
                  assigned_classes: u.assigned_classes || (u.grade_class ? [u.grade_class] : [])
                };
              }
              return u;
            };

            const cached = localStorage.getItem('sasi_users_cache');
            const localUsers = cached ? JSON.parse(cached) : [];
            const userMap = new Map();
            MOCK_USERS.forEach((u) => userMap.set(u.username.toLowerCase(), u));
            localUsers.forEach((u: any) => userMap.set(u.username.toLowerCase(), decodeTeacherProfile(u)));
            data.forEach((u: any) => userMap.set(u.username.toLowerCase(), decodeTeacherProfile(u)));
            localStorage.setItem('sasi_users_cache', JSON.stringify(Array.from(userMap.values())));
          } catch (e) {}
        }
      } catch (err) {}
    };

    prefetchUsersFromCloud();
    return () => { isMounted = false; };
  }, []);

  // Countdown timer for OTP
  useEffect(() => {
    let interval: any;
    if (forgotStep === 'otp' && otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [forgotStep, otpCountdown]);

  const handleSendVerificationEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setForgotError(null);
    setIsSendingEmail(true);

    const emailTrimmed = forgotEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setIsSendingEmail(false);
      setForgotError('Silakan masukkan alamat email petugas terdaftar.');
      return;
    }

    let matched: any = null;

    // 1. Prioritas Utama: Cari langsung ke Cloud Supabase user_profiles
    try {
      const { data: cloudUsers } = await supabase
        .from('user_profiles')
        .select('*')
        .or('role.eq.super_admin,role.eq.assistant_admin,role.eq.proctor,role.eq.teacher');

      if (cloudUsers && cloudUsers.length > 0) {
        matched = cloudUsers.find(
          (u: any) => u.username.toLowerCase() === emailTrimmed || u.username.toLowerCase().trim() === emailTrimmed
        );
      }
    } catch (err) {}

    // 2. Fallback: Lookup user in cache or mock users
    if (!matched) {
      const allUsers = (() => {
        const userMap = new Map();
        MOCK_USERS.forEach((u) => userMap.set(u.username.toLowerCase(), u));
        try {
          const saved = localStorage.getItem('sasi_users_cache');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              parsed.forEach((u: any) => userMap.set(u.username.toLowerCase(), u));
            }
          }
        } catch (err) {}
        return Array.from(userMap.values());
      })();

      matched = allUsers.find(
        (u: any) => (u.role === 'super_admin' || u.role === 'assistant_admin' || u.role === 'proctor' || u.role === 'teacher') &&
             (u.username.toLowerCase() === emailTrimmed || u.username.toLowerCase().includes(emailTrimmed))
      );
    }

    if (!matched) {
      setIsSendingEmail(false);
      setForgotError(`Alamat email "${emailTrimmed}" tidak terdaftar sebagai petugas (Admin/Proktor/Guru).`);
      return;
    }

    setTimeout(() => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setForgotGeneratedOtp(otp);
      setForgotTargetUser(matched);
      setForgotInputOtp('');
      setForgotStep('otp');
      setOtpCountdown(60);
      setIsSendingEmail(false);
    }, 700);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (forgotInputOtp.trim() !== forgotGeneratedOtp) {
      setForgotError('Kode verifikasi OTP 6-digit salah. Periksa kode simulasi di atas.');
      return;
    }

    setForgotStep('new_password');
  };

  const handleSaveForgotNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);

    if (forgotNewPassword.length < 4) {
      setForgotError('Kata sandi baru minimal 4 karakter.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (!forgotTargetUser) return;

    const newPwd = forgotNewPassword.trim();

    // 1. Simpan ke database Cloud Supabase (Master Hub & Seluruh Shard Klaster secara Terdistribusi)
    try {
      await safeSupabaseDistributedUpdate({
        tableName: 'user_profiles',
        id: forgotTargetUser.id,
        username: forgotTargetUser.username,
        schoolId: forgotTargetUser.school_id,
        role: forgotTargetUser.role,
        payload: { password: newPwd, exam_card_password: newPwd }
      });
    } catch (err) {}

    // 2. Persist new password to sasi_users_cache
    try {
      const allUsers = (() => {
        try {
          const saved = localStorage.getItem('sasi_users_cache');
          if (saved) return JSON.parse(saved);
        } catch (err) {}
        return MOCK_USERS;
      })();

      const updatedList = allUsers.map((u: UserProfile) => 
        (u.id === forgotTargetUser.id || u.username === forgotTargetUser.username) ? { ...u, password: newPwd } : u
      );
      localStorage.setItem('sasi_users_cache', JSON.stringify(updatedList));
    } catch (err) {}

    // Update target user local state
    setForgotTargetUser({
      ...forgotTargetUser,
      password: newPwd
    });

    setForgotStep('success');
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nisnClean = nisn.trim();
    const pinClean = pin.trim();

    if (!nisnClean || !pinClean) {
      setErrorMessage('Silakan lengkapi NISN dan PIN Password Cetak terlebih dahulu.');
      return;
    }

    // Periksa token ujian aktif
    const validTokens = new Set<string>(['SASI26']);
    try {
      const cachedSessions = localStorage.getItem('sasi_sessions_cache');
      if (cachedSessions) {
        const parsed = JSON.parse(cachedSessions);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => {
            if (s.token_code) validTokens.add(s.token_code.toUpperCase().trim());
          });
        }
      }
    } catch (e) {}

    // Coba periksa token sesi langsung dari Supabase
    try {
      const { data: activeSessions } = await supabase
        .from('exam_sessions')
        .select('token_code')
        .eq('is_active', true);
      if (activeSessions) {
        activeSessions.forEach((s: any) => {
          if (s.token_code) validTokens.add(s.token_code.toUpperCase().trim());
        });
      }
    } catch (e) {}

    const tokenClean = token.toUpperCase().trim();
    if (!validTokens.has(tokenClean)) {
      setErrorMessage('Token Ujian tidak valid atau belum dirilis oleh Proktor Ruangan!');
      return;
    }

    // 1. Prioritas Utama: Cek langsung ke database Supabase Cloud tabel user_profiles (Master Hub & Federated Clusters)
    try {
      let cloudStudent: any = null;
      const { data: masterStudent, error: studentErr } = await supabase
        .from('user_profiles')
        .select('*, school:schools(*)')
        .eq('role', 'student')
        .eq('username', nisnClean)
        .maybeSingle();

      cloudStudent = masterStudent;

      // Federated Fallback: Jika siswa belum ada di Master (misal terdaftar di Shard Klaster 2 atau 3)
      if (!cloudStudent) {
        const clusterNodes = getClusterNodes().filter(n => !n.isMaster && n.isActive);
        for (const node of clusterNodes) {
          try {
            const nodeClient = getClientForNode(node);
            const { data: shardStd } = await nodeClient
              .from('user_profiles')
              .select('*')
              .eq('role', 'student')
              .eq('username', nisnClean)
              .maybeSingle();

            if (shardStd) {
              cloudStudent = shardStd;
              // Auto-heal: Sinkronkan ke Master DB agar login berikutnya langsung instan
              supabase.from('user_profiles').upsert(shardStd).catch(() => {});
              break;
            }
          } catch (e) {}
        }
      }

      if (cloudStudent) {
        const validPin = cloudStudent.exam_card_password || cloudStudent.password || '123456';
        if (pinClean === validPin) {
          // Proteksi Single Device Login (Standar ANBK Resmi):
          // Jika siswa sedang aktif di perangkat lain (is_logged_in === true), wajib dilepas kunci oleh Proktor
          if (cloudStudent.is_logged_in) {
            setErrorMessage('Akun sedang aktif digunakan di perangkat lain. Jika HP/komputer Anda tadi mati atau restart, silakan minta Proktor di meja pengawas untuk mengklik tombol "Lepas Kunci"!');
            return;
          }

          onLoginSuccess(cloudStudent, tokenClean);
          return;
        } else {
          setErrorMessage('PIN Password Cetak tidak sesuai. Periksa kartu ujian Anda!');
          return;
        }
      }
    } catch (err) {
      console.warn('Cek student Supabase fallback:', err);
    }

    // 2. Fallback: Supabase GoTrue Auth
    const maskedEmail = `${nisnClean}@siswa.sasi.id`;
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: maskedEmail,
        password: pinClean,
      });

      if (!authError && authData.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*, school:schools(*)')
          .eq('id', authData.user.id)
          .single();

        if (profile) {
          if (profile.is_logged_in) {
            setErrorMessage('Akun sedang aktif digunakan di perangkat lain. Silakan minta Proktor untuk mengklik tombol "Lepas Kunci"!');
            return;
          }
          onLoginSuccess(profile, tokenClean);
          return;
        }
      }
    } catch (err) {}

    // 3. Fallback: Cache lokal atau Mock Users
    const allUsers = (() => {
      try {
        const saved = localStorage.getItem('sasi_users_cache');
        if (saved) return JSON.parse(saved);
      } catch (err) {}
      return MOCK_USERS;
    })();

    const matchedStudent = allUsers.find(
      (u: any) => u.role === 'student' && 
           u.username.trim() === nisnClean && 
           pinClean === (u.exam_card_password || u.password || '123456')
    );

    if (!matchedStudent) {
      setErrorMessage('NISN atau PIN Password Cetak tidak sesuai. Periksa kartu ujian Anda!');
      return;
    }

    onLoginSuccess(matchedStudent, tokenClean);
  };

  const handleOfficerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const emailTrimmed = officerEmail.trim().toLowerCase();

    if (
      !emailTrimmed || 
      emailTrimmed === 'masukkan user/email' || 
      emailTrimmed === 'masukan user/email'
    ) {
      setIsLoading(false);
      setErrorMessage('Silakan masukkan email / username petugas terlebih dahulu.');
      return;
    }

    if (
      !officerPassword ||
      officerPassword === 'Masukkan Password anda' ||
      officerPassword === 'masukan password anda' ||
      officerPassword === '******' ||
      officerPassword === '••••••••'
    ) {
      setIsLoading(false);
      setErrorMessage('Silakan masukkan kata sandi asli Anda.');
      return;
    }

    // 1. Prioritas Utama: Cek Realtime langsung ke Database Cloud Supabase tabel `user_profiles` (Master Hub & Federated Clusters)
    try {
      let directCloudUser: any = null;
      const { data: masterOfficer, error: directErr } = await supabase
        .from('user_profiles')
        .select('*, school:schools(*)')
        .eq('username', emailTrimmed)
        .maybeSingle();

      directCloudUser = masterOfficer;

      // Federated Fallback: Jika petugas belum ada di Master (misal terdaftar di Shard Klaster 2 atau 3)
      if (!directCloudUser) {
        const clusterNodes = getClusterNodes().filter(n => !n.isMaster && n.isActive);
        for (const node of clusterNodes) {
          try {
            const nodeClient = getClientForNode(node);
            const { data: shardOfficer } = await nodeClient
              .from('user_profiles')
              .select('*')
              .eq('username', emailTrimmed)
              .maybeSingle();

            if (shardOfficer) {
              directCloudUser = shardOfficer;
              // Auto-heal: Sinkronkan ke Master DB agar login berikutnya langsung instan
              supabase.from('user_profiles').upsert(shardOfficer).catch(() => {});
              break;
            }
          } catch (e) {}
        }
      }

      if (directCloudUser) {
        let activeUser: UserProfile = { ...directCloudUser };

        // Jika user adalah teacher atau memiliki metadata guru
        if (activeUser.role === 'teacher' || (activeUser.exam_card_password && activeUser.exam_card_password.startsWith('TEACHER:'))) {
          activeUser.role = 'teacher';

          if (activeUser.exam_card_password && activeUser.exam_card_password.startsWith('TEACHER:')) {
            try {
              const meta = JSON.parse(activeUser.exam_card_password.replace('TEACHER:', ''));
              activeUser.teacher_type = meta.type || activeUser.teacher_type || 'guru_kelas';
              activeUser.grade_class = meta.rombel || activeUser.grade_class;
              activeUser.assigned_subject_name = meta.subject || activeUser.assigned_subject_name;
              activeUser.assigned_classes = meta.assigned || (activeUser.grade_class ? [activeUser.grade_class] : []);
              activeUser.nip = meta.nip || activeUser.nip;
            } catch (e) {}
            // Bersihkan antipattern dari kolom PIN agar tidak bocor
            activeUser.exam_card_password = null;
          } else {
            // Ambil data penugasan dari tabel `teachers` secara aman tanpa kendala koma PostgREST
            try {
              const { data: allTch } = await supabase
                .from('teachers')
                .select('*');

              const tchRecord = allTch?.find(t => 
                (t.full_name && activeUser.full_name && t.full_name.trim().toLowerCase() === activeUser.full_name.trim().toLowerCase()) ||
                (t.nip_nuptk && t.nip_nuptk === activeUser.username)
              );

              if (tchRecord) {
                activeUser.grade_class = tchRecord.homeroom_class || activeUser.grade_class;
                activeUser.assigned_classes = tchRecord.homeroom_class ? [tchRecord.homeroom_class] : [];
                activeUser.assigned_subject_name = tchRecord.subject_specialty;
                activeUser.nip = tchRecord.nip_nuptk;
                const isMapelTch = isPjokTeacher(tchRecord.subject_specialty) || isAgamaTeacher(tchRecord.subject_specialty);
                activeUser.teacher_type = isMapelTch ? 'guru_mapel' : 'guru_kelas';
              }
            } catch (e) {}
          }

          // Fallback penentuan tipe guru jika belum diset
          if (!activeUser.teacher_type) {
            const isMapel = isPjokTeacher(activeUser.assigned_subject_name) || isAgamaTeacher(activeUser.assigned_subject_name);
            activeUser.teacher_type = isMapel ? 'guru_mapel' : 'guru_kelas';
          }
          if (activeUser.teacher_type === 'guru_kelas' && !activeUser.assigned_subject_name) {
            activeUser.assigned_subject_name = 'Semua Mapel SD (Kecuali PJOK & PAI)';
          }
          if (!activeUser.assigned_classes && activeUser.grade_class) {
            activeUser.assigned_classes = [activeUser.grade_class];
          }
        }

        const expectedPassword = activeUser.password || (
          activeUser.role === 'teacher' ? 'guru123' : 
          (activeUser.role === 'super_admin' ? 'admin123' : 
          (activeUser.role === 'assistant_admin' ? 'asisten123' : 'proktor123'))
        );

        if (officerPassword === expectedPassword) {
          // Simpan ke cache lokal agar sesi berikutnya instan
          try {
            const cached = localStorage.getItem('sasi_users_cache');
            const localUsers = cached ? JSON.parse(cached) : [];
            const userMap = new Map();
            MOCK_USERS.forEach((u) => userMap.set(u.username.toLowerCase(), u));
            localUsers.forEach((lu: any) => userMap.set(lu.username.toLowerCase(), lu));
            userMap.set(activeUser.username.toLowerCase(), activeUser);
            localStorage.setItem('sasi_users_cache', JSON.stringify(Array.from(userMap.values())));
          } catch (e) {}

          setIsLoading(false);
          onLoginSuccess(activeUser);
          return;
        } else {
          setIsLoading(false);
          setErrorMessage('Kata sandi yang Anda masukkan salah. Periksa kembali huruf besar/kecil kata sandi Anda!');
          return;
        }
      }
    } catch (directCloudErr) {
      console.warn('Direct user query fallback:', directCloudErr);
    }

    // 2. Cek Akun Petugas dari cache lokal & mock users (Mendukung email pribadi guru & offline)
    const cachedOfficers = (() => {
      try {
        const saved = localStorage.getItem('sasi_users_cache');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return [];
    })();
    const allKnownOfficers: UserProfile[] = [...cachedOfficers, ...MOCK_USERS];

    const matchedKnownOfficer = allKnownOfficers.find(
      (u) => (u.role === 'teacher' || u.role === 'super_admin' || u.role === 'assistant_admin' || u.role === 'proctor') &&
             (u.username.toLowerCase() === emailTrimmed || u.username.toLowerCase().trim() === emailTrimmed)
    );

    if (matchedKnownOfficer && matchedKnownOfficer.role === 'teacher') {
      const expectedPassword = matchedKnownOfficer.password || 'guru123';
      if (officerPassword === expectedPassword) {
        setIsLoading(false);
        onLoginSuccess(matchedKnownOfficer);
        return;
      } else {
        setIsLoading(false);
        setErrorMessage('Kata sandi guru salah. Periksa kembali huruf besar/kecil atau hubungi Proktor untuk mereset kata sandi Anda.');
        return;
      }
    }

    // 3. Cadangan Kolektif: Cek Realtime langsung ke Database Cloud Supabase tabel `user_profiles`
    try {
      const { data: cloudUsers, error: cloudErr } = await supabase
        .from('user_profiles')
        .select('*, school:schools(*)')
        .or('role.eq.super_admin,role.eq.assistant_admin,role.eq.proctor,role.eq.teacher');

      if (!cloudErr && cloudUsers && cloudUsers.length > 0) {
        // Sinkronkan ke cache lokal
        try {
          const cached = localStorage.getItem('sasi_users_cache');
          const localUsers = cached ? JSON.parse(cached) : [];
          const userMap = new Map();
          MOCK_USERS.forEach((u) => userMap.set(u.username.toLowerCase(), u));
          localUsers.forEach((lu: any) => userMap.set(lu.username.toLowerCase(), lu));
          cloudUsers.forEach((cu: any) => userMap.set(cu.username.toLowerCase(), cu));
          localStorage.setItem('sasi_users_cache', JSON.stringify(Array.from(userMap.values())));
        } catch (e) {}

        let matchedOfficer = cloudUsers.find(
          (u: any) => (u.role === 'super_admin' || u.role === 'assistant_admin' || u.role === 'proctor' || u.role === 'teacher') &&
            (u.username.toLowerCase() === emailTrimmed || u.username.toLowerCase().trim() === emailTrimmed)
        );

        if (matchedOfficer) {
          // Decode jika akun guru disimpan dengan fallback metadata di cloud
          if (matchedOfficer.exam_card_password && typeof matchedOfficer.exam_card_password === 'string' && matchedOfficer.exam_card_password.startsWith('TEACHER:')) {
            try {
              const meta = JSON.parse(matchedOfficer.exam_card_password.replace('TEACHER:', ''));
              matchedOfficer = {
                ...matchedOfficer,
                role: 'teacher',
                teacher_type: meta.type || matchedOfficer.teacher_type || 'guru_kelas',
                grade_class: meta.rombel || matchedOfficer.grade_class,
                assigned_subject_name: meta.subject || matchedOfficer.assigned_subject_name,
                assigned_classes: meta.assigned || (matchedOfficer.grade_class ? [matchedOfficer.grade_class] : []),
                nip: meta.nip || matchedOfficer.nip,
                exam_card_password: null
              };
            } catch (e) {}
          }

          const expectedPassword = matchedOfficer.password || (
            matchedOfficer.role === 'teacher' ? 'guru123' : 
            (matchedOfficer.role === 'super_admin' ? 'admin123' : 
            (matchedOfficer.role === 'assistant_admin' ? 'asisten123' : 'proktor123'))
          );
          if (officerPassword === expectedPassword) {
            setIsLoading(false);
            onLoginSuccess(matchedOfficer);
            return;
          } else {
            setIsLoading(false);
            setErrorMessage('Kata sandi yang Anda masukkan salah. Periksa kembali huruf besar/kecil kata sandi Anda!');
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Cek cloud user_profiles gagal, beralih ke cache lokal:', err);
    }

    // 3. Prioritas Kedua: Cek cache lokal browser digabung dengan mock data (jika offline / cloud lambat)
    const allUsers = (() => {
      const userMap = new Map<string, UserProfile>();
      MOCK_USERS.forEach((u) => userMap.set(u.username.toLowerCase(), u));
      try {
        const saved = localStorage.getItem('sasi_users_cache');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            parsed.forEach((u: any) => userMap.set(u.username.toLowerCase(), u));
          }
        }
      } catch (e) {}
      return Array.from(userMap.values());
    })();

    const matchedOfficerLocal = allUsers.find(
      (u: any) => (u.role === 'super_admin' || u.role === 'assistant_admin' || u.role === 'proctor' || u.role === 'teacher') &&
           (u.username.toLowerCase() === emailTrimmed || u.username.toLowerCase().includes(emailTrimmed))
    );

    if (matchedOfficerLocal) {
      const expectedPassword = matchedOfficerLocal.password || (
        matchedOfficerLocal.role === 'teacher' ? 'guru123' : 
        (matchedOfficerLocal.role === 'super_admin' ? 'admin123' : 
        (matchedOfficerLocal.role === 'assistant_admin' ? 'asisten123' : 'proktor123'))
      );
      if (officerPassword !== expectedPassword) {
        setIsLoading(false);
        setErrorMessage('Kata sandi yang Anda masukkan salah. Klik "Lupa Password?" jika Anda lupa kata sandi.');
        return;
      }

      setIsLoading(false);
      onLoginSuccess(matchedOfficerLocal);
      return;
    }

    // 3. Fallback ketiga: Supabase GoTrue Auth
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password: officerPassword,
      });

      if (!authError && authData?.user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*, school:schools(*)')
          .eq('id', authData.user.id)
          .single();

        if (profile) {
          setIsLoading(false);
          onLoginSuccess(profile);
          return;
        }
      }
    } catch (err) {}

    setIsLoading(false);
    setErrorMessage('Email atau kata sandi petugas tidak terdaftar di sistem.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-slate-950 flex flex-col justify-center items-center p-4 selection:bg-brand-500 selection:text-white">
      
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-xl">
        
        {/* Back to Landing Page Link */}
        {onBackToLanding && (
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-xl border border-white/10 backdrop-blur-xs shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Kembali ke Beranda Utama</span>
            </button>
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              SASIPEDIA • sasipedia.my.id
            </span>
          </div>
        )}

        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-white/95 rounded-2xl shadow-xl shadow-brand-500/20 mb-3 backdrop-blur-xs">
            <img 
              src="/sasipedia-logo.png" 
              alt="SASIPEDIA - Platform Asesmen Sekolah" 
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Portal Computer-Based Test (CBT) Jenjang SD (Fase A, B, C) & SMP (Fase D)
          </p>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <span className="text-[11px] bg-white/10 text-brand-200 px-2.5 py-0.5 rounded-full border border-white/10">
              5 Moda: Formatif • PTS • SAS • SAT • SAJ
            </span>
          </div>
        </div>

        {/* Dual-Tab Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
          
          {/* Tabs Navigation */}
          <div className="grid grid-cols-2 bg-slate-100/80 p-1.5 border-b border-slate-200">
            <button
              type="button"
              onClick={() => { setActiveTab('student'); setErrorMessage(null); }}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'student'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Peserta Ujian (Siswa)</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('officer'); setErrorMessage(null); }}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'officer'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Pendidik & Petugas (Guru / Proktor)</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: PESERTA UJIAN (SISWA) */}
            {activeTab === 'student' && (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                
                {/* NISN / No Peserta */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor Induk Siswa Nasional (NISN) / No. Peserta
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value)}
                      onFocus={() => {
                        if (nisn === '0123456789' || nisn === '0087654321') setNisn('');
                      }}
                      placeholder="Contoh: 0123456789"
                      className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>*Terhubung otomatis dengan email masking Supabase: <code className="text-brand-600 font-mono font-medium">{nisn || '[nisn]'}@siswa.sasi.id</code></span>
                  </div>
                </div>

                {/* PIN Cetak */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      PIN Password Cetak
                    </label>
                    <span className="text-[11px] text-brand-600 font-medium">
                      (SD Kelas 1-4: 4 digit angka mudah)
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPin ? "text" : "password"}
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      onFocus={() => {
                        if (pin === '4821' || pin === 'K92J1P') setPin('');
                      }}
                      placeholder="Masukkan PIN dari Kartu Ujian"
                      className="block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 tracking-wider focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Token Ujian */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Token Ujian Sesi Aktif
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={8}
                      value={token}
                      onChange={(e) => setToken(e.target.value.toUpperCase())}
                      placeholder="CONTOH: SASI26"
                      className="block w-full px-4 py-2.5 bg-brand-50/50 border border-brand-200 rounded-xl text-center text-lg font-mono font-extrabold text-brand-700 tracking-widest focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all uppercase"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Token diumumkan oleh Proktor Ruangan saat sesi dimulai.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white rounded-xl font-bold text-sm shadow-md shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
                >
                  <span>Masuk Ruang Asesmen CBT</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Forgot PIN / Lapor Proktor */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowStudentForgotModal(true)}
                    className="text-xs text-slate-500 hover:text-brand-600 underline font-medium"
                  >
                    Lupa PIN atau Kartu Ujian Hilang?
                  </button>
                </div>

              </form>
            )}

            {/* TAB 2: PETUGAS (ADMIN & PROKTOR) */}
            {activeTab === 'officer' && (
              <form onSubmit={handleOfficerLogin} className="space-y-4">
                
                {/* Email / Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email / Username Petugas & Guru Pendidik
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={officerEmail}
                      onChange={(e) => {
                        setOfficerEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onFocus={() => {
                        if (
                          officerEmail === 'Masukkan user/email' ||
                          officerEmail === 'Masukan user/email' ||
                          officerEmail.toLowerCase().includes('masukan user') ||
                          officerEmail.toLowerCase().includes('masukkan user') ||
                          officerEmail === 'nughejr@gmail.com' ||
                          officerEmail === 'asisten.mat@sasi.id' ||
                          officerEmail === 'proktor@sasi.id'
                        ) {
                          setOfficerEmail('');
                        }
                      }}
                      placeholder="Masukkan user/email"
                      className={`block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all ${
                        isEmailPlaceholder ? 'text-slate-400 italic' : 'text-slate-900 font-medium'
                      }`}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Kata Sandi
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('email');
                        setForgotEmail(isEmailPlaceholder ? '' : officerEmail);
                        setForgotError(null);
                        setForgotInputOtp('');
                        setForgotNewPassword('');
                        setForgotConfirmPassword('');
                        setShowOfficerForgotModal(true);
                      }}
                      className="text-xs text-brand-600 hover:text-brand-700 font-bold hover:underline"
                    >
                      Lupa Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showOfficerPassword || isPasswordPlaceholder ? 'text' : 'password'}
                      required
                      value={officerPassword}
                      onChange={(e) => {
                        setOfficerPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onFocus={() => {
                        if (
                          officerPassword === 'Masukkan Password anda' ||
                          officerPassword === 'Masukan Password anda' ||
                          officerPassword.toLowerCase().includes('masukan password') ||
                          officerPassword.toLowerCase().includes('masukkan password') ||
                          officerPassword === '******' ||
                          officerPassword === '••••••••'
                        ) {
                          setOfficerPassword('');
                        }
                      }}
                      placeholder="Masukkan Password anda"
                      className={`block w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all ${
                        isPasswordPlaceholder ? 'text-slate-400 italic font-sans' : 'text-slate-900 font-mono'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOfficerPassword(!showOfficerPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                      title={showOfficerPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                    >
                      {showOfficerPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-500 hover:text-slate-700" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Mengautentikasi...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Masuk Panel Pendidik & Petugas</span>
                    </>
                  )}
                </button>

              </form>
            )}

          </div>

          {/* Footer Card */}
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Server CBT SASI Online</span>
            <span>Versi 2.4.0 • Standar Pusmendik</span>
          </div>
        </div>

      </div>

      {/* MODAL 1: SISWA LUPA PASSWORD / KARTU HILANG */}
      {showStudentForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Bantuan Akses Kartu Ujian & PIN Siswa
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Demi keamanan dan integritas asesmen, siswa <strong>tidak dapat mereset PIN secara mandiri melalui email</strong>. 
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-2 mb-4">
              <div className="font-semibold">Langkah Penyelesaian:</div>
              <ol className="list-decimal list-inside space-y-1">
                <li>Angkat tangan dan lapor ke <strong>Pengawas / Proktor Ruangan</strong>.</li>
                <li>Proktor memiliki tombol <em>"Lihat Kartu / One-Click Reset PIN"</em> di dashboard pemantauan.</li>
                <li>Proktor dapat langsung mencetak ulang atau memberikan PIN 4 digit darurat.</li>
              </ol>
            </div>
            <button
              type="button"
              onClick={() => setShowStudentForgotModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
            >
              Saya Mengerti, Tutup Pesan
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: PETUGAS LUPA PASSWORD MANDIRI DENGAN VERIFIKASI VIA EMAIL */}
      {showOfficerForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    {forgotStep === 'email' && 'Verifikasi Email Petugas'}
                    {forgotStep === 'otp' && 'Masukkan Kode OTP Email'}
                    {forgotStep === 'new_password' && 'Buat Kata Sandi Baru'}
                    {forgotStep === 'success' && 'Reset Sandi Berhasil!'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {forgotStep === 'email' && 'Langkah 1 dari 3: Validasi akun terdaftar'}
                    {forgotStep === 'otp' && 'Langkah 2 dari 3: Verifikasi kode email'}
                    {forgotStep === 'new_password' && 'Langkah 3 dari 3: Tentukan kata sandi baru'}
                    {forgotStep === 'success' && 'Akun Anda siap digunakan'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfficerForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <EyeOff className="hidden" />
                <span className="text-xl font-bold leading-none">&times;</span>
              </button>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: INPUT EMAIL TERDAFTAR */}
            {forgotStep === 'email' && (
              <form onSubmit={handleSendVerificationEmail} className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Masukkan email dinas resmi Anda yang terdaftar pada sistem SASI (Super Admin, Asisten Admin, atau Proktor Sekolah). Kode verifikasi OTP akan dikirimkan ke email Anda.
                </p>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                    Email / Username Terdaftar *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Contoh: sdncinanggerang1@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowOfficerForgotModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingEmail}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-black rounded-xl flex items-center space-x-2 shadow-md"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Mengirim Kode...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Kirim Kode Verifikasi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: VERIFIKASI KODE OTP EMAIL */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
                {/* Simulated Email Inbox Alert */}
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-sky-900 space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-sky-800">
                    <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Notifikasi Simulasi Email SASI Masuk:</span>
                  </div>
                  <div className="text-[11px] text-sky-700">
                    Tujuan: <strong>{forgotEmail}</strong>
                  </div>
                  <div className="pt-1.5 flex items-center space-x-2">
                    <span className="text-[11px] text-sky-700">Kode OTP Anda:</span>
                    <span className="font-mono text-base font-black bg-sky-200 text-sky-900 px-3 py-0.5 rounded-lg tracking-widest">
                      {forgotGeneratedOtp}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px] text-center">
                    Masukkan 6 Digit Kode OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={forgotInputOtp}
                    onChange={(e) => setForgotInputOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    className="w-full text-center tracking-widest font-mono text-2xl font-black py-2.5 border-2 border-brand-500 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:outline-none bg-slate-50 text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Tidak menerima kode?</span>
                  {otpCountdown > 0 ? (
                    <span className="font-semibold text-slate-400">Kirim ulang ({otpCountdown}s)</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendVerificationEmail()}
                      className="font-bold text-brand-600 hover:text-brand-800 flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Kirim Ulang Kode</span>
                    </button>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold"
                  >
                    Kembali
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Verifikasi Kode
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: BUAT KATA SANDI BARU */}
            {forgotStep === 'new_password' && (
              <form onSubmit={handleSaveForgotNewPassword} className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 font-black flex items-center justify-center shrink-0">
                    {forgotTargetUser?.full_name ? forgotTargetUser.full_name.charAt(0) : 'U'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-slate-900 truncate">{forgotTargetUser?.full_name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{forgotTargetUser?.username}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                    Kata Sandi Baru *
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter"
                      className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                    Konfirmasi Kata Sandi Baru *
                  </label>
                  <input
                    type={showForgotNewPassword ? 'text' : 'password'}
                    required
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-black rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Simpan Kata Sandi Baru
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: BERHASIL */}
            {forgotStep === 'success' && forgotTargetUser && (
              <div className="text-center py-2 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900">Kata Sandi Berhasil Diperbarui!</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Akun <strong>{forgotTargetUser.full_name}</strong> telah berhasil diperbarui dengan kata sandi baru.
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowOfficerForgotModal(false);
                      onLoginSuccess(forgotTargetUser);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Masuk ke Sistem Sekarang
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOfficerForgotModal(false);
                      setOfficerEmail(forgotTargetUser.username);
                      setOfficerPassword(forgotNewPassword);
                    }}
                    className="w-full py-2 text-slate-600 hover:text-slate-800 text-xs font-bold"
                  >
                    Tutup & Isi Form Login
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

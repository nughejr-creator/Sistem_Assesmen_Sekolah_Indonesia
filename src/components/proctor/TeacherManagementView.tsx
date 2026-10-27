import React, { useState, useEffect } from 'react';
import { School, UserProfile } from '../../types/database';
import { MOCK_USERS } from '../../lib/mockData';
import { supabase } from '../../lib/supabase';
import { 
  generateValidUUID, 
  toValidUUID,
  safeSupabaseUpsert,
  safeSupabaseDistributedDelete
} from '../../lib/syncHelper';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  UserCheck,
  BookOpen,
  Award,
  Users,
  RotateCcw,
  RefreshCw,
  KeyRound,
  Printer,
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  Lock,
  Layers,
  Sparkles,
  Info,
  ChevronDown
} from 'lucide-react';

export interface TeacherRecord {
  id: string;
  nip_nuptk: string;
  full_name: string;
  gender: 'L' | 'P';
  teacher_type: 'guru_kelas' | 'guru_mapel';
  homeroom_class?: string; // e.g. "Kelas 6-A"
  assigned_classes?: string[]; // e.g. ["6-A", "6-B"]
  subject_specialty: string;
  employment_status: 'PNS' | 'PPPK' | 'GTT/Honorer' | 'Guru Tetap Yayasan';
  phone_number?: string;
  email: string; // The login username
  password: string; // Login password (default guru123)
}

interface TeacherManagementViewProps {
  school: School;
}

const DEFAULT_MAPEL_KHUSUS = [
  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  'Pendidikan Agama Islam dan Budi Pekerti',
  'Pendidikan Agama Kristen dan Budi Pekerti',
  'Pendidikan Agama Katolik dan Budi Pekerti',
  'Pendidikan Agama Hindu dan Budi Pekerti',
  'Pendidikan Agama Buddha dan Budi Pekerti',
  'Bahasa Inggris',
  'Bahasa Daerah / Mulok'
];

export const TeacherManagementView: React.FC<TeacherManagementViewProps> = ({ school }) => {
  const schoolId = school.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';
  const storageKey = `sasi_teachers_${schoolId}`;

  // Initialize Teachers from sasi_users_cache + localStorage + MOCK_USERS
  const [teachers, setTeachers] = useState<TeacherRecord[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    // Fallback: extract from sasi_users_cache or MOCK_USERS
    const userCache = (() => {
      try {
        const c = localStorage.getItem('sasi_users_cache');
        if (c) return JSON.parse(c);
      } catch (e) {}
      return MOCK_USERS;
    })();

    const teacherUsers = userCache.filter((u: UserProfile) => u.role === 'teacher' && (u.school_id === schoolId || (!u.school_id && schoolId === 'b0000001-0000-0000-0000-000000000001')));
    if (teacherUsers.length > 0) {
      return teacherUsers.map((u: UserProfile) => {
        const isHomeroom = u.teacher_type === 'guru_kelas' || (!u.teacher_type && u.grade_class && !u.assigned_subject_name?.toLowerCase().includes('pjok') && !u.assigned_subject_name?.toLowerCase().includes('agama'));
        return {
          id: u.id,
          nip_nuptk: u.nip || '19780514 200501 2 006',
          full_name: u.full_name,
          gender: 'L',
          teacher_type: isHomeroom ? 'guru_kelas' : 'guru_mapel',
          homeroom_class: u.grade_class || 'Kelas 6-A',
          assigned_classes: u.assigned_classes || ['6-A', '6-B'],
          subject_specialty: isHomeroom ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : (u.assigned_subject_name || 'PJOK'),
          employment_status: 'PNS',
          phone_number: '081234567890',
          email: u.username,
          password: u.password || 'guru123'
        };
      });
    }

    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'guru_kelas' | 'guru_mapel'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null);
  const [formData, setFormData] = useState<Partial<TeacherRecord>>({
    nip_nuptk: '',
    full_name: '',
    gender: 'L',
    teacher_type: 'guru_kelas',
    homeroom_class: 'Kelas 6-A',
    assigned_classes: ['6-A', '6-B'],
    subject_specialty: 'Semua Mapel SD (Kecuali PJOK & PAI)',
    employment_status: 'PNS',
    phone_number: '',
    email: '',
    password: 'guru123'
  });

  // State untuk Dropdown Rombel Bertingkat
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('Kelas 6');
  const [selectedSection, setSelectedSection] = useState('A');
  const [customRombelInput, setCustomRombelInput] = useState('');

  // Modal Reset Password
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [targetResetTeacher, setTargetResetTeacher] = useState<TeacherRecord | null>(null);
  const [resetPasswordType, setResetPasswordType] = useState<'default' | 'custom'>('default');
  const [customPasswordInput, setCustomPasswordInput] = useState('');

  // Modal Cetak Kartu Akun Login
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Password visibility map & copy toast
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync teachers to sasi_users_cache so they can immediately log in
  const syncToUsersCache = (updatedTeachers: TeacherRecord[]) => {
    try {
      const cached = localStorage.getItem('sasi_users_cache');
      let allUsers: UserProfile[] = cached ? JSON.parse(cached) : [...MOCK_USERS];

      // Remove existing teachers belonging to this school from users list
      const nonTeacherUsers = allUsers.filter(u => !(u.role === 'teacher' && (!u.school_id || u.school_id === schoolId)));

      // Map teacher records to UserProfile
      const newTeacherProfiles: UserProfile[] = updatedTeachers.map(t => ({
        id: t.id,
        username: t.email.toLowerCase().trim(),
        full_name: t.full_name,
        role: 'teacher',
        teacher_type: t.teacher_type,
        school_id: schoolId,
        assigned_level: school.level || 'SD',
        grade_class: t.teacher_type === 'guru_kelas' ? t.homeroom_class : t.assigned_classes?.join(', '),
        assigned_classes: t.assigned_classes,
        assigned_subject_name: t.teacher_type === 'guru_kelas' ? 'Semua Mapel (Kecuali PJOK & PAI)' : t.subject_specialty,
        nip: t.nip_nuptk,
        password: t.password || 'guru123',
        is_logged_in: false,
        created_at: new Date().toISOString()
      }));

      const finalUsers = [...nonTeacherUsers, ...newTeacherProfiles];
      localStorage.setItem('sasi_users_cache', JSON.stringify(finalUsers));
      localStorage.setItem(storageKey, JSON.stringify(updatedTeachers));
    } catch (e) {
      console.warn('Sync to users cache error:', e);
    }
  };

  // Sync akun guru ke database Cloud Supabase (Persisten antar perangkat)
  const syncTeacherToSupabaseCloud = async (t: TeacherRecord): Promise<boolean> => {
    try {
      const schId = school.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';
      const emailClean = t.email.toLowerCase().trim();

      // 1. Simpan ke tabel `teachers` di Supabase
      let targetTchId = toValidUUID(t.id);
      try {
        const hasValidNip = t.nip_nuptk && t.nip_nuptk !== '-' && t.nip_nuptk.trim().length > 3;
        let query = supabase.from('teachers').select('id');
        if (hasValidNip) {
          query = query.or(`nip_nuptk.eq.${t.nip_nuptk.trim()},full_name.eq.${t.full_name.trim()}`);
        } else {
          query = query.eq('full_name', t.full_name.trim());
        }
        const { data: existingTch } = await query.maybeSingle();

        const tchPayload = {
          school_id: schId,
          nip_nuptk: t.nip_nuptk || '-',
          full_name: t.full_name,
          gender: t.gender || 'L',
          subject_specialty: t.subject_specialty,
          homeroom_class: t.homeroom_class || '-',
          employment_status: t.employment_status,
          phone_number: t.phone_number || '-',
          updated_at: new Date().toISOString()
        };

        if (existingTch?.id) {
          targetTchId = existingTch.id;
          await supabase.from('teachers').update(tchPayload).eq('id', existingTch.id);
        } else {
          await supabase.from('teachers').insert({
            id: targetTchId,
            ...tchPayload
          });
        }
      } catch (e) {
        console.warn('Sync to teachers table warning:', e);
      }

      // 2. Simpan ke tabel `user_profiles` di Supabase untuk autentikasi login cloud
      const teacherMetaJson = `TEACHER:${JSON.stringify({
        type: t.teacher_type,
        rombel: t.homeroom_class,
        subject: t.subject_specialty,
        assigned: t.assigned_classes,
        nip: t.nip_nuptk
      })}`;

      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', emailClean)
        .maybeSingle();

      const profilePayload = {
        username: emailClean,
        full_name: t.full_name,
        school_id: schId,
        grade_class: t.homeroom_class || '6-A',
        password: t.password || 'guru123',
        exam_card_password: (t.password || 'guru123').slice(0, 50),
        updated_at: new Date().toISOString()
      };

      if (existingUser?.id) {
        // Coba update dengan role teacher
        const { error: updErr } = await supabase
          .from('user_profiles')
          .update({
            ...profilePayload,
            role: 'teacher'
          })
          .eq('id', existingUser.id);

        if (updErr) {
          // Fallback role proctor
          await supabase
            .from('user_profiles')
            .update({
              ...profilePayload,
              role: 'proctor'
            })
            .eq('id', existingUser.id);
        }
      } else {
        // Insert user baru dengan id UUID
        const newUserId = generateValidUUID();
        const { error: insErr } = await supabase
          .from('user_profiles')
          .insert({
            id: newUserId,
            ...profilePayload,
            role: 'teacher'
          });

        if (insErr) {
          // Fallback role proctor
          await supabase
            .from('user_profiles')
            .insert({
              id: newUserId,
              ...profilePayload,
              role: 'proctor'
            });
        }
      }

      // 3. Multi-Node Replication: Pastikan akun guru juga ter-upsert ke Shard Klaster jika sekolah dipetakan
      try {
        await safeSupabaseUpsert('teachers', [{ id: targetTchId, ...tchPayload }], schId);
        await safeSupabaseUpsert('user_profiles', [{
          id: existingUser?.id || generateValidUUID(),
          ...profilePayload,
          role: 'teacher'
        }], schId);
      } catch (shardErr) {
        console.warn('Dual-write to cluster shard warning:', shardErr);
      }

      return true;
    } catch (err) {
      console.warn('Sync teacher to Cloud Supabase warning:', err);
      return false;
    }
  };

  const deleteTeacherFromSupabaseCloud = async (id: string, email: string, fullName?: string, nip?: string) => {
    try {
      await safeSupabaseDistributedDelete({
        tableName: 'teachers',
        id,
        username: email.toLowerCase().trim(),
        fullName,
        nip,
        schoolId: school.id,
        role: 'teacher'
      });
    } catch (e) {
      console.warn('Distributed delete teacher error:', e);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Real-time Cloud + Cache Sync for Teachers of this school
  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const schId = school.id || '1e6e1bbb-05cb-49a8-8ab0-e166336c9222';
      const validSchId = toValidUUID(schId);

      // 1. Fetch from Supabase 'teachers' table
      let cloudTch: any[] = [];
      try {
        const { data: dbTch } = await supabase
          .from('teachers')
          .select('*')
          .order('full_name', { ascending: true });
        if (dbTch && dbTch.length > 0) cloudTch = dbTch;
      } catch (e) {}

      // Filter cloud teachers belonging to this school
      const schoolCloudTch = cloudTch.filter((t: any) => 
        t.school_id === schId || 
        (validSchId && t.school_id === validSchId)
      );

      // 2. Fetch from Supabase 'user_profiles' table where role === 'teacher'
      let cloudUsers: any[] = [];
      try {
        const { data: dbUsers } = await supabase
          .from('user_profiles')
          .select('*, school:schools(*)')
          .eq('role', 'teacher');
        if (dbUsers && dbUsers.length > 0) cloudUsers = dbUsers;
      } catch (e) {}

      // Filter cloud users belonging to this school
      const schoolCloudUsers = cloudUsers.filter((u: any) =>
        u.school_id === schId ||
        (validSchId && u.school_id === validSchId) ||
        (school.npsn && u.school?.npsn === school.npsn) ||
        (school.name && u.school?.name === school.name)
      );

      // 3. Read local users cache
      let localUsers: UserProfile[] = [];
      try {
        const c = localStorage.getItem('sasi_users_cache');
        if (c) localUsers = JSON.parse(c);
      } catch (e) {}
      const schoolLocalUsers = localUsers.filter((u: UserProfile) =>
        u.role === 'teacher' && (
          u.school_id === schId ||
          (validSchId && u.school_id === validSchId) ||
          (school.npsn && u.school?.npsn === school.npsn) ||
          (school.name && u.school?.name === school.name)
        )
      );

      // 4. Read localStorage saved teachers
      let localSavedTch: TeacherRecord[] = [];
      try {
        const s = localStorage.getItem(storageKey);
        if (s) localSavedTch = JSON.parse(s);
        if (!localSavedTch.length && validSchId) {
          const s2 = localStorage.getItem(`sasi_teachers_${validSchId}`);
          if (s2) localSavedTch = JSON.parse(s2);
        }
      } catch (e) {}

      // 5. Intelligent Merge:
      // Jadikan data Cloud (schoolCloudTch & schoolCloudUsers) sebagai sumber kebenaran utama
      // agar akun guru yang telah dipindahkan/dihapus tidak muncul kembali dari cache lama browser.
      const hasCloudData = schoolCloudTch.length > 0 || schoolCloudUsers.length > 0;
      const mergedMap = new Map<string, TeacherRecord>();

      if (!hasCloudData) {
        // Fallback hanya jika koneksi cloud benar-benar kosong atau offline
        localSavedTch.forEach(t => {
          const key = (t.email || t.full_name).toLowerCase().trim();
          mergedMap.set(key, t);
        });
      }

      // B. Merge schoolCloudTch (Prioritize NIP, then Name)
      schoolCloudTch.forEach(ct => {
        const ctName = (ct.full_name || '').toLowerCase().trim();
        const ctNip = (ct.nip_nuptk || '').trim();

        let existing: TeacherRecord | undefined = undefined;
        if (ctNip && ctNip !== '-' && ctNip.length > 3) {
          existing = Array.from(mergedMap.values()).find(x => x.nip_nuptk && x.nip_nuptk.trim() === ctNip);
        }
        if (!existing && ctName) {
          existing = mergedMap.get(ctName) || Array.from(mergedMap.values()).find(x => x.full_name.toLowerCase().trim() === ctName);
        }

        if (existing) {
          if (ct.nip_nuptk && ct.nip_nuptk !== '-') existing.nip_nuptk = ct.nip_nuptk;
          if (ct.homeroom_class && ct.homeroom_class !== '-') {
            existing.homeroom_class = ct.homeroom_class;
            existing.assigned_classes = [ct.homeroom_class.replace('Kelas ', '')];
          }
          if (ct.subject_specialty) existing.subject_specialty = ct.subject_specialty;
          if (ct.employment_status) existing.employment_status = ct.employment_status;
          if (ct.full_name && ct.full_name.length > existing.full_name.length) {
            existing.full_name = ct.full_name;
          }
        } else {
          const isHomeroom = ct.homeroom_class && ct.homeroom_class !== '-';
          const defaultKey = (ctNip && ctNip !== '-') ? `nip:${ctNip}` : ctName;
          mergedMap.set(defaultKey, {
            id: ct.id,
            nip_nuptk: ct.nip_nuptk || '-',
            full_name: ct.full_name,
            gender: ct.gender || 'L',
            teacher_type: isHomeroom ? 'guru_kelas' : 'guru_mapel',
            homeroom_class: ct.homeroom_class || 'Kelas 1-A',
            assigned_classes: ct.homeroom_class ? [ct.homeroom_class.replace('Kelas ', '')] : ['1-A'],
            subject_specialty: ct.subject_specialty || (isHomeroom ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : 'Mata Pelajaran'),
            employment_status: ct.employment_status || 'PNS',
            phone_number: ct.phone_number || '-',
            email: `${ct.full_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}@guru.sd.belajar.id`,
            password: 'guru123'
          });
        }
      });

      // C. Merge all teacher users (from cloud user_profiles & local sasi_users_cache)
      const allTeacherUsers = [...schoolCloudUsers, ...schoolLocalUsers];
      allTeacherUsers.forEach(u => {
        const emailKey = (u.username || '').toLowerCase().trim();
        const nameKey = (u.full_name || '').toLowerCase().trim();

        // Parse metadata if present in exam_card_password FIRST!
        let metaRombel = u.grade_class;
        let metaType = u.teacher_type;
        let metaSubject = u.assigned_subject_name;
        let metaNip = u.nip;

        if (u.exam_card_password && u.exam_card_password.startsWith('TEACHER:')) {
          try {
            const parsed = JSON.parse(u.exam_card_password.replace('TEACHER:', ''));
            if (parsed.rombel) metaRombel = parsed.rombel;
            if (parsed.type) metaType = parsed.type;
            if (parsed.subject) metaSubject = parsed.subject;
            if (parsed.nip) metaNip = parsed.nip;
          } catch (e) {}
        }

        const effectiveNip = (metaNip || u.nip || '').trim();

        // Match by NIP first (highest precision), then Email, then Name
        let match: TeacherRecord | undefined = undefined;
        if (effectiveNip && effectiveNip !== '-' && effectiveNip.length > 3) {
          match = Array.from(mergedMap.values()).find(x => x.nip_nuptk && x.nip_nuptk.trim() === effectiveNip);
        }
        if (!match && emailKey) {
          match = mergedMap.get(emailKey) || Array.from(mergedMap.values()).find(x => x.email && x.email.toLowerCase().trim() === emailKey);
        }
        if (!match && nameKey) {
          match = mergedMap.get(nameKey) || Array.from(mergedMap.values()).find(x => x.full_name && x.full_name.toLowerCase().trim() === nameKey);
        }

        const isHomeroom = metaType === 'guru_kelas' || (!metaType && metaRombel && !metaSubject?.toLowerCase().includes('pjok') && !metaSubject?.toLowerCase().includes('agama'));

        if (match) {
          // Overwrite with authentic user login email and official name
          if (u.username) match.email = u.username;
          if (u.full_name) match.full_name = u.full_name;
          match.password = u.password || match.password || 'guru123';
          if (metaRombel && (!match.homeroom_class || match.homeroom_class === '-')) {
            match.homeroom_class = metaRombel;
            match.assigned_classes = [metaRombel.replace('Kelas ', '')];
          }
          if (effectiveNip && (!match.nip_nuptk || match.nip_nuptk === '-')) {
            match.nip_nuptk = effectiveNip;
          }
        } else {
          // Add newly discovered teacher
          const finalRombel = metaRombel || 'Kelas 1-A';
          const newRec: TeacherRecord = {
            id: u.id,
            nip_nuptk: effectiveNip || '-',
            full_name: u.full_name,
            gender: (u.gender as any) || 'P',
            teacher_type: isHomeroom ? 'guru_kelas' : 'guru_mapel',
            homeroom_class: finalRombel,
            assigned_classes: u.assigned_classes || [finalRombel.replace('Kelas ', '')],
            subject_specialty: isHomeroom ? 'Semua Mapel SD (Kecuali PJOK & PAI)' : (metaSubject || 'Mata Pelajaran'),
            employment_status: (u.employment_status as any) || 'PNS',
            phone_number: u.phone_number || '-',
            email: u.username,
            password: u.password || 'guru123'
          };
          const itemKey = (effectiveNip && effectiveNip !== '-') ? `nip:${effectiveNip}` : (emailKey || nameKey);
          mergedMap.set(itemKey, newRec);

          // Auto-sync back to Supabase `teachers` table so it exists permanently there as well!
          syncTeacherToSupabaseCloud(newRec);
        }
      });

      // Deduplicate finalList to guarantee zero duplicate rows by NIP or Email
      const seenNips = new Set<string>();
      const seenEmails = new Set<string>();
      const deduplicatedList: TeacherRecord[] = [];

      for (const t of Array.from(mergedMap.values())) {
        const cleanNip = (t.nip_nuptk || '').trim();
        const cleanEmail = (t.email || '').toLowerCase().trim();

        if (cleanNip && cleanNip !== '-' && cleanNip.length > 3) {
          if (seenNips.has(cleanNip)) continue;
          seenNips.add(cleanNip);
        }
        if (cleanEmail) {
          if (seenEmails.has(cleanEmail)) continue;
          seenEmails.add(cleanEmail);
        }
        deduplicatedList.push(t);
      }

      if (deduplicatedList.length > 0) {
        setTeachers(deduplicatedList);
        localStorage.setItem(storageKey, JSON.stringify(deduplicatedList));
        if (validSchId) {
          localStorage.setItem(`sasi_teachers_${validSchId}`, JSON.stringify(deduplicatedList));
        }
      }
    } catch (err) {
      console.warn('Load teachers error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, [schoolId, school.id, school.npsn]);

  // Helper pembaruan rombel kelas bertingkat
  const handleRombelChange = (grade: string, sec: string, custom?: string) => {
    setSelectedGradeLevel(grade);
    setSelectedSection(sec);
    if (sec === 'TUNGGAL') {
      setFormData(p => ({ ...p, homeroom_class: grade }));
    } else if (sec === 'CUSTOM') {
      const val = custom !== undefined ? custom : customRombelInput;
      setCustomRombelInput(val);
      setFormData(p => ({ ...p, homeroom_class: val }));
    } else {
      setFormData(p => ({ ...p, homeroom_class: `${grade}-${sec}` }));
    }
  };

  // Open Modal Tambah
  const handleOpenAddModal = () => {
    setEditingTeacher(null);
    setSelectedGradeLevel('Kelas 6');
    setSelectedSection('A');
    setCustomRombelInput('');
    setFormData({
      nip_nuptk: '',
      full_name: '',
      gender: 'L',
      teacher_type: 'guru_kelas',
      homeroom_class: 'Kelas 6-A',
      assigned_classes: ['6-A', '6-B'],
      subject_specialty: 'Semua Mapel SD (Kecuali PJOK & PAI)',
      employment_status: 'PNS',
      phone_number: '',
      email: '',
      password: 'guru123'
    });
    setIsModalOpen(true);
  };

  // Open Modal Edit
  const handleOpenEditModal = (t: TeacherRecord) => {
    setEditingTeacher(t);
    const rawRombel = t.homeroom_class || 'Kelas 6-A';
    
    // Parse Grade Level (1..6)
    let grade = 'Kelas 6';
    for (let i = 1; i <= 6; i++) {
      if (rawRombel.includes(String(i))) {
        grade = `Kelas ${i}`;
        break;
      }
    }

    // Parse Section (A..E, TUNGGAL, CUSTOM)
    let sec = 'A';
    if (rawRombel.includes('-A') || rawRombel.endsWith('A')) sec = 'A';
    else if (rawRombel.includes('-B') || rawRombel.endsWith('B')) sec = 'B';
    else if (rawRombel.includes('-C') || rawRombel.endsWith('C')) sec = 'C';
    else if (rawRombel.includes('-D') || rawRombel.endsWith('D')) sec = 'D';
    else if (!rawRombel.includes('-')) sec = 'TUNGGAL';
    else {
      sec = 'CUSTOM';
      setCustomRombelInput(rawRombel);
    }

    setSelectedGradeLevel(grade);
    setSelectedSection(sec);

    setFormData({
      ...t,
      assigned_classes: t.assigned_classes || ['6-A', '6-B']
    });
    setIsModalOpen(true);
  };

  // Auto Generate Email
  const handleGenerateEmail = () => {
    const nameClean = (formData.full_name || 'guru')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    const domain = school.level === 'SD' ? 'guru.sd.belajar.id' : 'guru.smp.belajar.id';
    const rand = Math.floor(10 + Math.random() * 89);
    setFormData(prev => ({ ...prev, email: `${nameClean}${rand}@${domain}` }));
  };

  // Handle Submit Form Add / Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email) {
      alert('Nama guru dan alamat email (username login) wajib diisi!');
      return;
    }

    const emailClean = formData.email.trim().toLowerCase();

    // Check duplicate email
    const exists = teachers.some(t => t.email.toLowerCase() === emailClean && (!editingTeacher || t.id !== editingTeacher.id));
    if (exists) {
      alert(`Alamat email "${emailClean}" sudah digunakan oleh guru lain di sekolah ini.`);
      return;
    }

    // Check duplicate NIP/NUPTK
    const nipClean = (formData.nip_nuptk || '').trim();
    if (nipClean && nipClean !== '-' && nipClean.length > 3) {
      const nipExists = teachers.some(t => 
        (t.nip_nuptk && t.nip_nuptk.trim() === nipClean) && 
        (!editingTeacher || t.id !== editingTeacher.id)
      );
      if (nipExists) {
        alert(`NIP/NUPTK "${nipClean}" sudah terdaftar untuk guru lain di sekolah ini.`);
        return;
      }
    }

    setIsSaving(true);
    let targetToSave: TeacherRecord;

    if (editingTeacher) {
      targetToSave = {
        ...editingTeacher,
        ...formData,
        full_name: formData.full_name.trim(),
        email: emailClean,
        password: formData.password || editingTeacher.password || 'guru123',
        subject_specialty: formData.teacher_type === 'guru_kelas'
          ? 'Semua Mapel SD (Kecuali PJOK & PAI)'
          : (formData.subject_specialty || 'PJOK')
      } as TeacherRecord;

      const updated = teachers.map(t => t.id === editingTeacher.id ? targetToSave : t);
      setTeachers(updated);
      syncToUsersCache(updated);
    } else {
      const newId = `usr-tch-${Date.now()}`;
      targetToSave = {
        id: newId,
        nip_nuptk: formData.nip_nuptk || '-',
        full_name: formData.full_name.trim(),
        gender: formData.gender || 'L',
        teacher_type: formData.teacher_type || 'guru_kelas',
        homeroom_class: formData.teacher_type === 'guru_kelas' ? (formData.homeroom_class || 'Kelas 6-A') : '-',
        assigned_classes: formData.assigned_classes || ['6-A', '6-B'],
        subject_specialty: formData.teacher_type === 'guru_kelas'
          ? 'Semua Mapel SD (Kecuali PJOK & PAI)'
          : (formData.subject_specialty || 'PJOK'),
        employment_status: formData.employment_status || 'PNS',
        phone_number: formData.phone_number || '-',
        email: emailClean,
        password: formData.password || 'guru123'
      };

      const updated = [targetToSave, ...teachers];
      setTeachers(updated);
      syncToUsersCache(updated);
    }

    // Direct Cloud Supabase Sync
    const isCloudSaved = await syncTeacherToSupabaseCloud(targetToSave);
    setIsSaving(false);
    setIsModalOpen(false);

    if (isCloudSaved) {
      showToast(`✅ Berhasil simpan data guru ${targetToSave.full_name} ke Database Cloud Supabase & sistem lokal!`);
    } else {
      showToast(`✅ Data guru ${targetToSave.full_name} berhasil disimpan ke sistem lokal & cache CBT.`);
    }
  };

  // Open Modal Reset Password
  const handleOpenResetModal = (t: TeacherRecord) => {
    setTargetResetTeacher(t);
    setResetPasswordType('default');
    setCustomPasswordInput('');
    setIsResetModalOpen(true);
  };

  // Execute Password Reset
  const handleExecuteResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetResetTeacher) return;

    const newPwd = resetPasswordType === 'default' ? 'guru123' : customPasswordInput.trim();
    if (!newPwd) {
      alert('Silakan masukkan kata sandi baru.');
      return;
    }

    let updatedTarget: TeacherRecord | null = null;
    const updated = teachers.map(t => {
      if (t.id === targetResetTeacher.id) {
        updatedTarget = { ...t, password: newPwd };
        return updatedTarget;
      }
      return t;
    });

    setTeachers(updated);
    syncToUsersCache(updated);
    if (updatedTarget) await syncTeacherToSupabaseCloud(updatedTarget);
    setIsResetModalOpen(false);
    showToast(`✅ Kata sandi akun ${targetResetTeacher.full_name} berhasil direset menjadi: "${newPwd}".`);
  };

  // Delete Teacher
  const handleDeleteTeacher = (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus guru ${name} beserta akun loginnya? Guru ini tidak akan bisa login lagi ke CBT.`)) {
      const targetTeacher = teachers.find(t => t.id === id);
      const updated = teachers.filter(t => t.id !== id);
      setTeachers(updated);
      syncToUsersCache(updated);
      if (targetTeacher) {
        deleteTeacherFromSupabaseCloud(id, targetTeacher.email, targetTeacher.full_name, targetTeacher.nip_nuptk);
      }
      showToast(`Akun guru ${name} berhasil dihapus dari Cloud & Lokal.`);
    }
  };

  // Filtered List
  const filteredTeachers = teachers.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.full_name.toLowerCase().includes(q);
      const matchEmail = t.email.toLowerCase().includes(q);
      const matchNip = t.nip_nuptk.toLowerCase().includes(q);
      const matchSubject = t.subject_specialty.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchNip && !matchSubject) return false;
    }

    if (roleFilter !== 'all' && t.teacher_type !== roleFilter) {
      return false;
    }

    if (statusFilter !== 'all' && t.employment_status !== statusFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-slide-left">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2.5 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100 shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900">Manajemen Akun Dewan Guru & Wali Kelas</h2>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 border border-brand-200">
                  Kewenangan Proktor
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Proktor dapat menambah akun guru, mengelola username email pribadi, mereset password, dan membagikan kartu login CBT untuk {school.name}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadTeachers}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-200 disabled:opacity-50"
            title="Sinkronkan data guru dari Cloud Database & Super Admin"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors border border-slate-200"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Cetak Kartu Login Guru</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-sm shadow-brand-500/30"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Guru & Akun</span>
          </button>
        </div>
      </div>

      {/* Rule Notice Banner for SD Curriculum */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start space-x-3 text-amber-900">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-extrabold text-amber-950">
            Ketentuan Penugasan Koreksi Asesmen Guru SD:
          </p>
          <p className="text-amber-800 leading-relaxed">
            • <strong>Guru Kelas / Wali Kelas (misal Kelas 6-A):</strong> Bertugas memeriksa seluruh mata pelajaran di rombelnya (Matematika, B. Indonesia, IPAS, PPKn, Seni), 
            <span className="text-amber-950 font-bold underline decoration-amber-400 decoration-2 ml-1">KECUALI mapel PJOK dan Pendidikan Agama</span>.
          </p>
          <p className="text-amber-800 leading-relaxed">
            • <strong>Guru Mapel Khusus (PJOK & Agama):</strong> Mengampu 1 mata pelajaran spesifik secara lintas kelas/rombel (misal mengoreksi PJOK dari Kelas 1 s.d. 6).
          </p>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 block">Total Dewan Guru</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{teachers.length}</span>
          <span className="text-[10px] text-slate-400">Guru Berakun Aktif</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-600 block">Guru Kelas / Wali Kelas</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {teachers.filter(t => t.teacher_type === 'guru_kelas').length}
          </span>
          <span className="text-[10px] text-emerald-600/70">Seluruh Mapel minus PJOK/PAI</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-600 block">Guru Mapel Khusus</span>
          <span className="text-2xl font-black text-blue-700 mt-1 block">
            {teachers.filter(t => t.teacher_type === 'guru_mapel').length}
          </span>
          <span className="text-[10px] text-blue-600/70">PJOK & Pendidikan Agama</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-purple-600 block">Status Kepegawaian</span>
          <span className="text-sm font-black text-purple-900 mt-2 block">
            {teachers.filter(t => t.employment_status === 'PNS' || t.employment_status === 'PPPK').length} ASN • {teachers.filter(t => t.employment_status !== 'PNS' && t.employment_status !== 'PPPK').length} Non-ASN
          </span>
          <span className="text-[10px] text-purple-500">PNS, PPPK & Honorer</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama guru, email login, NIP, atau mapel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="all">Semua Tipe Guru</option>
              <option value="guru_kelas">Guru Kelas / Wali</option>
              <option value="guru_mapel">Guru Mapel Khusus</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
            >
              <option value="all">Semua Status Kepegawaian</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="GTT/Honorer">GTT / Honorer</option>
              <option value="Guru Tetap Yayasan">Guru Tetap Yayasan</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 justify-between md:justify-end shrink-0">
          {(searchQuery.trim() !== '' || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setRoleFilter('all'); setStatusFilter('all'); }}
              className="text-xs px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center space-x-1 transition-all"
              title="Reset semua filter ke kondisi awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Reset Filter</span>
            </button>
          )}

          <span className="text-xs font-black text-brand-700 bg-brand-50 px-3 py-2 rounded-xl border border-brand-200 whitespace-nowrap">
            {filteredTeachers.length} Guru Ditampilkan
          </span>
        </div>
      </div>

      {/* Table Container: Grid Bersekat Tegas & High-Density */}
      <div className="bg-white rounded-2xl border-2 border-sky-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-sky-100 text-sky-950 font-black uppercase tracking-wider text-[11px] border-b-2 border-sky-300">
              <tr className="divide-x divide-sky-200">
                <th className="py-2.5 px-2 text-center w-12 bg-sky-200/80 text-sky-950 font-black">NO.</th>
                <th className="py-2.5 px-3 min-w-[200px]">DEWAN GURU & NIP</th>
                <th className="py-2.5 px-3 min-w-[220px]">KREDENSIAL LOGIN (EMAIL & PIN)</th>
                <th className="py-2.5 px-3 min-w-[200px]">TIPE & PENUGASAN MAPEL</th>
                <th className="py-2.5 px-2 text-center w-24">STATUS</th>
                <th className="py-2.5 px-3 text-center w-36">AKSI PROKTOR</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-medium text-xs">
                    <GraduationCap className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
                    <p className="font-semibold text-slate-600">Tidak ada data guru yang cocok dengan kriteria filter.</p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, index) => {
                  const isPwVisible = !!showPasswordMap[t.id];
                  const isGuruKelas = t.teacher_type === 'guru_kelas';

                  return (
                    <tr 
                      key={t.id} 
                      className="divide-x divide-slate-200 even:bg-slate-50/70 hover:bg-sky-50/80 transition-colors"
                    >
                      {/* 1. NOMOR URUT DINAMIS */}
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 bg-slate-50/50">
                        {index + 1}
                      </td>
                      
                      {/* 2. Name & NIP */}
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                            isGuruKelas ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {t.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 text-xs leading-tight flex items-center space-x-1.5 truncate max-w-[220px]" title={t.full_name}>
                              <span className="truncate">{t.full_name}</span>
                              <span className="text-[9px] font-semibold text-slate-500 px-1 py-0.2 bg-slate-100 rounded shrink-0">
                                {t.gender === 'L' ? 'L' : 'P'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-[220px]">
                              NIP: {t.nip_nuptk || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Credentials Login */}
                      <td className="py-2 px-3">
                        <div className="space-y-0.5">
                          {/* Email / Username */}
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono font-bold text-slate-800 text-[11px] truncate max-w-[170px]" title={t.email}>
                              {t.email}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(t.email, `email-${t.id}`)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded shrink-0"
                              title="Salin email"
                            >
                              {copiedKey === `email-${t.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {/* Password with eye toggle */}
                          <div className="flex items-center space-x-1">
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px] font-semibold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-100">
                              {isPwVisible ? t.password : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPasswordMap(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                              title={isPwVisible ? 'Sembunyikan password' : 'Lihat password'}
                            >
                              {isPwVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(t.password, `pw-${t.id}`)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded"
                              title="Salin password"
                            >
                              {copiedKey === `pw-${t.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 4. Role & Teaching Assignment */}
                      <td className="py-2 px-3">
                        {isGuruKelas ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <GraduationCap className="w-3 h-3" />
                              <span>Wali {t.homeroom_class || 'Kelas 6-A'}</span>
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Koreksi {t.homeroom_class || 'Kelas 6-A'} <span className="text-emerald-700 font-bold">(Non PJOK/PAI)</span>
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center space-x-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                              <BookOpen className="w-3 h-3" />
                              <span>{t.subject_specialty}</span>
                            </span>
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              Rombel: {t.assigned_classes?.join(', ') || 'Lintas Rombel (1-6)'}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* 5. Employment Status */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          t.employment_status === 'PNS' 
                            ? 'bg-purple-100 text-purple-800' 
                            : t.employment_status === 'PPPK'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.employment_status}
                        </span>
                      </td>

                      {/* 6. Actions */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenResetModal(t)}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold border border-amber-300 transition-colors"
                            title="Reset Kata Sandi Guru"
                          >
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            <span>Reset</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1 text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-slate-200"
                            title="Edit Data Guru"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(t.id, t.full_name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200"
                            title="Hapus Akun Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / EDIT GURU (FIXED HEADER & FOOTER, SMOOTH SCROLL) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            
            {/* 1. Modal Fixed Header (Always visible, never cut off) */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 shrink-0 bg-white">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 bg-brand-50 text-brand-600 rounded-xl border border-brand-100">
                  <GraduationCap className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    {editingTeacher ? 'Edit Data & Akun Guru' : 'Tambah Guru & Akun Login Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Data akun tersimpan langsung ke Cloud Supabase & sistem CBT sekolah.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2. Modal Scrollable Form Body */}
            <form id="teacher-manage-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
              
              {/* Section 1: Identitas Guru */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider block">
                  1. Identitas Guru
                </span>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Nama Lengkap beserta Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Dra. Hj. Nurjanah, M.Pd."
                    value={formData.full_name || ''}
                    onChange={(e) => setFormData(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-brand-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">NIP / NUPTK</label>
                    <input
                      type="text"
                      placeholder="18 digit NIP / 16 digit NUPTK"
                      value={formData.nip_nuptk || ''}
                      onChange={(e) => setFormData(p => ({ ...p, nip_nuptk: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Jenis Kelamin</label>
                    <select
                      value={formData.gender || 'L'}
                      onChange={(e) => setFormData(p => ({ ...p, gender: e.target.value as 'L' | 'P' }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Status Kepegawaian</label>
                    <select
                      value={formData.employment_status || 'PNS'}
                      onChange={(e) => setFormData(p => ({ ...p, employment_status: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                      <option value="PPPK">PPPK</option>
                      <option value="GTT/Honorer">GTT / Honorer</option>
                      <option value="Guru Tetap Yayasan">Guru Tetap Yayasan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      placeholder="08xxxxxxxxxx"
                      value={formData.phone_number || ''}
                      onChange={(e) => setFormData(p => ({ ...p, phone_number: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Kredensial Login Akun CBT */}
              <div className="space-y-3 p-3.5 bg-brand-50/60 rounded-xl border border-brand-200">
                <span className="font-extrabold text-brand-900 text-[11px] uppercase tracking-wider block">
                  2. Kredensial Akses Login Portal CBT
                </span>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">
                      Alamat Email (Username Login) *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateEmail}
                      className="text-[10px] text-brand-700 hover:text-brand-800 font-extrabold flex items-center space-x-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Buat Otomatis</span>
                    </button>
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Contoh: nurjanah78@guru.sd.belajar.id atau budi@gmail.com"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Guru dapat menggunakan email pribadi (@gmail.com) maupun akun @guru.sd.belajar.id masing-masing.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Kata Sandi Awal (Password) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Default: guru123"
                    value={formData.password || ''}
                    onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-brand-300 rounded-xl font-mono font-bold text-brand-800 focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Section 3: Tipe Penugasan Guru & Dropdown Rombel */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider block">
                  3. Tipe Penugasan & Rombel Kelas Binaan
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.teacher_type === 'guru_kelas'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="teacher_type"
                        checked={formData.teacher_type === 'guru_kelas'}
                        onChange={() => setFormData(p => ({
                          ...p,
                          teacher_type: 'guru_kelas',
                          subject_specialty: 'Semua Mapel SD (Kecuali PJOK & PAI)'
                        }))}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-extrabold text-slate-900">Guru Kelas / Wali Kelas</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 ml-5">
                      Mengoreksi seluruh mapel rombel binaan, <strong>kecuali PJOK & Agama</strong>.
                    </p>
                  </label>

                  <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    formData.teacher_type === 'guru_mapel'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="teacher_type"
                        checked={formData.teacher_type === 'guru_mapel'}
                        onChange={() => setFormData(p => ({
                          ...p,
                          teacher_type: 'guru_mapel',
                          subject_specialty: DEFAULT_MAPEL_KHUSUS[0]
                        }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-extrabold text-slate-900">Guru Mapel Khusus</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 ml-5">
                      Mengampu 1 mapel spesifik secara lintas rombel (PJOK / PAI).
                    </p>
                  </label>
                </div>

                {/* Sub-form Rombel: Menggunakan Dropdown Bertingkat Ringkas */}
                {formData.teacher_type === 'guru_kelas' ? (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Tingkat Jenjang Kelas *
                        </label>
                        <select
                          value={selectedGradeLevel}
                          onChange={(e) => handleRombelChange(e.target.value, selectedSection)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="Kelas 1">Kelas 1 (Fase A)</option>
                          <option value="Kelas 2">Kelas 2 (Fase A)</option>
                          <option value="Kelas 3">Kelas 3 (Fase B)</option>
                          <option value="Kelas 4">Kelas 4 (Fase B)</option>
                          <option value="Kelas 5">Kelas 5 (Fase C)</option>
                          <option value="Kelas 6">Kelas 6 (Fase C)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Rombel Paralel *
                        </label>
                        <select
                          value={selectedSection}
                          onChange={(e) => handleRombelChange(selectedGradeLevel, e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="A">Rombel A</option>
                          <option value="B">Rombel B</option>
                          <option value="C">Rombel C</option>
                          <option value="D">Rombel D</option>
                          <option value="E">Rombel E</option>
                          <option value="TUNGGAL">Tanpa Paralel (Kelas Tunggal)</option>
                          <option value="CUSTOM">Lainnya (Ketik Manual)</option>
                        </select>
                      </div>
                    </div>

                    {/* Preview atau Custom Input Rombel */}
                    {selectedSection === 'CUSTOM' ? (
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">
                          Ketik Nama Rombel Khusus *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Kelas 6-Ibnu Sina atau 6-D"
                          value={customRombelInput}
                          onChange={(e) => handleRombelChange(selectedGradeLevel, 'CUSTOM', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-xl font-bold text-slate-900"
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <span className="text-[11px] text-emerald-800 font-semibold">
                          Penetapan Rombel Binaan:
                        </span>
                        <span className="font-extrabold text-xs text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                          {formData.homeroom_class || `${selectedGradeLevel}-${selectedSection}`}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Pilih Mata Pelajaran yang Diampu *
                      </label>
                      <select
                        value={formData.subject_specialty || DEFAULT_MAPEL_KHUSUS[0]}
                        onChange={(e) => setFormData(p => ({ ...p, subject_specialty: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                      >
                        {DEFAULT_MAPEL_KHUSUS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-slate-700 font-bold">
                          Rombel yang Diajar (CBT akan menampilkan nilai rombel-rombel ini):
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const allRombels = [
                              '1-A', '1-B', '2-A', '2-B', '3-A', '3-B',
                              '4-A', '4-B', '5-A', '5-B', '6-A', '6-B', '6-C'
                            ];
                            const cur = formData.assigned_classes || [];
                            if (cur.length === allRombels.length) {
                              setFormData(p => ({ ...p, assigned_classes: [] }));
                            } else {
                              setFormData(p => ({ ...p, assigned_classes: allRombels }));
                            }
                          }}
                          className="text-[10px] text-blue-700 font-bold hover:underline"
                        >
                          {formData.assigned_classes?.length === 13 ? 'Batal Pilih Semua' : 'Pilih Semua Rombel (1-6)'}
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          '1-A', '1-B',
                          '2-A', '2-B',
                          '3-A', '3-B',
                          '4-A', '4-B',
                          '5-A', '5-B',
                          '6-A', '6-B', '6-C'
                        ].map((k) => {
                          const isChecked = formData.assigned_classes?.includes(k);
                          return (
                            <label key={k} className={`flex items-center space-x-1.5 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked ? 'bg-blue-50 border-blue-400 font-bold text-blue-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const cur = formData.assigned_classes || [];
                                  if (e.target.checked) {
                                    setFormData(p => ({ ...p, assigned_classes: [...cur, k] }));
                                  } else {
                                    setFormData(p => ({ ...p, assigned_classes: cur.filter(c => c !== k) }));
                                  }
                                }}
                                className="rounded text-blue-600"
                              />
                              <span>Kelas {k}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </form>

            {/* 3. Modal Fixed Footer (Always visible at bottom) */}
            <div className="p-4 border-t border-slate-200 shrink-0 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                * Pastikan email & password aktif untuk login guru
              </span>
              <div className="flex items-center space-x-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  form="teacher-manage-form"
                  disabled={isSaving}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSaving && <RotateCcw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Menyimpan ke Database...' : (editingTeacher ? 'Simpan Perubahan' : 'Buat Akun Guru')}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RESET PASSWORD GURU */}
      {/* ========================================================================= */}
      {isResetModalOpen && targetResetTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-up">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Reset Kata Sandi Akun Guru
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Setel ulang password login untuk guru yang bersangkutan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteResetPassword} className="mt-4 space-y-4 text-xs">
              
              {/* Info Guru */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-extrabold text-slate-900 text-sm">
                  {targetResetTeacher.full_name}
                </div>
                <div className="text-slate-600 flex items-center space-x-1 font-mono text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{targetResetTeacher.email}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Peran: {targetResetTeacher.teacher_type === 'guru_kelas' ? `Guru Kelas & Wali ${targetResetTeacher.homeroom_class}` : targetResetTeacher.subject_specialty}
                </div>
              </div>

              {/* Pilihan Metode Reset */}
              <div className="space-y-2">
                <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                  resetPasswordType === 'default'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="reset_type"
                    checked={resetPasswordType === 'default'}
                    onChange={() => setResetPasswordType('default')}
                    className="text-amber-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Reset ke Kata Sandi Standar</span>
                    <span className="text-[11px] font-mono font-bold text-amber-700">guru123</span>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                  resetPasswordType === 'custom'
                    ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="reset_type"
                    checked={resetPasswordType === 'custom'}
                    onChange={() => setResetPasswordType('custom')}
                    className="text-amber-600"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">Buat Kata Sandi Baru Khusus</span>
                    <span className="text-[11px] text-slate-500">Ketik kata sandi manual sesuai permintaan guru</span>
                  </div>
                </label>
              </div>

              {resetPasswordType === 'custom' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Masukkan Kata Sandi Baru *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Minimal 4 karakter"
                    value={customPasswordInput}
                    onChange={(e) => setCustomPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl shadow-md"
                >
                  Konfirmasi Reset Sandi
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CETAK KARTU LOGIN DEWAN GURU */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print:static print:inset-auto print:p-0 print:bg-white print:overflow-visible">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-8 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:rounded-none">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                  <Printer className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Lembar Kartu Akses Login CBT Dewan Guru
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cetak dan gunting kartu untuk dibagikan kepada guru pengampu / wali kelas.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen (Print / PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Header Resmi saat Cetak Kertas */}
            <div className="hidden print:block text-center space-y-1 mb-4 text-black">
              <h4 className="text-[11px] font-bold uppercase tracking-wider">
                PEMERINTAH KABUPATEN/KOTA {school.regency_city?.toUpperCase() || 'SUMEDANG'}
              </h4>
              <h4 className="text-[11px] font-bold uppercase tracking-wider">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </h4>
              <h2 className="text-lg font-black uppercase">
                {school.name}
              </h2>
              <div className="kop-border-thick" />
              <div className="kop-border-thin" />
              <h3 className="text-xs font-black uppercase tracking-wider pt-1">
                LEMBAR KARTU AKSES LOGIN CBT DEWAN GURU & WALI KELAS
              </h3>
            </div>

            {/* Printable Cards Grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans print:grid-cols-2 print:gap-4 print:w-full">
              {teachers.map((t) => (
                <div 
                  key={t.id} 
                  className="p-4 rounded-xl border-2 border-dashed border-slate-300 bg-white relative space-y-3 print:border-[1.5px] print:border-solid print:border-black print:rounded-none print-avoid-break"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <span className="font-extrabold text-[12px] text-slate-900 block">
                        KARTU LOGIN CBT PENDIDIK
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {school.name}
                      </span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-brand-100 text-brand-800">
                      SASI 2026
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Nama Guru & NIP:</span>
                      <span className="font-extrabold text-slate-900 text-xs block">{t.full_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">NIP: {t.nip_nuptk || '-'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-[9px] text-slate-500 block font-bold">Email / Username:</span>
                        <span className="font-mono font-black text-slate-900 text-[11px] break-all block">
                          {t.email}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-[9px] text-slate-500 block font-bold">Password Login:</span>
                        <span className="font-mono font-black text-brand-700 text-xs block">
                          {t.password}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-600 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                      <strong>Kewenangan:</strong> {t.teacher_type === 'guru_kelas' 
                        ? `Wali ${t.homeroom_class} (Semua Mapel Kecuali PJOK & Agama)` 
                        : `Guru Mapel: ${t.subject_specialty} (${t.assigned_classes?.join(', ') || 'Lintas Rombel'})`}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span>Portal: sistem-asesmen-sekolah-indonesia.vercel.app</span>
                    <span className="font-bold text-slate-600">Tab Petugas</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

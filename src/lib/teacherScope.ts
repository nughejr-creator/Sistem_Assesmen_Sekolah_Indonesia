import { UserProfile, ExamSession } from '../types/database';

/**
 * Normalisasi nama rombel / kelas:
 * Contoh: "Kelas 6-A" -> "6-A", "6A" -> "6-A", "6-A" -> "6-A", "Kelas 6" -> "6"
 */
export const normalizeRombel = (val: string | null | undefined): string => {
  if (!val) return '';
  let str = val.trim().toUpperCase();
  // Buang kata "KELAS", "ROMBEL", dsb.
  str = str.replace(/KELAS/gi, '').replace(/ROMBEL/gi, '').trim();
  // Jika formatnya angka diikuti huruf langsung (misal "6A"), jadikan "6-A"
  const matchAlphaNum = str.match(/^([0-9]+)\s*[-_]?\s*([A-Z0-9]+)$/i);
  if (matchAlphaNum) {
    return `${matchAlphaNum[1]}-${matchAlphaNum[2]}`.toUpperCase();
  }
  return str.replace(/\s+/g, '-').toUpperCase();
};

/**
 * Memeriksa apakah rombel siswa cocok dengan rombel penugasan guru.
 * Mendukung pembagian rombel paralel di sekolah besar (misal: 6-A, 6-B, 6-C).
 */
export const isPjokTeacher = (subject?: string | null): boolean => {
  if (!subject) return false;
  const s = subject.toLowerCase();
  if (s.includes('kecuali') || s.includes('semua mapel')) return false;
  return s.includes('pjok') || s.includes('jasmani') || s.includes('olahraga');
};

export const isAgamaTeacher = (subject?: string | null): boolean => {
  if (!subject) return false;
  const s = subject.toLowerCase();
  if (s.includes('kecuali') || s.includes('semua mapel')) return false;
  return s.includes('agama') || s.includes('pai') || s.includes('islam') || s.includes('kristen') || s.includes('katolik');
};

export const checkIsGuruKelas = (teacher: UserProfile): boolean => {
  if (teacher.teacher_type === 'guru_kelas') return true;
  if (teacher.teacher_type === 'guru_mapel') return false;
  return !isPjokTeacher(teacher.assigned_subject_name) && !isAgamaTeacher(teacher.assigned_subject_name);
};

export const isStudentInTeacherRombel = (studentRombel: string | null | undefined, teacher: UserProfile): boolean => {
  if (!studentRombel) return false;

  const normStudent = normalizeRombel(studentRombel);
  const isGuruKelas = checkIsGuruKelas(teacher);

  // 1. Guru Kelas / Wali Kelas: Wajib mencocokkan rombel paralel secara presisi (contoh: 2-B vs 6-A)
  if (isGuruKelas) {
    const normTeacher = normalizeRombel(teacher.grade_class);
    if (!normTeacher) return false;

    // Jika guru kelas diset spesifik paralel (misal "2-B")
    if (normTeacher.includes('-')) {
      return normStudent === normTeacher;
    } else {
      // Jika guru diset umum tingkat kelas (misal "2"), cocokkan semua siswa berawalan kelas 2 (2-A, 2-B)
      const studentGradeNum = normStudent.split('-')[0] || normStudent.replace(/[^0-9]/g, '');
      const teacherGradeNum = normTeacher.replace(/[^0-9]/g, '');
      return studentGradeNum === teacherGradeNum;
    }
  }

  // 2. Guru Mapel Khusus (PJOK / Agama): Periksa apakah rombel siswa ada di dalam daftar assigned_classes
  if (teacher.assigned_classes && teacher.assigned_classes.length > 0) {
    return teacher.assigned_classes.some(ac => {
      const normAc = normalizeRombel(ac);
      if (normAc === normStudent) return true;
      const acGradeNum = normAc.split('-')[0] || normAc.replace(/[^0-9]/g, '');
      const studentGradeNum = normStudent.split('-')[0] || normStudent.replace(/[^0-9]/g, '');
      if (!normAc.includes('-') && acGradeNum && studentGradeNum === acGradeNum) return true;
      return false;
    });
  }

  return true;
};

/**
 * Memeriksa apakah suatu mata pelajaran asesmen berhak diakses / dikoreksi oleh guru yang sedang login.
 * 
 * Aturan Kurikulum Sekolah Indonesia (SD):
 * 1. Guru Kelas / Wali Kelas:
 *    Mengoreksi SEMUA mata pelajaran di kelasnya (Matematika, B. Indonesia, IPAS, PPKn, Seni),
 *    KECUALI: PJOK dan Pendidikan Agama (PAI/PAK/dll).
 * 
 * 2. Guru Mapel Khusus:
 *    Hanya mengoreksi 1 mapel spesifik yang diampunya (PJOK atau Agama), tetapi lintas kelas.
 */
export const isSubjectPermittedForTeacher = (subjectName: string, teacher: UserProfile): boolean => {
  const sLower = (subjectName || '').toLowerCase();
  const isPjok = sLower.includes('pjok') || sLower.includes('jasmani') || sLower.includes('olahraga');
  const isAgama = sLower.includes('agama') || sLower.includes('pai') || sLower.includes('islam') || sLower.includes('kristen') || sLower.includes('katolik') || sLower.includes('hindu') || sLower.includes('buddha');

  const isGuruKelas = checkIsGuruKelas(teacher);

  // 1. Tipe Guru Kelas / Wali Kelas
  if (isGuruKelas) {
    // Larang akses ke PJOK dan Agama
    if (isPjok || isAgama) return false;
    return true;
  }

  // 2. Tipe Guru Mapel Khusus
  if (isPjokTeacher(teacher.assigned_subject_name)) return isPjok;
  if (isAgamaTeacher(teacher.assigned_subject_name)) return isAgama;

  return sLower.includes((teacher.assigned_subject_name || '').toLowerCase());
};

/**
 * Memeriksa apakah suatu sesi asesmen berada dalam cakupan jenjang & rombel guru.
 */
export const isSessionInTeacherScope = (session: ExamSession, teacher: UserProfile): boolean => {
  const pkg = session.package;
  const subj = pkg?.subject?.name || session.session_name || '';

  // 1. Validasi Izin Mata Pelajaran (Guru Kelas tidak boleh PJOK/Agama; Guru Mapel hanya mapelnya)
  if (!isSubjectPermittedForTeacher(subj, teacher)) {
    return false;
  }

  const isGuruKelas = checkIsGuruKelas(teacher);

  const textToScan = `${session.session_name || ''} ${session.class_room || ''} ${pkg?.title || ''}`.toUpperCase();

  // 2. Jika Guru Kelas / Wali Kelas: Wajib mencocokkan tingkatan kelas & rombel secara presisi
  if (isGuruKelas && teacher.grade_class) {
    const normTeacher = normalizeRombel(teacher.grade_class); // contoh: "2-B" atau "2"
    const teacherGradeNum = normTeacher.replace(/[^0-9]/g, ''); // contoh: "2"

    // Cek apakah teks sesi secara eksplisit mencantumkan tingkat kelas lain (1 s/d 6)
    const sdGrades = ['1', '2', '3', '4', '5', '6'];
    for (const g of sdGrades) {
      if (g !== teacherGradeNum) {
        // Jika sesi menyebut "KELAS 6", "KELAS-6", atau rombel kelas lain seperti "6-A", "6A"
        const mentionsOtherGrade = 
          textToScan.includes(`KELAS ${g}`) ||
          textToScan.includes(`KELAS-${g}`) ||
          textToScan.includes(`TINGKAT ${g}`) ||
          textToScan.includes(` ${g}-A`) ||
          textToScan.includes(` ${g}-B`) ||
          textToScan.includes(` ${g}-C`) ||
          textToScan.includes(` ${g}A`) ||
          textToScan.includes(` ${g}B`);

        if (mentionsOtherGrade) {
          // Jika teks menyebut kelas lain tanpa menyebut kelas guru ini, tolak!
          const mentionsMyGrade = 
            textToScan.includes(`KELAS ${teacherGradeNum}`) ||
            textToScan.includes(`KELAS-${teacherGradeNum}`) ||
            textToScan.includes(`TINGKAT ${teacherGradeNum}`) ||
            textToScan.includes(` ${teacherGradeNum}-A`) ||
            textToScan.includes(` ${teacherGradeNum}-B`) ||
            textToScan.includes(` ${teacherGradeNum}-C`);

          if (!mentionsMyGrade) return false;
        }
      }
    }

    // Jika guru punya rombel spesifik paralel (misal "2-B") dan sesi punya class_room spesifik
    if (session.class_room) {
      const normRoom = normalizeRombel(session.class_room);
      if (normRoom && normTeacher.includes('-') && normRoom !== normTeacher) {
        return false;
      }
    }

    // Jika sesi mencantumkan kata "KELAS", pastikan sesuai dengan kelas guru
    const hasMyGradeMention = 
      textToScan.includes(`KELAS ${teacherGradeNum}`) ||
      textToScan.includes(`KELAS-${teacherGradeNum}`) ||
      textToScan.includes(`TINGKAT ${teacherGradeNum}`) ||
      textToScan.includes(` ${teacherGradeNum}-`) ||
      (textToScan.includes(`FASE A`) && (teacherGradeNum === '1' || teacherGradeNum === '2')) ||
      (textToScan.includes(`FASE B`) && (teacherGradeNum === '3' || teacherGradeNum === '4')) ||
      (textToScan.includes(`FASE C`) && (teacherGradeNum === '5' || teacherGradeNum === '6'));

    if (!hasMyGradeMention && (textToScan.includes('KELAS ') || textToScan.includes('KELAS-'))) {
      return false;
    }
  }

  // 3. Jika Guru Mapel (PJOK / Agama): Periksa rombel yang diampu
  if (!isGuruKelas && teacher.assigned_classes && teacher.assigned_classes.length > 0) {
    const hasMatchingClass = teacher.assigned_classes.some(ac => {
      const normAc = normalizeRombel(ac);
      const gradeNum = normAc.replace(/[^0-9]/g, '');
      return textToScan.includes(`KELAS ${gradeNum}`) || textToScan.includes(`KELAS-${gradeNum}`) || (normAc && textToScan.includes(normAc));
    });
    if (!hasMatchingClass && (textToScan.includes('KELAS ') || textToScan.includes('KELAS-'))) {
      return false;
    }
  }

  return true;
};

/**
 * Menyaring sesi ujian yang boleh ditampilkan untuk guru.
 */
export const filterSessionsForTeacher = (sessions: ExamSession[], teacher: UserProfile): ExamSession[] => {
  return sessions.filter(s => isSessionInTeacherScope(s, teacher));
};

/**
 * Menyaring daftar siswa sesuai rombel/kelas binaan guru secara presisi paralel (6-A vs 6-B).
 */
export const filterStudentsForTeacher = (students: UserProfile[], teacher: UserProfile): UserProfile[] => {
  return students.filter(st => isStudentInTeacherRombel(st.grade_class, teacher));
};

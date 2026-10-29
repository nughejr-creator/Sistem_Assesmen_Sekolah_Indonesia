export type SchoolLevel = 'SD' | 'SMP';
export type UserRole = 'super_admin' | 'assistant_admin' | 'proctor' | 'teacher' | 'student';
export type Phase = 'A' | 'B' | 'C' | 'D';
export type AssessmentType = 'Formatif' | 'PTS' | 'SAS' | 'SAT' | 'SAJ';
export type TaskType = 'TULIS' | 'RIVIU';
export type WorkflowStatus = 'Dalam Penulisan' | 'Draft' | 'Menunggu Riviu' | 'Selesai';

export type QuestionType = 
  | 'Pilihan Ganda'
  | 'Pilihan Ganda Kompleks'
  | 'Menjodohkan'
  | 'Benar/Salah'
  | 'Isian Singkat'
  | 'Uraian';

export type CognitiveLevel = 
  | 'Pengetahuan dan Pemahaman (L1)'
  | 'Aplikasi (L2)'
  | 'Penalaran (L3)';

export type AttemptStatus = 'working' | 'completed' | 'locked';

// Tabel 1: schools
export interface School {
  id: string;
  npsn: string;
  name: string;
  level: SchoolLevel;
  district: string;
  created_at?: string;
  updated_at?: string;
}

// Tabel 2: user_profiles
export interface UserProfile {
  id: string;
  username: string; // e.g. NISN or email
  full_name: string;
  role: UserRole;
  school_id?: string | null;
  school?: School;
  institution?: string | null; // Asal instansi/lembaga untuk Pengawas Sekolah / Asisten Admin / Super Admin
  assigned_level?: SchoolLevel | null;
  grade_class?: string | null;
  phase?: Phase | null;
  assigned_subject_name?: string | null;
  teacher_type?: 'guru_kelas' | 'guru_mapel' | 'penulis_soal'; // Tipe guru: Guru Kelas (SD), Guru Mapel Khusus, atau Penulis Naskah Murni
  assigned_classes?: string[]; // Daftar kelas yang diajar (khusus guru mapel lintas kelas)
  nip?: string | null;
  exam_card_password?: string | null; // PIN printed for students
  password?: string | null; // Kata sandi untuk login petugas & pengguna
  photo_url?: string | null; // Foto profil pengguna
  is_logged_in?: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Tabel 3: subjects
export interface Subject {
  id: string;
  code: string;
  name: string;
  level: SchoolLevel;
  phase?: Phase;
  created_at?: string;
}

// Tabel 4: context_presets
export interface ContextPreset {
  id: string;
  subject_name: string;
  context_text: string;
  created_at?: string;
}

// Tabel 5: blueprints
export interface Blueprint {
  id: string;
  title: string;
  subject_id: string;
  subject?: Subject;
  level: SchoolLevel;
  phase: Phase;
  assessment_type: AssessmentType;
  total_questions: number;
  is_archived?: boolean;
  archived_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Tabel 6: blueprint_items
export interface BlueprintItem {
  id: string;
  blueprint_id: string;
  question_number: number;
  element: string;
  sub_element: string;
  competency: string;
  question_category: 'Single' | 'Grup Wacana';
  cognitive_level: CognitiveLevel;
  context: string;
  indicator: string;
  question_type: QuestionType;
  writer_id?: string | null;
  writer_name?: string;
  reviewer_id?: string | null;
  reviewer_name?: string;
  task_type: TaskType;
  workflow_status: WorkflowStatus;
  subject_name?: string;
  grade_class?: string;
  assessment_type?: AssessmentType | string;
  level?: SchoolLevel | string;
  phase?: Phase | string;
  created_at?: string;
  updated_at?: string;
}

// Tabel 7: question_bank
export interface QuestionBankItem {
  id: string;
  blueprint_item_id?: string | null;
  blueprint_item?: BlueprintItem;
  subject_id: string;
  subject?: Subject;
  subject_name?: string;
  grade_class?: string;
  assessment_type?: AssessmentType | string;
  level: SchoolLevel;
  phase: Phase;
  stimulus_text?: string | null;
  stimulus_media_url?: string | null;
  stimulus_media_align?: 'left' | 'center' | 'right' | 'float-left' | 'float-right';
  stimulus_media_width?: string;
  stimulus_media_caption?: string;
  stimulus_media_position?: 'above' | 'below';
  question_text: string;
  question_type: QuestionType;
  weight: number;
  status: WorkflowStatus;
  options?: QuestionOption[];
  explanation?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Tabel 8: question_options
export interface QuestionOption {
  id: string;
  question_id: string;
  option_label: string;
  option_text: string;
  option_media_url?: string | null;
  matching_pair_text?: string | null; // For Menjodohkan
  is_correct: boolean;
  distractor_note?: string | null;
  created_at?: string;
}

// Tabel 9: exam_packages
export interface ExamPackage {
  id: string;
  blueprint_id?: string | null;
  subject_id: string;
  subject?: Subject;
  title: string;
  assessment_type: AssessmentType;
  level: SchoolLevel;
  phase: Phase;
  duration_minutes: number;
  randomize_questions: boolean;
  randomize_options: boolean;
  is_archived?: boolean;
  archived_at?: string;
  created_at?: string;
  updated_at?: string;
}

// Tabel 10: exam_package_questions
export interface ExamPackageQuestion {
  id: string;
  package_id: string;
  question_id: string;
  order_number: number;
  question?: QuestionBankItem;
}

// Tabel 11: exam_sessions
export interface ExamSession {
  id: string;
  package_id: string;
  package?: ExamPackage;
  school_id: string;
  school?: School;
  proctor_id?: string;
  session_name: string;
  token_code: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  is_archived?: boolean;
  created_at?: string;
}

// Tabel 12: student_attempts
export interface StudentAttempt {
  id: string;
  session_id: string;
  session?: ExamSession;
  student_id: string;
  student?: UserProfile;
  school_id: string;
  answered_count: number;
  total_questions: number;
  status: AttemptStatus;
  final_score?: number | null;
  started_at: string;
  submitted_at?: string | null;
}

// Tabel 13: student_answers
export interface StudentAnswer {
  id?: string;
  attempt_id?: string;
  question_id: string;
  selected_option_ids?: string[];
  answer_text?: string;
  is_doubtful?: boolean;
  score_obtained?: number;
  updated_at?: string;
}

// Tabel 14: question_writer_assignments (Penugasan Khusus Penulis Soal)
export interface QuestionWriterAssignment {
  id: string;
  user_id: string;
  user_name: string;
  user_email?: string;
  user_institution?: string; // Instansi/sekolah (SDN Cinanggerang I, BGP, Universitas, Mahasiswa PPG, dsb.)
  user_type?: 'guru_internal' | 'guru_lintas_sekolah' | 'mitra_eksternal';
  subject_id?: string;
  subject_name: string; // Misal: Bahasa Indonesia, Matematika
  grade_class: string; // Misal: Kelas 1, Kelas 4, Kelas 6
  phase: Phase; // A, B, C, D
  level: SchoolLevel; // SD, SMP
  assessment_types: AssessmentType[]; // ['SAS', 'PTS', 'SAT', 'Formatif', 'SAJ']
  target_questions?: number; // Target butir soal, default 30
  status: 'Draft' | 'Dalam Penulisan' | 'Proses Penulisan' | 'Menunggu Riviu' | 'Menunggu Verifikasi' | 'Perlu Revisi' | 'Selesai' | 'Terverifikasi' | 'Diarsipkan' | 'needs_revision' | 'approved' | 'pending_review' | 'in_progress';
  revision_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  is_archived?: boolean;
  archived_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Re-export Public Educational Portal & E-E-A-T Types
export * from './publicPortal';

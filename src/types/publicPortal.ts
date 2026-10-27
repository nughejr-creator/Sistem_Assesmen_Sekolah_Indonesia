export type ArticleCategory = 
  | 'Panduan Asesmen' 
  | 'Bedah AKM' 
  | 'Analisis Butir' 
  | 'Rubrik & Penskoran' 
  | 'Wawasan Kurikulum' 
  | 'Berita & Pengumuman';

export interface PublicArticle {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  category: ArticleCategory | string;
  author_name: string;
  author_id?: string | null;
  featured_image?: string | null;
  read_time: number;
  views_count: number;
  is_published: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export type ResourceCategory = 
  | 'Modul Ajar' 
  | 'LKPD' 
  | 'Kisi-Kisi & Kartu Soal' 
  | 'Administrasi Guru' 
  | 'Media Belajar';

export type ResourceFileType = 'PDF' | 'DOCX' | 'XLSX' | 'ZIP' | 'PNG';

export interface TeachingResource {
  id: string;
  title: string;
  description?: string | null;
  category: ResourceCategory | string;
  phase?: string | null; // e.g. 'Fase A', 'Fase B', 'Fase C', 'Umum'
  grade_level?: string | null; // e.g. 'Kelas 1', 'Kelas 2', ..., 'Semua Kelas'
  subject?: string | null;
  file_type: ResourceFileType | string;
  file_url: string;
  file_size?: string | null;
  download_count: number;
  is_active: boolean;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ContributionStatus = 'draft' | 'pending_review' | 'published' | 'rejected';
export type ContributionContentType = 
  | 'Modul Ajar' 
  | 'LKPD' 
  | 'Artikel Edukasi' 
  | 'Soal & Rubrik' 
  | 'Praktik Baik';

export interface TeacherContribution {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_school?: string | null;
  title: string;
  content_type: ContributionContentType | string;
  summary?: string | null;
  body: string;
  attachment_url?: string | null;
  status: ContributionStatus;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeveloperProfile {
  id: string;
  full_name: string;
  title: string;
  role_description?: string | null;
  bio?: string | null;
  credentials: string[];
  expertise: string[];
  email?: string | null;
  phone?: string | null;
  social_links?: Record<string, string>;
  avatar_url?: string | null;
  is_primary: boolean;
  updated_at?: string;
}

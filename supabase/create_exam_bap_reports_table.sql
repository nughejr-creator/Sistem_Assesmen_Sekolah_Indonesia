-- ==============================================================================
-- SISTEM ASESMEN SEKOLAH INDONESIA (SASI)
-- Migrasi Database: Tabel Berita Acara Pelaksanaan Ujian (BAP)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.exam_bap_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  exam_day VARCHAR(50) NOT NULL DEFAULT 'Senin',
  exam_date VARCHAR(100) NOT NULL,
  room_name VARCHAR(100) NOT NULL DEFAULT 'Ruang 01',
  time_start VARCHAR(20) NOT NULL DEFAULT '07:30',
  time_end VARCHAR(20) NOT NULL DEFAULT '09:00',
  subject_name TEXT,
  total_registered INT NOT NULL DEFAULT 0,
  total_present INT NOT NULL DEFAULT 0,
  total_absent INT NOT NULL DEFAULT 0,
  absent_names TEXT,
  incident_notes TEXT,
  supervisor_name VARCHAR(255),
  supervisor_nip VARCHAR(100),
  proctor_name VARCHAR(255),
  proctor_nip VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_school_session_bap UNIQUE (school_id, session_id)
);

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_bap_school_session ON public.exam_bap_reports(school_id, session_id);

-- RLS (Row Level Security)
ALTER TABLE public.exam_bap_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to exam_bap_reports"
ON public.exam_bap_reports FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert/update to exam_bap_reports"
ON public.exam_bap_reports FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

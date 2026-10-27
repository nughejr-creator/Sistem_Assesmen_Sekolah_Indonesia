-- ==============================================================================
-- MIGRASI DATABASE: PEMBARUAN PORTAL PUBLIK & WIDGET PANEL SAMPING
-- Tabel: public_articles (alter), quick_links (create), portal_widget_settings (create)
-- ==============================================================================

-- 1. PEMBARUAN TABEL public_articles
-- Menambahkan kolom is_pinned, pin_expires_at, is_featured, dan view_count
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'public_articles' AND column_name = 'is_pinned') THEN
    ALTER TABLE public.public_articles ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'public_articles' AND column_name = 'pin_expires_at') THEN
    ALTER TABLE public.public_articles ADD COLUMN pin_expires_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'public_articles' AND column_name = 'is_featured') THEN
    ALTER TABLE public.public_articles ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'public_articles' AND column_name = 'view_count') THEN
    ALTER TABLE public.public_articles ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Sinkronisasi views_count dengan view_count jika sebelumnya views_count sudah ada
UPDATE public.public_articles 
SET view_count = COALESCE(views_count, 0)
WHERE view_count = 0 AND views_count > 0;

-- Indeks untuk query performa tinggi agregat sidebar
CREATE INDEX IF NOT EXISTS idx_public_articles_pinned ON public.public_articles (is_pinned, pin_expires_at);
CREATE INDEX IF NOT EXISTS idx_public_articles_featured ON public.public_articles (is_featured, view_count DESC);
CREATE INDEX IF NOT EXISTS idx_public_articles_views ON public.public_articles (view_count DESC);

-- 2. TABEL BARU: quick_links (Tautan Cepat Layanan Sidebar)
CREATE TABLE IF NOT EXISTS public.quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_name TEXT NOT NULL DEFAULT 'ExternalLink',
  target_blank BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quick_links_active ON public.quick_links (is_active, sort_order ASC);

-- RLS untuk quick_links
ALTER TABLE public.quick_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quick_links_public_read" ON public.quick_links
  FOR SELECT USING (is_active = true);

CREATE POLICY "quick_links_admin_manage" ON public.quick_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('superadmin', 'admin')
    )
  );

-- 3. TABEL BARU: portal_widget_settings (Pengaturan Visibilitas Widget Panel Samping)
CREATE TABLE IF NOT EXISTS public.portal_widget_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  show_search BOOLEAN NOT NULL DEFAULT true,
  show_pinned BOOLEAN NOT NULL DEFAULT true,
  show_popular_tabs BOOLEAN NOT NULL DEFAULT true,
  show_categories BOOLEAN NOT NULL DEFAULT true,
  show_quick_links BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.portal_widget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_widget_settings_public_read" ON public.portal_widget_settings
  FOR SELECT USING (true);

CREATE POLICY "portal_widget_settings_admin_manage" ON public.portal_widget_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('superadmin', 'admin')
    )
  );

-- 4. SEED DATA AWAL (Idempotent Insert)
INSERT INTO public.portal_widget_settings (id, show_search, show_pinned, show_popular_tabs, show_categories, show_quick_links)
VALUES ('default', true, true, true, true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quick_links (label, url, icon_name, target_blank, sort_order, is_active)
VALUES 
  ('Kalender Asesmen Nasional', 'https://pusmendik.kemdikbud.go.id/an', 'Calendar', true, 1, true),
  ('Download Modul & RPP', '#resources', 'Download', false, 2, true),
  ('Portal Guru & Layanan CBT', '#cbt', 'Globe', false, 3, true),
  ('Pusat Bantuan & Panduan', '#about', 'HelpCircle', false, 4, true)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- FIX ROW LEVEL SECURITY & SINKRONISASI ARTIKEL PORTAL PUBLIK SASI
-- Jalankan skrip SQL ini di menu SQL Editor pada Supabase Dashboard:
-- https://supabase.com/dashboard/project/lmlflfkdukcdhkdjssmm/sql/new
-- ==============================================================================

-- 1. BUKA HAK AKSES RLS PADA TABEL-TABEL ZONA PORTAL PUBLIK
-- Memungkinkan aplikasi menyimpan pembaruan artikel, dokumen, profil, dan widget
-- secara langsung lintas perangkat via Anon Key & Authenticated Client

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'public_articles',
        'teaching_resources',
        'teacher_contributions',
        'developer_profiles',
        'quick_links',
        'portal_widget_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role;', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. PERBARUI ARTIKEL YANG DISUNTING AGAR LANGSUNG SINKRON KE CLOUD DATABASE
-- Mengoreksi judul artikel dan membersihkan karakter literal '\n' menjadi baris baru rapi
UPDATE public.public_articles
SET 
  title = 'Pedoman Baku Penulisan Soal Asesmen Sekolah Tingkat Sekolah Dasar: Menjaga Validitas, Keadilan, dan Kualitas Evaluasi Belajar',
  excerpt = 'Panduan komprehensif bagi pendidik dalam merumuskan stimulus kontekstual, pokok soal bebas bias, dan opsi jawaban yang logis sesuai kaidah validitas dan reliabilitas asesmen nasional.',
  content = '<h2>1. Pendahuluan</h2>
<h3>Urgensi Asesmen yang Valid dan Reliabel di Tingkat SD</h3>
<p>Asesmen di sekolah dasar menjadi dasar keputusan pedagogis. Hasilnya menentukan apakah seorang anak perlu pengayaan, remedial, atau pendekatan belajar yang berbeda. Keputusan itu hanya dapat dipertanggungjawabkan jika instrumennya <strong>valid</strong>, yakni mengukur capaian yang memang hendak diukur, dan <strong>reliabel</strong>, yakni memberi hasil yang konsisten.</p>

<p>Pada jenjang Sekolah Dasar, butir soal harus memperhatikan perkembangan kognitif anak usia 6-12 tahun, menggunakan bahasa yang lugas, tidak menimbulkan penafsiran ganda, serta merefleksikan konteks kehidupan sehari-hari (kontekstual).</p>

<h2>2. Kaidah Materi</h2>
<ul>
  <li><strong>Kesesuaian Indikator:</strong> Butir soal harus mengukur indikator pencapaian kompetensi yang telah ditetapkan dalam kisi-kisi atau Capaian Pembelajaran (CP).</li>
  <li><strong>Homogenitas Pilihan Jawaban:</strong> Pilihan jawaban (distraktor) harus homogen, setara panjangnya, dan logis ditinjau dari materi yang diujikan.</li>
  <li><strong>Kunci Jawaban Tunggal:</strong> Setiap butir soal pilihan ganda hanya boleh memiliki satu kunci jawaban yang benar atau paling tepat.</li>
</ul>

<h2>3. Kaidah Konstruksi</h2>
<ul>
  <li><strong>Pokok Soal Jelas dan Tegas:</strong> Rumuskan pokok soal secara singkat, padat, dan tidak berbelit-belit.</li>
  <li><strong>Bebas Petunjuk Kunci:</strong> Pokok soal tidak boleh memberikan petunjuk implisit maupun eksplisit ke arah jawaban yang benar.</li>
  <li><strong>Hindari Negatif Ganda:</strong> Jangan menggunakan pernyataan yang bersifat negatif ganda (misal: "Berikut ini yang <em>bukan</em> merupakan hal yang <em>tidak</em> boleh...").</li>
  <li><strong>Hindari Opsi Ekstrem:</strong> Jangan menggunakan pilihan jawaban seperti "Semua pilihan jawaban di atas benar" atau "Semua jawaban salah".</li>
</ul>

<h2>4. Kaidah Bahasa dan Ejaan</h2>
<ul>
  <li>Menggunakan bahasa Indonesia yang baik, benar, dan komunikatif sesuai tingkat pemahaman peserta didik SD.</li>
  <li>Pilihan jawaban tidak mengulang kata atau frasa yang sudah tertulis di dalam pokok soal.</li>
  <li>Menghindari bahasa daerah lokal yang dapat merugikan peserta didik dari latar belakang berbeda (bebas bias budaya dan gender).</li>
</ul>',
  updated_at = now()
WHERE slug = 'kaidah-penulisan-soal-asesmen-sekolah-sd'
   OR id = '0dd4b6aa-75d8-41e5-b0f4-561eff22c367';

-- 3. BERIKAN HAK AKSES SEQUENCE & SCHEMA
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. KONFIRMASI STATUS
SELECT 
  id, 
  slug, 
  title, 
  updated_at 
FROM public.public_articles 
WHERE slug = 'kaidah-penulisan-soal-asesmen-sekolah-sd';

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lmlflfkdukcdhkdjssmm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_jCtI_SZy-jxcJoDkeXPN-g_HKO4LEXX';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Gunakan metode GET.' });
  }

  const packageId = req.query.package_id || req.query.id;

  if (!packageId || typeof packageId !== 'string') {
    return res.status(400).json({ error: 'Parameter package_id wajib disertakan.' });
  }

  try {
    // 1. Ambil relasi nomor urut soal dari paket ujian
    const { data: epqData, error: epqError } = await supabase
      .from('exam_package_questions')
      .select('question_id, order_number')
      .eq('package_id', packageId)
      .order('order_number', { ascending: true });

    if (epqError) {
      console.error('Error fetching package questions:', epqError);
      return res.status(500).json({ error: 'Gagal memuat mapping soal paket.', details: epqError.message });
    }

    if (!epqData || epqData.length === 0) {
      return res.status(200).json({ success: true, count: 0, questions: [] });
    }

    // 2. Ambil seluruh butir soal dan opsi jawabannya sekaligus (Single-Payload)
    const qIds = epqData.map(item => item.question_id);
    const { data: qData, error: qError } = await supabase
      .from('question_bank')
      .select('*, options:question_options(*)')
      .in('id', qIds);

    if (qError) {
      console.error('Error fetching question bank items:', qError);
      return res.status(500).json({ error: 'Gagal memuat butir soal.', details: qError.message });
    }

    // 3. Susun sesuai urutan order_number paket
    const qMap = new Map((qData || []).map(q => [q.id, q]));
    const orderedQuestions = [];

    epqData.forEach(epq => {
      const found = qMap.get(epq.question_id);
      if (found) {
        // Keamanan Ketat CBT: Hapus teks pembahasan (explanation) dari payload siswa
        // agar tidak bisa diintip lewat browser DevTools / Network tab
        const { explanation, ...sanitized } = found;
        orderedQuestions.push({
          ...sanitized,
          options: Array.isArray(sanitized.options)
            ? [...sanitized.options].sort((a, b) => (a.option_label || '').localeCompare(b.option_label || ''))
            : []
        });
      }
    });

    // 4. Stempel Cache Control Resmi untuk Cloudflare Edge (2 Jam Cache)
    // Siswa pertama mengambil dari Supabase, 1.499 siswa berikutnya dilayani Cloudflare Jakarta
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=7200, stale-while-revalidate=600');
    res.setHeader('CDN-Cache-Control', 'max-age=7200');
    res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=7200');

    return res.status(200).json({
      success: true,
      package_id: packageId,
      count: orderedQuestions.length,
      questions: orderedQuestions,
      cached_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Unhandled exam packet gateway error:', err);
    return res.status(500).json({ error: 'Terjadi kendala pada gateway soal.', details: err.message });
  }
}

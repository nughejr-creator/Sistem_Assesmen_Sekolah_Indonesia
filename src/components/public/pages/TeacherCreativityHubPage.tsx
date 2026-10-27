import React, { useState } from 'react';
import { 
  Sparkles, 
  PenTool, 
  BookOpen, 
  FileSpreadsheet, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink, 
  Download,
  Layers,
  GraduationCap,
  MessageSquare,
  Award
} from 'lucide-react';

interface TeacherCreativityHubPageProps {
  onOpenLogin: (tab: 'student' | 'officer') => void;
}

export const TeacherCreativityHubPage: React.FC<TeacherCreativityHubPageProps> = ({
  onOpenLogin
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'kontribusi' | 'perangkat' | 'lkpd' | 'administrasi'>('ai');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  // 6 Pilar Generator AI
  const aiGenerators = [
    {
      id: 'gen-1',
      pilar: 'Pilar 1: Generator Modul Ajar',
      title: 'RPP Berdiferensiasi & Pembelajaran Bermakna',
      desc: 'Merancang modul ajar Kurikulum Merdeka lengkap dengan asesmen awal, kegiatan inti berdiferensiasi konten/proses/produk, dan pemahaman bermakna.',
      promptTemplate: `Sebagai pakar kurikulum dan pengembang Modul Ajar Sekolah Dasar, buatkan Modul Ajar lengkap berpendekatan Pembelajaran Berdiferensiasi dan Pembelajaran Bermakna dengan rincian berikut:
- Mata Pelajaran: [Mata Pelajaran]
- Fase / Kelas: [Fase / Kelas]
- Alokasi Waktu: [Jumlah JP]
- Capaian Pembelajaran & Tujuan: [Tuliskan Tujuan Pembelajaran]
- Rincian Kegiatan: Pendahuluan (Asesmen Diagnostik), Inti (Diferensiasi Konten, Proses, & Produk), dan Penutup.`
    },
    {
      id: 'gen-2',
      pilar: 'Pilar 2: Generator LKPD',
      title: 'Lembar Eksplorasi Kontekstual & Masalah (PBL)',
      desc: 'Menyusun lembar kerja peserta didik berbasis penemuan konsep dunia nyata, ramah anak, dan merangsang daya nalar kritis siswa.',
      promptTemplate: `Rancang Lembar Kerja Peserta Didik (LKPD) berbasis Problem-Based Learning (PBL) untuk jenjang SD dengan ketentuan:
- Topik / Materi: [Topik Bahasan]
- Sasaran: Kelas [1-6 SD]
- Struktur: Judul Menarik, Stimulus Cerita Nyata/Gambar, Pertanyaan Pemantik, Langkah Eksplorasi Kelompok, dan Lembar Refleksi Diri.`
    },
    {
      id: 'gen-3',
      pilar: 'Pilar 3: Generator Kisi-Kisi & Soal',
      title: 'Kisi-Kisi AKM / TKA & Rubrik Penskoran',
      desc: 'Menghasilkan stimulus teks literasi/numerasi, sebaran butir soal berlevel kognitif (L1, L2, L3), dan pedoman penskoran objektif.',
      promptTemplate: `Buatkan kisi-kisi dan 5 butir kartu soal berstandar AKM (Asesmen Kompetensi Minimum) dengan ketentuan:
- Domain: [Literasi Membaca / Numerasi]
- Kelas: [Fase / Kelas]
- Stimulus: Buatkan stimulus bacaan narasi atau data infografis bertema saintifik/sosial budaya.
- Bentuk Soal: 2 Pilihan Ganda Kompleks, 1 Menjodohkan, 1 Isian Singkat, 1 Uraian Penalaran L3 + Kunci & Rubrik.`
    },
    {
      id: 'gen-4',
      pilar: 'Pilar 4: Generator Rubrik & IKTP',
      title: 'Indikator Ketercapaian & Deskripsi Rapor',
      desc: 'Menyusun skala rubrik 4 tingkatan (Perlu Bimbingan, Cukup, Baik, Sangat Baik) dan narasi otomatis rapor siswa.',
      promptTemplate: `Rancang tabel Rubrik Penilaian dan Kriteria Ketercapaian Tujuan Pembelajaran (KKTP/IKTP) beserta template narasi deskripsi capaian rapor untuk:
- Mata Pelajaran: [Mata Pelajaran]
- Tujuan Pembelajaran: [Tujuan Pembelajaran]
- Skala Penilaian: 4 Interval (Perlu Bimbingan, Cukup, Baik, Sangat Baik).`
    },
    {
      id: 'gen-5',
      pilar: 'Pilar 5: Modul Kokurikuler',
      title: 'Modul 5 Komponen Baku Deep Learning',
      desc: 'Format baku 5 komponen (Identitas, 8 Dimensi Karakter, Alur Aktivitas, Evaluasi Komprehensif, Paket Lampiran).',
      promptTemplate: `Susun Modul Projek Kokurikuler Sekolah Dasar dengan format baku 5 komponen:
1. Identitas & Tema Projek
2. Tujuan Pengembangan Karakter (8 Dimensi Deep Learning / Profil Pelajar)
3. Alur Aktivitas Projek (Pengenalan, Kontekstualisasi, Aksi Nyata, Refleksi)
4. Evaluasi Komprehensif & Asesmen Sumatif Projek
5. Paket Lampiran Instrumen & Lembar Observasi.`
    },
    {
      id: 'gen-6',
      pilar: 'Pilar 6: Generator Refleksi & Feedback',
      title: 'Umpan Balik Konstruktif & Apresiatif',
      desc: 'Menghasilkan kalimat catatan apresiatif, rekomendasi penguatan, dan refleksi bagi perkembangan individu siswa.',
      promptTemplate: `Buatkan 5 variasi kalimat umpan balik (feedback) guru yang konstruktif dan memotivasi untuk siswa SD berdasarkan capaian:
- Kategori Siswa: [Siswa Berprestasi Tinggi / Butuh Penguatan Literasi / Perlu Peningkatan Fokus]
- Aspek yang dinilai: [Pemahaman Konsep / Kerapian Pengerjaan / Kolaborasi Kelompok].`
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* =======================================================================
          1. HEADER BANNER
      ======================================================================= */}
      <section className="bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pusat Produktivitas & Kreativitas Pendidik</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ruang Kreativitas Guru Indonesia
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
            Wahana kolaborasi guru: Asisten Prompt AI cerdas 6 alur mengajar, publikasi karya praktik baik, repositori modul ajar Kurikulum Merdeka, serta pusat unduhan administrasi kelas.
          </p>
        </div>
      </section>

      {/* =======================================================================
          2. TAB NAVIGATION (5 PILAR FUNGSIONAL)
      ======================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        <div className="flex overflow-x-auto space-x-2 pb-4 border-b border-slate-200 scrollbar-thin">
          
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'ai'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Asisten Guru AI (6 Alur)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kontribusi')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'kontribusi'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Tulis & Publikasi Karya</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('perangkat')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'perangkat'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Pusat Perangkat Ajar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lkpd')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'lkpd'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bank LKPD & Media Belajar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('administrasi')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'administrasi'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Pusat Unduhan Administrasi Guru</span>
          </button>

        </div>

        {/* =====================================================================
            3. TAB CONTENT
        ===================================================================== */}
        <div className="pt-8">
          
          {/* TAB 1: ASISTEN GURU AI (6 PILAR) */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <div>
                  <strong className="font-bold">Prompt Generator 100% Client-Side:</strong> Salin prompt terstruktur di bawah ini untuk digunakan langsung pada AI favorit Anda (Gemini, ChatGPT, Claude) secara gratis dan tanpa kuota API.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {aiGenerators.map(gen => (
                  <div 
                    key={gen.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-all group"
                  >
                    <div className="space-y-3">
                      <div className="inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                        {gen.pilar}
                      </div>

                      <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors">
                        {gen.title}
                      </h3>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        {gen.desc}
                      </p>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 max-h-32 overflow-y-auto">
                        {gen.promptTemplate}
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(gen.id, gen.promptTemplate)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors"
                      >
                        {copiedPromptId === gen.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Salin Prompt</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('kontribusi')}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800"
                      >
                        Buka di Editor →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: TULIS & PUBLIKASI KARYA GURU */}
          {activeTab === 'kontribusi' && (
            <div className="max-w-3xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-block p-3 rounded-2xl bg-amber-100 text-amber-800">
                  <PenTool className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900">Ruang Kontribusi & Publikasi Guru</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Bagikan modul ajar, LKPD kontekstual, atau praktik baik pembelajaran Anda agar dapat dimanfaatkan oleh ribuan guru di seluruh Nusantara.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-sky-50 border border-sky-100 text-xs text-sky-900 space-y-2">
                <div className="font-bold flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-sky-600" />
                  <span>Alur Kurasi & Moderasi:</span>
                </div>
                <p className="text-[11px] text-sky-700">
                  Karya yang dikirim akan berstatus <strong>Draft</strong> $\rightarrow$ <strong>Menunggu Riviu</strong> $\rightarrow$ <strong>Terbit Resmi</strong> setelah divalidasi oleh Tim Kurasi SASI.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center space-y-3">
                <p className="text-xs font-semibold text-slate-700">
                  Untuk menjaga orisinalitas dan keamanan publikasi, fitur menulis memerlukan login akun Guru CBT SASI.
                </p>

                <button
                  type="button"
                  onClick={() => onOpenLogin('officer')}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md inline-flex items-center space-x-2"
                >
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <span>Masuk dengan Akun Guru CBT</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PUSAT PERANGKAT AJAR */}
          {activeTab === 'perangkat' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">Modul Ajar Kurikulum Merdeka Terverifikasi</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-700">Fase A • Kelas 1</span>
                    <h4 className="text-xs font-bold text-slate-900">Modul Ajar Berdiferensiasi Membaca Permulaan</h4>
                    <p className="text-[11px] text-slate-500">Bahasa Indonesia • Alokasi 6 JP</p>
                  </div>
                  <a
                    href="https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx"
                    download
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-50 text-sky-700">Fase C • Kelas 5</span>
                    <h4 className="text-xs font-bold text-slate-900">Modul IPAS Ekosistem & Keseimbangan Lingkungan</h4>
                    <p className="text-[11px] text-slate-500">IPAS • Pembelajaran Bermakna</p>
                  </div>
                  <a
                    href="https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx"
                    download
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BANK LKPD & MEDIA BELAJAR */}
          {activeTab === 'lkpd' && (
            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-900">Lembar Kerja Peserta Didik Siap Cetak (PDF)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-50 text-amber-700">Kelas 4 SD</span>
                  <h4 className="text-xs font-bold text-slate-900">LKPD Eksplorasi Wujud Zat & Sifat Benda</h4>
                  <p className="text-[11px] text-slate-500">Dilengkapi panduan eksperimen sederhana dan lembar observasi.</p>
                  <a
                    href="https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/lkpd/paket-lkpd-ipas-fase-b-kelas4.pdf"
                    download
                    className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh PDF</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: PUSAT UNDUHAN ADMINISTRASI GURU */}
          {activeTab === 'administrasi' && (
            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-900">Format Template Administrasi Kelas (DOCX & XLSX)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">Format XLSX</span>
                    <h4 className="text-xs font-bold text-slate-900">Buku Nilai Formatif-Sumatif Otomatis IKTP</h4>
                    <p className="text-[11px] text-slate-500">Rumus otomatis rata-rata dan deskripsi narasi rapor.</p>
                  </div>
                  <a
                    href="https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/buku-nilai-jurnal-guru-otomatis.xlsx"
                    download
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh XLSX</span>
                  </a>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-100 text-sky-800">Format DOCX</span>
                    <h4 className="text-xs font-bold text-slate-900">Jurnal Harian Mengajar & Presensi Kelas</h4>
                    <p className="text-[11px] text-slate-500">Format siap cetak untuk portofolio administrasi guru.</p>
                  </div>
                  <a
                    href="https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx"
                    download
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh DOCX</span>
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

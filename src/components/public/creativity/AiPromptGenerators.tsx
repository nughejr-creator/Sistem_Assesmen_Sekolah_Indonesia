import React, { useState } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  ArrowRight, 
  BookOpen, 
  FileText, 
  Layers, 
  Award, 
  HeartHandshake, 
  RotateCcw,
  Sliders,
  Send,
  Zap,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';

interface AiPromptGeneratorsProps {
  onTransferToEditor: (content: string, title?: string) => void;
  initialGeneratorIndex?: number;
}

export const AiPromptGenerators: React.FC<AiPromptGeneratorsProps> = ({
  onTransferToEditor,
  initialGeneratorIndex = 0
}) => {
  const [selectedGenerator, setSelectedGenerator] = useState<number>(initialGeneratorIndex);
  const [copied, setCopied] = useState<boolean>(false);

  React.useEffect(() => {
    if (initialGeneratorIndex !== undefined) {
      setSelectedGenerator(initialGeneratorIndex);
    }
  }, [initialGeneratorIndex]);

  // ===========================================================================
  // STATE INPUT 6 GENERATOR
  // ===========================================================================

  // 1. Modul Ajar
  const [maFase, setMaFase] = useState('Fase B (Kelas 4 SD)');
  const [maMapel, setMaMapel] = useState('IPAS');
  const [maTopik, setMaTopik] = useState('Wujud Zat dan Perubahannya');
  const [maWaktu, setMaWaktu] = useState('2 Pertemuan (5 JP x 35 Menit)');
  const [maModel, setMaModel] = useState('Problem-Based Learning (PBL)');
  const [maDiferensiasi, setMaDiferensiasi] = useState('Konten & Proses (Visual, Auditori, Kinestetik)');
  const [maKesiapan, setMaKesiapan] = useState('Sebagian besar siswa sudah mengenal wujud padat dan cair, namun belum memahami konsep perubahan wujud gas dan menyublim.');

  // 2. LKPD
  const [lkpdTopik, setLkpdTopik] = useState('Eksplorasi Perubahan Energi di Sekitar Kita');
  const [lkpdFase, setLkpdFase] = useState('Kelas 4 SD (Fase B)');
  const [lkpdModel, setLkpdModel] = useState('Kelompok Kolaboratif (4-5 Siswa)');
  const [lkpdPendekatan, setLkpdPendekatan] = useState('Eksplorasi Kontekstual & Penemuan Masalah Nyata');
  const [lkpdPetunjuk, setLkpdPetunjuk] = useState('Gunakan alat dan bahan sederhana yang ada di kelas/halaman sekolah. Amati dengan cermat dan catat pada tabel pengamatan.');

  // 3. Kisi-Kisi & Soal
  const [soalTipe, setSoalTipe] = useState('Sumatif Akhir Semester (SAS)');
  const [soalFase, setSoalFase] = useState('Fase C (Kelas 5 SD)');
  const [soalMapel, setSoalMapel] = useState('Bahasa Indonesia');
  const [soalMateri, setSoalMateri] = useState('Menganalisis Teks Eksplanasi & Ide Pokok Paragraf');
  const [soalLevel, setSoalLevel] = useState('L1: 30%, L2: 40%, L3: 30% (HOTS)');
  const [soalBentuk, setSoalBentuk] = useState('Pilihan Ganda, Pilihan Ganda Kompleks, & Uraian');
  const [soalJumlah, setSoalJumlah] = useState('5 Butir Soal Terstandar');

  // 4. Rubrik & IKTP Rapor
  const [rubrikTp, setRubrikTp] = useState('Peserta didik mampu membandingkan siklus hidup mahluk hidup dan upaya pelestariannya');
  const [rubrikIktp, setRubrikIktp] = useState('Menjelaskan tahap metamorfosis sempurna dan tidak sempurna serta membuat skema daur hidup kupu-kupu');
  const [rubrikSkala, setRubrikSkala] = useState('4 Interval: Perlu Bimbingan (0-60), Cukup (61-75), Baik (76-88), Sangat Baik (89-100)');
  const [rubrikGaya, setRubrikGaya] = useState('Naratif Apresiatif Berdasarkan Capaian Tertinggi dan Rekomendasi Peningkatan');

  // 5. Modul Kokurikuler (Deep Learning)
  const [kokuTema, setKokuTema] = useState('Gaya Hidup Berkelanjutan');
  const [kokuJudul, setKokuJudul] = useState('Kelola Sampah Plastik Menjadi Harta Karun Kelas (Eco-Brick)');
  const [kokuFase, setKokuFase] = useState('Fase B (Kelas 3 & 4 SD)');
  const [kokuDurasi, setKokuDurasi] = useState('24 Jam Pelajaran (4 Pekan)');
  const [kokuDimensi, setKokuDimensi] = useState('Bernalar Kritis, Bergotong Royong, dan Kreatif');
  const [kokuIsu, setKokuIsu] = useState('Banyaknya bungkus makanan ringan plastik yang berserakan di kantin dan selokan sekolah saat jam istirahat.');

  // 6. Refleksi & Feedback
  const [fbFokus, setFbFokus] = useState('Kemampuan Berkolaborasi & Bernalar Kritis');
  const [fbCapaian, setFbCapaian] = useState('Siswa aktif berpendapat dalam diskusi kelompok, namun masih terburu-buru saat menuliskan kesimpulan laporan akhir.');
  const [fbBahasa, setFbBahasa] = useState('Hangat, Apresiatif, dan Mendorong Solusi Mandiri');

  // ===========================================================================
  // BUILDER PROMPT DINAMIS 6 PILAR
  // ===========================================================================

  const generatorList = [
    {
      id: 0,
      pilar: 'Pilar 1: Modul Ajar',
      name: 'Generator Modul Ajar (RPP Berdiferensiasi)',
      icon: BookOpen,
      color: 'sky',
      badge: 'Berdiferensiasi',
      buildPrompt: () => `Sebagai seorang pengembang kurikulum dan pakar pedagogik Sekolah Dasar berstandar nasional, buatkan rancangan Modul Ajar Kurikulum Merdeka yang lengkap, mendalam, dan operasional dengan spesifikasi berikut:

1. IDENTITAS MODUL
- Jenjang & Sasaran: ${maFase}
- Mata Pelajaran: ${maMapel}
- Materi Pokok: ${maTopik}
- Alokasi Waktu: ${maWaktu}
- Model Pembelajaran: ${maModel}

2. PARAMETER DIFERENSIASI & KESIAPAN BELAJAR
- Pendekatan Diferensiasi: ${maDiferensiasi}
- Kondisi Awal Siswa: ${maKesiapan}

3. STRUKTUR MODUL WAJIB YANG HARUS DIBUAT:
A. Capaian Pembelajaran (CP) dan Tujuan Pembelajaran (TP) terukur (berbasis ABCD).
B. Pemahaman Bermakna (Meaningful Learning) & Pertanyaan Pemantik kontekstual.
C. Dimensi Profil Pelajar Pancasila yang dikembangkan.
D. Skenario Pembelajaran Berdiferensiasi:
   - Pendahuluan (15 menit): Apersepsi, asesmen awal cepat/diagnostik, dan motivasi.
   - Kegiatan Inti: Diferensiasi Konten (materi teks/infografis/video/benda nyata), Diferensiasi Proses (bimbingan bertingkat scaffolding), dan Diferensiasi Produk (pilihan karya siswa).
   - Kegiatan Penutup (15 menit): Refleksi 3-2-1, apresiasi, dan tindak lanjut.
E. Asesmen Pembelajaran: Asesmen Awal, Asesmen Formatif (lembar observasi proses), dan Asesmen Sumatif Lingkup Materi.
F. Kriteria Ketercapaian Tujuan Pembelajaran (IKTP) & Rubrik Interval Skor.
G. Lembar Pengayaan (untuk siswa cepat) dan Remedial (untuk siswa perlu pendampingan).

Sajikan dalam bahasa Indonesia yang baku, terstruktur dengan penomoran rapi, dan langsung siap dicetak oleh guru.`
    },
    {
      id: 1,
      pilar: 'Pilar 2: Lembar Kerja',
      name: 'Generator LKPD Kontekstual & PBL',
      icon: FileText,
      color: 'emerald',
      badge: 'Eksplorasi Siswa',
      buildPrompt: () => `Rancanglah sebuah Lembar Kerja Peserta Didik (LKPD) yang menarik, interaktif, ramah anak, dan merangsang daya nalar kritis siswa Sekolah Dasar dengan rincian berikut:

1. IDENTITAS LKPD:
- Topik / Fokus Aktivitas: ${lkpdTopik}
- Sasaran: ${lkpdFase}
- Format Kegiatan: ${lkpdModel}
- Pendekatan Belajar: ${lkpdPendekatan}
- Petunjuk Belajar Singkat: ${lkpdPetunjuk}

2. FORMAT LKPD LENGKAP YANG HARUS DIHASILKAN:
A. Judul LKPD yang Menarik & Kontekstual (ramah anak SD).
B. Kolom Identitas Siswa / Nama Anggota Kelompok.
C. Stimulus Pemantik: Cerita narasi pendek / studi kasus dunia nyata yang membangkitkan rasa ingin tahu anak.
D. Pertanyaan Pemantik Penyelidikan.
E. Langkah Kerja Eksplorasi: Disusun langkah demi langkah secara runtut dan mudah dipahami anak.
F. Tabel Lembar Pengamatan / Kolom Respons Data Siswa: Format tabel siap diisi hasil observasi siswa.
G. Pertanyaan Analisis & Penarikan Kesimpulan (diskusi kelompok).
H. Pojok Refleksi Diri (ikon emotikon tersenyum/berpikir yang menggambarkan perasaan anak setelah belajar).`
    },
    {
      id: 2,
      pilar: 'Pilar 3: Kisi-Kisi & Soal',
      name: 'Generator Kisi-Kisi & Kartu Soal AKM/TKA',
      icon: Layers,
      color: 'purple',
      badge: 'HOTS & AKM',
      buildPrompt: () => `Bertindaklah sebagai Asesor Evaluasi Pendidikan dan Tim Penulis Soal Ujian Sekolah Nasional. Buatkan dokumen Matriks Kisi-Kisi dan Kartu Soal terstandar dengan ketentuan:

1. PARAMETER ASESMEN:
- Jenis Ujian: ${soalTipe}
- Sasaran: ${soalFase}
- Mata Pelajaran: ${soalMapel}
- Lingkup Materi: ${soalMateri}
- Sebaran Level Kognitif: ${soalLevel}
- Variasi Bentuk Soal: ${soalBentuk}
- Target Jumlah: ${soalJumlah}

2. FORMAT OUTPUT WAJIB:
A. TABEL MATRIKS KISI-KISI:
   - Kolom: No, Capaian Pembelajaran, Materi Pokok, Indikator Soal (operasional), Bentuk Soal, Level Kognitif (L1/L2/L3), Nomor Soal, dan Bobot Skor.
B. KARTU NASKAH BUTIR SOAL:
   - Sajikan stimulus kontekstual (bacaan teks informasi/fiksi, data tabel, atau situasi nyata).
   - Pokok soal bebas dari kalimat negatif ganda dan bebas bias.
   - Pilihan jawaban homogen dan logis.
   - Kunci Jawaban Lengkap.
   - Pedoman Rubrik Penskoran khusus soal bentuk uraian/penalaran (L3).`
    },
    {
      id: 3,
      pilar: 'Pilar 4: Rubrik & Rapor',
      name: 'Generator Rubrik IKTP & Narasi Rapor',
      icon: Award,
      color: 'amber',
      badge: 'IKTP & KKTP',
      buildPrompt: () => `Susunlah Kriteria Ketercapaian Tujuan Pembelajaran (IKTP/KKTP), Rubrik Penilaian Analitik, dan Rumusan Narasi Rapor Kurikulum Merdeka dengan data input berikut:

1. DATA CAPAIAN & INDIKATOR:
- Tujuan Pembelajaran (TP): ${rubrikTp}
- Indikator Ketercapaian (IKTP): ${rubrikIktp}
- Interval Kriteria: ${rubrikSkala}
- Gaya Bahasa Narasi: ${rubrikGaya}

2. FORMAT DOKUMEN YANG HARUS DIHASILKAN:
A. TABEL RUBRIK PENILAIAN ANALITIK:
   - Kriteria Penilaian (misal: Penguasaan Konsep, Keterampilan Analisis, Kejelasan Argumentasi).
   - Deskripsi Operasional untuk 4 Tingkatan:
     1. Perlu Bimbingan (deskripsi kendala anak secara konkret).
     2. Cukup (telah menguasai konsep dasar namun belum konsisten).
     3. Baik (mampu menyelesaikan indikator secara mandiri).
     4. Sangat Baik / Mahir (menguasai tuntas dan mampu mengaitkan dengan konteks baru).
B. TEMPLATE NARASI RAPOR OTOMATIS:
   - Contoh Narasi untuk Siswa Mahir (apresiatif dan menunjukkan keunggulan).
   - Contoh Narasi untuk Siswa Berkembang (menunjukkan hal yang sudah dikuasai dan rekomendasi penguatan).
   - Contoh Narasi untuk Siswa Butuh Bimbingan (konstruktif, tidak merendahkan anak, dan fokus pada strategi pendampingan guru/orang tua).`
    },
    {
      id: 4,
      pilar: 'Pilar 5: Kokurikuler',
      name: 'Generator Modul Kokurikuler (Deep Learning)',
      icon: Zap,
      color: 'rose',
      badge: 'Format Baku 5 Bagian',
      buildPrompt: () => `Rancanglah Modul Projek Kokurikuler Sekolah Dasar berbasis Deep Learning dan Penguatan Karakter Profil Pelajar yang WAJIB MEMENUHI FORMAT BAKU 5 KOMPONEN UTAMA berikut:

1. DATA PROJEK:
- Tema Projek: ${kokuTema}
- Judul Projek: ${kokuJudul}
- Sasaran: ${kokuFase}
- Alokasi Durasi: ${kokuDurasi}
- Fokus Dimensi: ${kokuDimensi}
- Isu/Masalah Nyata Lingkungan: ${kokuIsu}

2. STRUKTUR FORMAT BAKU 5 KOMPONEN WAJIB:
KOMPONEN 1: IDENTITAS PROJEK
- Tema, Topik/Judul Spesifik, Sasaran Fase/Kelas, Durasi Waktu, Penanggung Jawab, dan Relevansi Projek dengan Sekolah.

KOMPONEN 2: TUJUAN PROJEK & 8 DIMENSI DEEP LEARNING
- Pemetaan Dimensi, Elemen, Sub-Elemen, dan Target Akhir Fase yang diharapkan berkembang pada diri murid.

KOMPONEN 3: ALUR AKTIVITAS OPERASIONAL PROJEK
- Tahap 1: Pengenalan (Mengenalkan isu sampah plastik, stimulus film/observasi lingkungan).
- Tahap 2: Kontekstualisasi (Wawancara penjaga kantin, menghitung volume sampah kelas).
- Tahap 3: Aksi Nyata (Pembuatan produk bernilai guna, pameran hasil karya kelas).
- Tahap 4: Refleksi & Tindak Lanjut (Evaluasi dampak kebiasaan baru di sekolah).

KOMPONEN 4: EVALUASI & ASESMEN KOMPREHENSIF
- Asesmen Diagnostik Awal Projek.
- Lembar Observasi Formatif Sikap (Bergotong Royong & Kreatif).
- Asesmen Sumatif Hasil Projek + Rubrik Kriteria Deskriptif (Mulai Berkembang, Sedang Berkembang, Berkembang Sesuai Harapan, Sangat Berkembang).

KOMPONEN 5: PAKET LAMPIRAN DOKUMEN PENDUKUNG
- Draf LKPD Mandiri/Kelompok Projek.
- Format Rubrik Pengamatan Guru.
- Referensi Materi/Tutorial Pembuatan.
- Lembar Jurnal Refleksi Harian Murid.`
    },
    {
      id: 5,
      pilar: 'Pilar 6: Refleksi Guru',
      name: 'Generator Refleksi & Umpan Balik Guru',
      icon: HeartHandshake,
      color: 'indigo',
      badge: 'Konstruktif & Hangat',
      buildPrompt: () => `Sebagai seorang pendidik yang berempati tinggi dan menguasai prinsip Feedback Konstruktif, buatkan rumusan kalimat umpan balik (feedback) formatif guru kepada siswa SD dengan kriteria berikut:

1. DATA KINERJA SISWA:
- Fokus Aspek: ${fbFokus}
- Catatan Kinerja / Capaian: ${fbCapaian}
- Karakter Bahasa: ${fbBahasa}

2. FORMAT OUTPUT:
A. Kalimat Apresiasi Nyata: Mengakui usaha dan poin positif yang telah ditunjukkan anak secara spesifik.
B. Kalimat Catatan Penguatan (Constructive Feedback): Menunjukkan area yang perlu ditingkatkan dengan analogi yang ramah anak.
C. Kalimat Rekomendasi Aksi Konkret: Memberikan 2 langkah sederhana yang dapat dipraktikkan murid pada pembelajaran berikutnya.
D. Variasi Format Catatan Guru:
   - Format 1: Catatan Buku Tulis / Lembar Tugas Harian (singkat 2-3 kalimat).
   - Format 2: Catatan Portofolio / Hasil Ujian Asesmen (1 paragraf mendalam).
   - Format 3: Kalimat Penyemangat Saat Pembagian Rapor Siswa.`
    }
  ];

  const currentGen = generatorList[selectedGenerator];
  const currentPromptText = currentGen.buildPrompt();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentPromptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleOpenEditor = () => {
    onTransferToEditor(currentPromptText, currentGen.name);
  };

  return (
    <div className="space-y-8">
      
      {/* 6 Selector Tabs / Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {generatorList.map((gen, idx) => {
          const IconComp = gen.icon;
          const isSelected = selectedGenerator === idx;
          return (
            <button
              key={gen.id}
              type="button"
              onClick={() => setSelectedGenerator(idx)}
              className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                isSelected 
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-400/40' 
                  : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-white/10 text-amber-300' : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {gen.badge}
                </span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{gen.pilar}</div>
                <div className="text-xs font-black truncate">{gen.name.replace('Generator ', '')}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Generator Workspace: 2 Column Layout (Left: Interactive Form, Right: Live Prompt Output) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* KOLOM KIRI: FORMULIR PARAMETER (5 / 12) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b-2 border-slate-100">
            <Sliders className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Parameter Spesifikasi Prompt
            </h3>
          </div>

          {/* Form Generator 0: Modul Ajar */}
          {selectedGenerator === 0 && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fase / Sasaran Kelas</label>
                <select 
                  value={maFase} 
                  onChange={(e) => setMaFase(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs"
                >
                  <option>Fase A (Kelas 1 & 2 SD)</option>
                  <option>Fase B (Kelas 3 & 4 SD)</option>
                  <option>Fase C (Kelas 5 & 6 SD)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                  <input 
                    type="text" 
                    value={maMapel} 
                    onChange={(e) => setMaMapel(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alokasi Waktu</label>
                  <input 
                    type="text" 
                    value={maWaktu} 
                    onChange={(e) => setMaWaktu(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Topik / Materi Pokok</label>
                <input 
                  type="text" 
                  value={maTopik} 
                  onChange={(e) => setMaTopik(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Model Pembelajaran</label>
                <select 
                  value={maModel} 
                  onChange={(e) => setMaModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                >
                  <option>Problem-Based Learning (PBL)</option>
                  <option>Project-Based Learning (PjBL)</option>
                  <option>Inquiry Learning (Penemuan Terbimbing)</option>
                  <option>Discovery Learning</option>
                  <option>Pembelajaran Kontekstual (CTL)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fokus Diferensiasi</label>
                <input 
                  type="text" 
                  value={maDiferensiasi} 
                  onChange={(e) => setMaDiferensiasi(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Kesiapan Siswa</label>
                <textarea 
                  rows={2} 
                  value={maKesiapan} 
                  onChange={(e) => setMaKesiapan(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs resize-none" 
                />
              </div>
            </div>
          )}

          {/* Form Generator 1: LKPD */}
          {selectedGenerator === 1 && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Topik / Fokus Aktivitas</label>
                <input 
                  type="text" 
                  value={lkpdTopik} 
                  onChange={(e) => setLkpdTopik(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sasaran Kelas</label>
                  <input 
                    type="text" 
                    value={lkpdFase} 
                    onChange={(e) => setLkpdFase(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format Belajar</label>
                  <select 
                    value={lkpdModel} 
                    onChange={(e) => setLkpdModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  >
                    <option>Kelompok Kolaboratif (4-5 Siswa)</option>
                    <option>Aktivitas Berpasangan (Think-Pair-Share)</option>
                    <option>Aktivitas Eksplorasi Individu</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pendekatan Penyelidikan</label>
                <input 
                  type="text" 
                  value={lkpdPendekatan} 
                  onChange={(e) => setLkpdPendekatan(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Petunjuk Belajar Siswa</label>
                <textarea 
                  rows={2} 
                  value={lkpdPetunjuk} 
                  onChange={(e) => setLkpdPetunjuk(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs resize-none" 
                />
              </div>
            </div>
          )}

          {/* Form Generator 2: Kisi-Kisi & Soal */}
          {selectedGenerator === 2 && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenis Tes</label>
                  <select 
                    value={soalTipe} 
                    onChange={(e) => setSoalTipe(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  >
                    <option>Sumatif Akhir Semester (SAS)</option>
                    <option>Sumatif Tengah Semester (PTS)</option>
                    <option>Asesmen Kompetensi Minimum (AKM)</option>
                    <option>Tes Kemampuan Awal (TKA)</option>
                    <option>Formatif Lingkup Materi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fase / Kelas</label>
                  <input 
                    type="text" 
                    value={soalFase} 
                    onChange={(e) => setSoalFase(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <input 
                  type="text" 
                  value={soalMapel} 
                  onChange={(e) => setSoalMapel(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lingkup Materi Pokok</label>
                <input 
                  type="text" 
                  value={soalMateri} 
                  onChange={(e) => setSoalMateri(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sebaran Level</label>
                  <input 
                    type="text" 
                    value={soalLevel} 
                    onChange={(e) => setSoalLevel(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bentuk Soal</label>
                  <input 
                    type="text" 
                    value={soalBentuk} 
                    onChange={(e) => setSoalBentuk(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Generator 3: Rubrik & Rapor */}
          {selectedGenerator === 3 && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tujuan Pembelajaran (TP)</label>
                <textarea 
                  rows={2} 
                  value={rubrikTp} 
                  onChange={(e) => setRubrikTp(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs resize-none" 
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Indikator Ketercapaian (IKTP)</label>
                <textarea 
                  rows={2} 
                  value={rubrikIktp} 
                  onChange={(e) => setRubrikIktp(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs resize-none" 
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Skala Interval</label>
                <input 
                  type="text" 
                  value={rubrikSkala} 
                  onChange={(e) => setRubrikSkala(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Gaya Narasi Rapor</label>
                <input 
                  type="text" 
                  value={rubrikGaya} 
                  onChange={(e) => setRubrikGaya(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
            </div>
          )}

          {/* Form Generator 4: Kokurikuler (Deep Learning) */}
          {selectedGenerator === 4 && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tema Projek</label>
                  <select 
                    value={kokuTema} 
                    onChange={(e) => setKokuTema(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                  >
                    <option>Gaya Hidup Berkelanjutan</option>
                    <option>Kearifan Lokal</option>
                    <option>Bhinneka Tunggal Ika</option>
                    <option>Bangunlah Jiwa dan Raganya</option>
                    <option>Rekayasa & Teknologi</option>
                    <option>Kewirausahaan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fase / Kelas</label>
                  <input 
                    type="text" 
                    value={kokuFase} 
                    onChange={(e) => setKokuFase(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Projek</label>
                <input 
                  type="text" 
                  value={kokuJudul} 
                  onChange={(e) => setKokuJudul(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi Projek</label>
                  <input 
                    type="text" 
                    value={kokuDurasi} 
                    onChange={(e) => setKokuDurasi(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fokus Karakter</label>
                  <input 
                    type="text" 
                    value={kokuDimensi} 
                    onChange={(e) => setKokuDimensi(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Konteks Isu Sekolah</label>
                <textarea 
                  rows={2} 
                  value={kokuIsu} 
                  onChange={(e) => setKokuIsu(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs resize-none" 
                />
              </div>
            </div>
          )}

          {/* Form Generator 5: Refleksi & Feedback */}
          {selectedGenerator === 5 && (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Fokus Penilaian</label>
                <input 
                  type="text" 
                  value={fbFokus} 
                  onChange={(e) => setFbFokus(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Capaian Saat Ini</label>
                <textarea 
                  rows={3} 
                  value={fbCapaian} 
                  onChange={(e) => setFbCapaian(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs resize-none" 
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pendekatan Bahasa</label>
                <input 
                  type="text" 
                  value={fbBahasa} 
                  onChange={(e) => setFbBahasa(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs" 
                />
              </div>
            </div>
          )}

          <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-300 text-[11px] text-amber-900 flex items-start space-x-2">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Prompt di sebelah kanan otomatis terbarukan secara instan setiap kali Anda mengubah parameter di atas.</span>
          </div>
        </div>

        {/* KOLOM KANAN: PREVIEW PROMPT HASIL RAKITAN & AKSI (7 / 12) */}
        <div className="lg:col-span-7 bg-slate-900 text-white rounded-3xl p-6 shadow-xl border-2 border-slate-700 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b-2 border-white/10">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Prompt Siap Digunakan (Live Preview)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-md border-2 border-amber-500/50 flex items-center space-x-1.5 transition-all transform active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Tersalin!</span>
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
                onClick={handleOpenEditor}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border-2 border-white/20 shadow-2xs flex items-center space-x-1.5 transition-colors"
                title="Buka teks prompt di editor tulisan guru"
              >
                <span>Buka di Editor Tulisan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Kotak Readonly Prompt */}
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 max-h-[460px] overflow-y-auto whitespace-pre-wrap selection:bg-amber-400 selection:text-slate-950">
            {currentPromptText}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Kompatibel untuk: Gemini 1.5, Claude 3.5, ChatGPT 4o, & DeepSeek</span>
            <span className="text-emerald-400 font-bold">100% Client-Side State</span>
          </div>
        </div>

      </div>

    </div>
  );
};

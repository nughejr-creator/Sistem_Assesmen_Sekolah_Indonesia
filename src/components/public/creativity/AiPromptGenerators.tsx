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
  HelpCircle,
  Palette
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

  // ---------------------------------------------------------------------------
  // DATA MASTER PARAMETER PILAR 1 (MODUL AJAR)
  // ---------------------------------------------------------------------------
  const faseKelasOptions: Record<string, string[]> = {
    'Fase A': ['Kelas 1 SD', 'Kelas 2 SD'],
    'Fase B': ['Kelas 3 SD', 'Kelas 4 SD'],
    'Fase C': ['Kelas 5 SD', 'Kelas 6 SD'],
    'Fase D': ['Kelas 7 SMP', 'Kelas 8 SMP', 'Kelas 9 SMP']
  };

  const PROFIL_LULUSAN_OPTIONS = [
    'Keimanan dan ketakwaan terhadap Tuhan YME',
    'Kewarganegaraan dan kebangsaan',
    'Penalaran kritis',
    'Kreativitas',
    'Kolaborasi dan kemandirian',
    'Komunikasi',
    'Literasi dan numerasi',
    'Karakter dan kesejahteraan holistik'
  ];

  const BENTUK_ASESMEN_OPTIONS = [
    'Asesmen Awal / Diagnostik',
    'Formatif: Rubrik Observasi / Kinerja',
    'Formatif: LKPD / Tes Tertulis',
    'Sumatif'
  ];

  // 1. Modul Ajar
  const [maFase, setMaFase] = useState<'Fase A' | 'Fase B' | 'Fase C' | 'Fase D'>('Fase B');
  const [maKelas, setMaKelas] = useState<string>('Kelas 4 SD');
  const [maMapel, setMaMapel] = useState('IPAS');
  const [maTopik, setMaTopik] = useState('Wujud Zat dan Perubahannya');
  const [maWaktu, setMaWaktu] = useState('2 Pertemuan (5 JP x 35 Menit)');

  // Hierarki Capaian Kurikulum
  const [maCp, setMaCp] = useState('');
  const [maAtp, setMaAtp] = useState('');
  const [maTpIktp, setMaTpIktp] = useState('');

  // Model & Karakter
  const [maModel, setMaModel] = useState('Problem-Based Learning (PBL)');
  const [maProfilLulusan, setMaProfilLulusan] = useState<string[]>([
    'Penalaran kritis',
    'Kreativitas',
    'Kolaborasi dan kemandirian'
  ]);

  // Diferensiasi & Kesiapan
  const [maDiferensiasi, setMaDiferensiasi] = useState('Konten & Proses (Visual, Auditori, Kinestetik)');
  const [maKesiapan, setMaKesiapan] = useState('Sebagian besar siswa sudah mengenal wujud padat dan cair, namun belum memahami konsep perubahan wujud gas dan menyublim.');

  // Fasilitas, Penilaian & Output
  const [maSarpras, setMaSarpras] = useState('LCD Proyektor, Benda konkret sekitar, LKPD cetak');
  const [maBentukAsesmen, setMaBentukAsesmen] = useState<string[]>([
    'Asesmen Awal / Diagnostik',
    'Formatif: LKPD / Tes Tertulis',
    'Sumatif'
  ]);
  const [maKedalamanOutput, setMaKedalamanOutput] = useState<'Lengkap' | 'Ringkas'>('Lengkap');
  const [maTargetDokumen, setMaTargetDokumen] = useState<'Teks Biasa' | 'DOCX' | 'PDF'>('DOCX');

  // Handler Perubahan Fase Cascading
  const handleFaseChange = (newFase: 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D') => {
    setMaFase(newFase);
    const classes = faseKelasOptions[newFase] || [];
    setMaKelas(classes[0] || '');
  };

  // Handler Multi-Select Profil Lulusan (Maksimal 3)
  const handleToggleProfil = (item: string) => {
    if (maProfilLulusan.includes(item)) {
      setMaProfilLulusan(maProfilLulusan.filter(p => p !== item));
    } else {
      if (maProfilLulusan.length < 3) {
        setMaProfilLulusan([...maProfilLulusan, item]);
      }
    }
  };

  // Handler Multi-Select Bentuk Asesmen
  const handleToggleAsesmen = (item: string) => {
    if (maBentukAsesmen.includes(item)) {
      setMaBentukAsesmen(maBentukAsesmen.filter(a => a !== item));
    } else {
      setMaBentukAsesmen([...maBentukAsesmen, item]);
    }
  };

  // 2. LKPD
  const [lkpdFase, setLkpdFase] = useState<'Fase A' | 'Fase B' | 'Fase C' | 'Fase D'>('Fase B');
  const [lkpdKelas, setLkpdKelas] = useState<string>('Kelas 4 SD');
  const [lkpdMapel, setLkpdMapel] = useState<string>('IPAS');
  const [lkpdWaktu, setLkpdWaktu] = useState<string>('35 Menit (1 JP)');
  const [lkpdTopik, setLkpdTopik] = useState<string>('Eksplorasi Perubahan Energi di Sekitar Kita');
  const [lkpdTp, setLkpdTp] = useState<string>('Peserta didik mampu mengidentifikasi ragam perubahan bentuk energi dalam kehidupan sehari-hari melalui pengamatan dan percobaan kontekstual.');
  const [lkpdDiferensiasi, setLkpdDiferensiasi] = useState<string>('Reguler (Satu Format Standar)');
  const [lkpdTipeAktivitas, setLkpdTipeAktivitas] = useState<string>('Eksperimen / Pengamatan Nyata');
  const [lkpdModel, setLkpdModel] = useState<string>('Kelompok Kolaboratif (4-5 Siswa)');
  const [lkpdAlatBahan, setLkpdAlatBahan] = useState<string>('Stoples kaca, air panas, es batu, lingkungan halaman');
  const [lkpdPetunjuk, setLkpdPetunjuk] = useState<string>('Gunakan alat dan bahan sederhana yang ada di kelas/halaman sekolah. Amati dengan cermat dan catat pada tabel pengamatan.');
  const [lkpdKelengkapan, setLkpdKelengkapan] = useState<string[]>([
    'Sertakan Kunci Jawaban Lengkap',
    'Sertakan Rubrik Penilaian & Kriteria Skor'
  ]);
  const [lkpdFormatDokumen, setLkpdFormatDokumen] = useState<'Word' | 'Markdown'>('Word');

  // Handler Perubahan Fase Cascading untuk LKPD
  const handleLkpdFaseChange = (newFase: 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D') => {
    setLkpdFase(newFase);
    const classes = faseKelasOptions[newFase] || [];
    setLkpdKelas(classes[0] || '');
  };

  // Handler Toggle Kelengkapan Penilaian LKPD
  const handleToggleLkpdKelengkapan = (item: string) => {
    if (lkpdKelengkapan.includes(item)) {
      setLkpdKelengkapan(lkpdKelengkapan.filter(k => k !== item));
    } else {
      setLkpdKelengkapan([...lkpdKelengkapan, item]);
    }
  };

  // 3. Kisi-Kisi & Soal
  const [soalTipe, setSoalTipe] = useState('Sumatif Akhir Semester (SAS)');
  const [soalFase, setSoalFase] = useState<'Fase A' | 'Fase B' | 'Fase C' | 'Fase D'>('Fase C');
  const [soalKelas, setSoalKelas] = useState('Kelas 5 SD');
  const [soalMapel, setSoalMapel] = useState('Bahasa Indonesia');
  const [soalWaktu, setSoalWaktu] = useState('90 Menit');
  const [soalCpTp, setSoalCpTp] = useState('Peserta didik mampu menganalisis ide pokok dan informasi tersirat dalam teks eksplanasi ilmiah serta menyusun simpulan logis.');
  const [soalMateri, setSoalMateri] = useState('Menganalisis Teks Eksplanasi & Ide Pokok Paragraf');
  const [soalJumlah, setSoalJumlah] = useState<number>(10);
  const [soalLevelPreset, setSoalLevelPreset] = useState('L1: 30%, L2: 40%, L3: 30% (HOTS Standar)');
  const [soalBentukList, setSoalBentukList] = useState<string[]>([
    'Pilihan Ganda',
    'Pilihan Ganda Kompleks',
    'Uraian'
  ]);
  const [soalKelengkapan, setSoalKelengkapan] = useState<string[]>([
    'Kunci Jawaban Lengkap',
    'Pembahasan & Analisis Pengecoh/Distraktor',
    'Pedoman Penskoran / Rubrik Uraian'
  ]);
  const [soalFormatDokumen, setSoalFormatDokumen] = useState<'Word' | 'Markdown'>('Word');

  // Handler Perubahan Fase Cascading untuk Soal
  const handleSoalFaseChange = (newFase: 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D') => {
    setSoalFase(newFase);
    const classes = faseKelasOptions[newFase] || [];
    setSoalKelas(classes[0] || '');
  };

  // Handler Toggle Bentuk Soal
  const handleToggleSoalBentuk = (item: string) => {
    if (soalBentukList.includes(item)) {
      if (soalBentukList.length > 1) {
        setSoalBentukList(soalBentukList.filter(b => b !== item));
      }
    } else {
      setSoalBentukList([...soalBentukList, item]);
    }
  };

  // Handler Toggle Kelengkapan Kartu Soal
  const handleToggleSoalKelengkapan = (item: string) => {
    if (soalKelengkapan.includes(item)) {
      setSoalKelengkapan(soalKelengkapan.filter(k => k !== item));
    } else {
      setSoalKelengkapan([...soalKelengkapan, item]);
    }
  };

  // 4. Rubrik & IKTP Rapor
  const [rubrikTp, setRubrikTp] = useState('Peserta didik mampu membandingkan siklus hidup mahluk hidup dan upaya pelestariannya');
  const [rubrikIktp, setRubrikIktp] = useState('Menjelaskan tahap metamorfosis sempurna dan tidak sempurna serta membuat skema daur hidup kupu-kupu');
  const [rubrikSkala, setRubrikSkala] = useState('4 Interval: Perlu Bimbingan (0-60), Cukup (61-75), Baik (76-88), Sangat Baik (89-100)');
  const [rubrikGaya, setRubrikGaya] = useState('Naratif Apresiatif Berdasarkan Capaian Tertinggi dan Rekomendasi Peningkatan');

  // 5. Modul Kokurikuler (Deep Learning)
  const [kokuFase, setKokuFase] = useState<'Fase A' | 'Fase B' | 'Fase C' | 'Fase D'>('Fase B');
  const [kokuKelas, setKokuKelas] = useState('Kelas 4 SD');
  const [kokuSekolah, setKokuSekolah] = useState('SD Negeri 1 Nusantara');
  const [kokuFasilitator, setKokuFasilitator] = useState('Tim Fasilitator Kelas 4 & Guru Mapel');
  const [kokuTema, setKokuTema] = useState('Gaya Hidup Berkelanjutan');
  const [kokuJudul, setKokuJudul] = useState('Kelola Sampah Plastik Menjadi Harta Karun Kelas (Eco-Brick)');
  const [kokuIsu, setKokuIsu] = useState('Banyaknya bungkus makanan ringan plastik yang berserakan di kantin dan selokan sekolah saat jam istirahat.');
  const [kokuProfilList, setKokuProfilList] = useState<string[]>([
    'Kreativitas',
    'Kolaborasi dan kemandirian',
    'Penalaran kritis'
  ]);
  const [kokuTujuan, setKokuTujuan] = useState('Membangun kesadaran lingkungan murid untuk mengurangi sampah plastik sekali pakai dan menumbuhkan daya kreasi bernilai guna secara kolaboratif.');
  const [kokuAlur, setKokuAlur] = useState('4 Tahap Standar: Pengenalan - Kontekstualisasi - Aksi - Refleksi & Tindak Lanjut');
  const [kokuProduk, setKokuProduk] = useState('Pameran Karya Daur Ulang & Kampanye Pilah Sampah Kelas');
  const [kokuDurasi, setKokuDurasi] = useState('24 Jam Pelajaran (4 Pekan)');
  const [kokuAsesmen, setKokuAsesmen] = useState<string[]>([
    'Rubrik Observasi Profil Lulusan',
    'Lembar Refleksi Diri Siswa',
    'Rubrik Asesmen Aksi Akhir / Produk'
  ]);
  const [kokuFormatDokumen, setKokuFormatDokumen] = useState<'Word' | 'Markdown'>('Word');

  // Handler Perubahan Fase Cascading untuk Kokurikuler
  const handleKokuFaseChange = (newFase: 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D') => {
    setKokuFase(newFase);
    const classes = faseKelasOptions[newFase] || [];
    setKokuKelas(classes[0] || '');
  };

  // Handler Toggle Profil Kokurikuler (Maksimal 3)
  const handleToggleKokuProfil = (item: string) => {
    if (kokuProfilList.includes(item)) {
      if (kokuProfilList.length > 1) {
        setKokuProfilList(kokuProfilList.filter(p => p !== item));
      }
    } else {
      if (kokuProfilList.length < 3) {
        setKokuProfilList([...kokuProfilList, item]);
      }
    }
  };

  // Handler Toggle Asesmen Kokurikuler
  const handleToggleKokuAsesmen = (item: string) => {
    if (kokuAsesmen.includes(item)) {
      setKokuAsesmen(kokuAsesmen.filter(a => a !== item));
    } else {
      setKokuAsesmen([...kokuAsesmen, item]);
    }
  };

  // 6. Refleksi & Feedback
  const [fbFase, setFbFase] = useState<'Fase A' | 'Fase B' | 'Fase C' | 'Fase D'>('Fase B');
  const [fbKelas, setFbKelas] = useState('Kelas 4 SD');
  const [fbPenerima, setFbPenerima] = useState('Individu Siswa');
  const [fbAktivitas, setFbAktivitas] = useState('Presentasi Laporan Pengamatan Sains Mandiri');
  const [fbProfil, setFbProfil] = useState('Penalaran kritis');
  const [fbFokus, setFbFokus] = useState('Penalaran Kritis & Kejelasan Penyampaian');
  const [fbKekuatan, setFbKekuatan] = useState('Murid mampu menyajikan data pengamatan secara runtut, percaya diri saat berbicara, dan menjawab pertanyaan teman dengan santun.');
  const [fbAreaTingkat, setFbAreaTingkat] = useState('Masih terburu-buru saat menarik kesimpulan akhir dan belum menyertakan bukti/alasan pendukung dari hasil eksperimen.');
  const [fbNadaBahasa, setFbNadaBahasa] = useState('Hangat & Menguatkan');
  const [fbFormatLuaran, setFbFormatLuaran] = useState('Catatan Lembar Kerja / Buku Tugas (Ringkas & Langsung)');

  // Handler Perubahan Fase Cascading untuk Feedback
  const handleFbFaseChange = (newFase: 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D') => {
    setFbFase(newFase);
    const classes = faseKelasOptions[newFase] || [];
    setFbKelas(classes[0] || '');
  };

  // 7. Desain Atribut Kelas
  const [atrFase, setAtrFase] = useState<'Fase A' | 'Fase B' | 'Fase C' | 'Fase D'>('Fase B');
  const [atrKelas, setAtrKelas] = useState('Kelas 4 SD');
  const [atrSekolah, setAtrSekolah] = useState('SDN Cinanggerang I - Kelas 4B');
  const [atrKategori, setAtrKategori] = useState('Keyakinan / Kesepakatan Kelas Interaktif');
  const [atrJudul, setAtrJudul] = useState('Keyakinan Kelas Kita 4B');
  const [atrKonten, setAtrKonten] = useState(`1. Saling menghargai pendapat teman saat berdiskusi
2. Menjaga kebersihan dan kerapian ruang kelas bersama
3. Berbicara dengan santun dan ramah
4. Berani mencoba dan tidak takut berbuat salah untuk belajar
5. Mendengarkan saat guru atau teman sedang berbicara`);
  const [atrTemaVisual, setAtrTemaVisual] = useState('Ceria & Penuh Warna');
  const [atrUkuran, setAtrUkuran] = useState('Poster Tegak A3/A4 (Portrait)');
  const [atrFormatLuaran, setAtrFormatLuaran] = useState<'Canva' | 'ImageAI'>('Canva');

  // Handler Perubahan Fase Cascading untuk Atribut Kelas
  const handleAtrFaseChange = (newFase: 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D') => {
    setAtrFase(newFase);
    const classes = faseKelasOptions[newFase] || [];
    setAtrKelas(classes[0] || '');
  };

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
      buildPrompt: () => {
        const isSmp = maFase === 'Fase D';
        const jenjangLabel = isSmp ? 'Sekolah Menengah Pertama (SMP)' : 'Sekolah Dasar (SD)';
        const roleLabel = `Pakar Kurikulum dan Desainer Modul Ajar Berdiferensiasi ${jenjangLabel} berstandar nasional`;

        // Adaptasi Kognitif Sesuai Fase
        const adaptasiKognitif = isSmp 
          ? 'Gunakan pendekatan pedagogik remaja Fase D (SMP): rancang aktivitas berbasis analisis studi kasus kontekstual, penyelidikan mandiri, dialektika diskusi kelompok, dan penalaran tingkat tinggi (HOTS) yang menantang rasa ingin tahu remaja.'
          : `Gunakan pendekatan pedagogik anak ${maFase} (SD): gunakan instruksi konkret, bertahap, visual, komunikatif, dan ramah anak yang menumbuhkan rasa ingin tahu serta kegembiraan belajar.`;

        // Instruksi Format Output Dokumen & Tipografi
        let instruksiDokumen = '';
        if (maTargetDokumen === 'DOCX') {
          instruksiDokumen = `PANDUAN DOKUMEN WORD (.DOCX) SIAP PAKAI:
- Gunakan struktur heading formal (Heading 1 untuk judul bagian, Heading 2 untuk sub-bagian) yang siap dikonversi ke Microsoft Word.
- Terapkan format teks Rata Kanan-Kiri (Justify) dengan tata bahasa baku bahasa Indonesia yang lugas dan profesional.
- Sajikan semua format rubrik, kisi-kisi IKTP, dan lembar aktivitas dalam tabel bergaris rapi (clean grid table).
- Sematkan penanda jelas [PAGE BREAK SEBELUM LAMPIRAN] agar pemisahan Modul Inti, LKPD, dan Lembar Asesmen rapi saat dicetak.`;
        } else if (maTargetDokumen === 'PDF') {
          instruksiDokumen = `PANDUAN FORMAT CETAK / PDF SIAP PAKAI:
- Tata letak dioptimalkan untuk ukuran kertas standar A4 dengan margin seimbang (standar 3-3-3-3 cm).
- Terapkan perataan teks Justify (rata kanan-kiri), spasi baris 1.15 yang lega, dan penomoran hierarkis berjenjang (1., A., 1), a)).
- Desain tabel asesmen dan lembar kerja dibuat ringkas, hemat halaman, dan ramah cetak hitam-putih maupun warna.`;
        } else {
          instruksiDokumen = `PANDUAN SALIN TEKS BIASA (MARKDOWN):
- Sajikan dalam format Markdown standar yang bersih, rapi, dan konsisten tanpa simbol formatting yang berantakan.
- Gunakan penomoran bertingkat yang runut dan perataan paragraf yang teratur sehingga nyaman dibaca di layar maupun langsung disalin ke editor tulisan.`;
        }

        return `Sebagai seorang ${roleLabel}, buatkan rancangan Modul Ajar Kurikulum Merdeka yang lengkap, mendalam, operasional, dan siap diterapkan di kelas dengan spesifikasi berikut:

1. IDENTITAS MODUL
- Jenjang & Sasaran: ${maFase} (${maKelas}) - ${jenjangLabel}
- Mata Pelajaran: ${maMapel}
- Materi / Topik Pokok: ${maTopik}
- Alokasi Waktu: ${maWaktu}
- Model Pembelajaran: ${maModel}

2. HIERARKI CAPAIAN KURIKULUM & TARGET TUJUAN
${maCp ? `- Capaian Pembelajaran (CP) / Elemen: ${maCp}` : '- Capaian Pembelajaran (CP): Rumuskan CP & Elemen CP yang relevan secara komprehensif.'}
${maAtp ? `- Alur Tujuan Pembelajaran (ATP) / Ruang Lingkup: ${maAtp}` : '- Alur Tujuan Pembelajaran (ATP): Petakan ruang lingkup materi pembelajaran pertemuan ini.'}
${maTpIktp ? `- Tujuan Pembelajaran (TP) & IKTP: ${maTpIktp}` : '- Tujuan Pembelajaran (TP): Rumuskan TP spesifik berbasis ABCD (Audience, Behavior, Condition, Degree) dan Kriteria Ketercapaiannya (IKTP).'}

3. TARGET 8 PROFIL LULUSAN & PENGUATAN KARAKTER
- Dimensi Profil Lulusan yang Dikembangkan (${maProfilLulusan.length} Dimensi Terpilih):
${maProfilLulusan.map(p => `  * ${p}`).join('\n')}
(Wajib diintegrasikan secara eksplisit dalam pembiasaan dan tahapan aktivitas belajar murid).

4. FASILITAS, MEDIA & KESIAPAN BELAJAR
- Sarana, Prasarana & Media Ajar: ${maSarpras}
- Pendekatan Diferensiasi: ${maDiferensiasi}
- Catatan Kesiapan Siswa: ${maKesiapan}
- Integrasi Diferensiasi Nyata: Konversikan catatan kesiapan siswa di atas menjadi strategi scaffolding terukur (panduan bimbingan bertingkat bagi siswa yang butuh bantuan) dan tantangan pengayaan mandiri bagi siswa mahir di langkah kegiatan inti.

5. SINTAKS & SKENARIO PEMBELAJARAN
- Adaptasi Kognitif: ${adaptasiKognitif}
- Langkah Pembelajaran Inti: WAJIB mengikuti sintaks resmi model pembelajaran ${maModel}:
  A. Pendahuluan (15 Menit): Apersepsi kontekstual, pertanyaan pemantik bermakna, motivasi, dan asesmen awal diagnostik singkat.
  B. Kegiatan Inti: Skenario operasional langkah demi langkah sesuai sintaks ${maModel} yang memadukan Diferensiasi Konten, Diferensiasi Proses (scaffolding vs pengayaan), dan Diferensiasi Produk.
  C. Penutup (15 Menit): Refleksi belajar 3-2-1, apresiasi proses, penguatan profil karakter, dan rencana tindak lanjut.

6. EVALUASI, INSTRUMEN ASESMEN & KEDALAMAN OUTPUT
- Kedalaman Dokumen: ${maKedalamanOutput === 'Lengkap' ? 'Lengkap (Modul Inti + LKPD Siswa Siap Pakai + Rubrik Asesmen Deskriptif)' : 'Ringkas (1–2 Halaman Padat Fokus Skenario Pembelajaran)'}
- Bentuk Asesmen yang Wajib Dirancang:
${maBentukAsesmen.map(a => `  * ${a}`).join('\n')}
- Kriteria Ketercapaian Tujuan Pembelajaran (IKTP) disajikan dalam format rubrik interval deskriptif (Perlu Bimbingan, Cukup, Baik, Sangat Baik).
${maKedalamanOutput === 'Lengkap' ? '- Lampirkan draf LKPD siswa yang interaktif dan lembar tindak lanjut (remedial & pengayaan).' : ''}

7. STANDAR FORMAT DOKUMEN & TATA LETAK
${instruksiDokumen}

Sajikan dalam bahasa Indonesia baku yang mengalir, terstruktur dengan penomoran rapi, perataan rapi (justify), dan langsung siap pakai oleh pendidik.`;
      }
    },
    {
      id: 1,
      pilar: 'Pilar 2: Lembar Kerja',
      name: 'Generator LKPD Kontekstual & PBL',
      icon: FileText,
      color: 'emerald',
      badge: 'Eksplorasi Siswa',
      buildPrompt: () => {
        const isSmp = lkpdFase === 'Fase D';
        const jenjangLabel = isSmp ? 'Sekolah Menengah Pertama (SMP)' : 'Sekolah Dasar (SD)';
        const roleLabel = `Pakar Desain Asesmen Autentik & Lembar Kerja Berdiferensiasi ${jenjangLabel} berstandar pedagogis tinggi`;

        // Adaptasi Kognitif Sesuai Jenjang
        const adaptasiKognitif = isSmp
          ? 'Gunakan pendekatan pedagogik remaja Fase D (SMP): rancang analisis data logis, studi kasus pemecahan masalah dunia nyata remaja, instruksi inferensi kritis, dan pertanyaan penalaran tingkat tinggi (HOTS) yang memancing daya pikir kritis siswa.'
          : `Gunakan pendekatan ramah anak ${lkpdFase} (SD): gunakan bahasa yang sederhana, mudah dipahami anak, instruksi konkret tahap demi tahap, tabel pengamatan visual yang luas dan rapi, serta berorientasi pada eksplorasi objek nyata di lingkungan sekitar murid.`;

        // Panduan Format Dokumen
        const panduanFormat = lkpdFormatDokumen === 'Word'
          ? `PANDUAN FORMAT MICROSOFT WORD READY:
- Rancang struktur lembar kerja siswa dengan perataan rapi (Justify) dan tabel bergaris bersih (clean grid table).
- Sematkan penanda tegas [PAGE BREAK LEMBAR GURU] sebelum Kunci Jawaban & Rubrik agar lembar kerja peserta didik dapat langsung dipisahkan dan dicetak tanpa menyertakan kunci jawaban.`
          : `PANDUAN FORMAT TEKS MARKDOWN:
- Sajikan dalam sintaks Markdown baku, format tabel terstruktur rapi, dan hierarki heading yang teratur, siap disalin langsung ke editor penulisan atau dokumen kerja.`;

        // Logika Mode Diferensiasi
        const isDiferensiasi3Tier = lkpdDiferensiasi.includes('Berdiferensiasi 3 Tingkat');
        const instruksiDiferensiasi = isDiferensiasi3Tier
          ? `STRUKTUR LKPD BERDIFERENSIASI (3 TINGKATAN / TIER):
Rancang LKPD dengan 3 variasi tingkat scaffolding/tantangan berjenjang:
1. TIER 1 (Bimbingan / Scaffolding): Panduan investigasi langkah demi langkah dengan kalimat bantuan (sentence starters), panduan gambar/tabel terbimbing, khusus bagi murid yang membutuhkan pendampingan intensif.
2. TIER 2 (Reguler / Standar): Format penyelidikan standar yang menuntut kemandirian sesuai alur tujuan pembelajaran yang ditetapkan.
3. TIER 3 (Pengayaan / HOTS): Tantangan investigasi terbuka (open-ended inquiry), pertanyaan transfer konsep baru, dan analisis kritis mendalam bagi murid yang telah mahir.`
          : `STRUKTUR LKPD REGULER:
Rancang satu format lembar kerja siswa yang komprehensif, terstruktur, ramah peserta didik, dan menumbuhkan kolaborasi aktif seluruh siswa di kelas.`;

        // Lampiran Penilaian Guru
        const lampiranGuru = [];
        if (lkpdKelengkapan.includes('Sertakan Kunci Jawaban Lengkap')) {
          lampiranGuru.push('A. KUNCI JAWABAN LENGKAP & PEMBAHASAN: Solusi tuntas setiap pertanyaan, alternatif respon siswa, dan tips verifikasi jawaban bagi guru.');
        }
        if (lkpdKelengkapan.includes('Sertakan Rubrik Penilaian & Kriteria Skor')) {
          lampiranGuru.push('B. PEDOMAN RUBRIK PENILAIAN AUTENTIK: Kriteria penilaian kinerja dan IKTP (Perlu Bimbingan, Cukup, Baik, Sangat Baik) beserta deskriptor ketercapaian dan panduan skor maksimal.');
        }

        return `Sebagai seorang ${roleLabel}, rancanglah sebuah Lembar Kerja Peserta Didik (LKPD) yang menarik, interaktif, kontekstual, ramah peserta didik, dan siap cetak dengan rincian berikut:

1. IDENTITAS LKPD
- Jenjang & Sasaran: ${lkpdFase} (${lkpdKelas}) - ${jenjangLabel}
- Mata Pelajaran: ${lkpdMapel}
- Topik / Fokus Aktivitas: ${lkpdTopik}
- Estimasi Waktu Pengerjaan: ${lkpdWaktu}
- Format Belajar Siswa: ${lkpdModel}
- Tipe Aktivitas: ${lkpdTipeAktivitas}
- Mode Diferensiasi: ${lkpdDiferensiasi}

2. TARGET TUJUAN & KEBUTUHAN PRAKTIK
- Tujuan Pembelajaran (TP) yang Diukur: ${lkpdTp}
- Ketersediaan Alat & Bahan: ${lkpdAlatBahan}
- Petunjuk Belajar Siswa: ${lkpdPetunjuk}

3. TATA LETAK & ANATOMI LKPD STANDAR
LKPD wajib disusun dengan urutan tata letak operasional berikut:
- BAGIAN 1: HEADER IDENTITAS SISWA
  Menampilkan kolom isian formal: Nama Siswa / Nama Kelompok & Anggota, Kelas/Fase, Mata Pelajaran, Hari/Tanggal, dan Alokasi Waktu.
- BAGIAN 2: JUDUL MENARIK & PETUNJUK KERJA
  Judul kontekstual ramah anak dan petunjuk operasional pelaksanaan aktivitas.
- BAGIAN 3: STIMULUS & KONTEKS PEMANTIK
  Cerita pendek dunia nyata / fenomena alam sekitar / ilustrasi pemantik yang memicu keingintahuan siswa.
- BAGIAN 4: LANGKAH EKSPLORASI & TABEL KERJA SISWA
  Rangkaian langkah kerja runtut, tabel pengamatan terstruktur, kotak isian data, serta ruang untuk menuangkan sketsa/jawaban.
- BAGIAN 5: ANALISIS, REFLEKSI & KESIMPULAN
  Pertanyaan reflektif untuk memandu siswa merumuskan kesimpulan secara mandiri atau kelompok.

4. PENDEKATAN PEDAGOGIS & ADAPTASI KOGNITIF
- Adaptasi Kognitif: ${adaptasiKognitif}
- ${instruksiDiferensiasi}

${lampiranGuru.length > 0 ? `5. LAMPIRAN KHUSUS GURU (DILETAKKAN SETELAH LEMBAR SISWA)
${lampiranGuru.join('\n')}` : ''}

6. STANDAR FORMAT DOKUMEN & TATA LETAK
${panduanFormat}
- Gunakan bahasa Indonesia baku, komunikatif, jelas, dan ramah anak.
- Pastikan seluruh tabel dan kotak pengamatan berjarak proporsional dan mudah ditulis oleh siswa saat dicetak.`;
      }
    },
    {
      id: 2,
      pilar: 'Pilar 3: Kisi-Kisi & Soal',
      name: 'Generator Kisi-Kisi & Kartu Soal AKM/TKA',
      icon: Layers,
      color: 'purple',
      badge: 'HOTS & AKM',
      buildPrompt: () => {
        const isSmp = soalFase === 'Fase D';
        const jenjangLabel = isSmp ? 'Sekolah Menengah Pertama (SMP)' : 'Sekolah Dasar (SD)';
        const roleLabel = `Asesor Evaluasi Pendidikan, Pengembang Butir Soal Terstandar, dan Pakar Psikometri Jenjang ${jenjangLabel}`;

        // Kaidah Bahasa & Stimulus Berdasarkan Jenjang
        const kaidahBahasa = isSmp
          ? 'Gunakan stimulus berbasis isu kekinian, fenomena sains/sosial kontekstual, data tabel/grafik ilmiah, teks bacaan analitis, serta pokok soal yang menuntut penalaran logis, interpretasi data, dan inferensi kritis khas remaja SMP.'
          : `Gunakan stimulus konkret berbasis lingkungan keseharian anak ${soalFase} (SD), kalimat efektif yang ringkas, bahasa ramah anak, bebas bias SARA/gender/latar belakang, dan ilustrasi situasi nyata yang mudah divisualisasikan oleh siswa SD.`;

        // Format Dokumen Panduan
        const panduanFormat = soalFormatDokumen === 'Word'
          ? `PANDUAN FORMAT MICROSOFT WORD READY:
- Seluruh Matriks Kisi-Kisi dan Kartu Soal disajikan dalam format tabel bergaris rapi (clean grid table).
- Sematkan penanda tegas [PAGE BREAK ANTARA KISI-KISI & KARTU SOAL] agar dokumen kisi-kisi dan paket naskah soal ujian dapat dicetak terpisah secara rapi.`
          : `PANDUAN FORMAT TEKS MARKDOWN:
- Sajikan dengan sintaks Markdown rapi, hierarki heading bertingkat yang konsisten, dan tabel Markdown teratur siap disalin ke aplikasi pengolah kata.`;

        // Kelengkapan Kartu Soal
        const kelengkapanInstruksi = [];
        if (soalKelengkapan.includes('Kunci Jawaban Lengkap')) {
          kelengkapanInstruksi.push('- Kunci Jawaban Lengkap: Cantumkan kunci jawaban definitif untuk setiap nomor butir soal.');
        }
        if (soalKelengkapan.includes('Pembahasan & Analisis Pengecoh/Distraktor')) {
          kelengkapanInstruksi.push('- Pembahasan & Analisis Distraktor: Uraikan alasan ilmiah kebenaran kunci jawaban serta analisis mengapa opsi pengecoh dipilih oleh siswa yang mengalami miskonsepsi.');
        }
        if (soalKelengkapan.includes('Pedoman Penskoran / Rubrik Uraian')) {
          kelengkapanInstruksi.push('- Pedoman Penskoran & Rubrik: Cantumkan pembobotan skor dan rubrik penskoran analitik (kata kunci jawaban, tahapan solusi, dan kriteria skor per langkah).');
        }

        return `Bertindaklah sebagai ${roleLabel}. Buatkan dokumen Matriks Kisi-Kisi Ujian dan Kartu Naskah Butir Soal terstandar nasional yang komprehensif, valid, dan reliabel dengan spesifikasi berikut:

1. PARAMETER ASESMEN
- Jenis Asesmen / Ujian: ${soalTipe}
- Jenjang & Sasaran: ${soalFase} (${soalKelas}) - ${jenjangLabel}
- Mata Pelajaran: ${soalMapel}
- Alokasi Waktu Pengerjaan: ${soalWaktu}
- Capaian Pembelajaran / TP yang Diuji: ${soalCpTp}
- Lingkup Materi Pokok: ${soalMateri}
- Target Jumlah Butir Soal: ${soalJumlah} Butir
- Sebaran Level Kognitif: ${soalLevelPreset}
- Variasi Bentuk Soal: ${soalBentukList.join(', ')}

2. STANDAR PENULISAN INDIKATOR SOAL OPERASIONAL
Setiap butir pada kisi-kisi WAJIB dirumuskan menggunakan kaidah operasional ABCD:
- A (Audience): Subjek peserta didik jenjang sasaran.
- B (Behavior): Kata Kerja Operasional (KKO) Taksonomi Bloom revisi yang terukur sesuai level kognitif (L1/L2/L3).
- C (Condition): Stimulus kontekstual nyata (wacana teks, data tabel, grafik, dialog, atau studi kasus).
- D (Degree): Tingkat akurasi atau ketuntasan hasil kerja siswa.

3. DOKUMEN 1: TABEL MATRIKS KISI-KISI SOAL
Buatkan tabel matriks kisi-kisi lengkap sebanyak ${soalJumlah} butir dengan struktur kolom standar kedinasan:
| No | Capaian Pembelajaran / TP | Materi Pokok | Indikator Soal (Operasional ABCD) | Bentuk Soal | Level Kognitif (L1/L2/L3) | Nomor Soal | Bobot Skor |

4. DOKUMEN 2: KARTU NASKAH BUTIR SOAL TERSTANDAR
Susun seluruh butir soal (No. 1 s.d. ${soalJumlah}) dalam format Kartu Soal individual yang memuat:
A. IDENTITAS BUTIR: Nomor Soal, Bentuk Soal, Level Kognitif (L1/L2/L3), dan Kunci Jawaban Singkat.
B. STIMULUS: Wacana kontekstual, studi kasus, atau data tabel yang kaya informasi dan mendasari pertanyaan.
C. RUMUSAN BUTIR SOAL (STEM): Pokok soal jelas, tegas, tidak menimbulkan penafsiran ganda, dan menghindari kalimat negatif ganda.
D. OPSI JAWABAN / RUANG JAWABAN:
   - Untuk PG / PG Kompleks: Opsi homogen, logis, dan panjang kalimat relatif setara.
   - Untuk Menjodohkan / Isian / Uraian: Instruksi eksplisit dan ruang pengerjaan terarah.
${kelengkapanInstruksi.length > 0 ? `E. ELEMEN EVALUASI GURU:\n${kelengkapanInstruksi.join('\n')}` : ''}

5. KAIDAH BAHASA & PSIKOMETRI BERDASARKAN SASARAN
- Karakter Stimulus & Bahasa: ${kaidahBahasa}
- Proporsi sebaran level (${soalLevelPreset}) dan variasi bentuk soal (${soalBentukList.join(', ')}) wajib tercermin secara presisi pada pembagian butir soal.

6. STANDAR FORMAT DOKUMEN & TATA LETAK
${panduanFormat}
- Pastikan seluruh tabel terformat rapi dan teks disajikan dalam bahasa Indonesia yang baku, lugas, dan profesional.`;
      }
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
      buildPrompt: () => {
        const isSmp = kokuFase === 'Fase D';
        const jenjangLabel = isSmp ? 'Sekolah Menengah Pertama (SMP)' : 'Sekolah Dasar (SD)';
        const roleLabel = `Fasilitator Projek Pendidikan, Konsultan Pembelajaran Berbasis Pengalaman Autentik, dan Ahli Pengembangan Karakter ${jenjangLabel}`;

        // Panduan Format Dokumen
        const panduanFormat = kokuFormatDokumen === 'Word'
          ? `PANDUAN DOKUMEN MICROSOFT WORD (.DOCX) READY:
- Seluruh tabel aktivitas, pemetaan profil, dan rubrik disajikan dalam tabel bergaris rapi (clean grid table).
- Sematkan penanda tegas [PAGE BREAK ANTAR KOMPONEN PROJEK] sebelum Lampiran Instrumen agar dapat dicetak terpisah secara rapi.`
          : `PANDUAN FORMAT TEKS MARKDOWN:
- Sajikan dokumen dengan sintaks Markdown standar yang rapi, hierarki heading bertingkat yang konsisten, dan format tabel siap disalin.`;

        // Asesmen yang Dicentang
        const asesmenInstruksi = [];
        if (kokuAsesmen.includes('Rubrik Observasi Profil Lulusan')) {
          asesmenInstruksi.push('A. LEMBAR OBSERVASI & RUBRIK PERKEMBANGAN KARAKTER: Rubrik 4 skala perkembangan (Mulai Berkembang / MB, Sedang Berkembang / SB, Berkembang Sesuai Harapan / BSH, Sangat Berkembang / SAB) untuk setiap sub-elemen profil terpilih.');
        }
        if (kokuAsesmen.includes('Lembar Refleksi Diri Siswa')) {
          asesmenInstruksi.push('B. LEMBAR JURNAL & REFLEKSI DIRI SISWA: Instrumen refleksi harian/berkala yang memuat pertanyaan pemantik introspektif, perasaan anak, dan komitmen aksi nyata.');
        }
        if (kokuAsesmen.includes('Rubrik Asesmen Aksi Akhir / Produk')) {
          asesmenInstruksi.push('C. RUBRIK PENILAIAN HASIL AKSI NYATA / PRODUK: Kriteria evaluasi keaslian ide, manfaat nyata untuk lingkungan/sekolah, kerja sama kelompok, dan kualitas pameran/presentasi karya.');
        }

        return `Sebagai seorang ${roleLabel}, rancanglah Modul Projek Kokurikuler Sekolah (${jenjangLabel}) berbasis Deep Learning dan Penguatan Karakter Profil Pelajar yang memenuhi standar format baku operasional berikut:

1. IDENTITAS & SASARAN PROJEK
- Satuan Pendidikan: ${kokuSekolah}
- Tim Fasilitator: ${kokuFasilitator}
- Sasaran: ${kokuFase} (${kokuKelas}) - ${jenjangLabel}
- Tema Projek: ${kokuTema}
- Topik / Judul Projek: ${kokuJudul}
- Alokasi Durasi Waktu: ${kokuDurasi}
- Relevansi Isu Nyata Lingkungan: ${kokuIsu}

2. TUJUAN & TARGET PROFIL LULUSAN
- Tujuan Utama Projek: ${kokuTujuan}
- Fokus Profil Lulusan (${kokuProfilList.length} Dimensi Terpilih):
${kokuProfilList.map(p => `  * ${p}`).join('\n')}
(Petakan secara sistematis Dimensi, Elemen, Sub-Elemen, dan Target Capaian Akhir Fase yang diharapkan berkembang pada diri murid).

3. ALUR OPERASIONAL AKTIVITAS PROJEK
- Kerangka Alur: ${kokuAlur}
Susun rincian alur aktivitas per tahap secara runtut dan mendalam:
A. TAHAP PENGENALAN (Building Empathy & Context):
   - Aktivitas menggali wawasan seputar isu ${kokuIsu}, stimulasi film/observasi sekitar sekolah, dan pemantik dialog kritis.
B. TAHAP KONTEKSTUALISASI (Field Investigation):
   - Investigasi lapangan di lingkungan sekolah/sekitar, pengumpulan data nyata, wawancara warga sekolah, dan perumusan masalah bersama.
C. TAHAP AKSI KOLABORATIF (Collaborative Co-Creation):
   - Perancangan dan pembuatan aksi nyata / produk (${kokuProduk}), panduan kerja kelompok, serta pameran hasil karya / kampanye edukatif.
D. TAHAP REFLEKSI & TINDAK LANJUT (Evaluation & Impact):
   - Evaluasi dampak aksi terhadap perubahan kebiasaan di sekolah, refleksi bermakna 3-2-1, apresiasi proses, dan komitmen keberlanjutan.

4. PANDUAN DIFERENSIASI PERAN SISWA INKLUSIF
Rancang panduan pembagian peran kelompok yang inklusif agar seluruh murid (baik yang bertipe visual/analitis/kreatif/sosial, maupun yang membutuhkan bimbingan intensif) mendapatkan peran nyata dan berpartisipasi aktif dalam keberhasilan projek.

${asesmenInstruksi.length > 0 ? `5. INSTRUMEN ASESMEN & EVALUASI PERKEMBANGAN
${asesmenInstruksi.join('\n')}` : ''}

6. LAMPIRAN PENDUKUNG
- Draf Lembar Aktivitas Projek Siswa (LKPD Projek) siap cetak.
- Panduan Fasilitasi & Pertanyaan Pemantik untuk Guru Fasilitator.

7. STANDAR FORMAT DOKUMEN & TATA LETAK
${panduanFormat}
- Gunakan bahasa Indonesia baku yang mengalir, komunikatif, inspiratif, dan siap diaplikasikan oleh guru.`;
      }
    },
    {
      id: 5,
      pilar: 'Pilar 6: Refleksi Guru',
      name: 'Generator Refleksi & Umpan Balik Guru',
      icon: HeartHandshake,
      color: 'indigo',
      badge: 'Konstruktif & Hangat',
      buildPrompt: () => {
        const isSmp = fbFase === 'Fase D';
        const jenjangLabel = isSmp ? 'Sekolah Menengah Pertama (SMP)' : 'Sekolah Dasar (SD)';
        const roleLabel = `Konsultan Evaluasi Formatif, Praktisi Pendidikan Berpusat pada Murid, dan Mentor Guru ${jenjangLabel}`;

        // Adaptasi Usia dan Perkembangan Emosional
        const isFaseAB = fbFase === 'Fase A' || fbFase === 'Fase B';
        const adaptasiEmosional = isFaseAB
          ? `Gunakan pendekatan afektif anak usia ${fbFase} (${fbKelas}): gunakan kalimat pendek dan positif, analogi ramah anak yang konkret, hindari kata-kata teknis yang membingungkan, bangun rasa aman psikologis, dan perkuat keyakinan diri murid atas usahanya.`
          : `Gunakan pendekatan reflektif anak remaja ${fbFase} (${fbKelas}): terapkan teknik percakapan coaching yang memberdayakan, ajukan pertanyaan pemantik terbuka (powerful inquiry) yang menstimulasi metakognisi, dan bimbing murid untuk menemukan sendiri strategi solutifnya.`;

        // Format Luaran Instruksi
        let formatInstruksi = '';
        if (fbFormatLuaran.includes('Catatan Lembar Kerja')) {
          formatInstruksi = `FORMAT CATATAN LEMBAR KERJA / BUKU TUGAS (RINGKAS & SPESIFIK):
- Tuliskan dalam 2–3 kalimat padat, hangat, dan langsung pada inti.
- Struktur: 1 kalimat apresiasi spesifik + 1 kalimat petunjuk langkah feed-forward berikutnya.
- Berikan 2 variasi alternatif catatan agar guru memiliki opsi pilihan kata.`;
        } else if (fbFormatLuaran.includes('Skrip Dialog Percakapan')) {
          formatInstruksi = `FORMAT SKRIP DIALOG PERCAKAPAN GURU KE MURID (GAYA COACHING):
- Rancang skenario percakapan singkat 2 arah (5–6 giliran bicara) yang mengalir hangat dan memberdayakan.
- Struktur:
  1. Pembuka hangat & apresiasi atas usaha murid.
  2. Pertanyaan eksploratif memancing murid menyadari kendala yang dihadapi.
  3. Kesepakatan langkah perbaikan konkret yang dirumuskan sendiri oleh murid.
  4. Penutup dengan komitmen dukungan penuh dari guru.`;
        } else if (fbFormatLuaran.includes('Deskripsi Kualitatif Rapor')) {
          formatInstruksi = `FORMAT DESKRIPSI KUALITATIF RAPOR / PERKEMBANGAN:
- Sajikan dalam 1 paragraf narasi formal yang mengalir, baku, dan humanis (4–5 kalimat).
- Struktur: Penjelasan capaian tertinggi yang telah dikuasai murid secara spesifik, diikuti rekomendasi pendampingan strategis untuk aspek yang masih perlu dikuatkan.`;
        } else {
          formatInstruksi = `FORMAT REFLEKSI KINERJA GURU (EVALUASI DIRI PENGAJAR):
- Rancang format evaluasi diri guru terhadap efektivitas pembelajaran yang telah berlangsung:
  1. Analisis Efektivitas Pengajaran: Mengapa murid berhasil pada aspek kekuatan dan di mana letak kendala instruksionalnya.
  2. Diagnosis Akar Masalah: Apakah kendala disebabkan oleh kejelasan instruksi, alokasi waktu, atau media ajar.
  3. Rencana Tindak Lanjut Guru (Instructional Adjustment): 2 tindakan perbaikan konkret yang akan dilakukan guru pada pertemuan berikutnya.`;
        }

        return `Bertindaklah sebagai seorang ${roleLabel}. Rancanglah rumusan umpan balik formatif (formative feedback) yang bermakna, presisi secara pedagogis, bebas dari klise, dan memberdayakan murid dengan spesifikasi berikut:

1. IDENTITAS & SASARAN PENERIMA
- Sasaran Jenjang: ${fbFase} (${fbKelas}) - ${jenjangLabel}
- Target Penerima Umpan Balik: ${fbPenerima}
- Aktivitas / Jenis Tugas: ${fbAktivitas}
- Dimensi Profil Lulusan Terkait: ${fbProfil}
- Fokus Aspek Penilaian: ${fbFokus}

2. DATA KINERJA & OBSERVASI GURU
- Kekuatan / Capaian Positif Murid: ${fbKekuatan}
- Area Celah yang Perlu Ditingkatkan: ${fbAreaTingkat}
- Karakter / Nada Bahasa: ${fbNadaBahasa}

3. PRINSIP WAJIB: 3 TANGGA UMPAN BALIK (THE LADDER OF FEEDBACK)
Rumusan umpan balik WAJIB mematuhi 3 tangga berjenjang berikut:
A. TANGGA 1 - APRESIASI NYATA (Praise Specific Effort):
   Validasi usaha spesifik dan bukti konkret yang telah berhasil ditunjukkan murid. Hindari pujian kosong seperti "Hebat", ganti dengan pengakuan terhadap proses belajar.
B. TANGGA 2 - IDENTIFIKASI CELAH (Notice the Gap Constructively):
   Tunjukkan secara jelas dan ramah bagian yang masih perlu disempurnakan tanpa nada menghakimi atau meruntuhkan harga diri anak.
C. TANGGA 3 - TINDAK LANJUT KONKRET / FEED-FORWARD (Actionable Next Step):
   Berikan 1 langkah aksi nyata terdekat atau pertanyaan pemantik yang bisa langsung dipraktikkan murid untuk meningkatkan kualitas karyanya.

4. ADAPTASI PERKEMBANGAN & LARANGAN KLISE
- Pendekatan Afektif & Kognitif: ${adaptasiEmosional}
- ATURAN KETAT: DILARANG KERAS menggunakan frasa klise yang tidak operasional (seperti "Tingkatkan lagi ya", "Belajar lebih giat lagi", atau "Harus lebih teliti"). Seluruh saran wajib berupa tindakan konkret yang dapat diobservasi.

5. FORMAT OUTPUT YANG HARUS DIHASILKAN
${formatInstruksi}

Sajikan dalam bahasa Indonesia yang santun, elegan, mendidik, dan langsung siap diterapkan guru.`;
      }    },
    {
      id: 6,
      pilar: 'Pilar 7: Atribut Kelas',
      name: 'Desain Atribut Kelas',
      icon: Palette,
      color: 'violet',
      badge: 'Display & Visual',
      buildPrompt: () => {
        const isSmp = atrFase === 'Fase D';
        const jenjangLabel = isSmp ? 'Sekolah Menengah Pertama (SMP)' : 'Sekolah Dasar (SD)';
        const roleLabel = 'Desainer Grafis Lingkungan Edukasi Sekolah, Spesialis Penataan Kelas Ramah Anak, dan Ahli Komunikasi Visual Pembelajaran';

        // Penyesuaian Usia Kognitif
        const penyesuaianUsia = isSmp
          ? 'Gunakan pendekatan visual remaja Fase D (SMP): desain modern, tipografi bersih estetis (clean sans-serif), infografis edukatif yang berkelas, layout proporsional dewasa, dan hindari elemen kekanak-kanakan.'
          : `Gunakan pendekatan visual ramah anak ${atrFase} (SD): ilustrasi ramah anak yang ceria, kontras warna hangat yang nyaman di mata, tipografi besar dan jelas terbaca dari jarak 3-5 meter, serta tata letak sederhana yang minim teks panjang berbelit.`;

        // Format Luaran Desain
        const instruksiFormat = atrFormatLuaran === 'ImageAI'
          ? `PANDUAN PROMPT AI TEXT-TO-IMAGE (MIDJOURNEY / DALL-E / RECRAFT):
Sajikan prompt siap pakai dalam bahasa Inggris formal untuk di-generate di engine Text-to-Image AI dengan parameter:
- Prompt Lengkap (Subject, educational classroom display illustration, artistic medium, color palette, lighting, composition, aspect ratio).
- Negative Prompt: (text distortion, messy typo, blurry, realistic photograph, ugly face, watermark).
- Saran Aspek Rasio: (${atrUkuran.includes('Portrait') ? '--ar 3:4 atau --ar 4:5' : atrUkuran.includes('Landscape') ? '--ar 16:9 atau --ar 3:2' : '--ar 1:1'}).`
          : `PANDUAN PENYUSUNAN DI CANVA / DESAIN GRAFIS:
- Berikan instruksi langkah demi langkah penataan kanvas di Canva atau aplikasi desain grafis:
  1. Ukuran kanvas yang disarankan (misal: A3 3508 x 4960 px atau Banner Dinding 200 x 80 cm).
  2. Elemen grafis/vektor kunci yang perlu dicari di kolom elemen (keywords rekomendasi).
  3. Tata letak font judul (Headings), sub-judul, dan butir isi agar hierarki visual seimbang.`;

        return `Bertindaklah sebagai seorang ${roleLabel}. Rancanglah konsep tata letak display visual, atribut dekorasi kelas interaktif, dan panduan grafis lingkungan belajar dengan spesifikasi berikut:

1. IDENTITAS DISPLAY KELAS
- Satuan Pendidikan & Ruang: ${atrSekolah}
- Sasaran Jenjang: ${atrFase} (${atrKelas}) - ${jenjangLabel}
- Kategori Atribut: ${atrKategori}
- Judul Display: "${atrJudul}"
- Nuansa / Tema Visual: ${atrTemaVisual}
- Ukuran & Rasio Cetak: ${atrUkuran}
- Target Format Output: ${atrFormatLuaran === 'Canva' ? 'Panduan Layout & Skema Warna Canva' : 'Prompt AI Text-to-Image'}

2. KONTEN & BUTIR TEKS DISPLAY
${atrKonten ? atrKonten : '(Buatkan rumusan poin-poin redaksional yang inspiratif dan tepat untuk kategori ini)'}

3. PENYESUAIAN USIA KOGNITIF & PSIKOLOGI WARNA
- Karakter Visual: ${penyesuaianUsia}
- Harmoni Nuansa: Tema "${atrTemaVisual}" harus mencerminkan suasana belajar yang positif, merangsang konsentrasi tanpa membuat indra penglihatan anak lelah.

4. FORMAT OUTPUT WAJIB YANG HARUS DISAJIKAN:
A. SPESIFIKASI PALET WARNA (COLOR PALETTE):
   - 3–4 Kode Warna HEX spesifik (Warna Dominan, Warna Pendukung, dan Warna Aksen/Highlight) beserta penjelasan psikologi warna dan peruntukan elemennya.
B. HIERARKI TATA LETAK & GRID LAYOUT:
   - Bagian Header (Judul Display): Ukuran font, posisi penempatan, dan gaya visual.
   - Bagian Body (Kartu / Kotak Konten): Tata letak grid atau alur pandang (Z-pattern / F-pattern), pembagian ruang kosong (white space), dan penataan ikon/vektor pendukung.
   - Bagian Footer / Identitas: Penempatan logo sekolah, nama kelas, atau afirmasi penutup.
C. FITUR INTERAKTIVITAS SISWA:
   - Rekomendasi mekanisme keterlibatan aktif siswa (misal: kantong nama gantung, jepitan jemuran mini untuk karya, stiker velcro untuk check-in perasaan, pin pohon prestasi, atau kartu saku lepas-pasang).
D. ${instruksiFormat}
E. TIPS PEMASANGAN DINDING & BAHAN CETAK:
   - Rekomendasi ketinggian pasang setinggi mata anak (eye-level) sesuai rata-rata tinggi badan siswa ${atrFase}.
   - Saran bahan cetak ekonomis namun tahan lama (misal: Art Carton 260/310 gsm, laminasi doff/glossy ramah spidol wipe-and-clean, atau albatros/fleksi).

Sajikan dalam bahasa Indonesia yang terstruktur rapi, kreatif, aplikatif, dan langsung siap dieksekusi oleh guru maupun tim tata ruang sekolah.`;
      }
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
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
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4 max-h-[820px] overflow-y-auto pr-2">
          <div className="flex items-center space-x-2 pb-3 border-b-2 border-slate-100">
            <Sliders className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Parameter Spesifikasi Prompt
            </h3>
          </div>

          {/* Form Generator 0: Modul Ajar */}
          {selectedGenerator === 0 && (
            <div className="space-y-4 text-xs">
              
              {/* 1. Fase & Sasaran Kelas (Cascading Dropdown) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Fase
                  </label>
                  <select 
                    value={maFase} 
                    onChange={(e) => handleFaseChange(e.target.value as 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <option value="Fase A">Fase A</option>
                    <option value="Fase B">Fase B</option>
                    <option value="Fase C">Fase C</option>
                    <option value="Fase D">Fase D</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Sasaran Kelas
                  </label>
                  <select 
                    value={maKelas} 
                    onChange={(e) => setMaKelas(e.target.value)}
                    disabled={!maFase}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(faseKelasOptions[maFase] || []).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mata Pelajaran & Alokasi Waktu */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Mata Pelajaran</label>
                  <input 
                    type="text" 
                    value={maMapel} 
                    onChange={(e) => setMaMapel(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Alokasi Waktu</label>
                  <input 
                    type="text" 
                    value={maWaktu} 
                    onChange={(e) => setMaWaktu(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs" 
                  />
                </div>
              </div>

              {/* Topik / Materi Pokok */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Topik / Materi Pokok</label>
                <input 
                  type="text" 
                  value={maTopik} 
                  onChange={(e) => setMaTopik(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs" 
                />
              </div>

              {/* 2. Hierarki Capaian Kurikulum */}
              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-600" />
                    Hierarki Capaian Kurikulum
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Spesifik</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Capaian Pembelajaran (CP) / Elemen CP
                  </label>
                  <textarea 
                    rows={2} 
                    value={maCp} 
                    onChange={(e) => setMaCp(e.target.value)} 
                    placeholder="Salin CP atau Elemen CP terkait..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500/20 text-xs resize-none placeholder:text-slate-400" 
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Alur Tujuan Pembelajaran (ATP) / Ruang Lingkup Materi
                  </label>
                  <textarea 
                    rows={2} 
                    value={maAtp} 
                    onChange={(e) => setMaAtp(e.target.value)} 
                    placeholder="Tuliskan kode/urutan ATP atau lingkup materi pertemuan ini..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500/20 text-xs resize-none placeholder:text-slate-400" 
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Tujuan Pembelajaran (TP) & IKTP
                  </label>
                  <textarea 
                    rows={2} 
                    value={maTpIktp} 
                    onChange={(e) => setMaTpIktp(e.target.value)} 
                    placeholder="Rumuskan TP spesifik dan kriteria ketercapaiannya..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-sky-500/20 text-xs resize-none placeholder:text-slate-400" 
                  />
                </div>
              </div>

              {/* Model Pembelajaran */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Model Pembelajaran</label>
                <select 
                  value={maModel} 
                  onChange={(e) => setMaModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800"
                >
                  <option>Problem-Based Learning (PBL)</option>
                  <option>Project-Based Learning (PjBL)</option>
                  <option>Inquiry Learning (Penemuan Terbimbing)</option>
                  <option>Discovery Learning</option>
                  <option>Pembelajaran Kontekstual (CTL)</option>
                </select>
              </div>

              {/* 3. Target 8 Profil Lulusan */}
              <div className="p-3 bg-sky-50/60 rounded-2xl border border-sky-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-800 text-[11px] uppercase tracking-wider">
                    Target 8 Profil Lulusan
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                    maProfilLulusan.length === 3 
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs' 
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}>
                    Pilih maks. 3: {maProfilLulusan.length}/3
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {PROFIL_LULUSAN_OPTIONS.map((item, idx) => {
                    const isSelected = maProfilLulusan.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleProfil(item)}
                        className={`text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-start gap-1.5 ${
                          isSelected
                            ? 'bg-sky-500 text-white border-sky-600 font-bold shadow-xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black ${
                          isSelected ? 'bg-white text-sky-800' : 'border border-slate-300 bg-slate-50 text-slate-400'
                        }`}>
                          {isSelected ? '✓' : idx + 1}
                        </span>
                        <span className="leading-snug">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fokus Diferensiasi */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Fokus Diferensiasi</label>
                <input 
                  type="text" 
                  value={maDiferensiasi} 
                  onChange={(e) => setMaDiferensiasi(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs" 
                />
              </div>

              {/* Catatan Kesiapan Siswa */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Catatan Kesiapan Siswa</label>
                <textarea 
                  rows={2} 
                  value={maKesiapan} 
                  onChange={(e) => setMaKesiapan(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs resize-none" 
                />
              </div>

              {/* 4. Fasilitas, Penilaian, & Target Format Dokumen */}
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Sarana, Prasarana & Media Ajar
                  </label>
                  <input 
                    type="text" 
                    value={maSarpras} 
                    onChange={(e) => setMaSarpras(e.target.value)} 
                    placeholder="Contoh: LCD Proyektor, Benda konkret sekitar, LKPD cetak"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs placeholder:text-slate-400" 
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Bentuk Asesmen (Centang instrumen yang dibutuhkan)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {BENTUK_ASESMEN_OPTIONS.map((item) => {
                      const isChecked = maBentukAsesmen.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleToggleAsesmen(item)}
                          className={`text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-center gap-2 ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                            isChecked ? 'bg-white text-emerald-800' : 'border border-slate-300 bg-slate-50'
                          }`}>
                            {isChecked ? '✓' : ''}
                          </span>
                          <span className="leading-snug">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-emerald-200/60">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                      Kedalaman Output
                    </label>
                    <div className="space-y-1">
                      {[
                        { id: 'Lengkap', label: 'Lengkap (Modul + LKPD + Rubrik)' },
                        { id: 'Ringkas', label: 'Ringkas (1–2 Halaman)' }
                      ].map((opt) => (
                        <label 
                          key={opt.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer text-[11px] transition-all ${
                            maKedalamanOutput === opt.id
                              ? 'bg-amber-100 border-amber-400 font-bold text-amber-950 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="kedalamanOutput"
                            checked={maKedalamanOutput === opt.id}
                            onChange={() => setMaKedalamanOutput(opt.id as 'Lengkap' | 'Ringkas')}
                            className="text-amber-600 focus:ring-amber-500"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                      Target Output Dokumen
                    </label>
                    <div className="space-y-1">
                      {[
                        { id: 'DOCX', label: 'Dokumen Word (.DOCX)', icon: '📝' },
                        { id: 'PDF', label: 'Format Cetak / PDF', icon: '📑' },
                        { id: 'Teks Biasa', label: 'Salin Teks (Markdown)', icon: '📄' }
                      ].map((doc) => (
                        <label 
                          key={doc.id}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer text-[11px] transition-all ${
                            maTargetDokumen === doc.id
                              ? 'bg-indigo-100 border-indigo-400 font-bold text-indigo-950 shadow-2xs'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="targetDokumen"
                            checked={maTargetDokumen === doc.id}
                            onChange={() => setMaTargetDokumen(doc.id as 'Teks Biasa' | 'DOCX' | 'PDF')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{doc.icon} {doc.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Form Generator 1: LKPD */}
          {selectedGenerator === 1 && (
            <div className="space-y-4 text-xs">
              
              {/* Topik / Fokus Aktivitas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Topik / Fokus Aktivitas
                </label>
                <input 
                  type="text" 
                  value={lkpdTopik} 
                  onChange={(e) => setLkpdTopik(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800" 
                />
              </div>

              {/* 1. Cascading Dropdown: Fase & Sasaran Kelas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Fase
                  </label>
                  <select 
                    value={lkpdFase} 
                    onChange={(e) => handleLkpdFaseChange(e.target.value as 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <option value="Fase A">Fase A</option>
                    <option value="Fase B">Fase B</option>
                    <option value="Fase C">Fase C</option>
                    <option value="Fase D">Fase D</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Sasaran Kelas
                  </label>
                  <select 
                    value={lkpdKelas} 
                    onChange={(e) => setLkpdKelas(e.target.value)}
                    disabled={!lkpdFase}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(faseKelasOptions[lkpdFase] || []).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mata Pelajaran & Estimasi Waktu */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Mata Pelajaran</label>
                  <input 
                    type="text" 
                    value={lkpdMapel} 
                    onChange={(e) => setLkpdMapel(e.target.value)} 
                    placeholder="Contoh: IPAS, Matematika"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Estimasi Waktu (Menit)</label>
                  <input 
                    type="text" 
                    value={lkpdWaktu} 
                    onChange={(e) => setLkpdWaktu(e.target.value)} 
                    placeholder="Contoh: 35 Menit (1 JP)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs" 
                  />
                </div>
              </div>

              {/* 2. Tujuan Pembelajaran (TP) yang Diukur */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Tujuan Pembelajaran (TP) yang Diukur
                </label>
                <textarea 
                  rows={2} 
                  value={lkpdTp} 
                  onChange={(e) => setLkpdTp(e.target.value)} 
                  placeholder="Tuliskan target kompetensi spesifik yang dinilai dari lembar kerja ini..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs resize-none placeholder:text-slate-400" 
                />
              </div>

              {/* 3. Mode Diferensiasi & Aktivitas */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1 text-[11px]">
                    Mode Diferensiasi LKPD
                  </label>
                  <select 
                    value={lkpdDiferensiasi} 
                    onChange={(e) => setLkpdDiferensiasi(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="Reguler (Satu Format Standar)">Reguler (Satu Format Standar)</option>
                    <option value="Berdiferensiasi 3 Tingkat (Tier 1: Bimbingan/Scaffolding, Tier 2: Reguler, Tier 3: Pengayaan/HOTS)">
                      Berdiferensiasi 3 Tingkat (Tier 1: Bimbingan, Tier 2: Reguler, Tier 3: Pengayaan/HOTS)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Tipe Aktivitas</label>
                    <select 
                      value={lkpdTipeAktivitas} 
                      onChange={(e) => setLkpdTipeAktivitas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                    >
                      <option>Eksperimen / Pengamatan Nyata</option>
                      <option>Studi Kasus / Analisis Teks</option>
                      <option>Pemecahan Masalah Proyek</option>
                      <option>Latihan Konseptual Mandiri</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Format Belajar</label>
                    <select 
                      value={lkpdModel} 
                      onChange={(e) => setLkpdModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800"
                    >
                      <option>Kelompok Kolaboratif (4-5 Siswa)</option>
                      <option>Aktivitas Berpasangan (Think-Pair-Share)</option>
                      <option>Aktivitas Eksplorasi Individu</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Ketersediaan Alat & Bahan */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Ketersediaan Alat & Bahan
                </label>
                <input 
                  type="text" 
                  value={lkpdAlatBahan} 
                  onChange={(e) => setLkpdAlatBahan(e.target.value)} 
                  placeholder="Contoh: Stoples kaca, air panas, es batu, lingkungan halaman"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs placeholder:text-slate-400" 
                />
              </div>

              {/* Petunjuk Belajar Siswa */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Petunjuk Belajar Siswa</label>
                <textarea 
                  rows={2} 
                  value={lkpdPetunjuk} 
                  onChange={(e) => setLkpdPetunjuk(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs resize-none" 
                />
              </div>

              {/* 5. Kelengkapan Penilaian & Format Dokumen */}
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Kelengkapan Penilaian Guru (Lampiran)
                  </label>
                  <div className="space-y-1.5">
                    {[
                      'Sertakan Kunci Jawaban Lengkap',
                      'Sertakan Rubrik Penilaian & Kriteria Skor'
                    ].map((item) => {
                      const isChecked = lkpdKelengkapan.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleToggleLkpdKelengkapan(item)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-center gap-2 ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                            isChecked ? 'bg-white text-emerald-800' : 'border border-slate-300 bg-slate-50'
                          }`}>
                            {isChecked ? '✓' : ''}
                          </span>
                          <span className="leading-snug">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60">
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Format Dokumen
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'Word', label: 'Word Ready (Tabel & Break)', icon: '📝' },
                      { id: 'Markdown', label: 'Teks Markdown (Siap Salin)', icon: '📄' }
                    ].map((opt) => (
                      <label 
                        key={opt.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer text-[11px] transition-all ${
                          lkpdFormatDokumen === opt.id
                            ? 'bg-indigo-100 border-indigo-400 font-bold text-indigo-950 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="lkpdFormatDokumen"
                          checked={lkpdFormatDokumen === opt.id}
                          onChange={() => setLkpdFormatDokumen(opt.id as 'Word' | 'Markdown')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt.icon} {opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Form Generator 2: Kisi-Kisi & Soal */}
          {selectedGenerator === 2 && (
            <div className="space-y-4 text-xs">
              
              {/* 1. Jenis Tes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Jenis Tes / Asesmen</label>
                <select 
                  value={soalTipe} 
                  onChange={(e) => setSoalTipe(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <option value="Sumatif Akhir Semester (SAS)">Sumatif Akhir Semester (SAS)</option>
                  <option value="Sumatif Tengah Semester (STS/PTS)">Sumatif Tengah Semester (STS/PTS)</option>
                  <option value="Penilaian Harian / Formatif Lingkup Materi">Penilaian Harian / Formatif Lingkup Materi</option>
                  <option value="Asesmen Akhir Jenjang (Ujian Sekolah)">Asesmen Akhir Jenjang (Ujian Sekolah)</option>
                </select>
              </div>

              {/* 2. Cascading Dropdown: Fase & Sasaran Kelas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Fase
                  </label>
                  <select 
                    value={soalFase} 
                    onChange={(e) => handleSoalFaseChange(e.target.value as 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <option value="Fase A">Fase A</option>
                    <option value="Fase B">Fase B</option>
                    <option value="Fase C">Fase C</option>
                    <option value="Fase D">Fase D</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Sasaran Kelas
                  </label>
                  <select 
                    value={soalKelas} 
                    onChange={(e) => setSoalKelas(e.target.value)}
                    disabled={!soalFase}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(faseKelasOptions[soalFase] || []).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Mata Pelajaran & Alokasi Waktu */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Mata Pelajaran</label>
                  <input 
                    type="text" 
                    value={soalMapel} 
                    onChange={(e) => setSoalMapel(e.target.value)} 
                    placeholder="Contoh: Bahasa Indonesia"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Alokasi Waktu</label>
                  <input 
                    type="text" 
                    value={soalWaktu} 
                    onChange={(e) => setSoalWaktu(e.target.value)} 
                    placeholder="Contoh: 90 Menit"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800" 
                  />
                </div>
              </div>

              {/* 4. Capaian Pembelajaran (CP) / TP */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Capaian Pembelajaran (CP) / TP yang Diuji
                </label>
                <textarea 
                  rows={2} 
                  value={soalCpTp} 
                  onChange={(e) => setSoalCpTp(e.target.value)} 
                  placeholder="Tuliskan CP atau Tujuan Pembelajaran yang diuji..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs resize-none placeholder:text-slate-400" 
                />
              </div>

              {/* 5. Lingkup Materi Pokok */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Lingkup Materi Pokok</label>
                <input 
                  type="text" 
                  value={soalMateri} 
                  onChange={(e) => setSoalMateri(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs" 
                />
              </div>

              {/* 6 & 7. Target Jumlah & Sebaran Level Kognitif */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Jumlah Butir</label>
                  <input 
                    type="number" 
                    min={1}
                    max={50}
                    value={soalJumlah} 
                    onChange={(e) => setSoalJumlah(Math.max(1, parseInt(e.target.value) || 1))} 
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800" 
                  />
                </div>
                <div className="sm:col-span-8">
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Sebaran Level Kognitif</label>
                  <select 
                    value={soalLevelPreset} 
                    onChange={(e) => setSoalLevelPreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="L1: 30%, L2: 40%, L3: 30% (HOTS Standar)">L1: 30%, L2: 40%, L3: 30% (HOTS Standar)</option>
                    <option value="L1: 20%, L2: 30%, L3: 50% (Dominan Penalaran HOTS / AKM)">L1: 20%, L2: 30%, L3: 50% (Dominan Penalaran HOTS / AKM)</option>
                    <option value="L1: 40%, L2: 40%, L3: 20% (Aplikasi & Pemahaman Terarah)">L1: 40%, L2: 40%, L3: 20% (Aplikasi & Pemahaman Terarah)</option>
                    <option value="L1: 50%, L2: 35%, L3: 15% (Konseptual Dasar)">L1: 50%, L2: 35%, L3: 15% (Konseptual Dasar)</option>
                  </select>
                </div>
              </div>

              {/* 8. Variasi Bentuk Soal (Multi-select Checkbox Tag) */}
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-purple-950 text-[11px] uppercase tracking-wider">
                    Variasi Bentuk Soal
                  </label>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    {soalBentukList.length} Dipilih
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    'Pilihan Ganda',
                    'Pilihan Ganda Kompleks',
                    'Menjodohkan',
                    'Isian Singkat',
                    'Uraian'
                  ].map((item) => {
                    const isSelected = soalBentukList.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleSoalBentuk(item)}
                        className={`text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-700 font-bold shadow-xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                          isSelected ? 'bg-white text-purple-800' : 'border border-slate-300 bg-slate-50'
                        }`}>
                          {isSelected ? '✓' : ''}
                        </span>
                        <span className="leading-snug truncate">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 9 & 10. Kelengkapan Kartu Soal & Format Dokumen */}
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Kelengkapan Kartu Soal
                  </label>
                  <div className="space-y-1.5">
                    {[
                      'Kunci Jawaban Lengkap',
                      'Pembahasan & Analisis Pengecoh/Distraktor',
                      'Pedoman Penskoran / Rubrik Uraian'
                    ].map((item) => {
                      const isChecked = soalKelengkapan.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleToggleSoalKelengkapan(item)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-center gap-2 ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                            isChecked ? 'bg-white text-emerald-800' : 'border border-slate-300 bg-slate-50'
                          }`}>
                            {isChecked ? '✓' : ''}
                          </span>
                          <span className="leading-snug">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60">
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Format Dokumen
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'Word', label: 'Word Ready (Tabel & Break)', icon: '📝' },
                      { id: 'Markdown', label: 'Teks Markdown (Siap Salin)', icon: '📄' }
                    ].map((opt) => (
                      <label 
                        key={opt.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer text-[11px] transition-all ${
                          soalFormatDokumen === opt.id
                            ? 'bg-indigo-100 border-indigo-400 font-bold text-indigo-950 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="soalFormatDokumen"
                          checked={soalFormatDokumen === opt.id}
                          onChange={() => setSoalFormatDokumen(opt.id as 'Word' | 'Markdown')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt.icon} {opt.label}</span>
                      </label>
                    ))}
                  </div>
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
            <div className="space-y-4 text-xs">
              
              {/* 1. Cascading Dropdown: Fase & Sasaran Kelas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Fase
                  </label>
                  <select 
                    value={kokuFase} 
                    onChange={(e) => handleKokuFaseChange(e.target.value as 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <option value="Fase A">Fase A</option>
                    <option value="Fase B">Fase B</option>
                    <option value="Fase C">Fase C</option>
                    <option value="Fase D">Fase D</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Sasaran Kelas
                  </label>
                  <select 
                    value={kokuKelas} 
                    onChange={(e) => setKokuKelas(e.target.value)}
                    disabled={!kokuFase}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(faseKelasOptions[kokuFase] || []).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nama Sekolah & Tim Fasilitator */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Nama Satuan Pendidikan</label>
                  <input 
                    type="text" 
                    value={kokuSekolah} 
                    onChange={(e) => setKokuSekolah(e.target.value)} 
                    placeholder="Contoh: SD Negeri 1 Nusantara"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Tim Fasilitator Projek</label>
                  <input 
                    type="text" 
                    value={kokuFasilitator} 
                    onChange={(e) => setKokuFasilitator(e.target.value)} 
                    placeholder="Contoh: Tim Guru Kelas & Mapel"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800" 
                  />
                </div>
              </div>

              {/* 2. Tema & Judul Projek */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Tema Projek Resmi</label>
                <select 
                  value={kokuTema} 
                  onChange={(e) => setKokuTema(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <option value="Gaya Hidup Berkelanjutan">Gaya Hidup Berkelanjutan</option>
                  <option value="Kearifan Lokal">Kearifan Lokal</option>
                  <option value="Bhinneka Tunggal Ika">Bhinneka Tunggal Ika</option>
                  <option value="Rekayasa & Teknologi">Rekayasa & Teknologi</option>
                  <option value="Kewirausahaan">Kewirausahaan</option>
                  <option value="Suara Demokrasi">Suara Demokrasi</option>
                  <option value="Bangunlah Jiwa dan Raganya">Bangunlah Jiwa dan Raganya</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Judul Projek</label>
                <input 
                  type="text" 
                  value={kokuJudul} 
                  onChange={(e) => setKokuJudul(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800" 
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Konteks Isu Sekolah / Lingkungan</label>
                <textarea 
                  rows={2} 
                  value={kokuIsu} 
                  onChange={(e) => setKokuIsu(e.target.value)} 
                  placeholder="Ceritakan permasalahan nyata di sekitar sekolah..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs resize-none placeholder:text-slate-400" 
                />
              </div>

              {/* 3. Target 8 Profil Lulusan & Tujuan Utama */}
              <div className="p-3 bg-rose-50/60 rounded-2xl border border-rose-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-rose-950 text-[11px] uppercase tracking-wider">
                    Target 8 Profil Lulusan
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                    kokuProfilList.length === 3 
                      ? 'bg-rose-500 text-white font-black shadow-xs' 
                      : 'bg-white text-rose-800 border border-rose-200'
                  }`}>
                    Pilih 2-3: {kokuProfilList.length}/3
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {PROFIL_LULUSAN_OPTIONS.map((item, idx) => {
                    const isSelected = kokuProfilList.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleKokuProfil(item)}
                        className={`text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-start gap-1.5 ${
                          isSelected
                            ? 'bg-rose-500 text-white border-rose-600 font-bold shadow-xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black ${
                          isSelected ? 'bg-white text-rose-800' : 'border border-slate-300 bg-slate-50 text-slate-400'
                        }`}>
                          {isSelected ? '✓' : idx + 1}
                        </span>
                        <span className="leading-snug">{item}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1">
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Tujuan Utama Projek
                  </label>
                  <textarea 
                    rows={2} 
                    value={kokuTujuan} 
                    onChange={(e) => setKokuTujuan(e.target.value)} 
                    placeholder="Target pembiasaan karakter dan kesadaran yang dibangun..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-rose-500/20 text-xs resize-none placeholder:text-slate-400" 
                  />
                </div>
              </div>

              {/* 4. Skenario & Aksi */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Alur Pelaksanaan</label>
                  <select 
                    value={kokuAlur} 
                    onChange={(e) => setKokuAlur(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="4 Tahap Standar: Pengenalan - Kontekstualisasi - Aksi - Refleksi & Tindak Lanjut">
                      4 Tahap Standar: Pengenalan - Kontekstualisasi - Aksi - Refleksi & Tindak Lanjut
                    </option>
                    <option value="Inquiry Alur 4F (Facts, Feelings, Findings, Future)">
                      Inquiry Alur 4F (Facts, Feelings, Findings, Future)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Target Aksi Nyata / Produk</label>
                    <input 
                      type="text" 
                      value={kokuProduk} 
                      onChange={(e) => setKokuProduk(e.target.value)} 
                      placeholder="Contoh: Pameran Kelas, Kampanye Pilah Sampah"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs" 
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Durasi Projek</label>
                    <input 
                      type="text" 
                      value={kokuDurasi} 
                      onChange={(e) => setKokuDurasi(e.target.value)} 
                      placeholder="Contoh: 24 JP / 4 Minggu"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs" 
                    />
                  </div>
                </div>
              </div>

              {/* 5. Asesmen & Format Dokumen */}
              <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Instrumen Asesmen Projek
                  </label>
                  <div className="space-y-1.5">
                    {[
                      'Rubrik Observasi Profil Lulusan',
                      'Lembar Refleksi Diri Siswa',
                      'Rubrik Asesmen Aksi Akhir / Produk'
                    ].map((item) => {
                      const isChecked = kokuAsesmen.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleToggleKokuAsesmen(item)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-all flex items-center gap-2 ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-700 font-bold shadow-xs'
                              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[10px] font-black ${
                            isChecked ? 'bg-white text-emerald-800' : 'border border-slate-300 bg-slate-50'
                          }`}>
                            {isChecked ? '✓' : ''}
                          </span>
                          <span className="leading-snug">{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60">
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Format Dokumen
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'Word', label: 'Microsoft Word .docx Ready', icon: '📝' },
                      { id: 'Markdown', label: 'Markdown Siap Salin', icon: '📄' }
                    ].map((opt) => (
                      <label 
                        key={opt.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer text-[11px] transition-all ${
                          kokuFormatDokumen === opt.id
                            ? 'bg-indigo-100 border-indigo-400 font-bold text-indigo-950 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="kokuFormatDokumen"
                          checked={kokuFormatDokumen === opt.id}
                          onChange={() => setKokuFormatDokumen(opt.id as 'Word' | 'Markdown')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt.icon} {opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Form Generator 5: Refleksi & Feedback */}
          {selectedGenerator === 5 && (
            <div className="space-y-4 text-xs">
              
              {/* 1. Cascading Dropdown: Fase & Sasaran Kelas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Fase
                  </label>
                  <select 
                    value={fbFase} 
                    onChange={(e) => handleFbFaseChange(e.target.value as 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <option value="Fase A">Fase A</option>
                    <option value="Fase B">Fase B</option>
                    <option value="Fase C">Fase C</option>
                    <option value="Fase D">Fase D</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Sasaran Kelas
                  </label>
                  <select 
                    value={fbKelas} 
                    onChange={(e) => setFbKelas(e.target.value)}
                    disabled={!fbFase}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(faseKelasOptions[fbFase] || []).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Penerima */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Target Penerima Umpan Balik</label>
                <select 
                  value={fbPenerima} 
                  onChange={(e) => setFbPenerima(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="Individu Siswa">Individu Siswa</option>
                  <option value="Kelompok Belajar">Kelompok Belajar</option>
                  <option value="Seluruh Kelas / Klasikal">Seluruh Kelas / Klasikal</option>
                </select>
              </div>

              {/* 2. Konteks Aktivitas Pembelajaran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Aktivitas / Jenis Tugas</label>
                  <input 
                    type="text" 
                    value={fbAktivitas} 
                    onChange={(e) => setFbAktivitas(e.target.value)} 
                    placeholder="Contoh: Presentasi Laporan Sains, Diskusi Kelompok"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs" 
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Profil Lulusan Terkait</label>
                  <select 
                    value={fbProfil} 
                    onChange={(e) => setFbProfil(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800"
                  >
                    {PROFIL_LULUSAN_OPTIONS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Data Kinerja & Observasi Guru */}
              <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-200/80 space-y-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Fokus Aspek Penilaian</label>
                  <input 
                    type="text" 
                    value={fbFokus} 
                    onChange={(e) => setFbFokus(e.target.value)} 
                    placeholder="Contoh: Penalaran Kritis, Keterampilan Menulis"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800" 
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-800 mb-1 text-[11px]">
                    ✓ Kekuatan / Capaian Positif Murid
                  </label>
                  <textarea 
                    rows={2} 
                    value={fbKekuatan} 
                    onChange={(e) => setFbKekuatan(e.target.value)} 
                    placeholder="Tuliskan apa yang sudah dilakukan murid dengan baik..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 text-xs resize-none placeholder:text-slate-400" 
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-900 mb-1 text-[11px]">
                    ⚠ Area Celah yang Perlu Ditingkatkan
                  </label>
                  <textarea 
                    rows={2} 
                    value={fbAreaTingkat} 
                    onChange={(e) => setFbAreaTingkat(e.target.value)} 
                    placeholder="Tuliskan kendala spesifik atau bagian yang masih keliru..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-amber-500/20 text-xs resize-none placeholder:text-slate-400" 
                  />
                </div>
              </div>

              {/* 4. Pengaturan Komunikasi & Format */}
              <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Karakter / Nada Bahasa</label>
                  <select 
                    value={fbNadaBahasa} 
                    onChange={(e) => setFbNadaBahasa(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                  >
                    <option value="Hangat & Menguatkan">Hangat & Menguatkan</option>
                    <option value="Konstruktif-Solutif">Konstruktif-Solutif</option>
                    <option value="Menantang & Eksploratif / Coaching">Menantang & Eksploratif / Coaching</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Format Luaran Umpan Balik
                  </label>
                  <div className="space-y-1.5">
                    {[
                      { id: 'Catatan Lembar Kerja / Buku Tugas (Ringkas & Langsung)', label: 'Catatan Lembar Kerja / Buku Tugas (Ringkas)', icon: '📝' },
                      { id: 'Skrip Dialog Percakapan Guru ke Murid (Gaya Coaching)', label: 'Skrip Dialog Percakapan (Gaya Coaching)', icon: '💬' },
                      { id: 'Deskripsi Kualitatif Rapor / Catatan Perkembangan', label: 'Deskripsi Kualitatif Rapor / Perkembangan', icon: '📋' },
                      { id: 'Refleksi Guru (Evaluasi Kinerja Mengajar & Rencana Perbaikan Guru Sendiri)', label: 'Refleksi Diri Guru (Evaluasi Pengajaran)', icon: '🔍' }
                    ].map((opt) => (
                      <label 
                        key={opt.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer text-[11px] transition-all ${
                          fbFormatLuaran === opt.id
                            ? 'bg-indigo-100 border-indigo-400 font-bold text-indigo-950 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="fbFormatLuaran"
                          checked={fbFormatLuaran === opt.id}
                          onChange={() => setFbFormatLuaran(opt.id)}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{opt.icon} {opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Form Generator 6: Desain Atribut Kelas */}
          {selectedGenerator === 6 && (
            <div className="space-y-4 text-xs">
              
              {/* 1. Cascading Dropdown: Fase & Sasaran Kelas */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Fase
                  </label>
                  <select 
                    value={atrFase} 
                    onChange={(e) => handleAtrFaseChange(e.target.value as 'Fase A' | 'Fase B' | 'Fase C' | 'Fase D')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs"
                  >
                    <option value="Fase A">Fase A</option>
                    <option value="Fase B">Fase B</option>
                    <option value="Fase C">Fase C</option>
                    <option value="Fase D">Fase D</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Sasaran Kelas
                  </label>
                  <select 
                    value={atrKelas} 
                    onChange={(e) => setAtrKelas(e.target.value)}
                    disabled={!atrFase}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-xs font-bold text-slate-800 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {(faseKelasOptions[atrFase] || []).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Satuan Pendidikan & Ruang Kelas */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">Nama Satuan Pendidikan & Ruang Kelas</label>
                <input 
                  type="text" 
                  value={atrSekolah} 
                  onChange={(e) => setAtrSekolah(e.target.value)} 
                  placeholder="Contoh: SDN Cinanggerang I - Kelas 4B"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800" 
                />
              </div>

              {/* 2. Kategori Atribut & Konten Display */}
              <div className="p-3 bg-violet-50/60 rounded-2xl border border-violet-200/80 space-y-2.5">
                <div>
                  <label className="block font-bold text-violet-950 mb-1 text-[11px]">Kategori Atribut Kelas</label>
                  <select 
                    value={atrKategori} 
                    onChange={(e) => setAtrKategori(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-violet-300 bg-white text-xs font-semibold text-slate-800 shadow-2xs"
                  >
                    <option value="Keyakinan / Kesepakatan Kelas Interaktif">Keyakinan / Kesepakatan Kelas Interaktif</option>
                    <option value="Jadwal Piket & Struktur Organisasi Kelas">Jadwal Piket & Struktur Organisasi Kelas</option>
                    <option value="Pojok Emosi & Check-In Perasaan Pagi">Pojok Emosi & Check-In Perasaan Pagi</option>
                    <option value="Pojok Baca & Pohon Literasi / Numerasi Dinding">Pojok Baca & Pohon Literasi / Numerasi Dinding</option>
                    <option value="Display 8 Dimensi Profil Lulusan & Karakter">Display 8 Dimensi Profil Lulusan & Karakter</option>
                    <option value="Header Galeri Karya / Papan Pajangan Siswa">Header Galeri Karya / Papan Pajangan Siswa</option>
                    <option value="Label Zona Kelas & Perlengkapan Belajar">Label Zona Kelas & Perlengkapan Belajar</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Judul Display</label>
                  <input 
                    type="text" 
                    value={atrJudul} 
                    onChange={(e) => setAtrJudul(e.target.value)} 
                    placeholder="Contoh: Keyakinan Kelas Kita, Pohon Impian Literasi"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800" 
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">Konten / Poin Teks Display</label>
                  <textarea 
                    rows={3} 
                    value={atrKonten} 
                    onChange={(e) => setAtrKonten(e.target.value)} 
                    placeholder="Tuliskan butir aturan, daftar nama piket, atau teks afirmasi..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-violet-500/20 text-xs resize-none placeholder:text-slate-400" 
                  />
                </div>
              </div>

              {/* 3. Gaya Visual & Spesifikasi Cetak */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Tema / Nuansa Visual</label>
                    <select 
                      value={atrTemaVisual} 
                      onChange={(e) => setAtrTemaVisual(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800"
                    >
                      <option value="Ceria & Penuh Warna">Ceria & Penuh Warna</option>
                      <option value="Alam & Earth-Tone">Alam & Earth-Tone</option>
                      <option value="Minimalis Pastel Modern">Minimalis Pastel Modern</option>
                      <option value="Sains & Luar Angkasa">Sains & Luar Angkasa</option>
                      <option value="Kearifan Lokal">Kearifan Lokal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-[11px]">Ukuran & Rasio Cetak</label>
                    <select 
                      value={atrUkuran} 
                      onChange={(e) => setAtrUkuran(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-semibold text-slate-800"
                    >
                      <option value="Poster Tegak A3/A4 (Portrait)">Poster Tegak A3/A4 (Portrait)</option>
                      <option value="Banner Lebar Dinding (Landscape)">Banner Lebar Dinding (Landscape)</option>
                      <option value="Matriks/Kotak Label (Square)">Matriks/Kotak Label (Square)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1 border-t border-amber-200/60">
                  <label className="block font-bold text-slate-700 mb-1.5 text-[11px]">
                    Format Luaran Desain
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'Canva', label: 'Panduan Layout & Warna (Canva)', icon: '🎨' },
                      { id: 'ImageAI', label: 'Prompt AI Text-to-Image (Midjourney/DALL-E)', icon: '✨' }
                    ].map((opt) => (
                      <label 
                        key={opt.id}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border cursor-pointer text-[11px] transition-all ${
                          atrFormatLuaran === opt.id
                            ? 'bg-amber-100 border-amber-400 font-bold text-amber-950 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="atrFormatLuaran"
                          checked={atrFormatLuaran === opt.id}
                          onChange={() => setAtrFormatLuaran(opt.id as 'Canva' | 'ImageAI')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span>{opt.icon} {opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

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
          <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300 max-h-[640px] overflow-y-auto whitespace-pre-wrap selection:bg-amber-400 selection:text-slate-950">
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

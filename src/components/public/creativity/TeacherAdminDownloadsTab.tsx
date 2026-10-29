import React from 'react';
import { FileSpreadsheet, Download, FileText, CheckCircle2, Calendar, Users, ClipboardCheck, Server } from 'lucide-react';

export const TeacherAdminDownloadsTab: React.FC = () => {
  const adminTemplates = [
    {
      id: 'adm-server',
      title: 'SASI CBT - Paket Server Proktor Portable (Moda Semi-Online Ruang Ujian)',
      format: 'ZIP (Server Windows)',
      size: '2.68 MB',
      downloads: 840,
      description: 'Paket server mini lokal untuk proktor. Tampilan web disajikan lewat jaringan WiFi lokal sekolah tanpa kuota internet siswa (0 MB kuota), aman dari sinyal lemot, dan tahan mati lampu.',
      badge: 'Aplikasi Proktor',
      url: '/downloads/SASI_CBT_SERVER_PORTABLE.zip'
    },
    {
      id: 'adm-1',
      title: 'Buku Nilai Siswa & Format Rekap Otomatis Rapor Kurikulum Merdeka',
      format: 'XLSX (Microsoft Excel)',
      size: '2.5 MB',
      downloads: 3240,
      description: 'Lengkap dengan rumus otomatis rata-rata formatif, bobot sumatif lingkup materi, serta konversi otomatis ke deskripsi capaian rapor (IKTP).',
      badge: 'Formula Otomatis',
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/buku-nilai-jurnal-guru-otomatis.xlsx'
    },
    {
      id: 'adm-2',
      title: 'Jurnal Harian Mengajar & Agenda Guru Kelas SD (Siap Cetak)',
      format: 'DOCX (Microsoft Word)',
      size: '1.4 MB',
      downloads: 2150,
      description: 'Format baku pencatatan materi harian, nomor tujuan pembelajaran (TP), absensi kelas, dan catatan tindak lanjut bimbingan siswa.',
      badge: 'Format Cetak A4',
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx'
    },
    {
      id: 'adm-3',
      title: 'Kalender Pendidikan, Matriks Jadwal Tematik, & Pemetaan Pekan Efektif',
      format: 'XLSX (Microsoft Excel)',
      size: '1.8 MB',
      downloads: 1890,
      description: 'Template pemetaan pekan efektif belajar semester ganjil dan genap, jadwal libur nasional, dan agenda pelaksanaan asesmen sekolah.',
      badge: 'Semester 1 & 2',
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/buku-nilai-jurnal-guru-otomatis.xlsx'
    },
    {
      id: 'adm-4',
      title: 'Buku Catatan Observasi Karakter & Rekap Presensi Kehadiran Siswa',
      format: 'DOCX (Microsoft Word)',
      size: '1.1 MB',
      downloads: 1420,
      description: 'Instrumen lembar observasi anekdot untuk mencatat perkembangan sikap, kedisiplinan, dan interaksi sosial murid di sekolah.',
      badge: 'Instrumen Guru',
      url: 'https://lmlflfkdukcdhkdjssmm.supabase.co/storage/v1/object/public/educational-resources/templates/format-kisi-kisi-kartu-soal-sd.docx'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Info */}
      <div className="bg-white p-6 rounded-3xl border-2 border-slate-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Pusat Template Administrasi Guru & Aplikasi Ujian
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Unduh berkas siap pakai format Word & Excel (DOCX/XLSX) serta aplikasi server CBT semi-online untuk meringankan beban administrasi Anda.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border-2 border-emerald-300">
          100% Gratis & Bebas Modifikasi
        </span>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {adminTemplates.map(item => (
          <div 
            key={item.id}
            className={`bg-white p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${
              item.id === 'adm-server' 
                ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/30' 
                : 'border-slate-300 hover:border-emerald-500 hover:shadow-lg'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border-2 ${
                  item.id === 'adm-server'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}>
                  {item.badge}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  item.format.includes('ZIP')
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : item.format.includes('XLSX') 
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-900' 
                      : 'bg-sky-100 border-sky-300 text-sky-900'
                }`}>
                  {item.format}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 leading-snug">
                {item.title}
              </h4>

              <p className="text-xs text-slate-500 leading-relaxed text-justify">
                {item.description}
              </p>

              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <span>Ukuran: {item.size}</span>
                <span>•</span>
                <span>{item.downloads}x diunduh</span>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t-2 border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 italic">
                {item.id === 'adm-server' ? 'Windows 7/8/10/11' : 'Format Standar Nasional'}
              </span>

              <a
                href={item.url}
                download
                className={`px-4 py-2 rounded-xl text-xs font-bold border-2 shadow-2xs flex items-center space-x-1.5 transition-colors ${
                  item.id === 'adm-server'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 hover:border-emerald-700'
                    : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700 hover:border-slate-600'
                }`}
              >
                <Download className={`w-3.5 h-3.5 ${item.id === 'adm-server' ? 'text-white' : 'text-emerald-400'}`} />
                <span>{item.id === 'adm-server' ? 'Unduh Paket (.ZIP)' : 'Unduh Template'}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

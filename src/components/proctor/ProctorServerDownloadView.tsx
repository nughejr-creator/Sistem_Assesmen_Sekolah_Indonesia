import React, { useState } from 'react';
import { 
  Server, 
  Download, 
  CheckCircle2, 
  Wifi, 
  Laptop, 
  Smartphone, 
  ShieldCheck, 
  HardDrive, 
  HelpCircle, 
  Sparkles,
  ExternalLink,
  Terminal,
  FileCode,
  Zap
} from 'lucide-react';

export const ProctorServerDownloadView: React.FC = () => {
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownloadClick = () => {
    setDownloadStarted(true);
    setTimeout(() => setDownloadStarted(false), 8000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* 1. Header Toolbar Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Server Proktor Portable (Moda Semi-Online)
              </h2>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                1-Klik Jalan (No Install)
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Jalankan server ujian lokal di ruang lab sekolah langsung dari laptop proktor. Tampilan web disajikan lewat jaringan WiFi lokal sekolah tanpa menguras kuota internet siswa, aman dari gangguan sinyal, dan tahan mati lampu.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Hero Download Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-slate-700 shadow-xl relative overflow-hidden">
        {/* Background glow ornament */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Paket Server Siap Pakai Versi Resmi 2.0</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SASI CBT Server Proktor Portable (.ZIP)
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Berisi file eksekusi instan <code className="text-emerald-300 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">MULAI_SERVER.bat</code>, mini web server bawaan Windows <code className="text-emerald-300 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">SasiCbtServer.exe</code>, dan seluruh bundle web CBT resmi. 
              Tanpa perlu menginstal Node.js, Python, atau aplikasi tambahan lainnya di laptop sekolah.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400 font-mono">
              <span className="flex items-center space-x-1">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Ukuran: <strong>2.68 MB</strong></span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Laptop className="w-4 h-4 text-sky-400" />
                <span>Windows 7, 8, 10, 11 (64-bit)</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>0 MB Kuota Tampilan</span>
              </span>
            </div>
          </div>

          <div className="shrink-0 w-full lg:w-auto flex flex-col items-stretch lg:items-end space-y-3">
            <a
              href="/downloads/SASI_CBT_SERVER_PORTABLE.zip"
              download="SASI_CBT_SERVER_PORTABLE.zip"
              onClick={handleDownloadClick}
              className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2.5 transition-all transform active:scale-95 group text-center"
            >
              <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
              <span>Unduh Paket Server (.ZIP)</span>
            </a>

            <div className="text-[11px] text-slate-400 text-center lg:text-right font-medium">
              Tersedia gratis untuk seluruh proktor SASI CBT
            </div>
          </div>
        </div>

        {downloadStarted && (
          <div className="mt-5 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center space-x-2.5 animate-slide-down">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pengunduhan dimulai! Setelah selesai, ekstrak file ZIP dan ikuti panduan di bawah ini.</span>
          </div>
        )}
      </div>

      {/* 3. Empat Langkah Mudah Pengoperasian */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-5">
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            4 Langkah Mudah Menjalankan di Ruang Ujian
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Panduan cepat untuk proktor atau teknisi ruangan saat pelaksanaan asesmen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Langkah 1 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 font-black text-sm flex items-center justify-center border border-brand-200">
              1
            </div>
            <h4 className="font-bold text-xs text-slate-900">Ekstrak File ZIP</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ekstrak file <code>SASI_CBT_SERVER_PORTABLE.zip</code> di Laptop Proktor (bisa diletakkan di Desktop atau Flashdisk).
            </p>
          </div>

          {/* Langkah 2 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 font-black text-sm flex items-center justify-center border border-sky-200">
              2
            </div>
            <h4 className="font-bold text-xs text-slate-900">Hubungkan ke WiFi</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Sambungkan Laptop Proktor dan HP/Laptop seluruh siswa ke jaringan WiFi/Router Lab yang <strong>SAMA</strong>.
            </p>
          </div>

          {/* Langkah 3 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm flex items-center justify-center border border-emerald-200">
              3
            </div>
            <h4 className="font-bold text-xs text-slate-900">Jalankan Server</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Klik 2x pada file <strong>MULAI_SERVER.bat</strong>. Jendela server akan aktif dan menampilkan alamat IP lokal Anda.
            </p>
          </div>

          {/* Langkah 4 */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 font-black text-sm flex items-center justify-center border border-purple-200">
              4
            </div>
            <h4 className="font-bold text-xs text-slate-900">Siswa Mulai Ujian</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Tulis alamat IP di papan tulis (misal: <code>192.168.1.25:8080</code>). Siswa membuka Google Chrome dan mengetik alamat tersebut.
            </p>
          </div>

        </div>
      </div>

      {/* 4. Tips & Troubleshooting Card */}
      <div className="bg-amber-50/60 rounded-3xl p-6 border border-amber-200 text-amber-950 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-black uppercase text-amber-900 tracking-wider">
          <HelpCircle className="w-4 h-4 text-amber-700" />
          <span>Tips & Solusi Kendala Proktor Ruangan:</span>
        </div>

        <ul className="text-xs space-y-2 text-amber-900 leading-relaxed list-disc list-inside">
          <li>
            <strong>Perangkat Siswa Tidak Dapat Membuka IP:</strong> Pastikan Laptop Proktor dan HP siswa terhubung pada nama WiFi yang persis sama. Jika muncul pesan waktu habis (*timed out*), izinkan port 8080 atau matikan sementara Windows Defender Firewall untuk jaringan *Private*.
          </li>
          <li>
            <strong>Jangan Menutup Jendela Hitam:</strong> Selama ujian berlangsung, biarkan jendela terminal server tetap menyala. Di jendela tersebut, Anda juga bisa melihat log perangkat siswa yang terhubung secara *real-time*.
          </li>
          <li>
            <strong>Data Nilai & Soal Otomatis Sinkron:</strong> Laptop proktor hanya perlu sedikit kuota internet untuk sinkronisasi nilai ke Supabase Cloud. Jawaban siswa juga aman dari mati lampu karena tersimpan di memori HP siswa (*Dual-Storage Autosave*).
          </li>
        </ul>
      </div>

    </div>
  );
};

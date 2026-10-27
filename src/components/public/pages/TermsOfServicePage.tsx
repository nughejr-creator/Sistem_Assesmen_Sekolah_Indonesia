import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Header */}
      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold border border-sky-400/30">
            <FileText className="w-3.5 h-3.5" />
            <span>Ketentuan Penggunaan Platform</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Syarat & Ketentuan Layanan (Terms of Service)
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Berlaku efektif sejak: 27 Oktober 2026 • Standar Layanan Platform SASIPEDIA
          </p>
        </div>
      </section>

      {/* Konten */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        
        <div className="bg-white p-6 sm:p-10 rounded-3xl border-2 border-slate-300 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">1. Penerimaan Ketentuan</h2>
            <p>
              Dengan mengakses dan menggunakan situs web SASIPEDIA (sasipedia.my.id) serta aplikasi asesmen yang terafiliasi, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan layanan yang diatur dalam dokumen ini.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">2. Hak Cipta & Lisensi Sumber Belajar</h2>
            <p>
              Materi modul ajar, lembar kerja siswa (LKPD), kisi-kisi, dan artikel evaluasi pendidikan yang diterbitkan di Zona Publik SASIPEDIA dilindungi oleh undang-undang hak cipta dan didistribusikan untuk tujuan:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>Peningkatan kualitas pembelajaran di ruang kelas tanpa dipungut biaya (*free educational use*).</li>
              <li>Pengguna diperkenankan mengunduh, mencetak, dan memodifikasi materi untuk kepentingan pembelajaran sekolah masing-masing dengan tetap mencantumkan atribusi sumber asli.</li>
              <li>Dilarang memperjualbelikan kembali dokumen unduhan dalam bentuk komersial tanpa izin tertulis dari inisiator/pemilik hak cipta.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">3. Tanggung Jawab Akun Asesmen CBT</h2>
            <p>
              Setiap sekolah, guru, proktor, dan siswa bertanggung jawab penuh menjaga kerahasiaan kredensial login (PIN ujian, kata sandi akun petugas). SASIPEDIA tidak bertanggung jawab atas kebocoran soal yang diakibatkan oleh kelalaian pengelolaan akun internal pengguna.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">4. Integritas Ujian & Larangan Kecurangan</h2>
            <p>
              Sistem CBT dilengkapi mekanisme deteksi perpindahan tab browser, pencatatan waktu jawaban, dan penguncian token pengerjaan. Segala bentuk rekayasa data atau manipulasi pengerjaan siswa akan ditindaklanjuti oleh panitia ujian sekolah masing-masing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">5. Perubahan Layanan</h2>
            <p>
              Pengembang berhak melakukan pembaruan, peningkatan performa, atau pemeliharaan server berkala demi keandalan sistem asesmen sekolah di Indonesia.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
};

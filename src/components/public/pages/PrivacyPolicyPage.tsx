import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Header */}
      <section className="bg-slate-900 text-white py-8 sm:py-9 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-bold border border-rose-400/30">
            <Lock className="w-3.5 h-3.5" />
            <span>Kepatuhan Hukum & Privasi Pengguna</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
            Kebijakan Privasi (Privacy Policy)
          </h1>
          <p className="text-xs text-slate-300">
            Terakhir diperbarui: 27 Oktober 2026 • Berlaku untuk seluruh ekosistem sasipedia.my.id
          </p>
        </div>
      </section>

      {/* Dokumen Legalitas */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        
        <div className="bg-white p-6 sm:p-10 rounded-3xl border-2 border-slate-300 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">1. Komitmen Perlindungan Privasi</h2>
            <p>
              SASIPEDIA (Sistem Asesmen Sekolah Indonesia) berkomitmen penuh melindungi hak privasi seluruh pengguna platform, meliputi peserta didik, tenaga pendidik, administrator sekolah, dan pengunjung portal publik. Kami menerapkan prinsip transparansi dalam pengumpulan dan pemrosesan data sesuai undang-undang perlindungan data yang berlaku di Republik Indonesia.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">2. Prinsip Pemisahan Data Dual-Zone (Isolasi Ruang Ujian)</h2>
            <p>
              Sistem kami beroperasi di bawah arsitektur Dual-Zone:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>
                <strong>Zona Asesmen CBT (Internal):</strong> Data pengerjaan ujian, identitas NISN siswa, token sesi, dan nilai murni disimpan dalam database klaster terproteksi dan <strong>TIDAK PERNAH</strong> dibagikan, dipublikasikan, atau diakses oleh pihak ketiga maupun jaringan periklanan.
              </li>
              <li>
                <strong>Zona Edukasi Publik:</strong> Merupakan portal artikel, repositori perangkat ajar, dan panduan yang bebas diakses masyarakat umum tanpa memerlukan pendaftaran data pribadi sensitif.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">3. Penggunaan Cookie & Google AdSense</h2>
            <p>
              Untuk mendukung operasional server dan penyediaan sumber belajar gratis, Zona Edukasi Publik SASIPEDIA dapat menampilkan iklan dari vendor pihak ketiga, termasuk Google:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li>
                Google menggunakan cookie untuk menayangkan iklan berdasarkan kunjungan sebelumnya ke situs web kami atau situs web lain di internet.
              </li>
              <li>
                Pengguna dapat memilih untuk menonaktifkan iklan hasil personalisasi dengan mengunjungi <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-sky-600 underline">Setelan Iklan Google</a>.
              </li>
              <li>
                Skrip iklan pihak ketiga <strong>DILARANG KERAS</strong> dan secara teknis dinonaktifkan sepenuhnya di seluruh halaman ruang pengerjaan ujian CBT siswa.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">4. Perlindungan Privasi Anak & Siswa Sekolah Dasar</h2>
            <p>
              Kami sangat menjunjung tinggi etika perlindungan privasi anak. Akun siswa dalam sistem CBT hanya menggunakan nomor induk siswa dan kode enkripsi acak tanpa mempublikasikan informasi kontak pribadi seperti nomor telepon atau alamat rumah.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-slate-900">5. Kontak Penanggung Jawab Data</h2>
            <p>
              Pertanyaan atau permohonan penghapusan data sekolah dapat diajukan kepada inisiator platform melalui surel resmi: <strong className="text-slate-900">agihamdani88@gmail.com</strong>.
            </p>
          </section>

        </div>

      </div>
    </div>
  );
};

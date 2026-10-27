import React, { useState } from 'react';
import { 
  Mail, 
  MapPin, 
  Phone, 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  School,
  GraduationCap
} from 'lucide-react';

export const AboutContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [school, setSchool] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Header */}
      <section className="bg-gradient-to-b from-slate-900 via-sky-950 to-slate-900 text-white py-8 sm:py-9 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-4xl mx-auto space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[11px] font-bold border border-sky-400/30">
            <School className="w-3.5 h-3.5" />
            <span>Tentang Kami & Layanan Bantuan</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
            Tentang SASIPEDIA & Kontak Resmi
          </h1>
          <p className="text-xs sm:text-xs text-slate-300 max-w-xl">
            Solusi asesmen sekolah berbasis teknologi mandiri, memadukan kecepatan komputasi klaster dengan kemudahan evaluasi pembelajaran bagi pendidik di Indonesia.
          </p>
        </div>
      </section>

      {/* Konten Utama */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Kolom Kiri: Tentang Platform */}
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Tentang Platform SASIPEDIA
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                <strong>SASIPEDIA (Sistem Asesmen Sekolah Indonesia)</strong> dirancang dari ruang kelas nyata oleh pendidik dasar untuk menjawab tantangan evaluasi Kurikulum Merdeka. Kami percaya bahwa asesmen berkualitas tidak harus rumit, mahal, atau membebani guru dengan tumpukan kertas koreksi manual.
              </p>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Platform ini menggabungkan mesin CBT terdesentralisasi (sharding multi-node) yang stabil saat diakses serentak oleh ratusan siswa, dengan portal publik yang menyediakan perangkat ajar dan asisten AI gratis bagi pendidik.
              </p>
            </div>

            {/* Informasi Kontak Pengembang */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900">
                Saluran Kontak & Alamat
              </h3>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Email Pengembang:</span>
                    <a href="mailto:agihamdani88@gmail.com" className="text-sky-600 hover:underline">
                      agihamdani88@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Domisili Pengembangan:</span>
                    <span>Sumedang, Jawa Barat, Indonesia (45352)</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Domain Resmi:</span>
                    <span className="font-mono text-slate-700">sasipedia.my.id</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Formulir Kirim Pesan / Aduan */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-300 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Kirim Pesan / Konsultasi Asesmen
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Punya pertanyaan mengenai implementasi CBT di sekolah Anda atau saran perbaikan konten?
              </p>
            </div>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-emerald-900">Pesan Anda Telah Diterima!</h4>
                <p className="text-xs text-emerald-700">
                  Terima kasih, <strong>{name}</strong>. Tim pengembang SASIPEDIA akan meninjau pesan Anda dan merespons melalui email secepatnya.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setName('');
                    setEmail('');
                    setSchool('');
                    setMessage('');
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                >
                  Kirim Pesan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso, S.Pd"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 text-xs focus:border-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Aktif <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@sekolah.sch.id"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 text-xs focus:border-sky-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Asal Sekolah / Lembaga
                    </label>
                    <input
                      type="text"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      placeholder="Contoh: SDN Cinanggerang I"
                      className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 text-xs focus:border-sky-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Isi Pesan / Topik Aduan <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tuliskan pertanyaan, masukan modul, atau kendala sistem yang ingin Anda diskusikan..."
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-300 text-xs focus:border-sky-500 focus:outline-hidden resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shadow-md border-2 border-slate-700 flex items-center justify-center space-x-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim Pesan Sekarang</span>
                </button>
              </form>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

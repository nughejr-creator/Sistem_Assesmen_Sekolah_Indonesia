# Sistem Asesmen Sekolah Indonesia (SASI) - CBT Engine

Sistem Asesmen Sekolah Indonesia (SASI) berbasis CBT (Computer-Based Test) modern yang melayani jenjang **Sekolah Dasar (SD - Fase A, B, C)** dan **Sekolah Menengah Pertama (SMP - Fase D)** untuk 5 jenis asesmen nasional:
1. **Penilaian Formatif**
2. **Penilaian Tengah Semester (PTS)**
3. **Sumatif Akhir Semester (SAS)**
4. **Sumatif Akhir Tahun (SAT)**
5. **Sumatif Akhir Jenjang (SAJ)**

---

## 🚀 Fitur Utama & Arsitektur

### 1. Dual-Tab Login Gate
* **Tab 1: Peserta Ujian (Siswa)**
  * Input NISN / No. Peserta, PIN Password Cetak, dan Token Ujian.
  * Otomatis melakukan **email masking di balik layar**: `[nisn]@siswa.sasi.id` untuk autentikasi Supabase Auth.
  * Opsi PIN 4-digit angka ramah anak (khusus SD Kelas 1-4) dan 6 karakter alfanumerik untuk SMP.
  * Tombol *Lupa Password* yang menginstruksikan siswa untuk melapor ke Proktor ruangan (menjaga integritas asesmen).
* **Tab 2: Petugas (Admin & Proktor)**
  * Input Email / Username dan Password.
  * Fitur reset password mandiri via email resmi.

### 2. Hirarki Otoritas & Hak Akses
1. **Super Admin (Pusat):** Akses penuh seluruh sistem, pemantauan KPI nasional, validator akhir bank soal, dan manajemen user.
2. **Asisten Super Admin:** Ditugaskan per Jenjang (SD/SMP) atau Mapel. Menyusun kisi-kisi dan menulis/meriviu soal.
3. **Proktor Sekolah:** Terkunci 1 sekolah berdasarkan NPSN. Mengelola siswa via Import Excel, Bulk Generate Akun/PIN, Cetak Kartu Ujian PDF, dan 3 tombol darurat:
   * *Lihat Kartu/Password*
   * *One-Click Reset Password* (PIN baru seketika)
   * *Reset Status Login* (melepas kunci sesi jika perangkat siswa mati/hang)
   * *Force Submit*
4. **Siswa:** Tidak ada dashboard statistik, langsung diarahkan ke *Konfirmasi Data & Token* -> *Arena Ujian CBT*.

### 3. Modul Pemetaan Kisi-Kisi & Turunan Bank Soal
* Breadcrumb: `Kisi-Kisi / Penyusunan Soal [Jenjang] [Mapel]`
* **Header & 4 Kartu Status Penugasan:** *Total Penugasan*, *Ditugaskan*, *Draft*, dan *Selesai* (masing-masing memuat breakdown *Tulis: X Soal* dan *Riviu: Y Soal*).
* **Tabel Matriks Kisi-Kisi 11 Kolom:**
  1. `Elemen`
  2. `Subelemen`
  3. `Kompetensi` (CP/TP)
  4. `Jenis Soal` (Single / Grup Wacana)
  5. `Level Kognitif` (L1, L2, L3)
  6. `Konteks` (**Creatable Combobox**: Preset Matematika & Bahasa Indonesia atau ketik manual)
  7. `Indikator`
  8. `Tipe Soal` (PG, PG Kompleks, Menjodohkan, Benar/Salah, Isian Singkat, Uraian)
  9. `Nomor Soal`
  10. `Tugas` (Badge TULIS / RIVIU)
  11. `Status` (Dalam Penulisan, Draft, Menunggu Riviu, Selesai)
* **Editor Butir Soal:** Mewarisi 11 atribut kisi-kisi secara otomatis dan memverifikasi soal masuk ke Bank Soal saat status `Selesai`.

### 4. Arena Ujian CBT Siswa
* Timer countdown real-time.
* Penyesuaian ukuran tulisan (A- / A / A+).
* Navigasi butir soal (Hijau: Sudah Dijawab, Kuning: Ragu-Ragu, Abu-abu: Belum).
* Renderer 6 model soal: Pilihan Ganda, PG Kompleks, Menjodohkan, Benar/Salah, Isian Singkat, dan Uraian.
* Indikator status koneksi (*Online* / *Sedang Offline*) di pojok kiri bawah dengan sinkronisasi penyimpanan lokal saat internet terputus.

---

## 🗄️ Spesifikasi Skema Database SQL Supabase

File migrasi DDL & Seed lengkap tersedia di [`supabase/schema.sql`](supabase/schema.sql):

| No | Nama Tabel | Deskripsi |
|---|---|---|
| 1 | `schools` | Data sekolah, NPSN, jenjang (`SD`, `SMP`), kecamatan |
| 2 | `user_profiles` | Profil pengguna, role hirarki, relasi sekolah, PIN cetak, status login |
| 3 | `subjects` | Mata pelajaran, kode, jenjang, fase (`A`, `B`, `C`, `D`) |
| 4 | `context_presets` | Master preset konteks untuk Matematika & Bahasa Indonesia |
| 5 | `blueprints` | Dokumen kisi-kisi induk asesmen |
| 6 | `blueprint_items` | 11 kolom matriks kisi-kisi penugasan |
| 7 | `question_bank` | Butir soal turunan kisi-kisi, stimulus teks/media, bobot, status |
| 8 | `question_options` | Pilihan jawaban, pasangan menjodohkan, catatan distractor |
| 9 | `exam_packages` | Paket asesmen (Formatif, PTS, SAS, SAT, SAJ) |
| 10 | `exam_package_questions` | Relasi soal ke paket ujian beserta nomor urut |
| 11 | `exam_sessions` | Sesi ujian aktif di sekolah beserta kode token |
| 12 | `student_attempts` | Sesi pengerjaan siswa untuk live monitoring realtime |
| 13 | `student_answers` | Jawaban butir soal siswa, status ragu-ragu, dan perolehan skor |

Dilengkapi:
* **Row Level Security (RLS)** untuk isolasi hak akses tiap role.
* **Supabase Realtime** pada tabel `student_attempts`, `exam_sessions`, dan `user_profiles`.
* **Supabase Storage** bucket `sasi-stimulus` untuk media stimulus infografis dan gambar soal.

---

## 💻 Cara Menjalankan Aplikasi

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Jalankan Development Server:**
   ```bash
   npm run dev
   ```

3. **Buka di Browser:**
   Akses `http://localhost:3000`

4. **Konfigurasi Supabase Terpasang:**
   Kredensial proyek Supabase Anda telah dikonfigurasi pada `.env` dan `.env.local`:
   ```env
   VITE_SUPABASE_URL=https://rsoqdbigxhgmskllfjzi.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_fm9JCMIFR0M2_dqBXOvrfQ_NWjx-IGP
   ```

5. **Eksekusi Skrip SQL di Dashboard Supabase:**
   1. Buka dashboard proyek Supabase Anda di [https://supabase.com/dashboard/project/rsoqdbigxhgmskllfjzi](https://supabase.com/dashboard/project/rsoqdbigxhgmskllfjzi).
   2. Masuk ke menu **SQL Editor** pada navigasi sebelah kiri.
   3. Klik tombol **New query**.
   4. Buka file [`supabase/schema.sql`](supabase/schema.sql) pada proyek ini, salin seluruh kodenya, dan tempelkan ke SQL Editor.
   5. Klik tombol **Run** (Ctrl + Enter) untuk membuat 13 tabel, fungsi trigger, RLS policies, storage bucket `sasi-stimulus`, serta publikasi Realtime.

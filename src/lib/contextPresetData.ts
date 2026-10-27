export interface ContextPresetItem {
  id: string;
  subject: 'Matematika' | 'Bahasa Indonesia' | 'General';
  text: string;
}

export const CONTEXT_PRESETS: ContextPresetItem[] = [
  // Presets Matematika
  { id: 'mat-1', subject: 'Matematika', text: 'Masalah Matematika' },
  { id: 'mat-2', subject: 'Matematika', text: 'Masalah Sehari-hari (Aplikatif)' },

  // Presets Bahasa Indonesia
  { id: 'bin-1', subject: 'Bahasa Indonesia', text: 'Kepemimpinan atau Menghargai Perbedaan' },
  { id: 'bin-2', subject: 'Bahasa Indonesia', text: 'Hewan atau Tumbuhan' },
  { id: 'bin-3', subject: 'Bahasa Indonesia', text: 'Kesehatan atau Lingkungan' },
  { id: 'bin-4', subject: 'Bahasa Indonesia', text: 'Persahabatan atau Keluarga' },
  { id: 'bin-5', subject: 'Bahasa Indonesia', text: 'Pengalaman Berlibur atau Mengunjungi Suatu Tempat' },
  { id: 'bin-6', subject: 'Bahasa Indonesia', text: 'Lomba atau Aktivitas di Lingkungan Sekitar' },
  { id: 'bin-7', subject: 'Bahasa Indonesia', text: 'Kepahlawanan/Budaya/Alam' },
  { id: 'bin-8', subject: 'Bahasa Indonesia', text: 'Kejujuran atau Kerja Sama' },
  { id: 'bin-9', subject: 'Bahasa Indonesia', text: 'Cara Membuat Kerajinan (yang diajarkan di sekolah) atau Makanan/Minuman' },
  { id: 'bin-10', subject: 'Bahasa Indonesia', text: 'Kecerdikan atau Kreativitas' },
];

export const getContextOptionsForSubject = (subjectName: string): string[] => {
  if (subjectName.toLowerCase().includes('matematika')) {
    return CONTEXT_PRESETS.filter(p => p.subject === 'Matematika').map(p => p.text);
  }
  if (subjectName.toLowerCase().includes('indonesia')) {
    return CONTEXT_PRESETS.filter(p => p.subject === 'Bahasa Indonesia').map(p => p.text);
  }
  return CONTEXT_PRESETS.map(p => p.text);
};

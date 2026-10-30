import { Blueprint, BlueprintItem } from '../types/database';
import { generateValidUUID } from './syncHelper';

/**
 * Utility untuk Ekspor dan Impor Excel Pemetaan Kisi-Kisi SASI
 * Menggunakan window.XLSX dari SheetJS (CDN pada index.html)
 * - Format Halaman A4 Landscape
 * - Margin 1.5 cm pada tiap sisi (top, bottom, left, right)
 * - Tampilan rapi, header elegan, lebar kolom proporsional siap cetak
 */

// Helper untuk mendapatkan objek XLSX dari global window (dimuat via CDN SheetJS)
const getXLSX = () => {
  if (typeof window !== 'undefined' && (window as any).XLSX) {
    return (window as any).XLSX;
  }
  throw new Error('Pustaka SheetJS (XLSX) sedang dimuat atau belum siap. Silakan tunggu 1-2 detik lalu coba lagi.');
};

export const exportBlueprintToExcel = (
  blueprint: Blueprint,
  items: BlueprintItem[],
  options?: { grade_class?: string; assessment_type?: string }
) => {
  const XLSX = getXLSX();

  const asmtName = options?.assessment_type || blueprint.assessment_type || 'SAS';
  const gradeText = options?.grade_class ? ` | Kelas: ${options.grade_class}` : '';

  // 1. Data Header Dokumen Resmi
  const titleData = [
    ['SISTEM ASESMEN SEKOLAH INDONESIA (SASI)'],
    [`PEMETAAN KISI-KISI BUTIR SOAL - ASESMEN ${asmtName.toUpperCase()}`],
    [`Jenjang: ${blueprint.level}${gradeText} (Fase ${blueprint.phase}) | Mata Pelajaran: ${blueprint.subject?.name || 'Matematika'} | Kategori: ${asmtName} | Tahun Ajaran: 2026/2027`],
    [''] // Blank separator
  ];

  // 2. Header Kolom Matriks (11 Kolom Sesuai Spesifikasi Master Context)
  const headers = [
    'No',
    'Elemen',
    'Subelemen',
    'Kompetensi (CP/TP)',
    'Jenis Soal',
    'Level Kognitif',
    'Konteks',
    'Indikator Soal',
    'Tipe Soal',
    'Tugas',
    'Status'
  ];

  // 3. Mapping Baris Data
  const rowData = items.map(item => [
    item.question_number,
    item.element,
    item.sub_element,
    item.competency,
    item.question_category,
    item.cognitive_level,
    item.context,
    item.indicator,
    item.question_type,
    item.task_type,
    item.workflow_status
  ]);

  // Gabungkan seluruh data sheet
  const sheetData = [
    ...titleData,
    headers,
    ...rowData
  ];

  // Buat Worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // 4. Konfigurasi Ukuran Kertas A4 & Margin 1.5 cm untuk Cetak (Print Setup)
  const marginInches = 1.5 / 2.54;

  ws['!margins'] = {
    left: marginInches,
    right: marginInches,
    top: marginInches,
    bottom: marginInches,
    header: 0.3,
    footer: 0.3
  };

  // Konfigurasi Halaman Print (A4 = 9, Landscape orientation)
  ws['!pageSetup'] = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToWidth: 1,
    fitToHeight: 0,
    fitToPage: true,
  };

  // 5. Lebar Kolom Proporsional (Tampilan Rapi & Nyaman Dibaca)
  ws['!cols'] = [
    { wch: 6 },   // No
    { wch: 18 },  // Elemen
    { wch: 18 },  // Subelemen
    { wch: 35 },  // Kompetensi
    { wch: 14 },  // Jenis Soal
    { wch: 22 },  // Level Kognitif
    { wch: 28 },  // Konteks
    { wch: 35 },  // Indikator Soal
    { wch: 20 },  // Tipe Soal
    { wch: 10 },  // Tugas
    { wch: 18 },  // Status
  ];

  // 6. Buat Workbook & Unduh File
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kisi-Kisi SASI');

  const cleanSubject = (blueprint.subject?.name || 'Mapel').replace(/[\s\/\(\)]+/g, '_');
  const gradeSlug = options?.grade_class ? `_${options.grade_class.replace(/\s+/g, '_')}` : '';
  const asmtSlug = `_${asmtName.replace(/\s+/g, '_')}`;
  const fileName = `Template_Kisi-Kisi_${blueprint.level}${gradeSlug}_Fase${blueprint.phase}_${cleanSubject}${asmtSlug}.xlsx`;

  try {
    XLSX.writeFile(wb, fileName);
  } catch (writeErr) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 200);
  }
};

export interface TemplateOptions {
  level: 'SD' | 'SMP';
  subject_name: string;
  grade_class: string;
  phase: string;
  assessment_type?: string;
}

/**
 * Download Template Excel Kosong Siap Cetak (A4 Margin 1.5 cm)
 * Dapat dipersonalisasi sesuai Jenjang, Mapel, Kelas, dan Fase
 */
export const downloadBlueprintTemplate = (
  blueprint: Blueprint,
  options?: TemplateOptions
) => {
  const level = options?.level || blueprint.level;
  const subjectName = options?.subject_name || blueprint.subject?.name || 'Matematika';
  const gradeClass = options?.grade_class || (level === 'SD' ? 'Kelas 4' : 'Kelas 7');
  const phase = options?.phase || (level === 'SD' ? 'B' : 'D');
  const assessmentType = options?.assessment_type || blueprint.assessment_type || 'SAS';

  // Sample kontekstual sesuai mata pelajaran
  let sample1 = {
    element: 'Bilangan',
    sub_element: 'Operasi Hitung',
    competency: 'Menyelesaikan masalah operasi hitung bilangan cacah dalam konteks kehidupan sehari-hari',
    indicator: 'Disajikan ilustrasi belanja, peserta didik dapat menghitung selisih harga barang belanjaan'
  };

  if (subjectName.toLowerCase().includes('indonesia') || subjectName.toLowerCase().includes('inggris')) {
    sample1 = {
      element: 'Membaca dan Memirsa',
      sub_element: 'Teks Informasi',
      competency: 'Menemukan informasi tersurat dan tersirat dalam teks bacaan faktual',
      indicator: 'Disajikan infografik/paragraf teks, peserta didik dapat menyimpulkan gagasan pokok secara tepat'
    };
  } else if (subjectName.toLowerCase().includes('pancasila')) {
    sample1 = {
      element: 'Undang-Undang Dasar 1945',
      sub_element: 'Hak dan Kewajiban',
      competency: 'Menerapkan hak dan kewajiban sebagai warga negara dalam lingkungan sekolah dan masyarakat',
      indicator: 'Disajikan studi kasus musyawarah kelas, peserta didik dapat menentukan tindakan yang mencerminkan musyawarah'
    };
  } else if (subjectName.toLowerCase().includes('ipa') || subjectName.toLowerCase().includes('ipas')) {
    sample1 = {
      element: 'Pemahaman IPAS / Sains',
      sub_element: 'Ekosistem dan Lingkungan',
      competency: 'Menganalisis hubungan antar makhluk hidup dan lingkungannya dalam jaring-jaring makanan',
      indicator: 'Disajikan rantai makanan suatu ekosistem sawah, peserta didik dapat memprediksi dampak kepunahan salah satu populasi'
    };
  }

  const sampleItems: BlueprintItem[] = [
    {
      id: 'template-1',
      blueprint_id: blueprint.id,
      question_number: 1,
      element: sample1.element,
      sub_element: sample1.sub_element,
      competency: sample1.competency,
      question_category: 'Single',
      cognitive_level: 'Pengetahuan dan Pemahaman (L1)',
      context: 'Personal',
      indicator: sample1.indicator,
      question_type: 'Pilihan Ganda',
      task_type: 'TULIS',
      workflow_status: 'Dalam Penulisan',
      subject_name: subjectName,
      grade_class: gradeClass,
      assessment_type: assessmentType as any
    },
    {
      id: 'template-2',
      blueprint_id: blueprint.id,
      question_number: 2,
      element: sample1.element,
      sub_element: sample1.sub_element,
      competency: sample1.competency,
      question_category: 'Single',
      cognitive_level: 'Aplikasi (L2)',
      context: 'Sosial Budaya',
      indicator: `Disajikan data atau narasi terkait ${sample1.sub_element}, peserta didik dapat menganalisis solusi yang tepat`,
      question_type: 'Pilihan Ganda Kompleks',
      task_type: 'TULIS',
      workflow_status: 'Draft',
      subject_name: subjectName,
      grade_class: gradeClass,
      assessment_type: assessmentType as any
    }
  ];

  exportBlueprintToExcel(
    {
      ...blueprint,
      level,
      phase: phase as any,
      assessment_type: assessmentType as any,
      subject: {
        id: 'sub-template',
        name: subjectName,
        code: subjectName.substring(0, 3).toUpperCase(),
        level
      }
    },
    sampleItems,
    { grade_class: gradeClass, assessment_type: assessmentType }
  );
};

/**
 * Parsing File Excel yang di-upload oleh pengguna
 * Otomatis menyematkan subject_name, grade_class, dan assessment_type
 */
export const parseBlueprintFromExcel = (
  file: File,
  blueprintId: string,
  defaultMeta?: {
    level?: string;
    subject_name?: string;
    grade_class?: string;
    phase?: string;
    assessment_type?: string;
  }
): Promise<BlueprintItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const XLSX = getXLSX();
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Konversi ke array of array
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Coba ekstrak metadata dari 5 baris pertama jika ada
        let extractedSubject = '';
        let extractedGrade = '';
        let extractedAsmt = '';

        const VALID_ASSESSMENTS = ['Formatif', 'PTS', 'SAS', 'SAT', 'SAJ'];

        for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
          const rowText = (rawRows[i] || []).join(' ');
          
          const subjMatch = rowText.match(/Mata Pelajaran:\s*([^|]+)/i);
          if (subjMatch && !extractedSubject) extractedSubject = subjMatch[1].trim();

          const gradeMatch = rowText.match(/(?:Tingkat|Kelas):\s*([^|]+)/i);
          if (gradeMatch && !extractedGrade) extractedGrade = gradeMatch[1].trim();

          // Hindari false positive "SISTEM ASESMEN SEKOLAH INDONESIA"
          const katMatch = rowText.match(/(?:Kategori|Asesmen):\s*([^|]+)/i);
          if (katMatch && !extractedAsmt) {
            const raw = katMatch[1].trim();
            const matchedValid = VALID_ASSESSMENTS.find(v => v.toLowerCase() === raw.toLowerCase());
            if (matchedValid) extractedAsmt = matchedValid;
          }
          if (!extractedAsmt) {
            // Cocokkan hanya enum asesmen resmi jika format "ASESMEN FORMATIF" dsb.
            const bannerMatch = rowText.match(/ASESMEN\s+(Formatif|PTS|SAS|SAT|SAJ)\b/i);
            if (bannerMatch) {
              const matchedValid = VALID_ASSESSMENTS.find(v => v.toLowerCase() === bannerMatch[1].toLowerCase());
              if (matchedValid) extractedAsmt = matchedValid;
            }
          }
        }

        // Prioritas tertinggi: Gunakan defaultMeta yang dipilih guru di UI jika tersedia
        const finalSubject = defaultMeta?.subject_name || extractedSubject || 'Matematika';
        const finalGrade = defaultMeta?.grade_class || extractedGrade || 'Kelas 4';
        const finalAsmt = defaultMeta?.assessment_type || extractedAsmt || 'SAS';

        // Cari baris header tabel (yang mengandung kata 'Elemen' atau 'No')
        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
          const row = rawRows[i];
          if (row && row.some((cell: any) => typeof cell === 'string' && cell.toLowerCase().includes('elemen'))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx === -1) {
          throw new Error('Format tabel tidak sesuai. Pastikan baris judul kolom memuat "Elemen", "Indikator", dll.');
        }

        const dataRows = rawRows.slice(headerRowIdx + 1);
        const parsedItems: BlueprintItem[] = [];

        dataRows.forEach((row, idx) => {
          // Abaikan baris kosong
          if (!row || row.length === 0 || !row[1]) return;

          const questionNum = parseInt(row[0]) || (parsedItems.length + 1);
          const element = String(row[1] || 'Umum').trim();
          const subElement = String(row[2] || '-').trim();
          const competency = String(row[3] || '-').trim();
          const questionCategory = (String(row[4] || '').toLowerCase().includes('grup') ? 'Grup Wacana' : 'Single') as 'Single' | 'Grup Wacana';
          
          let cogLevel = 'Pengetahuan dan Pemahaman (L1)';
          const rawCog = String(row[5] || '').toUpperCase();
          if (rawCog.includes('L3') || rawCog.includes('PENALARAN')) cogLevel = 'Penalaran (L3)';
          else if (rawCog.includes('L2') || rawCog.includes('APLIKASI')) cogLevel = 'Aplikasi (L2)';

          const context = String(row[6] || '').trim();
          const indicator = String(row[7] || '-').trim();
          
          let qType: any = 'Pilihan Ganda';
          const rawType = String(row[8] || '').toLowerCase();
          if (rawType.includes('kompleks')) qType = 'Pilihan Ganda Kompleks';
          else if (rawType.includes('jodoh')) qType = 'Menjodohkan';
          else if (rawType.includes('benar') || rawType.includes('salah')) qType = 'Benar/Salah';
          else if (rawType.includes('isian')) qType = 'Isian Singkat';
          else if (rawType.includes('uraian')) qType = 'Uraian';

          const taskType = String(row[9] || '').toUpperCase().includes('RIVIU') ? 'RIVIU' : 'TULIS';
          
          let status: any = 'Dalam Penulisan';
          const rawStatus = String(row[10] || '').toLowerCase();
          if (rawStatus.includes('selesai')) status = 'Selesai';
          else if (rawStatus.includes('menunggu')) status = 'Menunggu Riviu';
          else if (rawStatus.includes('draft')) status = 'Draft';

          parsedItems.push({
            id: generateValidUUID(),
            blueprint_id: blueprintId,
            question_number: questionNum,
            element,
            sub_element: subElement,
            competency,
            question_category: questionCategory,
            cognitive_level: cogLevel as any,
            context,
            indicator,
            question_type: qType,
            task_type: taskType as any,
            workflow_status: status,
            subject_name: finalSubject,
            grade_class: finalGrade,
            assessment_type: finalAsmt as any
          });
        });

        if (parsedItems.length === 0) {
          throw new Error('Tidak ada data butir kisi-kisi yang dapat dibaca dari file Excel.');
        }

        resolve(parsedItems);
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file Excel.'));
    reader.readAsArrayBuffer(file);
  });
};

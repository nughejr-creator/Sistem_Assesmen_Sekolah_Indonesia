import { UserProfile, SchoolLevel, Phase } from '../types/database';
import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  nisn: string;
  fullName: string;
  gender: 'L' | 'P';
  grade: string;
  rombel: string;
  level: SchoolLevel;
  phase?: Phase;
  pin?: string;
}

/**
 * Trigger genuine browser download for a Blob
 */
export function triggerFileDownload(content: BlobPart, fileName: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * 1. Download Official Excel Template for Student Import (.xlsx)
 */
export function downloadStudentTemplate() {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    ['NISN', 'Nama Lengkap', 'Jenis Kelamin (L/P)', 'Kelas', 'Rombel', 'Jenjang (SD/SMP)', 'PIN Cetak (Opsional)'],
    ['0123456789', 'Bintang Pratama', 'L', '6', '6-A', 'SD', '4821'],
    ['0123456790', 'Aisyah Putri Ramadhani', 'P', '6', '6-A', 'SD', '1934'],
    ['0123456791', 'Dimas Satria Wibowo', 'L', '6', '6-B', 'SD', '5720'],
    ['0123456792', 'Kirana Larasati', 'P', '6', '6-B', 'SD', '6312'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 16 }, // NISN
    { wch: 28 }, // Nama Lengkap
    { wch: 20 }, // JK
    { wch: 10 }, // Kelas
    { wch: 14 }, // Rombel
    { wch: 18 }, // Jenjang
    { wch: 20 }, // PIN
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa SASI');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerFileDownload(blob, 'Template_Import_Siswa_SASI.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/**
 * 2. Export Student Accounts & Generated PINs to genuine Excel (.xlsx)
 */
export function exportStudentsToExcel(students: UserProfile[], schoolName: string) {
  const wb = XLSX.utils.book_new();

  const header = [
    'No',
    'NISN / No Peserta',
    'Nama Lengkap',
    'Kelas / Rombel',
    'Jenjang (Fase)',
    'Email Masking Supabase',
    'PIN Cetak Ujian'
  ];

  const rows = students.map((s, idx) => [
    idx + 1,
    s.username,
    s.full_name,
    s.grade_class ? `Kelas ${s.grade_class}` : '-',
    `${s.assigned_level || 'SD'} (Fase ${s.phase || '-'})`,
    `${s.username}@siswa.sasi.id`,
    s.exam_card_password || s.password || '-'
  ]);

  const wsData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 30 },
    { wch: 16 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Akun Siswa');

  const safeSchoolName = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerFileDownload(
    blob, 
    `Daftar_Akun_PIN_Siswa_${safeSchoolName}.xlsx`, 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

/**
 * 3. Generate PIN based on level preference
 * - SD Kelas 1-4: 4-digit simple numeric (e.g. 4821)
 * - SMP & SD Kelas 5-6: 6-char alphanumeric (e.g. K92J1P)
 */
export function generateStudentPin(level: SchoolLevel = 'SD', gradeStr?: string, forceType?: '4digit' | '6alpha'): string {
  const gradeNum = parseInt(gradeStr || '4', 10);
  const use4Digit = forceType === '4digit' || (level === 'SD' && gradeNum <= 4 && forceType !== '6alpha');

  if (use4Digit) {
    // 4 digit angka mudah
    return String(Math.floor(1000 + Math.random() * 9000));
  } else {
    // 6 karakter alfanumerik huruf besar & angka
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // exclude ambiguous 0/O, 1/I
    let pin = '';
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
  }
}

/**
 * Sanitasi pintar tingkat kelas, rombel, jenjang, dan fase kurikulum siswa dari string input apa pun.
 * Menangani string seperti:
 * - "Kelas 4", "Kls 4", "4", "4-A", "4A", "IV", "Fase B", "Kelas Fase B", dsb.
 */
export function sanitizeStudentGradeAndRombel(rawGrade?: string, rawRombel?: string, rawLevel?: string): {
  grade: string;
  rombel: string;
  level: SchoolLevel;
  phase: Phase;
} {
  const combined = `${rawGrade || ''} ${rawRombel || ''}`.trim();
  
  // 1. Cek Angka Eksplisit (misal: "Kelas 4", "4", "4-A", "Kls 6")
  let gradeNum: number | null = null;
  const numMatch = combined.match(/\b(1[0-2]|[1-9])\b/) || combined.match(/(\d+)/);
  if (numMatch) {
    gradeNum = parseInt(numMatch[1], 10);
  }

  // 2. Cek Angka Romawi (misal: "IV", "VI", "VII")
  if (!gradeNum) {
    const romanMatch = combined.match(/\b(XII|XI|X|IX|VIII|VII|VI|V|IV|III|II|I)\b/i);
    if (romanMatch) {
      const romanMap: Record<string, number> = {
        'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
        'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12
      };
      gradeNum = romanMap[romanMatch[1].toUpperCase()] || null;
    }
  }

  // 3. Cek Fase Kurikulum Merdeka (misal: "Fase B", "Kelas Fase B")
  if (!gradeNum) {
    const phaseMatch = combined.match(/fase\s*([a-f])/i);
    if (phaseMatch) {
      const p = phaseMatch[1].toUpperCase();
      if (p === 'A') gradeNum = 1;
      else if (p === 'B') gradeNum = 4;
      else if (p === 'C') gradeNum = 6;
      else if (p === 'D') gradeNum = 7;
      else if (p === 'E') gradeNum = 10;
      else if (p === 'F') gradeNum = 11;
    }
  }

  // Default fallback jika tidak ada yang cocok
  if (!gradeNum) {
    gradeNum = (rawLevel && rawLevel.toUpperCase().includes('SMP')) ? 7 : 6;
  }

  const gradeStr = String(gradeNum);

  // 4. Sanitasi Rombel (contoh: "4-A", "4-B", dsb)
  let section = 'A';
  // Cari huruf paralel (misal: "4-B", "4B", "Kelas 4 B", "Rombel C")
  const sectionMatch = combined.match(/(?:[-/\s])([A-Z])\b/i) || combined.match(/\d+\s*([A-Z])\b/i);
  if (sectionMatch && sectionMatch[1]) {
    const char = sectionMatch[1].toUpperCase();
    if (char !== 'I' && char !== 'V' && char !== 'X') { // Hindari ambigu romawi
      section = char;
    }
  }
  const cleanRombel = `${gradeStr}-${section}`;

  // 5. Tentukan Level (SD / SMP)
  const isSmp = (rawLevel && rawLevel.toUpperCase().includes('SMP')) || gradeNum >= 7;
  const level: SchoolLevel = isSmp ? 'SMP' : 'SD';

  // 6. Tentukan Fase Kurikulum Merdeka resmi
  let phase: Phase = 'C';
  if (level === 'SMP' || gradeNum >= 7) {
    phase = 'D';
  } else if (gradeNum <= 2) {
    phase = 'A';
  } else if (gradeNum <= 4) {
    phase = 'B';
  } else {
    phase = 'C';
  }

  return {
    grade: gradeStr,
    rombel: cleanRombel,
    level,
    phase
  };
}

/**
 * 4. Parse Student Spreadsheet file (.xlsx / .xls / .csv / .txt)
 */
export async function parseStudentSpreadsheet(file: File): Promise<ParsedStudentRow[]> {
  // 1. Coba baca menggunakan parser XLSX (Mendukung .xlsx modern, .xls binary, dan .csv)
  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheetName];
    const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (jsonRows && jsonRows.length > 0) {
      const parsed: ParsedStudentRow[] = [];

      for (const r of jsonRows) {
        const keys = Object.keys(r);
        const findVal = (patterns: string[]) => {
          const matchKey = keys.find(k => {
            const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
            return patterns.some(p => clean.includes(p));
          });
          return matchKey ? String(r[matchKey]).trim() : '';
        };

        const nisn = findVal(['nisn', 'username', 'nopeserta', 'peserta', 'nomer']);
        const fullName = findVal(['namalengkap', 'nama', 'namasiswa', 'fullname', 'peserta']);
        const genderRaw = findVal(['jk', 'jeniskelamin', 'gender', 'sex']).toUpperCase();
        const gender: 'L' | 'P' = genderRaw === 'P' || genderRaw === 'PEREMPUAN' || genderRaw === 'F' ? 'P' : 'L';
        const rawGrade = findVal(['kelas', 'tingkat', 'grade']);
        const rawRombel = findVal(['rombel', 'paralel', 'kelasrombel']);
        const rawLevel = findVal(['jenjang', 'level', 'satuan']).toUpperCase();
        const pin = findVal(['pin', 'password', 'sandi', 'kunci']);

        const sanitized = sanitizeStudentGradeAndRombel(rawGrade, rawRombel, rawLevel);

        if (nisn && fullName) {
          parsed.push({
            nisn,
            fullName,
            gender,
            grade: sanitized.grade,
            rombel: sanitized.rombel,
            level: sanitized.level,
            phase: sanitized.phase,
            pin: pin || undefined
          });
        }
      }

      if (parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca dengan parser XLSX binary, mencoba fallback text:', err);
  }

  // 2. Fallback: Parse CSV / Delimited text / XML legacy
  const text = await file.text();
  const rows: ParsedStudentRow[] = [];

  // Check if it's XML Spreadsheet legacy
  if (text.includes('<?xml') && text.includes('<Row>')) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const xmlRows = xmlDoc.getElementsByTagName('Row');

    for (let i = 1; i < xmlRows.length; i++) {
      const cells = xmlRows[i].getElementsByTagName('Cell');
      if (cells.length >= 2) {
        const nisn = cells[0]?.textContent?.trim() || '';
        const name = cells[1]?.textContent?.trim() || '';
        const gender = (cells[2]?.textContent?.trim().toUpperCase() === 'P' ? 'P' : 'L') as 'L' | 'P';
        const rawGrade = cells[3]?.textContent?.trim() || '';
        const rawRombel = cells[4]?.textContent?.trim() || '';
        const rawLevel = cells[5]?.textContent?.trim().toUpperCase() || '';
        const pin = cells[6]?.textContent?.trim() || '';

        const sanitized = sanitizeStudentGradeAndRombel(rawGrade, rawRombel, rawLevel);

        if (nisn && name) {
          rows.push({
            nisn,
            fullName: name,
            gender,
            grade: sanitized.grade,
            rombel: sanitized.rombel,
            level: sanitized.level,
            phase: sanitized.phase,
            pin: pin || undefined
          });
        }
      }
    }
    return rows;
  }

  // Fallback: Parse CSV / Tab text
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const startIndex = lines[0].toLowerCase().includes('nisn') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const delimiter = lines[i].includes(';') ? ';' : lines[i].includes('\t') ? '\t' : ',';
    const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length >= 2 && cols[0]) {
      const nisn = cols[0];
      const name = cols[1];
      const gender = (cols[2]?.toUpperCase() === 'P' ? 'P' : 'L') as 'L' | 'P';
      const grade = cols[3] || '6';
      const rombel = cols[4] || `${grade}-A`;
      const level = (cols[5]?.toUpperCase() === 'SMP' ? 'SMP' : 'SD') as SchoolLevel;
      const pin = cols[6] || '';
      const gradeNum = parseInt(grade, 10);

      rows.push({
        nisn,
        fullName: name,
        gender,
        grade,
        rombel,
        level,
        phase: level === 'SMP' ? 'D' : gradeNum <= 2 ? 'A' : gradeNum <= 4 ? 'B' : 'C',
        pin: pin || undefined
      });
    }
  }

  return rows;
}

export interface ParsedSchoolProctorRow {
  npsn: string;
  name: string;
  level: SchoolLevel;
  district: string;
  proctorName?: string;
  proctorUsername?: string;
  proctorPassword?: string;
  isValid: boolean;
  errors: string[];
}

/**
 * 4. Download Official Excel Template for School & Proctor Batch Import (.xlsx)
 */
export function downloadSchoolProctorTemplate() {
  const wb = XLSX.utils.book_new();
  const sampleData = [
    [
      'NPSN',
      'Nama Sekolah',
      'Jenjang (SD/SMP)',
      'Kecamatan / Wilayah',
      'Nama Proktor (Opsional)',
      'Username / Email Proktor (Opsional)',
      'Kata Sandi Proktor (Opsional)'
    ],
    [
      '20234567',
      'SD Negeri 1 Percobaan',
      'SD',
      'Kec. Pamulihan, Kab. Sumedang, Jawa Barat',
      'Ubay Sohibi, S.Pd.',
      'sdn1percobaan@gmail.com',
      'proktor123'
    ],
    [
      '20234568',
      'SMP Negeri 1 Unggulan',
      'SMP',
      'Kec. Tanjungsari, Kab. Sumedang, Jawa Barat',
      'Dedi Mulyadi, S.Kom.',
      'smpn1unggulan@gmail.com',
      'proktor123'
    ],
    [
      '20234569',
      'SD Negeri 2 Cinanggerang',
      'SD',
      'Kec. Pamulihan, Kab. Sumedang, Jawa Barat',
      'Tita Rosita, S.Pd.',
      'proktor_sdn2cinanggerang',
      'proktor123'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  ws['!cols'] = [
    { wch: 14 }, // NPSN
    { wch: 30 }, // Nama Sekolah
    { wch: 18 }, // Jenjang
    { wch: 42 }, // Kecamatan / Wilayah
    { wch: 26 }, // Nama Proktor
    { wch: 32 }, // Username Proktor
    { wch: 22 }, // Kata Sandi Proktor
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Sekolah & Proktor');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerFileDownload(blob, 'Template_Impor_Sekolah_dan_Proktor_SASI.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/**
 * 5. Parse Spreadsheet for School & Proctor Batch Import (.xlsx / .xls)
 */
export async function parseSchoolProctorSpreadsheet(file: File): Promise<ParsedSchoolProctorRow[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length < 2) {
    return [];
  }

  // Identifikasi letak kolom dari header
  const header = rawRows[0].map((h: any) => String(h).toLowerCase().trim());
  let npsnIdx = header.findIndex((h: string) => h.includes('npsn'));
  let nameIdx = header.findIndex((h: string) => h.includes('nama sekolah') || h.includes('sekolah'));
  let levelIdx = header.findIndex((h: string) => h.includes('jenjang') || h.includes('tingkat') || h.includes('level'));
  let districtIdx = header.findIndex((h: string) => h.includes('wilayah') || h.includes('kecamatan') || h.includes('alamat'));
  let proctorNameIdx = header.findIndex((h: string) => h.includes('nama proktor') || h.includes('proktor'));
  let proctorUserIdx = header.findIndex((h: string) => h.includes('username') || h.includes('email'));
  let proctorPassIdx = header.findIndex((h: string) => h.includes('sandi') || h.includes('password'));

  // Fallback jika header tidak terdeteksi
  if (npsnIdx === -1) npsnIdx = 0;
  if (nameIdx === -1) nameIdx = 1;
  if (levelIdx === -1) levelIdx = 2;
  if (districtIdx === -1) districtIdx = 3;
  if (proctorNameIdx === -1) proctorNameIdx = 4;
  if (proctorUserIdx === -1) proctorUserIdx = 5;
  if (proctorPassIdx === -1) proctorPassIdx = 6;

  const results: ParsedSchoolProctorRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawNpsn = String(row[npsnIdx] || '').trim();
    const rawName = String(row[nameIdx] || '').trim();
    const rawLevel = String(row[levelIdx] || '').trim().toUpperCase();
    const rawDistrict = String(row[districtIdx] || '').trim();
    const rawProctorName = String(row[proctorNameIdx] || '').trim();
    const rawProctorUser = String(row[proctorUserIdx] || '').trim();
    const rawProctorPass = String(row[proctorPassIdx] || '').trim();

    if (!rawNpsn && !rawName) continue;

    const errors: string[] = [];
    if (!rawNpsn) {
      errors.push('NPSN tidak boleh kosong');
    } else if (!/^\d{6,10}$/.test(rawNpsn)) {
      errors.push('Format NPSN harus 6-10 digit angka');
    }

    if (!rawName) {
      errors.push('Nama Sekolah tidak boleh kosong');
    }

    const resolvedLevel: SchoolLevel = rawLevel.includes('SMP') ? 'SMP' : 'SD';
    const defaultUsername = rawNpsn ? `proktor_${rawNpsn}` : '';
    const proctorUsername = rawProctorUser || (rawProctorName ? defaultUsername : undefined);
    const proctorPassword = rawProctorPass || (rawProctorName || proctorUsername ? 'proktor123' : undefined);

    results.push({
      npsn: rawNpsn,
      name: rawName,
      level: resolvedLevel,
      district: rawDistrict || 'Kecamatan Wilayah Sekolah',
      proctorName: rawProctorName || (proctorUsername ? `Proktor ${rawName}` : undefined),
      proctorUsername,
      proctorPassword,
      isValid: errors.length === 0,
      errors
    });
  }

  return results;
}

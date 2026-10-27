import React, { useState, useRef } from 'react';
import { SchoolLevel, UserProfile, School } from '../../types/database';
import { 
  downloadStudentTemplate, 
  parseStudentSpreadsheet, 
  generateStudentPin, 
  ParsedStudentRow 
} from '../../lib/excelHelper';
import { supabase } from '../../lib/supabase';
import { generateValidUUID, toValidUUID, safeSupabaseUpsert } from '../../lib/syncHelper';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Table, 
  Check,
  School as SchoolIcon
} from 'lucide-react';

interface ImportExcelModalProps {
  schoolLevel?: SchoolLevel;
  schoolId?: string;
  schools?: School[];
  onClose: () => void;
  onImportComplete: (count: number, newStudents?: UserProfile[]) => void;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  schoolLevel = 'SD',
  schoolId,
  schools = [],
  onClose,
  onImportComplete,
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    schoolId || (schools.length > 0 ? schools[0].id : '')
  );

  const activeSchool = schools.find(s => s.id === selectedSchoolId);
  const activeLevel: SchoolLevel = activeSchool?.level || schoolLevel || 'SD';

  const [pinType, setPinType] = useState<'4digit' | '6alpha'>(
    activeLevel === 'SD' ? '4digit' : '6alpha'
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    try {
      const rows = await parseStudentSpreadsheet(file);
      if (rows.length === 0) {
        setErrorMessage('File tidak memuat data siswa yang valid. Pastikan kolom NISN dan Nama Lengkap terisi.');
      } else {
        setParsedRows(rows);
      }
    } catch (err: any) {
      setErrorMessage(`Gagal membaca file spreadsheet: ${err.message}`);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const usedPins = new Set<string>();
      const validSchoolId = selectedSchoolId ? toValidUUID(selectedSchoolId) : null;
      const cached = localStorage.getItem('sasi_users_cache');
      let existingUsers: UserProfile[] = [];
      try {
        if (cached) existingUsers = JSON.parse(cached);
      } catch (e) {}
      const existingUserMap = new Map(existingUsers.map(u => [u.username.trim(), u]));

      const generatedStudents: UserProfile[] = parsedRows.map((row) => {
        const nisnClean = row.nisn.trim();
        const existingStudent = existingUserMap.get(nisnClean);

        let pin = row.pin?.trim() || existingStudent?.password || '';
        if (!pin) {
          let attempts = 0;
          do {
            pin = generateStudentPin(row.level || activeLevel, row.grade, pinType);
            attempts++;
          } while (usedPins.has(pin) && attempts < 100);
        }
        usedPins.add(pin);

        const studentUUID = existingStudent?.id || generateValidUUID();

        return {
          id: studentUUID,
          username: nisnClean,
          full_name: row.fullName.trim(),
          role: 'student',
          school_id: validSchoolId || undefined,
          school: activeSchool,
          assigned_level: row.level || activeLevel,
          grade_class: row.rombel || `${row.grade}-A`,
          phase: row.phase || (row.level === 'SMP' ? 'D' : 'B'),
          exam_card_password: pin,
          password: pin,
          is_logged_in: false,
          created_at: existingStudent?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      // 1. Simpan ke Supabase Cloud (tabel user_profiles) dengan format lengkap & UUID valid
      try {
        const payload = generatedStudents.map(s => ({
          id: s.id,
          username: s.username,
          full_name: s.full_name,
          role: 'student',
          school_id: s.school_id ? toValidUUID(s.school_id) : null,
          assigned_level: s.assigned_level,
          grade_class: s.grade_class,
          phase: s.phase,
          exam_card_password: s.exam_card_password,
          password: s.password,
          is_logged_in: false,
          updated_at: new Date().toISOString()
        }));

        await safeSupabaseUpsert('user_profiles', payload, selectedSchoolId);
      } catch (err) {
        console.warn('Network sync error during import:', err);
      }

      // 2. Simpan seketika ke LocalStorage (sasi_users_cache)
      try {
        const cached = localStorage.getItem('sasi_users_cache');
        let existingUsers: UserProfile[] = cached ? JSON.parse(cached) : [];
        const userMap = new Map(existingUsers.map(u => [u.username, u]));
        generatedStudents.forEach(s => userMap.set(s.username, s));
        localStorage.setItem('sasi_users_cache', JSON.stringify(Array.from(userMap.values())));
      } catch (e) {}

      setIsProcessing(false);
      setSuccess(true);
      setTimeout(() => {
        onImportComplete(generatedStudents.length, generatedStudents);
      }, 800);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(`Terjadi kesalahan saat memproses data: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-scale-up my-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Impor Data Siswa dari Excel (.xlsx)</h3>
              <p className="text-xs text-slate-500">
                Jenjang: <strong>{activeLevel}</strong> • {activeSchool ? activeSchool.name : 'Semua Satuan Pendidikan'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          
          {/* Target School Selector (Khusus Super Admin / Admin yang tidak memiliki schoolId terkunci) */}
          {!schoolId && schools.length > 0 && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-1.5">
                <SchoolIcon className="w-4 h-4 text-brand-600" />
                <span>Pilih Sekolah Tujuan Impor Siswa:</span>
              </label>
              <select
                value={selectedSchoolId}
                onChange={(e) => setSelectedSchoolId(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.npsn} - {s.level})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Step 1: Download Template Button */}
          <div className="flex items-center justify-between p-3.5 bg-brand-50 border border-brand-200 rounded-2xl">
            <div>
              <div className="text-xs font-bold text-brand-900">Belum punya format Excel?</div>
              <div className="text-[11px] text-brand-700">Unduh template resmi SASI dengan contoh kolom isian yang sesuai.</div>
            </div>
            <button
              type="button"
              onClick={downloadStudentTemplate}
              className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm shrink-0 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template (.xlsx)</span>
            </button>
          </div>

          {/* Step 2: PIN Generation Preference */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-800 block mb-2">
              Format Pembuatan PIN Password Otomatis:
            </label>
            <div className="space-y-2">
              <label className="flex items-start space-x-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="pin_type"
                  checked={pinType === '4digit'}
                  onChange={() => setPinType('4digit')}
                  className="mt-0.5 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="font-bold text-slate-900">4 Digit Angka Mudah (Rekomendasi SD Kelas 1-4)</span>
                  <p className="text-[11px] text-slate-500">
                    Contoh: <code>4821</code>, <code>1934</code>. Anak usia dini mudah mengetik di keyboard lab.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="pin_type"
                  checked={pinType === '6alpha'}
                  onChange={() => setPinType('6alpha')}
                  className="mt-0.5 text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="font-bold text-slate-900">6 Karakter Alfanumerik (Standar SMP / SD Kelas 5-6)</span>
                  <p className="text-[11px] text-slate-500">
                    Contoh: <code>K92J1P</code>, <code>H7X4N2</code>. Lebih aman untuk jenjang atas.
                  </p>
                </div>
              </label>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">
              *Catatan: Jika file Excel Anda sudah memiliki kolom PIN tersendiri, PIN dari Excel akan diprioritaskan.
            </p>
          </div>

          {/* Step 3: Real File Upload Zone */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
          />

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              selectedFile ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:border-brand-500 bg-slate-50'
            }`}
          >
            <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${selectedFile ? 'text-emerald-600' : 'text-slate-400'}`} />
            {selectedFile ? (
              <div>
                <div className="text-xs font-bold text-emerald-800">{selectedFile.name}</div>
                <div className="text-[11px] text-emerald-600">
                  {parsedRows.length} data siswa berhasil terdeteksi dari file! (Klik untuk ganti file)
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold text-slate-700">Pilih file spreadsheet siswa (.xlsx, .xls, atau .csv)</div>
                <div className="text-[11px] text-slate-400 mt-1">Klik di sini untuk menjelajahi file dari laptop/komputer Anda</div>
              </div>
            )}
          </div>

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-700 flex justify-between items-center text-[11px]">
                <span>Pratinjau Data Siswa ({parsedRows.length} Baris):</span>
                <span className="text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">Siap Diimpor</span>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                {parsedRows.slice(0, 10).map((r, idx) => (
                  <div key={idx} className="px-3.5 py-1.5 flex justify-between text-[11px] text-slate-700 hover:bg-slate-50">
                    <span className="font-mono font-bold text-slate-900">{r.nisn}</span>
                    <span className="font-medium truncate max-w-[160px]">{r.fullName}</span>
                    <span className="text-slate-500">Kelas {r.rombel}</span>
                    <span className="font-mono text-brand-700">{r.pin || 'Auto-PIN'}</span>
                  </div>
                ))}
              </div>
              {parsedRows.length > 10 && (
                <div className="bg-slate-50 px-3 py-1.5 text-center text-[10px] text-slate-400 italic">
                  + {parsedRows.length - 10} data siswa lainnya...
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>Berhasil mengimpor {parsedRows.length} siswa ke Supabase Cloud! Menutup modal...</span>
            </div>
          )}

        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0 || isProcessing || success}
            onClick={handleExecuteImport}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm disabled:opacity-50 transition-all transform active:scale-95"
          >
            {isProcessing ? (
              <span>Menyimpan ke Database...</span>
            ) : success ? (
              <>
                <Check className="w-4 h-4" />
                <span>Selesai!</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Simpan {parsedRows.length > 0 ? `(${parsedRows.length} Siswa)` : ''} ke Database</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

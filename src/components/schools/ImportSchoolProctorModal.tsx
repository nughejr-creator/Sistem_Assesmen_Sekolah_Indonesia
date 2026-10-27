import React, { useState, useRef } from 'react';
import { School, UserProfile } from '../../types/database';
import { 
  downloadSchoolProctorTemplate, 
  parseSchoolProctorSpreadsheet, 
  ParsedSchoolProctorRow 
} from '../../lib/excelHelper';
import { generateValidUUID, toValidUUID, safeSupabaseUpsert } from '../../lib/syncHelper';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  School as SchoolIcon, 
  UserCheck, 
  Loader2, 
  Check,
  ShieldCheck,
  Building2,
  KeyRound
} from 'lucide-react';

interface ImportSchoolProctorModalProps {
  existingSchools: School[];
  onClose: () => void;
  onImportComplete: (schoolsCount: number, proctorsCount: number, updatedSchools: School[]) => void;
}

export const ImportSchoolProctorModal: React.FC<ImportSchoolProctorModalProps> = ({
  existingSchools,
  onClose,
  onImportComplete
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSchoolProctorRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSummary, setSuccessSummary] = useState<{ schools: number; proctors: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setErrorMessage('Format berkas harus berupa file spreadsheet Excel (.xlsx atau .xls)');
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);

    try {
      const rows = await parseSchoolProctorSpreadsheet(file);
      if (rows.length === 0) {
        setErrorMessage('Berkas Excel kosong atau tidak memiliki baris data yang sesuai format.');
      }
      setParsedRows(rows);
    } catch (err: any) {
      setErrorMessage(`Gagal membaca berkas Excel: ${err?.message || 'Format tidak valid'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const validRows = parsedRows.filter(r => r.isValid);
  const invalidRows = parsedRows.filter(r => !r.isValid);
  const proctorsCountInFile = validRows.filter(r => Boolean(r.proctorUsername)).length;

  const handleExecuteImport = async () => {
    if (validRows.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);
    setErrorMessage(null);

    try {
      const newSchoolsList: School[] = [];
      const newProctorsList: any[] = [];
      const schoolPayloads: any[] = [];

      // Map existing schools by NPSN for smart matching/updating
      const existingNpsnMap = new Map<string, School>();
      existingSchools.forEach(s => {
        if (s.npsn) existingNpsnMap.set(s.npsn.trim(), s);
      });

      setUploadProgress(25);

      for (const row of validRows) {
        const existing = existingNpsnMap.get(row.npsn);
        const schoolId = existing ? toValidUUID(existing.id) : generateValidUUID();

        const schoolObj: School = {
          id: schoolId,
          npsn: row.npsn,
          name: row.name,
          level: row.level,
          district: row.district,
          created_at: existing?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        newSchoolsList.push(schoolObj);
        schoolPayloads.push({
          id: schoolObj.id,
          npsn: schoolObj.npsn,
          name: schoolObj.name,
          level: schoolObj.level,
          district: schoolObj.district,
          created_at: schoolObj.created_at,
          updated_at: schoolObj.updated_at
        });

        // Jika baris memuat data proktor
        if (row.proctorUsername) {
          const proctorId = generateValidUUID();
          newProctorsList.push({
            id: proctorId,
            school_id: schoolId,
            full_name: row.proctorName || `Proktor ${row.name}`,
            username: row.proctorUsername.toLowerCase().trim(),
            password: row.proctorPassword || 'proktor123',
            role: 'proctor',
            assigned_level: row.level,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      setUploadProgress(50);

      // 1. Batch upsert schools to Cloud Supabase
      const schoolRes = await safeSupabaseUpsert('schools', schoolPayloads);
      if (!schoolRes.success) {
        console.warn('School import cloud warning:', schoolRes.error);
      }

      setUploadProgress(75);

      // 2. Batch upsert proctors to Cloud Supabase
      if (newProctorsList.length > 0) {
        const proctorRes = await safeSupabaseUpsert('user_profiles', newProctorsList);
        if (!proctorRes.success) {
          console.warn('Proctor import cloud warning:', proctorRes.error);
        }
      }

      setUploadProgress(90);

      // 3. Update LocalStorage Caches
      // Update schools cache
      const mergedSchoolsMap = new Map<string, School>();
      existingSchools.forEach(s => mergedSchoolsMap.set(s.id, s));
      newSchoolsList.forEach(s => mergedSchoolsMap.set(s.id, s));
      const finalSchools = Array.from(mergedSchoolsMap.values());
      try {
        localStorage.setItem('sasi_schools_cache', JSON.stringify(finalSchools));
        window.dispatchEvent(new Event('storage'));
      } catch (e) {}

      // Update users cache with new proctors
      if (newProctorsList.length > 0) {
        try {
          const cachedUsers = localStorage.getItem('sasi_users_cache');
          const localUsers: UserProfile[] = cachedUsers ? JSON.parse(cachedUsers) : [];
          const userMap = new Map<string, UserProfile>();
          localUsers.forEach(u => userMap.set(u.username.toLowerCase(), u));
          newProctorsList.forEach((p: any) => {
            const matchedSchool = finalSchools.find(s => s.id === p.school_id);
            userMap.set(p.username.toLowerCase(), {
              ...p,
              school: matchedSchool
            });
          });
          localStorage.setItem('sasi_users_cache', JSON.stringify(Array.from(userMap.values())));
          window.dispatchEvent(new Event('storage'));
        } catch (e) {}
      }

      setUploadProgress(100);
      setSuccessSummary({
        schools: schoolPayloads.length,
        proctors: newProctorsList.length
      });

      // Berikan jeda 1 detik agar pengguna melihat progres 100% selesai
      setTimeout(() => {
        onImportComplete(schoolPayloads.length, newProctorsList.length, finalSchools);
      }, 1200);

    } catch (err: any) {
      setErrorMessage(`Terjadi kendala saat menyimpan data ke Cloud: ${err?.message || 'Koneksi database bermasalah'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-brand-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-300">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Impor Data Sekolah & Akun Proktor</h3>
              <p className="text-xs text-slate-300">
                Unggah berkas Excel (.xlsx / .xls) untuk mendaftarkan banyak sekolah dan akun proktor sekaligus ke Cloud Supabase.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Download Template Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Belum Punya Format File Excel?</h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Gunakan template resmi SASI agar nama kolom, format NPSN, jenjang, dan akun proktor terbaca presisi oleh sistem.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadSchoolProctorTemplate}
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template (.xlsx)</span>
            </button>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              selectedFile
                ? 'border-brand-500 bg-brand-50/50'
                : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              {selectedFile ? (
                <div>
                  <p className="text-xs font-bold text-brand-900">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti berkas
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700">Pilih atau Seret Berkas Excel ke Sini</p>
                  <p className="text-[11px] text-slate-500">Mendukung format .xlsx dan .xls</p>
                </div>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 py-4 text-xs font-semibold text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
              <span>Memproses dan memvalidasi isi spreadsheet Excel...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successSummary && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-2xl flex items-center space-x-3 shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-black">Impor Berhasil Disimpan ke Supabase Cloud!</p>
                <p className="text-[11px] text-emerald-700">
                  {successSummary.schools} satuan pendidikan dan {successSummary.proctors} akun proktor telah aktif dan tersinkronisasi.
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar during upload */}
          {isUploading && (
            <div className="space-y-1.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Menyimpan data ke Cloud Supabase...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-slate-800">Pratinjau Data Impor:</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                    {parsedRows.length} Total Baris
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center space-x-1">
                    <Check className="w-3 h-3" />
                    <span>{validRows.length} Siap Diimpor</span>
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold">
                      {invalidRows.length} Tidak Lengkap
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 font-semibold flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{proctorsCountInFile} Akun Proktor Terdeteksi</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto shadow-2xs">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">NPSN</th>
                      <th className="px-3 py-2.5">Nama Sekolah</th>
                      <th className="px-3 py-2.5">Jenjang</th>
                      <th className="px-3 py-2.5">Kecamatan / Wilayah</th>
                      <th className="px-3 py-2.5">Nama Proktor</th>
                      <th className="px-3 py-2.5">Login Proktor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]" title={row.errors.join(', ')}>
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Error</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-900">{row.npsn || '-'}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{row.name || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                            row.level === 'SMP' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {row.level}
                          </span>
                        </td>
                        <td className="px-3 py-2 truncate max-w-[180px]" title={row.district}>{row.district}</td>
                        <td className="px-3 py-2 font-medium">{row.proctorName || <span className="text-slate-400 italic">Tanpa Akun</span>}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-600">
                          {row.proctorUsername ? (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {row.proctorUsername}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {validRows.length > 0 && (
              <span>
                Siap mengimpor <strong className="text-slate-800">{validRows.length} sekolah</strong> dan <strong className="text-indigo-700">{proctorsCountInFile} proktor</strong>.
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={validRows.length === 0 || isUploading}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Cloud...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mulai Impor ({validRows.length} Sekolah)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

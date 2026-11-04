import React from 'react';
import { School, UserProfile } from '../../types/database';
import { Printer, X, Award, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SubjectScoreItem {
  id: string;
  name: string;
  code: string;
  score: number | null;
}

interface StudentTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UserProfile;
  school: School;
  subjects: SubjectScoreItem[];
  kktpThreshold: number;
  academicYear?: string;
  semester?: string;
}

export const StudentTranscriptModal: React.FC<StudentTranscriptModalProps> = ({
  isOpen,
  onClose,
  student,
  school,
  subjects,
  kktpThreshold,
  academicYear = '2026/2027',
  semester = 'Ganjil'
}) => {
  if (!isOpen) return null;

  const validScores = subjects
    .map(s => s.score)
    .filter((s): s is number => s !== null && s !== undefined);

  const totalScore = validScores.reduce((acc, curr) => acc + curr, 0);
  const avgScore = validScores.length > 0 ? Math.round((totalScore / validScores.length) * 10) / 10 : 0;

  // Predikat capaian kompetensi
  const getPredicate = (score: number | null): { grade: string; label: string; color: string } => {
    if (score === null || score === undefined) return { grade: '-', label: 'Belum Dinilai', color: 'text-slate-400' };
    if (score >= 90) return { grade: 'A', label: 'Sangat Baik', color: 'text-emerald-700 font-bold' };
    if (score >= 80) return { grade: 'B', label: 'Baik', color: 'text-blue-700 font-bold' };
    if (score >= kktpThreshold) return { grade: 'C', label: 'Cukup', color: 'text-amber-700 font-bold' };
    return { grade: 'D', label: 'Perlu Bimbingan', color: 'text-rose-700 font-bold' };
  };

  const overallPredicate = getPredicate(avgScore > 0 ? avgScore : null);

  const handlePrint = () => {
    document.body.classList.add('print-transcript-active');
    window.print();
    // Bersihkan kelas setelah dialog print ditutup
    setTimeout(() => {
      document.body.classList.remove('print-transcript-active');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      {/* Dynamic Print Stylesheet for Transcript (A4 Portrait) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          body.print-transcript-active #root > *:not(.print-transcript-portal) {
            /* isolate */
          }
        }
      `}} />

      {/* Container Dialog */}
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Modal (Screen Only) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base">Transkrip Nilai Asesmen Siswa</h3>
              <p className="text-xs text-slate-300">Format Rapor Hasil Capaian Asesmen Perorangan (A4 Portrait)</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Transkrip (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body - Printable Sheet */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100 print:bg-white print:p-0 print:overflow-visible">
          
          <div className="bg-white p-8 max-w-[210mm] mx-auto shadow-sm print:shadow-none print:p-0 text-slate-900 text-xs">
            
            {/* Kop Surat Fisik */}
            <div className="text-center space-y-1 mb-4 border-b-2 border-slate-900 pb-3">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                PEMERINTAH KABUPATEN/KOTA {school.regency_city?.toUpperCase() || 'SUMEDANG'}
              </h4>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                DINAS PENDIDIKAN DAN KEBUDAYAAN
              </h4>
              <h1 className="text-lg font-black uppercase tracking-wide text-slate-950">
                {school.name}
              </h1>
              <p className="text-[10px] text-slate-600">
                NPSN: {school.npsn} • Status: {school.status} • Akreditasi: {school.accreditation || 'A'}
              </p>
              <p className="text-[10px] italic text-slate-500">
                {school.address || 'Jl. Pendidikan No. 45'}, {school.district}, {school.regency_city}
              </p>
            </div>

            {/* Judul Dokumen */}
            <div className="text-center my-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 underline">
                TRANSKRIP CAPAIAN HASIL ASESMEN PESERTA DIDIK
              </h2>
              <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                Tahun Ajaran {academicYear} • Semester {semester}
              </p>
            </div>

            {/* Identitas Peserta Didik */}
            <div className="bg-slate-50 print:bg-transparent border border-slate-200 print:border-black rounded-lg p-3.5 mb-5 grid grid-cols-2 gap-y-2 text-xs">
              <div className="flex">
                <span className="w-28 font-bold text-slate-600 print:text-black">Nama Siswa</span>
                <span className="font-extrabold text-slate-900 print:text-black">: {student.full_name}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-600 print:text-black">NISN / Akun</span>
                <span className="font-mono font-bold text-slate-900 print:text-black">: {student.username}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-600 print:text-black">Kelas / Rombel</span>
                <span className="font-bold text-slate-900 print:text-black">: Kelas {student.grade_class || '4-A'}</span>
              </div>
              <div className="flex">
                <span className="w-28 font-bold text-slate-600 print:text-black">Satuan Pendidikan</span>
                <span className="font-semibold text-slate-900 print:text-black">: {school.name}</span>
              </div>
            </div>

            {/* Tabel Daftar Nilai Mata Pelajaran */}
            <div className="mb-5 overflow-hidden rounded-lg border border-slate-300 print:border-black">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100 print:bg-slate-200 text-slate-900 border-b border-slate-300 print:border-black">
                  <tr>
                    <th className="py-2 px-2 text-center w-10 font-black border-r border-slate-300 print:border-black">NO</th>
                    <th className="py-2 px-3 font-black border-r border-slate-300 print:border-black">MATA PELAJARAN</th>
                    <th className="py-2 px-3 text-center w-24 font-black border-r border-slate-300 print:border-black">KKTP</th>
                    <th className="py-2 px-3 text-center w-24 font-black border-r border-slate-300 print:border-black">NILAI AKHIR</th>
                    <th className="py-2 px-3 text-center w-28 font-black border-r border-slate-300 print:border-black">PREDIKAT</th>
                    <th className="py-2 px-3 text-center w-32 font-black">KETERCAPAIAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 print:divide-black text-slate-800 print:text-black">
                  {subjects.map((sub, idx) => {
                    const pred = getPredicate(sub.score);
                    const isPassed = sub.score !== null ? sub.score >= kktpThreshold : false;
                    return (
                      <tr key={sub.id} className="even:bg-slate-50/60 print:even:bg-transparent">
                        <td className="py-2 px-2 text-center font-mono font-bold border-r border-slate-200 print:border-black">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold border-r border-slate-200 print:border-black">
                          {sub.name}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold border-r border-slate-200 print:border-black">
                          {kktpThreshold}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-black border-r border-slate-200 print:border-black">
                          {sub.score !== null ? sub.score : '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold border-r border-slate-200 print:border-black">
                          <span className={pred.color}>{pred.grade} ({pred.label})</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {sub.score !== null ? (
                            isPassed ? (
                              <span className="text-emerald-700 font-bold">Tuntas</span>
                            ) : (
                              <span className="text-rose-700 font-bold">Belum Tuntas</span>
                            )
                          ) : (
                            <span className="text-slate-400 italic">Belum Ujian</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100 print:bg-slate-100 border-t-2 border-slate-400 print:border-black font-bold">
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right font-black border-r border-slate-300 print:border-black uppercase">
                      Total Perolehan Skor:
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-black border-r border-slate-300 print:border-black">
                      {totalScore > 0 ? totalScore : '-'}
                    </td>
                    <td colSpan={2} className="py-2 px-3 text-slate-600 print:text-black">
                      Dari {validScores.length} mata pelajaran selesai
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-3 text-right font-black border-r border-slate-300 print:border-black uppercase">
                      Rata-Rata Capaian Asesmen:
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-black text-sm text-sky-800 print:text-black border-r border-slate-300 print:border-black">
                      {avgScore > 0 ? avgScore : '-'}
                    </td>
                    <td colSpan={2} className="py-2 px-3">
                      Predikat Umum: <span className={overallPredicate.color}>{overallPredicate.grade} ({overallPredicate.label})</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Catatan Guru / Wali Kelas */}
            <div className="border border-slate-300 print:border-black rounded-lg p-3 mb-6 bg-slate-50/50 print:bg-transparent">
              <span className="font-bold text-[11px] text-slate-700 print:text-black block mb-1">
                Catatan Wali Kelas / Dewan Guru:
              </span>
              <p className="text-[11px] text-slate-700 print:text-black italic leading-relaxed">
                {avgScore >= kktpThreshold
                  ? `Ananda ${student.full_name} menunjukkan penguasaan materi yang baik dan telah mencapai Kriteria Ketercapaian Tujuan Pembelajaran (KKTP). Pertahankan semangat belajar dan terus tingkatkan rasa ingin tahu!`
                  : `Ananda ${student.full_name} telah berusaha menyelesaikan asesmen. Diperlukan pendampingan belajar tambahan serta remedial terarah pada mata pelajaran yang belum memenuhi KKTP.`}
              </p>
            </div>

            {/* Area Pengesahan / Tanda Tangan */}
            <div className="grid grid-cols-3 gap-4 text-center text-[11px] pt-4 print:pt-6 print-avoid-break">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Orang Tua / Wali Siswa</p>
                <div style={{ height: '56px' }} />
                <p className="font-bold underline uppercase">( ........................................ )</p>
              </div>

              <div>
                <p>&nbsp;</p>
                <p className="font-bold">Guru Kelas / Wali Kelas</p>
                <div style={{ height: '56px' }} />
                <p className="font-bold underline uppercase">( ........................................ )</p>
                <p className="text-[10px] font-mono text-slate-500 print:text-black">NIP: ....................................</p>
              </div>

              <div>
                <p>{school.regency_city || 'Sumedang'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold">Kepala Sekolah {school.name}</p>
                <div style={{ height: '56px' }} />
                <p className="font-bold underline uppercase">{school.principal_name || 'Aep Yayat, S.Pd.SD.'}</p>
                <p className="text-[10px] font-mono text-slate-500 print:text-black">NIP: {school.principal_nip || '19750812 200003 2 004'}</p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};

import React from 'react';
import { UserProfile, School } from '../../types/database';
import { X, Printer, QrCode, Shield, School as SchoolIcon } from 'lucide-react';

interface ExamCardPrintModalProps {
  students: UserProfile[];
  school: School;
  sessionName: string;
  onClose: () => void;
}

export const ExamCardPrintModal: React.FC<ExamCardPrintModalProps> = ({
  students,
  school,
  sessionName,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:static print:inset-auto print:p-0 print:bg-white print:overflow-visible">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 print:border-none print:shadow-none print:m-0 print:max-w-none print:w-full print:rounded-none">
        
        {/* Header (No print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-brand-400" />
            <div>
              <h3 className="text-sm font-bold">Cetak Kartu Login Peserta Ujian (PDF / Print)</h3>
              <p className="text-[11px] text-slate-400">{school.name} • {sessionName}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print / Save as PDF)</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Cards Grid */}
        <div className="p-6 max-h-[75vh] overflow-y-auto print:max-h-none print:p-0 print:overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-4 print:w-full">
            {students.map((student) => (
              <div 
                key={student.id} 
                className="border-2 border-slate-300 rounded-xl p-4 bg-white relative overflow-hidden shadow-2xs print:border-[1.5px] print:border-black print:rounded-none print-avoid-break"
              >
                {/* Official Card Header */}
                <div className="flex items-center space-x-3 pb-2.5 border-b-[1.5px] border-slate-800 print:border-black">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-300 p-1 flex items-center justify-center shrink-0 shadow-2xs print:border-black print:rounded-none">
                    <img src="/sasipedia-icon.png" alt="SASIPEDIA" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] font-extrabold uppercase tracking-tight text-slate-900 print:text-black leading-tight">
                      KARTU LOGIN PESERTA ASESMEN (CBT)
                    </div>
                    <div className="text-[10px] font-semibold text-slate-600 print:text-black">
                      {school.name} (NPSN: {school.npsn})
                    </div>
                  </div>
                  <QrCode className="w-8 h-8 text-slate-800 print:text-black shrink-0" />
                </div>

                {/* Card Body */}
                <div className="py-3 text-xs space-y-1.5 print:text-black">
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 print:text-black font-medium">Nama Peserta:</span>
                    <span className="col-span-2 font-black text-slate-900 print:text-black">{student.full_name}</span>
                  </div>

                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 print:text-black font-medium">NISN / No. Peserta:</span>
                    <span className="col-span-2 font-mono font-bold text-brand-700 print:text-black">{student.username}</span>
                  </div>

                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 print:text-black font-medium">Kelas / Rombel:</span>
                    <span className="col-span-2 font-semibold text-slate-800 print:text-black">
                      Kelas {student.grade_class || '4-A'} (Fase {student.phase || 'B'})
                    </span>
                  </div>

                  {/* Highlighted PIN Password */}
                  <div className="mt-2.5 p-2 bg-brand-50 border border-brand-200 rounded-lg flex items-center justify-between print:bg-white print:border-[1.5px] print:border-black print:rounded-none">
                    <div>
                      <span className="text-[10px] font-bold text-brand-800 print:text-black uppercase block">
                        PIN Password Cetak:
                      </span>
                      <span className="text-lg font-mono font-black text-brand-900 print:text-black tracking-widest">
                        {student.exam_card_password}
                      </span>
                    </div>
                    <div className="text-[9px] text-right text-slate-500 print:text-black">
                      <div>Jaga kerahasiaan PIN</div>
                      <div>Khusus sesi ujian CBT</div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-2 border-t border-dashed border-slate-300 print:border-solid print:border-black flex justify-between items-center text-[9px] text-slate-500 print:text-black">
                  <span>Sistem Asesmen Sekolah Indonesia</span>
                  <span>Tanda Tangan Proktor: _____________</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

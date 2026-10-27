import React, { useState, useEffect } from 'react';
import { UserProfile, ExamSession, StudentAttempt } from '../../types/database';
import { supabase } from '../../lib/supabase';
import { getSupabaseClientForSchool } from '../../lib/clusterManager';
import { filterSessionsForTeacher, filterStudentsForTeacher, checkIsGuruKelas } from '../../lib/teacherScope';
import { 
  Award, 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  ArrowRight, 
  FileSpreadsheet, 
  BookOpen,
  Edit3
} from 'lucide-react';

interface TeacherDashboardViewProps {
  teacher: UserProfile;
  onNavigate: (tab: 'grading' | 'ledger') => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({ teacher, onNavigate }) => {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [studentsCount, setStudentsCount] = useState(0);

  const isGuruKelas = checkIsGuruKelas(teacher);

  useEffect(() => {
    let isMounted = true;
    const fetchDashData = async () => {
      try {
        const { data: cloudSessions } = await supabase
          .from('exam_sessions')
          .select('*, package:exam_packages(*)');
        if (cloudSessions && isMounted) {
          const matched = teacher.school_id ? cloudSessions.filter(s => s.school_id === teacher.school_id) : cloudSessions;
          const scoped = filterSessionsForTeacher(matched, teacher);
          setSessions(scoped as ExamSession[]);
        }

        const clusterClient = getSupabaseClientForSchool(teacher.school_id);

        let cloudStudentsData: any[] = [];
        const { data: shardStudents } = await clusterClient
          .from('user_profiles')
          .select('*')
          .eq('role', 'student');

        if (shardStudents && shardStudents.length > 0) {
          cloudStudentsData = shardStudents;
        } else {
          const { data: masterStudents } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('role', 'student');
          cloudStudentsData = masterStudents || [];
        }

        if (cloudStudentsData.length > 0 && isMounted) {
          const matchedSt = teacher.school_id ? cloudStudentsData.filter(s => s.school_id === teacher.school_id) : cloudStudentsData;
          const scopedSt = filterStudentsForTeacher(matchedSt, teacher);
          setStudentsCount(scopedSt.length);
        }

        let combinedAttempts: any[] = [];
        const { data: shardAttempts } = await clusterClient
          .from('student_attempts')
          .select('*');

        if (shardAttempts && shardAttempts.length > 0) {
          combinedAttempts = [...shardAttempts];
        }

        if (clusterClient !== supabase) {
          const { data: masterAttempts } = await supabase
            .from('student_attempts')
            .select('*');

          if (masterAttempts && masterAttempts.length > 0) {
            const map = new Map<string, any>();
            masterAttempts.forEach(m => map.set(m.id, m));
            combinedAttempts.forEach(s => map.set(s.id, s));
            combinedAttempts = Array.from(map.values());
          }
        }

        if (isMounted) {
          setAttempts(combinedAttempts as StudentAttempt[]);
        }
      } catch (e) {}
    };

    fetchDashData();
    return () => { isMounted = false; };
  }, [teacher.school_id, teacher.grade_class]);

  const sessionIds = new Set(sessions.map(s => s.id));
  const relevantAttempts = attempts.filter(a => sessionIds.has(a.session_id || a.session?.id));
  const completedAttempts = relevantAttempts.filter(a => a.status === 'completed');
  const validScores = completedAttempts.map(a => Number(a.final_score) || 0);
  const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : 0;
  const passedCount = validScores.filter(s => s >= 75).length;
  const passRate = validScores.length > 0 ? Math.round((passedCount / validScores.length) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-brand-800 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Portal Pendidik & Penilai Akademik SASI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Selamat Datang, {teacher.full_name}
          </h1>
          <p className="text-amber-100 text-xs sm:text-sm leading-relaxed">
            {isGuruKelas
              ? <>Peran: <strong>Guru Kelas & Wali {teacher.grade_class || 'Kelas 2'}</strong> (Bertanggung jawab atas seluruh mapel kelas binaan, kecuali PJOK & PAI).</>
              : <>Peran: <strong>Guru Mapel Khusus: {teacher.assigned_subject_name || 'PJOK'}</strong> ({teacher.assigned_classes?.join(', ') || 'Lintas Kelas 1 - 6'}).</>
            }{' '}
            Gunakan meja kerja koreksi untuk meninjau butir isian singkat & uraian siswa secara cepat dengan rekomendasi otomatis Smart NLP.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('grading')}
              className="px-5 py-2.5 bg-white text-amber-900 hover:bg-amber-50 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-md transition-all transform active:scale-95"
            >
              <Edit3 className="w-4 h-4 text-amber-600" />
              <span>Buka Meja Koreksi Butir Soal</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('ledger')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Rekap & Leger Nilai Mapel</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Kartu Statistik Guru */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total Siswa Binaan</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {studentsCount} Siswa
          </div>
          <p className="text-[11px] text-slate-500">{teacher.grade_class || 'Rombel Binaan'}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Selesai Ujian</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono">
            {completedAttempts.length} Siswa
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold">Telah selesai mengerjakan</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Rata-rata Nilai Mapel</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            {completedAttempts.length > 0 ? avgScore : 0}
          </div>
          <p className="text-[11px] text-slate-500">Skala 0 - 100</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Ketuntasan Belajar</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-indigo-700 font-mono">
            {completedAttempts.length > 0 ? `${passRate}%` : '0%'}
          </div>
          <p className="text-[11px] text-slate-500">Target KKTP: 75</p>
        </div>

      </div>

      {/* Action Guidance Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <BookOpen className="w-4 h-4 text-amber-600" />
          <span>Panduan Pelaksanaan Penilaian Guru di SASI CBT</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-bold text-slate-900 block">1. Koreksi Cepat Butir per Butir</span>
            <p className="leading-relaxed">
              Buka menu <strong>"Meja Koreksi Isian & Uraian"</strong>. Anda dapat melihat jawaban seluruh siswa untuk nomor soal tertentu secara langsung berurutan, lengkap dengan evaluasi otomatis NLP dan kotak pengubah skor.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="font-bold text-slate-900 block">2. Cetak Leger Nilai Mata Pelajaran</span>
            <p className="leading-relaxed">
              Buka menu <strong>"Rekap & Leger Nilai Mapel"</strong> untuk memeriksa hasil akhir seluruh siswa, mengekspor leger ke format Excel (CSV), atau mencetak PDF dengan tanda tangan resmi Anda sebagai Guru Mata Pelajaran.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

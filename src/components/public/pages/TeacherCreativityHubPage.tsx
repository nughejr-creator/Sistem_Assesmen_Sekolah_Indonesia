import React, { useState } from 'react';
import { 
  Sparkles, 
  PenTool, 
  BookOpen, 
  FileSpreadsheet, 
  FileText, 
  Layers,
  GraduationCap
} from 'lucide-react';
import { AiPromptGenerators } from '../creativity/AiPromptGenerators';
import { TeacherContributionEditor } from '../creativity/TeacherContributionEditor';
import { CurriculumResourcesTab } from '../creativity/CurriculumResourcesTab';
import { LkpdMediaTab } from '../creativity/LkpdMediaTab';
import { TeacherAdminDownloadsTab } from '../creativity/TeacherAdminDownloadsTab';

interface TeacherCreativityHubPageProps {
  onOpenLogin: (tab: 'student' | 'officer') => void;
  initialTab?: 'ai' | 'kontribusi' | 'perangkat' | 'lkpd' | 'administrasi';
  initialGeneratorIndex?: number;
}

export const TeacherCreativityHubPage: React.FC<TeacherCreativityHubPageProps> = ({
  onOpenLogin,
  initialTab = 'ai',
  initialGeneratorIndex = 0
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'kontribusi' | 'perangkat' | 'lkpd' | 'administrasi'>(initialTab);
  const [activeGeneratorIndex, setActiveGeneratorIndex] = useState<number>(initialGeneratorIndex);
  const [editorPrefill, setEditorPrefill] = useState<{ content: string; title: string }>({ content: '', title: '' });

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  React.useEffect(() => {
    if (initialGeneratorIndex !== undefined) {
      setActiveGeneratorIndex(initialGeneratorIndex);
    }
  }, [initialGeneratorIndex]);

  const handleTransferToEditor = (content: string, title?: string) => {
    setEditorPrefill({
      content,
      title: title ? `Draf: ${title}` : ''
    });
    setActiveTab('kontribusi');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* =======================================================================
          1. HEADER BANNER
      ======================================================================= */}
      <section className="bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 text-white py-8 sm:py-9 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-5xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pusat Produktivitas & Kreativitas Pendidik Indonesia</span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
            Ruang Kreativitas Guru
          </h1>

          <p className="text-slate-300 text-xs sm:text-xs max-w-xl mx-auto leading-normal">
            One-Stop Educator Hub: Asisten Prompt AI cerdas 6 alur mengajar, ruang publikasi karya guru, repositori perangkat ajar Kurikulum Merdeka, serta unduhan administrasi kelas gratis.
          </p>
        </div>
      </section>

      {/* =======================================================================
          2. TAB NAVIGATION (5 PILAR MODULAR)
      ======================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        <div className="flex overflow-x-auto space-x-2 pb-4 border-b-2 border-slate-200 scrollbar-thin">
          
          {/* Pilar 1 */}
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'ai'
                ? 'bg-amber-500 text-slate-950 border-2 border-amber-600 shadow-sm font-black'
                : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Asisten Guru AI (6 Alur)</span>
          </button>

          {/* Pilar 2 */}
          <button
            type="button"
            onClick={() => setActiveTab('kontribusi')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'kontribusi'
                ? 'bg-amber-500 text-slate-950 border-2 border-amber-600 shadow-sm font-black'
                : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Tulis & Publikasi Karya</span>
            {editorPrefill.content && (
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            )}
          </button>

          {/* Pilar 3 */}
          <button
            type="button"
            onClick={() => setActiveTab('perangkat')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'perangkat'
                ? 'bg-amber-500 text-slate-950 border-2 border-amber-600 shadow-sm font-black'
                : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Pusat Perangkat Ajar (CP/ATP)</span>
          </button>

          {/* Pilar 4 */}
          <button
            type="button"
            onClick={() => setActiveTab('lkpd')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'lkpd'
                ? 'bg-amber-500 text-slate-950 border-2 border-amber-600 shadow-sm font-black'
                : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Bank LKPD & Media Kelas</span>
          </button>

          {/* Pilar 5 */}
          <button
            type="button"
            onClick={() => setActiveTab('administrasi')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeTab === 'administrasi'
                ? 'bg-amber-500 text-slate-950 border-2 border-amber-600 shadow-sm font-black'
                : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Pusat Unduhan Administrasi Guru</span>
          </button>

        </div>

        {/* =====================================================================
            3. TAB CONTENT OUTLET
        ===================================================================== */}
        <div className="pt-8">
          
          {/* PILAR 1: ASISTEN GURU AI (6 PILAR ALUR MENGAJAR) */}
          {activeTab === 'ai' && (
            <AiPromptGenerators 
              onTransferToEditor={handleTransferToEditor}
              initialGeneratorIndex={activeGeneratorIndex}
            />
          )}

          {/* PILAR 2: TULIS & PUBLIKASI KARYA GURU (WYSIWYG EDITOR) */}
          {activeTab === 'kontribusi' && (
            <TeacherContributionEditor
              initialContent={editorPrefill.content}
              initialTitle={editorPrefill.title}
              onOpenLogin={onOpenLogin}
            />
          )}

          {/* PILAR 3: PUSAT PERANGKAT AJAR KURIKULUM (CP/ATP/MODUL) */}
          {activeTab === 'perangkat' && (
            <CurriculumResourcesTab />
          )}

          {/* PILAR 4: BANK LKPD & MEDIA VISUAL KELAS */}
          {activeTab === 'lkpd' && (
            <LkpdMediaTab />
          )}

          {/* PILAR 5: PUSAT UNDUHAN ADMINISTRASI GURU (DOCX/XLSX) */}
          {activeTab === 'administrasi' && (
            <TeacherAdminDownloadsTab />
          )}

        </div>

      </div>
    </div>
  );
};

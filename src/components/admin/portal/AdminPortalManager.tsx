import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Layers, 
  Award, 
  UserCheck, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Upload, 
  Download, 
  FileText, 
  Check, 
  X, 
  Save, 
  Filter, 
  Clock, 
  ShieldCheck,
  Send,
  ExternalLink,
  Sparkles,
  Sliders,
  Pin,
  Globe,
  TrendingUp,
  Flame,
  Calendar,
  HelpCircle,
  Bookmark
} from 'lucide-react';
import { 
  PublicArticle, 
  TeachingResource, 
  TeacherContribution, 
  DeveloperProfile,
  ArticleCategory,
  ResourceCategory,
  ContributionStatus,
  SidebarWidgetConfig,
  PortalQuickLink
} from '../../../types/publicPortal';
import { 
  getAllPublicArticlesAdmin, 
  savePublicArticle, 
  deletePublicArticle, 
  toggleArticlePublish,
  getAllTeachingResourcesAdmin,
  saveTeachingResource,
  deleteTeachingResource,
  getAllTeacherContributionsAdmin,
  updateTeacherContributionStatus,
  getDeveloperProfile,
  saveDeveloperProfile,
  uploadEducationalResourceFile,
  getSidebarWidgetConfig,
  saveSidebarWidgetConfig,
  getPortalQuickLinks,
  savePortalQuickLink,
  deletePortalQuickLink
} from '../../../lib/publicPortalService';
import { UserProfile } from '../../../types/database';
import { WordRibbonEditor, WordRibbonEditorRef } from './WordRibbonEditor';
import { PublicArticlePreviewModal } from './PublicArticlePreviewModal';
import { calculateReadTime } from '../../../lib/safeHtmlSanitizer';

interface AdminPortalManagerProps {
  currentUser: UserProfile;
}

export const AdminPortalManager: React.FC<AdminPortalManagerProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'articles' | 'resources' | 'curation' | 'profile' | 'widgets'>('articles');

  // ===========================================================================
  // TAB 1: ARTICLES STATE
  // ===========================================================================
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [articleSearch, setArticleSearch] = useState('');
  const [editingArticle, setEditingArticle] = useState<Partial<PublicArticle> | null>(null);
  const ribbonEditorRef = useRef<WordRibbonEditorRef>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [previewArticle, setPreviewArticle] = useState<PublicArticle | null>(null);
  const [tagsInputValue, setTagsInputValue] = useState('');
  const [articleSavedToast, setArticleSavedToast] = useState<{ show: boolean; msg: string } | null>(null);

  // ===========================================================================
  // TAB 2: RESOURCES STATE
  // ===========================================================================
  const [resources, setResources] = useState<TeachingResource[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [editingResource, setEditingResource] = useState<Partial<TeachingResource> | null>(null);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // ===========================================================================
  // TAB 3: CURATION STATE
  // ===========================================================================
  const [contributions, setContributions] = useState<TeacherContribution[]>([]);
  const [curationFilter, setCurationFilter] = useState<string>('pending_review');
  const [reviewingContribution, setReviewingContribution] = useState<TeacherContribution | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  // ===========================================================================
  // TAB 4: DEVELOPER PROFILE STATE
  // ===========================================================================
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // ===========================================================================
  // TAB 5: SIDEBAR WIDGETS & QUICK LINKS STATE
  // ===========================================================================
  const [sidebarConfig, setSidebarConfig] = useState<SidebarWidgetConfig>({
    show_search: true,
    show_pinned: true,
    show_popular_tabs: true,
    show_categories: true,
    show_quick_links: true
  });
  const [quickLinks, setQuickLinks] = useState<PortalQuickLink[]>([]);
  const [editingQuickLink, setEditingQuickLink] = useState<Partial<PortalQuickLink> | null>(null);
  const [isQuickLinkModalOpen, setIsQuickLinkModalOpen] = useState(false);
  const [widgetSavedToast, setWidgetSavedToast] = useState(false);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const arts = await getAllPublicArticlesAdmin();
    setArticles(arts);
    const res = await getAllTeachingResourcesAdmin();
    setResources(res);
    const contribs = await getAllTeacherContributionsAdmin();
    setContributions(contribs);
    const prof = await getDeveloperProfile();
    setProfile(prof);
    const cfg = await getSidebarWidgetConfig();
    setSidebarConfig(cfg);
    const links = await getPortalQuickLinks();
    setQuickLinks(links);
  };

  // ===========================================================================
  // ARTICLE HANDLERS
  // ===========================================================================
  const handleOpenAddArticle = () => {
    setEditingArticle({
      title: '',
      slug: '',
      category: 'Panduan Asesmen',
      excerpt: '',
      content: '',
      featured_image: '',
      tags: [],
      is_pinned: false,
      pinned_until: '',
      is_featured: false,
      read_time: 5,
      is_published: true,
      author_name: currentUser.full_name || 'Agi Hamdani, M.Pd'
    });
    setTagsInputValue('');
    setIsArticleModalOpen(true);
  };

  const handleEditArticle = (art: PublicArticle) => {
    setEditingArticle({ ...art });
    setTagsInputValue(art.tags ? art.tags.join(', ') : '');
    setIsArticleModalOpen(true);
  };

  const handleDeleteArticle = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus artikel publik ini?')) {
      await deletePublicArticle(id);
      setArticles(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleTogglePublish = async (art: PublicArticle) => {
    const newStatus = !art.is_published;
    await toggleArticlePublish(art.id, newStatus);
    setArticles(prev => prev.map(a => a.id === art.id ? { ...a, is_published: newStatus } : a));
  };

  const handleSaveArticleWithStatus = async (isPublished: boolean) => {
    if (!editingArticle?.title?.trim()) {
      alert('Judul artikel wajib diisi!');
      return;
    }

    const tagsArray = tagsInputValue
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    // Ambil snapshot konten terkini langsung dari instance editor aktif (baik Visual maupun Mode HTML)
    const latestContent = ribbonEditorRef.current
      ? ribbonEditorRef.current.getLatestContent()
      : (editingArticle.content || '');

    const calculatedTime = calculateReadTime(latestContent);

    const updatedArticle: Partial<PublicArticle> = {
      ...editingArticle,
      content: latestContent,
      is_published: isPublished,
      tags: tagsArray,
      read_time: editingArticle.read_time && editingArticle.read_time > 0 ? editingArticle.read_time : calculatedTime
    };

    const res = await savePublicArticle(updatedArticle);
    if (res.success && res.data) {
      setArticles(prev => {
        const idx = prev.findIndex(a => a.id === res.data?.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = res.data!;
          return clone;
        }
        return [res.data!, ...prev];
      });
      setIsArticleModalOpen(false);
      setEditingArticle(null);
      setArticleSavedToast({
        show: true,
        msg: res.isCloudSynced 
          ? 'Artikel berhasil disimpan dan disinkronkan ke Cloud Supabase & Portal Publik!' 
          : 'Artikel berhasil disimpan dan langsung aktif di Portal Publik!'
      });
      setTimeout(() => setArticleSavedToast(null), 3500);
    }
  };

  const handleOpenPreviewFromForm = () => {
    if (!editingArticle) return;
    const tagsArray = tagsInputValue
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const calculatedTime = calculateReadTime(editingArticle.content || '');

    setPreviewArticle({
      id: editingArticle.id || 'preview-temp',
      slug: editingArticle.slug || 'pratinjau-artikel',
      title: editingArticle.title || 'Tanpa Judul',
      category: editingArticle.category || 'Panduan Asesmen',
      excerpt: editingArticle.excerpt || '',
      content: editingArticle.content || '',
      author_name: editingArticle.author_name || currentUser.full_name || 'Agi Hamdani, M.Pd',
      read_time: editingArticle.read_time && editingArticle.read_time > 0 ? editingArticle.read_time : calculatedTime,
      views_count: editingArticle.views_count || 1,
      is_published: editingArticle.is_published ?? true,
      featured_image: editingArticle.featured_image || null,
      tags: tagsArray,
      published_at: editingArticle.published_at || new Date().toISOString()
    });
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSaveArticleWithStatus(editingArticle?.is_published ?? true);
  };

  // ===========================================================================
  // RESOURCE HANDLERS
  // ===========================================================================
  const handleOpenAddResource = () => {
    setEditingResource({
      title: '',
      description: '',
      category: 'Matriks Kisi-Kisi',
      phase: 'Fase B',
      grade_level: 'Kelas 4',
      subject: 'Bahasa Indonesia',
      file_type: 'DOCX',
      file_url: '',
      file_size: '1.5 MB',
      is_active: true
    });
    setIsResourceModalOpen(true);
  };

  const handleEditResource = (r: TeachingResource) => {
    setEditingResource({ ...r });
    setIsResourceModalOpen(true);
  };

  const handleDeleteResource = async (id: string) => {
    if (confirm('Hapus berkas sumber belajar ini dari repositori publik?')) {
      await deleteTeachingResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingResource?.title?.trim()) return;

    const res = await saveTeachingResource(editingResource);
    if (res.success && res.data) {
      setResources(prev => {
        const idx = prev.findIndex(r => r.id === res.data?.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = res.data!;
          return clone;
        }
        return [res.data!, ...prev];
      });
      setIsResourceModalOpen(false);
      setEditingResource(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const res = await uploadEducationalResourceFile(file, 'resources');
    setUploadingFile(false);

    if (res.success && res.publicUrl) {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      setEditingResource(prev => ({
        ...prev,
        file_url: res.publicUrl,
        file_type: ext,
        file_size: sizeMb
      }));
    } else {
      alert('Gagal mengunggah berkas. Menggunakan format standar.');
    }
  };

  // ===========================================================================
  // CURATION HANDLERS
  // ===========================================================================
  const handleOpenReview = (c: TeacherContribution) => {
    setReviewingContribution(c);
    setReviewNotes(c.review_notes || '');
  };

  const handleProcessCuration = async (status: ContributionStatus) => {
    if (!reviewingContribution) return;
    const res = await updateTeacherContributionStatus(
      reviewingContribution.id,
      status,
      reviewNotes,
      currentUser.full_name
    );

    if (res.success && res.data) {
      setContributions(prev => prev.map(c => c.id === res.data!.id ? res.data! : c));
      setReviewingContribution(null);
    }
  };

  // ===========================================================================
  // PROFILE HANDLERS
  // ===========================================================================
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const res = await saveDeveloperProfile(profile);
    if (res.success) {
      setProfileSavedToast(true);
      setTimeout(() => setProfileSavedToast(false), 2500);
    }
  };

  // ===========================================================================
  // SIDEBAR WIDGETS & QUICK LINKS HANDLERS
  // ===========================================================================
  const handleToggleWidgetConfig = async (key: keyof SidebarWidgetConfig) => {
    const updated = { ...sidebarConfig, [key]: !sidebarConfig[key] };
    setSidebarConfig(updated);
    await saveSidebarWidgetConfig(updated);
    setWidgetSavedToast(true);
    setTimeout(() => setWidgetSavedToast(false), 2000);
  };

  const handleOpenAddQuickLink = () => {
    setEditingQuickLink({
      title: '',
      url: '',
      icon: 'ExternalLink',
      description: '',
      is_new_tab: true,
      is_active: true,
      order_index: quickLinks.length + 1
    });
    setIsQuickLinkModalOpen(true);
  };

  const handleEditQuickLink = (link: PortalQuickLink) => {
    setEditingQuickLink({ ...link });
    setIsQuickLinkModalOpen(true);
  };

  const handleDeleteQuickLink = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus tautan cepat ini?')) {
      await deletePortalQuickLink(id);
      setQuickLinks(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleSaveQuickLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuickLink?.title || !editingQuickLink?.url) return;
    const res = await savePortalQuickLink(editingQuickLink);
    if (res.success && res.data) {
      setQuickLinks(prev => {
        const idx = prev.findIndex(l => l.id === res.data?.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = res.data!;
          return clone.sort((a, b) => a.order_index - b.order_index);
        }
        return [...prev, res.data!].sort((a, b) => a.order_index - b.order_index);
      });
      setIsQuickLinkModalOpen(false);
      setEditingQuickLink(null);
    }
  };

  const handleToggleQuickLinkStatus = async (link: PortalQuickLink) => {
    const updated = { ...link, is_active: !link.is_active };
    await savePortalQuickLink(updated);
    setQuickLinks(prev => prev.map(l => l.id === link.id ? updated : l));
  };

  return (
    <div className="space-y-6">
      
      {/* CMS Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-md border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Panel Manajemen Konten Publik (CMS) • Super Admin</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            Pusat Kendali Zona Publik SASIPEDIA
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Kelola artikel wawasan edukasi, berkas kisi-kisi dan modul, kurasi naskah kiriman guru, serta pembaruan profil inisiator resmi secara dinamis.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors border border-white/20"
          >
            <span>Buka Web Publik</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 4 Main Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1.5">
        
        <button
          type="button"
          onClick={() => setActiveTab('articles')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'articles'
              ? 'bg-sky-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Artikel & Wawasan Asesmen ({articles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'resources'
              ? 'bg-emerald-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bank Soal & Dokumen ({resources.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('curation')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'curation'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Meja Kurasi Guru ({contributions.filter(c => c.status === 'pending_review').length} Antrean)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'profile'
              ? 'bg-purple-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Profil Pengembang (E-E-A-T)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('widgets')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
            activeTab === 'widgets'
              ? 'bg-indigo-600 text-white shadow-xs font-black'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Panel Samping & Widget Portal</span>
        </button>

      </div>

      {/* =======================================================================
          TAB 1: MANAJEMEN ARTIKEL & WAWASAN ASESMEN
      ======================================================================= */}
      {activeTab === 'articles' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          
          {articleSavedToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2 animate-fade-in shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{articleSavedToast.msg}</span>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
                placeholder="Cari judul artikel..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAddArticle}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tulis Artikel Baru</span>
            </button>
          </div>

          {/* Tabel Artikel */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Judul & Slug</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Waktu Baca</th>
                  <th className="py-3 px-4 text-center">Pembaca</th>
                  <th className="py-3 px-4 text-center">Status Tayang</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.filter(a => a.title.toLowerCase().includes(articleSearch.toLowerCase())).map(art => (
                  <tr key={art.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center space-x-1.5">
                        {art.is_pinned && (
                          <span className="p-0.5 rounded bg-amber-100 text-amber-700 shrink-0" title="Disematkan di Sidebar (Pinned)">
                            <Pin className="w-3 h-3 fill-amber-700" />
                          </span>
                        )}
                        {art.is_featured && (
                          <span className="p-0.5 rounded bg-rose-100 text-rose-600 shrink-0" title="Artikel Pilihan/Populer (Featured)">
                            <Flame className="w-3 h-3" />
                          </span>
                        )}
                        <span className="font-bold text-slate-900 line-clamp-1">{art.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{art.slug}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-sky-50 text-sky-800 border border-sky-100">
                        {art.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{art.read_time} menit</td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">{art.views_count}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(art)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                          art.is_published 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {art.is_published ? 'Published' : 'Draft'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => setPreviewArticle(art)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-sky-600"
                          title="Pratinjau Artikel"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditArticle(art)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600"
                          title="Sunting Artikel"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteArticle(art.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-rose-600"
                          title="Hapus Artikel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* =======================================================================
          TAB 2: MANAJEMEN DOKUMEN SUMBER BELAJAR
      ======================================================================= */}
      {activeTab === 'resources' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={resourceSearch}
                onChange={(e) => setResourceSearch(e.target.value)}
                placeholder="Cari judul berkas / kisi-kisi..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleOpenAddResource}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center justify-center space-x-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Berkas Sumber Belajar</span>
            </button>
          </div>

          {/* Tabel Dokumen */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Judul Dokumen</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Fase / Kelas</th>
                  <th className="py-3 px-4 text-center">Format</th>
                  <th className="py-3 px-4 text-center">Unduhan</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resources.filter(r => r.title.toLowerCase().includes(resourceSearch.toLowerCase())).map(res => (
                  <tr key={res.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 line-clamp-1">{res.title}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{res.description}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-100">
                        {res.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {res.phase} • {res.grade_level}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        res.file_type === 'DOCX' ? 'bg-sky-100 text-sky-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {res.file_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                      {res.download_count}x
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditResource(res)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600"
                          title="Sunting Berkas"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-rose-600"
                          title="Hapus Berkas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* =======================================================================
          TAB 3: MEJA KURASI KARYA PENDIDIK
      ======================================================================= */}
      {activeTab === 'curation' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Filter Antrean:</span>
              {(['pending_review', 'published', 'draft', 'rejected', 'Semua'] as const).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCurationFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    curationFilter === st
                      ? 'bg-amber-500 text-slate-950 shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'pending_review' ? 'Menunggu Riviu' : 
                   st === 'published' ? 'Terbit' :
                   st === 'rejected' ? 'Ditolak' : 
                   st === 'draft' ? 'Draf' : 'Semua'}
                </button>
              ))}
            </div>
          </div>

          {/* Tabel Kontribusi Guru */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Judul Karya</th>
                  <th className="py-3 px-4">Penulis & Sekolah</th>
                  <th className="py-3 px-4">Jenis Konten</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contributions.filter(c => curationFilter === 'Semua' || c.status === curationFilter).map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 line-clamp-1">{c.title}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{c.summary}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{c.teacher_name}</div>
                      <div className="text-[10px] text-slate-500">{c.teacher_school}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                        {c.content_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        c.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'pending_review' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                        c.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenReview(c)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-2xs flex items-center space-x-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tinjau Naskah</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* =======================================================================
          TAB 4: PENGATURAN PROFIL PENGEMBANG (E-E-A-T)
      ======================================================================= */}
      {activeTab === 'profile' && profile && (
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Pembaruan Profil Inisiator Resmi (E-E-A-T)
              </h3>
              <p className="text-xs text-slate-500">
                Data ini ditampilkan secara publik di footer dan halaman `/profil-pengembang` untuk memenuhi standar Experience, Expertise, Authoritativeness, dan Trustworthiness Google.
              </p>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black shadow-md flex items-center space-x-1.5 transition-transform active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil E-E-A-T</span>
            </button>
          </div>

          {profileSavedToast && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Data profil pengembang berhasil diperbarui dan disinkronkan ke zona publik!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Jabatan & Peran Inisiator</label>
              <input
                type="text"
                value={profile.title}
                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-sky-700"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Deskripsi Singkat Peran</label>
              <input
                type="text"
                value={profile.role_description || ''}
                onChange={(e) => setProfile({ ...profile, role_description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Biografi Profesional & Visi Pendidikan</label>
              <textarea
                rows={4}
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs resize-y leading-relaxed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Resmi</label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono"
              />
            </div>
          </div>

        </form>
      )}

      {/* =======================================================================
          TAB 5: PENGATURAN PANEL SAMPING & WIDGET PORTAL PUBLIK
      ======================================================================= */}
      {activeTab === 'widgets' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Section 1: Manajer Tata Letak Widget (Visibility Toggles) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  <span>Manajer Tata Letak & Visibilitas Widget Sidebar</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Aktifkan atau sembunyikan komponen widget di panel samping (sidebar) portal publik secara instan.
                </p>
              </div>

              {widgetSavedToast && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pengaturan Tersimpan Otomatis!</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Toggle 1: Search */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-xs text-slate-800">
                    <Search className="w-3.5 h-3.5 text-sky-600" />
                    <span>Pencarian Cepat (Instant Search)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Input pencarian artikel dengan pintasan keyboard Ctrl+K dan hasil dropdown instan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWidgetConfig('show_search')}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ml-3 ${
                    sidebarConfig.show_search ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    sidebarConfig.show_search ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 2: Pinned */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-xs text-slate-800">
                    <Pin className="w-3.5 h-3.5 text-amber-600" />
                    <span>Pengumuman Tersemat (Pinned)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Kartu aksen penting untuk artikel/pengumuman yang disematkan dengan tanggal kedaluwarsa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWidgetConfig('show_pinned')}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ml-3 ${
                    sidebarConfig.show_pinned ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    sidebarConfig.show_pinned ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 3: Tabs Populer/Terbaru */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-xs text-slate-800">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    <span>Tab Populer & Teranyar</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tab interaktif artikel terpopuler (peringkat 1, 2, 3) dan rilisan naskah terbaru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWidgetConfig('show_popular_tabs')}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ml-3 ${
                    sidebarConfig.show_popular_tabs ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    sidebarConfig.show_popular_tabs ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 4: Kategori */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-xs text-slate-800">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kategori & Taksonomi</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Daftar kategori wawasan asesmen lengkap dengan pill badge counter jumlah artikel.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWidgetConfig('show_categories')}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ml-3 ${
                    sidebarConfig.show_categories ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    sidebarConfig.show_categories ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Toggle 5: Quick Links */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-black text-xs text-slate-800">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Tautan Layanan Cepat</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tombol mini kartu untuk navigasi langsung ke kalender, download modul, dan CBT.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleWidgetConfig('show_quick_links')}
                  className={`w-11 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ml-3 ${
                    sidebarConfig.show_quick_links ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    sidebarConfig.show_quick_links ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

            </div>
          </div>

          {/* Section 2: Pengaturan Tautan Cepat (Quick Links Manager CRUD) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Daftar Tautan Layanan Cepat (Quick Links Manager)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Kelola item tautan pintas yang muncul pada widget sidebar portal publik.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddQuickLink}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-xs flex items-center space-x-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Tautan Cepat</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Urutan</th>
                    <th className="py-3 px-4">Ikon & Judul</th>
                    <th className="py-3 px-4">URL Tujuan</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4 text-center">Buka Tab Baru</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quickLinks.map(ql => (
                    <tr key={ql.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">#{ql.order_index}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px]">
                            {ql.icon}
                          </span>
                          <span>{ql.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-sky-600 max-w-xs truncate">
                        {ql.url}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {ql.description || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ql.is_new_tab ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ql.is_new_tab ? 'Ya' : 'Tab Sama'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleQuickLinkStatus(ql)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                            ql.is_active 
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {ql.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditQuickLink(ql)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-amber-600"
                            title="Sunting Tautan"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuickLink(ql.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-rose-600"
                            title="Hapus Tautan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

      {/* =======================================================================
          MODAL 1: FORM TAMBAH / SUNTING ARTIKEL DENGAN WORD RIBBON WYSIWYG
      ======================================================================= */}
      {isArticleModalOpen && editingArticle && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[96vh] overflow-hidden flex flex-col shadow-2xl border-2 border-slate-300">
            
            {/* Top Header & Integrated Action Bar */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-sky-600 flex items-center justify-center font-bold text-white shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                      {editingArticle.id ? 'Sunting Artikel Publik' : 'Tulis Artikel Wawasan Baru'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      editingArticle.is_published 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {editingArticle.is_published ? 'Publik' : 'Draf'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Sistem Asesmen Sekolah Indonesia • WYSIWYG Ribbon Content Editor
                  </div>
                </div>
              </div>

              {/* Action Bar Atas: Preview, Simpan Draf, Terbitkan */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleOpenPreviewFromForm}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
                  title="Lihat simulasi visual artikel seperti tampilan pembaca publik"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Tampilan Publik</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveArticleWithStatus(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center space-x-1.5 border border-slate-700 active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Draf</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveArticleWithStatus(true)}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingArticle.id ? 'Simpan Perubahan' : 'Terbitkan Sekarang'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Form Fields & Rich Editor Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs bg-slate-50/50 flex-1">
              
              {/* Card Pengaturan Metadata Artikel */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                
                {/* Judul Artikel */}
                <div>
                  <label className="block font-black text-slate-800 mb-1">
                    Judul Utama Artikel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingArticle.title || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                    placeholder="Contoh: Kaidah Baku Perumusan Stimulus Soal AKM Literasi SD..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                {/* Grid Baris 1: Kategori, Waktu Baca, Status, Penulis */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori / Rubrik</label>
                    <select
                      value={editingArticle.category}
                      onChange={(e) => setEditingArticle({ ...editingArticle, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                    >
                      <option>Panduan Asesmen</option>
                      <option>Bedah AKM</option>
                      <option>Analisis Butir</option>
                      <option>Rubrik & Penskoran</option>
                      <option>Wawasan Kurikulum</option>
                      <option>Berita & Pengumuman</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Waktu Baca (Menit)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={editingArticle.read_time || 5}
                      onChange={(e) => setEditingArticle({ ...editingArticle, read_time: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status Publikasi</label>
                    <select
                      value={editingArticle.is_published ? 'publish' : 'draft'}
                      onChange={(e) => setEditingArticle({ ...editingArticle, is_published: e.target.value === 'publish' })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                    >
                      <option value="publish">Publik (Dapat Dibaca Semua Guru)</option>
                      <option value="draft">Draf (Hanya Admin)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Penulis / Asesor</label>
                    <input
                      type="text"
                      value={editingArticle.author_name || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, author_name: e.target.value })}
                      placeholder="Agi Hamdani, M.Pd"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Grid Baris 2: Tag & URL Thumbnail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Tag / Kata Kunci <span className="text-slate-400 font-normal">(Pisahkan dengan koma)</span>
                    </label>
                    <input
                      type="text"
                      value={tagsInputValue}
                      onChange={(e) => setTagsInputValue(e.target.value)}
                      placeholder="AKM, Literasi, SD, Kurikulum Merdeka"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">URL Gambar Sampul (Thumbnail)</label>
                    <input
                      type="url"
                      value={editingArticle.featured_image || ''}
                      onChange={(e) => setEditingArticle({ ...editingArticle, featured_image: e.target.value })}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                    />
                  </div>
                </div>

                {/* Grid Baris 3: Pengaturan Widget Sidebar & Sorotan (Pinned & Featured) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Pinned Toggle */}
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={!!editingArticle.is_pinned}
                        onChange={(e) => setEditingArticle({ ...editingArticle, is_pinned: e.target.checked })}
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                      />
                      <span className="flex items-center space-x-1.5">
                        <Pin className="w-3.5 h-3.5 text-amber-600" />
                        <span>Sematkan ke Pengumuman Penting Sidebar</span>
                      </span>
                    </label>

                    {editingArticle.is_pinned && (
                      <div className="pl-6">
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">
                          Kedaluwarsa Pin (Opsional)
                        </label>
                        <input
                          type="date"
                          value={editingArticle.pinned_until ? editingArticle.pinned_until.split('T')[0] : ''}
                          onChange={(e) => setEditingArticle({ 
                            ...editingArticle, 
                            pinned_until: e.target.value ? new Date(e.target.value).toISOString() : null 
                          })}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Featured Toggle */}
                  <div>
                    <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-800 pt-0.5">
                      <input
                        type="checkbox"
                        checked={!!editingArticle.is_featured}
                        onChange={(e) => setEditingArticle({ ...editingArticle, is_featured: e.target.checked })}
                        className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                      />
                      <span className="flex items-center space-x-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        <span>Jadikan Artikel Pilihan / Populer (Featured)</span>
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-400 pl-6 mt-1">
                      Memprioritaskan artikel tampil di tab Populer dan bagian sorotan portal.
                    </p>
                  </div>
                </div>

                {/* Ringkasan Singkat (Excerpt) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ringkasan Singkat (Excerpt / Cuplikan Kartu)
                  </label>
                  <textarea
                    rows={2}
                    value={editingArticle.excerpt || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })}
                    placeholder="Tulis ringkasan singkat artikel dalam 1-2 kalimat untuk ditampilkan pada kartu beranda..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs resize-none"
                  />
                </div>

              </div>

              {/* Editor Konten Utama (WYSIWYG Ribbon Ala Microsoft Word) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-800 text-xs flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>Isi Konten & Naskah Lengkap (Word Ribbon Rich Text Editor)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Mendukung font Word, tabel, KaTeX equation, gambar, & simbol khusus
                  </span>
                </div>

                <WordRibbonEditor
                  ref={ribbonEditorRef}
                  value={editingArticle.content || ''}
                  onChange={(html) => setEditingArticle(prev => prev ? { ...prev, content: html } : prev)}
                  placeholder="Ketik naskah artikel wawasan asesmen di sini..."
                  minHeight="360px"
                />
              </div>

            </div>

            {/* Bottom Footer Action Bar */}
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsArticleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
              >
                Batal & Tutup
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleOpenPreviewFromForm}
                  className="px-4 py-2 rounded-xl bg-sky-50 border border-sky-300 text-sky-800 hover:bg-sky-100 text-xs font-black transition-all flex items-center space-x-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  <span>Preview Tampilan Publik</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveArticleWithStatus(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold"
                >
                  Simpan Draf
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveArticleWithStatus(true)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{editingArticle.id ? 'Simpan Perubahan' : 'Terbitkan Sekarang'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 2: FORM TAMBAH / SUNTING DOKUMEN SUMBER BELAJAR
      ======================================================================= */}
      {isResourceModalOpen && editingResource && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                {editingResource.id ? 'Sunting Berkas Sumber Belajar' : 'Tambah Berkas Baru'}
              </span>
              <button
                type="button"
                onClick={() => setIsResourceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Judul Dokumen <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={editingResource.title || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                  placeholder="Matriks Kisi-Kisi SAS Bahasa Indonesia..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Dokumen</label>
                  <select
                    value={editingResource.category}
                    onChange={(e) => setEditingResource({ ...editingResource, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option>Matriks Kisi-Kisi</option>
                    <option>Naskah Kartu Soal</option>
                    <option>Instrumen Diagnostik Awal</option>
                    <option>Modul Ajar</option>
                    <option>LKPD</option>
                    <option>Administrasi Guru</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={editingResource.subject || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, subject: e.target.value })}
                    placeholder="Bahasa Indonesia, IPAS, dll."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fase</label>
                  <select
                    value={editingResource.phase || 'Fase B'}
                    onChange={(e) => setEditingResource({ ...editingResource, phase: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  >
                    <option>Fase A</option>
                    <option>Fase B</option>
                    <option>Fase C</option>
                    <option>Umum</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jenjang Kelas</label>
                  <input
                    type="text"
                    value={editingResource.grade_level || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, grade_level: e.target.value })}
                    placeholder="Kelas 4 / Semua Kelas"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Dokumen</label>
                <textarea
                  rows={2}
                  value={editingResource.description || ''}
                  onChange={(e) => setEditingResource({ ...editingResource, description: e.target.value })}
                  placeholder="Rincian materi yang tercakup dalam berkas..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs resize-none"
                />
              </div>

              {/* Upload Berkas ke Storage */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-700">Unggah Berkas Fisik (PDF / DOCX / XLSX)</label>
                <div className="flex items-center space-x-3">
                  <label className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingFile ? 'Mengunggah...' : 'Pilih Berkas Komputer'}</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.docx,.xlsx,.doc,.xls"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">Maks. 50MB</span>
                </div>

                {editingResource.file_url && (
                  <div className="text-[11px] text-emerald-700 font-mono truncate pt-1">
                    ✓ Berkas tersambung: {editingResource.file_url}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 -mx-6 -mb-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsResourceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md"
                >
                  Simpan Berkas
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 3: REVIEW / KURASI KARYA GURU
      ======================================================================= */}
      {reviewingContribution && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                Tinjauan Kurasi Naskah Guru
              </span>
              <button
                type="button"
                onClick={() => setReviewingContribution(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-800">
                    {reviewingContribution.content_type}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">Oleh: <strong>{reviewingContribution.teacher_name}</strong> ({reviewingContribution.teacher_school})</span>
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {reviewingContribution.title}
                </h3>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
                {reviewingContribution.body}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Kurasi / Alasan Penolakan (Opsional)</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Tuliskan catatan apresiasi atau perbaikan yang perlu diperbaiki oleh guru..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs resize-none"
                />
              </div>

              <div className="px-6 py-4 -mx-6 -mb-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleProcessCuration('rejected')}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200"
                >
                  Tolak / Minta Revisi
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setReviewingContribution(null)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                  >
                    Tutup
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProcessCuration('published')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center space-x-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Setujui & Terbitkan Resmi</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 4: PRATINJAU PUBLIK RESMI (RESPONSIVE VIEWPORT & FULL RENDER)
      ======================================================================= */}
      {previewArticle && (
        <PublicArticlePreviewModal
          isOpen={!!previewArticle}
          onClose={() => setPreviewArticle(null)}
          article={previewArticle}
        />
      )}

      {/* =======================================================================
          MODAL 5: TAMBAH / SUNTING TAUTAN CEPAT (QUICK LINK)
      ======================================================================= */}
      {isQuickLinkModalOpen && editingQuickLink && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden flex flex-col shadow-2xl border-2 border-slate-300">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                {editingQuickLink.id ? 'Sunting Tautan Cepat' : 'Tambah Tautan Cepat Baru'}
              </span>
              <button
                type="button"
                onClick={() => setIsQuickLinkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickLink} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Label Judul Tautan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingQuickLink.title || ''}
                  onChange={(e) => setEditingQuickLink({ ...editingQuickLink, title: e.target.value })}
                  placeholder="Contoh: Kalender Asesmen Nasional"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alamat URL Tujuan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingQuickLink.url || ''}
                  onChange={(e) => setEditingQuickLink({ ...editingQuickLink, url: e.target.value })}
                  placeholder="https://... atau #resources"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Deskripsi Singkat (Sub-judul)</label>
                <input
                  type="text"
                  value={editingQuickLink.description || ''}
                  onChange={(e) => setEditingQuickLink({ ...editingQuickLink, description: e.target.value })}
                  placeholder="Contoh: Jadwal resmi simulasi & ANBK Kemdikbud"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilihan Ikon Lucide</label>
                  <select
                    value={editingQuickLink.icon || 'ExternalLink'}
                    onChange={(e) => setEditingQuickLink({ ...editingQuickLink, icon: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    <option value="Calendar">Calendar (Kalender)</option>
                    <option value="Download">Download (Unduh)</option>
                    <option value="Globe">Globe (Portal / Web)</option>
                    <option value="HelpCircle">HelpCircle (Bantuan)</option>
                    <option value="FileText">FileText (Dokumen)</option>
                    <option value="BookOpen">BookOpen (Buku / Panduan)</option>
                    <option value="Layers">Layers (Kisi-Kisi / Bank Soal)</option>
                    <option value="Sparkles">Sparkles (Fitur AI)</option>
                    <option value="ExternalLink">ExternalLink (Tautan Luar)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Urutan Tampil</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={editingQuickLink.order_index || 1}
                    onChange={(e) => setEditingQuickLink({ ...editingQuickLink, order_index: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!editingQuickLink.is_new_tab}
                    onChange={(e) => setEditingQuickLink({ ...editingQuickLink, is_new_tab: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span>Buka di tab peramban baru (target="_blank")</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingQuickLink.is_active ?? true}
                    onChange={(e) => setEditingQuickLink({ ...editingQuickLink, is_active: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span>Status Aktif (Tampilkan di sidebar publik)</span>
                </label>
              </div>

              <div className="px-6 py-4 -mx-6 -mb-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsQuickLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md"
                >
                  Simpan Tautan Cepat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

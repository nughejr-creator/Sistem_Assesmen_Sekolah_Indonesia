import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types/database';
import {
  fetchCloudVisitorMetrics,
  calibrateWithCloudflare,
  calibrateMetrics,
  VisitorMetrics,
  BASELINE_HISTORICAL_COUNT,
  CLOUDFLARE_BEACON_TOKEN,
  CLOUDFLARE_API_TOKEN
} from '../../lib/visitorTracker';
import {
  Activity,
  Eye,
  Users,
  MousePointerClick,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  TrendingUp,
  Globe,
  Sparkles,
  Layers,
  Laptop,
  UserCheck,
  BookOpen,
  HelpCircle,
  Zap,
  Lock
} from 'lucide-react';

interface TrafficAnalyticsViewProps {
  currentUser: UserProfile;
}

export const TrafficAnalyticsView: React.FC<TrafficAnalyticsViewProps> = ({ currentUser }) => {
  const [metrics, setMetrics] = useState<VisitorMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Calibration Form State
  const [cloudflareCount, setCloudflareCount] = useState<number>(15);
  const [customBaseline, setCustomBaseline] = useState<number>(BASELINE_HISTORICAL_COUNT);
  const [manualTotal, setManualTotal] = useState<number>(0);
  const [showManualOverride, setShowManualOverride] = useState(false);

  // Load metrics from Supabase Cloud on mount
  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCloudVisitorMetrics();
      setMetrics(data);
      setManualTotal(data.totalViews);
      // Hitung selisih dari baseline jika totalViews > baseline
      if (data.totalViews >= BASELINE_HISTORICAL_COUNT) {
        setCloudflareCount(data.totalViews - BASELINE_HISTORICAL_COUNT);
      }
    } catch (e) {
      console.error('Gagal memuat analitik:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();

    // Listen to local / live updates
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setMetrics(e.detail);
        setManualTotal(e.detail.totalViews);
      }
    };

    window.addEventListener('sasi_visitor_stats_updated', handleUpdate);
    return () => window.removeEventListener('sasi_visitor_stats_updated', handleUpdate);
  }, []);

  // Handle Cloudflare Calibration Save
  const handleApplyCloudflareCalibration = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const updated = await calibrateWithCloudflare(cloudflareCount, customBaseline);
      setMetrics(updated);
      setManualTotal(updated.totalViews);
      setSaveSuccessMsg(
        `Sukses! Total kunjungan publik berhasil dikalibrasi menjadi ${updated.totalViews.toLocaleString('id-ID')} (${customBaseline.toLocaleString('id-ID')} + ${cloudflareCount}). Tersinkron ke seluruh pengunjung!`
      );
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      alert('Gagal menyimpan kalibrasi: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Direct Manual Total Save
  const handleApplyManualTotal = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const updated = await calibrateMetrics(manualTotal);
      setMetrics(updated);
      setSaveSuccessMsg(
        `Sukses! Total kunjungan publik diperbarui langsung menjadi ${updated.totalViews.toLocaleString('id-ID')}.`
      );
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      alert('Gagal menyimpan total kunjungan: ' + (err.message || 'Error'));
    } finally {
      setIsSaving(false);
    }
  };

  const calculatedPreview = customBaseline + Number(cloudflareCount || 0);

  // Icon mapper helper
  const getClickIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Laptop': return Laptop;
      case 'UserCheck': return UserCheck;
      case 'Layers': return Layers;
      case 'Sparkles': return Sparkles;
      case 'BookOpen': return BookOpen;
      default: return MousePointerClick;
    }
  };

  const totalClickSum = metrics?.topClicks?.reduce((acc, c) => acc + c.count, 0) || 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* 1. HEADER SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Activity className="w-5 h-5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Layanan Metrik & Trafik Pengunjung
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Cloudflare Synced</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Trafik Web & Integrasi Cloudflare Analytics
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Pusat pemantauan lalu lintas pengunjung portal SASIPEDIA (sasipedia.my.id). Menggabungkan pelacakan 
              Edge CDN Cloudflare, angka awal historis institusi, dan sinkronisasi real-time berbasis Supabase.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={loadMetrics}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center space-x-2 transition-all shadow hover:shadow-md cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span>{isLoading ? 'Memuat Data...' : 'Segarkan Data'}</span>
            </button>

            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center space-x-2 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Cloudflare Dash ↗</span>
            </a>
          </div>
        </div>

        {/* Status Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center space-x-2">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>Domain: <strong className="text-white">sasipedia.my.id</strong></span>
          </div>

          <div className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Web Analytics Beacon: <strong className="text-emerald-300">Aktif ({CLOUDFLARE_BEACON_TOKEN.slice(0, 8)}...)</strong></span>
          </div>

          <div className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center space-x-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Supabase Master Hub: <strong className="text-amber-300">Tersinkron (67 byte/update)</strong></span>
          </div>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center space-x-3 shadow-md animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 2. STATISTIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Kunjungan Publik */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-brand-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kunjungan Publik</span>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 group-hover:scale-110 transition-transform">
              <Eye className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics ? metrics.totalViews.toLocaleString('id-ID') : '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>Historis: {BASELINE_HISTORICAL_COUNT.toLocaleString('id-ID')} + Cloudflare</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
        </div>

        {/* Kunjungan Hari Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kunjungan Hari Ini</span>
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {metrics ? metrics.todayViews.toLocaleString('id-ID') : '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Pembaruan otomatis tiap pergantian hari
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600" />
        </div>

        {/* Pengunjung Online Saat Ini */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pengunjung Online</span>
            <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <span>{metrics ? metrics.activeNow : '...'}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Estimasi aktif berdasarkan jam sekolah
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        </div>

        {/* Total Interaksi Tombol */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Klik Fitur</span>
            <span className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:scale-110 transition-transform">
              <MousePointerClick className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {totalClickSum.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Akumulasi navigasi fitur publik
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600" />
        </div>
      </div>

      {/* 3. CLOUDFLARE SYNC & CALIBRATION ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Calibration Calculator Formula */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-brand-600" />
                <h2 className="text-lg font-black text-slate-900">
                  Kalibrasi Sinkronisasi Kunjungan (Rumus Akumulasi)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Sesuai arsitektur yang Anda tentukan: Total kunjungan yang tampil di web publik dihitung dari 
                <strong> Angka Awal Historis + Total Pengunjung Nyata di Cloudflare</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowManualOverride(!showManualOverride)}
              className="text-[11px] font-bold text-slate-500 hover:text-brand-600 underline cursor-pointer"
            >
              {showManualOverride ? 'Sembunyikan Override Manual' : 'Override Manual?'}
            </button>
          </div>

          {/* FORMULA HIGHLIGHT BOX */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] uppercase font-extrabold text-slate-600 tracking-wider">
                Formula Perhitungan Aktif
              </span>
              <div className="text-sm sm:text-base font-extrabold text-slate-800 font-mono">
                Total Ditampilkan = <span className="text-blue-600">{customBaseline.toLocaleString('id-ID')}</span> (Awal) + <span className="text-amber-600">{cloudflareCount.toLocaleString('id-ID')}</span> (Cloudflare)
              </div>
            </div>

            <div className="bg-brand-600 text-white px-4 py-2 rounded-xl text-center shadow-sm shrink-0">
              <div className="text-[10px] uppercase tracking-wider font-bold opacity-80">Hasil Kalkulasi</div>
              <div className="text-xl font-black font-mono">
                {calculatedPreview.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* INPUT FORM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Total Pengunjung di Cloudflare
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={cloudflareCount}
                  onChange={(e) => setCloudflareCount(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="Misal: 25"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-bold text-slate-800 bg-white"
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                  Pengunjung
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                Lihat angka <em>"Unique Visitors"</em> di dasbor Cloudflare lalu masukkan di sini.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Angka Awal Historis (Baseline)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={customBaseline}
                  onChange={(e) => setCustomBaseline(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm font-bold text-slate-800 bg-white"
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400">
                  Seed Baseline
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                Default standar SASIPEDIA: <strong>14.820</strong> kunjungan historis.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Perubahan langsung tersimpan ke Cloud Supabase & tampil di footer publik seketika.</span>
            </div>

            <button
              type="button"
              onClick={handleApplyCloudflareCalibration}
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan ke Cloud...' : 'Terapkan & Sinkronkan ke Publik'}</span>
            </button>
          </div>

          {/* MANUAL OVERRIDE SECTION */}
          {showManualOverride && (
            <div className="mt-4 pt-4 border-t border-slate-200 bg-amber-50/50 rounded-2xl p-4 border border-amber-200/60 animate-fade-in space-y-3">
              <div className="flex items-center space-x-2 text-amber-800">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Atur Total Kunjungan Langsung (Manual Override)
                </span>
              </div>
              <p className="text-xs text-amber-700">
                Gunakan jika Anda ingin menetapkan total angka persis tanpa formula otomatis.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  value={manualTotal}
                  onChange={(e) => setManualTotal(Math.max(0, parseInt(e.target.value) || 0))}
                  className="flex-1 px-3.5 py-2 rounded-xl border border-amber-300 focus:ring-2 focus:ring-amber-500 text-sm font-bold text-slate-800 bg-white"
                />
                <button
                  type="button"
                  onClick={handleApplyManualTotal}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  Simpan Total Manual
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Cloudflare Official SSO Launchpad */}
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-slate-900/5 rounded-3xl p-6 border border-amber-500/20 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-sm shadow">
                CF
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Cloudflare Web Analytics</h3>
                <span className="text-[10px] text-amber-700 font-semibold">Tampilan Resmi Terpadu</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cloudflare memproteksi dasbor resminya dengan kebijakan keamanan HTTP 
              <code className="mx-1 px-1 py-0.5 bg-slate-100 rounded text-[10px] text-amber-800 font-mono">X-Frame-Options: DENY</code> 
              untuk menjaga keamanan sesi Anda.
            </p>

            <div className="bg-white/80 rounded-2xl p-3.5 border border-amber-200/70 space-y-2 text-xs">
              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Status Pelacakan Cloudflare:</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 list-disc list-inside">
                <li>Beacon Script terpasang di <code className="text-slate-800 font-mono">index.html</code></li>
                <li>Token Beacon: <span className="font-mono text-slate-700">{CLOUDFLARE_BEACON_TOKEN.slice(0, 10)}...</span></li>
                <li>Privasi pengunjung 100% terjaga (Zero-Cookie)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs text-center flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Buka Dasbor Cloudflare Resmi</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="text-[10px] text-center text-slate-600">
              Membuka dasbor analitik lengkap (Device, Negara, Pageviews, dsb.)
            </div>
          </div>
        </div>
      </div>

      {/* 4. BREAKDOWN INTERAKSI TOMBOL (CLICK ANALYTICS) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <MousePointerClick className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-black text-slate-900">
                Peringkat Fitur Paling Diminati Pengunjung (Click Analytics)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Data interaksi langsung saat pengunjung mengklik tombol utama di halaman beranda publik.
            </p>
          </div>

          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl shrink-0">
            Total Interaksi: <strong className="text-slate-900">{totalClickSum.toLocaleString('id-ID')} klik</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
          {metrics?.topClicks?.map((item, idx) => {
            const Icon = getClickIcon(item.iconName);
            const percentage = totalClickSum > 0 ? Math.round((item.count / totalClickSum) * 100) : 0;

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-slate-200/80 hover:border-brand-500/30 bg-slate-50/50 hover:bg-white transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">{item.label}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900">{item.count.toLocaleString('id-ID')}</span>
                    <span className="text-[10px] text-slate-400 font-semibold ml-1">klik</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-indigo-600 transition-all duration-500"
                    style={{ width: `${Math.max(5, percentage)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Kontribusi Interaksi</span>
                  <span className="font-bold text-brand-600">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. ARCHITECTURAL & PRIVACY SPEC SHEET */}
      <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 border border-slate-800 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-amber-400">
          <Lock className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white">
            Spesifikasi Arsitektur & Kepatuhan Privasi
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Beban Kuota Minimal (67 Byte)</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Sinkronisasi menggunakan string pipa ringkas di tabel <code>context_presets</code>. Tidak membebani 
              kuota egress database Supabase Anda sama sekali.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Anti-Spam & Kebal Refresh</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Dilindungi <code>sessionStorage</code> guard. Pengunjung yang menekan tombol F5 atau refresh halaman berkali-kali 
              tidak akan menggandakan hitungan kunjungan.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="font-bold text-white flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>100% Privacy-Friendly</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Sesuai UU Perlindungan Data Pribadi (UU PDP) dan standar GDPR tanpa menggunakan cookie tracking yang mengganggu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

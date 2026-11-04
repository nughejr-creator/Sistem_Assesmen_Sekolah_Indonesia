import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Eye, 
  TrendingUp, 
  MousePointerClick, 
  Activity, 
  ShieldCheck, 
  ExternalLink,
  Laptop,
  UserCheck,
  Layers,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { 
  VisitorMetrics, 
  getVisitorMetrics, 
  trackPageView,
  fetchCloudVisitorMetrics
} from '../../lib/visitorTracker';

interface VisitorCounterWidgetProps {
  compact?: boolean;
  onNavigateAction?: (actionId: string) => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Laptop,
  UserCheck,
  Layers,
  Sparkles,
  BookOpen
};

export const VisitorCounterWidget: React.FC<VisitorCounterWidgetProps> = ({ 
  compact = false,
  onNavigateAction
}) => {
  const [metrics, setMetrics] = useState<VisitorMetrics>(getVisitorMetrics);

  useEffect(() => {
    let isMounted = true;

    // 1. Ambil data terbaru dari Cloud Supabase & catat pageview
    trackPageView('portal')
      .then(updated => {
        if (isMounted && updated) setMetrics(updated);
      })
      .catch(() => {});

    // 2. Langganan event pembaruan metrik lokal (saat pengguna mengklik tombol di halaman ini)
    const handleStatsUpdated = (e: any) => {
      if (!isMounted) return;
      if (e.detail) {
        setMetrics(e.detail);
      } else {
        setMetrics(getVisitorMetrics());
      }
    };
    window.addEventListener('sasi_visitor_stats_updated', handleStatsUpdated);

    // 3. Polling berkala ringan setiap 60 detik (Sangat hemat kuota, 0 beban WebSocket)
    const interval = setInterval(() => {
      fetchCloudVisitorMetrics()
        .then(fresh => {
          if (isMounted && fresh) setMetrics(fresh);
        })
        .catch(() => {});
    }, 60000);

    // 4. Perbarui data saat tab kembali dibuka / fokus
    const handleWindowFocus = () => {
      fetchCloudVisitorMetrics()
        .then(fresh => {
          if (isMounted && fresh) setMetrics(fresh);
        })
        .catch(() => {});
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      window.removeEventListener('sasi_visitor_stats_updated', handleStatsUpdated);
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(interval);
    };
  }, []);

  // Format angka ke format Indonesia (14.820)
  const formatNum = (n: number) => n.toLocaleString('id-ID');

  if (compact) {
    // Tampilan ringkas horizontal untuk Footer
    return (
      <div className="inline-flex flex-wrap items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] shadow-xs">
        <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold" title="Pengunjung aktif saat ini">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Online: <strong>{metrics.activeNow}</strong></span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center space-x-1" title="Pengunjung unik hari ini">
          <Users className="w-3.5 h-3.5 text-sky-400" />
          <span>Hari Ini: <strong className="text-white">{formatNum(metrics.todayViews)}</strong></span>
        </div>
        <span className="text-slate-700">|</span>
        <div className="flex items-center space-x-1" title="Total kunjungan halaman sejak rilis">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span>Total Kunjungan: <strong className="text-white">{formatNum(metrics.totalViews)}</strong></span>
        </div>
      </div>
    );
  }

  // Tampilan kartu lengkap untuk Sidebar Portal Publik
  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200/90 p-5 shadow-xs space-y-4 text-slate-800">
      {/* Header Widget */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white flex items-center justify-center shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-slate-900">
              Statistik Kunjungan
            </h4>
            <p className="text-[10px] text-slate-400">
              Lalu Lintas Portal Real-Time
            </p>
          </div>
        </div>

        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Live: {metrics.activeNow}</span>
        </span>
      </div>

      {/* Grid 2 Kolom: Hari Ini & Total Kunjungan */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-gradient-to-br from-sky-50 to-slate-50 border border-sky-100/80 p-3 rounded-2xl">
          <div className="flex items-center space-x-1 text-sky-700 text-[10px] font-bold uppercase tracking-wider">
            <Users className="w-3 h-3" />
            <span>Hari Ini</span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {formatNum(metrics.todayViews)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
            <span>Pengunjung Unik</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100/80 p-3 rounded-2xl">
          <div className="flex items-center space-x-1 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
            <Eye className="w-3 h-3" />
            <span>Total Kunjungan</span>
          </div>
          <div className="text-lg font-black text-slate-900 mt-1">
            {formatNum(metrics.totalViews)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            <span>Sejak Dirilis</span>
          </div>
        </div>
      </div>

      {/* Top Clicked Links / Popular Actions */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span className="flex items-center space-x-1">
            <MousePointerClick className="w-3.5 h-3.5 text-brand-600" />
            <span>Tautan Paling Sering Diklik</span>
          </span>
          <span className="text-[10px] text-slate-400">Total Klik</span>
        </div>

        <div className="space-y-1.5">
          {metrics.topClicks.slice(0, 4).map((item, idx) => {
            const IconComp = (item.iconName && ICON_MAP[item.iconName]) || ExternalLink;
            return (
              <div
                key={item.id}
                onClick={() => onNavigateAction && onNavigateAction(item.id)}
                className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors border ${
                  idx === 0
                    ? 'bg-amber-50/60 border-amber-200/80 text-amber-950 font-bold'
                    : 'bg-slate-50/70 border-slate-100 hover:bg-slate-100/80 text-slate-700'
                } ${onNavigateAction ? 'cursor-pointer' : ''}`}
                title={`Klik untuk menuju ${item.label}`}
              >
                <div className="flex items-center space-x-2 truncate pr-2">
                  <span className={`text-[10px] font-black w-4 text-center shrink-0 ${idx === 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    #{idx + 1}
                  </span>
                  <IconComp className={`w-3.5 h-3.5 shrink-0 ${idx === 0 ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span className="truncate text-[11px]">
                    {item.label}
                  </span>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-700 shrink-0">
                  {formatNum(item.count)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Badge Keamanan & Cloudflare */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center space-x-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>Privasi Terlindungi</span>
        </span>
        <span className="text-emerald-600 font-bold flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Cloud Sync Aktif</span>
        </span>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Database, Check } from 'lucide-react';
import { isLiveSupabase, supabase } from '../../lib/supabase';

export const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
      checkDb();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Real heartbeat check to Supabase
    const checkDb = async () => {
      setDbStatus('checking');
      try {
        const { error } = await supabase.from('schools').select('id').limit(1);
        if (error) {
          setDbStatus('error');
          setDbError(error.message);
        } else {
          setDbStatus('connected');
          setDbError(null);
        }
      } catch (e: any) {
        setDbStatus('error');
        setDbError(e?.message || 'Server database tidak terjangkau');
      }
    };
    checkDb();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="print:hidden network-status-indicator fixed bottom-4 left-4 z-50 flex flex-wrap items-center gap-2">
      {/* Network Online / Offline Status */}
      <div
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md transition-all duration-300 border ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300 bg-white/95'
            : 'bg-rose-500/15 text-rose-700 border-rose-300 bg-white/95 animate-pulse'
        }`}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isOnline ? 'bg-emerald-400' : 'bg-rose-400'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isOnline ? 'bg-emerald-500' : 'bg-rose-600'
            }`}
          />
        </span>
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span className="font-bold">Sedang Offline (Jawaban Tersimpan Lokal)</span>
          </>
        )}
      </div>

      {/* Supabase Live Connected Badge with Real Status */}
      <div
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold shadow-lg backdrop-blur-md border ${
          dbStatus === 'connected'
            ? 'bg-slate-900 text-white border-slate-700'
            : dbStatus === 'checking'
            ? 'bg-amber-900/90 text-amber-200 border-amber-600 animate-pulse'
            : 'bg-rose-950 text-rose-200 border-rose-700'
        }`}
        title={
          dbStatus === 'connected'
            ? 'Terhubung aktif ke Supabase Cloud Database'
            : `Supabase terputus / paused (${dbError || 'Periksa status proyek di dashboard'})`
        }
      >
        <Database className={`w-3.5 h-3.5 ${
          dbStatus === 'connected' ? 'text-emerald-400' : dbStatus === 'checking' ? 'text-amber-400' : 'text-rose-400'
        }`} />
        <span>Supabase:</span>
        <span className="font-mono">
          {dbStatus === 'connected' ? 'Terhubung' : dbStatus === 'checking' ? 'Memeriksa...' : 'Terputus (Paused)'}
        </span>
        {dbStatus === 'connected' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
      </div>

      {showToast && !isOnline && (
        <div className="bg-rose-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl animate-fade-in">
          Koneksi terputus! Anda tetap dapat melanjutkan pengerjaan CBT.
        </div>
      )}
    </div>
  );
};

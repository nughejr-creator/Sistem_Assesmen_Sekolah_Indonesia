import React from 'react';
import { Hourglass, Database, Sparkles } from 'lucide-react';

interface HourglassLoaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  compact?: boolean;
  minHeight?: string;
  className?: string;
}

export const HourglassLoader: React.FC<HourglassLoaderProps> = ({
  title = 'Sedang Memuat Data...',
  subtitle = 'Mohon tunggu sejenak, data Anda sedang disinkronkan secara aman dari cloud database SASI.',
  badgeText = 'SINKRONISASI CLOUD SUPABASE',
  compact = false,
  minHeight = 'min-h-[260px]',
  className = ''
}) => {
  if (compact) {
    return (
      <div className={`flex items-center justify-center space-x-3 py-6 px-4 bg-white/70 backdrop-blur-xs rounded-2xl border border-amber-200/60 shadow-2xs ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/20 border border-amber-400/40 flex items-center justify-center text-amber-600 shrink-0">
          <Hourglass className="w-5 h-5 animate-hourglass" />
        </div>
        <div className="text-left">
          <div className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
            <span>{title}</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
          </div>
          <p className="text-[11px] text-slate-500 font-medium line-clamp-1">{subtitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 ${minHeight} bg-white/60 backdrop-blur-xs rounded-3xl border border-slate-200/80 shadow-xs animate-fade-in ${className}`}>
      
      {/* Pill Badge Cloud Status */}
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-extrabold tracking-wide uppercase mb-4 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Database className="w-3.5 h-3.5 text-emerald-600" />
        <span>{badgeText}</span>
      </div>

      {/* Animated Hourglass Container */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft glowing ambient circle */}
        <div className="absolute inset-0 rounded-3xl bg-amber-400/20 blur-xl scale-125 animate-pulse" />
        
        {/* Icon Card */}
        <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-br from-amber-50 via-white to-amber-100/60 border-2 border-amber-300/80 shadow-md shadow-amber-500/15 flex items-center justify-center text-amber-600">
          <Hourglass className="w-8 h-8 sm:w-9 sm:h-9 animate-hourglass" />
          <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
        </div>
      </div>

      {/* Main Title */}
      <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
        {title}
      </h3>

      {/* Reassuring Subtitle */}
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed font-medium">
        {subtitle}
      </p>

      {/* Subtle Animated Progress Dots */}
      <div className="flex items-center justify-center space-x-1.5 mt-5">
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

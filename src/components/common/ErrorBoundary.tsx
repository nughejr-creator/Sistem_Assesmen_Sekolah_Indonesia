import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldCheck } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  private handleBypass = () => {
    localStorage.setItem('sasi_role_override', 'super_admin');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4">
            
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Terjadi Kendala Saat Memuat Halaman</h2>
              <p className="text-xs text-slate-400 mt-1">
                SASI Diagnostic Engine mendeteksi kendala rendering komponen pada aplikasi.
              </p>
            </div>

            {this.state.error && (
              <div className="space-y-2">
                <div className="p-3 bg-rose-950/80 rounded-xl border border-red-500/40 text-rose-200 font-mono text-xs">
                  <div className="font-bold text-rose-300 mb-1">Pesan Kesalahan:</div>
                  <div className="font-semibold break-words">{this.state.error.name}: {this.state.error.message}</div>
                </div>
                {this.state.errorInfo?.componentStack && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-700 text-slate-400 font-mono text-[10px] overflow-x-auto max-h-32">
                    <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Cache & Muat Ulang</span>
              </button>

              <button
                onClick={this.handleBypass}
                className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Bypass ke Super Admin</span>
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';

interface SyncStatusProps {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  lastSynced: Date | null;
  onRetry: () => void;
  isUsingMock: boolean;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({
  isLoading,
  isError,
  errorMessage,
  lastSynced,
  onRetry,
  isUsingMock,
}) => {
  const formatTime = (d: Date | null) => {
    if (!d) return 'Just now';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 
      ', ' + d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-blue-800 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/40 border-b border-blue-200/60 dark:border-blue-900/60 animate-pulse transition-all">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Syncing data with database... Please wait...</span>
        </div>
        <span className="hidden sm:inline-block text-[11px] text-blue-600 dark:text-blue-400 font-mono">
          Web App API
        </span>
      </div>
    );
  }

  if (isUsingMock) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2 text-xs font-medium text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border-b border-amber-200 dark:border-amber-800 transition-all">
        <div className="flex items-center gap-2 min-w-0">
          <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">
            <strong>Spreadsheet Belum Terhubung:</strong> Buka <strong>Settings</strong>, salin script backend, dan tempel URL Web App agar data masuk otomatis ke Spreadsheet <strong>1Xdhei2rVDYYsWhLh8YahZj1G8qgvjM4_Zbw-H51wTvw</strong>.
          </span>
        </div>
        <button
          onClick={onRetry}
          className="px-2.5 py-1 text-xs font-bold text-amber-900 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-800/80 hover:bg-amber-300 dark:hover:bg-amber-700 rounded-md transition-colors shrink-0 cursor-pointer"
        >
          Cek Koneksi
        </button>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200/70 dark:border-amber-900/60 transition-all">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            {errorMessage ? `⚠ ${errorMessage}` : '⚠ Unable to sync database. Using offline cached records.'}
          </span>
        </div>
        <button
          onClick={onRetry}
          className="ml-2 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 hover:bg-amber-200 dark:hover:bg-amber-800/80 rounded border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer"
        >
          Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 transition-all">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="font-medium text-slate-700 dark:text-slate-200">Data synced successfully</span>
        <span className="text-slate-400 dark:text-slate-600 font-normal">|</span>
        <span className="text-slate-500 dark:text-slate-400">
          Last synced: {formatTime(lastSynced)}
        </span>
      </div>
    </div>
  );
};

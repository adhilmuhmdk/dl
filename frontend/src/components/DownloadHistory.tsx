'use client';

import React from 'react';
import { DownloadHistoryItem, AppSettings } from '../lib/types';
import { formatBytes } from '../lib/url';
import { getFileDownloadUrl } from '../lib/api';
import { Download, Trash2, History, ExternalLink, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface DownloadHistoryProps {
  history: DownloadHistoryItem[];
  onClearHistory: () => void;
  settings: AppSettings;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({
  history,
  onClearHistory,
  settings,
}) => {
  if (!history || history.length === 0) {
    return (
      <div className="w-full max-w-3xl mx-auto my-12 text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white/50 dark:bg-slate-900/30">
        <History className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No download history</h3>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-sm mx-auto">
          Your analyzed and completed downloads will be saved locally in your browser storage.
        </p>
      </div>
    );
  }

  return (
    <div id="history-section" className="w-full max-w-3xl mx-auto my-10 space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Download History</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
            {history.length}
          </span>
        </div>

        <button
          onClick={onClearHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      <div className="space-y-3">
        {history.map((item) => {
          const isCompleted = item.status === 'completed';
          const isFailed = item.status === 'failed';
          const isCancelled = item.status === 'cancelled';
          const fileUrl = getFileDownloadUrl(item.downloadId, settings);

          return (
            <div
              key={item.downloadId}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Thumbnail or placeholder icon */}
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-16 h-12 object-cover rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                )}

                <div className="min-w-0 space-y-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {item.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{new Date(item.date).toLocaleDateString()}</span>
                    {item.filesize && <span>• {formatBytes(item.filesize)}</span>}
                    {item.formatLabel && <span>• {item.formatLabel}</span>}
                  </div>
                </div>
              </div>

              {/* Status Badge & Action */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isCompleted
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : isFailed
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      : isCancelled
                      ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                  }`}
                >
                  {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                  {isFailed && <XCircle className="w-3 h-3" />}
                  {isCancelled && <Clock className="w-3 h-3" />}
                  <span className="capitalize">{item.status}</span>
                </span>

                {isCompleted && (
                  <a
                    href={fileUrl}
                    download
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors"
                    title="Download file again"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

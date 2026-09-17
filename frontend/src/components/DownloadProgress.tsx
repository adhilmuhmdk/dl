'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DownloadStatusResponse, AppSettings } from '../lib/types';
import { getDownloadStatus, cancelDownload, getFileDownloadUrl } from '../lib/api';
import { formatBytes, formatDuration } from '../lib/url';
import { updateHistoryStatus } from '../lib/storage';
import { Download, XCircle, CheckCircle2, AlertTriangle, Loader2, Gauge, Clock } from 'lucide-react';

interface DownloadProgressProps {
  downloadId: string;
  settings: AppSettings;
  onFinished?: (status: DownloadStatusResponse) => void;
  onError?: (errMessage: string) => void;
}

export const DownloadProgress: React.FC<DownloadProgressProps> = ({
  downloadId,
  settings,
  onFinished,
  onError,
}) => {
  const [status, setStatus] = useState<DownloadStatusResponse | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const data = await getDownloadStatus(downloadId, settings);
      setStatus(data);

      // Sync status to localStorage history
      updateHistoryStatus(downloadId, data.status, data.filename, data.filesize);

      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        if (onFinished) onFinished(data);
      }
    } catch (err: any) {
      setErrorText(err.message || 'Error fetching status');
      if (onError) onError(err.message || 'Error fetching status');
    }
  }, [downloadId, settings, onFinished, onError]);

  useEffect(() => {
    if (errorText) return;

    pollStatus();

    // Poll periodically while active
    const intervalId = setInterval(() => {
      if (
        !errorText &&
        (status?.status === 'queued' ||
         status?.status === 'downloading' ||
         status?.status === 'processing' ||
         !status)
      ) {
        pollStatus();
      }
    }, settings.pollingInterval || 1000);

    return () => clearInterval(intervalId);
  }, [pollStatus, status?.status, errorText, settings.pollingInterval]);

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelDownload(downloadId, settings);
      await pollStatus();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to cancel download');
    } finally {
      setIsCancelling(false);
    }
  };

  if (errorText) {
    return (
      <div className="w-full max-w-3xl mx-auto my-6 p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl flex items-center gap-4 text-rose-700 dark:text-rose-300">
        <AlertTriangle className="w-6 h-6 shrink-0" />
        <div>
          <h4 className="font-bold">Status Error</h4>
          <p className="text-sm mt-0.5">{errorText}</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="w-full max-w-3xl mx-auto my-6 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span>Initializing download stream...</span>
      </div>
    );
  }

  const statusBadges = {
    queued: { bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', label: 'Queued' },
    downloading: { bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', label: 'Downloading' },
    processing: { bg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300', label: 'Processing (FFmpeg)' },
    completed: { bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', label: 'Completed' },
    failed: { bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300', label: 'Failed' },
    cancelled: { bg: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300', label: 'Cancelled' },
  };

  const badge = statusBadges[status.status] || statusBadges.queued;
  const isFinished = ['completed', 'failed', 'cancelled'].includes(status.status);
  const fileUrl = getFileDownloadUrl(downloadId, settings);

  return (
    <div className="w-full max-w-3xl mx-auto my-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 transition-all">
      {/* Header & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${badge.bg}`}>
            {badge.label}
          </span>
          {status.filename && (
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 truncate max-w-lg">
              {status.filename}
            </h3>
          )}
        </div>

        {/* Action Button */}
        {!isFinished && (
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors"
          >
            {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Progress Bar & Percentage */}
      {status.status !== 'failed' && (
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span className="text-slate-600 dark:text-slate-400">Progress</span>
            <span className="text-blue-600 dark:text-blue-400 text-base">{status.progress.toFixed(1)}%</span>
          </div>

          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(2, Math.min(100, status.progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Metrics Row: Speed, ETA, Filesize */}
      {status.status === 'downloading' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Gauge className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Speed</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{status.speed || '0 B/s'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-medium">ETA</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {status.eta > 0 ? formatDuration(status.eta) : 'Calculating...'}
              </div>
            </div>
          </div>

          {status.filesize && (
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <Download className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="text-[10px] text-slate-400 font-medium">Total Size</div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatBytes(status.filesize)}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error display if failed */}
      {status.status === 'failed' && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-300">
          <p className="font-bold">Download Failed:</p>
          <p className="mt-1 font-mono">{status.error || 'Unknown download error occurred on server.'}</p>
        </div>
      )}

      {/* Completed Success Banner & Download File Button */}
      {status.status === 'completed' && (
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>Media processing completed successfully! Your file is ready.</span>
          </div>

          <a
            href={fileUrl}
            download
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-base transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Save Downloaded File ({status.filesize ? formatBytes(status.filesize) : 'Download'})</span>
          </a>
        </div>
      )}
    </div>
  );
};

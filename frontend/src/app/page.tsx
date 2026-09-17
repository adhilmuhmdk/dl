'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { UrlInput } from '../components/UrlInput';
import { MediaInfoCard } from '../components/MediaInfoCard';
import { DownloadProgress } from '../components/DownloadProgress';
import { DownloadHistory } from '../components/DownloadHistory';
import { SettingsModal } from '../components/SettingsModal';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { AppSettings, InfoResponse, DownloadHistoryItem } from '../lib/types';
import { getSettings, saveSettings, getHistory, addHistoryItem, clearHistory, DEFAULT_SETTINGS } from '../lib/storage';
import { fetchMediaInfo, triggerDownload } from '../lib/api';

export default function Home() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mediaInfo, setMediaInfo] = useState<InfoResponse | null>(null);
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [isStartingDownload, setIsStartingDownload] = useState(false);
  
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize settings & history from localStorage
  useEffect(() => {
    const loadedSettings = getSettings();
    setSettings(loadedSettings);
    setTheme(loadedSettings.theme || 'dark');
    setHistory(getHistory());
  }, []);

  // Update theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const addToast = (type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTheme = () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const updated: AppSettings = { ...settings, theme: nextTheme };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    addToast('success', 'Backend settings saved successfully.');
  };

  const handleClearInputState = () => {
    setMediaInfo(null);
    setActiveDownloadId(null);
  };

  const handleAnalyzeUrl = async (url: string) => {
    setIsAnalyzing(true);
    setMediaInfo(null);
    setActiveDownloadId(null);

    try {
      const data = await fetchMediaInfo(url, settings);
      setMediaInfo(data);
      addToast('success', 'Media information extracted successfully.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to analyze URL.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartDownload = async (formatId: string, isAudioOnly: boolean) => {
    if (!mediaInfo) return;
    setIsStartingDownload(true);

    try {
      const targetUrl = mediaInfo.webpage_url || '';
      const downloadId = await triggerDownload(targetUrl, formatId, isAudioOnly, settings);
      setActiveDownloadId(downloadId);

      const selectedFmt = mediaInfo.formats.find(f => f.format_id === formatId);
      const historyItem: DownloadHistoryItem = {
        downloadId,
        title: mediaInfo.title,
        thumbnail: mediaInfo.thumbnail,
        date: new Date().toISOString(),
        status: 'queued',
        url: targetUrl,
        formatLabel: selectedFmt?.label || (isAudioOnly ? 'Audio Only' : formatId),
      };

      addHistoryItem(historyItem);
      setHistory(getHistory());
      addToast('info', 'Download job queued successfully.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to initiate download job.');
    } finally {
      setIsStartingDownload(false);
    }
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    addToast('info', 'Download history cleared.');
  };

  const scrollToHistory = () => {
    const element = document.getElementById('history-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Navigation Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onScrollToHistory={scrollToHistory}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Hero Banner */}
        <Hero />

        {/* URL Input Form */}
        <UrlInput
          onAnalyze={handleAnalyzeUrl}
          isLoading={isAnalyzing}
          onClear={handleClearInputState}
        />

        {/* Media Information & Format Selection */}
        {mediaInfo && (
          <MediaInfoCard
            info={mediaInfo}
            onStartDownload={handleStartDownload}
            isStartingDownload={isStartingDownload}
          />
        )}

        {/* Active Download Progress Card */}
        {activeDownloadId && (
          <DownloadProgress
            downloadId={activeDownloadId}
            settings={settings}
            onFinished={() => setHistory(getHistory())}
            onError={(err) => addToast('error', err)}
          />
        )}

        {/* Download History Section */}
        <DownloadHistory
          history={history}
          onClearHistory={handleClearHistory}
          settings={settings}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/50 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>MediaFetch &copy; {new Date().getFullYear()} • Self-Hosted yt-dlp & FFmpeg Downloader</p>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

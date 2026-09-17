import { AppSettings, DownloadHistoryItem } from './types';

const SETTINGS_KEY = 'mediafetch_settings';
const HISTORY_KEY = 'mediafetch_history';

export const DEFAULT_SETTINGS: AppSettings = {
  apiUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  apiKey: '',
  pollingInterval: 1000,
  autoCleanup: true,
  theme: 'dark',
};

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}

export function getHistory(): DownloadHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveHistory(history: DownloadHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save history to localStorage:', e);
  }
}

export function addHistoryItem(item: DownloadHistoryItem): void {
  const current = getHistory();
  const filtered = current.filter(i => i.downloadId !== item.downloadId);
  const updated = [item, ...filtered].slice(0, 50); // Keep max 50 items
  saveHistory(updated);
}

export function updateHistoryStatus(downloadId: string, status: DownloadHistoryItem['status'], filename?: string, filesize?: number): void {
  const current = getHistory();
  const updated = current.map(item => {
    if (item.downloadId === downloadId) {
      return {
        ...item,
        status,
        ...(filename ? { filename } : {}),
        ...(filesize ? { filesize } : {}),
      };
    }
    return item;
  });
  saveHistory(updated);
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HISTORY_KEY);
}

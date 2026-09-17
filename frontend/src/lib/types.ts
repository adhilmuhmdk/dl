export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface FormatOption {
  format_id: string;
  ext: string;
  resolution: string;
  fps?: number;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  format_note?: string;
  is_audio_only: boolean;
  label: string;
}

export interface InfoResponse {
  id: string;
  title: string;
  thumbnail?: string;
  uploader?: string;
  duration?: number;
  upload_date?: string;
  formats: FormatOption[];
  webpage_url?: string;
}

export interface DownloadStatusResponse {
  download_id: string;
  status: DownloadStatus;
  progress: number;
  speed: string;
  eta: number;
  filename?: string;
  filesize?: number;
  error?: string;
}

export interface DownloadHistoryItem {
  downloadId: string;
  title: string;
  thumbnail?: string;
  date: string;
  status: DownloadStatus;
  filename?: string;
  filesize?: number;
  url: string;
  formatLabel?: string;
}

export interface AppSettings {
  apiUrl: string;
  apiKey?: string;
  pollingInterval: number; // in ms
  autoCleanup: boolean;
  theme: 'dark' | 'light';
}

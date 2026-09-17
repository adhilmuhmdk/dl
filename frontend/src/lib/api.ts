import { AppSettings, InfoResponse, DownloadStatusResponse } from './types';

function getApiBaseUrl(settings?: AppSettings): string {
  if (settings && settings.apiUrl) {
    return settings.apiUrl.replace(/\/+$/, '');
  }
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
}

function getHeaders(settings?: AppSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (settings?.apiKey) {
    headers['X-API-Key'] = settings.apiKey;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = 'An unexpected error occurred.';
    try {
      const data = await response.json();
      if (data.detail) {
        errorDetail = data.detail;
      }
    } catch {
      errorDetail = `HTTP Error ${response.status}: ${response.statusText}`;
    }

    if (response.status === 400) {
      throw new Error(errorDetail || 'Invalid URL or unsupported media format.');
    } else if (response.status === 413) {
      throw new Error('File exceeds the maximum configured size limit.');
    } else if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment before trying again.');
    } else if (response.status === 401) {
      throw new Error('Unauthorized: Invalid backend API key.');
    } else {
      throw new Error(errorDetail);
    }
  }

  return response.json();
}

export async function fetchMediaInfo(url: string, settings?: AppSettings): Promise<InfoResponse> {
  const baseUrl = getApiBaseUrl(settings);
  try {
    const response = await fetch(`${baseUrl}/info`, {
      method: 'POST',
      headers: getHeaders(settings),
      body: JSON.stringify({ url }),
    });
    return await handleResponse<InfoResponse>(response);
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to backend at ${baseUrl}. Ensure backend server is running.`);
    }
    throw error;
  }
}

export async function triggerDownload(
  url: string,
  formatId: string,
  audioOnly: boolean,
  settings?: AppSettings
): Promise<string> {
  const baseUrl = getApiBaseUrl(settings);
  try {
    const response = await fetch(`${baseUrl}/download`, {
      method: 'POST',
      headers: getHeaders(settings),
      body: JSON.stringify({
        url,
        format_id: formatId,
        audio_only: audioOnly,
      }),
    });
    const data = await handleResponse<{ download_id: string }>(response);
    return data.download_id;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Failed to connect to backend at ${baseUrl}.`);
    }
    throw error;
  }
}

export async function getDownloadStatus(
  downloadId: string,
  settings?: AppSettings
): Promise<DownloadStatusResponse> {
  const baseUrl = getApiBaseUrl(settings);
  const response = await fetch(`${baseUrl}/download/${downloadId}/status`, {
    method: 'GET',
    headers: getHeaders(settings),
  });
  return await handleResponse<DownloadStatusResponse>(response);
}

export async function cancelDownload(downloadId: string, settings?: AppSettings): Promise<void> {
  const baseUrl = getApiBaseUrl(settings);
  const response = await fetch(`${baseUrl}/download/${downloadId}/cancel`, {
    method: 'POST',
    headers: getHeaders(settings),
  });
  await handleResponse<{ download_id: string; cancelled: boolean }>(response);
}

export function getFileDownloadUrl(downloadId: string, settings?: AppSettings): string {
  const baseUrl = getApiBaseUrl(settings);
  let url = `${baseUrl}/download/${downloadId}/file`;
  if (settings?.apiKey) {
    url += `?api_key=${encodeURIComponent(settings.apiKey)}`;
  }
  return url;
}

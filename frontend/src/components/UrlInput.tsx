'use client';

import React, { useState } from 'react';
import { Search, Clipboard, X, Loader2, AlertCircle } from 'lucide-react';
import { isValidUrl } from '../lib/url';

interface UrlInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
  onClear?: () => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({ onAnalyze, isLoading, onClear }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    if (error) setError(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        if (error) setError(null);
      }
    } catch (e) {
      console.error('Failed to read clipboard', e);
    }
  };

  const handleClear = () => {
    setUrl('');
    setError(null);
    if (onClear) onClear();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();

    if (!trimmed) {
      setError('Please enter a URL.');
      return;
    }

    if (!isValidUrl(trimmed)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }

    setError(null);
    onAnalyze(trimmed);
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-6">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus-within:border-blue-500 dark:focus-within:border-blue-500 rounded-2xl shadow-lg transition-all duration-200 p-2">
          {/* Input Icon */}
          <div className="pl-3 pr-2 text-slate-400">
            <Search className="w-5 h-5" />
          </div>

          {/* Main URL Input */}
          <input
            type="text"
            value={url}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Paste media link (e.g. YouTube, Vimeo, Twitch...)"
            className="w-full py-2.5 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-base sm:text-lg"
          />

          {/* Clear Button */}
          {url && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Clear input"
              aria-label="Clear input"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Paste Button */}
          {!url && !isLoading && (
            <button
              type="button"
              onClick={handlePaste}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors mr-2"
              title="Paste from clipboard"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paste</span>
            </button>
          )}

          {/* Analyze Button */}
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md transition-colors shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <span>Analyze</span>
            )}
          </button>
        </div>
      </form>

      {/* Validation Error Banner */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-rose-500 dark:text-rose-400 pl-4 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import { InfoResponse } from '../lib/types';
import { formatDuration } from '../lib/url';
import { FormatSelector } from './FormatSelector';
import { Download, User, Clock, Calendar, ExternalLink } from 'lucide-react';

interface MediaInfoCardProps {
  info: InfoResponse;
  onStartDownload: (formatId: string, isAudioOnly: boolean) => void;
  isStartingDownload: boolean;
}

export const MediaInfoCard: React.FC<MediaInfoCardProps> = ({
  info,
  onStartDownload,
  isStartingDownload,
}) => {
  const [selectedFormatId, setSelectedFormatId] = useState<string>(
    info.formats?.[0]?.format_id || 'best'
  );
  const [isAudioOnly, setIsAudioOnly] = useState<boolean>(
    info.formats?.[0]?.is_audio_only || false
  );

  const handleSelectFormat = (formatId: string, audioOnly: boolean) => {
    setSelectedFormatId(formatId);
    setIsAudioOnly(audioOnly);
  };

  const formattedDate = info.upload_date
    ? info.upload_date.length === 8
      ? `${info.upload_date.slice(0, 4)}-${info.upload_date.slice(4, 6)}-${info.upload_date.slice(6, 8)}`
      : info.upload_date
    : null;

  return (
    <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden transition-all my-6">
      <div className="p-6 space-y-6">
        {/* Media Preview Header */}
        <div className="flex flex-col md:flex-row gap-5 items-start">
          {/* Thumbnail */}
          {info.thumbnail && (
            <div className="relative w-full md:w-60 aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-md">
              <img
                src={info.thumbnail}
                alt={info.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {info.duration && (
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/80 text-white text-xs font-semibold backdrop-blur-sm">
                  {formatDuration(info.duration)}
                </div>
              )}
            </div>
          )}

          {/* Metadata info */}
          <div className="flex-1 space-y-2.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {info.title}
            </h2>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              {info.uploader && (
                <div className="flex items-center gap-1.5 font-medium">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>{info.uploader}</span>
                </div>
              )}

              {info.duration && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{formatDuration(info.duration)}</span>
                </div>
              )}

              {formattedDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{formattedDate}</span>
                </div>
              )}
            </div>

            {info.webpage_url && (
              <a
                href={info.webpage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline pt-1"
              >
                <span>Open original page</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Format Selector */}
        <FormatSelector
          formats={info.formats}
          selectedFormatId={selectedFormatId}
          onSelectFormat={handleSelectFormat}
        />

        {/* Download Action Button */}
        <div className="pt-2">
          <button
            onClick={() => onStartDownload(selectedFormatId, isAudioOnly)}
            disabled={isStartingDownload}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 text-base transition-all duration-200 transform active:scale-[0.99]"
          >
            <Download className="w-5 h-5" />
            <span>{isStartingDownload ? 'Preparing Download...' : 'Download Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

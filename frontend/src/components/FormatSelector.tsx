'use client';

import React from 'react';
import { FormatOption } from '../lib/types';
import { formatBytes } from '../lib/url';
import { Video, Music, Check, Sparkles } from 'lucide-react';

interface FormatSelectorProps {
  formats: FormatOption[];
  selectedFormatId: string;
  onSelectFormat: (formatId: string, isAudioOnly: boolean) => void;
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  formats,
  selectedFormatId,
  onSelectFormat,
}) => {
  if (!formats || formats.length === 0) return null;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        Select Format & Quality:
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {formats.map((fmt) => {
          const isSelected = selectedFormatId === fmt.format_id;
          const isBest = fmt.format_id === 'best';
          const size = fmt.filesize || fmt.filesize_approx;

          return (
            <button
              key={fmt.format_id}
              type="button"
              onClick={() => onSelectFormat(fmt.format_id, fmt.is_audio_only)}
              className={`relative flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    fmt.is_audio_only
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                      : isBest
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {fmt.is_audio_only ? (
                    <Music className="w-4 h-4" />
                  ) : isBest ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <Video className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {fmt.resolution}
                    </span>
                    {fmt.fps && fmt.fps > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {fmt.fps} FPS
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {fmt.ext || (fmt.is_audio_only ? 'mp3' : 'mp4')}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {fmt.format_note || (fmt.is_audio_only ? 'Audio Stream' : 'Video + Audio')}
                  </p>
                </div>
              </div>

              {/* Right side: Size & selection check */}
              <div className="flex items-center gap-2">
                {size && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatBytes(size)}
                  </span>
                )}
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

'use client';

import React from 'react';
import { Server } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="text-center pt-8 pb-4 sm:pt-12 sm:pb-6">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
        <Server className="w-3.5 h-3.5" />
        <span>Self-Hosted Core Engine (yt-dlp + FFmpeg)</span>
      </div>
      
      <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-2xl mx-auto leading-tight">
        Download your <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">media</span>
      </h1>
      
      <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
        Analyze and download media from supported URLs using your own high-performance local backend.
      </p>
    </section>
  );
};

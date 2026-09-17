import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediaFetch - Self-Hosted Media Downloader',
  description: 'Analyze and download media from supported URLs using yt-dlp and FFmpeg.',
  keywords: ['yt-dlp', 'media downloader', 'video downloader', 'self-hosted', 'ffmpeg'],
  authors: [{ name: 'MediaFetch Team' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}

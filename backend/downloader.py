import asyncio
import os
import shutil
import time
import uuid
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Optional
import yt_dlp

from config import settings
from models import DownloadStatusEnum

logger = logging.getLogger("mediafetch.downloader")

def find_ffmpeg_location() -> Optional[str]:
    # Check system PATH first
    found = shutil.which("ffmpeg")
    if found:
        return os.path.dirname(os.path.abspath(found))
    
    # Check WinGet packages directory on Windows
    local_appdata = os.environ.get("LOCALAPPDATA", "")
    if local_appdata:
        winget_dir = os.path.join(local_appdata, "Microsoft", "WinGet", "Packages")
        if os.path.exists(winget_dir):
            for root, dirs, files in os.walk(winget_dir):
                if "ffmpeg.exe" in files:
                    bin_dir = os.path.abspath(root)
                    if bin_dir not in os.environ.get("PATH", ""):
                        os.environ["PATH"] += os.pathsep + bin_dir
                    return bin_dir
    return None

class DownloadJob:
    def __init__(self, download_id: str, url: str, format_id: str, audio_only: bool):
        self.download_id = download_id
        self.url = url
        self.format_id = format_id
        self.audio_only = audio_only
        self.status = DownloadStatusEnum.QUEUED
        self.progress: float = 0.0
        self.speed: str = "0 B/s"
        self.eta: int = 0
        self.filename: Optional[str] = None
        self.filepath: Optional[str] = None
        self.filesize: Optional[int] = None
        self.error: Optional[str] = None
        self.created_at: float = time.time()
        self.updated_at: float = time.time()
        self.cancel_event = threading.Event()

class DownloadManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DownloadManager, cls).__new__(cls)
            cls._instance._init_manager()
        return cls._instance

    def _init_manager(self):
        self.jobs: Dict[str, DownloadJob] = {}
        self.executor = ThreadPoolExecutor(max_workers=10)
        self.semaphore = asyncio.Semaphore(settings.MAX_CONCURRENT_DOWNLOADS)
        self.lock = threading.Lock()
        
        # Ensure directories exist
        os.makedirs(os.path.abspath(settings.DOWNLOAD_DIR), exist_ok=True)
        os.makedirs(os.path.abspath(settings.TEMP_DIR), exist_ok=True)

    def get_job(self, download_id: str) -> Optional[DownloadJob]:
        with self.lock:
            return self.jobs.get(download_id)

    def create_job(self, url: str, format_id: str = "best", audio_only: bool = False) -> DownloadJob:
        download_id = str(uuid.uuid4())
        job = DownloadJob(
            download_id=download_id,
            url=url,
            format_id=format_id or "best",
            audio_only=audio_only
        )
        with self.lock:
            self.jobs[download_id] = job
        
        # Schedule execution in background
        asyncio.create_task(self._process_queue(job))
        return job

    def cancel_job(self, download_id: str) -> bool:
        with self.lock:
            job = self.jobs.get(download_id)
            if not job:
                return False
            if job.status in [DownloadStatusEnum.COMPLETED, DownloadStatusEnum.FAILED, DownloadStatusEnum.CANCELLED]:
                return False
            job.cancel_event.set()
            job.status = DownloadStatusEnum.CANCELLED
            job.updated_at = time.time()
            return True

    async def _process_queue(self, job: DownloadJob):
        async with self.semaphore:
            if job.cancel_event.is_set():
                return
            
            job.status = DownloadStatusEnum.DOWNLOADING
            job.updated_at = time.time()
            
            loop = asyncio.get_running_loop()
            try:
                await loop.run_in_executor(self.executor, self._run_ytdlp_download, job)
            except Exception as e:
                logger.error(f"Download error for job {job.download_id}: {e}")
                if job.cancel_event.is_set():
                    job.status = DownloadStatusEnum.CANCELLED
                else:
                    job.status = DownloadStatusEnum.FAILED
                    job.error = str(e)
                job.updated_at = time.time()

    def _run_ytdlp_download(self, job: DownloadJob):
        abs_download_dir = os.path.abspath(settings.DOWNLOAD_DIR)
        abs_temp_dir = os.path.abspath(settings.TEMP_DIR)
        
        out_template = os.path.join(abs_download_dir, f"%(title).80s_{job.download_id}.%(ext)s")
        
        def progress_hook(d):
            if job.cancel_event.is_set():
                raise Exception("Download cancelled by user")
            
            if d['status'] == 'downloading':
                job.status = DownloadStatusEnum.DOWNLOADING
                downloaded = d.get('downloaded_bytes', 0)
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                
                # Check max download size
                if total > (settings.MAX_DOWNLOAD_SIZE_MB * 1024 * 1024):
                    raise Exception(f"File exceeds maximum allowed size of {settings.MAX_DOWNLOAD_SIZE_MB}MB")

                if total > 0:
                    job.progress = round((downloaded / total) * 100, 1)
                    job.filesize = int(total)
                else:
                    job.progress = 0.0

                job.speed = d.get('_speed_str', '0 B/s').strip()
                raw_eta = d.get('eta')
                job.eta = int(raw_eta) if raw_eta is not None else 0

                raw_filename = d.get('filename')
                if raw_filename:
                    job.filename = os.path.basename(raw_filename)
                
                job.updated_at = time.time()

            elif d['status'] == 'finished':
                job.status = DownloadStatusEnum.PROCESSING
                job.progress = 99.0
                raw_filename = d.get('filename')
                if raw_filename:
                    job.filepath = raw_filename
                    job.filename = os.path.basename(raw_filename)
                job.updated_at = time.time()

        ydl_opts = {
            'outtmpl': out_template,
            'progress_hooks': [progress_hook],
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
            'cachedir': False,
            'restrictfilenames': True,
            'paths': {
                'home': abs_download_dir,
                'temp': abs_temp_dir,
            },
            'extractor_args': {
                'youtube': {
                    'player_client': ['mweb', 'android', 'web'],
                }
            },
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        }

        ffmpeg_loc = find_ffmpeg_location()
        if ffmpeg_loc:
            ydl_opts['ffmpeg_location'] = ffmpeg_loc

        # Format selection
        if job.audio_only:
            ydl_opts['format'] = 'bestaudio/best'
            ydl_opts['postprocessors'] = [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '192',
            }]
        else:
            if job.format_id == 'best' or not job.format_id:
                ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            elif job.format_id in ['1080p', '720p', '480p', '360p']:
                height = job.format_id.replace('p', '')
                ydl_opts['format'] = f'bestvideo[height<={height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={height}]+bestaudio/best[height<={height}]/best'
            else:
                ydl_opts['format'] = f'{job.format_id}+bestaudio/best'

            # Ensure MP4 container output where appropriate
            ydl_opts['merge_output_format'] = 'mp4'

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            if job.cancel_event.is_set():
                job.status = DownloadStatusEnum.CANCELLED
                return
                
            info_dict = ydl.extract_info(job.url, download=True)
            
            if job.cancel_event.is_set():
                job.status = DownloadStatusEnum.CANCELLED
                return
                
            # Locate downloaded file
            final_filepath = ydl.prepare_filename(info_dict)
            if job.audio_only:
                base, _ = os.path.splitext(final_filepath)
                final_filepath = f"{base}.mp3"

            if os.path.exists(final_filepath):
                job.filepath = final_filepath
                job.filename = os.path.basename(final_filepath)
                job.filesize = os.path.getsize(final_filepath)
                job.status = DownloadStatusEnum.COMPLETED
                job.progress = 100.0
                job.speed = "0 B/s"
                job.eta = 0
            else:
                # Search download directory for file matching download_id
                matched_file = None
                for file_name in os.listdir(abs_download_dir):
                    if job.download_id in file_name:
                        matched_file = os.path.join(abs_download_dir, file_name)
                        break
                
                if matched_file and os.path.exists(matched_file):
                    job.filepath = matched_file
                    job.filename = os.path.basename(matched_file)
                    job.filesize = os.path.getsize(matched_file)
                    job.status = DownloadStatusEnum.COMPLETED
                    job.progress = 100.0
                else:
                    raise Exception("Downloaded file could not be located on disk")
                    
            job.updated_at = time.time()

    def cleanup_old_files(self):
        abs_download_dir = os.path.abspath(settings.DOWNLOAD_DIR)
        abs_temp_dir = os.path.abspath(settings.TEMP_DIR)
        retention_sec = settings.FILE_RETENTION_HOURS * 3600
        now = time.time()

        with self.lock:
            # Clean expired jobs
            expired_job_ids = []
            for download_id, job in self.jobs.items():
                if (now - job.updated_at) > retention_sec:
                    expired_job_ids.append(download_id)
                    if job.filepath and os.path.exists(job.filepath):
                        try:
                            os.remove(job.filepath)
                        except Exception as e:
                            logger.error(f"Failed to delete file {job.filepath}: {e}")
            for jid in expired_job_ids:
                del self.jobs[jid]

        # Clean directory files not tracked or older than retention
        for root_dir in [abs_download_dir, abs_temp_dir]:
            if os.path.exists(root_dir):
                for filename in os.listdir(root_dir):
                    filepath = os.path.join(root_dir, filename)
                    try:
                        if os.path.isfile(filepath):
                            if (now - os.path.getmtime(filepath)) > retention_sec:
                                os.remove(filepath)
                        elif os.path.isdir(filepath):
                            if (now - os.path.getmtime(filepath)) > retention_sec:
                                shutil.rmtree(filepath)
                    except Exception as e:
                        logger.error(f"Cleanup error on {filepath}: {e}")

download_manager = DownloadManager()

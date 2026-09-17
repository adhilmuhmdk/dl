import asyncio
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
from fastapi import APIRouter, HTTPException, status
import yt_dlp

from models import InfoRequest, InfoResponse, FormatOption

router = APIRouter()
executor = ThreadPoolExecutor(max_workers=5)

def validate_url(url: str) -> bool:
    try:
        result = urlparse(url)
        return all([result.scheme in ['http', 'https'], result.netloc])
    except Exception:
        return False

def _extract_ytdlp_info(url: str) -> dict:
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': False,
        'cachedir': False,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        return ydl.extract_info(url, download=False)

def format_filesize(size_bytes: float) -> str:
    if not size_bytes:
        return ""
    if size_bytes >= 1024 * 1024 * 1024:
        return f"~{size_bytes / (1024**3):.1f} GB"
    if size_bytes >= 1024 * 1024:
        return f"~{size_bytes / (1024**2):.1f} MB"
    return f"~{size_bytes / 1024:.0f} KB"

@router.post("/info", response_model=InfoResponse)
async def get_media_info(payload: InfoRequest):
    if not payload.url or not validate_url(payload.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format. Please provide a valid http:// or https:// URL."
        )

    loop = asyncio.get_running_loop()
    try:
        info_dict = await loop.run_in_executor(executor, _extract_ytdlp_info, payload.url)
    except Exception as e:
        error_msg = str(e)
        if "Unsupported URL" in error_msg:
            detail = "Unsupported URL or platform not recognized by yt-dlp."
        else:
            detail = f"Unable to extract media information: {error_msg.split(';') [0]}"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    if not info_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No media information found.")

    raw_formats = info_dict.get('formats', [])
    processed_formats: list[FormatOption] = []
    seen_keys = set()

    # Always include Best Available
    best_size = info_dict.get('filesize') or info_dict.get('filesize_approx')
    size_str = format_filesize(best_size)
    processed_formats.append(
        FormatOption(
            format_id="best",
            ext="mp4",
            resolution="Best Available",
            fps=info_dict.get('fps'),
            filesize=best_size,
            vcodec=info_dict.get('vcodec'),
            acodec=info_dict.get('acodec'),
            format_note="Maximum available video & audio quality",
            is_audio_only=False,
            label=f"Best Quality {f'({size_str})' if size_str else ''}".strip()
        )
    )

    # Standard resolution presets (1080p, 720p, 480p, 360p)
    available_heights = set()
    for f in raw_formats:
        h = f.get('height')
        if h and isinstance(h, int):
            available_heights.add(h)

    resolution_targets = [1080, 720, 480, 360]
    for target in resolution_targets:
        # Check if video has streams matching or close to this target height
        matching_stream = next((h for h in available_heights if h >= target - 50 and h <= target + 50), None)
        if matching_stream or any(h >= target for h in available_heights):
            res_key = f"{target}p"
            if res_key not in seen_keys:
                seen_keys.add(res_key)
                processed_formats.append(
                    FormatOption(
                        format_id=res_key,
                        ext="mp4",
                        resolution=f"{target}p",
                        fps=60 if target >= 1080 else 30,
                        format_note=f"{target}p MP4 Video",
                        is_audio_only=False,
                        label=f"{target}p Video (MP4)"
                    )
                )

    # Audio only option
    processed_formats.append(
        FormatOption(
            format_id="audio_only",
            ext="mp3",
            resolution="Audio Only",
            format_note="High quality MP3 audio stream",
            is_audio_only=True,
            label="Audio Only (MP3)"
        )
    )

    # Return normalized info response
    return InfoResponse(
        id=str(info_dict.get('id', 'media')),
        title=info_dict.get('title', 'Untitled Media'),
        thumbnail=info_dict.get('thumbnail'),
        uploader=info_dict.get('uploader') or info_dict.get('channel') or info_dict.get('extractor'),
        duration=info_dict.get('duration'),
        upload_date=info_dict.get('upload_date'),
        formats=processed_formats,
        webpage_url=info_dict.get('webpage_url') or payload.url
    )

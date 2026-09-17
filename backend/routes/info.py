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
    base_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': False,
        'cachedir': False,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    }

    # Browser cookie auto-detection loop to bypass YouTube SABR bot checks & unlock 8K/4K/1080p formats
    browsers = ['brave', 'chrome', 'edge', 'firefox', 'opera', None]
    for browser in browsers:
        opts = dict(base_opts)
        if browser:
            opts['cookiesfrombrowser'] = (browser,)
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
                if info and info.get('formats'):
                    heights = [f.get('height') for f in info.get('formats', []) if f.get('height')]
                    if heights and max(heights) > 360:
                        return info
                    if info and not heights:
                        return info
        except Exception:
            continue

    with yt_dlp.YoutubeDL(base_opts) as ydl:
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

    # Extract all available heights and stream specs from raw_formats
    height_map = {}
    for f in raw_formats:
        h = f.get('height')
        if h and isinstance(h, int) and h > 0:
            curr_size = f.get('filesize') or f.get('filesize_approx') or 0
            existing_size = (height_map[h].get('filesize') or height_map[h].get('filesize_approx') or 0) if h in height_map else -1
            if h not in height_map or curr_size >= existing_size:
                height_map[h] = f

    resolution_targets = [
        (4320, "4320p (8K Ultra HD)"),
        (2160, "2160p (4K Ultra HD)"),
        (1440, "1440p (2K Quad HD)"),
        (1080, "1080p Full HD"),
        (720, "720p HD"),
        (480, "480p SD"),
        (360, "360p"),
        (240, "240p"),
        (144, "144p"),
    ]

    for target_height, title_label in resolution_targets:
        matching_height = next((h for h in height_map.keys() if abs(h - target_height) <= 30), None)
        if matching_height:
            res_key = f"{target_height}p"
            if res_key not in seen_keys:
                seen_keys.add(res_key)
                stream_info = height_map[matching_height]
                stream_fps = stream_info.get('fps')
                stream_size = stream_info.get('filesize') or stream_info.get('filesize_approx')
                size_label = format_filesize(stream_size)

                fps_str = f" {int(stream_fps)}fps" if stream_fps and stream_fps > 30 else ""
                res_title = f"{title_label}{fps_str}"

                processed_formats.append(
                    FormatOption(
                        format_id=res_key,
                        ext="mp4",
                        resolution=res_title,
                        fps=stream_fps or 30,
                        filesize=stream_size,
                        vcodec=stream_info.get('vcodec'),
                        acodec=stream_info.get('acodec'),
                        format_note=f"{res_title} MP4 Video",
                        is_audio_only=False,
                        label=f"{res_title} {f'({size_label})' if size_label else ''}".strip()
                    )
                )

    # Audio only option
    processed_formats.append(
        FormatOption(
            format_id="audio_only",
            ext="mp3",
            resolution="Audio Only (MP3)",
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

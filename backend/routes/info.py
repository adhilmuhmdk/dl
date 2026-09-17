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
        'js_runtimes': {'node': {}},
        'remote_components': ['ejs:github'],
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'web'],
            }
        },
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

    # Dynamically extract ALL available video heights from stream formats
    height_map = {}
    for f in raw_formats:
        vcodec = f.get('vcodec', 'none')
        h = f.get('height')
        if h and isinstance(h, int) and h > 0 and vcodec != 'none':
            curr_size = f.get('filesize') or f.get('filesize_approx') or 0
            existing_size = (height_map[h].get('filesize') or height_map[h].get('filesize_approx') or 0) if h in height_map else -1
            if h not in height_map or curr_size >= existing_size:
                height_map[h] = f

    # If no video-only streams found, fallback to all formats with height > 0
    if not height_map:
        for f in raw_formats:
            h = f.get('height')
            if h and isinstance(h, int) and h > 0:
                if h not in height_map:
                    height_map[h] = f

    # Sort available heights descending (e.g. 2160p, 1440p, 1080p, 720p, 480p, 360p, 240p, 144p)
    sorted_heights = sorted(height_map.keys(), reverse=True)
    for h in sorted_heights:
        res_key = f"{h}p"
        if res_key not in seen_keys:
            seen_keys.add(res_key)
            stream_info = height_map[h]
            stream_fps = stream_info.get('fps')
            stream_size = stream_info.get('filesize') or stream_info.get('filesize_approx')
            size_label = format_filesize(stream_size)

            label_suffix = ""
            if h >= 2160:
                label_suffix = " (4K Ultra HD)"
            elif h >= 1440:
                label_suffix = " (2K Quad HD)"
            elif h >= 1080:
                label_suffix = " (Full HD)"
            elif h >= 720:
                label_suffix = " (HD)"

            fps_str = f" {int(stream_fps)}fps" if stream_fps and stream_fps > 30 else ""
            res_title = f"{h}p{fps_str}{label_suffix}"

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

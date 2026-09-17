from enum import Enum
from typing import List, Optional, Union
from pydantic import BaseModel, Field, HttpUrl

class DownloadStatusEnum(str, Enum):
    QUEUED = "queued"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class FormatOption(BaseModel):
    format_id: str
    ext: str
    resolution: str
    fps: Optional[float] = None
    filesize: Optional[Union[int, float]] = None
    filesize_approx: Optional[Union[int, float]] = None
    vcodec: Optional[str] = None
    acodec: Optional[str] = None
    format_note: Optional[str] = None
    is_audio_only: bool = False
    label: str

class InfoRequest(BaseModel):
    url: str

class InfoResponse(BaseModel):
    id: str
    title: str
    thumbnail: Optional[str] = None
    uploader: Optional[str] = None
    duration: Optional[float] = None
    upload_date: Optional[str] = None
    formats: List[FormatOption] = []
    webpage_url: Optional[str] = None

class DownloadRequest(BaseModel):
    url: str
    format_id: Optional[str] = "best"
    audio_only: Optional[bool] = False

class DownloadResponse(BaseModel):
    download_id: str

class DownloadStatusResponse(BaseModel):
    download_id: str
    status: DownloadStatusEnum
    progress: float = 0.0
    speed: Optional[str] = "0 B/s"
    eta: Optional[Union[int, float]] = 0
    filename: Optional[str] = None
    filesize: Optional[Union[int, float]] = None
    error: Optional[str] = None

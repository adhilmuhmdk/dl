import os
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from config import settings
from downloader import download_manager
from models import (
    DownloadRequest,
    DownloadResponse,
    DownloadStatusResponse,
    DownloadStatusEnum
)
from routes.info import validate_url

router = APIRouter()

@router.post("/download", response_model=DownloadResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_download(payload: DownloadRequest):
    if not payload.url or not validate_url(payload.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL format provided."
        )

    job = download_manager.create_job(
        url=payload.url,
        format_id=payload.format_id or "best",
        audio_only=payload.audio_only or False
    )
    return DownloadResponse(download_id=job.download_id)

@router.get("/download/{download_id}/status", response_model=DownloadStatusResponse)
async def get_download_status(download_id: str):
    job = download_manager.get_job(download_id)
    if not job:
        return DownloadStatusResponse(
            download_id=download_id,
            status=DownloadStatusEnum.FAILED,
            progress=0.0,
            speed="0 B/s",
            eta=0,
            error="Download job session expired or server restarted"
        )

    return DownloadStatusResponse(
        download_id=job.download_id,
        status=job.status,
        progress=job.progress,
        speed=job.speed,
        eta=job.eta,
        filename=job.filename,
        filesize=job.filesize,
        error=job.error
    )

@router.get("/download/{download_id}/file")
async def get_download_file(download_id: str):
    job = download_manager.get_job(download_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Download job {download_id} not found."
        )

    if job.status != DownloadStatusEnum.COMPLETED or not job.filepath:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Download job is not ready for retrieval. Current status: {job.status.value}"
        )

    abs_download_dir = os.path.abspath(settings.DOWNLOAD_DIR)
    abs_filepath = os.path.abspath(job.filepath)

    # Security check: path traversal prevention
    if not abs_filepath.startswith(abs_download_dir):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Path traversal detected."
        )

    if not os.path.exists(abs_filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File has been cleaned up or deleted from server storage."
        )

    return FileResponse(
        path=abs_filepath,
        filename=job.filename or os.path.basename(abs_filepath),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{job.filename or os.path.basename(abs_filepath)}"'
        }
    )

@router.post("/download/{download_id}/cancel")
async def cancel_download(download_id: str):
    job = download_manager.get_job(download_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Download job {download_id} not found."
        )

    success = download_manager.cancel_job(download_id)
    if not success:
        return {
            "download_id": download_id,
            "cancelled": False,
            "message": f"Job could not be cancelled (status: {job.status.value})"
        }

    return {
        "download_id": download_id,
        "cancelled": True,
        "message": "Download job successfully cancelled."
    }

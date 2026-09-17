import pytest
from fastapi.testclient import TestClient
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from routes.info import validate_url
from downloader import download_manager
from config import settings

client = TestClient(app)

def test_url_validation():
    assert validate_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ") is True
    assert validate_url("http://vimeo.com/123456") is True
    assert validate_url("invalid-url") is False
    assert validate_url("ftp://example.com/file") is False
    assert validate_url("") is False

def test_info_invalid_url():
    response = client.post("/info", json={"url": "not-a-valid-url"})
    assert response.status_code == 400
    assert "Invalid URL" in response.json()["detail"]

def test_create_download_and_status():
    # Test valid download job creation
    response = client.post("/download", json={
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "format_id": "best",
        "audio_only": False
    })
    assert response.status_code == 202
    data = response.json()
    assert "download_id" in data
    download_id = data["download_id"]

    # Check status endpoint
    status_resp = client.get(f"/download/{download_id}/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert status_data["download_id"] == download_id
    assert status_data["status"] in ["queued", "downloading", "processing", "completed", "failed", "cancelled"]

def test_status_nonexistent():
    response = client.get("/download/non-existent-id/status")
    assert response.status_code == 404

def test_cancel_job():
    # Create a job first
    response = client.post("/download", json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"})
    download_id = response.json()["download_id"]

    # Cancel it
    cancel_resp = client.post(f"/download/{download_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["cancelled"] is True

    # Check status is CANCELLED
    status_resp = client.get(f"/download/{download_id}/status")
    assert status_resp.json()["status"] == "cancelled"

def test_path_traversal_protection():
    # Manually create a mock job with suspicious filepath outside download dir
    job = download_manager.create_job("https://example.com/video")
    job.status = "completed"
    job.filepath = os.path.abspath(os.path.join(settings.DOWNLOAD_DIR, "..", "secret.txt"))

    response = client.get(f"/download/{job.download_id}/file")
    assert response.status_code in [403, 404]

# MediaFetch 🚀

**MediaFetch** is a production-ready, self-hosted media downloader application designed to analyze and download media from supported URLs. It pairs a modern **Next.js** frontend with a high-performance **FastAPI** backend that runs **yt-dlp** and **FFmpeg** on your local machine or server.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│           MediaFetch Frontend           │
│        (Next.js + Tailwind CSS)         │
│     Deployed on Vercel Free Tier        │
└────────────────────┬────────────────────┘
                     │  HTTP / REST API
                     │  Configurable NEXT_PUBLIC_API_BASE_URL
                     ▼
┌─────────────────────────────────────────┐
│            FastAPI Backend              │
│       (Runs on your local PC/Server)    │
│     yt-dlp + FFmpeg Processing Engine   │
└─────────────────────────────────────────┘
```

### Why this architecture?
1. **Vercel Serverless Limits**: Vercel serverless functions have strict execution timeouts and cannot run long-running `yt-dlp` commands or `FFmpeg` binary merging processes.
2. **Local Machine Processing**: Your local machine/server handles video stream processing, audio extraction, and storage, keeping your serverless frontend lightweight and fast.
3. **Flexible API Connection**: The frontend connects dynamically to your backend URL via environment variables (`NEXT_PUBLIC_API_BASE_URL`) or in-app setting controls.

---

## ✨ Features

- 🔍 **Metadata Analysis**: Extract title, thumbnail, channel/uploader, duration, upload date, and format options without downloading.
- 🎥 **Quality & Format Selection**: Best available, 1080p, 720p, 480p, 360p, or high-quality Audio-Only (MP3).
- ⚡ **Real-Time Progress Tracking**: Live status updates for progress %, download speed, ETA countdown, and status badges.
- 🛑 **Job Cancellation**: Safely cancel active download tasks.
- 💾 **Local History**: Browsing history stored strictly in browser `localStorage` (media files are never stored in localStorage).
- 🛡️ **Security Built-In**: Path traversal protection, URL sanitization, rate limiting, and optional API key authentication (`X-API-Key`).
- 🧹 **Automatic Cleanup**: Scheduled retention worker deletes temp and completed files older than configured retention hours.
- 🐳 **Docker Ready**: Pre-built Docker container containing Python, FastAPI, yt-dlp, and FFmpeg.

---

## 🛠️ Project Structure

```
/
├── frontend/                 # Next.js App Router (TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── app/              # Next.js Pages & Layout
│   │   ├── components/       # UI Components (Header, Hero, UrlInput, MediaInfoCard, FormatSelector, DownloadProgress, DownloadHistory, SettingsModal, Toast)
│   │   ├── lib/              # API Client, TypeScript Types, Storage & URL Utilities
│   │   └── __tests__/        # Frontend Unit Tests
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env.example
├── backend/                  # FastAPI Python Backend
│   ├── routes/
│   │   ├── info.py           # POST /info endpoint
│   │   └── downloads.py      # POST /download, GET /status, GET /file, POST /cancel
│   ├── main.py               # FastAPI App & Middleware
│   ├── config.py             # App Settings & Environment Parsing
│   ├── models.py             # Pydantic Schemas
│   ├── downloader.py         # Download Manager, yt-dlp hooks, Threading & Cancellation
│   ├── Dockerfile            # Docker definition with FFmpeg
│   ├── requirements.txt      # Python Dependencies
│   └── tests/                # Pytest Test Suite
├── docker-compose.yml        # Docker Compose configuration
└── README.md                 # Complete Project Documentation
```

---

## 💻 Local Setup Guide (Windows PC)

Follow these exact steps to run the backend on a Windows computer:

### Step 1: Install Python 3.10+ & FFmpeg
1. Download and install **Python 3.10 or newer** from [python.org](https://www.python.org/downloads/). Ensure **"Add Python to PATH"** is checked.
2. Install **FFmpeg**:
   - Using Windows Package Manager (PowerShell):
     ```powershell
     winget install "FFmpeg (Essentials Build)"
     ```
   - Or download FFmpeg manually from [ffmpeg.org](https://ffmpeg.org/download.html) and add `ffmpeg/bin` to your System PATH environment variables.

### Step 2: Set Up Backend
Open PowerShell or Command Prompt:

```powershell
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### Step 3: Verify Tooling
Verify that all core binaries are correctly installed and accessible:

```powershell
python --version
ffmpeg -version
yt-dlp --version
```

### Step 4: Run Backend Server
Start the Uvicorn FastAPI server on port 8000:

```powershell
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
The API documentation (Swagger) will be accessible at `http://localhost:8000/docs`.

### Step 5: Start Frontend Locally
Open a new terminal window:

```powershell
cd frontend

# Install Node dependencies
npm install

# Create local environment configuration
copy .env.example .env.local

# Run Next.js development server
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## 🐳 Docker Deployment

To run the backend service using Docker Compose:

```bash
docker-compose up -d --build
```

This starts the FastAPI backend inside a container with `yt-dlp` and `FFmpeg` pre-configured, mapping ports `8000:8000` and mounting local `./downloads` and `./temp` directories.

---

## ☁️ Frontend Deployment to Vercel

1. Push your repository to GitHub / GitLab.
2. Log into [Vercel](https://vercel.com/) and click **"Add New Project"**.
3. Select the `frontend` folder as the Root Directory.
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_BASE_URL`: Set to your public backend URL (e.g., `https://your-domain.com` or Ngrok / Cloudflare Tunnel URL).
5. Click **Deploy**.

> **Note**: If your local backend is behind a home router, expose port `8000` using Cloudflare Tunnels (`cloudflared tunnel --url http://localhost:8000`) or Ngrok (`ngrok http 8000`) to give Vercel frontend access.

---

## ⚙️ Backend Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `HOST` | `0.0.0.0` | Host address to bind |
| `PORT` | `8000` | Port to expose |
| `DOWNLOAD_DIR` | `./downloads` | Directory where downloaded files are saved |
| `TEMP_DIR` | `./temp` | Temporary processing folder for FFmpeg |
| `MAX_CONCURRENT_DOWNLOADS` | `2` | Maximum concurrent background download jobs |
| `MAX_DOWNLOAD_SIZE_MB` | `2048` | Max allowed media download size in megabytes |
| `FILE_RETENTION_HOURS` | `6` | Hours before completed files are automatically cleaned up |
| `ALLOWED_ORIGINS` | `http://localhost:3000,*` | Allowed CORS origins (comma separated) |
| `API_KEY` | *(Optional)* | Secret API Key required in `X-API-Key` header if set |

---

## 📡 API Documentation & Examples

FastAPI provides automatic interactive Swagger docs at `http://localhost:8000/docs`.

### 1. Extract Media Metadata (`POST /info`)

**Request:**
```json
POST /info
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response:**
```json
{
  "id": "dQw4w9WgXcQ",
  "title": "Rick Astley - Never Gonna Give You Up",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "uploader": "Rick Astley",
  "duration": 213,
  "upload_date": "20091025",
  "formats": [
    {
      "format_id": "best",
      "ext": "mp4",
      "resolution": "Best Available",
      "is_audio_only": false,
      "label": "Best Quality (~45.2 MB)"
    },
    {
      "format_id": "1080p",
      "ext": "mp4",
      "resolution": "1080p",
      "is_audio_only": false,
      "label": "1080p Video (MP4)"
    },
    {
      "format_id": "audio_only",
      "ext": "mp3",
      "resolution": "Audio Only",
      "is_audio_only": true,
      "label": "Audio Only (MP3)"
    }
  ]
}
```

---

### 2. Initiate Download Job (`POST /download`)

**Request:**
```json
POST /download
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "format_id": "1080p",
  "audio_only": false
}
```

**Response:**
```json
{
  "download_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

---

### 3. Check Download Status (`GET /download/{download_id}/status`)

**Response:**
```json
{
  "download_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "status": "downloading",
  "progress": 45.2,
  "speed": "3.4 MiB/s",
  "eta": 15,
  "filename": "Rick_Astley_Never_Gonna_Give_You_Up_9b1deb4d.mp4",
  "filesize": 47392810,
  "error": null
}
```

---

### 4. Download Completed File (`GET /download/{download_id}/file`)

Returns binary file stream with header `Content-Disposition: attachment; filename="video.mp4"`.

---

### 5. Cancel Active Download (`POST /download/{download_id}/cancel`)

**Response:**
```json
{
  "download_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "cancelled": true,
  "message": "Download job successfully cancelled."
}
```

---

## 🧪 Testing

### Backend Unit & Integration Tests
Run pytest in the backend directory:

```bash
cd backend
pytest tests/
```

### Frontend Unit Tests
Run Jest tests in the frontend directory:

```bash
cd frontend
npm test
```

---

## 🛡️ Security & Storage Management

- **Path Traversal Protection**: Endpoint `/download/{id}/file` explicitly resolves target file canonical paths using `os.path.abspath` and asserts they reside strictly within `DOWNLOAD_DIR`.
- **Shell Injection Prevention**: All `yt-dlp` operations are executed directly via Python library function calls (`yt_dlp.YoutubeDL`), avoiding shell string concatenations.
- **Automatic File Retention Cleanup**: Background worker periodically deletes completed/canceled media files older than `FILE_RETENTION_HOURS` to prevent disk saturation.
- **Legal Compliance Notice**: This application is intended solely for downloading content you own or have permission to download.

---

## 📄 License

MIT License. Built with ❤️ using Next.js, FastAPI, yt-dlp, and FFmpeg.

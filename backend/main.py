import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from downloader import download_manager
from routes import info, downloads

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mediafetch.main")

async def periodic_cleanup():
    while True:
        try:
            download_manager.cleanup_old_files()
        except Exception as e:
            logger.error(f"Error during periodic cleanup: {e}")
        await asyncio.sleep(600)  # Clean up every 10 minutes

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up MediaFetch backend service...")
    cleanup_task = asyncio.create_task(periodic_cleanup())
    yield
    # Shutdown
    logger.info("Shutting down MediaFetch backend service...")
    cleanup_task.cancel()

app = FastAPI(
    title="MediaFetch API",
    description="Self-hosted yt-dlp & FFmpeg media downloader API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional API Key Middleware
@app.middleware("http")
async def api_key_auth_middleware(request: Request, call_next):
    if settings.API_KEY:
        # Exclude root, docs, and openapi schema from auth
        if request.url.path in ["/", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)

        # Check API key header
        provided_key = request.headers.get("X-API-Key") or request.query_params.get("api_key")
        if not provided_key or provided_key != settings.API_KEY:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Unauthorized: Invalid or missing API key"}
            )
    return await call_next(request)

# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred while processing your request."}
    )

# Include Routers
app.include_router(info.router, tags=["Media Information"])
app.include_router(downloads.router, tags=["Download Manager"])

@app.get("/", tags=["Health Check"])
async def root():
    return {
        "app": "MediaFetch API",
        "status": "online",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run("main:app", host=settings.HOST, port=port, reload=True)

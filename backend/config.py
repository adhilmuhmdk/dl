import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DOWNLOAD_DIR: str = "./downloads"
    TEMP_DIR: str = "./temp"
    MAX_CONCURRENT_DOWNLOADS: int = 2
    MAX_DOWNLOAD_SIZE_MB: int = 2048
    FILE_RETENTION_HOURS: float = 6.0
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,*"
    API_KEY: Optional[str] = None
    RATE_LIMIT_PER_MINUTE: int = 60

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return ["*"]
        if isinstance(self.ALLOWED_ORIGINS, str):
            return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
        return self.ALLOWED_ORIGINS

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

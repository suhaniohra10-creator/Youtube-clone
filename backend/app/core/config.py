from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_CORS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"


def parse_cors_origins(raw: str) -> list[str]:
    origins = [item.strip() for item in raw.split(",") if item.strip()]
    if not origins:
        raise ValueError("CORS_ORIGINS must include at least one origin")
    if any(origin == "*" for origin in origins):
        raise ValueError("Wildcard CORS origins are not allowed")
    return origins


class Settings(BaseSettings):
    app_name: str = "YouTube Clone API"
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "youtubedb"
    secret_key: str = "change-this-secret-key"
    access_token_expire_minutes: int = 30
    google_client_id: str = ""
    youtube_api_key: str = ""
    max_upload_size_mb: int = 500
    cors_origins: str = DEFAULT_CORS
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    def cors_origin_list(self) -> list[str]:
        return parse_cors_origins(self.cors_origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
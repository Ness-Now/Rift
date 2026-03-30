from functools import lru_cache
from os import getenv
from pathlib import Path

from pydantic import BaseModel


class Settings(BaseModel):
    environment: str = "development"
    app_version: str = "0.1.0"
    auth_secret_key: str = "change-me-for-local-dev"
    auth_token_ttl_seconds: int = 604800
    web_origin: str = "http://localhost:3000"
    riot_api_key: str = ""
    riot_api_timeout_seconds: int = 10
    riot_api_max_retries: int = 3
    riot_api_retry_backoff_seconds: float = 1.0
    openai_api_key: str = ""
    openai_report_model: str = "gpt-5-mini"
    openai_chat_model: str = "gpt-5-mini"
    openai_api_timeout_seconds: int = 30
    data_directory: Path = Path(__file__).resolve().parents[3] / "data"
    sqlite_database_path: Path = Path(__file__).resolve().parents[3] / "data" / "rift.db"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        environment=getenv("API_ENVIRONMENT", "development"),
        app_version=getenv("APP_VERSION", "0.1.0"),
        auth_secret_key=getenv("AUTH_SECRET_KEY", "change-me-for-local-dev"),
        auth_token_ttl_seconds=int(getenv("AUTH_TOKEN_TTL_SECONDS", "604800")),
        web_origin=getenv("WEB_ORIGIN", "http://localhost:3000"),
        riot_api_key=getenv("RIOT_API_KEY", ""),
        riot_api_timeout_seconds=int(getenv("RIOT_API_TIMEOUT_SECONDS", "10")),
        riot_api_max_retries=int(getenv("RIOT_API_MAX_RETRIES", "3")),
        riot_api_retry_backoff_seconds=float(getenv("RIOT_API_RETRY_BACKOFF_SECONDS", "1.0")),
        openai_api_key=getenv("OPENAI_API_KEY", ""),
        openai_report_model=getenv("OPENAI_REPORT_MODEL", "gpt-5-mini"),
        openai_chat_model=getenv("OPENAI_CHAT_MODEL", "gpt-5-mini"),
        openai_api_timeout_seconds=int(getenv("OPENAI_API_TIMEOUT_SECONDS", "30"))
    )

"""
Centralized configuration using pydantic-settings.
Loads from .env automatically, validates types, fails fast on missing required vars.
"""
from functools import lru_cache
from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Environment ─────────────────────────────────────
    ENV: Literal["dev", "staging", "production"] = "dev"
    DEBUG: bool = True
    APP_NAME: str = "Luxe Capital API"
    VERSION: str = "2.0.0"

    # ─── External APIs ───────────────────────────────────
    # FinancialModelingPrep (required in prod)
    FMP_API_KEY: str = Field(default="", description="FinancialModelingPrep API key")
    FMP_BASE_URL: str = "https://financialmodelingprep.com/api/v3"

    # OpenAI (optional, for AI Analysis)
    OPENAI_API_KEY: str = Field(default="", description="OpenAI key for AI features")
    OPENAI_MODEL: str = "gpt-4o-mini"

    # ─── Security ────────────────────────────────────────
    # JWT for user auth (Phase 2)
    JWT_SECRET: str = Field(default="change-me-in-production-min-32-chars-please")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24  # 24 hours

    # Internal API key for server-to-server (Next.js → FastAPI)
    INTERNAL_API_KEY: str = Field(
        default="dev-internal-key-change-me",
        description="Pre-shared key for Next.js backend to call FastAPI",
    )

    # ─── CORS ────────────────────────────────────────────
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ])

    # ─── Redis (Caching) ─────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CACHE_TTL_SECONDS: int = 60 * 60 * 24  # 24 hours
    CACHE_TTL_AI: int = 60 * 60 * 6  # 6 hours for AI reports

    # ─── Rate Limiting ───────────────────────────────────
    RATELIMIT_ANON: str = "20/minute"  # for unauthenticated
    RATELIMIT_FREE: str = "60/minute"  # for free tier
    RATELIMIT_PRO: str = "300/minute"  # for pro tier

    # ─── Database (Phase 2) ──────────────────────────────
    DATABASE_URL: str = "sqlite:///./luxe.db"  # default for dev; PG in prod

    # ─── Logging ─────────────────────────────────────────
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    LOG_FORMAT: Literal["json", "text"] = "json"

    # ─── Business Tiers ──────────────────────────────────
    TIER_FREE_DAILY_REQUESTS: int = 50
    TIER_PRO_DAILY_REQUESTS: int = 1000
    TIER_PRO_PRICE_USD: float = 19.0

    # ─── Validation ──────────────────────────────────────
    @field_validator("JWT_SECRET")
    @classmethod
    def jwt_secret_strong(cls, v: str, info) -> str:
        env = info.data.get("ENV", "dev")
        if env == "production" and len(v) < 32:
            raise ValueError("JWT_SECRET must be at least 32 chars in production")
        return v

    @field_validator("FMP_API_KEY")
    @classmethod
    def fmp_required_in_prod(cls, v: str, info) -> str:
        env = info.data.get("ENV", "dev")
        if env == "production" and not v:
            raise ValueError("FMP_API_KEY is required in production")
        return v

    @property
    def is_production(self) -> bool:
        return self.ENV == "production"


@lru_cache
def get_settings() -> Settings:
    """Returns cached settings instance. Use as FastAPI dependency."""
    return Settings()


# Convenience for non-DI usage
settings = get_settings()

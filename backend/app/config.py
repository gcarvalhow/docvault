from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env.local", env_file_encoding="utf-8")
    environment: Literal["development", "staging", "production"] = "development"

    database_url: str

    jwt_secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    allowed_origins: list[str] = ["http://localhost:3000"]

settings = Settings()  # type: ignore[call-arg]
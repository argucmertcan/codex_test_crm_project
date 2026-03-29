from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    groq_api_key: str | None = os.getenv("GROQ_API_KEY")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    newsapi_key: str | None = os.getenv("NEWSAPI_KEY")
    request_timeout_sec: int = int(os.getenv("REQUEST_TIMEOUT_SEC", "12"))


settings = Settings()

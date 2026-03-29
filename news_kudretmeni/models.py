from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class NewsItem:
    id: str
    title: str
    summary: str
    url: str
    source: str
    published_at: datetime | None
    language: str | None = None
    category: str = "Genel"


@dataclass
class NewsCluster:
    canonical_title: str
    category: str
    items: list[NewsItem] = field(default_factory=list)
    turkish_summary: str = ""
    consistency_analysis: str = ""
    reliability_score: int = 50

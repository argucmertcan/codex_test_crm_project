from __future__ import annotations

from datetime import datetime
from email.utils import parsedate_to_datetime
from typing import Iterable

import feedparser
import requests
from dateutil import parser as dateparser

from config import settings
from models import NewsItem

RSS_FEEDS = {
    "Reuters World": "https://www.reutersagency.com/feed/?best-topics=world&post_type=best",
    "BBC World": "http://feeds.bbci.co.uk/news/world/rss.xml",
    "AP Top News": "https://apnews.com/hub/ap-top-news?output=rss",
    "DW Top Stories": "https://rss.dw.com/rdf/rss-en-top",
    "Al Jazeera": "https://www.aljazeera.com/xml/rss/all.xml",
}


def _parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return dateparser.parse(value)
    except Exception:
        pass
    try:
        return parsedate_to_datetime(value)
    except Exception:
        return None


def fetch_rss(limit_per_feed: int = 20) -> list[NewsItem]:
    items: list[NewsItem] = []
    for source, feed_url in RSS_FEEDS.items():
        parsed = feedparser.parse(feed_url)
        for idx, entry in enumerate(parsed.entries[:limit_per_feed]):
            items.append(
                NewsItem(
                    id=f"rss-{source}-{idx}",
                    title=(entry.get("title") or "").strip(),
                    summary=(entry.get("summary") or entry.get("description") or "").strip(),
                    url=(entry.get("link") or "").strip(),
                    source=source,
                    published_at=_parse_datetime(entry.get("published") or entry.get("updated")),
                    language=entry.get("language"),
                )
            )
    return items


def fetch_newsapi(query: str = "breaking", page_size: int = 30) -> list[NewsItem]:
    if not settings.newsapi_key:
        return []

    response = requests.get(
        "https://newsapi.org/v2/everything",
        params={
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": page_size,
            "apiKey": settings.newsapi_key,
        },
        timeout=settings.request_timeout_sec,
    )
    response.raise_for_status()

    data = response.json()
    items: list[NewsItem] = []
    for idx, article in enumerate(data.get("articles", [])):
        items.append(
            NewsItem(
                id=f"newsapi-{idx}",
                title=(article.get("title") or "").strip(),
                summary=(article.get("description") or article.get("content") or "").strip(),
                url=(article.get("url") or "").strip(),
                source=(article.get("source") or {}).get("name") or "NewsAPI",
                published_at=_parse_datetime(article.get("publishedAt")),
                language="en",
            )
        )
    return items


def fetch_all_news(include_newsapi: bool = True) -> list[NewsItem]:
    raw: Iterable[NewsItem] = fetch_rss()
    if include_newsapi:
        raw = [*raw, *fetch_newsapi()]

    unique: dict[str, NewsItem] = {}
    for item in raw:
        if not item.title or not item.url:
            continue
        unique[item.url] = item

    return list(unique.values())

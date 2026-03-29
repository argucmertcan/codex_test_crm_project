from __future__ import annotations

from collections import defaultdict

from rapidfuzz.fuzz import token_set_ratio

from groq_client import GroqUnavailableError, analyze_consistency, translate_and_summarize_turkish
from models import NewsCluster, NewsItem

CATEGORY_RULES = {
    "Siyaset": ["election", "government", "minister", "parliament", "president", "policy"],
    "Ekonomi": ["market", "inflation", "economy", "bank", "finance", "stock", "oil"],
    "Teknoloji": ["ai", "technology", "software", "cyber", "chip", "startup"],
    "Sağlık": ["health", "hospital", "vaccine", "virus", "disease", "medical"],
    "Spor": ["football", "soccer", "nba", "fifa", "olympic", "tennis"],
    "Çatışma/Güvenlik": ["war", "attack", "military", "missile", "defense", "conflict"],
}


def categorize(item: NewsItem) -> str:
    text = f"{item.title} {item.summary}".lower()
    for category, keywords in CATEGORY_RULES.items():
        if any(k in text for k in keywords):
            return category
    return "Genel"


def build_clusters(items: list[NewsItem], threshold: int = 76) -> list[NewsCluster]:
    for item in items:
        item.category = categorize(item)

    clusters: list[NewsCluster] = []
    for item in sorted(
        items,
        key=lambda x: x.published_at.timestamp() if x.published_at else 0,
        reverse=True,
    ):
        matched = None
        for cluster in clusters:
            if token_set_ratio(item.title, cluster.canonical_title) >= threshold:
                matched = cluster
                break

        if matched:
            matched.items.append(item)
        else:
            clusters.append(
                NewsCluster(
                    canonical_title=item.title,
                    category=item.category,
                    items=[item],
                )
            )
    return clusters


def enrich_clusters(clusters: list[NewsCluster]) -> list[NewsCluster]:
    for cluster in clusters:
        lead = cluster.items[0]
        try:
            cluster.turkish_summary = translate_and_summarize_turkish(lead.title, lead.summary)
        except GroqUnavailableError:
            cluster.turkish_summary = "GROQ_API_KEY bulunamadı; Türkçe özet üretilemedi."

        if len(cluster.items) > 1:
            snippets = [
                {
                    "source": item.source,
                    "title": item.title,
                    "summary": item.summary[:400],
                    "url": item.url,
                }
                for item in cluster.items[:6]
            ]
            try:
                analysis, score = analyze_consistency(snippets)
                cluster.consistency_analysis = analysis
                cluster.reliability_score = score
            except GroqUnavailableError:
                cluster.consistency_analysis = (
                    "GROQ_API_KEY bulunamadı; kaynaklar arası tutarlılık analizi yapılamadı."
                )
        else:
            cluster.consistency_analysis = (
                "Bu olay için tek kaynak bulunduğu için doğruluk analizi sınırlı."
            )
            cluster.reliability_score = 45
    return clusters


def clusters_by_category(clusters: list[NewsCluster]) -> dict[str, list[NewsCluster]]:
    grouped: dict[str, list[NewsCluster]] = defaultdict(list)
    for cluster in clusters:
        grouped[cluster.category].append(cluster)
    return dict(grouped)

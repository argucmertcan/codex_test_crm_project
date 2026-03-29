from __future__ import annotations

import json

import requests

from config import settings

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqUnavailableError(RuntimeError):
    """Raised when GROQ_API_KEY is missing."""


def _call_groq(system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str:
    if not settings.groq_api_key:
        raise GroqUnavailableError("GROQ_API_KEY tanımlı değil.")

    response = requests.post(
        GROQ_API_URL,
        headers={
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.groq_model,
            "temperature": temperature,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        },
        timeout=settings.request_timeout_sec,
    )
    response.raise_for_status()
    payload = response.json()
    return payload["choices"][0]["message"]["content"]


def translate_and_summarize_turkish(title: str, summary: str) -> str:
    prompt = f"Başlık: {title}\n\nÖzet: {summary}"
    return _call_groq(
        system_prompt=(
            "Sen deneyimli bir editörsün. Verilen haberi Türkçeye çevir, "
            "5-6 cümle ile net ve tarafsız özetle."
        ),
        user_prompt=prompt,
        temperature=0.1,
    )


def analyze_consistency(news_snippets: list[dict[str, str]]) -> tuple[str, int]:
    prompt = json.dumps(news_snippets, ensure_ascii=False, indent=2)
    raw = _call_groq(
        system_prompt=(
            "Aynı olaya ait farklı kaynaklardan gelen haber parçalarını karşılaştır. "
            "Önce 4-6 cümle ile benzerlik/farkları yaz. Son satırda sadece şu formatı kullan: SCORE=<0-100>. "
            "Skor, haberin kaynaklar arası tutarlılığına dayalı güven puanı olsun."
        ),
        user_prompt=prompt,
        temperature=0.0,
    )
    score = 50
    for line in raw.splitlines()[::-1]:
        line = line.strip()
        if line.startswith("SCORE="):
            try:
                score = max(0, min(100, int(line.replace("SCORE=", "").strip())))
            except ValueError:
                score = 50
            break

    clean = "\n".join(
        l for l in raw.splitlines() if not l.strip().startswith("SCORE=")
    ).strip()
    return clean, score

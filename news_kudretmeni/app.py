from __future__ import annotations

from datetime import datetime

import streamlit as st

from pipeline import build_clusters, clusters_by_category, enrich_clusters
from sources import fetch_all_news

st.set_page_config(page_title="Kudretmen Haber Asistanı", layout="wide")
st.title("🌍 Kudretmen - Son Dakika Haber Toplayıcı")
st.caption(
    "Ücretsiz kaynaklardan (RSS + opsiyonel NewsAPI) haber toplar, kümeler, Türkçeye çevirir ve kaynaklar arası tutarlılığı değerlendirir."
)

with st.sidebar:
    st.header("Ayarlar")
    include_newsapi = st.checkbox("NewsAPI dahil et (API key gerektirir)", value=False)
    max_clusters = st.slider("Gösterilecek maksimum küme", 5, 80, 25)
    refresh = st.button("Haberleri Yenile")

if refresh or "clusters" not in st.session_state:
    with st.spinner("Kaynaklar taranıyor ve analiz ediliyor..."):
        news_items = fetch_all_news(include_newsapi=include_newsapi)
        clusters = build_clusters(news_items)
        clusters = enrich_clusters(clusters)
        st.session_state["clusters"] = clusters[:max_clusters]
        st.session_state["last_update"] = datetime.utcnow()

clusters = st.session_state.get("clusters", [])
last_update = st.session_state.get("last_update")

if last_update:
    st.success(f"Son güncelleme (UTC): {last_update:%Y-%m-%d %H:%M:%S}")

if not clusters:
    st.warning("Henüz haber bulunamadı.")
    st.stop()

categories = clusters_by_category(clusters)
for category, cat_clusters in categories.items():
    with st.expander(f"{category} ({len(cat_clusters)})", expanded=True):
        for idx, cluster in enumerate(cat_clusters, 1):
            st.subheader(f"{idx}. {cluster.canonical_title}")
            st.markdown(f"**Güven/Tutarlılık Puanı:** `{cluster.reliability_score}/100`")
            st.write(cluster.turkish_summary)
            st.caption(cluster.consistency_analysis)

            with st.container(border=True):
                st.markdown("**Kaynaklar**")
                for item in cluster.items:
                    published = item.published_at.strftime("%Y-%m-%d %H:%M") if item.published_at else "-"
                    st.markdown(f"- [{item.source}]({item.url}) — {published} — {item.title}")

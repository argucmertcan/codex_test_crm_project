# Kudretmen Haber Asistanı (Python + UI)

Bu proje:
- Ücretsiz kaynaklardan (RSS) son dakika haberlerini toplar.
- Opsiyonel olarak NewsAPI (free tier) ile kaynakları artırır.
- Benzer haberleri aynı kümede birleştirir.
- Groq modelleri ile haberi Türkçeye çevirip özetler.
- Aynı olaya ait farklı kaynakları karşılaştırarak tutarlılık/güven puanı üretir.

## Kurulum

```bash
cd news_kudretmeni
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Ortam değişkenleri

`.env` dosyası oluşturun:

```env
GROQ_API_KEY=...
GROQ_MODEL=llama-3.3-70b-versatile
NEWSAPI_KEY=...   # opsiyonel
REQUEST_TIMEOUT_SEC=12
```

## Çalıştırma

```bash
cd news_kudretmeni
streamlit run app.py
```

## Notlar

- `GROQ_API_KEY` yoksa uygulama çalışır; ancak Türkçe çeviri/özet ve tutarlılık analizi yerine bilgilendirici fallback mesajları gösterilir.
- Doğruluk tespiti yüzde 100 garanti değildir; çok kaynaklı karşılaştırma + model analizi ile karar destek verir.

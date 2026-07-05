---
title: backend/learn — композиция image.url в sense-выдачу (зеркало audio.url)
status: ready (СТАРТ ПОСЛЕ backend-image-service.md — нужен живой /image/engines контракт)
audience: owner-сессия `claude-scope -Scope backend-learn` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: [067]
---

# Контекст

ADR 067: learn = stateless-композитор. Как voice даёт `audio: { url }`, так
image должен дать `image: { url }` в sense-выдачах. Байты никогда не проксируем —
готовая ссылка на image-сервис.

# Scope (backend/learn)

1. **`clients/image.py`** — зеркало `clients/voice.py` 1-в-1: engines-кэш
   (TTL 300, failure-TTL 30 → `image: null` при лежащем сервисе),
   `render_url(prompt)` строит `{IMAGE_PUBLIC_URL|IMAGE_URL}/image/render?prompt=…`.
   `config.py`: `image_url` (default `http://localhost:8005`) + `image_public_url`
   (в dev через gateway = `/api`).
2. **Prompt-стратегия v1 (ВРЕМЕННАЯ, зафиксировать коммент):** prompt =
   `f"{sense.text} ({sense.pos})"` — простая заглушка. Поле «образ» (image)
   на смысле обсуждается с учителем (lessons-волна, докрутка 1) — когда
   приедет в lang, prompt переключится на него. НЕ изобретать свою
   prompt-инженерию сейчас.
3. Sense-схемы: `image: { url: str } | None` рядом с `audio`.
4. Тесты: mock httpx — url-форма, degradation при недоступном image (null,
   не 502), кэш недоступности.

# Acceptance

`uv run pytest` + ruff зелёные; live: `GET 127.0.0.1:8003/learn/lang/senses`
несёт `image.url` при живом :8005 и `image: null` при лежащем.

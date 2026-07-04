---
name: "capsule-learn (backend/learn)"
owner-agent: owner-backend-learn
zone: backend-learn
stack: python / fastapi / httpx
status: stable (composer, ADR 067 такт 2)
priority: P1
last-updated: 2026-07-03
adr_refs: [055, 064, "064-A", 065, 067, 054]
---

# OWNERSHIP — backend/learn (`capsule-learn`)

**Зона:** `backend/learn/` — **композитор** (BFF, ADR 055 D2 / ADR 067): учебные выдачи собирают данные capability-сервисов (`backend/lang` :8002, `backend/voice` :8001) в один payload — «слово + озвучка рядом». Лексической БД и TTS-движков **не держит**; stateless до появления user-состояния (прогресс/SRS — следующая волна, тогда своя БД заведётся заново).

> [!note] Governance — scope `backend-learn`
> Owner-сессия: **`.\claude-scope.ps1 -Scope backend-learn`** — заперта в `backend/learn`, git **commit-only** (нет main-маркера → git-gate активен). Перед первой правкой обязателен **Read этого OWNERSHIP** (ownership-gate хука).
>
> nx project name = `backend-learn` (= scope). Python dist/модуль — `capsule-learn` / `capsule_learn` (pyproject), это разные слои.

## Состояние (читать ПЕРВЫМ)

- **Status:** `stable` — ADR 067 такт 2 выполнен: lexical-движок уехал в `backend/lang`, TTS — в `backend/voice`; learn = тонкий httpx-композитор.
- **Stack:** Python 3.12+, FastAPI, httpx (async-клиенты), uv. БД **нет** — stateless.
- **Port:** 8003 (voice 8001 / lang 8002 / learn 8003 — ADR 055).
- **История:** до 067 learn держал sense-центричную lexical-БД (ADR 064/064-A, SQLAlchemy+Alembic) и pluggable-TTS (ADR 065) — оба домена перенесены 1:1 в capability-сервисы; их контракты см. ADR 067 D2.

## Зона ответственности

- `backend/learn/**` — FastAPI-приложение, httpx-клиенты, response-модели, тесты.
- НЕ трогает: `backend/lang/**` (owner-backend-lang), `backend/voice/**` (owner-backend-voice), `backend/scriber/**` (owner-scriber), `backend/fs/**` (shared — эскалация architect), фронт `apps/learn` (architect), root-config/CI (architect).

## Архитектура (ADR 067)

- **`clients/lang.py`** — `LangClient`: async httpx к `LANG_URL`, таймаут 5s. Сетевые/5xx апстрима → `LangError(502, ...)`; 4xx (404 sense, 422 фильтр) зеркалятся as-is. Хэндлер `LangError` → JSON в `main.py`.
- **`clients/voice.py`** — `VoiceClient`: engines-кэш в памяти (TTL 300s, отрицательный кэш 30s — чтобы лежащий voice не ел connect-timeout на каждый запрос) + `speak_url()` (готовая ссылка на `VOICE_PUBLIC_URL`, urlencode). Voice down → `engines() = None` + warning-лог.
- **`clients/image.py`** — `ImageClient`: **зеркало `voice.py` 1-в-1** — engines-кэш (TTL 300s / failure 30s) + `render_url(prompt)` (ссылка на `IMAGE_PUBLIC_URL/image/render?prompt=…`, urlencode). Image down → `engines() = None` → `image: null`. Байты картинок через learn **не текут**.
- **`api.py`** — фронт-контракт `/learn/lang/*` сохранён 1:1 (пути + формы): passthrough в lang + обогащение `audio: {url, engines} | null` **и** `image: {url} | null` в `SenseListItem`/`SenseDetail`. Медиа-байты через learn **не текут** — фронт дёргает `audio.url` / `image.url` напрямую. **Prompt-стратегия image v1 (ВРЕМЕННАЯ):** `f"{text} ({pos})"` — заглушка; переключится на teacher-curated поле «образ» когда оно доедет обогащённым в lang (lessons-волна).
- **`schemas.py`** — **свои** pydantic-модели ответов (копия форм lang + `audio` + `image`), чужие модели не импортируются. Бывшие enum-фасеты — plain `str`: таксономией владеет lang, композитор не ревалидирует (иначе drift при добавлении значения в lang). Бывшее `image: str` (текст-«образ» из lang) **замещено** блоком `image: {url}` — образ был заглушкой до появления генерации картинок, теперь композитор кладёт готовую ссылку.
- **config (D4):** `LANG_URL` / `VOICE_URL` / `VOICE_PUBLIC_URL` (= VOICE_URL если не задан; расходится за реверс-прокси) / `IMAGE_URL` / `IMAGE_PUBLIC_URL` (= IMAGE_URL если не задан; в dev через gateway = `/api`) / `PORT` / `DEFAULT_LANG`.

## Публичный API

`GET /health` · `GET /learn/lang/senses` (фильтры lang + `audio` + `image` на item) · `GET /learn/lang/sense/{id}` (+`audio` +`image`) · `GET /learn/lang/senses/related?sense=` (чистый passthrough). `/learn/voice/*` **удалён** — потребители ходят в voice напрямую (фронт-миграция на `audio.url` — зона architect).

## Тесты

`uv run pytest` — respx-моки апстримов, живые сервисы не нужны: passthrough форм, 404/502-маппинг, audio-блок (urlencode, engines-кэш = 1 probe), voice down → `audio: null` при 200, image-блок (urlencode `{text} ({pos})`, engines-кэш = 1 probe, override текст-«образа» на detail), image down → `image: null` при 200. Живой smoke требует поднятых lang :8002 + voice :8001 + image :8005.

## Урок — контракт-каскад (2026-07-03)

Изменение полей ответа в capability-сервисе (lang/voice) требует синхронного апдейта response-моделей композитора (`schemas.py`) — иначе pydantic молча отбрасывает незнакомое поле и потребитель (фронт) видит его пропавшим без единой ошибки. Прецедент: lang добавил `ru` (русский перевод, отдельно от `gloss`) — `SenseListItem`/`SenseDetail` не знали о поле, перевод «терялся» на пути lang→learn→front. При ревью изменений в lang/voice — проверять, не появилось ли новое поле, которое нужно прокинуть здесь.

## Roadmap

- [ ] user-состояние (прогресс/SRS, bookmarks/mastery/lists) — своя БД, следующая волна
- [ ] уроки/упражнения-endpoints (продуктовая волна learn)
- [ ] фронт `apps/learn` мигрирует на `audio.url` (architect)

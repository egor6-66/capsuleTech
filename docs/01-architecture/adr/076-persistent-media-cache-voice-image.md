---
tags: [adr, backend, voice, image, cache, storage, federation]
status: accepted
date: 2026-07-05
adr_refs: [054, 065, 067, 072]
---

# ADR 076 — Persistent media cache: voice (+image) в object-storage, warm-at-ingest, static/dynamic split

## Контекст

- **image** уже детерминирован: `seed=hash(subject)`, `style@version` в ключе, served из кэша, НЕ в БД (решение 2026-07-05).
- **voice** сейчас кэширует **транзитно**: `/voice/speak` детерминирован (`engine|lang|voice|speed|text`), стоит HTTP `ETag`+`Cache-Control` + in-memory LRU (512, ~30MB). Бриф `backend-voice-speak-cache` явно отложил персист: «диск-кэш/переживание рестарта — НЕ сейчас».
- Теперь **file storage (MinIO) в docker**. Curated-озвучка (слова, принятые фразы) = **статика**: детерминирована, гоняется на каждый рестарт/эвикцию заново (chatterbox ~8с CPU). Compute-once выгоднее нагрузки; рост хранилища ограничен (конечный словарь × 3 движка × ~60KB), SSD дешевле CPU.

## Решение

**Персистентный ярус media-кэша в object-storage (MinIO) для СТАТИЧЕСКОГО curated-контента; динамика — рантайм.** Единый паттерн для voice и image.

### Static vs dynamic (граница)
- **Static (персистим):** curated из lang — озвучка слов, принятых фраз/базовых конструкций; картинки слов. Детерминировано, ограничено.
- **Dynamic (НЕ персистим):** живой диалог, on-the-fly TTS — только in-mem LRU (безграничный рост исключён by design).
- Граница = `kind`: `words`/`phrases` (curated) персистятся; `dynamic` — нет.

### Ключ и раскладка (voice)
- Object key: **`voice/<kind>/<engine>/<sha>.wav`** (гибрид — дедуп по sha + дроп по kind/engine).
- `sha` = существующий ETag-канонический хэш (`engine|lang|voice|speed|text`) **+ `model-version`** → бамп версии = перегенерация (инвалидация как `style@version` у image).
- Дропаемость: prefix-delete (`voice/words/`, `voice/<engine>/`) — «если что, всегда дропнем».

### Serve order (`/voice/speak`)
1. MinIO по ключу (если `kind` персистентный) → отдать.
2. in-mem LRU.
3. синтез. Если `kind` curated → записать MinIO + LRU; если `dynamic` → только LRU.

### Warm-at-ingest
lang/learn при добавлении слова / принятии фразы → генерит 3 движка → MinIO (идемпотентно, skip-if-exists, re-gen на бамп версии). Как image-warmer. НЕ «на старте раз» — на **добавление контента** (словарь растёт).

### НЕ в БД
Байты в MinIO; learn отдаёт **выводимый** `audio.url` (с `kind`+`engine`), как `image.url`. БД аудио не хранит.

### Федерация (ADR 072)
Кэш **нода-локальный**: self-hoster поднимает voice + MinIO + свою lang-БД → его warmer прогревает **его** кэш из **его** контента на **его** железе. Мы шиппим только **контракт** — схему ключа + триггер warmer'а + endpoint. Он «работает на своём, с нас связи». MinIO offline = graceful degrade к LRU+синтезу.

## Последствия

**+** Compute-once для curated: нагрузка на машину снимается (главный профит). **+** Рост хранилища ограничен и дропаем по префиксу. **+** Переживает рестарт/эвикцию. **+** Портируемо на self-host ноды. **+** Версия-инвалидация чистая. **+** Единый media-cache паттерн voice+image.
**−** Новая зависимость voice/learn на MinIO (graceful fallback обязателен). **−** Warm-at-ingest добавляет шаг в конвейер контента.

## Не решает (вне scope)
Streaming TTS, CDN, персист динамики, миграция уже-сгенерированного (backfill = разовый прогон warmer'а).

## Ссылки
- [[065-...]] / [[067-backend-capability-services-lang-voice|ADR 067]] — voice capability-сервис.
- [[072-...|ADR 072]] — федерация / user-hosted ноды.
- Бриф `backend-voice-speak-cache` (транзитный ярус, реализован) — этот ADR достраивает персист.

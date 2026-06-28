---
name: "capsule-learn (backend/learn)"
owner-agent: owner-backend-learn (future — пока зона без активного owner-агента)
zone: backend-learn
stack: python / fastapi / sqlalchemy / alembic
status: building (iter library-2)
priority: P1
last-updated: 2026-06-28
adr_refs: [055, 064, "064-A", 054]
---

# OWNERSHIP — backend/learn (`capsule-learn`)

**Зона:** `backend/learn/` — BFF learn-сервис (ADR 055 D1). Plugin-модули: `lang` (лексическая библиотека, ADR 064), `voice` (TTS, pluggable engine — seam под вынос в `backend/voice`).

> [!note] Governance — scope `backend-learn`
> `backend/**` **покрыт** scope-fence (`governance.mjs` расширен на backend; `scope-resolve.mjs` индексирует backend-проекты по `project.json#name`). Owner-сессия: **`.\claude-scope.ps1 -Scope backend-learn`** — заперта в `backend/learn` (правки в `packages/*` и чужие зоны режутся), git **commit-only** (нет main-маркера → git-gate активен). Перед первой правкой обязателен **Read этого OWNERSHIP** (ownership-gate хука). Рабочий контракт — бриф `docs/_meta/briefs/learn-iter2-backend-learn.md`.
>
> nx project name = `backend-learn` (= scope). Python dist/модуль — `capsule-learn` / `capsule_learn` (pyproject), это разные слои.

## Состояние (читать ПЕРВЫМ)

- **Status:** `building` — iter library-2 (обогащённая lexical-запись + YAML-importer, ADR 064-A). library-1 (схема + filter-endpoints, #438) — merged.
- **Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, uv. SQLite-файл на старте (drop-in Postgres через `DATABASE_URL`, ADR 055 D3).
- **Port:** 8003 (voice 8001 / lang 8002 / learn 8003 — ADR 055).
- **Первый Python-сервис в монорепо.** nx/Python-тулинг (namedInputs, CI Python-job) — заводит architect (foundation-00) на этапе интеграции; owner фокусируется на коде сервиса + локальном run (uv/uvicorn) для Postman.

## Зона ответственности

- `backend/learn/**` — FastAPI-приложение, модели, миграции, endpoints, seed, тесты.
- НЕ трогает: `backend/scriber/**` (owner-scriber), `backend/fs/**` (shared — эскалация architect), `packages/web/learn/**` (фронт, scope `learn`), root-config (nx.json/CI — architect).

## Модель данных (ADR 064 + 064-A — sense-центричная, обогащённая)

Атомарная единица — **Sense (значение)**, не Word (строка). Теги/связи/фасеты на sense. Принцип фасетов: single-valued → колонка, multi-valued → тег. Провенанс `source: auto|curated` (re-import не трёт curated). Lang-scope на sense.

**064-A (library-2):** запись обогащена под каноны обучения — `pron_ru`(primary)/`ipa`/`image`/`connotation`/`intensity`/`synset`/`forms`(JSON)/`collocations`(JSON)/`nuance`/`valency`; `level`→CEFR, `frequency`→band-enum; новая таблица `sense_examples` (first-class, со своей фонетикой). Таксономия тегов v2 (ортогональная): `field`/`domain`/`tier`/`phonetic`/`lexical` (дроп `semantic`→колонка `synset`, `context`→`field`).

Схема: `words` · `senses`(+rich facets) · `tags` · `sense_tags`(M2M) · `sense_examples`(1:N) · `sense_relations`(defined, endpoints позже). Детали — ADR 064 §start-schema + 064-A §A2.

## Ingestion (064-A §A4)

**Канонический способ кормёжки — YAML-importer.** `capsule_learn.importer.import_file(path) → ImportReport`: YAML-блок-на-значение → pydantic-канон `SenseIn` → two-pass идемпотентный upsert (pass-1 senses/tags/examples, pass-2 резолв relations в sense-id). Невалидные блоки → в отчёт, не падаем. `seed.py` = тонкая обёртка над importer на `content/lang/en_US/seed.yml`. CLI: `python -m capsule_learn.importer <file.yml>`; nx `import` target.

## Публичный API (library-2)

`GET /health` · `GET /learn/lang/senses` (фасетный фильтр: +`connotation`/`tier`/`synset`) · `GET /learn/lang/sense/{id}` (rich: +pron_ru/image/examples/relations/...) · `GET /learn/lang/senses/related?sense={id}` (synset-aware ранжирование). Контракты — бриф `learn-iter3-backend-importer.md`.

**voice:** `GET /learn/voice/speak?text=&lang=&voice=&speed=` → `audio/wav` (TTS). Движок pluggable (`engine.py` Protocol + lazy registry, свап через `VOICE_ENGINE`); Kokoro = первый impl. **Voice-deps — opt-in extra `[voice]`** (`uv sync --extra voice`), ленивый импорт → базовый сервис/CI без torch. Air-gapped: `KOKORO_MODEL_PATH`. Бриф `learn-voice-tts-kokoro.md`.

## Roadmap

- [x] iter library-1: схема + filter-endpoints + seed + Postman (#438)
- [x] iter library-2: обогащённая запись + YAML-importer (этот заход)
- [ ] `sense_relations` endpoints (типизированный граф)
- [ ] song/construction/exercise + backlinks (обратный поиск)
- [ ] пер-юзер слой (bookmarks/mastery/lists)
- [ ] NLP-обогащение (авто-POS/phonetics из lang-движка)
- [ ] извлечение `packages/shared/data` при 2-м Python-сервисе
- [ ] фронт `@capsuletech/web-learn/library` ← web-query

---
name: "capsule-learn (backend/learn)"
owner-agent: owner-backend-learn (future — пока зона без активного owner-агента)
zone: backend-learn
stack: python / fastapi / sqlalchemy / alembic
status: building (iter library-1)
priority: P1
last-updated: 2026-06-28
adr_refs: [055, 064, 054]
---

# OWNERSHIP — backend/learn (`capsule-learn`)

**Зона:** `backend/learn/` — BFF learn-сервис (ADR 055 D1). Plugin-модули; первый — `lang` (лексическая библиотека, ADR 064).

> [!note] Governance — scope `backend-learn`
> `backend/**` **покрыт** scope-fence (`governance.mjs` расширен на backend; `scope-resolve.mjs` индексирует backend-проекты по `project.json#name`). Owner-сессия: **`.\claude-scope.ps1 -Scope backend-learn`** — заперта в `backend/learn` (правки в `packages/*` и чужие зоны режутся), git **commit-only** (нет main-маркера → git-gate активен). Перед первой правкой обязателен **Read этого OWNERSHIP** (ownership-gate хука). Рабочий контракт — бриф `docs/_meta/briefs/learn-iter2-backend-learn.md`.
>
> nx project name = `backend-learn` (= scope). Python dist/модуль — `capsule-learn` / `capsule_learn` (pyproject), это разные слои.

## Состояние (читать ПЕРВЫМ)

- **Status:** `building` — iter library-1 (sense-центричная lexical-схема + filter-endpoints, ADR 064). Skeleton→первый рабочий срез под Postman.
- **Stack:** Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, uv. SQLite-файл на старте (drop-in Postgres через `DATABASE_URL`, ADR 055 D3).
- **Port:** 8003 (voice 8001 / lang 8002 / learn 8003 — ADR 055).
- **Первый Python-сервис в монорепо.** nx/Python-тулинг (namedInputs, CI Python-job) — заводит architect (foundation-00) на этапе интеграции; owner фокусируется на коде сервиса + локальном run (uv/uvicorn) для Postman.

## Зона ответственности

- `backend/learn/**` — FastAPI-приложение, модели, миграции, endpoints, seed, тесты.
- НЕ трогает: `backend/scriber/**` (owner-scriber), `backend/fs/**` (shared — эскалация architect), `packages/web/learn/**` (фронт, scope `learn`), root-config (nx.json/CI — architect).

## Модель данных (ADR 064 — sense-центричная)

Атомарная единица — **Sense (значение)**, не Word (строка). Теги/связи/фасеты на sense. Одна ось тегов-связей. Принцип фасетов: single-valued → колонка (pos/level/register/frequency), multi-valued → тег (domain/context/phonetic). Провенанс `source: auto|curated` (re-seed не трёт curated). Lang-scope на sense. Shared-канон ↔ пер-юзер слой раздельно.

Стартовая схема: `words` · `senses`(+facets) · `tags` · `sense_tags`(M2M) · `sense_relations`(defined, endpoints позже). Детали — ADR 064 §start-schema.

## Публичный API (iter library-1)

`GET /health` · `GET /learn/lang/senses` (фасетный + теговый фильтр) · `GET /learn/lang/sense/{id}` (sense+теги) · `GET /learn/lang/senses/related?sense={id}` (ранжирование по общим тегам). Контракты — в брифе.

## Roadmap

- [ ] iter library-1: схема + filter-endpoints + seed + Postman (текущая)
- [ ] `sense_relations` endpoints (типизированный граф)
- [ ] song/construction/exercise + backlinks (обратный поиск)
- [ ] пер-юзер слой (bookmarks/mastery/lists)
- [ ] NLP-обогащение (авто-POS/phonetics из lang-движка)
- [ ] извлечение `packages/shared/data` при 2-м Python-сервисе
- [ ] фронт `@capsuletech/web-learn/library` ← web-query

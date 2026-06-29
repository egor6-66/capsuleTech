---
title: Learn Iter 3 (library-2) — rich lexical entry + YAML importer
status: ready
audience: owner-сессия backend-learn (USER запускает; коллаборативно)
last_updated: 2026-06-28
adr_refs: [064, "064-A"]
---

# Кто ты / запуск

Owner-сессия зоны **`backend/learn`** (`backend-learn`). Запуск: **`.\claude-scope.ps1 -Scope backend-learn`** — fenced + git commit-only. **Read первым**: `backend/learn/OWNERSHIP.md`, затем **ADR 064 + Amendment 064-A** (`docs/01-architecture/adr/064-learn-lexical-graph-data-model.md` — там вся обогащённая схема, pydantic-контракт `SenseIn`, правила импорта; ниже — план, детали НЕ дублирую).

Хук блокнул — **STOP + escalate**, не обходи.

# Цель итерации

**library-2**: обогатить запись под каноны обучения (064-A) + завести **YAML-importer** (канонический способ кормёжки лексикой). Реализация коллаборативная (USER ведёт). Текущий `seed` обобщается в importer. Контент учителя зальём ПОСЛЕ (этот заход — механика + sample).

# Состав

## 1. Зависимость
`pyyaml>=6.0` в `pyproject.toml` deps (чтение YAML). `uv sync` подхватит.

## 2. enums.py (StrEnum, как сейчас)
- `Level` → **CEFR**: a1, a2, b1, b2, c1, c2 (если уже так в library-1 — оставь).
- `Frequency` → band: high, medium, low (было int → меняем, см. migration).
- `Connotation` → positive, neutral, negative (новый).
- `TagKind` → **field, domain, tier, phonetic, lexical** (064-A §A3; дроп semantic/context).
- `Pos` — без изменений; importer мапит синонимы входа (`adjective→adj`, `adverb→adv`, ...).
- `RelationType`, `Source` — без изменений.

## 3. models.py — обогащение `senses` + новая таблица
Новые колонки `senses` (все nullable): `pron_ru`, `ipa`, `image`, `connotation`(Connotation), `intensity`(int), `synset`(str), `forms`(JSON), `collocations`(JSON), `nuance`, `valency`. `level`→Level(CEFR), `frequency`→Frequency(band). (Полная таблица — 064-A §A2.)

Новая таблица **`sense_examples`**: `id` · `sense_id`→senses(FK, index) · `text` · `pron_ru?` · `ru?` · `ipa?`. Natural key `(sense_id, text)`.

> JSON-колонки (`forms`/`collocations`) через `sqlalchemy.JSON` — работает на SQLite + Postgres. Enum-колонки — `native_enum=False` (как library-1).

## 4. alembic migration 0002
upgrade от 0001: add-columns на `senses` + create `sense_examples` + смена типа `frequency` (int→str band) + (если level не CEFR — расширить). **Dev-БД одноразовая** (SQLite-файл, gitignored) — миграцию проверяй на чистой БД (`rm learn.db; alembic upgrade head`); data-миграция старого seed НЕ нужна (re-import через importer пересоздаст). Stale-теги старого kind (`semantic`/`context`) от library-1 seed игнорируем (свежая БД).

## 5. schemas.py — pydantic
- **Ingestion-канон**: `SenseIn` / `ExampleIn` / `TagIn` / `RelationIn` — **точно по 064-A §A4** (всё кроме `word`/`pos` опционально).
- **Response**: расширить `SenseDetail` новыми полями + `examples` + `collocations` + `synset` + outgoing `relations` (резолвнутые). `SenseListItem` — добавить ключевые (pron_ru, level, connotation, tags) — не раздувай.

## 6. importer.py (обобщает seed)
`import_file(path) -> ImportReport`:
1. Парс YAML → список dict → валидация каждого в `SenseIn` (pydantic). Невалидные — **в отчёт** (`word` + причина), не падаем.
2. **Two-pass** (064-A §A4):
   - pass-1: upsert word `(text,lang)` → sense `(word_id, coalesce(gloss,''))` со всеми скалярами/JSON; upsert tags `(name,kind)` + sense_tags; `traits`→lexical-теги; `tier`/`field`/`domain`/`phonetic`→tags нужного kind; `synset`→колонка; upsert sense_examples `(sense_id,text)`.
   - pass-2: для каждой `relations[]` резолв `target` («word (gloss)») → sense-id (match word.text + gloss-substring); upsert `sense_relations (from,to,type)`. Не разрезолвилось → **warn в отчёт + skip** (подтянется при след. импорте).
3. **Идемпотентность**: все upsert'ы по натур.ключам; `source=curated`. Re-import = апдейт, ноль дублей (тест ниже).
4. `ImportReport`: `{imported, updated, skipped, errors:[{word,reason}], unresolved_relations:[...]}`.

`seed.py` → тонкая обёртка: `import_file(content/lang/en_US/seed.yml)`. Перенеси library-1 sample (bank-полисемия + happy/glad/joyful) в **YAML** (`content/lang/en_US/seed.yml`) в формате 064-A (с pron_ru/synset/connotation/examples — хотя бы частично, чтоб тест новых полей был живой).

## 7. CLI / nx
`python -m capsule_learn.importer <file.yml>` (печатает ImportReport). project.json target **`import`**: `uv run python -m capsule_learn.importer {args.file}` (или фикс на seed.yml). 

## 8. Endpoints — расширение (modules/lang)
- `GET /sense/{id}` → отдаёт все новые поля + `examples[]` + `collocations[]` + `synset` + outgoing `relations[]` (резолвнутые: type + target word/gloss).
- `GET /senses` → новые фильтры (опц.): `connotation`, `tier` (tag kind=tier), `synset`. Существующие — как есть.
- `GET /senses/related` → **synset-aware**: senses с тем же `synset` идут первыми, далее tag-overlap (как library-1). В ответ добавить `connotation`/`intensity`/`synset` (для swap-UI на фронте). *Умный intensity-ранкинг — следующая итерация, не сейчас.*

# Тесты (pytest)
- `test_importer_idempotent` — import sample ×2 → счётчики стабильны, ноль дублей (words/senses/tags/examples).
- `test_importer_validation` — битый блок (bad `pos`) → в `errors`, валидные импортированы.
- `test_importer_relations` — antonym резолвится в sense-id; target ещё-не-залит → `unresolved` + warn (two-pass на одном файле, где цель ниже).
- `test_sense_detail_rich` — detail отдаёт pron_ru/image/connotation/examples/synset.
- `test_filter_new_facets` — `?connotation=positive`, `?tier=...`.
- `test_related_synset_first` — related ставит same-synset первыми.

# Acceptance (last-lines → architect)
- `uv sync` ок (pyyaml встал).
- `rm learn.db; uv run alembic upgrade head` — чистая БД с обогащённой схемой (senses+колонки, sense_examples).
- `uv run python -m capsule_learn.importer content/lang/en_US/seed.yml` → ImportReport, 0 errors; повтор → updated, 0 дублей.
- `uv run uvicorn ... :8003`; `GET /sense/{id}` отдаёт новые поля + examples (curl-проверь).
- `uv run pytest` зелёные; `uv run ruff check .` clean.

# Что НЕ делаем (064-A §A5)
- `Construction`/`Phrase` сущность + линк коллокаций/примеров на неё — коллокации/примеры самодостаточны (JSON/таблица).
- Авто-генерация форм/IPA/freq-rank (lang/wordfreq/phonemizer) — место под `source=auto` есть, реализация позже.
- `synset` отдельной сущностью — строковый ключ.
- CSV-адаптер, мультиязычный контент, умный intensity-ранкинг related — позже.
- Фикс pydantic-warning `register` (shadows BaseModel) — можешь заодно alias'нуть (`model_config`/Field alias), но не обязательно.

# После
USER зальёт реальный YAML учителя через `importer` + проверит Postman → маякнёт architect → совместная проверка → architect соберёт кросс-PR (вместе с ADR 064-A + content-брифами).

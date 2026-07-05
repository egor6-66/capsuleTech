---
name: backend-lang
owner-agent: owner-backend-lang
group: backend (python, not npm-released)
zone: backend
status: alpha
priority: P1
last-updated: 2026-07-03
---

# backend-lang (`capsule-lang`)

Sense-центричный lexical-граф (ADR 064) как самостоятельный capability-сервис (ADR 067 D1). Публичный HTTP-контракт `/lang/*`; `backend-learn` — композитор-потребитель, но не единственный.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `backend/lang/` (Python, FastAPI + SQLAlchemy + Alembic, тулчейн uv).
- **Status:** `alpha` — вынос из `backend/learn` завершён (копией, ADR 067 D1); контракт D2 работает, тесты зелёные.
- **Priority:** P1 — на нём будет сидеть learn-композитор + любые app'ы напрямую.
- **Maturity bar → beta:**
  - learn переведён на HTTP-потребление lang (такт owner-learn, бриф `backend-learn-compose.md`);
  - NLP-enrichment волна (wn/wordfreq — ADR 064 §enrichment);
  - CI job гоняет `test:py`+`lint:py` для backend-lang (зона architect).
- **Active blockers:** нет. **Round-3 закрыт (2026-07-05):** контент консолидирован в vault (`content/` удалён из репо, ADR 070); `vault_import` (words→lessons одной командой); `drill.dimension`-гейт снял отсрочку валидатора. Live: `words imported=3 updated=171 skipped=0`, `lessons imported=5 updated=16 rejected=0` — все 5 дриллов + урок `pronouns-basics` в БД, `GET /lang/lessons` непустой, живой путь концепт→правило→дрилл отдаётся. (⚠️ read-поле `dimension` появится в JSON после reload сервера :8002 — крутил старый код на момент прогона.) Lessons round-2 закрыт (2026-07-04): учитель проставил `type: rule` в 14 справочниках + слово `already` заведено в vocab (L1). Live-импорт vault: `imported=15 (14 rules + эталонный дрилл), rejected=0`. Эталон `past-perfect-which-clause` в БД, endpoint отдаёт оба item'а с nearMiss.
- **Roadmap:** enrichment (auto-rows поверх curated), sense_relations endpoints, Postgres smoke, lessons phase 2 (интерактив: проверка ответов + rule-based nearMiss — ADR 069 D5).
- **Last activity:** 2026-07-05 — accordion-IA grouping-поля (бриф `lang-rule-category-concept-kind.md`): `rules.category/sort_order` + `concepts.kind/sort_order` (миграция 0006, enum'ы `RuleCategory`/`ConceptKind`). Importer читает `category/order` (rule, дефолт из папки) + `kind/order` (concept, дефолт approach); unknown enum → reject; списки `/lang/rules`+`/lang/concepts` отдают поля, сортировка category|kind→sort_order→title. 51 тест green. ⏳ Полный `vault_import`-реимпорт отложен — идёт вместе с tense-валидатором, когда учитель проставит поля. Прежняя запись: 2026-07-03 — `Sense.ru` translation column (fix: кириллический `q` не находил ничего, т.к. искал в `gloss`, а корпус держит там английское определение). Миграция 0003. Плюс: консолидация корпуса (`content/en_US/vocab/` — teacher-vocab пак перенесён из `docs/_meta/briefs/learn-vocab/`, был не в git); `Register` enum расширен (`vulgar`/`literary`/+задел, бриф `learn-fix-register-enum.md`); `lang.db` пересобрана с нуля — 176 senses, 0 skipped, 0 дублей.

## Vendor stack

- **FastAPI** (`fastapi >=0.115`) — HTTP-слой. https://fastapi.tiangolo.com/
- **SQLAlchemy 2.0** (`sqlalchemy >=2.0`) — ORM, declarative Base. https://docs.sqlalchemy.org/
- **Alembic** (`alembic >=1.13`) — миграции (цепочка 0001→0002). https://alembic.sqlalchemy.org/
- **Pydantic v2** (`pydantic >=2.7`, `pydantic-settings`) — schemas + Settings. https://docs.pydantic.dev/
- **uv** — тулчейн (sync/lock/run). https://docs.astral.sh/uv/

## Зона ответственности

### Owns
- `backend/lang/` полностью: `src/capsule_lang/`, `tests/`, `alembic/`, `pyproject.toml`, `project.json`, `uv.lock`. **Контента в репо больше нет** (ADR 070) — лексика/уроки живут в teacher-vault (`LESSONS_VAULT`, dev `D:\learn\lang`), не в нашей зоне.

### Не трогает
- `backend/learn/` (owner-learn) — даже «удалить перенесённое» — не наша зона.
- `backend/scriber/`, `backend/fs/` (owner-scriber / shared).
- `.github/` CI-workflows, root nx.json (architect).

## Публичный API (контракт ADR 067 D2 — не менять без ADR)

- `GET /health` → `{"status":"ok"}`.
- `GET /lang/senses` — фильтры `lang, pos, level, register, connotation, synset, domain, tier, tag[] (multi, AND), q` → `SensesResponse`.
- `GET /lang/sense/{sense_id}` → `SenseDetail` | 404.
- `GET /lang/senses/related?sense=&context=&limit=` → `RelatedResponse` (same-synset first, потом tag-overlap).

Формы ответов — `src/capsule_lang/schemas.py` (1:1 с learn на момент выноса). Ingestion-канон: YAML → `SenseIn` → двухпроходный идемпотентный upsert (`importer.py`, ADR 064-A A4).

### Lessons-контент (ADR 069, фаза 1 — read-only)

Учебный контент живёт в той же БД (ADR 069 D1). 4 сущности + link-таблицы в `models.py`; enum'ы `LessonLevel` (l0–l5, отдельно от CEFR `Level`) + `MatchMode` (contains/regex). Миграция `0004`. Read-only контракт (`lessons_api.py`, schemas в `lessons_schemas.py`):

- `GET /lang/lessons` → `{id,title,level,tags}[]` (sort level, title).
- `GET /lang/lessons/{id}` → композиция: intro + упорядоченные full concepts/rules/drills (drill c items).
- `GET /lang/concepts` → `{concepts: [{id,title,principle,tags,kind,sortOrder}]}` (sort kind→sortOrder→title).
- `GET /lang/rules` → `{rules: [{id,title,tags,category,sortOrder}]}` (sort category→sortOrder→title).
- `GET /lang/drills?rule={id}` → `{drills: [DrillOut]}` full (items+nearMiss), sort level,title; пустой список валиден (неизвестное правило → `[]`, не 404); `rule` required (422 без него).
- `GET /lang/drills/{id}`, `GET /lang/concepts/{id}`, `GET /lang/rules/{id}` — прямой доступ (full body).

Vault-importer (`lessons_importer.py`) — markdown+frontmatter → reject-with-reason валидация (5 правил финалочки) → fixpoint-резолв ref'ов → идемпотентный upsert по id. Vault-путь из env `LESSONS_VAULT` / аргумента (air-gapped, не в коде). nx-таргет `import-lessons`.

Образ (ADR 069 D4): `senses.image` (уже была) + `sense_relations.bridge` (новая колонка) + `RelationIn.bridge` ingestion. Read-экспозиция bridge на sense-эндпоинте НЕ добавлена (фенс «не трогаем sense-эндпоинты»; появится с образ-фазой learn).

## Quirks / gotchas

- **native_enum=False везде** (`models.py:_enum`) — string-valued enum-колонки ради drop-in SQLite→Postgres. Не включать native ENUM.
- **`register_` с underscore** в Pydantic-схемах (`schemas.py`) — `register` шадовит BaseModel; JSON-ключ остаётся `register` через alias.
- **Natural key sense = (word_id, coalesce(gloss,''))** (`importer.py:_upsert_sense`) — смена gloss в YAML создаёт НОВЫЙ sense, не апдейтит.
- **`q` script-aware** (`repo.py:filter_senses`): латиница → spelling (word.text), кириллица → `Sense.ru` (отдельная колонка перевода, не `gloss`). До 2026-07-03 кириллица роутилась в `gloss`, но корпус (`seed.yml`) держит там английское определение — русского текста там просто не было, поэтому русский поиск ничего не находил (баг, не фича). Теперь `gloss` = английское определение/дизамбигуатор, `ru` = русский перевод headword'а — раздельные поля. По gloss латиницей осознанно НЕ ищем (q=ase цеплял «pleased»). Эвристика привязана к english-headword корпусу — другие языки headword'ов потребуют ревизии.
- **SQLite lower() фолдит только ASCII** — кириллический pattern пре-lower'ится в Python (`q.lower()`); заглавные кириллические буквы внутри данных gloss на SQLite не фолдятся (на Postgres ilike полноценный). Корпус lowercase — на практике не стреляет.
- **seed-корпус = ТЕСТ-фикстура** (`tests/fixtures/senses/seed.yml`, 6 senses; helper `tests/seed_fixture.py:seed()` гоняет `import_file` — один ingestion-путь). После консолидации контента в vault (ADR 070, 2026-07-05) `content/` из репо удалён; `src/capsule_lang/seed.py` и `vocab.py` удалены вместе с ним. Реальная лексика грузится из vault (`{vault}/words/*.yaml`) через `vault_import`. nx-таргеты `seed`/`import-vocab` убраны.
- **`python -m capsule_lang.importer <file.yml>`** — прямой импорт одного YAML-пака (без дефолт-корпуса: контент в vault). `python -m capsule_lang.vault_import {vault}` — полный раунд words→lessons. Прод-путь схемы — `alembic upgrade head`.
- **`LessonLevel` (l0–l5) ≠ `Level` (CEFR a1–c2).** Дриллы/уроки несут pack-difficulty (рукой, ADR 069), смыслы — CEFR. Разные оси, разные enum-колонки. Не путать.
- **Lessons-refs — жёсткий resolve, cascade-reject.** Дрилл ссылается на `rule`; если rule-файл rejected, дрилл тоже rejected (ref unresolved). Это by design (правило 4 финалочки) — importer чинит причину не молча.
- **Rule-файлы: `id`/`title` — из имени файла + H1, не из frontmatter.** Реальные справочники (`grammar/phonetics/speech`) по финалочке получают ТОЛЬКО `type` во frontmatter (тело не трогаем). Поэтому importer: `id` дефолтит на имя файла (правило №0; явный id, если есть, обязан совпасть — ловит rename-drift); `title` дефолтит на первый H1 тела verbatim (секц-нумератор «5d.» НЕ срезаем — это контентное решение vault'а). Frontmatter-title (у дриллов/уроков/концептов) выигрывает. Это разрешает кажущийся конфликт финалочки «title required» vs «rules — только type»: title живёт в H1.
- **Смена ключевого поля ломает natural key.** Если меняешь конвенцию поля, участвующего в natural key upsert'а (напр. `gloss`→`ru`, как 2026-07-03) — существующая БД получит ДУБЛИ при простом ре-импорте, не апдейт. Для локальной dev-БД: снести файл и пересобрать (`alembic upgrade head` + `vault_import {vault}`) начисто, не патчить поверх.
- **Accordion-IA grouping-поля (миграция 0006, ADR 069).** `rules.category` (enum phonetics|grammar|speech) + `rules.sort_order`; `concepts.kind` (enum approach|pattern|recommendation) + `concepts.sort_order`. Все `native_enum=False`, server_default `grammar`/`approach`/`100`. Frontmatter-поля: rule `category`/`order`, concept `kind`/`order` — **опциональны**. Дефолт rule `category` = ПАПКА vault (`grammar/`→grammar, `phonetics/`→phonetics, `speech/`→speech; тянется в `_discover`→`_parse_file` через `default_category`, `setdefault` не перетирает явный); concept `kind`→`approach`; `order`→100. Unknown enum-значение → reject на pydantic-парсе (reason содержит `category`/`kind`). Ru-подписи ГРУПП и порядок групп — на фронте, здесь только поля. `trap`-kind заведём аддитивно с первым контентом.
- **`drill.dimension` гейтит marker-чек (round-3, ADR 069).** Опциональное frontmatter-поле дрилла `dimension: tense|other`, default `tense`. `tense` → item обязан нести маркер времени в promptRu/context (защищает эталон, у него поля нет → default); `other` → marker НЕ требуется (`context` = рекомендация). unknown-значение → reject на парсе pydantic (`DrillDimension` enum). Хранится в БД (колонка `drills.dimension`, миграция `0005`, `native_enum=False`) для будущих Exercises-фильтров; отдаётся в `DrillOut`. Правка: `_validate_drill_item(…, dimension)`.
- **Полный импорт vault — `vault_import.py` (words→lessons, ADR 069/070).** Оркестратор: сначала `{vault}/words/*.yaml` через lexical-importer (`import_file`, `source: curated`), потом lessons-граф через `import_vault`. Порядок жёсткий — дриллы резолвят `words[]` против словаря, поэтому слова обязаны существовать до lessons-прохода. `words/` **не** входит в `FOLDER_TYPES` lessons-importer'а (тот сканит только md-сущности) — это разные форматы (YAML sense-list vs markdown+frontmatter) и разные пайплайны. nx-таргет `import-vault`, CLI `python -m capsule_lang.vault_import {vault}`.

## План рефакторинга / оптимизаций

- [ ] **NLP-enrichment** — wn/wordfreq auto-rows (ADR 064 §enrichment). (priority: medium)
- [ ] **sense_relations endpoints** — таблица определена, ручек нет. (priority: low)
- [x] **Founding extraction из backend/learn** — 2026-07-03, бриф `backend-lang-extract.md`.
- [x] **`Sense.ru` translation column + консолидация vocab-корпуса + Register enum (vulgar/literary)** — 2026-07-03, брифы `learn-fix-register-enum.md` (уже был готов, из эпохи backend/learn) + прямая задача от user.

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit/API | `tests/test_senses_api.py` | фильтры, detail, 404, seed-идемпотентность |
| Unit/API | `tests/test_related.py` | synset-first ranking, self-exclusion |
| Unit | `tests/test_importer.py` | идемпотентность, валидация, two-pass relations, enum-case |
| Unit | `tests/test_lessons_schema.py` | lessons-таблицы регистрируются, drill/item/lesson roundtrip |
| Unit | `tests/test_lessons_importer.py` | happy-path на эталонном дрилле (fixtures) + 5 reject-правил + идемпотентность |
| API | `tests/test_lessons_api.py` | lesson-композиция сохраняет порядок, drill items, 404 |
| Unit | `tests/test_vault_import.py` | full import words→lessons, drill words резолвятся без ручного seed, идемпотентность |

**Перед изменением:** `uv run pytest` green. **Перед release:** contract D2 не ломать без ADR.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `backend/learn` (композитор, HTTP-потребитель) | owner-learn |
| `backend/voice` (TTS capability, порт 8001) | owner-backend-voice |
| CI workflows / nx shared infra | architect |

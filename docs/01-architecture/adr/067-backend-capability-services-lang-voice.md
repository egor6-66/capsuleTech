---
tags: [adr, accepted, backend, python, lang, voice, learn, topology, services]
status: accepted
date: 2026-07-03
last_updated: 2026-07-03
supersedes: []
extends:
  - 054-multi-language-platform
  - 055-learning-service-and-thin-app
  - 064-learn-lexical-graph-data-model
  - 065-voice-tts-and-self-hosted-inference-backend
---

> [!info] Status: accepted
> Исполняет топологию ADR 054 §D3: выносим lexical-движок и TTS из `backend/learn` в самостоятельные capability-сервисы **`backend/lang`** и **`backend/voice`**. Learn становится **композитором** (BFF): его учебные выдачи собирают данные capability-сервисов в один payload (слово + озвучка рядом), сам ничего лексического/голосового не держит. Обкатка «pluggable seam в learn» (ADR 065 §1) выполнила роль — выносим по чистому шву.

# ADR 067 — Backend capability-сервисы: вынос `lang` + `voice`, learn = композитор

## Контекст {#context}

`backend/learn` сейчас держит два чужих домена, оба уже канонизированы как отдельные зоны, но «временно» жили внутри learn ради темпа:

- **Lexical-граф** (ADR 064: words/senses/tags/relations + importer + seed) — `modules/lang/` + `models.py` + alembic. Нужен не только обучению (поиск, перевод, любой текстовый продукт) — memory-долг «text-engine extraction» (2026-06-28).
- **TTS** (ADR 065: pluggable `TTSEngine` + реестр) — `modules/voice/`. Вынос заложен ADR 065 фазой 6; форсируется **стеной Python 3.13**: Chatterbox (второй движок для A/B, фаза 2) требует 3.10/3.11 — внутри learn (3.12+) он физически не встаёт.

Оба модуля писались как **чистые швы** под этот вынос (роутер + изолированный модуль, lazy-import ML-стека) — миграция механическая.

## Решение {#decision}

### D1 — Три сервиса, роли {#d1}

| Сервис | Порт | Python | Роль |
|---|---|---|---|
| `backend/lang` (`backend-lang`) | :8002 | 3.12+ (как learn) | **Capability**: lexical-граф — senses/tags/relations, фильтры, related-ранкинг, importer, seed. Владеет лексической БД. |
| `backend/voice` (`backend-voice`) | :8001 | **3.11** (pin) | **Capability**: TTS — реестр движков (Kokoro, Chatterbox), `speak`/`engines`. Stateless. Позже STT/scoring (ADR 065 фазы 3+). |
| `backend/learn` (`backend-learn`) | :8003 | 3.12+ | **Композитор** (BFF, ADR 055 D2): учебные выдачи = композиция capability-сервисов (+ позже user-state: прогресс/SRS). Лексической БД и движков **не держит**. |

**Capability-сервисы публичны**: любой апп/сервис ходит к ним напрямую (за словарём — в lang, за озвучкой — в voice). Learn не прячет их за собой — он **добавляет ценность композицией**, а не проксирует байты.

### D2 — Контракты (contract-first) {#d2}

Префикс роутера = имя сервиса (не `/learn/...`):

**lang :8002** — текущий контракт learn-модуля 1:1, prefix `/lang`:
- `GET /lang/senses` — фильтры `lang,pos,level,register,connotation,synset,domain,tier,tag[],q` → `SensesResponse`.
- `GET /lang/sense/{id}` → `SenseDetail` (facets, forms, collocations, tags, examples, relations).
- `GET /lang/senses/related?sense=&context=&limit=` → `RelatedResponse` (tag-overlap ранкинг).
- `GET /health`.

**voice :8001** — текущий контракт learn-модуля 1:1, prefix `/voice`:
- `GET /voice/engines` → `{ engines: string[], default: string }`.
- `GET /voice/speak?text=&engine=&lang=&voice=&speed=` → `audio/wav`.
- `GET /health`.

**learn :8003** — сохраняет свой фронт-контракт `/learn/lang/*` (та же форма ответов, фронт не ломается), внутри — httpx-клиент к lang. **Композиция озвучки**: sense-payload'ы обогащаются блоком

```json
"audio": { "url": "<VOICE_PUBLIC_URL>/voice/speak?text=bank&lang=en_US", "engines": ["kokoro", "chatterbox"] }
```

— **готовая ссылка на voice, не байты**: аудио через learn не течёт, фронт дёргает URL напрямую (`<audio src>`). `/learn/voice/*` **удаляется** (фронт мигрирует на `audio.url` отдельным шагом — зона architect, приоритет за бэком).

### D3 — Данные {#d3}

Лексическая БД целиком уезжает в lang (модели, alembic-цепочка, seed, importer, `content/lang/`). Learn становится **stateless**; свою БД (user-прогресс/SRS, ADR 064 §shared↔user) заведёт заново, когда дойдёт до учебных сущностей — пустой alembic-каркас впрок не держим.

### D4 — Конфигурация связей {#d4}

Service-to-service — плоские env (pydantic-settings): learn знает `LANG_URL` (default `http://localhost:8002`) и `VOICE_URL` (`http://localhost:8001`); для browser-facing ссылок — `VOICE_PUBLIC_URL` (default = `VOICE_URL`, расходится только за реверс-прокси в деплое).

### D5 — Тулчейн и fence {#d5}

Каждый сервис — свой uv-рантайм (`pyproject.toml` + `uv.lock`, у voice — `.python-version` = 3.11). Scope-fence по backend-канону: scope = `project.json#name` (`backend-lang`, `backend-voice`); bootstrap первого `project.json` делает main, дальше fence. CI-джоб «Python tests» переводится с хардкода learn на матрицу по трём сервисам (per-service python) — shared-infra, зона architect.

### D6 — Superseded-брифы {#d6}

`foundation-01-shared-data` (не реализован; learn сделан на своём SQLAlchemy-стеке), `foundation-02-backend-voice-skeleton`, `foundation-03-backend-lang-skeleton`, `foundation-04-backend-learn-skeleton` (mock-скелеты, до ADR 064/065) — **superseded** этим ADR. Порты :8001/:8002/:8003 из них сохранены. Актуальные брифы: `docs/_meta/briefs/backend-{lang,voice}-extract.md`, `backend-learn-compose.md`.

## Параллелизация {#parallel}

- **Такт 1 (параллельно, без пересечений):** owner-`backend-lang` строит lang **копией** из learn (learn не трогает); owner-`backend-voice` строит voice (3.11, перенос модуля, ChatterboxEngine, styletts2 — в мусор).
- **Такт 2:** owner-`backend-learn` вырезает lexical+voice, ставит httpx-композитор по контрактам D2 (контракты зафиксированы — можно стартовать по брифу, не дожидаясь мержа такта 1, но acceptance-smoke требует живых lang/voice).
- **Интеграция (architect):** CI-матрица, ревью, push/PR.

## Последствия {#consequences}

**Плюсы:** lang/voice переиспользуемы любым потребителем (канон §0 — «корень в соседа» ликвидирован); voice на 3.11 разблокирует весь SOTA-TTS (Chatterbox A/B — фаза 2 ADR 065); learn тонкий и честный BFF; dep-долг kokoro→transformers уезжает в voice со своим lock'ом.

**Цена:** три uv-рантайма и три fence-зоны; +2 процесса в dev (`nx run backend-lang:serve` и т.д.); межсервисный HTTP-хоп в learn-выдачах (localhost, приемлемо); фронт 🔊 временно бьёт в удалённый `/learn/voice/*` — до фронт-миграции на `audio.url`.

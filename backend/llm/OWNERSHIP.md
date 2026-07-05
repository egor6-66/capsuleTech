---
name: backend-llm
owner-agent: owner-backend-llm
group: backend (not released to npm)
zone: backend
status: alpha
priority: P1
last-updated: 2026-07-05
---

# backend-llm

Stateless LLM-generation capability service (FastAPI, Python 3.12, port :8007) —
the text mirror of `backend/image`. Pluggable engines behind an `LlmEngine`
Protocol + lazy registry, per-request override via body `engine`, structured-JSON
output via schema/grammar enforcement. **Internal** service (no gateway route) —
first consumers are backends (community canon judge, tutor-feedback checker).
Prod target = Docker/Linux (dev on Windows).

## Состояние (читать ПЕРВЫМ)

- **Zone:** backend (Python capability service, ADR 054/065/074).
- **Status:** alpha — bootstrapped as the llm mirror of `backend/image` (ADR 074),
  contract-first: `fake` engine + full HTTP contract green, `llama-cpp` engine
  written but not live-verified (needs a GGUF + `gen` extra, see blockers).
- **Priority:** P1 — capability under ADR 073 (community judge) / ADR 069 (checker).
- **Maturity bar:** live-smoke of `llama-cpp` on a real GGUF (1–4B) → `/llm/generate`
  answers, schema-output parses; first backend consumer wired (separate brief);
  CI job wired by architect.
- **Active blockers:** нет для контракта. `llama-cpp` НЕ прогонялся на весах —
  веса user-supplied/air-gapped, в dev-сессии GGUF не подкладывался. `fake` —
  контрактный гарант; live verify требует модели.
- **Roadmap:** live llama-cpp verify, consumer integration (community/learn), later
  larger models / GPU-peer tuning, agent-loop layer on top (ADR 065 ф.4-5, отдельно).
- **Last activity:** 2026-07-05 — bootstrap (каркас + fake + llama-cpp + tests).

## Vendor stack + licenses (лицензионный гейт СРАЗУ — урок voice/image)

| Engine | Package | Extra | Engine license | Weights license | Notes |
|---|---|---|---|---|---|
| `fake` | — (stdlib) | built-in | — | — | deterministic text / minimal-schema JSON, CI guarantee |
| `llama-cpp` | `llama-cpp-python` | `gen` | **MIT** | **operator's choice** | in-process GGUF; weights via `LLM_MODEL_PATH` |

**Weights (operator picks — NOT bundled, air-gapped):** free-licensed 1–4B
references — **Qwen2.5-1.5B/3B-Instruct** (Apache 2.0), **Llama-3.2-1B/3B-Instruct**
(Llama 3.2 Community, check AUP). Rejected class: non-commercial-only weights
(class of the rejected voice-f5, ADR 065). No hardcoded model URL in code.

Build-time libs: **FastAPI** `>=0.115`, **pydantic-settings** `>=2.3`,
**llama-cpp-python** `>=0.3` (MIT, self-contained — **no torch**, unlike image).
**uv** toolchain.

## Зона ответственности

### Owns
- `backend/llm/` полностью (src, tests, pyproject, uv.lock, project.json, docs).

### Не трогает
- `backend/image/`, `backend/voice/` (owner-backend-image / voice — эталон формы,
  зеркалим, не правим).
- `backend/learn/`, `backend/community/` (owner-learn / community — консумеры /llm
  отдельным тактом; judge-промпты живут у НИХ, не тут).
- `docker/gateway/nginx.conf` (architect — сервис ВНУТРЕННИЙ, маршрута нет by design).
- `.github/` CI workflows (architect добавит `llm` job после первого зелёного pytest).
- Front-end consumers (`apps/*`, `packages/*`).

## Публичный API (контракт ADR 074)

HTTP, prefix `/llm` (внутренний — gateway-маршрута НЕТ):
- `GET /health` → `{"status":"ok"}`
- `GET /llm/engines` → `{engines: string[], default: string}` — форма = image/voice.
- `POST /llm/generate {prompt, system?, schema?, max_tokens?=512, temperature?=0.2, engine?}`
  → `{"text": string}` либо `{"json": object}` при `schema` (llama.cpp
  json-schema/grammar enforcement — валидный конформный JSON гарантирован движком).
  - `422` пустой prompt / `max_tokens` вне `[1,8192]` / `temperature` вне `[0,2]`;
  - `400` неизвестный engine;
  - `503` `llama-cpp` без `LLM_MODEL_PATH` («model not configured») ИЛИ extra `gen`
    не установлен;
  - `502` движок вернул невалидный JSON при schema (defensive, не должно случаться).

Без кэша (в отличие от image/voice — генерация не детерминирована по sampling).
Изменение контракта = breaking change → координировать с architect (ADR).

## Quirks / gotchas

- **Python 3.12** (`requires-python = ">=3.12,<3.13"`) — зеркало image. llama-cpp-python
  возит cp312-колёса. `<3.13` — в шаге с остальным backend py-стеком.
- **Engine = lazy extra** — base `uv sync --extra dev` НЕ ставит llama-cpp; движок
  грузится только по первому запросу (`engine.py` `_FACTORIES` → `engines/llamacpp.py`).
  CI гоняет тесты без ML-стека, `fake` покрывает весь контракт.
- **НЕ torch** — llama.cpp самодостаточен (в ОТЛИЧИЕ от image `gen`, который тянет
  torch/diffusers). CPU-колесо дефолт; CUDA-колесо за `--extra-index-url` (README GPU).
- **Два разных 503** — (1) `EngineNotConfigured` (нет `LLM_MODEL_PATH`, air-gapped
  веса не подложены) → «model not configured»; (2) `ModuleNotFoundError` (extra `gen`
  не синкнут) → «uv sync --extra gen». Config-гейт проверяется ПЕРЕД импортом, поэтому
  «нет весов» ловится даже без установленного `llama-cpp-python`.
- **`fake` — не заглушка, а движок** — без schema детерминированный echo-шаблон
  (`[fake] <prompt>`); со schema минимальный валидный по JSON-Schema объект
  (`_minimal_instance`: required-ключи, enum→первый, string→"", int/number→0, array→[]).
  Достаточно чтобы контракт `{json}` парсился в CI; реальная конформность — дело модели.
- **`schema` в теле — alias** — поле pydantic `json_schema` с `alias="schema"`
  (иначе конфликт с `BaseModel.schema`). Wire-ключ остаётся `schema`.
- **curl 127.0.0.1, не localhost** — `::1` (IPv6) резолв виснет на Windows.
- **Air-gapped** — веса user-supplied; никаких download/URL в коде (ADR 065).
- **Внутренний сервис** — публичного фронт-чата НЕТ на этом такте; появится с
  agent-loop отдельным решением. Не заводить gateway-маршрут без ADR.

## Live-smoke (llama-cpp)

- **fake:** ✅ verified via pytest (contract). Live: `uv run uvicorn ... && curl -X POST
  127.0.0.1:8007/llm/generate -d '{"prompt":"hi","engine":"fake"}'`.
- **llama-cpp:** ⚠️ НЕ verified на весах в этой сессии — GGUF не подкладывался.
  Код по llama-cpp-python-канону (`create_chat_completion`, `response_format`
  json_object+schema). Запуск на железе:
  `uv sync --extra gen && LLM_MODEL_PATH=/path/model.gguf LLM_REAL=1 uv run pytest -k real`,
  либо live uvicorn + curl `engine=llama-cpp`. При первом успешном прогоне — обновить статус.

## План рефакторинга / оптимизаций

- [ ] **Live llama-cpp verify на GGUF (1–4B)** — снять ⚠️. (priority: high)
- [ ] **Первый backend-консумер** (community judge / learn checker) — отдельный бриф,
  не наша зона (промпты у них). (n/a)
- [ ] **Sampling-параметры** (top_p, stop, seed) в контракт — по мере надобности консумеров. (priority: low)
- [x] **Bootstrap: каркас + fake + llama-cpp + tests** (2026-07-05).

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit/contract | `tests/test_llm.py` | registry, /llm/engines, /llm/generate (fake), 400/422/502/503-ветки, /health |
| Schema | `tests/test_llm.py` | fake+schema → валидный по JSON-Schema `{json}`; invalid-JSON → 502 |
| Real inference | `tests/test_llm.py` (`*_real`) | opt-in через `LLM_REAL=1` + `LLM_MODEL_PATH` (CI не ставит) |

**Перед изменением:** `uv run pytest` green. **Lint:** `uv run ruff check .`.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `backend/image` (эталон формы) | owner-backend-image |
| `backend/community` (judge-консумер, ADR 073) | owner-community |
| `backend/learn` (checker-консумер, ADR 069) | owner-learn |
| CI workflows | architect |

## Release group

Не публикуется в npm/PyPI — деплоится как сервис (Docker/deploy — зона architect, отложено).

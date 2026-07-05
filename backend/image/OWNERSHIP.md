---
name: backend-image
owner-agent: owner-backend-image
group: backend (not released to npm)
zone: backend
status: alpha
priority: P1
last-updated: 2026-07-04
---

# backend-image

Stateless text-to-image capability service (FastAPI, Python 3.12, port :8005) —
the visual mirror of `backend/voice`. Pluggable engines behind an `ImageEngine`
Protocol + lazy registry, per-request A/B via `?engine=`, disk-cached PNG output.
Generates images for words (word-as-image teacher). Prod target = Docker/Linux
(dev on Windows).

## Состояние (читать ПЕРВЫМ)

- **Zone:** backend (Python capability service, ADR 054/065/067).
- **Status:** alpha — bootstrapped as the image mirror of `backend/voice` (ADR 067),
  contract-first: `fake` engine + full HTTP/cache contract green, torch engines
  (sdxl-turbo/flux-schnell) written but not live-verified (see blockers).
- **Priority:** P1 — second capability service of the ADR 067 decomposition.
- **Maturity bar:** live-smoke of `sdxl-turbo` on real GPU; learn-выдача integration
  (separate brief backend-learn); front-end engine switcher (separate brief apps);
  CI job wired by architect.
- **Active blockers:** нет для контракта. Torch-движки НЕ прогонялись на весах —
  нет подтверждённого GPU в dev-сессии (см. «Live-smoke» ниже). `fake` — контрактный
  гарант, остальное verify требует железа.
- **Roadmap:** live sdxl-turbo verify, cache eviction/size-cap (сейчас неограниченный
  диск-рост), external image APIs (deferred by user).
- **Last activity:** 2026-07-04 — bootstrap (caркас + fake + sdxl/flux + disk-cache + tests).

## Vendor stack + licenses (лицензионный гейт СРАЗУ — урок voice)

| Engine | Package | Extra | License | Commercial-OK | Notes |
|---|---|---|---|---|---|
| `fake` | — (stdlib) | built-in | — | ✅ | deterministic 1×1 PNG, no ML, CI guarantee |
| `sdxl-turbo` | `diffusers` (`stabilityai/sdxl-turbo`) | `gen` | **OpenRAIL++** | ✅ | baseline default, 1-4 steps, modest GPU |
| `flux-schnell` | `diffusers` (`black-forest-labs/FLUX.1-schnell`) | `gen`+`gen-flux` | **Apache 2.0** | ✅ | not default, ~12GB+ VRAM |

**Rejected (licensing):**
- **FLUX.1-dev** — non-commercial license (class of the rejected voice-f5, ADR 065).
  НЕ добавлять без нового обоснования.
- **External image APIs** (Midjourney / Stability / DALL·E / …) — отложены user'ом;
  были бы отдельными будущими движками (ADR 065 library-not-service: внешние API — не default).

Build-time libs: **FastAPI** `>=0.115`, **pydantic-settings** `>=2.3`,
**diffusers** `>=0.30` (Apache 2.0), **torch** `>=2.2` (BSD), **transformers**
`>=4.40` (Apache 2.0), **Pillow** `>=10` (HPND). **uv** toolchain.

## Зона ответственности

### Owns
- `backend/image/` полностью (src, tests, pyproject, uv.lock, project.json, docs).

### Не трогает
- `backend/voice/` (owner-backend-voice — эталон, зеркалим форму, не правим).
- `backend/learn/` (owner-learn — интеграция image-выдачи отдельным тактом).
- `backend/scriber/`, `backend/fs/` (owner-scriber / shared).
- `docker/gateway/nginx.conf` (architect — маршрут `/api/image/` уже заведён).
- `.github/` CI workflows (architect добавит `image` job после первого зелёного pytest).
- Front-end consumers (`apps/*`, `packages/*`).

## Публичный API (контракт ADR 067)

HTTP, prefix `/image` (gateway: `/api/image/<rest>` → `:8005/image/<rest>`):
- `GET /health` → `{"status":"ok"}`
- `GET /image/engines` → `{engines: string[], default: string}` — форма = voice (фронт-свичер).
- `GET /image/render?prompt=&engine=&size=&seed=` → `image/png`
  - `422` на пустой prompt / плохой `size` (формат `WxH`, каждая ось `[64, 2048]`);
  - `400` на неизвестный engine;
  - `503` если extra движка не установлен в текущем venv.
- `/image/render` кэшируется: `Cache-Control: public, max-age=86400` +
  `ETag` (sha256 канонических `engine|size|seed|prompt`, engine — resolved) +
  `304` на `If-None-Match`; **диск-кэш** (один PNG-файл на хэш под `CACHE_DIR`),
  переживает рестарт (в отличие от voice in-memory LRU). Ошибки не кэшируются.

Изменение контракта = breaking change → координировать с architect (ADR).

## Quirks / gotchas

- **Python 3.12** (`requires-python = ">=3.12,<3.13"`) — В ОТЛИЧИЕ от voice (3.11).
  diffusers/torch возят cp312-колёса, «стены Chatterbox/XTTS» тут нет. `<3.13` —
  только потому что torch cp313-колёса запаздывают. Не поднимать без проверки torch.
- **Engines = lazy extras** — base `uv sync --extra dev` НЕ ставит torch; движки
  грузятся только по первому запросу (`engine.py` `_FACTORIES`). CI гоняет тесты
  без ML-стека, `fake` покрывает весь контракт.
- **`fake` — не заглушка, а движок** — детерминированный pure-stdlib PNG-энкодер
  (`engines/fake.py`), цвет из sha256(prompt|size|seed). Валидный `\x89PNG`, 1×1.
- **flux требует ДВА extra** — `--extra gen --extra gen-flux` (T5-токенизатор:
  sentencepiece+protobuf поверх torch/diffusers). Один `gen` даст `sdxl-turbo`, но
  FluxPipeline упадёт на импорте токенизатора.
- **sdxl-turbo: guidance_scale=0.0** обязателен (guidance-distilled), 1-4 шага.
  flux-schnell так же (timestep-distilled), 4 шага, `max_sequence_length=256`.
- **Диск-кэш неограничен** — сейчас нет eviction/size-cap, `.cache/` растёт. TODO ниже.
- **curl 127.0.0.1, не localhost** — `::1` (IPv6) резолв виснет на Windows.
- **Air-gapped** — веса качаются с HF по умолчанию; снапшоты + `SDXL_MODEL_PATH`/
  `FLUX_MODEL_PATH` на локальные копии. Никаких хардкод-URL в коде (ADR 065).

## Live-smoke (torch-движки)

- **fake:** ✅ verified — pytest + live uvicorn `GET /image/render?engine=fake` → PNG.
- **sdxl-turbo / flux-schnell:** ⚠️ НЕ verified на весах в этой сессии — нет
  подтверждённого GPU. Код написан по diffusers-канону (AutoPipelineForText2Image /
  FluxPipeline, guidance 0, few-steps). Запуск на железе:
  `uv sync --extra gen && IMAGE_REAL_ENGINES=sdxl-turbo uv run pytest -k real`, либо
  live `uv run uvicorn ... && curl "127.0.0.1:8005/image/render?prompt=cat&engine=sdxl-turbo" -o out.png`.
  При первом успешном прогоне — обновить статус здесь.

## План рефакторинга / оптимизаций

- [ ] **Live sdxl-turbo verify на GPU** — снять ⚠️ с torch-движков. (priority: high)
- [ ] **Cache eviction / size-cap** — сейчас диск-кэш растёт неограниченно. (priority: med)
- [ ] **learn-выдача интеграция** — отдельный бриф backend-learn (не наша зона). (n/a)
- [x] **Bootstrap: каркас + fake + sdxl/flux + disk-cache + 15 тестов** (2026-07-04).

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit/contract | `tests/test_image.py` | registry, /image/engines, /image/render (fake), 400/422/503-ветки, /health |
| Cache | `tests/test_image.py` | disk hit/miss (generate-once), ETag, 304 без генерации, varies-by-params |
| Real generation | `tests/test_image.py` (`*_real`) | opt-in через `IMAGE_REAL_ENGINES` (CI не ставит) |

**Перед изменением:** `uv run pytest` green. **Lint:** `uv run ruff check .`.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `backend/voice` (эталон формы) | owner-backend-voice |
| `backend/learn` (будущий консумер image-выдачи) | owner-learn |
| `docker/gateway` (маршрут `/api/image/`) | architect |
| CI workflows | architect |

## Release group

Не публикуется в npm/PyPI — деплоится как сервис (Docker/deploy — зона architect, отложено).

---
name: backend-voice
owner-agent: owner-backend-voice
group: backend (not released to npm)
zone: backend
status: alpha
priority: P1
last-updated: 2026-07-03
---

# backend-voice

Stateless TTS capability service (FastAPI, Python 3.11, port :8001) — three pluggable engines (piper, kokoro, chatterbox) behind a Protocol + lazy registry, per-request A/B via `?engine=`. Prod target = Docker/Linux (dev on Windows, no platform-specific engines).

## Состояние (читать ПЕРВЫМ)

- **Zone:** backend (Python capability service, ADR 054/065/067).
- **Status:** alpha — extracted from `backend/learn` (ADR 067 D1), contract fixed (D2), Chatterbox added.
- **Priority:** P1 — first capability service of the ADR 067 decomposition.
- **Maturity bar:** STT/scoring (ADR 065 phase 3), consumers switched off `learn`'s voice module, CI job wired by architect.
- **Active blockers:** нет.
- **Roadmap:** STT endpoint (next wave), WebSocket streaming (deferred).
- **Last activity:** 2026-07-05 — persistent MinIO tier + `/voice/warm` (ADR 076, brief voice-persist-1).

## Vendor stack

- **FastAPI** (`fastapi` `>=0.115`) — HTTP layer. https://fastapi.tiangolo.com/
- **pydantic-settings** (`>=2.3`) — env config. https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- **Piper** (`piper-tts` `>=1.3`, extra `voice-piper`) — fastest, small ONNX voices, CPU realtime. https://github.com/OHF-Voice/piper1-gpl
- **Kokoro** (`kokoro` `>=0.8`, extra `voice-kokoro`) — light TTS, CPU-friendly. https://github.com/hexgrad/kokoro
- **Chatterbox** (`chatterbox-tts` `>=0.1`, extra `voice-chatterbox`) — Resemble AI TTS + voice cloning, MIT. https://github.com/resemble-ai/chatterbox
- **MinIO** (`minio` `>=7.2`, base dep) — S3-compatible object store client for the persistent voice tier (ADR 076). Pure-Python, light; the tier is off until `MINIO_ENDPOINT` is set. https://min.io/docs/minio/linux/developers/python/API.html
- **uv** — toolchain (venv + lock). https://docs.astral.sh/uv/

## Лицензии движков (канон ростера)

Канон — **library-not-service** (ADR 065: torch-библиотеки in-process ок; внешние сервисы нет) + только commercial-friendly лицензии. Ростер вычищен 2026-07-04.

| Engine | Пакет | Лицензия | Вердикт |
|---|---|---|---|
| `kokoro` | `kokoro` | Apache-2.0 | ✅ в ростере — permissive, CPU-friendly, дефолт. |
| `chatterbox` | `chatterbox-tts` | MIT | ✅ в ростере — единственный cloning-движок; torch in-process. |
| `piper` | `piper-tts` | MIT (GPL-derived tooling, runtime ok) | ✅ в ростере — быстрейший, локальный. |
| ~~`edge`~~ | `edge-tts` | — | ❌ выпилен 2026-07-04 — **облачный сервис Microsoft**, нарушает канон library-not-service (внешний сервис, air-gapped не работает). |
| ~~`f5`~~ | `f5-tts` | CC-BY-NC | ❌ выпилен 2026-07-04 — **non-commercial** лицензия, отклонена прецедентом ADR 065 (как XTTS). |
| ~~`xtts`~~ | `TTS` (Coqui) | CPML (non-commercial) | ❌ выпилен 2026-07-03 — non-commercial лицензия + venv-конфликт с chatterbox (`transformers` pin); ниша перекрыта chatterbox (MIT). |

## Зона ответственности

### Owns
- `backend/voice/` полностью (src, tests, pyproject, uv.lock, project.json, docs).

### Не трогает
- `backend/learn/` (owner-learn — его voice-модуль чистится отдельным тактом).
- `backend/scriber/`, `backend/fs/` (owner-scriber / shared).
- `.github/` CI workflows (architect).
- Front-end consumers (`apps/*`, `packages/*`).

## Публичный API (контракт ADR 067 D2 — зафиксирован)

HTTP, prefix `/voice`:
- `GET /health` → `{"status":"ok"}`
- `GET /voice/engines` → `{engines: string[], default: string}`
- `GET /voice/speak?text=&engine=&lang=&voice=&speed=&kind=` → `audio/wav`; 400 на пустой text / неизвестный engine; 503 если extra движка не установлен в текущем venv.
- `/voice/speak` кэшируется тремя ярусами: `Cache-Control: public, max-age=86400` + `ETag` (sha256 канонических параметров `engine|lang|voice|speed|text|VOICE_MODEL_VERSION`, engine — resolved) + `304` на `If-None-Match`; **persist-ярус (ADR 076)** — MinIO для `kind` ∈ `words`|`phrases` (ключ `voice/<kind>/<engine>/<sha>.wav`); серверный in-memory LRU 512 записей (~30MB, держит и `dynamic`). Ошибки не кэшируются.
- `kind` (query, дефолт `dynamic`) = политика хранения, **не** входит в ETag. `dynamic` → только LRU; `words`/`phrases` → persist. **Graceful:** любая ошибка MinIO → warning + проваливание в LRU+синтез, никогда 5xx на speak.
- `POST /voice/warm` — body `{texts: [{text, lang?, voice?, speed?}], engines: [str], kind: words|phrases}`. Идемпотентно pre-синтезирует curated-клипы в persist-ярус (существующий ключ → skip). Возвращает `{generated, skipped}`; ошибка одной пары не валит батч. Для warm-at-ingest (learn ingest → brief 2).

Изменение контракта = breaking change → координировать с architect (ADR).

## Quirks / gotchas

- **Python строго 3.11** (`requires-python = ">=3.11,<3.12"`) — Chatterbox/XTTS не собираются под 3.13 (ADR 065 §3). Не поднимать версию без проверки всего engine-стека.
- **Engines = lazy extras** — base `uv sync --extra dev` НЕ ставит torch; движки грузятся только по первому запросу (`engine.py` `_FACTORIES`). CI гоняет тесты без ML-стека.
- **chatterbox-tts строго `>=0.1.7`** — 0.1.6 пинит numpy<1.26 (конфликт с остальными), ≤0.1.5 тянет битый build pkuseg.
- **Chatterbox `speed` игнорируется** — у модели нет нативного speed-контроля; `voice` для chatterbox = путь к референс-клипу (cloning), не имя голоса.
- **Первый запрос тяжёлых движков** качает модель с HF (гигабайты) и грузит минуты на CPU — норма, кэшируется in-process.
- **Persist-ярус best-effort** — `storage.py` НИКОГДА не бросает наверх: init/get/put/exists ловят всё → warning + `None`/`False`. MinIO-клиент строится лениво один раз; отсутствие `MINIO_ENDPOINT` = ярус выключен навсегда (не ретраит), transient-сбой init = `None` без latching (ретрай следующим запросом). `speak` дополнительно гардит `storage.get/put` (defence-in-depth: контракт «storage не даёт 5xx на speak»). Тесты мокают `storage.get/put/exists` — реальный `minio` в CI не импортируется (ленивый импорт внутри функций).
- **Windows dev: не `uv sync` под запущенным сервером** — uvicorn держит .pyd/DLL, sync падает или оставляет битый пакет (прецедент: полуустановленный transformers → `cannot import name 'pipeline'`). Сначала стоп сервера. И TaskStop у фонового `uv run uvicorn` убивает shell, но НЕ python-потомка — добивать процесс на :8001 руками.
- **StyleTTS2 выброшен** — pip-обёртка битая (ADR 065 §отклонено). pyttsx3/SAPI отклонён (OS-биндинги, prod=Docker). Не возвращать.
- **XTTS выброшен (2026-07-03)** — конфликтовал с chatterbox по venv (`transformers` pin) + CPML non-commercial лицензия; ниша (cloning + мультиязычность) перекрывалась chatterbox (MIT). Не возвращать без нового обоснования.
- **f5 выброшен (2026-07-04)** — CC-BY-NC (non-commercial), отклонён прецедентом ADR 065. Не возвращать без нового обоснования.
- **edge выброшен (2026-07-04)** — облачный сервис Microsoft, нарушает канон library-not-service (air-gapped не работал). Не возвращать.

## План рефакторинга / оптимизаций

- [ ] **STT/scoring** — ADR 065 фаза 3, следующая волна. (priority: high)
- [ ] **Kokoro lang_code из `lang`** — сейчас захардкожен American English. (priority: low)
- [x] **Персистентный MinIO-ярус + `/voice/warm`** — ADR 076 / brief voice-persist-1. Curated (`words`/`phrases`) кладётся в MinIO раз, `dynamic` только LRU. `VOICE_MODEL_VERSION` в hash-ключе; graceful degrade при недоступном MinIO (2026-07-05).
- [x] **Чистка ростера по канону лицензий/library-not-service** — f5 (CC-BY-NC) и edge (облачный сервис MS) выпилены; ростер = kokoro/chatterbox/piper; license-таблица зафиксирована (2026-07-04).
- [x] **Отсев движков по итогам ушного A/B** — xtts убран (venv-конфликт с chatterbox + лицензия), chatterbox остался единственным cloning-движком с torch-конфликтом (2026-07-03).
- [x] **Вынос из learn + ChatterboxEngine + dep-долг kokoro→transformers в uv.lock** (2026-07-03).
- [x] **+4 движка (piper/edge/xtts/f5) + conflict-механика chatterbox×xtts** (2026-07-03).
- [x] **Кэш /voice/speak: HTTP (Cache-Control/ETag/304) + серверный LRU** (2026-07-03).

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit/contract | `tests/test_voice.py` | registry, /voice/engines, /voice/speak (fake engine), 400-ветки, /health |
| Persist tier | `tests/test_voice.py` (mock storage + counting engine) | MinIO-hit skips synth, `dynamic` no-put, `words` put-after-synth, version-bump → new key, get-error graceful 200, `/voice/warm` идемпотентность + per-pair failure isolation |
| Real synthesis | `tests/test_voice.py` (`*_real`) | opt-in через `VOICE_REAL_ENGINES` |

**Перед изменением:** `uv run pytest` green. **Lint:** `uv run ruff check .`.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `backend/learn` (бывший хозяин voice-модуля) | owner-learn |
| `backend/scriber` | owner-scriber |
| CI workflows | architect |

## Release group

Не публикуется в npm/PyPI — деплоится как сервис (Docker/deploy — зона architect, отложено).

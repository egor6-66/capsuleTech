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

Stateless TTS capability service (FastAPI, Python 3.11, port :8001) — six pluggable engines (piper, kokoro, edge, chatterbox, xtts, f5) behind a Protocol + lazy registry, per-request A/B via `?engine=`. Prod target = Docker/Linux (dev on Windows, no platform-specific engines).

## Состояние (читать ПЕРВЫМ)

- **Zone:** backend (Python capability service, ADR 054/065/067).
- **Status:** alpha — extracted from `backend/learn` (ADR 067 D1), contract fixed (D2), Chatterbox added.
- **Priority:** P1 — first capability service of the ADR 067 decomposition.
- **Maturity bar:** STT/scoring (ADR 065 phase 3), consumers switched off `learn`'s voice module, CI job wired by architect.
- **Active blockers:** нет.
- **Roadmap:** STT endpoint (next wave), audio cache (deferred), WebSocket streaming (deferred).
- **Last activity:** 2026-07-03 — extraction + ChatterboxEngine.

## Vendor stack

- **FastAPI** (`fastapi` `>=0.115`) — HTTP layer. https://fastapi.tiangolo.com/
- **pydantic-settings** (`>=2.3`) — env config. https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- **Piper** (`piper-tts` `>=1.3`, extra `voice-piper`) — fastest, small ONNX voices, CPU realtime. https://github.com/OHF-Voice/piper1-gpl
- **Kokoro** (`kokoro` `>=0.8`, extra `voice-kokoro`) — light TTS, CPU-friendly. https://github.com/hexgrad/kokoro
- **edge-tts** (`edge-tts` `>=6.1`, extra `voice-edge`) — Microsoft Edge neural voices, NETWORK-only. https://github.com/rany2/edge-tts
- **Chatterbox** (`chatterbox-tts` `>=0.1`, extra `voice-chatterbox`) — Resemble AI TTS + voice cloning, MIT. https://github.com/resemble-ai/chatterbox
- **Coqui XTTS-v2** (`coqui-tts` `>=0.25`, extra `voice-xtts`) — multilingual + cloning, weights CPML (non-commercial). https://github.com/idiap/coqui-ai-TTS
- **F5-TTS** (`f5-tts` `>=1.0`, extra `voice-f5`) — SOTA flow-matching, cloning-first, slowest. https://github.com/SWivid/F5-TTS
- **uv** — toolchain (venv + lock). https://docs.astral.sh/uv/

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
- `GET /voice/speak?text=&engine=&lang=&voice=&speed=` → `audio/wav`; 400 на пустой text / неизвестный engine; 503 если extra движка не установлен в текущем venv.
- `/voice/speak` кэшируется: `Cache-Control: public, max-age=86400` + `ETag` (sha256 канонических параметров, engine — resolved) + `304` на `If-None-Match`; серверный in-memory LRU 512 записей (~30MB). Ошибки не кэшируются, диск-кэша нет.

Изменение контракта = breaking change → координировать с architect (ADR).

## Quirks / gotchas

- **Python строго 3.11** (`requires-python = ">=3.11,<3.12"`) — Chatterbox/XTTS не собираются под 3.13 (ADR 065 §3). Не поднимать версию без проверки всего engine-стека.
- **Engines = lazy extras** — base `uv sync --extra dev` НЕ ставит torch; движки грузятся только по первому запросу (`engine.py` `_FACTORIES`). CI гоняет тесты без ML-стека.
- **chatterbox × xtts НЕ живут в одном venv** — chatterbox 0.1.7 пинит transformers ТОЧНО `==5.2.0`, coqui-tts падает на 5.x (`isin_mps_friendly` удалён) → cap `transformers>=4.57,<5` живёт ВНУТРИ extra `voice-xtts` (НЕ глобально — глобальный constraint ломает chatterbox). Задекларировано в `[tool.uv].conflicts`; lock держит оба мира, ставится один ИЛИ другой.
- **chatterbox-tts строго `>=0.1.7`** — 0.1.6 пинит numpy<1.26 (конфликт с остальными), ≤0.1.5 тянет битый build pkuseg.
- **Chatterbox `speed` игнорируется** — у модели нет нативного speed-контроля; `voice` для chatterbox/xtts/f5 = путь к референс-клипу (cloning), не имя голоса.
- **f5: кастомный референс требует ffmpeg** (whisper-транскрипция); дефолтный референс идёт с известным транскриптом — whisper не дёргается.
- **Первый запрос тяжёлых движков** качает модель с HF (гигабайты) и грузит минуты на CPU — норма, кэшируется in-process.
- **edge — сетевой** (Microsoft endpoint), air-gapped не работает; mp3→wav декодится через libsndfile (mp3-support в wheels soundfile).
- **Windows dev: не `uv sync` под запущенным сервером** — uvicorn держит .pyd/DLL, sync падает или оставляет битый пакет (прецедент: полуустановленный transformers → `cannot import name 'pipeline'`). Сначала стоп сервера. И TaskStop у фонового `uv run uvicorn` убивает shell, но НЕ python-потомка — добивать процесс на :8001 руками.
- **StyleTTS2 выброшен** — pip-обёртка битая (ADR 065 §отклонено). pyttsx3/SAPI отклонён (OS-биндинги, prod=Docker). Не возвращать.

## План рефакторинга / оптимизаций

- [ ] **STT/scoring** — ADR 065 фаза 3, следующая волна. (priority: high)
- [ ] **Kokoro lang_code из `lang`** — сейчас захардкожен American English. (priority: low)
- [ ] **Отсев движков по итогам ушного A/B** — оставить победителей по нишам speed/quality. (priority: medium)
- [x] **Вынос из learn + ChatterboxEngine + dep-долг kokoro→transformers в uv.lock** (2026-07-03).
- [x] **+4 движка (piper/edge/xtts/f5) + conflict-механика chatterbox×xtts** (2026-07-03).
- [x] **Кэш /voice/speak: HTTP (Cache-Control/ETag/304) + серверный LRU** (2026-07-03).

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit/contract | `tests/test_voice.py` | registry, /voice/engines, /voice/speak (fake engine), 400-ветки, /health |
| Real synthesis | `tests/test_voice.py` (`*_real`) | opt-in через `VOICE_MODEL_AVAILABLE` / `VOICE_CHATTERBOX_AVAILABLE` |

**Перед изменением:** `uv run pytest` green. **Lint:** `uv run ruff check .`.

## Cross-package dependencies

| Зона | Owner |
|---|---|
| `backend/learn` (бывший хозяин voice-модуля) | owner-learn |
| `backend/scriber` | owner-scriber |
| CI workflows | architect |

## Release group

Не публикуется в npm/PyPI — деплоится как сервис (Docker/deploy — зона architect, отложено).

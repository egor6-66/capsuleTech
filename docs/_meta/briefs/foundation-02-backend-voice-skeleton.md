---
title: Foundation 02 — backend/voice/ skeleton (Python FastAPI, mock endpoints)
status: superseded # ADR 067 → актуальный бриф backend-voice-extract.md (вынос реального TTS из learn, Python 3.11, без mock/capsule-data)
audience: general-purpose agent (commit-only, без push)
last_updated: 2026-06-20
depends_on: [foundation-00, foundation-01]
unlocks: [foundation-04]
adr_refs: [054, 055]
---

# Контекст

ADR 054 (поправленный): `backend/voice/` — Python-сервис, все три слоя бриф'а `voice-module` (TTS + STT + phoneme scoring) в одном процессе. Server-first архитектура; никаких ONNX/WASM в браузере (см. note в ADR 054 §Context — capsule self-host first, не SaaS).

Этот бриф — **скелет**, не реальная реализация моделей. Endpoints возвращают mock-данные правильного формата (см. бриф voice §6). Реальные модели (Piper/Kokoro для TTS, faster-whisper для STT, wav2vec2 для скоринга) — последующие PR.

# Scope

Создать `backend/voice/` со скелетом FastAPI-сервиса. Эндпоинты возвращают валидный mock. Зависит от `packages/shared/data/py` (даже если БД пока не используется — установить как dep, чтобы граф nx был корректным).

Работа **напрямую в `main`**. Без ветки. Commit-only **без push**. Хук `git-gate` сработает на `switch`/`push` — STOP, не обходи.

# Структура

```
backend/voice/
├── pyproject.toml
├── uv.lock
├── project.json                    ← nx targets test:py / lint:py / build:py / serve
├── README.md                       ← как поднять (uv run uvicorn ...), env vars
├── .env.example                    ← VOICE_PORT, MODEL_DIR (placeholder)
├── src/
│   └── capsule_voice/
│       ├── __init__.py
│       ├── main.py                 ← FastAPI app factory; uvicorn entry
│       ├── config.py               ← settings (pydantic-settings)
│       ├── api/
│       │   ├── __init__.py
│       │   ├── tts.py              ← POST /tts → audio/wav (mock: 1-sec silence WAV)
│       │   ├── stt.py              ← POST /stt → { transcript }
│       │   └── score.py            ← POST /score → PronunciationResult (mock)
│       ├── models/
│       │   ├── __init__.py
│       │   ├── tts.py              ← pydantic TTSRequest (бриф §6)
│       │   ├── stt.py              ← STTRequest / STTResponse
│       │   └── score.py            ← PronunciationTarget / Result / WordScore / PhonemeScore
│       └── engines/
│           ├── __init__.py
│           └── README.md           ← TODO: реальные движки сюда (Piper, faster-whisper, wav2vec2)
└── tests/
    ├── conftest.py
    ├── test_tts.py
    ├── test_stt.py
    └── test_score.py
```

# Контракты эндпоинтов

Все pydantic-модели в `models/` 1:1 повторяют TS-интерфейсы из бриф'а voice-module §6:

- `TTSRequest { text, voice, rate?, accent? }`
- `PronunciationTarget { text, ipa, words }`
- `PronunciationResult { overallScore, transcript, words: WordScore[] }`
- `WordScore { word, score, phonemes: PhonemeScore[] }`
- `PhonemeScore { expected, actual, score, errorType, lessonTag?, feedback? }`

## Mock-ответы

- **POST /tts** `{ text: "hello", voice: "af_heart" }` → `Content-Type: audio/wav`, body = валидный 1-sec silent WAV (PCM 16-bit 22050Hz). Самый простой генератор — `wave` stdlib.
- **POST /stt** `{ audio: base64 }` → `{ "transcript": "[mock STT — text would go here]" }`.
- **POST /score** `{ audio: base64, expected_text: "hello" }` → mock `PronunciationResult` с одним словом "hello" и 5 phoneme-records (h, ɛ, l, oʊ, ...), всё `errorType: "correct"`, `overallScore: 100`.

## Health & meta

- `GET /health` → `{ "status": "ok" }`
- `GET /version` → `{ "version": "0.0.0", "service": "voice" }`

# pyproject.toml

```toml
[project]
name = "capsule-voice"
version = "0.0.0"
description = "Capsule voice service: TTS + STT + phoneme scoring."
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "pydantic>=2.0",
    "pydantic-settings>=2.0",
    "capsule-data",
]

[tool.uv.sources]
capsule-data = { path = "../../packages/shared/data/py", editable = true }

[project.optional-dependencies]
dev = ["pytest>=8.0", "httpx>=0.27", "ruff>=0.5", "mypy>=1.10"]

[tool.uv]
dev-dependencies = ["pytest", "httpx", "ruff", "mypy"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/capsule_voice"]
```

# project.json

`name`: `capsule-voice`. Та же структура target'ов что в `capsule-data-py` (`install`, `test:py`, `lint:py`, `build:py`), плюс:

```jsonc
"serve": {
  "executor": "nx:run-commands",
  "options": {
    "command": "uv run uvicorn capsule_voice.main:app --reload --port 8001",
    "cwd": "backend/voice"
  },
  "dependsOn": ["install"]
}
```

# Tests

`tests/conftest.py` — FastAPI `TestClient` fixture.

Минимум:
- `test_tts.py` — happy-path → returns audio/wav, content-length > 0.
- `test_stt.py` — happy-path → returns `{ transcript: ... }`.
- `test_score.py` — happy-path → returns valid `PronunciationResult` schema (pydantic validates).
- `test_health.py` — `/health` returns 200.

# Acceptance

- `nx run capsule-voice:install` — OK.
- `nx run capsule-voice:test:py` — все зелёные.
- `nx run capsule-voice:lint:py` — без ошибок.
- `nx run capsule-voice:serve` — поднимает на :8001, `curl http://localhost:8001/health` → `{"status":"ok"}`.
- `nx graph` — `capsule-voice` зависит от `capsule-data-py`.

# Что НЕ делаем

- Реальные модели (Piper/Kokoro/Whisper/wav2vec2) — НЕТ. Только mock.
- БД-миграции — НЕТ (voice сейчас stateless, но `capsule-data` стоит как dep — пригодится позже для cache).
- WebSocket streaming — НЕТ. Только HTTP POST на старте.
- Auth — НЕТ.
- Docker — НЕТ (отдельный бриф позже).
- Frontend integration — НЕТ (`packages/web/runtime/voice/` — отдельный бриф вне foundation-серии).

# Дальше

После мержа `backend/learn/orchestrator.py` сможет вызывать voice по `VOICE_URL` (default `http://localhost:8001`).

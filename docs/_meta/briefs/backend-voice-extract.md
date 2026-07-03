---
title: backend/voice — вынос TTS из backend/learn (Python 3.11) + ChatterboxEngine
status: ready
audience: owner-сессия `claude-scope -Scope backend-voice` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [054, 065, 067]
supersedes: [foundation-02-backend-voice-skeleton]
---

# Контекст

ADR 067 D1 + ADR 065 фазы 2/6: TTS уезжает из `backend/learn/modules/voice/` в самостоятельный capability-сервис **`backend/voice`** (`backend-voice`, порт **:8001**) на **Python 3.11** — стена 3.13 экосистемная (ADR 065 §3): Chatterbox/StyleTTS2/XTTS собраны под 3.10/3.11, Kokoro — исключение. 3.11 открывает весь SOTA и позволяет A/B Kokoro↔Chatterbox.

Это **вынос копией**: `backend/learn` в этом брифе **НЕ трогаем** (его чистит owner-learn отдельным тактом). Сервис stateless, БД нет.

`backend/voice/project.json` уже создан (bootstrap main).

# Scope

**Часть 1 — перенос (механика):**

| Из learn | В voice |
|---|---|
| `src/capsule_learn/modules/voice/engine.py` (Protocol `TTSEngine` + lazy-реестр) | `src/capsule_voice/engine.py` |
| `src/capsule_learn/modules/voice/api.py` | `src/capsule_voice/api.py` (prefix → `/voice`) |
| `src/capsule_learn/modules/voice/engines/kokoro.py` | `src/capsule_voice/engines/kokoro.py` |
| `tests/test_voice.py` | `tests/test_voice.py` |

**НЕ переносим:** `engines/styletts2.py` — **в мусор** (pip-обёртка битая, ADR 065 §отклонено). Из реестра `_FACTORIES` тоже убрать.

**Часть 2 — ChatterboxEngine (новое):**
- `src/capsule_voice/engines/chatterbox.py` — движок на `chatterbox-tts` (Resemble AI, MIT). Тот же Protocol: `synthesize(text, *, lang, voice, speed) -> WAV bytes`. Lazy-import как у Kokoro (тяжёлый torch-стек не грузится без запроса). `voice` для Chatterbox = путь/имя референс-клипа (voice-cloning) — опционален, дефолтный голос без референса.
- Регистрация в `_FACTORIES` → A/B через существующий per-request `?engine=` работает из коробки (фронт-свитчер уже умеет).
- Замечания по качеству/скорости (CPU vs GPU, время первой загрузки) — в README, это зона voice (ADR 065 §4).

# Контракт (ADR 067 D2 — зафиксирован, не менять)

Prefix **`/voice`** (не `/learn/voice`):

- `GET /voice/engines` → `{ "engines": ["chatterbox","kokoro"], "default": "kokoro" }`.
- `GET /voice/speak?text=&engine=&lang=&voice=&speed=` → `audio/wav` (400 на пустой text / неизвестный engine).
- `GET /health` → `{"status":"ok"}`.

# Детали

- **Python 3.11:** `.python-version` = `3.11` + `requires-python = ">=3.11,<3.12"` в pyproject. `uv python install 3.11` если нет. Проверить, что uv реально создаёт 3.11-venv (`uv run python -V`).
- **pyproject:** `name = "capsule-voice"`; base deps лёгкие (fastapi, uvicorn, pydantic-settings); движки — **opt-in extras** (`voice-kokoro`: kokoro+soundfile+numpy; `voice-chatterbox`: chatterbox-tts+soundfile+numpy) с lazy-import'ом, чтобы CI и base-сервис оставались лёгкими. **Dep-долг из ADR 065 закрыть здесь:** kokoro→transformers/tokenizers должны резолвиться **через `uv sync --extra ...` и попадать в `uv.lock`** (на 3.11 конфликт 3.13 уходит) — никаких `uv pip install` мимо lock'а.
- **config.py:** `port = 8001`, `voice_engine = "kokoro"` (default), `default_lang = "en_US"`, опциональные model-path'ы (kokoro) — паттерн learn/config.py.
- **project.json:** добавить targets `serve` (`uv run uvicorn capsule_voice.main:app --port 8001 --reload`), `test:py`, `lint:py` (cwd `backend/voice`).
- **Тесты:** перенесённый test_voice + smoke на реестр (list_engines = [chatterbox, kokoro], unknown engine → ValueError/400). Синтез-тесты с реальной моделью — только если и так проходят локально; в CI движки не ставятся (extras opt-in) — тестировать реестр/контракт без ML-стека (как сейчас в learn).
- **OWNERSHIP.md** (шаблон `docs/_meta/OWNERSHIP-template.md`) + **README.md** (uv sync с extras, model-паты, air-gapped заметка, A/B через `?engine=`).

# Git

Работа в main tree, **commit-only, без push/веток** (fence + git-gate). Коммитить ТОЛЬКО `backend/voice/**`. Scope-тег: `feat(backend-voice): ...`. Кириллица в сообщении → `git commit -F <file>`.

# Acceptance

1. `uv run python -V` → 3.11.x; `uv sync --extra dev` чисто; `uv.lock` закоммичен.
2. `uv sync --extra dev --extra voice-kokoro --extra voice-chatterbox` — резолвится чисто, lock содержит оба стека (dep-долг закрыт).
3. `uv run pytest` — зелёные (без ML-extras).
4. `uv run ruff check .` — 0.
5. С extras: `uv run uvicorn capsule_voice.main:app --port 8001` → `curl :8001/voice/engines` кажет оба; `curl ":8001/voice/speak?text=hello&engine=kokoro"` → валидный WAV; то же `engine=chatterbox` → WAV (первая загрузка модели долгая — ок).
6. Слепое A/B ухом (kokoro vs chatterbox на 2-3 словах) — субъективная заметка в README/отчёте.
7. В `backend/learn` — **ноль изменений**.

# Что НЕ делаем

- НЕ трогаем `backend/learn`.
- НЕ STT/scoring (ADR 065 фаза 3 — следующая волна), не WebSocket-streaming, не кэш аудио.
- НЕ Docker/deploy, не auth.
- CI-workflow (`.github/`) — зона architect.

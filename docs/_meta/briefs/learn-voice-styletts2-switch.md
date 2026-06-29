---
title: backend/learn voice — StyleTTS2 engine + per-request engine switch
status: ready
audience: owner-сессия backend-learn (scope `backend-learn`)
last_updated: 2026-06-29
adr_refs: [055, "064-A"]
---

# Кто / запуск

Owner `backend/learn` (scope **`backend-learn`**): `.\claude-scope.ps1 -Scope backend-learn`. Read `backend/learn/OWNERSHIP.md`. Commit-only.

# Контекст

Kokoro-движок работает. Хотим **A/B со StyleTTS2** — выбор движка **per-request** (свитчер во фронте). Интерфейс `TTSEngine` + реестр уже есть (`modules/voice/engine.py`) — добавляем второй движок и делаем endpoint engine-параметризуемым.

# Что сделать

## 1. `engines/styletts2.py` — StyleTTS2Engine
Под тот же `TTSEngine` Protocol (`synthesize(text, lang, voice, speed) -> WAV-bytes`, 24kHz).
- Импл — через pip-обёртку **`styletts2`** (`pip install styletts2`): `from styletts2 import tts; m = tts.StyleTTS2(); wav = m.inference(text, ...)` (отдаёт numpy/файл → завернуть в WAV-bytes через soundfile, как kokoro). Модели (LibriTTS) качаются при первом вызове.
- ⚠ **Зависимость espeak-ng (system binary)** — StyleTTS2 через phonemizer требует espeak-ng. Windows: поставить espeak-ng (winget `eSpeak-NG.eSpeak-NG` или инсталлятор), прописать путь если нужно. Без него синтез упадёт — отрази в README/ошибке понятно.
- Ленивая инициализация (модель грузится 1 раз, держать инстанс).

## 2. Реестр — `engine.py`
Добавить `'styletts2'` → StyleTTS2Engine в registry. `get_engine(name)` уже резолвит по имени; убедись что неизвестное имя → понятная 400/ошибка.

## 3. Endpoint — `api.py`: per-request engine
`GET /learn/voice/speak?text=happy&engine=styletts2&voice=&speed=`
- Добавить query-параметр **`engine`** (опц., default = `VOICE_ENGINE` env или `kokoro`).
- `engine_obj = get_engine(engine)` → `synthesize(...)`. Неизвестный engine → 400.
- Опц. **`GET /learn/voice/engines`** → `{ "engines": ["kokoro", "styletts2"], "default": "kokoro" }` (фронт-свитчер возьмёт список отсюда; если лень — захардкодит).

## 4. Deps
StyleTTS2 тяжёлый + другой набор (phonemizer/espeak). Положи в extra `voice` рядом с kokoro **или** отдельную extra `voice-styletts2` (на твоё усмотрение; раздельные extra — чище, чтобы можно ставить движки по отдельности). Обнови pyproject + README (espeak-ng note).

# Acceptance (last-lines → architect)
- `uv sync --extra voice` (+ styletts2 extra если отдельная) + espeak-ng стоит.
- `curl "http://127.0.0.1:8003/learn/voice/speak?text=happy&engine=kokoro" -o k.wav` → WAV.
- `curl "...&engine=styletts2" -o s.wav` → WAV (StyleTTS2). Оба валидны (RIFF), звучат.
- `curl "...&engine=bogus"` → 400 (понятная ошибка).
- (опц.) `GET /learn/voice/engines` → список.
- `uv run pytest` зелёные (voice-тесты skip по env-флагу если модели/espeak недоступны); `uv run ruff check .` clean.

# Что НЕ делаем
- Третий движок (F5/Piper) — позже (тот же паттерн).
- Кэш аудио, голоса StyleTTS2 (выбор спикера) — позже.

# После
Architect: `uv sync --extra voice` + espeak-ng, рестарт :8003. Фронт — свитчер движка (Kokoro/StyleTTS2) у слова → 🔊 играет выбранным. Сравним звук.

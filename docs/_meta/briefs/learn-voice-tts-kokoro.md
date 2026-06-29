---
title: backend/learn — voice-модуль (TTS, pluggable engine, Kokoro) + /learn/voice/speak
status: ready
audience: owner-сессия backend-learn (scope `backend-learn`)
last_updated: 2026-06-29
adr_refs: [055, 054, "064-A"]
---

# Кто / запуск

Owner `backend/learn` (scope **`backend-learn`**): `.\claude-scope.ps1 -Scope backend-learn`. Read `backend/learn/OWNERSHIP.md`. Commit-only.

# Контекст / архитектура

Озвучка слов (TTS). **Временно в `backend/learn`** (обкатка), но архитектурим под вынос в `backend/voice` (ADR 054/055) — как text-движок в `backend/lang`. Plugin-модуль `modules/voice/` (рядом с `modules/lang/`, ADR 055 D1) = чистый seam.

**Движок pluggable** — берём **Kokoro** сейчас, но через интерфейс, чтобы свапнуть (StyleTTS2/F5/Piper) конфигом без правок endpoint'а. **Только свой API** (self-host), чужие облака — нельзя. **Air-gapped:** путь к модели — конфигом, не хардкод-URL.

# Состав (`backend/learn/src/capsule_learn/modules/voice/`)

```
modules/voice/
  __init__.py
  api.py            ← router /learn/voice/*
  engine.py         ← TTSEngine Protocol + registry get_engine(name)
  engines/
    __init__.py
    kokoro.py       ← KokoroEngine (impl)
```

## 1. Интерфейс — `engine.py`
```python
from typing import Protocol

class TTSEngine(Protocol):
    name: str
    def synthesize(self, text: str, *, lang: str = "en_US",
                   voice: str | None = None, speed: float = 1.0) -> bytes: ...
    # returns WAV-bytes (PCM16/float WAV). sample_rate движок знает сам.

# registry: VOICE_ENGINE (env, default 'kokoro') → инстанс. Ленивая загрузка модели (1 раз).
def get_engine(name: str | None = None) -> TTSEngine: ...
```

## 2. KokoroEngine — `engines/kokoro.py`
- dep: `kokoro` (torch-based, сам тянет модель/g2p) — или лёгкий `kokoro-onnx` + `onnxruntime` (на выбор; для unlimited-железа `kokoro` ок). + `soundfile`, `numpy` для WAV.
- Грубо:
  ```python
  from kokoro import KPipeline
  import soundfile as sf, io, numpy as np
  # lang_code 'a' = American English; voice напр. 'af_heart' / 'am_adam'
  pipe = KPipeline(lang_code='a')  # держать инстанс (ленивая инициализация)
  def synthesize(text, *, lang='en_US', voice=None, speed=1.0):
      chunks = [a for _,_,a in pipe(text, voice=voice or 'af_heart', speed=speed)]
      audio = np.concatenate(chunks) if chunks else np.zeros(0, dtype='float32')
      buf = io.BytesIO(); sf.write(buf, audio, 24000, format='WAV'); return buf.getvalue()
  ```
- Модель: на dev Kokoro качает с HF при первом вызове — ок для обкатки. **Air-gapped/prod:** путь к модели/голосам через config (`KOKORO_*`), без онлайн-загрузки. Заложи config-хук (env), но обкатку гоняем как есть.
- Голоса (для теста положи 2-3 в дефолты-выбор): `af_heart`, `am_adam`, `af_bella` (American). lang_code 'a'.

## 3. Endpoint — `api.py`
```
GET /learn/voice/speak?text=happy&lang=en_US&voice=af_heart&speed=1.0
  → 200, Content-Type: audio/wav, тело = WAV-байты (Response/StreamingResponse, media_type="audio/wav")
```
Роутер инклудится в `main.py` (как lang). `text` обязателен; voice/speed/lang опц. Пустой text → 400.

# Config
`VOICE_ENGINE=kokoro` (default), `KOKORO_MODEL_PATH`/`KOKORO_VOICES_PATH` (опц., для air-gapped). Добавь в `config.py`.

# Тесты
- `test_voice_engine` — `get_engine('kokoro').synthesize('hi')` → non-empty bytes, начинается с `RIFF` (WAV-заголовок).
- `test_voice_api` — `GET /learn/voice/speak?text=hi` → 200, content-type audio/wav, тело непустое. (Если модель не качается в CI — пометь `@pytest.mark.skipif` по env-флагу `VOICE_MODEL_AVAILABLE`, чтобы CI не падал на загрузке.)

# Acceptance (last-lines → architect)
- `uv sync` (kokoro + soundfile встали).
- `uv run uvicorn ... :8003`; `curl "http://127.0.0.1:8003/learn/voice/speak?text=happy" -o out.wav` → валидный WAV, проигрывается, **звучит натурально**.
- Свитч движка: `VOICE_ENGINE=...` читается (даже если второй движок ещё не реализован — get_engine кидает понятную ошибку на неизвестный name).
- `uv run pytest` зелёные (voice-тест skip-аем если модель недоступна); `uv run ruff check .` clean.

# Что НЕ делаем
- Второй движок (StyleTTS2/F5/Piper) — позже (интерфейс готов, добавится файлом в engines/).
- STT / scoring произношения — позже.
- SSML / фонемный контроль / кэш аудио — позже.
- Вынос в `backend/voice` — позже (модуль уже изолирован под это).

# После
Architect перезапустит :8003 + сделает 🔊-кнопку во фронте (WordInfo) → клик по слову играет аудио. Дальше — озвучка примеров, выбор голоса, A/B второго движка.

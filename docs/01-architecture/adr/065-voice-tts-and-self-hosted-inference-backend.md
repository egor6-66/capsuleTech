---
tags: [adr, accepted, backend, voice, tts, inference, self-hosted, learn, ai, agents]
status: accepted
date: 2026-06-29
last_updated: 2026-06-29
supersedes: []
extends:
  - 054-multi-language-platform
  - 055-learning-service-and-thin-app
---

> [!info] Status: accepted
> Фиксирует (1) **озвучку (TTS)** для learn как **pluggable-движок** в `backend/learn` (обкатка) с архитектурой под вынос в `backend/voice`; (2) общий **подход к self-hosted inference**: свои Python-сервисы (FastAPI + in-process open-рантаймы), capability-сервисы (TTS/STT/LLM) под оркестратором, **library-not-service** (никаких чужих model-API/Olлamy); (3) выбор движков по оси **цена↔качество↔лицензия↔Python-совместимость**. Поверх ADR 054 (мультиязычность) и ADR 055 (learn-сервис).

# ADR 065 — Voice TTS (pluggable engine) + self-hosted inference backend

## Контекст {#context}

learn-апп должен **озвучивать слова** (произношение — ядро language-learning). Шире: в планах **агенты/чат** (есть Rust-набросок `backend/scriber` + старый agent-ADR) и потенциально STT/voice-агенты. Возник вопрос **подхода**, а не точечной фичи: где и как крутить нейронки.

Ценности проекта (канон §0 + air-gapped): **самодостаточность, без зависимости от чужих API/тулзов**, портируемость. Различаем два рода зависимости:
- **Инфра** (VPS/облако/GPU-метал) — неизбежна и приемлема (арендуем железо).
- **Точечный сервис** (Olлama-демон, OpenAI/ElevenLabs API, managed model-endpoint) — **избегаем** (лок-ин, не air-gapped, данные наружу).

## Решение {#decision}

### 1. TTS как pluggable-движок, временно в `backend/learn`
Plugin-модуль `modules/voice/` (рядом с `modules/lang/`, ADR 055 D1) — **чистый seam** для последующего выноса в **`backend/voice`** (как text-движок → `backend/lang`). Контракт:
- `TTSEngine` Protocol — `synthesize(text, lang, voice, speed) -> WAV-bytes`.
- Реестр + **per-request выбор** движка: `GET /learn/voice/speak?text=&engine=&voice=&speed=`.
- Движок — **lazy-import** (тяжёлый ML-стек не грузит базовый сервис/CI).
**Статус:** реализовано (Kokoro), фронт — 🔊 в тайле/WordInfo + свитчер движка.

### 2. Подход к inference (общий механизм): own Python services, library-not-service
- **Свои сервисы на Python** (FastAPI) — Python это стандарт ML (torch/transformers/vLLM/whisper). Нейронку **исполняет рантайм-библиотека in-process**, не внешний сервис.
- **Слои:** веса (модель) → inference-рантайм (torch/vLLM/llama.cpp — **библиотека, не чужой API**) → pipeline (g2p/токенизация/аудио) → наш HTTP-контракт.
- **Capability-сервисы** (TTS, позже STT, LLM) — самодостаточны; **оркестратор** (агент-loop, переписать `scriber` с Rust на Python) их **композит**, не встраивает. Потребители (learn-апп) зовут capability **напрямую** (произношение ≠ через агента — иначе кривая зависимость, канон §0).
- **Olлama выкидываем** на этапе LLM: `llama-cpp-python`/`vLLM` дают тот же инференс в нашем процессе/контракте.

### 3. Выбор движков (цена↔качество↔лицензия↔Python)
- **Kokoro** (Apache-2.0, чистая упаковка, **Python 3.13-OK**, быстрый, CPU-able) — дефолт сейчас. Построен на StyleTTS2-архитектуре.
- **Второй движок для A/B = Chatterbox** (Resemble AI, **MIT** → commercial-safe; самый натуральный в блайнд-тестах; voice-cloning; мультиязык 23).
- ⚠ **Стена Python 3.13 — экосистемная:** StyleTTS2/Chatterbox/F5/XTTS собраны под **3.10/3.11** (древние numba/llvmlite/tokenizers/pkuseg). Kokoro — исключение. → **voice-сервис на Python 3.11** (свой рантайм, развязан) открывает весь SOTA.
- **Отклонено:** `styletts2` (pip-обёртка битая на 3.13); **F5-TTS** (CC-BY-NC — non-commercial, для фреймворка нельзя); **TPU** (JAX/XLA лок-ин — остаёмся torch/GPU-портируемыми).

### 4. Ответственность за качество звука
Качество **владеет voice-сервис**, не апп:
- **веса = движок** (КАК говорить + потолок натуральности); **голос = отдельный артефакт** (speaker-embedding / референс-клип для клона); **g2p + нормализация текста + параметры** = доведение и **правильность произношения** (для learn — критично).
- Апп — **потребитель**: просит `(text, voice, speed)`, не отвечает за внутреннее качество.

### 5. Деплой-постура
**Cloud-portable**: контейнеры + torch/GPU, **ноль провайдер-специфичных API** → «где крутить» = сменное решение по цене/доступности (GPU-облака Lambda/CoreWeave/RunPod или GCP/AWS GPU-VM; **scale-to-zero/serverless** на старте). Инфра-зависимость ок, service-зависимость — нет.

## Последствия {#consequences}

**Плюсы:** независимость/air-gapped/приватность; единый паттерн для TTS/STT/LLM; pluggable-движки (свап без правок контракта); портируемость между облаками; качество локализовано в voice-сервисе.

**Минусы / цена:** держим serving-сложность сами (GPU-память, загрузка моделей, батчинг — но это даёт vLLM/llama.cpp как **библиотека**); self-host open-модель **ниже frontier** (Claude/GPT) на сложных задачах — frontier-качество = либо дорогая нода (70B+), либо платный API (зависимость, отвергнуто как дефолт); voice-сервис требует **отдельного Python-рантайма (3.11)**.

**Долги/следствия:**
- backend dep-resolution: `kokoro→transformers/tokenizers` не резолвится `uv sync` чисто на 3.13 — owner запинит версии (воспроизводимость/CI).
- Вынос `modules/voice` → `backend/voice` (Python 3.11) — позже.
- `scriber` (Rust демо) → переписать оркестрацию на Python — позже.

## Фазы {#phases}

1. **TTS (done)** — Kokoro в `backend/learn` + фронт (🔊 + свитчер).
2. **3.11 + Chatterbox** — voice-сервис на 3.11, ChatterboxEngine, A/B Kokoro↔Chatterbox; выкинуть styletts2-pip.
3. **STT** — Whisper (`faster-whisper`/transformers).
4. **LLM-serving** — vLLM/llama-cpp-python (замена Olлamy), свой /chat-контракт.
5. **Agent-loop** — оркестрация на Python (tools/стейт/стриминг).
6. **Extract** — `backend/voice` (+ `backend/ai` оркестратор) как отдельные сервисы.

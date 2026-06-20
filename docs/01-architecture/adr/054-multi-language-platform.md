---
tags: [adr, proposed, backend, packages, multi-language, python, rust, topology]
status: proposed
date: 2026-06-20
last_updated: 2026-06-20
supersedes: []
extends: []
---

> [!warning] Status: proposed
> Фиксирует, что capsule — мульти-язычная платформа. Граница папок (`backend/`, `packages/`) определяется **фичей/доменом**, не языком. Rust + Python поддерживаются на старте; C++ — на roadmap'е при появлении первого firmware-кейса. Триггер ADR — парные брифы `grammar-as-types` + `voice-module` (см. `docs/_meta/briefs/`), требующие Python-сервис для фонемного скоринга поверх HuggingFace + espeak-ng.

# ADR 054 — Multi-language platform: топология `backend/` и `packages/` по фиче, не по языку

## Контекст {#context}

Capsule с самого начала позиционируется как платформа поверх Solid + XState + Vite — но «платформа» подразумевает экосистему, не один runtime. Сегодня кодовая база де-факто моно-язычна:

- `packages/` — TS-only (исключение — `packages/desktop/native/`, standalone Rust crate для Tauri, не member workspace'а).
- `backend/` — Rust-only Cargo workspace (`scriber`, `fs`, `telegram`).

При подготовке voice-модуля (бриф `voice-module`) выяснилось, что **фонемный скоринг невозможно реализовать на Rust без потерь** — HuggingFace `transformers` (модель `wav2vec2-xlsr-53-espeak-cv-ft`), `phonemizer`/espeak-ng-bindings, `charsiu` — всё это Python-first. Rust-альтернативы (candle, burn) есть, но отстают на годы по покрытию SOTA-моделей. Аналогично Python-first индустрия для DS/ML/scripting/devops в целом.

Параллельно на горизонте — embedded (Arduino-прошивки), где C++ нативный язык.

> [!note] Voice-домен: server-first, не гибрид
> Бриф `voice-module` описывает гибридный паттерн (TTS/STT в браузере через ONNX/WASM, фонемный скоринг на Python). Это SaaS-оптимизация под публичный хостинг (нет сервера = $0 за CPU-час). **Capsule же self-host first** (air-gapped, см. CLAUDE.md), что снимает экономический driver гибрида. При уже-поднятом Python-сервисе серверо-центричный подход даёт больше контроля: faster-whisper/whisper.cpp (точнее и быстрее transformers.js WASM), полноразмерные Whisper-large модели, единая точка обновления, прозрачная GPU-поддержка, отсутствие 80MB+ ONNX в bundle'е фронта. Латенция TTS митигируется streaming-WebSocket + server-side cache + pre-warm урока — стандартный паттерн, не overengineering.
>
> Поэтому в `backend/voice/` сидят **все три слоя** (TTS + STT + scoring), а `packages/web/runtime/voice/` — тонкий клиент с UX-примитивами (MediaRecorder + WebAudio + HTTP/WS). Браузерные ONNX-движки (kokoro-js / transformers.js) опционально включаются как fallback на случай unavailable backend — флагом конфигурации, не дефолтом.

### Pain 1 — Rust не покрывает ML/AI {#pain1}

Закладывать «всё на Rust» = бороться с экосистемой при каждом ML-фичеcкейсе. Voice-скоринг — первый явный кейс, но не последний (text-analysis, grammar-NLP, embeddings, RAG-вспомогательные сервисы — всё в Python мейнстриме).

### Pain 2 — `backend/` сегодня Cargo-workspace = монолит на уровне рантайма {#pain2}

`backend/Cargo.toml` объявляет один workspace с member-crate'ами (`fs`, `scriber/*`, `telegram`). Это удобно для шаринга Rust-зависимостей и cross-crate build'а, но плохо ложится на canon §0 CLAUDE.md «модули, не монолит / пакеты самодостаточны без адаптеров». Если завтра добавим Python-сервис, он не вписывается в Cargo-workspace вообще — нужна параллельная структура.

### Pain 3 — Граница `packages/` vs `backend/` размыта {#pain3}

Прецедент уже есть: `packages/desktop/native/` — Rust crate, не входящий в Cargo workspace и формально лежащий в `packages/`. Это правильно (это **переиспользуемая** crate-обёртка над Tauri, не деплоимый сервис), но конвенция не зафиксирована. При появлении первой Python-библиотеки (например, shared util между двумя ML-сервисами) непонятно: класть её в `backend/lib/`? `packages/python/`? `packages/<domain>/`?

### Pain 4 — Топология «по языку» убивает доменную границу {#pain4}

Соблазн: `backend/rust/`, `backend/python/`, `packages/python/`, `packages/rust/` — псевдо-стройно, но разрывает домен по технологии. Voice-domain тогда раскидан по `backend/python/pronunciation/` + `packages/python/voice-utils/` + (если появится) `packages/rust/phoneme-perf/` — три разных каталога вместо одной зоны. Это **анти-canon**: domain-coherence важнее language-clustering, ровно как `packages/web/` структурирован по domain-зонам (kit/runtime/domain/boost/studio), а не по «Solid vs не-Solid».

## Решение {#decision}

### D1 — Граница по фиче/домену, не по языку {#d1}

`backend/` и `packages/` остаются разделены по **роли**:

- **`backend/`** — деплоимые сервисы (всё что запускается как процесс / контейнер).
- **`packages/`** — переиспользуемые библиотеки и инструменты (публикуемые в registry / линкуемые в монорепе).

Внутри обоих **зона = функциональная или доменная, не языковая**. Язык реализации — деталь конкретного пакета, опционально проявляется в суффиксе для дисамбигуации.

### D2 — Поддерживаемые языки {#d2}

На старте: **Rust** (system/server/native) + **Python** (ML/AI/scripting). C++ — добавится при первом реальном embedded-кейсе через amendment к этому ADR. JS/TS — статус-кво, primary language всего frontend и большинства builders.

Каждый новый язык требует:
- решение по toolchain (для Python — `uv`; для Rust — Cargo как сейчас; для C++ — TBD, скорее всего cmake);
- nx-интеграцию (см. D4);
- CI matrix-расширение.

### D3 — Конвенция именования и зон {#d3}

1. **Зона появляется при первом реальном проекте** — не заранее. Первые Python-сервисы — пара **runtime-инфраструктурных** доменов:
   - `backend/voice/` — TTS + STT + фонемный скоринг (все три слоя бриф'а `voice-module`);
   - `backend/lang/` — NLP-движок (POS, phonemes/IPA, lookup, idioms, translate, opt. LLM-fallback), plugin-pattern по языкам с `en_US` как headliner-модулем.

   Они переиспользуются множеством consumer'ов (web-apps, telegram-агенты, scriber, потенциально embedded-устройства). Application-домены (обучение языкам, документация-помощник, переводчик) — **отдельные сервисы или apps**, которые поверх этой пары работают, аналогично frontend-разделению `packages/web/runtime/*` vs `packages/web/domain/*` (см. [[047-frontend-architecture-zones-cycle-vendor|ADR 047]]).

   Если выделится shared lib — она появляется в подходящей зоне `packages/`. **Lib не обязательно single-language**: если abstraction по своей природе cross-language (storage, codecs, protocol-clients), она оформляется как **core-contract + per-language adapters** (см. ADR 055, пример `packages/shared/data/`: `core/` спека, `py/`/`rs/`/`ts/` адаптеры по востребованности). Если abstraction language-specific (ML-модели Python-only, zod-shim TS-only) — обычный single-language пакет (`packages/ai/voice-models-py/`, `packages/shared/zod/`). Никаких пустых каркасов `packages/python/`, `packages/embedded/`.

2. **Суффикс языка `-py`/`-rs`/`-cpp`** — опционален. Правила:
   - Без суффикса, если язык очевиден из контекста: TS-пакет в `web/`-зоне, Rust crate в `backend/` workspace.
   - Со суффиксом, если зона потенциально мульти-язык **или** в одной зоне есть пакеты на разных языках (`packages/ai/voice-models-py/` рядом с гипотетическим `voice-perf-rs/`).

3. **«Билдер для языка X» — это пакет на любом языке**, чаще всего на TS. `packages/builders/cpp-builder/` — TS-пакет, оборачивающий cmake; язык реализации (TS) ≠ язык цели (C++). Это та же логика что `packages/desktop/src/` (TS) оборачивает Tauri (Rust).

4. **`packages/desktop/native/`** остаётся как есть (standalone Rust crate, не Cargo-workspace-member) — прецедент D1 уже в продакшене.

### D4 — Nx-интеграция {#d4}

Технически nx с мульти-языком работает (production-кейсы: Netflix, Mercedes). Что нужно сделать при подключении первого Python-проекта:

1. **`nx.json` `namedInputs`** — добавить `pythonSources` / `rustSources` рядом с TS-входами, чтобы affected-граф не инвалидировал проекты от чужих файлов.
2. **`targetDefaults`** — текущие defaults (build/test/lint) JS-центричны. Для Python — отдельные именованные targets (`test:py`, `lint:py`), либо переопределение per-project. Чище — разные имена targets.
3. **Плагины:** `@nxlv/python` (uv + pytest + ruff) для Python; `@monodon/rust` (Cargo + clippy) — опционально, для Rust-сервисов которые хотят nx-orchestration вместо чистого cargo. На MVP — `nx:run-commands` достаточно.
4. **Generators:** `nx g @nx/js:library` не покрывает не-JS. Capsule CLI получит `capsule create-service <name> --lang python|rust|...` (отдельная задача).
5. **Каждый не-JS проект** обязательно имеет `project.json` рядом со своим build-файлом (`pyproject.toml` / `Cargo.toml` / `CMakeLists.txt`). Без `project.json` nx проект не увидит. **package.json-stub не добавлять** — это антипаттерн, nx работает без него.

### D5 — Toolchain и изоляция {#d5}

- **Python:** `uv` (Astral) — single-binary, drop-in для pip/venv/poetry, нативный lockfile. Каждый Python-проект — свой `pyproject.toml` + `uv.lock`. **Не** делаем монорепо-уровневый Python workspace — соответствует canon «модули самодостаточны».
- **Rust:** статус-кво. `backend/Cargo.toml` остаётся workspace'ом для сервисов которые шарят crates; standalone crates (типа `desktop/native/`) — со своим Cargo.toml без workspace-членства.
- **C++:** TBD, при необходимости — cmake per-проект.
- **Lockfiles раздельные:** `pnpm-lock.yaml` (корень, JS) + `uv.lock` (per Python project) + `Cargo.lock` (per Rust workspace / standalone). Никакой попытки объединить — это плюс, а не дефект.

### D6 — Cross-language контракты {#d6}

На MVP — **JSON over HTTP** (как уже у scriber). Если конкретный контракт станет shared (несколько consumer'ов или несколько language-bindings) — **zod-схема как single source of truth** (TS-сторона уже canon), генерация Python-типов через JSON Schema → `datamodel-code-generator` → pydantic. Ручная синхронизация допустима пока контракт не shared.

Для streaming/duplex (если понадобится) — SSE или WebSocket, gRPC — overengineering для текущих сценариев, добавим amendment'ом если реальный кейс появится.

### D7 — CI и releases {#d7}

- **CI:** существующие jobs (Lint/Typecheck/Test/Build) остаются JS-only. При добавлении Python-проекта в репо — параллельные jobs `Python:lint` / `Python:test` через `actions/setup-python` + `uv sync` + `pytest`. Affected-логика та же (`nx affected --target=test:py`).
- **Releases:** `scripts/release-local.mjs` сейчас знает только Verdaccio (npm). Python — отдельный pipeline (PyPI или приватный registry); добавляется при первом publishable Python-пакете. На MVP voice-сервис не публикуется — деплоится; pipeline не нужен.

## Последствия {#consequences}

### Положительные {#positive}

- Capsule получает ML/AI без насилия над экосистемой — используем лучший инструмент для задачи.
- Domain-coherence сохранена: voice-domain = `backend/voice/` (все три слоя в одном сервисе) + `packages/web/runtime/voice/` (тонкий клиент) + опционально `packages/ai/voice-models-py/` (shared lib, появляется при втором Python-сервисе) — все три в логических зонах.
- Каркас допускает C++ embedded и любые другие языки в будущем без переписывания топологии.
- Соответствует canon §0: «модули, не монолит» (каждый сервис самодостаточен, свой lockfile, deploy независимо).

### Отрицательные {#negative}

- CI matrix усложняется на +N jobs per язык. Управляемо.
- Dev-experience: разработчик грамма-фичи может оказаться в Python-сервисе. Ставим uv/pyenv в onboarding docs.
- Cross-language контракт — risk дрейфа между TS-zod и Python-pydantic. Митигация — генерация из единого JSON Schema когда shared.
- Owner-агенты не покрывают Python/Rust из коробки. Новые owner'ы (`owner-pronunciation`, `owner-voice-models`) появятся при создании соответствующих сервисов/пакетов.

### Не делаем {#non-goals}

- Не создаём `packages/python/`, `packages/rust/`, `packages/embedded/`, `backend/python/`, `backend/rust/` заранее. Зоны появляются по факту.
- Не объединяем lockfiles.
- Не делаем единый «multi-language nx executor» — `nx:run-commands` + community плагины покрывают потребность.
- Не вводим gRPC / Protobuf — JSON over HTTP пока хватает.

## Implementation notes {#impl-notes}

### Iter 0 — этот ADR {#iter0}

Документация. Без кода.

### Iter 1 — первый Python-сервис (voice-домен) {#iter1}

Параллельная ветка `feat/multi-lang-foundation`:

1. Создать `backend/voice/` с pyproject.toml (uv) + `project.json` (nx targets `build:py` / `test:py` / `lint:py` через `nx:run-commands` → uv).
2. Обновить `nx.json` — `namedInputs.pythonSources`, `targetDefaults` для `*:py`.
3. CI: новый workflow-job `python-tests` через `actions/setup-python` + `uv sync`.
4. Onboarding: добавить `docs/01-architecture/python-setup.md` (или дописать в CLAUDE.md §Commands).
5. Скелет FastAPI с тремя endpoint'ами (mock на старте, реальные модели — следующие PR):
   - `POST /tts` (или WebSocket для streaming) → audio/wav
   - `POST /stt` → `{ transcript }`
   - `POST /score` → `{ phonemes, ... }` per бриф voice §6

### Iter 2 — Frontend voice-package {#iter2}

`packages/web/runtime/voice/` — TS-пакет с subpath'ами `/tts`, `/stt`, `/scoring`, `/capsule`, `/controllers`. Отдельный ADR на дизайн пакета (subpath-структура, hooks, controllers).

### Iter 3 — Воздержание {#iter3}

Не создавать `packages/ai/`, `packages/embedded/` пока нет конкретной shared lib / firmware-кейса. Эти зоны — открыты, но материализуются по запросу.

## Roadmap до C++ / embedded {#roadmap}

Когда появится первый firmware-кейс — amendment к ADR 054:
- toolchain (cmake / avr-gcc / Arduino-CLI / Platform.IO);
- nx-интеграция;
- зона `packages/embedded/<...>` или `backend/firmware-<board>/` в зависимости от роли.

## Cross-references {#cross-refs}

- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] — frontend-зоны (`packages/web/` по domain'у); это ADR — backend/packages топология на уровень выше.
- CLAUDE.md §0 — canon «модули, не монолит».
- Брифы `docs/_meta/briefs/grammar-as-types.md`, `docs/_meta/briefs/voice-module.md` — driver этого ADR.

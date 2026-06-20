---
tags: [adr, proposed, backend, learn, bff, plugin-pattern, thin-client, persistence, shared-data]
status: proposed
date: 2026-06-20
last_updated: 2026-06-20
supersedes: []
extends:
  - 054-multi-language-platform
  - 047-frontend-architecture-zones-cycle-vendor
---

> [!warning] Status: proposed
> Фиксирует pattern application-domain «обучение» поверх runtime-сервисов capsule. `backend/learn/` — BFF-сервис с plugin-модулями (`lang` обучение языкам, `guides` in-app tour'ы, в перспективе `code`/`arduino`/...). `apps/learn/` — тонкий клиент. `packages/web/learn/` — top-level фронтовая зона с UI-блоками. Persistence через **первый capsule-wide multi-language shared lib** `packages/shared/data/` (core-contract + Python adapter на старте; Rust/TS adapters по востребованности). Драйвер ADR — парные брифы `grammar-as-types` + `voice-module` + желание ввести in-app onboarding'и как платформенную фичу. Применяется поверх ADR 054 (multi-language топология) и ADR 047 (frontend-зоны).

# ADR 055 — Learning service: BFF + plugin-модули + тонкий app + shared multi-language data-layer

## Контекст {#context}

[[054-multi-language-platform|ADR 054]] зафиксировал что capsule — мульти-язычная платформа: `backend/voice/` (TTS+STT+phoneme scoring) и `backend/lang/` (NLP-движок — POS, IPA, lookup, translate, idioms) парные **runtime-сервисы**. Они stateless и универсальны — их использует кто угодно.

Параллельно бриф `grammar-as-types` описал учебное приложение для прокачки английского. Изначально бриф предполагал, что весь domain-flow живёт во фронте (`apps/<name>/src/entities/Concept.ts`, exercises-validator в Feature'ах, progress в localStorage). На фоне принятых решений по архитектуре платформы это становится анти-canon:

- **Дрейф клиента и сервера.** Lesson DAG, exercise generator, recommender, validation-логика во фронте = код только под web, дублируется в любом ином клиенте (Telegram Mini App, desktop, потенциально Arduino-companion).
- **Каждое обновление контента/алгоритма = релиз фронта.** Spaced-repetition tuning, новые концепты, новые типы exercises требуют bundle re-deploy.
- **Прогресс заперт на устройстве.** localStorage не синхронизируется; multi-device невозможен без backend.
- **Cross-domain reuse заблокирован.** Если завтра подобный движок понадобится для **обучения чему-то ещё** (программирование, гайды по studio, прохождение capsule-app'ов), весь код придётся переписывать.

### Pain 1 — Application-domain в app = монолит {#pain1}

Бизнес-логика обучения (curriculum, exercises, validation, progress, recommender) **толстая** и нужная везде где будет учебный flow. Запихнуть всё во фронт = ровно тот же анти-canon, что мы решаем декомпозицией ADR 054 (vlasti, ML на бэке, не в WASM): держим **runtime + data** на бэке, **UI** на фронте.

### Pain 2 — Учебный flow нужен не только для языков {#pain2}

Конкретные обозримые consumer'ы learn-движка:

- `learn/lang/` — обучение языкам (старт, US English headliner).
- `learn/guides/` — config-driven in-app onboarding/tour'ы для любого capsule-app'а через `apps/<x>/capsule.config.ts`. Curriculum приходит **из самого app'а**, не из репо learn-сервиса.
- `learn/code/` — обучение программированию (будущее).
- `learn/arduino/` — обучение робототехнике (будущее).

Все четыре — одна общая структура (Lesson DAG → concepts → exercises → progress → recommender), разный контент. Это classic **engine + plugins**.

### Pain 3 — Persistence нужна сразу, но не должна замыкать на язык/драйвер {#pain3}

Learn-сервис — первый capsule-сервис с реальным state (progress, vocab bookmarks, history). Вопросы:

- **SQLite или Postgres** — старт vs будущее. Хотим drop-in миграцию.
- **БД vs filesystem (blob'ы)** — нужны оба (контент в файлах/БД, аудио-логи опционально как blob'ы, кэши).
- **Python-only или cross-language** — БД будут хотеть и Rust-сервисы. Писать слой с нуля под каждый стек — анти-canon.

Канонический ответ — выделить data-layer как **первый cross-language shared lib** capsule. Core-контракт + per-language adapters. Это первый прецедент мульти-language shared в `packages/shared/`, ADR 054 D3 уже учитывает такую возможность.

### Pain 4 — Где живёт learn на фронте {#pain4}

[[047-frontend-architecture-zones-cycle-vendor|ADR 047]] зафиксировал 5 фронт-зон: `kit`, `runtime`, `domain`, `boost`, `studio`. `domain/` — узкие domain-пакеты с компактным API (`auth`, `agent`). `studio/` — top-level зона потому что это **расширяемая экосистема** с движком и модулями (manifests, state, inspector, generators, controllers).

Learn ближе к studio: engine + plugins (lessons / exercises / progress / library / guides), будут добавляться субмодули, появится product-branding над core. → top-level зона `packages/web/learn/`, не запихиваем в `domain/`.

## Решение {#decision}

### D1 — Plugin-pattern в `backend/learn/` {#d1}

`backend/learn/` — Python (FastAPI). Структура:

```
backend/learn/
  src/
    core/                  ← Lesson, Concept, Exercise, Progress, Skill interfaces;
                             dispatch; module-registry; общие endpoints
    modules/
      lang/                ← обучение языкам (старт; US English headliner)
        curriculum.py      ← каталог концептов (bootstrap из markdown)
        exercises.py       ← генератор (fill-blank, build-clause, fix-type-error, translate)
        validator.py       ← вызывает lang.parse / lang.phonemes для проверки
        recommender.py     ← Leitner system (MVP)
        progress.py        ← per-user state
      guides/              ← in-app tour'ы (старт; реализация после lang MVP)
        ingest.py          ← парс curriculum из payload app'а
        tour_engine.py     ← step → step с триггерами (first-open, feature-discovered)
        progress.py        ← guide-completion state
      (code/, arduino/ ...) ← пустые папки + README "coming"; реализация по запросу
    services/
      orchestrator.py      ← HTTP-клиент к lang/voice/scriber; retry/cache
      content_loader.py    ← markdown → БД (idempotent re-seed на старте)
      auth.py              ← opt-in middleware (NONE / basic / JWT); MVP NONE
    api/
      <module>/<endpoint>.py  ← модульные API-namespace'ы
```

Каждый модуль — отдельный namespace API: `/learn/lang/lessons`, `/learn/lang/exercise/check`, `/learn/guides/tour/start`. Подключение нового модуля = новая папка в `modules/` + registration в `core/`, без правок ядра.

### D2 — BFF orchestration + utility-bypass {#d2}

**Два legitimate потока** общения app'а с backend'ом:

1. **Learning flow → ВСЕГДА через `backend/learn/`.** Любая операция, являющаяся частью lesson-flow (открыть урок, проверить exercise, обновить progress, получить hint, запустить tour) — POST/GET к `backend/learn/`. Learn внутри оркестрирует вызовы lang/voice через `orchestrator.py`. App не знает что под капотом гремит несколько сервисов.

2. **Utility-вызовы → app может дёргать lang/voice/scriber напрямую.** Когда нужно перевести строку UI, озвучить меню, выполнить разовый POS-tag вне контекста урока, агентский чат — app использует `@capsuletech/web-query` endpoint к runtime-сервису напрямую. Это **utility-режим**: stateless операция, нет lesson-context'а, нет progress-implications.

   Эта дихотомия совпадает с фронтовой ментальной моделью: app использует `Ui.Button` напрямую (utility) или через `Widgets.Form` (orchestrated) — оба легитимны, выбор по контексту операции.

**Anti-pattern (не делаем):** app собирает exercise-validation в браузере (запросил lang.parse, сам сравнил с answer, сам обновил progress). Это распыляет learning-логику и ломает D1.

### D3 — Persistence: `packages/shared/data/` (cross-language) {#d3}

Первый capsule-wide мульти-language shared lib. Структура:

```
packages/shared/data/
  core/                    ← language-agnostic спека
    interfaces.md          ← Storage / Repo / Migration / Connection контракты
    migration-format.md    ← как описывается миграция (Alembic-совместимо)
    seed-format.md         ← как описывается seed-data
    schemas/               ← общие JSON-Schemas (например, для AppConfig storage block)
  py/                      ← Python adapter (старт)
    pyproject.toml         (uv)
    project.json           (nx targets)
    src/capsule_data/
      engine.py            ← SQLAlchemy 2.0 engine factory (SQLite/Postgres URLs)
      session.py           ← session factory
      repo.py              ← Repo[T] generic (lightweight, поверх SQLAlchemy)
      storage.py           ← Storage adapter (LocalFS / S3 в будущем)
      migrations.py        ← Alembic wrapper
  rs/                      ← Rust adapter (по требованию; sqlx/sea-orm)
  ts/                      ← TS adapter (по требованию; Drizzle поверх postgres-js)
```

**Что это даёт:**

- **Drop-in миграция SQLite → Postgres** через одну переменную окружения (`DATABASE_URL`). На MVP — SQLite-file (zero-admin self-host). Production — Postgres без правок Python-кода.
- **Единый стиль** для всех Python-сервисов capsule (learn, scriber-Python-side если появится, любой будущий). Меньше дрейфа.
- **Подключение нового языка = ещё один adapter** под core-контракт. Не переписываем БД-слой с нуля для каждого Rust crate'а.
- **БД + FS под одной крышей.** `storage.put(key, blob)` и `repo.save(model)` — единая ментальная модель сервиса.

**Что НЕ делаем (важно):**

- НЕ строим custom-ORM/DSL поверх SQLAlchemy. SQLAlchemy 2.0 достаточно высокоуровневый — пакет даёт **общий конструктор** (engine + session-factory + storage + migration wrapper) и конвенции.
- НЕ заводим Rust/TS adapter заранее. Появятся когда появится первый Rust-сервис с реальной потребностью в БД (telegram-gateway? scriber-state?) или первый TS-сервис на бэке.

### D4 — Curriculum как markdown + idempotent re-seed {#d4}

Контент уроков (концепты, exercises-templates) живёт в markdown с frontmatter:

```
backend/learn/content/
  lang/
    en_US/
      concepts/
        parts-of-speech.md
        word-order.md
        articles.md
        ...
      exercises/
        ...
```

Frontmatter совместим с docs-builder (ADR 048) — единый источник правды для метаданных:

```yaml
---
id: lang.en_US.articles
title: "Articles: a vs the"
ts_analogy: "new vs reference"
prerequisites: [lang.en_US.parts-of-speech]
exercises: [fill-blank, fix-type-error]
---
```

**Re-seed flow:** при старте сервиса `content_loader.py` читает все `*.md` → upsert в БД по `id` из frontmatter. User-state (progress) **не трогается** — только content-таблицы. PR с новым `.md` → restart сервиса → концепт доступен. Простая mental model, никаких CMS.

`guides`-модуль особенный: curriculum приходит не из репо learn-сервиса, а из app'а — `capsule.config.ts → learn.guides.curriculum` указывает на локальный markdown в app-папке. Backend получает payload при `ingest`-эндпоинте от app'а и индексирует под app-namespace'ом.

### D5 — `packages/web/learn/` как top-level зона {#d5}

Параллельно `packages/web/studio/`. Subpath'ы:

```
@capsuletech/web-learn/
  /core           ← общие interfaces, hooks, Learn.Provider
  /lesson         ← <LessonView>, <Concept>, <CodeBlock>, <TypeError>
  /exercise       ← <Exercise>, типы упражнений (fill-blank, build-clause, ...)
  /progress       ← <Progress>, <SkillTree>
  /library        ← <VocabList>, <BookmarkButton>
  /guides         ← <Tour>, <Step>, <Spotlight>, <Hint>
  /sentence-builder ← Sentence Builder (специфичный compound из бриф'а grammar-as-types)
  /controllers    ← Controllers.Learn per ADR 032 (useEmit canonical events)
  /capsule        ← регистрация Learn.* per ADR 033
```

UI-блоки **generic** относительно модуля learn-бэка — `<LessonView>` показывает любой concept, `<Exercise>` рендерит любое exercise по типу. Module-специфичные компоненты (например, `<SentenceBuilder>` чисто для lang) сидят в собственных subpath'ах.

### D6 — `apps/learn/` тонкий клиент {#d6}

App'а контракт:

- HCA layers только: View / Widget / Page (+ минимальные Features для navigation).
- Никаких Entity, Shape, Controller для domain-логики обучения. Учебные Entity — на бэке.
- Module-селектор — feature которая появляется со вторым модулем. На MVP `lang` hardcoded.
- Bundle тащит UI всех модулей **до** того как появится второй модуль. Когда будут реальные `code` / `arduino` модули — late-load через [[015-remote-modules|ADR 015]] / ADR 053 app-as-remote.

### D7 — Auth opt-in placeholder {#d7}

На MVP: `LEARN_AUTH=none`, identity hardcoded (single-user). Middleware-гнездо в `services/auth.py` заложено, но содержит pass-through:

```python
LEARN_AUTH = env.get('LEARN_AUTH', 'none')  # 'none' | 'basic' | 'jwt'
```

Реализация `basic` / `jwt` — отдельный PR когда понадобится multi-user / VPS-deployment.

### D8 — In-app guides как второй модуль с самого начала {#d8}

`guides/` — не «потом», а сразу архитектурно учтённый второй модуль. Это:

- Валидирует plugin-pattern (если только один модуль — нет смысла в plugin'ах, мог бы быть монолит).
- Дает capsule-platform value-add: любой app получает structured onboarding через config (`learn.guides.curriculum: './onboarding.md'`).
- Простой в реализации MVP (tour-engine — это shallow по сравнению с lang-движком).

Реализация **последовательная**: сначала `lang` (тяжёлый), потом `guides` (лёгкий). Но архитектура каркаса учитывает обоих с первого PR.

## Последствия {#consequences}

### Положительные {#positive}

- App становится pure-UI thin client. Релизы фронта только при изменениях UI; контент/алгоритмы/рекомендации обновляются без редеплоя app'а.
- Любая платформа (web, Telegram Mini App, desktop) получает обучающий flow одинаково через HTTP.
- In-app guides — config-driven feature для каждого capsule-app'а из коробки.
- `packages/shared/data/` устанавливает прецедент multi-language shared lib — следующие cross-language abstraction'ы ложатся в тот же паттерн.
- Drop-in миграция SQLite → Postgres когда нужно.
- BFF-pattern скрывает runtime-сервисную композицию от app'а; завтра меняем voice-движок без правок фронта.

### Отрицательные {#negative}

- Network hop добавляется к каждой операции обучения (был localStorage — стал HTTP). Митигация: aggressive cache на learn, prefetch на lesson-open.
- App не может работать полностью offline (без backend). Acceptable: учебный flow всё равно нуждается в lang/voice — offline без них useless.
- Сложнее dev-setup — нужно поднимать learn + lang + voice + БД одновременно. Митигация: `docker-compose.yml` / Tilt / просто `capsule backend dev` orchestration в CLI (отдельный PR).
- Curriculum-as-markdown означает что **редактирование контента = git PR**, не CMS. Для текущей стадии MVP это плюс (review-able, version-controlled), но при росте community-контрибьюторов потребует CMS-инструмента (не сейчас).

### Не делаем {#non-goals}

- Custom-ORM/DSL поверх SQLAlchemy.
- `@capsuletech/web-learn` отдельным SDK на фронте — endpoints через `web-query`.
- Multi-user / auth-реализация на MVP.
- Сложный recommender (FSRS / Anki-clone) — Leitner-system достаточно.
- Module-selector UI на MVP — `lang` hardcoded.
- Rust/TS adapters для `shared/data/` — по требованию.
- Реализация `code` / `arduino` модулей — папки-плейсхолдеры с README.
- Postgres на dev-машине разработчика — SQLite-файл per service.

## Implementation notes {#impl-notes}

### Iter 0 — этот ADR {#iter0}

Документация. Без кода.

### Iter 1 — Foundation параллельно с ADR 054 Iter 1 {#iter1}

1. `packages/shared/data/core/` — markdown спека интерфейсов (Storage / Repo / Migration).
2. `packages/shared/data/py/` — SQLAlchemy 2.0 + Alembic + LocalFS storage adapter. nx project.json, pyproject.toml (uv), unit-tests на SQLite in-memory.
3. CI: расширить job `Python:test` с матрицей по сервису (`learn`, `voice`, `lang`) — каждый юзает shared/data/py.

### Iter 2 — `backend/learn/` skeleton {#iter2}

1. FastAPI каркас, plugin-loader для `modules/`, базовые endpoints `/health`, `/modules`.
2. `lang/` модуль — content_loader из markdown, базовый /lessons, /concept/{id}.
3. `guides/` модуль — `/ingest`, `/tour/{id}/start`.
4. orchestrator-stub для вызовов voice/lang (mock в тестах).

### Iter 3 — `packages/web/learn/` skeleton {#iter3}

1. Subpath'ы /core /lesson /exercise /progress /library /guides /controllers /capsule с stub-компонентами.
2. ADR 033 регистрация под `Learn.*`.

### Iter 4 — `apps/learn/` {#iter4}

1. `capsule create-app learn`.
2. Home page → list концептов из `Learn.api.lessons.list()`.
3. Concept page → `<Learn.LessonView id={...}>`.
4. Exercise page → `<Learn.Exercise type={...} concept={...}>`.

### Iter 5 — Lang first real content {#iter5}

3-4 концепта из бриф'а grammar-as-types §2 в markdown'е (articles, word-order, tenses). Реальная validator-логика через lang-сервис. Первый end-to-end-сценарий работающий.

### Iter 6 — Voice integration {#iter6}

Speak-кнопка у каждого слова через `Voice.Speak` (см. бриф voice-module + ADR 054 voice-домен). Record + scoring у Exercise когда мейкс sense.

### Iter 7 — Guides MVP {#iter7}

Tour-engine реализация. Первый guide-curriculum для самого `apps/learn/` (meta — гайд по самому обучающему app'у). Затем — гайд для `apps/playground/` или `web-studio` режима.

## Cross-references {#cross-refs}

- [[054-multi-language-platform|ADR 054]] — multi-language platform topology (родительский ADR).
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] — frontend zone топология (learn как top-level zone).
- [[048-docs-as-data|ADR 048]] — markdown с frontmatter как контент-format.
- [[032-package-controllers-and-useEmit|ADR 032]] — Controllers.Learn / useEmit (если такой ADR существует под этим номером, иначе подставить актуальный).
- [[033-capsule-registration|ADR 033]] — registration под `Learn.*` global.
- [[015-remote-modules|ADR 015]] / `053-app-as-remote-symmetry-and-config-channel` — late-load модулей через remote, когда апп станет multi-module.
- Брифы: `docs/_meta/briefs/grammar-as-types.md`, `docs/_meta/briefs/voice-module.md` — драйверы.

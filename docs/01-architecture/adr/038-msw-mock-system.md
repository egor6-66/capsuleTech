---
tags: [hca, adr, superseded, mocks, msw, testing]
status: superseded
date: 2026-06-07
last_updated: 2026-06-12
---

> [!warning] Status: 🔄 superseded by [[040-data-gen-utility|ADR 040]]
> **Superseded 2026-06-07 (в тот же день).** MSW-подход отклонён в пользу более лёгкого: один генератор данных `@capsuletech/shared-zod/gen` (faker-база + injectable generators) + существующий `preRequest` для API-моков — без отдельной мок-системы и нового пакета. Сетевой перехват MSW избыточен. См. [[040-data-gen-utility|ADR 040]]. Ниже — исходное (отменённое) решение.

# ADR 038 — Мок-система на MSW + faker (моки вне слоёв)

## Контекст {#context}

Текущие моки собраны «на коленке» и **шумят в слоях** — для эталона недопустимо:
- **Entity:** инлайн-генератор данных (ручной RNG + словари) прямо в фабрике (напр. `apps/ewc/src/entities/incident.tsx` — ~100 строк), под флагом `__CAPSULE_MOCKS__`.
- **Endpoint:** `preRequest`-ветка с мок-логикой внутри `defineEndpoint` (напр. `apps/ewc/src/endpoints/auth.ts`), тоже под `__CAPSULE_MOCKS__`.
- Флаг `__CAPSULE_MOCKS__` (build-time define) хардкодит мок-поведение в прод-контракт.

Слой должен быть чистым (`Entity` = только schema; `endpoint` = только контракт). Нужна **мощная мок-система для полноценных сценариев** — без мусора в слоях, работающая и в браузере (витрина/dev), и в Vitest (тесты). Берём industry-standard, не изобретаем.

## Решение {#decisions}

### 1. MSW — перехват на сетевом уровне

[Mock Service Worker](https://mswjs.io) перехватывает HTTP **на сети** (Service Worker в браузере / request-interceptor в node). Реальная `Feature` зовёт реальный `services.api.x()` → MSW отвечает по handler'у. **Ноль мок-кода в слоях.** Одни и те же handlers — браузер и Vitest.

### 2. Конвенция `apps/<app>/mocks/`

- `mocks/handlers/**` — MSW request-handlers (`http.post('/auth/login', …)`).
- `mocks/fixtures/**` (или `mocks/factories/**`) — **faker**-фабрики данных (сидируемые, детерминированные). Заменяют ручные RNG/словари. Фикстуры данных уходят из `Entity` сюда.
- `mocks/browser.ts` / `mocks/node.ts` — стандартный MSW setup (`setupWorker` / `setupServer`), собирающий handlers.

`Entity` и `endpoint` после миграции — **чистые** (schema / контракт), без мок-веток.

### 3. builders — условный запуск worker'а

- Vite-плагин/опция поднимает MSW worker в **dev/mock-режиме** (копирует `mockServiceWorker.js`, стартует `worker.start()` до bootstrap'а). Управляется флагом (напр. `capsule.config.ts: mocks: true` или dev-mode default), НЕ хардкодом в слоях.
- Для Vitest — `setupServer` в test-setup (один и тот же `mocks/handlers`).
- Прод-сборка: worker не поднимается, handlers tree-shake'аются (не импортятся).

### 4. Deprecate inline-моки

- `__CAPSULE_MOCKS__` + inline `preRequest`-мок в endpoint'ах + inline-генераторы в Entity — **deprecated**, мигрируются на `mocks/`.
- `preRequest` как hook в `defineEndpoint` **остаётся** (легитимный per-endpoint interception для не-мок-кейсов), но НЕ как место для мок-данных.

**Поток:** `Feature → services.api.auth.login() → (dev) MSW handler из mocks/ → {token, role}`. Контракт endpoint'а чистый; мок и данные (faker) — в `mocks/`, вне слоёв.

## Последствия {#consequences}

- **Кросс-пакетная реализация (owner'ы):** builders (Vite-плагин MSW worker + флаг + Vitest setup), web-query (чистка зависимости от `__CAPSULE_MOCKS__`/inline-preRequest как мок-канала; контракт остаётся). Конвенция `mocks/` — главный (архитектор) + docs.
- **Зависимости:** `msw`, `@faker-js/faker` (dev/test).
- **Миграция:** ewc (`incident` Entity-генератор → faker-фабрика; `auth` endpoint-мок → MSW handler) + playground (auth-прототип). Убрать `__CAPSULE_MOCKS__`.
- **Codegen (опц.):** авто-discovery `mocks/handlers` в `mockServiceWorker` setup — как саб-ген (ADR 037), позже.
- Открытый вопрос: точный флаг-механизм (config-поле vs dev-default vs env) — owner-builders детализирует.

## Альтернативы (отклонены) {#alternatives}

- **Оставить inline `preRequest` + `__CAPSULE_MOCKS__`** — шум в слоях, хардкод в контракт, не масштабируется на сценарии. Отклонён (причина ADR).
- **Ручные генераторы в Entity** — не сидируемо/не реалистично, дублирование. → faker.
- **nock / msw-альтернативы** — MSW = де-факто стандарт для браузера+node с одними handlers. Не изобретаем.
- **Мок на уровне `api`-клиента (свой interceptor)** — изобретаем своё; MSW даёт сетевой перехват из коробки + DevTools.

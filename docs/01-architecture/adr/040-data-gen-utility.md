---
tags: [hca, adr, accepted, data-gen, faker, mocks]
status: canon
date: 2026-06-07
last_updated: 2026-06-13
---

> [!info] Status
> **Accepted (направление)** — 2026-06-07. **Суперсидит [[038-msw-mock-system|ADR 038]]** (MSW-подход отклонён в пользу более лёгкого: один генератор данных + существующий `preRequest`). Решение из playground-сессии. Реализация: `@capsuletech/shared-zod` (subpath `/gen`) — owner-shared + faker dep (shared infra — главный). Связано: [[037-playground-capability-and-codegen-subgenerators|ADR 037]] (sub-generator паттерн), [[039-web-auth-package|ADR 039]].

# ADR 040 — Генератор данных `shared-zod/gen` (faker-база + injectable generators); моки через `preRequest`

## Контекст {#context}

Нужен мощный генератор рандом-данных для сценариев (моки, превью, тесты), **без дубля и без мусора в слоях**. Сейчас рандомайзер **дублируется**: ручной mulberry32 + словари в `@capsuletech/web-ui-creator/src/generators` (`rng.ts`/`fuzzer.ts`/`wordbank.ts`), ручной RNG+словари в Entity-моках (`apps/ewc/src/entities/incident.tsx`), а MSW-подход ([[038-msw-mock-system|ADR 038]]) добавил бы третий. По нашему флоу ([[compose-and-inject]]) — это ОДИН примитив, а не три.

Также: для API-моков **уже есть `preRequest`** hook в `defineEndpoint` (web-query) — сетевой перехват MSW избыточен.

## Решение {#decisions}

### 1. Один генератор `@capsuletech/shared-zod/gen`

Живёт рядом с Zod (он — авторитет формы данных). Генерит рандом-данные **по Zod-схеме**:
```ts
gen(Entities.Incident.schema, { seed: 42 })        // одна валидная карточка
gen(Zod.array(schema), { seed: 42, count: 200 })   // список
```
Консьюмеры одной утилиты: Entity-моки, `preRequest` API-моки, ui-creator (дропает свой `rng`/wordbank — точечно позже), компоненты. Дубль убит.

### 2. Абстрактная faker-база + injectable generators (паттерн ADR 037)

- **База** (faker-backed) покрывает базовые кейсы: маппинг Zod-типов/форматов/имён-полей → faker (`z.string().email()`→`faker.internet.email`, поле `phone`→`faker.phone.number`, и т.д.). Берём готовое (faker, опц. zod→mock-слой), **не пишем словари руками**.
- **Инъекция** (НЕ флаги): консьюмер регистрирует кастомные value-generators для специфичных кейсов, которых faker не покрывает (контракт ~как `SubGenerator`):
  ```ts
  interface ValueGenerator {
    id: string;
    match(ctx: GenFieldCtx): boolean;   // по Zod-типу/формату/имени-поля/describe/meta
    generate(ctx: GenFieldCtx): unknown;
    order?: number;
  }
  gen(schema, { seed, generators: [myDomainGen, ...] })  // или registerGenerator(...)
  ```
  Резолв: инжектированные (по `match`, `order`) → фолбэк на faker-базу. ui-creator инжектит свои доменные генераторы (faker их не покрывает).
- **Seedable** — детерминизм (faker.seed + общий RNG для инжектов).

### 3. Моки = `preRequest` + `gen` (MSW не нужен)

API-мок: `preRequest` короткозамыкает endpoint, отдаёт `gen(responseSchema)`-данные. Сценарии (пусто/ошибка/медленно) — config-driven через `capsule.app.ts` (единая точка внешней настройки), не через bespoke control-surface. **Слои чистые** (`Entity`=schema, `endpoint`=контракт; данные — из `gen`, моки — в `preRequest`).

## Последствия {#consequences}

- **owner-shared:** реализует `@capsuletech/shared-zod/gen` (multi-entry/subpath build) — faker-база + injection-реестр + Zod-резолв. faker (+ опц. zod-mock) dep.
- **главный (shared infra):** добавить `@faker-js/faker` в lockfile/нужный package.json; nx (subpath build остаётся в web_base группе).
- **ui-creator:** консьюмит `gen`, дропает дублирующий `rng`/wordbank — **точечно позже** (не в этой волне, сужаем итерации).
- **Миграция моков:** Entity-генераторы + endpoint-`preRequest` (ewc/playground) → на `gen`; убрать `__CAPSULE_MOCKS__` ручные словари.
- **ADR 038 (MSW) → superseded** этим ADR.

## Альтернативы (отклонены) {#alternatives}

- **MSW (ADR 038)** — отдельная мок-система/перехват; `preRequest` + `gen` легче и без нового пакета. Отклонён → superseded.
- **Свой генератор/словари в каждом пакете** — дубль (ровно проблема ADR). → один `gen`.
- **Флаги вместо инъекции** для доменных кейсов — не масштабируется ([[compose-and-inject]]). → injectable generators.
- **Отдельный `@capsuletech/shared-gen`** — рассматривали; держим рядом с Zod (`/gen` subpath), т.к. генерация ведётся от Zod-схемы.

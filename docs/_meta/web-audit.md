---
title: web-audit
description: Снимок состояния packages/web/* для Phase 0 чистки. Факты + сигналы, прочитанные через таксономию ADR 045.
status: documented
date: 2026-06-11
---

# Web-audit — снимок `packages/web/*` для Phase 0

> **Цель доки:** живой реестр состояния перед чисткой, не план работ. План растёт из неё (canon-проход + structural-rename'ы) — см. ADR 045 + чекпойнт.

## Метод

Прогнано на `main` (после мерджа #292) поверх грязного дерева (parallel WIP не влияет на read-only анализ):

- `pnpm dlx syncpack@latest lint` — версионный дрейф на root-`pnpm.overrides`.
- `pnpm dlx madge@latest --circular --extensions ts,tsx packages/web` — циклы.
- `pnpm dlx madge@latest --extensions ts,tsx --summary packages/web` — топ-ноды графа.
- `pnpm dlx knip@latest --reporter symbols` — unused files/deps/exports (по всему репо, грепом сводим к web/*).

Все четыре — read-only, без правок lockfile/package.json. JSON-выгрузки — `/tmp/audit-*` (локально, не в git).

## Инвентарь пакетов

23 пакета. Сортировка по предполагаемому «весу» (LoC грубо через src-файлы):

| pkg | v | src files | tests | роль (ADR 045 lens) | примечание |
|---|---|---:|---:|---|---|
| **ui** | 0.2.0 | 192 | 29 | kit (листовые примитивы + лёгкие композиции) | биггест; Storybook (выпиливаем) |
| **ui-creator** | 0.1.1 | 89 | 15 | **design-time → переезд в web-creator** | ADR 045 #2 |
| **shell** | 0.1.0 | 60 | 17 | расщепляется: layout + chrome | ADR 045 #1 |
| **core** | 0.1.1 | 58 | 21 | wrappers / proxy / lifecycle | trunk фреймворка |
| **profiler** | 0.1.1 | 50 | 5 | runtime perf-наблюдение | tests low |
| **style** | 0.1.1 | 44 | 10 | tokens + themes + stores | editor/* мёртв (см. ниже) |
| **table** | 0.0.0 | 29 | 6 | heavy (tanstack), отдельный пакет | scaffold |
| **query** | 0.1.1 | 28 | 13 | api-middleware | циклический edge (см. ниже) |
| **map** | 0.0.1 | 23 | 11 | heavy (maplibre) | живой |
| **dnd** | 0.1.1 | 18 | 4 | pointer-DnD | живой |
| **auth** | 0.0.0 | 14 | 3 | домен | живой эталон |
| **agent** | 0.0.0 | 10 | 2 | домен (LLM) | scaffold |
| **intl** | 0.1.0 | 10 | 3 | i18n | живой |
| **router** | 0.1.1 | 9 | 5 | tanstack-обёртка | трогается под depth-scoped vt (ADR 045 #3) |
| **state** | 0.1.1 | 9 | 4 | xstate-обёртка | живой |
| **charts** | 0.1.1 | 7 | 0 | домен (chart.js) | **0 tests** |
| **date** | 0.1.0 | 7 | 2 | datelib | живой |
| **access** | 0.0.0 | 6 | 0 | scaffold (capability/gate) | docs/playground/access |
| **contract** | 0.0.0 | 6 | 1 | leaf-протокол | scaffold |
| **renderer** | 0.1.1 | 6 | 2 | json→jsx runtime | живой |
| **flow** | 0.1.1 | 4 | 0 | домен (node-canvas) | **0 tests** |
| **remote** | 0.0.0 | 2 | 0 | scaffold (federation) | type-only пока |
| **creator** | 0.0.0 | 1 | 0 | пустой scaffold | поглощает ui-creator |

**Микро-кит выводов:**
- 23/23 пакета имеют `OWNERSHIP.md` (Phase −1 закрыл это).
- `creator` — пустой каркас (1 файл) — целевая landing-зона для `ui-creator` (89 src) + добавок (`/style /text /logic /app /palette /tree /inspector /canvas /data /monitor /catalog`).
- `charts` и `flow` — НОЛЬ тестов на code в production-версии (`0.1.1` charts). Низкий риск (домен экспериментален), но факт зафиксировать.
- `profiler` — 50 src на 5 тестов. Coverage низкий относительно размера; не критично (наблюдательный пакет), но в Phase 0 не trigger.

## Через таксономию ADR 045

### #1 `web-shell` = layout + chrome

В нынешнем `packages/web/shell/src/`:

```
matrix/           — layout-каркас (Matrix/Region/Cell) — tier-1
controllers/      — Controllers.Shell — chrome-side (useEmit)
ui/               — Header, ModeToggle, Appearance, FinishSettings — chrome
capsule.ts        — ADR-033 манифест
```

**Сигнал:** `matrix/index.ts` помечен knip'ом как unused — false positive (потребляется через `@capsuletech/web-shell/matrix` subpath из app, knip не видит subpath-экспорты из package.json `exports`). Структурно layout уже отделён физически — нужен только subpath-rename → `/layout` + `/chrome` + barrel-fix.

**Найден мёртвый файл (real):** `packages/web/shell/src/matrix/dnd/edit-badge.tsx` — single. Не импортируется ниоткуда (включая matrix/dnd/index). Можно сносить при touch'е shell'а.

**Тесты:** `controllers/__tests__/shell-namespace.test-types.ts` — type-only тест, knip считает unused (false positive — гоняется vitest type-check).

### #2 `web-creator ⊇ web-ui-creator`

`packages/web/creator/` — 1 файл (пустой каркас).
`packages/web/ui-creator/src/` — 89 файлов:

```
manifests/         — реестр компонентов + canAcceptChild
state/             — operations над tree.json (addNode/moveNode)
inspector/         — generic-инспектор пропсов
generators/        — procedural UI generators
```

**Сигнал:**
- `manifests/registry.ts` — индексный hub с 15 dep'ами (madge summary). При founding-миграции в `web-creator` живёт целиком (в `/canvas` или `/catalog`, решит owner-web-creator).
- `generators/index.ts` — 10 dep'ов; кандидат на subpath `/ui` редактора.
- `controllers/index.ts` помечен unused (false positive — subpath consumed app codegen'ом).
- `capsule.ts` (ADR-033) помечен unused — false positive (consumed CapsuleRegistryPlugin'ом).

**Followup:** founding-PR owner-web-creator. До этого pkg-граница `ui-creator` стоит — апы (`apps/playground`, `apps/nexus`) импортят с него.

### #3 vt-name → depth-scoped

`packages/web/shell/src/matrix/cell.tsx` + `content.tsx` несут глобальный `view-transition-name: capsule-content` (PR #264, см. чекпойнт).
`packages/web/router/src/` — Context-based обёртка над `@tanstack/solid-router`; **depth текущего route-match** уже доступен из tanstack-router-API (`useMatches().length` или router-state). Нужен публичный helper в `web-router` (`useRouteDepth()`) + `Shell.Matrix` его читает.

**Сложность изменений (грубо):**
- web-router: +1 hook, ~5 строк.
- web-shell/matrix/cell: replace константный CSS-var на dynamic (`capsule-content-${depth}`).
- web-style: расширить `vt-route-content` глобальный класс под pattern-селектор.

Изменения малые, отдельным parallel PR'ом owner-web-shell + owner-web-router после founding-чистки.

## Версионный дрейф (syncpack)

Один тип проблемы по всему пакетному кусту:

> **`solid-js` peerDep:** 33 pkg'а используют `^1.9.0` (или `^1.9.5` в `core`/`router`). Корневой `pnpm.overrides.solid-js = 1.9.12`. Все peerDep'ы НЕ синхронизированы с pinned-версией.

Это не работающий баг (overrides рулит install'ом), но дрейф мешает консьюмерам пакета (внешние тестеры в `capsule-test`-режиме без overrides могут затащить 1.9.0 → mismatch с тем, на чём тестировали мы).

**Действие:** owner-deps — поднять все peerDep'ы до `^1.9.12` одной серией PR'ов. Не в Phase 0, а параллельно как dep-hygiene. Учесть и `solid-refresh` (peerDep `*` в `builders/vite`), и `vite` (`^5.0.0||^6.0.0||^7.0.0||^8.0.0` в `builders/vite` — стоит сузить до `^8.0.0` сейчас, когда `vite` в devDeps уже 8).

## Циклы (madge)

**Найдено 2 цикла на уровне src (+ 2 дубликата на dist):**

1. `packages/web/core/src/wrappers/interfaces.ts` ⇄ `packages/web/core/src/wrappers/shape/types.ts`
2. `packages/web/query/src/endpoint.ts` ⇄ `packages/web/query/src/pipeline.ts`

Оба — внутрипакетные circular type-only. Не падают рантайм (тесты зелёные), но грязнят граф и блокируют будущий `isolatedDeclarations`. Дешёвый fix — вынести общие типы в `types.ts` neutral-leaf.

**Действие:** Phase 0 piggyback при первом touch'е `core/wrappers` и `query/endpoint` (не отдельные PR'ы).

## Мёртвый код / unused

Knip помечает 240 файлов «unused» по всему репо. Большая часть — **false positives**:

- **`*.stories.tsx`** (~30 шт в web/ui + web/ui-creator) — Storybook discovery, knip без конфига не знает. Полетят естественно при **Storybook sunset** (планируется в Phase 0+1, миграция на web-creator/catalog).
- **`capsule.ts`** (ADR-033 манифесты в каждом пакете) — потребляются `CapsuleRegistryPlugin`'ом из vite-builder. knip blind.
- **`controllers/index.ts` subpath-entries** — consumed app codegen'ом, knip blind.
- **App-level `@capsuletech/*` deps** в `apps/*/package.json` — auto-import globals, knip blind.

**Реальные находки:**

| путь | размер | действие |
|---|---|---|
| `packages/web/style/src/editor/**/*` (18 файлов) | весь `editor/` куст | **снести** — было обсуждено в design-owner сессии (FinishEditor удалён, ThemeEditor осиротел). web-style remains tokens+themes+stores только. |
| `packages/web/shell/src/matrix/dnd/edit-badge.tsx` | 1 файл | снести при touch'е shell'а |
| `packages/web/core/src/create/createRoot.ts`+`create/index.ts` | 2 файла | проверить — могло уйти в `engine/`; если так, drop |
| `packages/web/style` deps `lucide-solid` | 1 dep | реально unused (icon-name strings через web-ui) — drop в package.json |

Остальные «unused exports» (98) и «unused exported types» (77) — разнятся пакетами, требуют per-package разбора owner'ом (в Phase 0 не bulk-fix; делается на canon-проходе).

## Что НЕ покрыл аудит

- **Граф зависимостей МЕЖДУ web-пакетами** (madge на пакетном уровне) — нужен отдельный прогон с `--ts-config` chain'ом по workspace; здесь только intra-package. Откроем при первом межпакетном touch'е (rename web-shell → /layout+/chrome потребует точно).
- **Coverage реальный** (vitest `--coverage`) — здесь только грубый src/tests ratio. Узнаваемая корреляция: pkg'и с низким ratio (charts/flow/profiler) — это домен-эксперименты, не trunk.
- **Соответствие OWNERSHIP.md шаблону по содержанию** — гейт работает только по структуре (frontmatter + секции присутствуют). Точность текста — отдельная редакторская волна.
- **Storybook footprint** — `.storybook/` конфиги + 28 stories помечены unused; полный список — в Phase 0+1 при sunset.

## Сжато: что Phase 0 берёт из аудита

1. **Делаем сейчас (canon-пилот Button, задача #3):**
   - web/ui — 192 src, эталонный canon-target.
   - Vitest-browser bar — добавляется в web/ui без structural-перемещений.
   - Storybook sunset формально не trigger'ится этим шагом; stories остаются работающими.

2. **Параллельным rename-треком (не блокирует canon-пилот):**
   - `web-shell` subpath split: `/matrix → /layout`, новый `/chrome` (обёртка над `/ui/header.tsx` и т.п.). Touch-once при первом касании.
   - Снос `web-style/editor/**` + drop `lucide-solid` из web-style package.json.
   - Снос `web-shell/src/matrix/dnd/edit-badge.tsx`.

3. **Hygiene-трек (owner-deps, не блокирует ни canon, ни rename):**
   - solid-js peerDep sync до `^1.9.12` по 27 web-пакетам.
   - Сузить `vite` peerDep в `builders/vite` до `^8.0.0`.

4. **Foundling-PR owner-web-creator** (после canon-пилота — чтобы было что migrate с canon-ом, не наполовину):
   - `ui-creator` 89 src → subpath'ы `web-creator`.
   - Drop `web-ui-creator` package + alias после migrate-and-redirect волны.

5. **Routing depth-scoped vt-name** (когда web-shell touchится):
   - `web-router useRouteDepth()` + `Shell.Matrix` CSS-var + web-style pattern-селектор.

6. **Микро-фиксы при касании** (не отдельные PR'ы):
   - 2 source-level circular deps (core/wrappers ↔ shape/types; query/endpoint ↔ pipeline).
   - Per-package OWNERSHIP.md content quality (14 пакетов с кривым frontmatter/секциями — Phase −1 C нормализует «по ходу»).

---

> **Living document.** Обновляется по мере прохода Phase 0. Snapshot-метка в frontmatter (`date`) фиксирует когда последний раз прогонялись инструменты.

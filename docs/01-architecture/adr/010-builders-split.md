---
tags: [hca, adr, implemented]
status: implemented
date: 2026-05-17
---

# ADR 010 — Build-time packages live in `packages/builders/`, with `lib-builder` as a leaf

> [!success] Реализовано
> 4 пакета перенесены в `packages/builders/` (см. коммит `9f13e28`): `lib`, `vite`, `biome`, `compliance`. `lib-builder` остаётся **zero-deps leaf**, чтобы разорвать цикл сборки. Аудит — `pnpm audit:exports`.

## Контекст

Раньше build-time инфраструктура жила в `packages/shared/` рядом с runtime-пакетами:

```
packages/shared/
  lib-config/    ← builder для библиотек
  vite/          ← Vite-плагины + app-defines
  biome/         ← lint-config
  compliance/    ← HCA-линтер (используется только Vite-плагином)
  file-manager/  ← runtime utility
  utils/         ← runtime utility
  zod/           ← runtime utility
```

Проблемы такого размещения:

1. **Семантическое смешение.** «Shared» подразумевает «доступно нескольким группам пакетов». На практике `lib-config`/`vite`/`biome`/`compliance` нужны **только при сборке** — это инструменты, не runtime. А `file-manager`/`utils`/`zod` — настоящие cross-group runtime-зависимости.
2. **Непонятная топология.** `lib-config` (тонкий пакет с `libConfig()`) и `vite` (тяжёлый пакет с плагинами) казались разделёнными случайно. Регулярно поднимался вопрос «может объединить».
3. **Имена не отражают роль.** `shared-lib-config` звучит как «общий конфиг для библиотек», что неинформативно. Это **builder** для библиотек.

## Решение

### 1. Выделить group `packages/builders/`

Все build-time пакеты переезжают в отдельный каталог:

```
packages/builders/
  lib/         → @capsuletech/lib-builder
  vite/        → @capsuletech/vite-builder
  biome/       → @capsuletech/biome-config
  compliance/  → @capsuletech/compliance
```

`packages/shared/` теперь содержит **только cross-group runtime**: `file-manager`, `utils`, `zod`.

Критерий принадлежности к `builders/`: пакет используется в `vite.config.mts` других пакетов или в `capsule.config.ts` приложений — то есть **на этапе сборки**, не в рантайме приложения.

### 2. `lib-builder` остаётся zero-deps leaf — split НЕ объединяется

`vite-builder` напрямую инстанцирует `CompliancePlugin` (см. `packages/builders/vite/src/defines/capsuleConfig.ts`). Цепочка:

```
vite-builder → @capsuletech/compliance       (runtime, через CompliancePlugin)
compliance   → libConfig                     (build-time, в его vite.config.mts)
```

Если положить `libConfig` в тот же пакет, что использует `compliance` — получится цикл сборки: чтобы собрать пакет `vite-builder+libConfig`, нужно собрать `compliance`, для сборки которого нужен сам `vite-builder+libConfig`. Bootstrap-проблема.

Поэтому **`lib-builder` остаётся отдельным пакетом с `dependencies: {}`** (см. его `package.json`). Это «дно» зависимостей. Любой пакет может использовать его в своём `vite.config.mts` без риска цикла.

Совместимость публичного API сохранена через re-export:

```ts
// packages/builders/vite/src/defines/libConfig.ts
export { libConfig } from '@capsuletech/lib-builder';
```

Потребитель пишет как раньше:
```ts
import { libConfig } from '@capsuletech/vite-builder';
```

### 3. Каноническая использовательская матрица

| Пакет | Кто потребитель | Цель |
|---|---|---|
| `@capsuletech/lib-builder` | каждый `packages/**/vite.config.mts` | собирать любую библиотеку с canonical-config |
| `@capsuletech/vite-builder` | `apps/<app>/capsule.config.ts` + потребители `libConfig`-re-export | dev-сервер для apps + Vite-плагины |
| `@capsuletech/biome-config` | корневой `biome.json` (extends) | shared lint-config |
| `@capsuletech/compliance` | `vite-builder/plugins/compliance.ts` (runtime) | HCA-линтер (см. [[004-compliance-linter\|ADR 004]]) |

## Последствия

### + Положительные
- Семантическая группировка → новый разработчик/агент сразу понимает, что в `packages/builders/` тулинг, а в `packages/shared/` — runtime.
- Имена пакетов (`lib-builder`/`vite-builder`/`biome-config`) отражают роль, а не локацию.
- Release-группа `builders` (запланирована) — буст всех build-tooling-пакетов **синхронно**. Раньше можно было опубликовать `shared-vite@new` с несовместимым `shared-lib-config@old` → ловушка.

### − Отрицательные
- Renames в куче файлов: `tsconfig.base.json` paths, `nx.json`, `package.json` каждого консьюмера, `scripts/release*.mjs`, доки. Один проход, но нужно покрыть всё.
- `git history` для переехавших пакетов прерывается на старых коммитах (нужен `git log --follow`).

## Альтернативы, которые отвергнуты

### A. Объединить `lib` и `vite` в один пакет `@capsuletech/builders`

Сломает bootstrap через цикл `vite ↔ compliance` (см. секцию «Решение»).

### B. Оставить старую раскладку, просто переименовать

Не решает семантическое смешение в `shared/`. И не объясняет, почему «libConfig — это отдельный пакет, а capsuleConfig — нет».

### C. Один пакет `@capsuletech/build-tools` со sub-entry для leaf

`compliance` всё равно зависел бы от **всего пакета**, а пакет (через `vite-builder` часть) — от compliance. nx-граф увидел бы цикл независимо от sub-entry.

## Связано

- [[004-compliance-linter|ADR 004]] — `@capsuletech/compliance`, который мы переносим.
- [[../../09-packages/core|@capsuletech/web-core]] — главный потребитель `vite-builder` через `capsule.config.ts`.

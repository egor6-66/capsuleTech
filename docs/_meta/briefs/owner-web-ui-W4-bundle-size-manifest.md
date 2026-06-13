---
title: owner-web-ui — Phase W4 brief
description: Bundle-size assertion test + manifest.json генерация для studio palette badge. Реализация L0/L1 gradient infra из W3.
status: documented
last_updated: 2026-06-11
---

# Brief — owner-web-ui — Phase W4 (bundle-size + manifest infra)

> **READ FIRST:** `docs/_meta/owner-agent-canon.md` — общие правила для owner-* агентов.
> **Plan-doc:** `docs/_meta/web-rework-plan.md` → W4.
> **Canon:** `docs/_meta/web-ui.md` секция «Weight gradient & size manifest» (полная schema там).

## Цель {#goal}

Реализовать infra L0/L1 weight-gradient'а, документированного в W3 (`docs/_meta/web-ui.md`). Две части:

1. **Bundle-size assertion** — vitest проверяет что L0-subpath'ы НЕ содержат `@kobalte/core/<interactive-set>` в графе + bundle size < N kB (gzip). Регрессия = test failure.
2. **`manifest.json` генерация** — build-time артефакт `packages/web/ui/dist/manifest.json` с реальными `sizeKB` per primitive. Studio palette (web-creator/studio) читает manifest и рисует бейдж рядом с каждым примитивом.

Это закрывает требование USER'а: «при сборке в web-studio надо знать размер компонента, юзер должен наглядно видеть цену за любой обвес».

## Что делать {#action}

### 1. Bundle-size test

**Файл:** `packages/web/ui/test/bundle-size.test.ts` (или подходящий путь под существующую структуру тестов).

**Approach:**
- Для каждого L0-subpath (см. seed list ниже) импортируем модуль через esbuild metafile / rolldown / Vite SSR build → получаем граф + gzip-size.
- Assert 1: bundle size < N kB (gzip). N калибруешь на seed list'е — выбери разумные пороги (типа 5kB для presentational, 8kB для native control). Зафиксируй финальные пороги в test'е + в `docs/_meta/web-ui.md` секции (обнови).
- Assert 2: в graph'е НЕТ `@kobalte/core/<interactive-set>` (allowlist: `polymorphic`, `separator`, `skeleton`). Чёрный список = всё остальное Kobalte interactive (dropdown / popover / dialog / select / slider / combobox / accordion / tooltip).

**L0 seed list** (из `docs/_meta/web-ui.md` W3 секции):
- Presentational + featherweight: `typography`, `card`, `flex`, `grid`, `layout`, `list`, `group`, `field`, `widget-frame`, `slot`, `separator`, `skeleton`, `spinner`.
- Native control: `label`, `button`, `input`, `textarea`, `table`.

Если калибровка покажет что какой-то «L0» примитив не лезет в порог — обсуди со мной (главным). Возможно классификация ошибочна и его перенесём в L1.

### 2. manifest.json генератор

**Файл:** `packages/web/ui/scripts/build-manifest.ts` (или Vite plugin внутри сборки).

**Schema** (canon в `docs/_meta/web-ui.md`):

```ts
export interface IPrimitiveManifestEntry {
  name: string;                    // 'Button', 'Card', 'Dropdown', ...
  weight: 'L0' | 'L1';             // tag для нарратива/фильтра
  subpath: string;                 // '@capsuletech/web-ui/button'
  sizeKB: number;                  // реальный gzip cost
  externals: string[];             // что в graph'е после tree-shake'а
  slotTags?: string[];             // для UiProxy meta-routing (опц.)
  variants?: Record<string, string[]>;  // для inspector (опц.)
}

export interface IWebUiManifest {
  version: string;                 // semver web-ui
  generatedAt: string;             // ISO
  primitives: IPrimitiveManifestEntry[];
}
```

**Steps:**
- Hook'ни в build pipeline (vite.config.mts или отдельный script вызываемый из `package.json` script `build:manifest`).
- Для каждого subpath'а из `package.json.exports`: измерь bundle (esbuild metafile или Vite stats), извлеки externals + gzip size.
- Эмитни `dist/manifest.json` атомарно.
- Variants — извлечь из CVA `createStyle` definitions (если структурно сложно — оставь optional на этой итерации).
- slotTags — если у компонента есть data-slot maps, экспонируй их.

**CI drift-guard:** `manifest.json` регенерируется при build'е → diff в CI должен быть зелёный, если у компонента не было реальных изменений. Если изменился — это сигнал что cost вырос/упал.

### 3. Обновить OWNERSHIP + docs

- `packages/web/ui/OWNERSHIP.md` — секция «Состояние» / «План рефакторинга»: пометить W4 manifest infra реализованной, обновить blockers (был activeblocker).
- `docs/_meta/web-ui.md` — финализировать пороги (N kB) в Weight Gradient секции после калибровки.

## PR {#pr}

Возможны два сценария:

**(a) Один atomic PR** (рекомендую если задачи логически связаны).

- **Title:** `feat(web-ui): bundle-size assertions + manifest.json infra (W4 / adr 047)`

**(b) Два PR'а** — bundle-size assert первым, manifest вторым (если первое надо обкатать).

- `feat(web-ui): bundle-size assertions per L0-subpath (W4 / adr 047)` →
- `feat(web-ui): build-time manifest.json for studio palette (W4 / adr 047)`

Выбор за тобой. Если решишь split — coordinate.

## Constraints {#constraints}

- **Zone:** `packages/web/ui/`. Не трогать web-core / web-creator / apps/*.
- **Lockfile:** если добавишь dev-dep (esbuild, rolldown, что-то для measurement) — `pnpm install` локально перед commit'ом.
- **Vite-builder rebuild:** если поменяешь export'ы web-ui — пересобери `@capsuletech/vite-builder` (см. CLAUDE.md Aliasing грабли).
- **Parallel WIP:** ui-kit/imports.tsx + ui/composites/index.ts + ui/icons/* в working tree — НЕ моё, НЕ коммитить. Только мои target файлы.

## Refs {#refs}

- W3 canon: `docs/_meta/web-ui.md` — раздел «Weight gradient & size manifest» (полная schema).
- W3 zone canon: `docs/_meta/web-zones/kit.md`.
- ADR 047 D3 — vendor transparency.
- PR #302 — W3 canon docs где впервые появилась схема.
- Studio palette consumer (будущее): `@capsuletech/web-creator` / `studio` — после Phase D4 будет читать manifest.

## Что НЕ делает этот brief {#non-goals}

- **B6-placeholder** (Ui.Map / Ui.Flow / Ui.Chart light placeholders в kit) — это **отдельная задача**, отдельный brief, делается после W4 либо параллельной сессией. См. `docs/_meta/briefs/owner-web-ui-B6-light-placeholders.md`.

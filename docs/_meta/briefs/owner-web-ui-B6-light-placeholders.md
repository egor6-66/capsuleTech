---
title: owner-web-ui — Phase B6-placeholder brief
description: Light placeholder'ы Ui.Map / Ui.Flow / Ui.Chart в kit. Зеркала boost-* пакетов для landing/preview use-cases.
status: documented
last_updated: 2026-06-11
---

# Brief — owner-web-ui — Phase B6-placeholder (light Ui.Map/Flow/Chart)

> **READ FIRST:** `docs/_meta/owner-agent-canon.md`.
> **Plan-doc:** `docs/_meta/web-rework-plan.md` → B6-placeholder.

## Цель {#goal}

Добавить **light placeholder'ы** для трёх боустеров в `@capsuletech/web-ui`:

- `Ui.Map` ↔ `@capsuletech/boost-map`
- `Ui.Flow` ↔ `@capsuletech/boost-flow`
- `Ui.Chart` ↔ `@capsuletech/boost-charts`

Принцип per [[044-web-menu-package|ADR 044]] D / [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] D3: **light версия всегда живёт в web-ui** (zero-cost), heavy engine — в boost-*. Apps без boost-* в bundle'е могут рендерить placeholder в landing'ах, preview'ах, skeleton-режимах.

## Что делать {#action}

### 1. Создать light-primitive в каждом из 3 subpath'ов

**Файлы:**
- `packages/web/ui/src/primitives/map/` — `Ui.Map` placeholder.
- `packages/web/ui/src/primitives/flow/` — `Ui.Flow` placeholder.
- `packages/web/ui/src/primitives/chart/` — `Ui.Chart` placeholder.

**Shape каждого placeholder'а:**
- Stateless Solid component.
- `role="img"` + meaningful `aria-label` (например "Map placeholder").
- `data-state="placeholder"` для consumers / тестов.
- Props API **compatible** с соответствующим boost-* root API (минимальное подмножество — `class`, размер). Не дублировать full props — только что нужно для placeholder layout.
- Visual: либо skeleton (через `Ui.Skeleton` или прямой CVA-class), либо иконка из `web-ui/icons` (`Map`, `Activity` для flow, `BarChart3` для chart) с appropriate framing.
- Никакого engine deps — НИ `maplibre-gl`, НИ `chart.js`, НИ `@dschz/solid-flow`. **Zero heavy deps** — это инвариант L0 в kit.

**Пример Ui.Map placeholder:**

```tsx
// packages/web/ui/src/primitives/map/map.tsx
import { Map as MapIcon } from '../../icons';
import { createStyle } from '@capsuletech/web-style';
import type { JSX } from 'solid-js';

const map = createStyle({
  base: 'relative grid place-items-center rounded-md bg-muted/30 text-muted-foreground',
  variants: {
    size: {
      sm: 'h-32',
      md: 'h-64',
      lg: 'h-96',
      full: 'h-full',
    },
  },
  defaultVariants: { size: 'md' },
});

export interface IUiMapProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  class?: string;
  children?: JSX.Element;
  ariaLabel?: string;
}

export const Map = (props: IUiMapProps) => (
  <div
    role="img"
    aria-label={props.ariaLabel ?? 'Map placeholder'}
    data-state="placeholder"
    class={map({ size: props.size, class: props.class })}
  >
    <MapIcon class="size-12 opacity-40" />
    {props.children}
  </div>
);
```

Аналогично Flow + Chart (с иконкой Activity / BarChart).

### 2. Subpath exports в `packages/web/ui/package.json`

Добавить:
- `/map` → `./dist/components/map/index.{mjs,d.ts}` (или соответствующая build-структура).
- `/flow` → ...
- `/chart` → ...

### 3. Index.ts re-export в barrel

`packages/web/ui/src/index.ts` — re-export Map / Flow / Chart из primitives.

### 4. tsconfig.base.json paths

Добавить в root `tsconfig.base.json`:
- `@capsuletech/web-ui/map` → `packages/web/ui/src/primitives/map/index.ts`
- `@capsuletech/web-ui/flow` → ...
- `@capsuletech/web-ui/chart` → ...

(Это shared infra — координируется через главного, но для add-only можно сам коммитить — главный auto-OK на add of zone-internal subpath.)

### 5. Регистрация в `web-core/ui-kit/imports.tsx`

⚠️ **Координация с owner-web-core / главным:** в `packages/web/core/src/ui-kit/imports.tsx` нужно добавить:

```tsx
// Static (если cheap) или lazy (рекомендую lazy — могут быть редко-используемые):
export const Map = createLazy(() => import('@capsuletech/web-ui/map'), 'Map');
export const Flow = createLazy(() => import('@capsuletech/web-ui/flow'), 'Flow');
export const Chart = createLazy(() => import('@capsuletech/web-ui/chart'), 'Chart');
```

⚠️ **Конфликт имён:** `Ui.Flow` уже **существует** в imports.tsx как Solid control-flow namespace (`For`, `Show`, `Switch`, ...). Тебе НЕ заехать поверх. Варианты:

- **Опция A:** переименовать наш light placeholder в `Ui.FlowDiagram` или `Ui.NodeCanvas` — чисто, но не симметрично с boost-flow.
- **Опция B:** переименовать существующий control-flow namespace на `Ui.SF` / `Ui.Cf` — breaking для apps.
- **Опция C:** рассмотреть merge — поднять placeholder под `Ui.Flow.Diagram` (placeholder), а Solid control-flow остаётся как `Ui.Flow.For/Show/...`. Compound namespace.

**Решение** — обсуди со мной (главным) перед commit'ом. Скорее всего опция A (FlowDiagram) — чисто и понятно.

### 6. Обновить OWNERSHIP

`packages/web/ui/OWNERSHIP.md` — секция «Состояние» / «Публичный API»: пометить B6-placeholder реализованной. Update `last-updated`.

### 7. Tests + Storybook

- Минимум один structural unit-test на каждый placeholder (role / aria-label / data-state).
- Storybook story с разными `size` вариантами.

## PR {#pr}

- **Title:** `feat(web-ui): light placeholders Ui.Map + Ui.Flow + Ui.Chart (B6-placeholder / adr 046 D3)`
- **Не uppercase / digit / `@` в subject** ([[pr-title-pattern]]).
- **Coordinate** с owner-web-core по `imports.tsx` — может быть отдельный sequential PR от owner-web-core ИЛИ один cooperate PR через главного. **Обсуди со мной до push'а.**

## Constraints {#constraints}

- **Zone:** `packages/web/ui/`. + один файл `packages/web/core/src/ui-kit/imports.tsx` cooperatively.
- **Никакого heavy engine deps в placeholder'ах** — zero `maplibre-gl` / `chart.js` / `@dschz/solid-flow` имports. Это инвариант kit zone'ы.
- **Lockfile:** только если что-то добавлено в deps (вряд ли).
- **Parallel WIP:** не трогать playground / auth / menu / backend.

## Refs {#refs}

- [[044-web-menu-package|ADR 044]] D — heavy=pkg / light=kit canon.
- [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] D3 — light always exists in web-ui.
- `docs/_meta/web-zones/kit.md` — kit invariants.
- `docs/_meta/web-zones/boost.md` — boost mirror canon (что boost-table/map/flow/charts отзеркаливают).

## Что НЕ делает этот brief {#non-goals}

- **W4 manifest infra** — отдельный brief (`docs/_meta/briefs/owner-web-ui-W4-bundle-size-manifest.md`). После B6 placeholder'ы попадут в manifest естественно (они L0).

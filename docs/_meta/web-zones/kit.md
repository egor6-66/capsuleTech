---
title: web-zone-kit
description: Canon для zone `kit` — stateless light primitives + light композиции. Source of truth о scope, импорт-правилах, vendor-stack и non-goals зоны.
status: canon
last_updated: 2026-06-11
---

# Zone: kit

> Физическая директория: `packages/web/kit/` (после Phase D миграции; на момент 2026-06-11 — `packages/web/ui/` в плоском layout'е).
>
> Канон-источники: [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 (zones), [[044-web-menu-package|ADR 044]] (heavy=pkg / light=kit-композиция), [[042-design-tokens|ADR 042]] (token canon).

## Purpose {#purpose}

**Stateless презентационные и интерактивные примитивы без тяжёлого движка.** Базовый словарь UI, на котором собирается всё остальное (runtime providers, domain widgets, boost mirror-ы, studio chrome). Kit — это «алфавит» capsule-приложения.

Kit-пакет обязан удовлетворять трём инвариантам:

1. **Stateless.** Никакого собственного state-store (Solid signals для локального UI-state — OK; провайдер/синглтон — НЕ kit).
2. **No heavy engine.** Нет dependency на runtime-tier библиотеки (XState / TanStack Query / MapLibre / Babylon / ...). Kobalte (a11y-headless) разрешён, потому что tree-shakeable per primitive.
3. **Vendor-transparent.** Wrapper'ы над вендорами без подмены API (см. ADR 047 D3). Senior FE открывает kit-исходник → узнаёт CVA + Kobalte + Tailwind v4 за 5 минут.

## Packages {#packages}

| Package | npm | Status | One-line |
|---|---|---|---|
| `web-ui` | `@capsuletech/web-ui` | stable | Capsule UI-kit: примитивы (Typography/Card/Flex/Grid/Button/Input/...) + composites (Field/Navigation/...). |

> Канон 2026-06-11: kit — **одна-пакетная зона** (`web-ui`). Внутри zone'ы — **внутренний weight-gradient L0/L1** (см. [[web-ui]] раздел «Weight gradient»). Леgalность L0-only консьюмеров обеспечивается subpath-export'ами + bundle-size assertion'ами, не отдельным пакетом.

## Import rules {#import-rules}

```
kit → (только) runtime/web-style + vendors
kit ↛ runtime/* (кроме web-style как peerDep)
kit ↛ domain/*
kit ↛ boost/*
kit ↛ studio/*
```

**Что kit-пакет может импортить:**

- `solid-js` (peerDep)
- `@capsuletech/web-style` — токены, `createStyle`, `cn`, `merge` (peerDep)
- `@kobalte/core/<primitive>` — a11y-headless, per-primitive subpath (peerDep)
- `class-variance-authority` — variant API (peerDep)
- Иконки: registry в самом kit'е, no external icon-package dep (см. [[icons-canon]])

**Что kit-пакет НЕ импортит:**

- `@capsuletech/web-core` — uses HCA wrappers — это runtime, не kit.
- `@capsuletech/web-state` — XState — это runtime.
- `@capsuletech/web-router`, `@capsuletech/web-query`, и т.д. — runtime сервисы.
- Любой domain/boost/studio пакет.

Compliance enforces: kit-пакет с импортом из runtime/domain/boost — это **wrong layer** (warning).

## Canonical shape {#canonical-shape}

Типичный kit-компонент:

```tsx
// packages/web/kit/ui/src/primitives/button/button.tsx
import { Slot } from '../slot/index.tsx';
import { createStyle } from '@capsuletech/web-style';
import type { JSX } from 'solid-js';

const button = createStyle({
  base: 'inline-flex items-center justify-center rounded-md transition-colors',
  variants: {
    intent: { primary: 'bg-accent text-accent-foreground', ghost: 'hover:bg-muted' },
    size:   { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-base' },
  },
  defaultVariants: { intent: 'primary', size: 'md' },
});

export interface IButtonProps {
  intent?: 'primary' | 'ghost';
  size?: 'sm' | 'md';
  asChild?: boolean;
  children?: JSX.Element;
}

export const Button = (props: IButtonProps) => (
  <Slot as="button" class={button({ intent: props.intent, size: props.size })}>
    {props.children}
  </Slot>
);
```

Признаки канона:
- Polymorphic через `Slot` (Kobalte `Polymorphic`).
- Стили через `createStyle` (CVA).
- Токены — Tailwind v4 `@theme inline`-классы (`bg-accent`, не hex).
- Никакого state, никакого signal'а, никакого provider'а.
- Props-only API — consumer конфигурирует через props, не через прокидывание classNames.

## Vendor stack {#vendor-stack}

- **Solid.js** (`^1.9.12`, peerDep) — реактивный фреймворк. Все компоненты — Solid JSX.
- **`@kobalte/core`** (`^0.13`, peerDep) — a11y-headless библиотека. Tree-shakeable per primitive (subpath import `@kobalte/core/dialog` тянет ТОЛЬКО dialog). Используется для interactive-примитивов (L1: Dropdown/Dialog/Combobox/Toggle/...) и для Polymorphic Slot.
- **`class-variance-authority`** (`^0.7`, peerDep) — variant API для классов. Используется через `web-style/createStyle`.
- **Tailwind v4** (`^4.2`) — utility CSS + `@theme inline` токены. См. [[web-style]] для token-канона.
- **`lucide-solid`** (deprecated 2026-06-09) — icon-set. **Канон 2026-06-11**: icons owned внутри web-ui (`packages/web/ui/src/icons/registry.ts`), не отдельный пакет.

Документация upstream:
- Kobalte → https://kobalte.dev/
- CVA → https://cva.style/
- Tailwind v4 → https://tailwindcss.com/

## Non-goals {#non-goals}

Kit **не делает**:

- ❌ State management (нет провайдеров, нет XState, нет signals-как-singleton). Если нужен state → runtime zone.
- ❌ Side effects (нет API-calls, нет router-navigation, нет storage). Если нужны → runtime/domain.
- ❌ HCA wrappers (Entity/Widget/Page/Controller/Feature). Эти живут в runtime (`web-core`).
- ❌ Тяжёлые движки (virtual-scroll engine, map-engine, graph-engine). Если нужен → boost zone (mirror в kit как light placeholder).
- ❌ Domain-логика (auth-форма, agent-chat, shell-header). Эти живут в domain (`web-auth`, `web-shell`, `web-agent`).
- ❌ Editor-функциональность (inspector, palette, canvas). Эти живут в studio (`studio`).
- ❌ Свои паттерны поверх вендорских. Если Kobalte даёт `<Dialog.Root>` — мы экспортим Kobalte API, не создаём `<MyDialog>` с тем же поведением.

## New package — checklist {#new-package-checklist}

Добавление нового kit-пакета — **исключительная ситуация** (kit = одна зона `web-ui` по канону). Перед PR'ом:

1. Открыть дискуссию с главным assistant'ом — почему не subpath в `web-ui` (`/icons`, `/composites/menu`)?
2. Если всё-таки отдельный пакет:
   - Зарегистрировать путь в `tsconfig.base.json` (`@capsuletech/<name>`).
   - Добавить в `optimizeDeps.exclude` в `packages/builders/vite/src/defines/capsuleConfig.ts` (см. CLAUDE.md «Aliasing»).
   - Создать `OWNERSHIP.md` по [[OWNERSHIP-template]] (обязательно: «Состояние» + «Vendor stack»).
   - Создать `README.md` по [[readme-template]] — minimum usage в 5-10 строк.
   - Создать AI-anchor `docs/_meta/<name>.md`.
   - Добавить bundle-size assertion в test-suite (kit-canon: L0-subpath imports < N kB, см. [[web-ui]] раздел manifest).
   - Зарегистрировать в release-group `web_base` в `scripts/release-local.mjs`.
   - Создать owner-агент `.claude/agents/owner-<name>.md` (см. [[owner-agent-canon]]).
3. ADR не нужен (kit не структурно меняется); анонс в `docs/_meta/web-rework-plan.md` если идёт rework.

## Related {#related}

- [[web-ui]] — AI-anchor для `@capsuletech/web-ui`.
- [[web-zone-runtime]] — соседняя zone, kit зависит ТОЛЬКО на `web-style` оттуда.
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 — zones canon.
- [[044-web-menu-package|ADR 044]] — heavy=pkg / light=kit-композиция principle.
- [[042-design-tokens|ADR 042]] — token canon.

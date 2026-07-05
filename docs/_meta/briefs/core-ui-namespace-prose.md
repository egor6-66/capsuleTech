---
title: web-core — ui.Prose в Ui-неймспейс (guard красный, блокирует push волны) — 5 минут
status: ready — 🔴 БЛОКЕР push
audience: owner-сессия `./claude-scope.sh core` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: []
---

# Контекст

ВТОРОЙ идентичный инцидент (прецедент Image/Avatar → `45dbf7ed`): kit добавил
манифест `ui.Prose`, wiring в `runtime/core/src/ui-kit/imports.tsx` не сделан →
guard `manifest-path-invariant` красный → pre-push волны заблокирован.
tsconfig path `@capsuletech/web-ui/prose` уже добавлен architect'ом.

# Scope (точный повтор 45dbf7ed)

1. `imports.tsx`: `export const Prose = createLazy(() =>
   import('@capsuletech/web-ui/prose'), 'Prose');` (конвенция Textarea/Image —
   не критический shell-путь).
2. `wrappers/interfaces.ts`: `typeof Prose` в ViewUiRaw + WidgetUiRaw
   (по образцу Image/Avatar).
3. Пара characterization-тестов в ui-meta-props (как для Image/Avatar).
4. OWNERSHIP: строка в refactor-log + **NOTE-канон**: «новый manifest-тип в
   kit = в ТОМ ЖЕ цикле wiring в imports.tsx + interfaces + path в
   tsconfig.base (эскалация architect'у) — guard ловит на pre-push, но цикл
   дешевле не запускать» (двух инцидентов достаточно).

# Acceptance

`pnpm --filter @capsuletech/web-core test` — 559+/559+, guard 3/3; build; biome 0.

---
title: web-core — провести ui.Image/ui.Avatar в Ui-неймспейс (красный guard = блок pre-push)
status: ready
audience: owner-сессия `claude-scope -Scope core` (commit-only, без push)
last_updated: 2026-07-04
adr_refs: []
---

# Контекст

Kit добавил примитивы Image + Avatar (коммит `20102e4b`, манифесты
`ui.Image`/`ui.Avatar` в `packages/web/kit/ui/src/primitives/{image,avatar}/`),
но в `packages/web/runtime/core/src/ui-kit/imports.tsx` они НЕ проведены →
guard-тест `src/ui-kit/__tests__/manifest-path-invariant.test.ts`
(«all manifest types resolve») красный → **pre-push хук валит всю волну
`feat/wave-voice-auth-gateway`**. Верифицировано 2026-07-04:
`pnpm --filter @capsuletech/web-core test -- manifest-path-invariant` → 1 failed.

# Scope

1. `imports.tsx`: импортировать и экспортнуть `Image` и `Avatar` в Ui-неймспейс
   по образцу соседей (субпаты `@capsuletech/web-ui/image`,
   `@capsuletech/web-ui/avatar` — exports в kit уже есть). Статик или lazy —
   по конвенции соседних примитивов того же веса.
2. Заодно снять гнилую allowlist-строку `ui.Animate` в
   `manifest-path-invariant.test.ts` (~строка 49) — манифест давно удалён из kit,
   запись orphaned (долг с 2026-07-02).

# Acceptance

- `pnpm --filter @capsuletech/web-core test` зелёные (в т.ч. manifest-path-invariant 3/3).
- `pnpm --filter @capsuletech/web-core build` чист; biome 0.
- После этого architect повторяет pre-push волны.

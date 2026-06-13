---
title: brief — owner-web-router — CapsuleOutlet + DepthContext + useRouteDepth rewrite
audience: owner-web-router
status: canon
created: 2026-06-11
phase: C1
---

# Brief — owner-web-router — `<CapsuleOutlet/>` + `DepthContext` + `useRouteDepth` rewrite

## Цель (Phase C1)

Routing-анимация на vt-name становится корректной **для вложенных Outlet'ов**. Сейчас `useRouteDepth` (PR #298) implementированный через `useMatches().length - 1` возвращает одно и то же число на каждом уровне Outlet'а → vt-name коллизия не уходит, только переименовывается с `capsule-content` на `capsule-content-N`. Перерабатываем impl на per-Outlet `DepthContext` через wrapper `<CapsuleOutlet/>`.

Контракт `useRouteDepth(): Accessor<number>` **сохраняется** (PR #298 контракт остаётся), impl меняется полностью.

## READ FIRST {#read-first}

- `docs/_meta/owner-agent-canon.md` — общие правила (workflow, git-scope joint-work, namespace discipline).
- `docs/_meta/router.md` — AI-anchor web-router (если есть; иначе изучи `packages/web/router/src/`).
- `docs/01-architecture/adr/046-boost-namespace-matrix-evict-vt-owner.md` D4 — почему мы это делаем.
- `docs/01-architecture/adr/045-web-taxonomy.md` #3 — original idea (depth-scoped vt-name).
- `docs/_meta/web-rework-plan.md` Phase C1 — твоя секция в plan-doc.

## Контекст (что в main)

- PR #298 `useRouteDepth(): Accessor<number>` через `useMatches({ select })` — merged. **Impl broken** для вложенных layout'ов (см. ADR 046 Problem 4).
- PR #299 (Shell.Matrix consume useRouteDepth) — **closed** without merge. Matrix не должна знать про routing per ADR 046 D4.
- PR #295 web-shell `/layout` + `/chrome` subpaths — partial superseded ADR 045 #1 (Matrix всё ещё в shell на момент C1; эвакуируется в Phase B per ADR 046 D2).
- main HEAD = `c151c32` (PR #300 triada ADR).

## Scope {#scope}

### 1. New file `src/CapsuleOutlet.tsx`

```tsx
import { Outlet } from '@tanstack/solid-router';
import { createContext, useContext, type ParentComponent } from 'solid-js';

const DepthCtx = createContext<number>(-1);

/**
 * CapsuleOutlet — wrapper над TanStack <Outlet/> с per-Outlet DepthContext.
 * Эмитит inline view-transition-name = capsule-content-${depth} + class vt-route-content.
 * Использовать вместо native Outlet (через web-core ui-kit/imports.tsx — Ui.Outlet).
 *
 * @see ADR 046 D4 — почему vt-name именно тут (не в Matrix/Shell).
 * @see ADR 045 #3 — depth-scoped vt-name original.
 */
export const CapsuleOutlet: ParentComponent = () => {
  const parent = useContext(DepthCtx);
  const depth = parent + 1;
  return (
    <DepthCtx.Provider value={depth}>
      <div
        class="vt-route-content"
        style={{ 'view-transition-name': `capsule-content-${depth}` }}
      >
        <Outlet />
      </div>
    </DepthCtx.Provider>
  );
};

/**
 * useRouteDepth — depth of the current Outlet level (root=0, nested=1, ...).
 * Same signature as PR #298 (Accessor<number>); impl rewritten to DepthContext.
 *
 * @see ADR 046 D4.
 */
export const useRouteDepth = (): (() => number) => {
  const depth = useContext(DepthCtx);
  return () => Math.max(0, depth);
};
```

### 2. Drop старый `useRouteDepth` impl

- Старый файл `src/useRouteDepth.ts` (через `useMatches`) — удалить.
- Старый тест `src/__tests__/useRouteDepth.test.ts` — удалить (он тестил old impl с mock'ами).
- Любые internal usages — replace.

### 3. Index exports

`src/index.ts`:
- `export { CapsuleOutlet, useRouteDepth }` (либо два export'а если хочешь — это твоё решение).
- НЕ удаляй существующие public exports.

### 4. Тесты

`src/__tests__/CapsuleOutlet.test.tsx`:
- Render `<DepthCtx.Provider value={X}><CapsuleOutlet/></DepthCtx.Provider>` (если экспортируешь DepthCtx) ИЛИ `<CapsuleOutlet>` напрямую (depth=0 по default).
- Проверка inline-style → `view-transition-name: capsule-content-0`.
- Nested `<CapsuleOutlet>` внутри другого `<CapsuleOutlet>` → выдаёт depth=1.
- `useRouteDepth()` внутри `<CapsuleOutlet>` → 0; внутри nested → 1.

Минимум 5 тестов.

### 5. OWNERSHIP.md обновить

- Секция «Состояние» (если есть) — фиксируй CapsuleOutlet добавился.
- Секция «Публичный API» — добавь `CapsuleOutlet` (component) + `useRouteDepth` (rewrite-note).
- Секция «Vendor stack» (если ещё нет per ADR 047 D3) — `@tanstack/solid-router` (`^X.Y`) с упоминанием.

### 6. AI-anchor (если есть)

`docs/_meta/router.md` (если file есть) — секция про CapsuleOutlet + DepthContext, 5-10 строк + примеры использования.

## Что НЕ делать

- НЕ swap'ай `Ui.Outlet` в `web-core/src/ui-kit/imports.tsx` — это **Phase C2** (главный assistant делает).
- НЕ трогай `apps/playground/src/pages/workspace/web-studio/index.tsx` — тоже Phase C2.
- НЕ обновляй `web-style` CSS селекторы — это **Phase C3** (owner-web-style).
- НЕ трогай packages/web/shell/* — это **Phase B2** (owner-web-shell + owner-boost-matrix cooperate).
- НЕ переименовывай `useRouteDepth` (контракт сохраняется per PR #298).

## Verification

После реализации:
- `pnpm --filter @capsuletech/web-router build` → green.
- `pnpm --filter @capsuletech/web-router test` → 5+ green tests.
- `pnpm --filter @capsuletech/web-router typecheck` → green.
- (Если возможно) — verify в браузере: открой Chrome MCP в своей вкладке на USER'ском :3050, navigate playground, посмотри что vt-name теперь dynamic (через DevTools Elements → inline-style).
  - На момент C1 standalone — visual эффект ещё **не** виден, потому что Ui.Outlet ещё не swapped (Phase C2). Visual verify полноценный — после C2 merged.

## Git scope

USER может параллельно дорабатывать playground / web-shell / другие места. Per joint-work rule:
- `git status -s` ДО старта — baseline.
- После реализации — твой scope = `packages/web/router/**`. Stage **только это** в свою feature-ветку.
- Если USER явно скажет «возьми с собой apps/playground/...» — забираешь. По default — нет.

## Deliverable {#deliverable}

PR `refactor(web-router): CapsuleOutlet + DepthContext owns vt-name (adr 046 D4 / Phase C1)`.

Branch `feat/web-router-capsule-outlet`.

PR body:
```
## Summary
- Phase C1 (per ADR 046 D4) — vt-name ownership moves from Shell.Matrix to web-router/CapsuleOutlet.
- New `<CapsuleOutlet/>` wrapper over TanStack Outlet + DepthContext.Provider per level.
- `useRouteDepth()` rewritten as `useContext(DepthCtx)` — same signature as PR #298, impl correct for nested layouts.
- DROP old useMatches-based impl + tests.

## Test plan
- [ ] 5+ unit tests covering root depth, nested depth, useRouteDepth inside CapsuleOutlet
- [ ] Build/Test/Typecheck green
- [ ] CI all-green
- [ ] Visual verification deferred to C2 merge (Ui.Outlet swap)
```

Когда готов → reportишь USER'у с PR-номером + краткой self-verification сводкой. USER передаёт главному.

После твоего merge'а:
- **Phase C2** (главный) — swap Ui.Outlet в web-core/ui-kit/imports.tsx + apps/playground/web-studio/index.tsx (`<div>wdad</div>` → `<Ui.Outlet/>`).
- **Phase C3** (owner-web-style) — enumerate `::view-transition-{old,new}(capsule-content-{0..3})` + group selectors.

Эта PR — **foundation**, C2/C3 на тебе **не зависят** (USER решает sequencing).

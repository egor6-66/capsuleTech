# @capsuletech/boost-layout

Heavy Layout booster for capsule — augments `Ui.Layout` namespace with resize/DnD/persistent variants (Matrix first). · zone: **boost** · status: **scaffold**

Currently a placeholder package (Phase B1). Matrix code lands in Phase B2 — see `OWNERSHIP.md` for the roadmap.

## Install

```bash
pnpm add @capsuletech/boost-layout
```

Peer deps: `solid-js`, `@capsuletech/web-core`, `@capsuletech/web-ui`.

## Minimum usage (post-B2 target)

Once Matrix arrives, consumers register boost-layout via `capsule.config.ts` and use the augmented kit namespace:

```ts
// apps/<app>/capsule.config.ts
import { defineCapsuleConfig } from '@capsuletech/vite-builder';

export default defineCapsuleConfig({
  packages: ['@capsuletech/boost-layout'],
});
```

```tsx
// In any Widget / Page — Ui.Layout.Matrix works after boost-layout is registered.
const Dashboard = Widget((Ui) => (
  <Ui.Layout.Matrix regions={[/* …grid layout */]} />
));
```

## Docs

- AI-anchor: `docs/_meta/boost-layout.md` (TBD, post-B2)
- OWNERSHIP: `./OWNERSHIP.md`
- Architecture: [ADR 046](../../../../docs/01-architecture/adr/046-boost-namespace-matrix-evict-vt-owner.md) — augmentation pattern (Decision 5)
- Plan: [`docs/_meta/web-rework-plan.md`](../../../../docs/_meta/web-rework-plan.md) — Phase B1/B2/B3

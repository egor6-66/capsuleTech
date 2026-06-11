# @capsuletech/web-access

Единая gate-ось capsule: authn + RBAC + entitlements + feature-toggle/inject — НЕ четыре механизма, а ОДИН. `capability` (тег на цели: фиче/роуте/пункте/кнопке) → резолвер `can(cap)` → enforcement.  ·  zone: **runtime**  ·  status: **scaffold (0.0.0)**

> **⚠️ Active drift:** package.json содержит `@capsuletech/web-auth` (domain) как dep — это runtime → domain wrong direction per ADR 047 D2. Будет переписан на контракт в `web-contract` в Phase D2.

## Install

```bash
pnpm add @capsuletech/web-access
# peer deps:
pnpm add solid-js
```

## Minimum usage

> **STATUS: scaffold** — публичный API в процессе.

```ts
// Целевой shape:
import { can, defineGate } from '@capsuletech/web-access';

// Capability — свойство назначения (route/widget/button), не ветка в коде:
defineGate({
  '/admin':         ['admin-panel'],
  'widget:export':  ['data-export'],
  'button:delete':  ['can-delete-user'],
});

// Где-то в feature:
if (can('admin-panel')) router.goTo('/admin');
```

## Docs

- AI-anchor: [`docs/_meta/web-access.md`](../../../docs/_meta/web-access.md) _(TBD)_
- Zone canon: [`docs/_meta/web-zones/runtime.md`](../../../docs/_meta/web-zones/runtime.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 047 D2 (no horizontal between domain; web-access ↛ web-auth direct, via contract).

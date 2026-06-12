# @capsuletech/web-router

Context-based обёртка над `@tanstack/solid-router` для capsule: `createRouter` + `useRouter` + стабильный `ICapsuleRouter` API (`goTo` / `back` / `current` / `raw`) + `CapsuleOutlet` (vt-name owner per ADR 046 D4).  ·  zone: **runtime**  ·  status: **stable (0.1.1)**

## Install

```bash
pnpm add @capsuletech/web-router
# peer deps:
pnpm add solid-js @tanstack/solid-router @tanstack/router-core
```

## Minimum usage

```tsx
import { createRouter, RouterProvider, useRouter } from '@capsuletech/web-router';

// 1. Создание (в bootstrap-стеке web-core/createRoot):
const router = createRouter({ routeTree, defaultPreload: 'intent' });

// 2. Provider:
<RouterProvider router={router}>
  <App />
</RouterProvider>

// 3. Consume в Feature/Controller через services.router:
const Login = Feature(({ router }) => ({
  initial: 'idle',
  states: {
    idle: { onSubmit: async () => router.goTo('/dashboard') },
  },
}));
```

В capsule-аппе router инжектится автоматически через `BaseProviders` (web-core). Feature получает `router` в `services` arg.

## Docs

- AI-anchor: [`docs/_meta/web-router.md`](../../../docs/_meta/web-router.md)
- Zone canon: [`docs/_meta/web-zones/runtime.md`](../../../docs/_meta/web-zones/runtime.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- User guide: [`docs/09-packages/router.md`](../../../docs/09-packages/router.md)
- ADR 003 (Context-based router), ADR 014 (goTo options), ADR 046 D4 (CapsuleOutlet vt-name).

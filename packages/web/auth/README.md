# @capsuletech/web-auth

Auth domain-пакет capsule: вход/сессия/формы, параметризуется ОСЬЮ СТРАТЕГИИ ВХОДА через subpath'ы (`/role`, `/credentials`, `/oauth2`, `/qr`).  ·  zone: **domain**  ·  status: **scaffold (0.0.0)**

Generic auth-FSM (idle → submitting → authed/error) параметризуется стратегией. Эмиттит именованные `onLogin` / `onLogout` / `onError` через `useEmit` (ADR 032). Контракт `/auth/login` чистый; моки — app preRequest + shared-zod/gen (НЕ MSW). См. [[039-web-auth-package|ADR 039]].

## Install

```bash
pnpm add @capsuletech/web-auth
# peer deps:
pnpm add solid-js
```

## Minimum usage

> **STATUS: scaffold** — публичный API в процессе. Целевой shape ниже.

```tsx
// apps/<app>/src/features/auth.ts
import type { AuthEvents } from '@capsuletech/web-auth';

export default Feature<AuthEvents>(({ router, authApi }) => ({
  initial: 'idle',
  states: {
    idle: {
      onLogin: async ({ payload }) => {
        await authApi.login(payload);
        router.goTo('/dashboard');
      },
      onLogout: async () => { /* ... */ },
      onError: async ({ payload }) => { /* ... */ },
    },
  },
}));

// apps/<app>/src/widgets/login-form.tsx
import { Auth } from '@capsuletech/web-auth/credentials';
export default Widget((Ui) => <Auth.LoginForm />);
```

## Subpath exports (axis of strategy)

- `/role` — role-based вход (виден в registry).
- `/credentials` — email/password + form.
- `/oauth2` — OAuth flow + redirects.
- `/qr` — QR-code вход.
- `/session` — useSession / useAuth hooks.
- `/controllers` — `Controllers.Auth.*` HCA-адаптер (ADR 032).
- `/ui` — auth form-блоки.
- `/capsule` — `defineCapsuleModule` manifest (ADR 033).

## Docs

- AI-anchor: [`docs/_meta/web-auth.md`](../../../docs/_meta/web-auth.md) _(TBD)_
- Zone canon (no-horizontal, contract pattern): [`docs/_meta/web-zones/domain.md`](../../../docs/_meta/web-zones/domain.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 039 (web-auth package), ADR 032 (package /controllers + useEmit), ADR 033 (defineCapsuleModule), ADR 047 D2 (no horizontal between domain).

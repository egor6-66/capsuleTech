# @capsuletech/web-router

Тонкая обёртка над `@tanstack/solid-router` для Capsule: фабрика `createRouter`, Solid-контекст `RouterContext` + хук `useRouter`, ре-экспорт `RouterProvider`. Скрывает детали TanStack за стабильным `ICapsuleRouter` API (`goTo` / `back` / `current` / `raw`).

Документация — в Obsidian-vault'е:

- `docs/09-packages/router.md` — обзор пакета, карта файлов, точки входа.
- `docs/01-architecture/adr/003-router-context.md` — почему Context-based роутер, история (singleton → context).

Сборка: `pnpm nx build @capsuletech/web-router` (Vite через `@capsuletech/lib-builder`).
Тесты: `pnpm --filter @capsuletech/web-router test` (9 шт., node-env).

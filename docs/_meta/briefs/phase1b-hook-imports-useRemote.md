---
title: 'HOOK_IMPORTS — useRemote auto-import + compliance allowlist (host→canvas unblock)'
status: ready
audience: owner-builders
last_updated: 2026-06-22
adr:
  - docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md
ai-anchor: docs/_meta/cli.md
relates:
  - docs/_meta/briefs/phase1a-web-remote-context-singleton.md (Phase 1a, owner-web-remote — singleton invariant)
  - PR #398 (RemoteManifestPlugin Phase 1a + canvas→host smoke)
---

# Контекст

Phase 1a (`web-remote singleton invariant`) закрыл root-cause dual-instance бага через alias-fix в `tsconfig.base.json`. `useRemote()` теперь технически работает — `<Remote.Provider>` (global registration) и `useRemote()` читают **один** `RemoteContext`.

**Что блокирует host→canvas user-facing сценарий:**

В реальном app-коде вызов `const { remote } = useRemote();` в `apps/<app>/src/widgets/...` требует import:

```ts
import { useRemote } from '@capsuletech/web-remote';
```

Compliance Phase L (`app-package-import` — error severity, см. `packages/builders/compliance/src/check.ts:39-41`) **блокирует любой** runtime `@capsuletech/*` import из `apps/*/src/`. Это валит CI gate.

Существующий паттерн обхода — **AutoImport через `HOOK_IMPORTS`** (`packages/builders/vite/src/plugins/constants.ts:58-62`):

```ts
export const HOOK_IMPORTS = {
  '@capsuletech/web-core': ['useCtx'],
  '@capsuletech/web-router': ['useRouter'],
  '@capsuletech/desktop/runtime': ['useDesktop'],
} as const;
```

`useCtx`/`useRouter`/`useDesktop` инжектятся как globals в TSX через `unplugin-auto-import` (в `capsuleConfig.ts:233+`). Их использование в app-коде не требует ручного import → compliance не видит нарушения.

`useRemote` идеально подходит под этот же паттерн — это runtime hook для доступа к контексту, не side-effect код.

# Скоп

Добавить `useRemote` (из `@capsuletech/web-remote`) в `HOOK_IMPORTS`, **И** убедиться что compliance не валит ни сам AutoImport-инжект, ни ручные `useRemote` вызовы.

## Что точно делается

1. **`packages/builders/vite/src/plugins/constants.ts`** — расширить `HOOK_IMPORTS`:
   ```ts
   '@capsuletech/web-remote': ['useRemote'],
   ```

2. **Проверить инжект** через `unplugin-auto-import` — в `capsuleConfig.ts` AutoImport уже потребляет `HOOK_IMPORTS` через spread/итерацию. Подтвердить что новая запись подхватывается без дополнительной правки (если нет — добавить).

3. **Compliance allowlist** — основная задача:
   - Когда AutoImport инжектит `import { useRemote } from '@capsuletech/web-remote'` в app TSX (например `apps/playground/src/widgets/.../canvas.tsx`), compliance-плагин видит этот import и должен **пропустить** его как `kind: HOOK_IMPORTS-allowed`, НЕ как `app-package-import`.
   - Реализация: в `check.ts` при проверке `app-package-import` сверять `(source, importedNames[])` с runtime-доступным `HOOK_IMPORTS` registry. Если все imported names из allowlist для этого source → skip.
   - **Важно**: `HOOK_IMPORTS` живёт в `vite-builder`, compliance — в `compliance` пакете (build-time линтер). Дублировать константу — плохо. Варианты:
     - (a) Вынести `HOOK_IMPORTS` в `@capsuletech/compliance` как source of truth, `vite-builder/constants.ts` импортит оттуда. Семантически правильнее (compliance — gate of rules), но затрагивает граф зависимостей builders'ов — проверить нет ли cycle (vite-builder → compliance уже есть; обратный путь не нужен).
     - (b) Передавать `hookImports` как опцию `CompliancePlugin` из `capsuleConfig.ts`. Compliance-пакет остаётся generic, vite-builder декларирует policy. Менее DRY, но изоляция чище.
     - **Owner-builders выбирает после оценки.** Если cycle нет — (a) предпочтительнее.

4. **Тесты compliance** — добавить кейсы в `packages/builders/compliance/src/__tests__/check.test.ts`:
   - `widget importing useRemote from @capsuletech/web-remote → OK` (allowlisted).
   - `widget importing { Provider } from @capsuletech/web-remote → app-package-import` (всё остальное всё ещё запрещено).
   - `widget importing { useRemote, RemoteContext } from @capsuletech/web-remote → app-package-import` (mixed import — нарушение, RemoteContext не в allowlist).

5. **Тесты vite-builder** — если есть unit-тесты на `HOOK_IMPORTS`/AutoImport — расширить. Если нет — smoke в `apps/playground`.

## Smoke (acceptance)

- [ ] В `apps/playground/src/widgets/studio/canvas.tsx` (или новый thin bridge component): `const { remote } = useRemote(); remote('universal-canvas').send('ping', { ts: Date.now() })` **без явного import** `useRemote`. AutoImport инжектит. Compliance — clean (`pnpm compliance:check` без error).
- [ ] Канвас (iframe-side) ловит `ping` через `ctx.channel.on('ping', cb)` в bootstrap'е. Console-лог в iframe DevTools подтверждает receive.
- [ ] `pnpm test:e2e:cli` — smoke fixture green.
- [ ] `pnpm nx run-many -t typecheck` + `pnpm lint` — clean.

# Что НЕ в этом PR

- Любые правки `@capsuletech/web-remote` сам (это зона owner-web-remote, закрыто в Phase 1a).
- Cross-origin iframe — Phase 2+.
- Расширение HOOK_IMPORTS под другие пакеты (web-state hooks, web-query hooks) — отдельные брифы при необходимости.
- `@capsuletech/web-remote/capsule` allowlist — НЕ нужен, capsule subpath грузится только через registry, app-код туда не лезет.

# Известные риски

1. **Mixed-import edge case** — если user пишет `import { useRemote, Provider } from '@capsuletech/web-remote'`, allowlist должен валить **весь** import (не silent-strip allowed names). Compliance ловит как `app-package-import` с reference на конкретный disallowed symbol. См. test-case в acceptance.

2. **AutoImport precedence** — если user **руками** пишет `import { useRemote } from '@capsuletech/web-remote'`, AutoImport не инжектит (видит существующий). Этот ручной import должен **тоже** проходить compliance allowlist (это легитимный equivalent инжекта). Тест-кейс покрыть.

3. **Cycle check** для варианта (a) — `compliance` пакет НЕ должен зависеть от `vite-builder` (build-time линтер должен быть запускаем standalone в CI). Если выбираешь (a), `HOOK_IMPORTS` живёт в `compliance`, vite-builder тянет оттуда — однонаправленный depend, без cycle.

# Контекст для root cause

Этот бриф разблокирует **acceptance criterion из Phase 1a** который оказался невыполним as-is (compliance violation). См. summary owner-web-remote (2026-06-22): «host→canvas через `useRemote()` в `canvas.tsx` невозможен без compliance violation. Зафиксировано как TODO в OWNERSHIP.md». Этот бриф закрывает этот TODO.

Параллельный бриф `phase1a-web-core-create-capsule-app.md` (owner-web-core, multi-Solid iframe-side) **независим** — может мержиться в любом порядке относительно этого.

---
title: 'fix(web-remote): update buildSrcdoc.test.ts to new IBuildSrcdocParams signature'
status: ready
audience: owner-web-remote
last_updated: 2026-06-22
relates:
  - PR #413 (cross-PR currently red on Typecheck — this brief unblocks)
---

# Контекст

PR #413 (`feat(web-core, web-remote): host-canvas phase 1a finalize ...`) красный на Typecheck CI. **Одна причина в web-remote зоне:**

`packages/web/runtime/remote/src/runtime/buildSrcdoc.ts` обновился — `IBuildSrcdocParams` теперь требует обязательное поле `hostOrigin: string` (для Phase 1b importmap inject). Существующий тест-файл `packages/web/runtime/remote/src/runtime/__tests__/buildSrcdoc.test.ts` НЕ обновили под новую сигнатуру — 8 вызовов `buildSrcdoc({ ... })` падают на TS2345 («`hostOrigin` missing»).

`RemoteComponent.tsx` (production-consumer) уже передаёт `hostOrigin` — он не сломан. Только тест-файл.

Вторая причина CI-краснухи (tsconfig path для `@capsuletech/web-core/bootstrap`) — **уже фикшена architect'ом на этой же ветке**, не твоя забота.

# Скоп

ТОЛЬКО один файл: `packages/web/runtime/remote/src/runtime/__tests__/buildSrcdoc.test.ts`.

Минимальная правка — добавить `hostOrigin` во все 8 вызовов `buildSrcdoc({...})`.

# Шаги

## 0. Verify branch

```bash
git -C D:/CODING/projects/my/capsule fetch origin
git -C D:/CODING/projects/my/capsule switch feat/phase1a-host-canvas-finalize
git -C D:/CODING/projects/my/capsule pull --ff-only
git -C D:/CODING/projects/my/capsule log --oneline -3
```

Ожидаем последний коммит начинающийся с `feat(web-core, web-remote): host-canvas phase 1a finalize` (sha `278f9df1` или новее если architect уже добавил tsconfig-fix коммит).

## 1. Verify failure reproduces

```bash
pnpm nx run @capsuletech/web-remote:typecheck
```

Должно упасть с 8 ошибками вида:
```
src/runtime/__tests__/buildSrcdoc.test.ts(XX,30): error TS2345: Argument of type '{ name: string; instanceId: string; sessionId: string; module: IRemoteModuleConfig; manifest: IRemoteManifest; bootUrl: string; }' is not assignable to parameter of type 'IBuildSrcdocParams'.
```

Если упало с этими ошибками — продолжай. Если другие ошибки — STOP, сообщи architect'у.

## 2. Edit the test file

`packages/web/runtime/remote/src/runtime/__tests__/buildSrcdoc.test.ts`

### 2a. Add HOST_ORIGIN constant

После строки:
```ts
const BOOT_URL = 'http://localhost:5173/@capsuletech/web-remote/dist/boot.mjs';
```

Добавить:
```ts
const HOST_ORIGIN = 'http://localhost:5173';
```

### 2b. Add `hostOrigin: HOST_ORIGIN,` в каждый из 8 вызовов `buildSrcdoc({...})`

В каждом блоке вида:
```ts
const html = buildSrcdoc({
  name: '...',
  instanceId: '...',
  sessionId: '...',
  module: MODULE,
  manifest: MANIFEST,
  bootUrl: BOOT_URL,
});
```

Превратить в:
```ts
const html = buildSrcdoc({
  name: '...',
  instanceId: '...',
  sessionId: '...',
  module: MODULE,
  manifest: MANIFEST,
  bootUrl: BOOT_URL,
  hostOrigin: HOST_ORIGIN,
});
```

Все 8 вызовов идентичны по структуре — последняя строка `bootUrl: BOOT_URL,` перед `});`. Можно sed'ом или find/replace в редакторе. Семантически: добавить ОДНУ строку `hostOrigin: HOST_ORIGIN,` после `bootUrl: BOOT_URL,` в каждом блоке.

## 3. Verify fix

```bash
pnpm nx run @capsuletech/web-remote:typecheck
```

Clean. Если красно — STOP, диагностируй.

```bash
pnpm nx run @capsuletech/web-remote:test
```

Все green (8 тестов в buildSrcdoc.test.ts + 4 в dualImport.test.tsx + остальные регрессии). Если красно — STOP.

## 4. Commit

```bash
git -C D:/CODING/projects/my/capsule add packages/web/runtime/remote/src/runtime/__tests__/buildSrcdoc.test.ts
git -C D:/CODING/projects/my/capsule commit -m "fix(web-remote): update buildSrcdoc.test.ts to new IBuildSrcdocParams signature

Adds hostOrigin: HOST_ORIGIN to all 8 buildSrcdoc() test calls. Required by
Phase 1b importmap inject (IBuildSrcdocParams.hostOrigin is now mandatory).
RemoteComponent.tsx (prod consumer) already passes hostOrigin; only the test
fixture was missed.

Unblocks PR #413 Typecheck CI."
```

## 5. STOP

Сообщи architect'у в чате что commit готов. Дай SHA. Architect делает push и продолжает watch CI на PR #413.

# Что НЕ трогать

- Любые другие файлы, даже в твоей зоне. Только `buildSrcdoc.test.ts`.
- `git push` — это делает architect.
- `git switch` / `git rebase` / другие destructive ops.

Если что-то пошло не так на любом шаге — STOP, сообщи architect'у.

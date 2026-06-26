---
tags: [builders, vite-builder, adr-060, brief, phase-3, owner-builders]
status: ready
date: 2026-06-25
zone: owner-builders (claude-scope vite-builder)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
sequence: 1-of-3 (прокинуть контракт в entry; web-core 2-of-3 его потребляет)
---

# Brief — builders: прокинуть `contract` аппа в `createCapsuleApp` (ADR 060 Phase 3 / D1)

> [!info] Кому: **owner-builders**. `claude-scope vite-builder`. Прочитай `OWNERSHIP.md` +
> `src/plugins/capsuleRegistry.ts` (`generateIndexEntry` / `generateBootstrap`). НЕ коммить.

## Зачем
Phase 3 (D1): фреймворк форвардит хосту ТОЛЬКО события, объявленные в `out` контракта аппа, и
валидирует входящие host-диспатчи по `in`. Для этого `createCapsuleApp` (web-core, 2-of-3) нужен сам
контракт в рантайме. Контракт автор пишет в `apps/<app>/contract.ts` (`defineContract`) — прокинуть его
в сгенерённый entry.

## Изменение — `generateIndexEntry` (+ `generateBootstrap`, как с `appConfig`)
Если `apps/<app>/contract.ts` существует — entry импортит его и передаёт в `createCapsuleApp`:
```ts
// .capsule/index.ts (если есть contract.ts):
import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
import { appConfig, routeTree } from './bootstrap';
import contract from '../contract';   // ← NEW, только если contract.ts есть
createCapsuleApp('root', { routeTree, appConfig, basepath: import.meta.env.BASE_URL, contract });
```
- Если `contract.ts` НЕТ — `contract` НЕ передавать (опциональный, standalone-апп без контракта работает как раньше).
- Реэкспорт `contract` можно через `bootstrap.tsx` (как `appConfig`/`routeTree`) или прямым импортом `../contract` в `index.ts` — на твоё усмотрение, лишь бы резолвилось.
- ⚠️ contract.ts использует `defineContract` как bare-глобал (auto-import). В entry/bootstrap (вне TSX-auto-import-графа) при необходимости инжектни импорт (как делает `ContractArtifactPlugin.ensureDefineContractImport` — переиспользуй/вынеси), ИЛИ импортни default аппа без обращения к `defineContract` (default уже вычислен в contract.ts).

## Что НЕ трогать
- `ContractArtifactPlugin` (артефакт-эмит) — без изменений.
- `createCapsuleApp` сигнатура/логика — web-core (2-of-3); ты только ПЕРЕДАЁШЬ `contract`.

## Тесты — `__tests__/capsuleRegistry.test.ts`
- `contract.ts` есть → сгенерённый `index.ts` импортит контракт + передаёт `contract` в `createCapsuleApp`.
- `contract.ts` нет → `contract` НЕ в вызове (no-op).

## Верификация
```
pnpm --filter @capsuletech/vite-builder test
pnpm --filter @capsuletech/vite-builder typecheck
pnpm --filter @capsuletech/vite-builder build
```
Хвосты + diff architect'у. НЕ коммить.

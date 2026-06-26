---
tags: [web-core, adr-060, brief, realign, phase-3, owner-web-core]
status: ready
date: 2026-06-26
zone: owner-web-core (claude-scope core)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
voids:
  - adr-060-phase3-web-core-seams-for-host-bridge.md
---

# Brief — web-core: revert host-HCA-bridge семы (`tryUseEmit` + context-service), оставить D1-мост

> [!info] Кому: **owner-web-core**. `claude-scope core`. Ветка `feat/adr060-phase3-event-bridge`
> (Phase 3 работа уже там). Прочитай `OWNERSHIP.md` + **ADR 060 §D1** + `engine/use-emit.ts` +
> `engine/package-services.ts` + `engine/logic-wrapper.tsx` + `engine/host-bridge.ts`. **НЕ коммить.**

## Почему (решение architect+user 2026-06-26)
Выравниваем Phase 3 строго на ADR 060 D1. Реализация добавила СВЕРХ ADR два сема **только** под
host-HCA-мост web-remote (бриф `adr-060-phase3-web-core-seams-for-host-bridge.md`, **VOID**):
- `tryUseEmit` — чтобы RemoteComponent диспатчил событие ремоута в host-HCA;
- `registerContextService` / `getContextServices` — чтобы инжектить host→app `remote`-сервис в Features.

web-remote (парный бриф `...realign-web-remote-on-star-only.md`) переходит на канон D1: app→host =
`on*`-пропсы, host→app = `useRemote(name).dispatch()`. После этого **оба сема — мёртвый код**
(grep подтвердил: единственные потребители — снесённый мост web-remote). По канону §0 (не строить
вперёд дизайна, не оставлять unused seam от отменённого подхода) — **ревертим оба**.

## ⚠️ Граница: что РЕВЕРТИТЬ vs что ОСТАВИТЬ
`logic-wrapper.tsx` + `host-bridge.ts` несут ДВЕ разные вещи. **Оставляем D1-мост, ревертим только семы.**

### ОСТАВИТЬ (это ADR 060 D1 — НЕ трогать)
- `engine/host-bridge.ts` **целиком**: `IRootForward`/`RootForwardContext`/`useRootForward` (app→host
  forward-from-root) + `IHostInbound`/`HostInboundContext`/`useHostInbound`/`createHostInbound`
  (host→app inject-в-корень).
- `logic-wrapper.tsx`: `applyRootForward`, `useRootForward`-гейт на корне, `useHostInbound`-регистрация
  корневого dispatcher'а (`hostInbound.register(... ctxEmit ...)`) + импорты `IControllerHandle`,
  `IRootForward`/`useHostInbound`/`useRootForward`.
- `createCapsuleApp` (приём `contract`, embed-handshake, forward хосту, host→app listener+inject) —
  без изменений.

## Scope — что РЕВЕРТИТЬ

### 1. `engine/use-emit.ts` — убрать `tryUseEmit`
- Удалить `export const tryUseEmit = (): EmitFn | undefined => {...}` (стр. ~146–160).
- Оставить `useEmit`, `createEmit`, `normalizeTarget`, `buildEmitFromCtx` (engine-internal) без изменений.

### 2. `wrappers/index.ts` — убрать реэкспорт
- Стр. 21: `export { tryUseEmit, useEmit } from '../engine/use-emit';` → `export { useEmit } from '../engine/use-emit';`.

### 3. `engine/package-services.ts` — убрать context-service блок
- Удалить весь блок «Context-scoped (render-scope) package services — ADR 060 Phase 3» (стр. ~80+):
  `_contextRegistry`, `registerContextService`, `getContextServices`.
- Оставить `registerPackageServices` / `getPackageServices` (статический реестр) без изменений.

### 4. `src/index.ts` — убрать реэкспорт
- Стр. 1: `export { registerContextService, registerPackageServices } from './engine/package-services';`
  → `export { registerPackageServices } from './engine/package-services';`.

### 5. `engine/logic-wrapper.tsx` — убрать ТОЛЬКО обвязку `getContextServices`
- Импорт: `import { getContextServices, getPackageServices } from './package-services';`
  → `import { getPackageServices } from './package-services';`.
- В сборке `services` убрать оба спреда `...getContextServices(),` (ветки `feature` и `controller`).
  Вернуть комментарий к исходной формулировке (без «context-scoped»).
- **НЕ трогать** forward-gate / host-inbound регистрацию (см. «ОСТАВИТЬ» выше).

### 6. Тесты
- `engine/__tests__/seams.test.tsx` — удалить (тестит `tryUseEmit` + context-service; оба ушли).
  Если в нём есть проверки чего-то живого — перенести в соответствующий сьют; иначе удалить целиком.
- **Оставить** `engine/__tests__/host-bridge.test.ts` + `engine/__tests__/host-bridge-integration.test.tsx`
  (тестят D1-мост).

## Верификация
```
pnpm --filter @capsuletech/web-core test     # green (D1-мост тесты остаются), без seams.test.tsx
pnpm --filter @capsuletech/web-core build
```
Хвосты + diff architect'у. **НЕ коммить.** Порядок: web-remote снимает потребление первым → ты
ревертишь семы → architect пересобирает web-core dist и прогоняет web-remote тесты против нового dist.

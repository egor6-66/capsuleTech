---
tags: [web-core, adr-060, brief, phase-3, owner-web-core]
status: ready
date: 2026-06-25
zone: owner-web-core (claude-scope core)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
sequence: 2-of-3 (app-сторона моста; builders 1-of-3 прокидывает contract, web-remote 3-of-3 host-сторона)
---

# Brief — web-core: root-event-bus мост (app-сторона) (ADR 060 Phase 3 / D1)

> [!info] Кому: **owner-web-core**. `claude-scope core`. Зависит от builders 1-of-3 (`contract` в
> `createCapsuleApp`). Прочитай `OWNERSHIP.md` + `docs/_meta/web-core.md` + ADR 060 (D1, принципы 1-3) +
> `src/bootstrap/createCapsuleApp.tsx` + `embedHandshake.ts` + `EmitProvider.tsx` + `engine/use-emit.ts`
> + `engine/logic-wrapper.tsx`. НЕ коммить.

## Контекст: придержанная инфра (2026-06-24)
В сессии 2026-06-24 owner-web-core СДЕЛАЛ дефолтный app→host postMessage-sink в embedded
`createCapsuleApp`, но architect его ОТКАТИЛ — он форвардил **ВСЕ** `useEmit`-события хосту (слишком
широко, утечка). Phase 3 **возрождает** эту идею, но **gated контрактом**: форвардим ТОЛЬКО события,
объявленные в `contract.out`. Диффы той инфры — в транскриптах owner-web-core 2026-06-24 (переиспользуй
envelope-форму и точку врезки в EmitProvider).

## Цель (ADR 060 D1)
Remote = мост на корневую HCA-шину аппа, app не знает что встроен:
- **app→host:** событие аппа, чьё имя ∈ `contract.out`, форвардится хосту (envelope postMessage к `window.parent`).
- **host→app:** host шлёт именованный диспатч → валидируем по `contract.in` (Zod) → инжектим в корень аппа (как событие из корня) → течёт по Features/Controllers штатно.
- standalone (нет parent / нет contract) — мост выключен, апп работает как обычно.

## Scope — `createCapsuleApp` (embedded)

### 1. Принять `contract` (от builders 1-of-3)
`ICreateCapsuleAppOptions.contract?: IContract` (тип из `@capsuletech/web-core/contract`). Используется
для фильтра `out` (что форвардить) + валидации `in` (что принимать). Нет contract → мост off.

### 2. app→host: форвард объявленных out-событий
- В embedded-режиме построить eventSink (postMessage к `window.parent`, envelope как у
  `mountedEvent`/`unloadEvent`: `{ from: name, fromInstance: name, to: '__host__', sessionId, eventName, payload }`),
  и прокинуть в `EmitProvider` (как придержанная инфра), НО:
- **gate по контракту:** sink форвардит событие ТОЛЬКО если `eventName ∈ Object.keys(contract.out)`.
  Незаявленное — НЕ уходит (снимает прошлую утечку «все useEmit»).
- (опц., но желательно) валидировать payload по `contract.out[eventName]` перед отправкой (через
  `validateEvent(contract, 'out', name, payload)` из web-core/contract) — невалид → warn + не слать.

### 3. host→app: приём + валидация + инжект в корень
- Слушать postMessage от хоста с диспатч-событием (envelope с `eventName ∈ contract.in`; имя события
  отличать от config-канала `__capsule_remote_config__` и handshake-сигналов — отдельный `eventName`,
  напр. `to`-target + `eventName`, или зарезервированный wrapper-тип). Согласуй конкретный конверт с
  web-remote 3-of-3 (host шлёт его).
- На приёме: `validateEvent(contract, 'in', eventName, payload)` → невалид → drop + warn (фильтр+защита, принцип 5).
- Валидное → **инжектить в корень аппа**: задиспатчить событие в корневой Controller/Feature аппа (тот,
  что RouterPlugin монтит в `__root`). Механизм инжекта — на твоё усмотрение (engine знаешь лучше):
  напр. через ref на root-ctx + `createEmit(rootCtx)(eventName, { payload })`, либо реактивный канал,
  который корневой Feature слушает. Главное — апп обрабатывает это как обычное HCA-событие, БЕЗ
  embedding-кода в аппе.

## Принципы (не нарушить)
- App-код НЕ меняется и НЕ знает о встраивании (D1, принцип 3). Весь мост — в bootstrap/engine.
- Loose coupling (принцип 5): незаявленные in/out молча отбрасываются.
- Контракт — единственный фильтр (out для исхода, in для входа).

## Тесты — `src/bootstrap/__tests__/`
- embedded + contract: `useEmit('markerClick', {payload})` где `markerClick ∈ out` → `window.parent.postMessage` вызван с envelope; событие НЕ из `out` → НЕ форвардится.
- host-диспатч `setMarkers` (∈ in) с валидным payload → инжектится в корень (root-ctx получает); невалидный payload → drop + warn; событие НЕ из `in` → drop.
- standalone / нет contract → ни форварда, ни листенера.
- payload-валидация out (если делаешь) — невалид не уходит.

## Верификация
```
pnpm --filter @capsuletech/web-core test
pnpm --filter @capsuletech/web-core typecheck
pnpm --filter @capsuletech/web-core build
```
Хвосты + diff architect'у. НЕ коммить. Согласуй envelope host→app с web-remote 3-of-3.

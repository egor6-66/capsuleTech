---
tags: [web-remote, adr-060, brief, phase-3, owner-web-remote]
status: ready
date: 2026-06-25
zone: owner-web-remote (claude-scope remote)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
sequence: 3-of-3 (host-сторона моста; web-core 2-of-3 app-сторона)
---

# Brief — web-remote: host-сторона event-моста (on* delivery + dispatch) (ADR 060 Phase 3 / D1)

> [!info] Кому: **owner-web-remote**. `claude-scope remote`. Парный к web-core 2-of-3 (согласуй envelope).
> Прочитай `OWNERSHIP.md` + ADR 060 (D1) + `src/runtime/RemoteComponent.tsx` + `useRemote` + `IframeTransport`.
> НЕ коммить.

## Контекст: придержанная инфра (2026-06-24)
В сессии 2026-06-24 owner-web-remote менял `RemoteComponent` on*-подписку на матч по `from===name`
(не `instanceId`) — architect ОТКАТИЛ вместе с web-core sink'ом (придержали до дизайна событий). Phase 3
**возрождает** этот матч (диффы в транскриптах owner-web-remote 2026-06-24).

## Цель (ADR 060 D1) — host-сторона
- **app→host:** событие от встроенного аппа доставить в соответствующий `on<Event>`-проп `<Remote.View>`.
- **host→app:** дать API диспатча именованного события в апп (`in`-ось контракта). Типы — уже из Phase 2
  augmentation (`CapsuleRemotes[name]`), здесь — РАНТАЙМ доставки/диспатча.
- Контракт-Zod-валидация на host-стороне (defense) — НЕ в этом слайсе (валидация на app-стороне в
  web-core 2-of-3: out-gate на исход, in-validate на приём). Host-side Zod — отдельный refinement позже.

## Scope — `RemoteComponent` + `useRemote`

### 1. app→host: доставка в on*-пропсы (возродить held-матч)
- Авто-подписка `on*`-пропсов: матч входящего по `msg.from === rawProps.name && msg.eventName === <derived>`
  (БЕЗ `instanceId` — self-contained апп его не знает; `sessionId` фильтрует транспорт). Это ровно
  held-фикс 2026-06-24.
- `on<PascalEvent>` ↔ `eventName` (camelCase): `onMarkerClick` → `'markerClick'` (как в Phase 2 типизации).
- payload → колбэк. (Типы уже типизированы из контракта на стороне аппа-потребителя.)

### 2. host→app: dispatch API
- `useRemote(name).dispatch(eventName, payload)` (или уточни имя — но НЕ `send`-как-было, чтобы явно
  читалось «диспатч в апп»). Шлёт envelope в iframe через `IframeTransport.send`:
  `{ from: '__host__', to: name, toInstance, sessionId, eventName, payload }`.
- **Envelope СОГЛАСОВАТЬ с web-core 2-of-3** (он слушает это на app-стороне, валидирует `eventName ∈ contract.in`,
  инжектит в корень). Конверт должен явно отличаться от config-канала (`__capsule_remote_config__`) и
  handshake-сигналов — отдельный `eventName` + `to`-target.
- (опц.) типизировать `dispatch` по `CapsuleRemotes[name]['in']` (как `on*` по `out` в Phase 2) — если просто.

## Что НЕ трогать
- App-сторона моста (forward/receive/inject + Zod-валидация) — web-core 2-of-3.
- iframe-src / config-override / loader — без изменений.
- Прокидка контракта в entry — builders 1-of-3.

## Тесты — `src/runtime/__tests__/RemoteComponent.test.tsx`
- app→host: envelope `{from:name, eventName:'markerClick', payload}` → `onMarkerClick` колбэк вызван; чужой `from` → не вызван.
- host→app: `dispatch('setMarkers', payload)` → `IframeTransport.send` вызван с envelope `{from:'__host__', to:name, eventName:'setMarkers', payload}`.
- (если типизировал dispatch) — type-test/typecheck.

## Верификация
```
pnpm --filter @capsuletech/web-remote test
pnpm --filter @capsuletech/web-remote typecheck
pnpm --filter @capsuletech/web-remote build
```
Хвосты + diff architect'у. НЕ коммить.

## Browser-verify (architect, после всех 3)
playground host ↔ universal-canvas: канвас эмитит `mounted` (∈ out) → host `onMounted` ловит (типизированно);
host `dispatch('setMarkers', ...)` (∈ in) → канвас получает в корень. Незаявленные события не проходят.

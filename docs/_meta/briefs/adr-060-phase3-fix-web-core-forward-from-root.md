---
tags: [web-core, adr-060, brief, fix, phase-3, owner-web-core]
status: ready
date: 2026-06-26
zone: owner-web-core (claude-scope core)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
---

# Fix — web-core: app→host форвард с КОРНЕВОГО Feature, НЕ через useEmit (ADR 060 Phase 3 / D1)

> [!info] Кому: **owner-web-core**. `claude-scope core`. Ветка `feat/adr060-phase3-event-bridge`
> (твоя Phase 3 работа уже там). Прочитай `OWNERSHIP.md` + ADR 060 (D1, принципы 1-3) +
> `bootstrap/createCapsuleApp.tsx` (твой `buildContractGatedSink`) + `engine/logic-wrapper.tsx` +
> `engine/host-bridge.ts` + `engine/use-emit.ts`. НЕ коммить.

## Что не так (architect задиагностировал + согласовал с user)
Твой app→host форвард сейчас завязан на **`useEmit` через EmitProvider-sink** (`buildContractGatedSink`).
Это **неверно по дизайну**: `useEmit` — ПАКЕТНЫЙ хук (компонент пакета → Controller/Feature аппа).
Канон app→host (ADR 060 D1, подтверждено user'ом): форвардить хосту **события, дошедшие до
КОРНЕВОГО Feature аппа** (его HCA-бабблинг = граница «внутреннее/наружу»), а НЕ useEmit-события.

`host→app` (inject в корень через `HostInboundContext` + `useHostInbound`) — **корректно, НЕ трогать.**

## Цель — forward-instead-of-handle на корне
Событие дошло до корневого Feature (`parent === undefined` в LogicWrapper):
- **EMBEDDED + имя ∈ `contract.out`** → **форвардим хосту** (postMessage, твой envelope + out-валидация),
  и **НЕ выполняем локальный хендлер** этого события на корне. Host становится обработчиком.
- **STANDALONE (или имя ∉ out, или не корень)** → обычный локальный HCA-dispatch (хендлер работает).

Это даёт нюанс из дизайна: один и тот же app-код; standalone канвас обрабатывает `componentClick` сам,
embedded — оно уходит хосту (host решает), локальный хендлер канваса пропущен.

## Scope

### 1. Переиспользовать forwarding, сменить ТРИГГЕР
- Оставь механизм форварда (envelope `{from:name, to:'__host__', sessionId, eventName, payload}` + gate
  `eventName ∈ contract.out` + `validateEvent(contract,'out',…)`) из `buildContractGatedSink`.
- **Убери** его привязку к `EmitProvider`/`useEmit` (это был неверный источник).
- **Новый триггер** — корневой `LogicWrapper` (`parent === undefined`) в embedded-режиме с контрактом:
  перехватывать dispatch события ДО выполнения хендлера; если `eventName ∈ contract.out` → форвард +
  return (skip handler); иначе → обычный dispatch.

### 2. Где врезаться (engine — тебе виднее)
Корневой LogicWrapper уже знает `parent` (видит `parent === undefined`) и через context может получить:
эмбед-флаг + контракт + forward-функцию. Варианты: обернуть `ctxEmit`/`ControllerProxy` корня в
«forward-gate» в embedded; либо отдельный root-only перехват в `controller-proxy`. Главное — перехват
именно на КОРНЕ (нижние Controllers/Features не трогаем — их события внутренние, бабблят к корню штатно).

### 3. Контракт + эмбед-флаг в корневой контекст
`createCapsuleApp` уже принимает `contract` (Phase 3 builders) и знает embedded (`readEmbedParams`).
Пробрось их в корневой LogicWrapper (через context, как `HostInboundContext`), чтобы перехват знал
`contract.out` + что он embedded.

## Что НЕ трогать
- host→app inject (`host-bridge.ts`, `useHostInbound`, root register в logic-wrapper) — корректно.
- `useEmit` сам по себе (пакетный механизм) — остаётся для пакетов; просто он БОЛЬШЕ не источник app→host форварда.
- Контракт-типы, валидация — переиспользуй.

## Тесты — `src/bootstrap/__tests__/` + `engine/__tests__/`
- embedded + contract: событие ∈ out, дошедшее до КОРНЯ → `window.parent.postMessage` (envelope), и
  локальный хендлер корня НЕ вызван (forward-instead-of-handle).
- standalone: то же событие → локальный хендлер корня ВЫЗВАН, форварда нет.
- событие ∉ out на корне (embedded) → обычный локальный dispatch (не форвардится).
- вложенный (не корень) Controller с тем же именем события → обрабатывается локально (не форвардится).
- useEmit БОЛЬШЕ НЕ форвардит app→host (старый sink-путь убран) — обнови/удали соответствующие тесты.

## Верификация
```
pnpm --filter @capsuletech/web-core test
pnpm --filter @capsuletech/web-core typecheck
pnpm --filter @capsuletech/web-core build
```
Хвосты + diff architect'у. НЕ коммить — architect перепроверит на реальном studio-кейсе.

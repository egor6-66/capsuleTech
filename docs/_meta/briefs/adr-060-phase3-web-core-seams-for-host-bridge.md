---
tags: [web-core, adr-060, brief, phase-3, owner-web-core]
status: ready
date: 2026-06-26
zone: owner-web-core (claude-scope core)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
---

# Brief — web-core: 2 сема для host-стороны моста (`tryUseEmit` + context-scoped service) (ADR 060 Phase 3)

> [!info] Кому: **owner-web-core**. `claude-scope core`. Ветка `feat/adr060-phase3-event-bridge`.
> Это РАЗБЛОКИРОВКА owner-web-remote (host-HCA bridge). Прочитай `OWNERSHIP.md` +
> `engine/use-emit.ts` + `engine/logic-wrapper.tsx` + `engine/package-services.ts` (registerPackageServices).
> НЕ коммить. (Контекст: owner-web-remote задиагностировал по коду, architect согласовал решения —
> см. ниже.)

## Sem 1 — `tryUseEmit()` (non-throwing useEmit)
owner-web-remote'у нужно диспатчить входящее remote-событие в host-HCA, но `<Remote.View>` могут
поставить БЕЗ host-Controller (тогда `useEmit()` бросает). Нужен мягкий вариант.

- Экспортнуть из публичного barrel (`@capsuletech/web-core`) **`tryUseEmit(): EmitFn | undefined`** —
  как `useEmit`, но: нет `ControllerContext` (`useContext(Context)` пуст) → возвращает `undefined`
  (НЕ бросает). Есть контекст → возвращает рабочий `emit` (та же семантика, что `useEmit`).
- Реализация — рядом с `useEmit` в `engine/use-emit.ts` (переиспользуй `createEmit`/`normalizeTarget`,
  они уже engine-internal). Публичен только `tryUseEmit` (как `useEmit`), не internal-хелперы.
- Цель потребителя: `const emit = tryUseEmit(); if (emit) emit(eventName, { payload });` — иначе skip.

## Sem 2 — context-scoped (render-scope) package service
Цель: host-Feature пишет `Feature(({ remote }) => …)`, где `remote` — сервис, которому нужен
`RemoteProvider`-контекст (render-scope). Текущий `registerPackageServices` — статический снимок
(копируется вне render-scope) → не может читать Solid-контекст. Нужен seam для **context-aware** сервисов.

- Добавить регистрацию **render-scope service factory**: пакет регистрит фабрику-ХУК
  (`() => service`, которая ВНУТРИ зовёт `useContext(...)`), напр.
  `registerContextService(namespace, useFactory)` (имя/форма — на твоё усмотрение, рядом с
  `registerPackageServices`).
- `LogicWrapper` в своём render-body (render-scope!) вызывает все зарегистрированные фабрики-хуки и
  кладёт результат в `services[namespace]` — РЯДОМ со статическими package-services + базовыми
  (`router`/`api`/`zod`/`utils`). Порядок: базовые/namespace'ы не должны перетираться (namespace
  уникален по контракту, как сейчас).
- per-instance: фабрика зовётся на каждый LogicWrapper в его render-scope → читает АКТУАЛЬНЫЙ контекст
  (per-instance, без module-singleton — это и есть причина seam'а вместо B-варианта).
- web-remote (отдельный brief) зарегистрит `remote` через этот seam (фабрика читает `RemoteContext` →
  отдаёт `remote(name).dispatch`).

⚠️ **Направление слоёв:** web-core НЕ импортит web-remote (это был бы upward-import). Seam — ОБЩИЙ
(пакет сам регистрит свою фабрику-хук через `registerContextService`, как `registerPackageServices`).
web-core знает только контракт «namespace → () => service».

## Что НЕ трогать
- `useEmit` (бросающий) — остаётся как есть (пакетный канон). `tryUseEmit` — рядом.
- root-forward / host-bridge inject (Phase 3) — корректны, не трогать.
- Существующий `registerPackageServices` (статический) — оставить; context-scoped — ДОБАВКА, не замена.

## Тесты
- `tryUseEmit`: без ControllerContext → `undefined`; под Controller → рабочий emit (диспатчит в ctx.controller).
- context-service: пакет регистрит фабрику-хук, читающую тестовый Context → host-Feature видит `services.<ns>`
  с актуальным значением контекста (per-instance: два инстанса под разными Provider-значениями → разные сервисы).
- namespace-коллизии / порядок инъекции — не перетирают базовые.

## Верификация
```
pnpm --filter @capsuletech/web-core test
pnpm --filter @capsuletech/web-core typecheck
pnpm --filter @capsuletech/web-core build
```
Хвосты + diff architect'у. НЕ коммить. После — architect пересоберёт web-core dist, owner-web-remote
сделает Part 1 (tryUseEmit) + Part 2 (`remote` через context-service seam).

---
tags: [hca, adr, accepted]
status: canon
date: 2026-05-09
---

# ADR 002 — Controller vs Feature: разрешить органическую дивергенцию

## Контекст {#context}

Сейчас `ControllerWrapper` и `FeatureWrapper` (`packages/core/src/wrappers/logic/{controller,feature}.tsx`) — **почти полная копипаста**. Различие — один `console.log(props)` в Controller. Семантически по [[layers|регламенту]] они должны различаться:
- Controller — поведение, FSM, перехват UI-событий.
- Feature — domain logic, API, services, единственное место, где разрешены сетевые вызовы.

Возникает вопрос: оставить их симметричными (и дублировать?), объединить, или развести.

## Решение {#decisions}

**Оставить общую реализацию и развести по мере появления уникальной логики во Feature.** Семантическая граница уже зафиксирована в [[layers]] и [[golden-rules]]. Архитектурное различие появится естественно, когда Feature начнёт получать **уникальные услуги** (API-клиенты, services), которых у Controller нет.

> [!info]
> Решение принято пользователем: *«пока в дальнейшем Feature будет наполняться уникальной логикой»*.

## Что делать сейчас

1. **Удалить копипасту.** Один внутренний модуль `createLogicWrapper(kind: 'controller' | 'feature')`, два тонких экспорта поверх. Это убирает баг-двоение, но не запирает в одну реализацию навсегда.

2. **Зафиксировать различие в инъецируемых services.** Сейчас в `ControllerProxy` services — это `{ router }`, и он одинаков для обоих. Стоит ввести два набора:
   - `controllerServices = { router }` (можно навигировать, нельзя fetch'ить).
   - `featureServices = { router, api, ... }` (всё, что про IO).

3. **Различие на уровне типа.** TypeScript-сигнатура `defineStateSchema` для Feature принимает `featureServices`, для Controller — `controllerServices`. Это даёт **compile-time** запрет `fetch` в Controller.

## Что отложено

- Полное архитектурное расщепление двух врапперов (разные жизненные циклы, разные ивенты, разные scope машин). Делать **только** если конкретный кейс это потребует.

## Связанное {#related}

- [[layers]]
- [[controller-proxy]]
- [[001-xstate-as-canonical-fsm|ADR 001]] (касается обоих врапперов одновременно — миграция объединена)
- [[004-compliance-linter|ADR 004]] (линтер должен знать слой, чтобы запрещать `fetch` в Controller)

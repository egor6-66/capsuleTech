---
tags: [web-remote, adr-060, brief, phase-3, owner-web-remote]
status: ready
date: 2026-06-26
zone: owner-web-remote (claude-scope remote)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
---

# Brief — web-remote: host-сторона — remote-события в host-HCA + `remote`-сервис (ADR 060 Phase 3 / D1)

> [!info] Кому: **owner-web-remote**. `claude-scope remote`. Ветка `feat/adr060-phase3-event-bridge`.
> Парный к web-core forward-from-root fix. Прочитай `OWNERSHIP.md` + ADR 060 (D1) +
> `RemoteComponent.tsx` + `createHostHandle.ts` (твой `dispatch`) + `RemoteProvider.tsx` +
> как пакеты инжектят services (ADR 032 / web-core `engine/package-services.ts`). НЕ коммить.

## ✅ РЕШЕНО architect'ом (2026-06-26, после твоего возврата по коду)
- **Part 1 чем диспатчить:** web-core экспортнёт **`tryUseEmit()`** (non-throwing, `EmitFn | undefined`) —
  бриф `adr-060-phase3-web-core-seams-for-host-bridge.md`. Используй: `const emit = tryUseEmit(); if (emit) emit(eventName, { payload });` иначе skip. НЕ дублируй engine-логику.
- **Part 1 on*/HCA:** правило **per-event** — задан `on<Event>` → зовём только его (escape); иначе → host-HCA-диспатч через `tryUseEmit`.
- **Part 2 — вариант A:** web-core добавит **context-scoped service seam** (тот же бриф). Зарегистрируй `remote` через него (фабрика-хук читает `RemoteContext` → `remote(name).dispatch`). B/C отклонены.
- **Порядок:** сначала owner-web-core (2 сема) → architect пересоберёт web-core dist → потом ты (Part 1 + Part 2).

## Цель (host-сторона D1) — симметрия с app-стороной
Чтобы studio-кейс работал по канону (события студии ловит `Features.Studio` хоста):
- **remote → host:** событие от встроенного аппа (∈ его `contract.out`) должно прилетать в **HCA хоста**
  — диспатчиться в ближайший Controller/Feature, бабблить до `Features.Studio` — как ОБЫЧНОЕ HCA-событие,
  по имени (напр. `componentClick`). НЕ только как raw on*-колбэк.
- **host → remote:** host-Feature/Controller должен мочь диспатчить в ремоут — через инжектированный
  **`remote`-сервис**: `remote('universal-canvas').dispatch('selectComponent', { id })`.

## Целевой DX (что напишет автор хоста)
```tsx
// playground/src/features/studio.tsx
const Studio = Feature(({ remote }) => ({          // ← `remote` инжектится как service
  states: { ready: {
    // прилетает И от палитры (host meta), И от РЕМОУТ-канваса (его componentClick → host-HCA):
    componentClick: ({ target, store }) => {
      store.update({ selectedId: target.payload.id });          // host решает (auth/логика)
      remote('universal-canvas').dispatch('selectComponent', { id: target.payload.id });
    },
  }},
}));
```
```tsx
// playground/src/widgets/studio/canvas.tsx — <Remote.View> = meta-aware, события идут в host-HCA
const Canvas = Widget((Ui) => <Remote.View name="universal-canvas" />);
```

## Scope

### 1. remote → host: события встроенного аппа → host-HCA
`RemoteComponent` рендерится в дереве хоста под Controller/Feature (есть `useCtx`/UiProxy-контекст). На
приёме app→host события (`from === name`, `eventName ∈ contract` ремоута — уже знаешь из Phase 2 типов /
vendored manifest имён) → **диспатчить его в host-HCA** по имени `eventName`, чтобы оно бабблило до
host-Feature. Механизм — на твоё усмотрение: либо `<Remote.View>` становится meta-узлом и UiProxy
диспатчит его события (как у Ui-примитивов), либо RemoteComponent через `useCtx()` зовёт
`ctx.controller[eventName](target)`. Главное — host-Feature ловит `componentClick` как обычное событие.
- Типизированные on*-пропсы (Phase 2) — **оставить** как опциональный прямой колбэк (escape), но
  основной путь — host-HCA. (Если on* задан И HCA-диспатч — не дублировать семантику; реши чисто.)

### 2. host → remote: `remote`-сервис в host Features/Controllers
Зарегистрировать host-side service `remote`, инжектируемый в `services` логик-слоёв (как `router`/`api` —
через package-services / ADR 032). `remote(name)` возвращает хэндл с `.dispatch(eventName, payload)`
(переиспользуй `createHostHandle` dispatch). Сервис привязан к `RemoteProvider`-контексту (транспорты) —
LogicWrapper в render-scope может прочитать контекст и отдать сервис.
- (опц.) типизировать `dispatch` по `CapsuleRemotes[name]['in']` (как on* по out в Phase 2).

## Что НЕ трогать
- app-сторона forward/inject — web-core.
- iframe-src / config / loader / Phase 2 типизация — без изменений (типы on* остаются).

## Тесты — `src/runtime/__tests__/`
- remote→host: входящее событие ремоута → диспатчится в host-ctx (мок `useCtx`/controller) по имени.
- host→remote: `remote('x').dispatch('setMarkers', p)` → `IframeTransport.send` с envelope `{from:'__host__', to:'x', eventName, payload}`.
- `remote`-сервис доступен в services логик-слоя (мок-RemoteProvider контекст).

## Верификация
```
pnpm --filter @capsuletech/web-remote test
pnpm --filter @capsuletech/web-remote typecheck
pnpm --filter @capsuletech/web-remote build
```
Хвосты + diff architect'у. НЕ коммить — **architect перепроверит реальным studio-кейсом** (не только
unit): палитра→канвас и клик-в-канвасе→Features.Studio→канвас. Это менее устоявшаяся часть — если
механизм host-HCA-диспатча неочевиден, верни architect'у на дизайн-обсуждение ДО глубокой реализации.

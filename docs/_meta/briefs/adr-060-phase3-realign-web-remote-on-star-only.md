---
tags: [web-remote, adr-060, brief, realign, phase-3, owner-web-remote]
status: ready
date: 2026-06-26
zone: owner-web-remote (claude-scope remote)
adr: 060-web-remote-typed-contract-zod-artifact-and-studio-store
voids:
  - adr-060-phase3-web-remote-host-hca-bridge.md
---

# Brief — web-remote: realign host-стороны к ADR 060 D1 (`on*` + `dispatch`, БЕЗ host-HCA-моста)

> [!info] Кому: **owner-web-remote**. `claude-scope remote`. Ветка `feat/adr060-phase3-event-bridge`
> (Phase 3 работа уже там). Прочитай `OWNERSHIP.md` + **ADR 060 §D1 + §alternatives** +
> `RemoteComponent.tsx` + `createHostHandle.ts` + `capsule.ts` + `interfaces.ts`. **НЕ коммить.**

## Почему (решение architect+user 2026-06-26)
Реализация Phase 3 (бриф `adr-060-phase3-web-remote-host-hca-bridge.md`, **VOID**) добавила СВЕРХ
ADR 060: события ремоута авто-диспатчатся в **HCA хоста** через `tryUseEmit`, плюс host→app `remote`-
сервис инжектится в Features через `registerContextService`. Это:
1. **Расхождение с принятым ADR 060 D1.** Дословно D1: app→host = «host ловит через **`on*`-проп
   `<Remote.View>`**»; host→app = «host **диспатчит** именованное событие → мост инжектит в корень».
   §alternatives прямо отвергает «форвардить всё в host-HCA». HCA-симметрии в ADR нет.
2. **Затащило UI в ремоут.** Импорт `tryUseEmit`/`registerContextService` из **корневого барреля**
   `@capsuletech/web-core` тянет `wrappers → ui-kit → @capsuletech/web-ui/spinner → web-style/theme →
   matchMedia` — UI-граф в runtime-пакете ремоута + краш 2 тестов (`dualImport`, `RemoteProvider`).

**Решение: выравниваем строго на ADR 060 D1.** app→host = `on*`-пропсы; host→app = `useRemote(name).dispatch()`.
Host-HCA-мост (tryUseEmit) и `remote`-сервис (registerContextService) — **сносим**. Ремоут становится
UI-free, корневой web-core баррель больше не импортируется.

## Scope — что УДАЛИТЬ

### 1. `runtime/RemoteComponent.tsx` — убрать host-HCA-диспатч, оставить `on*`
- Удалить `import { tryUseEmit } from '@capsuletech/web-core';` (сейчас стр. 26).
- Удалить `const hostEmit = tryUseEmit();` (стр. 211).
- В `onMessage`-листенере (блок ~196–227) убрать fallback `hostEmit?.(msg.eventName, { payload: … });`
  (стр. 224). Логика приёма app→host остаётся ТОЛЬКО `on*`:
  ```ts
  if (msg.from !== rawProps.name || RESERVED_EVENTS.has(msg.eventName)) return;
  const handlerName = `on${msg.eventName[0]!.toUpperCase()}${msg.eventName.slice(1)}`;
  const cb = (rawProps as Record<string, unknown>)[handlerName];
  if (typeof cb === 'function') (cb as (payload?: unknown) => void)(msg.payload);
  // нет on*-пропа → host не подписан на это событие → drop (loose coupling, ADR 060 D1)
  ```
- Обновить комментарий блока: app→host доставляется ТОЛЬКО в `on<Event>`-пропсы (ADR 060 D1);
  убрать упоминание host-HCA / tryUseEmit.
- ✅ После этого RemoteComponent импортит из web-core ТОЛЬКО `@capsuletech/web-core/bootstrap`
  (`EMBED_PROTOCOL`) — lean subpath, без UI (как было до Phase 3).

### 2. `capsule.ts` — убрать `remote`-сервис
- Удалить `import { registerContextService } from '@capsuletech/web-core';` (стр. 20).
- Удалить `import { useRemoteService } from './runtime/remoteService';` (стр. 23).
- Удалить комментарий (25–27) + `registerContextService('remote', useRemoteService);` (стр. 28).
- Оставить `defineCapsuleModule({ name: 'Remote', components: {...} })`.

### 3. Удалить файлы
- `runtime/remoteService.ts`
- `runtime/__tests__/remoteService.test.tsx`

### 4. `runtime/__tests__/RemoteComponent.test.tsx` — почистить
- Убрать `vi.mock('@capsuletech/web-core', () => ({ tryUseEmit: () => emitSpy }))` + `emitSpy`.
- Убрать тест `routes an event WITHOUT an on* prop into the host HCA (tryUseEmit)`.
- Оставить тесты доставки в `on*` (app→host) и `dispatch` (host→app).

## Что ОСТАВИТЬ (это и есть ADR 060 D1 — НЕ трогать)
- **host→app `dispatch`**: `createHostHandle.ts` `dispatch(eventName, payload)` (стр. 41) +
  `useRemote(name).dispatch()`. Это канонический host→app API, UI-free.
- **Вся типизация в `interfaces.ts`**: `RemoteInDispatch<In>`, `IRemoteHandle<N>['dispatch']`,
  `IRemoteContext.remote<N>` — оставить целиком (типы из CapsuleRemotes, Phase 2).
- **app→host доставка в `on*`** — основной и единственный путь (после п.1).
- `index.ts` (CapsuleRemotes augmentation target, IRemoteContract) — без изменений.

## Тесты — `src/runtime/__tests__/`
- app→host: envelope `{from:name, eventName:'markerClick', payload}` → `onMarkerClick` вызван; чужой
  `from` → не вызван; нет `on*`-пропа → ничего не происходит (drop, не throw).
- host→app: `useRemote('x').dispatch('setMarkers', p)` → `IframeTransport.send` с envelope
  `{from:'__host__', to:'x', eventName:'setMarkers', payload}`.
- **Регрессия UI-leak:** `dualImport.test.tsx` + `RemoteProvider.test.tsx` снова ЗЕЛЁНЫЕ (нет
  `window.matchMedia is not a function`) — web-remote больше не тянет web-ui.

## Верификация
```
pnpm --filter @capsuletech/web-remote test          # все сьюты green, 0 matchMedia
pnpm --filter @capsuletech/web-remote build
```
> Парный бриф `adr-060-phase3-realign-web-core-revert-bridge-seams.md` (owner-web-core) убирает
> теперь-мёртвые семы `tryUseEmit`/`registerContextService` из web-core. Порядок: web-remote
> (этот) первым снимает потребление → web-core ревертит семы → architect пересобирает web-core dist.

Хвосты + diff architect'у. **НЕ коммить** — architect проревьюит + browser-verify (playground↔canvas:
`on*` ловит событие канваса, `dispatch` шлёт в канвас).

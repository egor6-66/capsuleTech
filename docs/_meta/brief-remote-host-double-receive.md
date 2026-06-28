# Brief — Bug A: remote→host событие доставляется ДВАЖДЫ (owner-web-remote)

**Зона:** `packages/web/runtime/remote/` (scope `remote`).

## Симптом (измерено в живом браузере, не гипотеза)
Хост :3050, роут `/workspace/web-studio/store`, **один** встроенный канвас (`<Remote.View name="universal-canvas" instanceId="main">` внутри `Features.Canvas`). Один клик по кнопке канваса → host-side delivery-колбэк `RemoteComponent` срабатывает **дважды**.

Замеры:
- **1 iframe, 0 fallback-маркеров** (`[data-capsule-remote-loading]`/`[data-capsule-remote-error]`) → ровно **один** `RemoteComponent`.
- Канвас форвардит ровно **один** postMessage на клик — window-probe поймал один конверт:
  `{from:'universal-canvas', fromInstance:'universal-canvas', to:'__host__', sessionId:'cl-2', eventName:'canvasClick', payload:{value,ts}}`.
- При этом delivery-колбэк (on-prop ветка ИЛИ emit-ветка — обе внутри одного `onMessage` на строке 225) вызывается **2×** на этот один postMessage.

**Вывод:** один `RemoteComponent` получает один app→host postMessage, но invoke'ает delivery-колбэк дважды. Канвас чист (шлёт один раз), двойного монтажа нет (один iframe).

## Что уже исключено чтением кода
- Event-routing `createEffect` (`RemoteComponent.tsx:222-239`) читает только стабильный `transport()` (createMemo над `rawProps.transports[0]`, массив-const из `RemoteProvider`) → по идее подписывается один раз.
- Handshake-`onMessage` (`149-178`) для не-reserved событий (canvasClick) не делает ничего → не источник.
- `Remote.Provider` в дереве ровно один (`apps/playground/src/pages/workspace/web-studio/index.tsx:11`); в `packages/web/studio` своего `Remote.Provider` нет (проверено grep'ом).

## Где копать (двумя логами — быстрее, чем снаружи)
Дубль на уровне **транспорта/жизненного цикла**, не в самом routing-эффекте. Подозрения:
1. **Два инстанса `IframeTransport`** (два window-`message`-listener'а) — добавь `console.count('[diag] IframeTransport ctor')` в конструктор. Если 2 — RemoteProvider/transport создаётся дважды (роутинг/Suspense/Matrix), копать туда.
2. **Утёкшая подписка на персистентном транспорте.** Транспорт живёт в `RemoteProvider` на уровне layout-роута (`index.tsx`), переживает свопы дочерних роутов (store/creator) и ремаунты `Widgets.Studio.Canvas`. Если `RemoteComponent` при свопе/ремаунте детачится из DOM, но Solid-owner не диспозится → его `onCleanup(unsub)` (строки 174-177 и 238) не фаерит → подписка остаётся на персистентном transport'е, следующий маунт добавляет ещё одну → 2× (или N×). Добавь в `IframeTransport.onMessage`/`unMessage` `console.log('[diag] subscribers=', this.subscribers.size)` — увидишь рост.

Один прогон с этими логами однозначно скажет (1) vs (2).

## Репро (точный)
1. `:3050` → `/workspace/web-studio/store`.
2. Клик по «Canvas own button» (внутри iframe-канваса).
3. Наблюдать: delivery срабатывает 2×. (Для наглядности можно временно вернуть on-prop `onCanvasClick` в `apps/playground/src/widgets/studio/canvas.tsx` с `console.log` — но это app-сторона, owner туда НЕ лезет; репро воспроизводится и логом внутри `RemoteComponent`.)

## Фикс
По итогам диагностики: гарантировать **единственную** живую подписку delivery-колбэка на транспорт (корректный `onCleanup`/dispose при ремаунте/свопе, либо дедуп подписки, либо единственный transport). Добавить тест на «один postMessage → один delivery».

## НЕ делать
- НЕ трогать `apps/*`, контракт, host→remote inbound.
- НЕ трогать Bug B (`emit→Features.Canvas` no-op) — отдельный разбор ПОСЛЕ A (вероятно дубль web-core Context в dev-бандлинге, другая зона).
- Git push не делать (commit-only).

Прогнать `pnpm --filter @capsuletech/web-remote test` + `build`, вернуть последние строки.

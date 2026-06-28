# Brief — bug A: RemoteComponent инстанцируется дважды на один Remote.View (owner-web-remote)

**Зона:** `packages/web/runtime/remote/` (scope `remote`). Диагностика — по трейс-каналу (ADR 062), у источника.

## Репро (измерено в браузере, host :3050 /workspace/web-studio/store, `?trace=remote`)
Один клик по кнопке канваса (embedded):
```
remote.transport:deliver  { eventName: 'canvasClick', subscribers: 4 }   ← ОДИН транспорт, 4 подписчика
remote.component:receive  { instanceId: 'main', branch: 'emit-host' }    ← ×2
remote.component:receive  { instanceId: 'main', branch: 'emit-host' }
```
На монтаже: `remote.transport:ctor` ×1, `remote.component:mount` ×**2**, `remote.transport:subscribe` ×**4**.
DOM: **1** iframe, **1** кнопка «Ping remote» (хост-виджет отрисован один раз), **0** fallback-маркеров.

## Диагноз (однозначный)
- Хост-виджет + `<Remote.View name="universal-canvas" instanceId="main">` отрисованы **ОДИН раз** (1 кнопка, 1 Remote.View в коде). → **boost-layout/студия ни при чём.**
- Но `RemoteComponent` смонтирован **ДВАЖДЫ** (оба `instanceId: 'main'`). Дубль рождается **НИЖЕ `Remote.View`, внутри web-remote** (`RemoteView → useRemote().Remote → <RemoteComponent>`).
- Один инстанс держит iframe; второй — **живой призрак**: его эффекты отработали и подписались (handshake + event-routing onMessage), но его JSX (`<Show>` с iframe/fallback) **не в DOM**, и `dispose` НЕ фаерил (оба `receive` живые).
- 4 подписки = 2 компонента × 2 (handshake + event-routing) в Set одного транспорта → один postMessage фанаутит → 2 event-routing-подписки → 2 `receive` → **×2**.

## Что искать
Реактивное **пересоздание** компонента без диспоза старого owner'а (классика: 1 живой DOM-инстанс + 1 живой призрак, старый owner не диспознут → его эффекты/подписки текут):
- `RemoteView.tsx` — `<Remote {...props} />`: рендерится ли `Remote` в реактивном scope, который перевыполняется? Меняется ли ссылка `Remote` (из `useRemote()`)?
- `RemoteProvider.tsx` — `Remote: (cp) => <RemoteComponent .../>`: стабильна ли эта функция/`ctx`? Не пересоздаётся ли `ctx` (новая ссылка `Remote` → Solid дропает старый компонент и создаёт новый, но при кривом owner'е старый не диспозится)?
- Путь инстанцирования `<RemoteComponent>` — нет ли `createMemo`/`<Dynamic>`/`<Show>`, который рендерит компонент и при ре-ране плодит второй инстанс без cleanup.

## Фикс
Гарантировать **единственный живой `RemoteComponent`** на один `<Remote.View>`. Если ре-рендер легитимен — старый инстанс обязан диспозиться (его `onCleanup` → `unsubscribe` фаерит, подписка уходит из Set).

## Верификация (по трейсам, не probe'ами)
`?trace=remote` → один клик → ровно **один** `remote.component:receive`; `transport:deliver` с `subscribers ≤ 2` (handshake+routing одного компонента); на монтаже один `remote.component:mount`.

## НЕ делать / следующее
- Bug B (`emit→Features.Canvas` ловит ли forwarded — ветка `emit-host`) — СЛЕДУЮЩИЙ шаг после A, отдельно.
- НЕ трогать boost-layout/студию (исключены) и apps/*. Push не делать (commit-only).

Прогнать `pnpm --filter @capsuletech/web-remote test` + `build`. Вернуть последние строки + что нашёл по дубль-инстансу.

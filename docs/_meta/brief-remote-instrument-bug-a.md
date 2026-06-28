# Brief — инструментация web-remote трейсами + диагностика/фикс bug A (owner-web-remote)

**ADR:** [[062-runtime-observability-trace-channel]] (D6, пилот). **Зона:** `packages/web/runtime/remote/` (scope `remote`). Только web-remote. web-core (bug B) и traceId-через-конверт — НЕ здесь, отдельным шагом.

**Цель:** разметить узлы web-remote `trace()`-ами (постоянная наблюдаемость, не throwaway), включить `?trace=remote`, по трейсам **точно увидеть механизм ×2** (двойная доставка одного app→host сообщения) и **починить**. Хватит probe'ов — смотрим в Traces-панель.

## Контекст (измерено ранее, факт)
Один клик кнопки канваса в embedded → один postMessage `canvasClick` долетает до хоста → delivery-колбэк `RemoteComponent` срабатывает **ДВАЖДЫ**. Один `RemoteComponent` (1 iframe, 0 fallback), один `Remote.Provider`, накопления через свопы нет. Значит дубль **внутри одного монтажа** — `IframeTransport` инстанс-дубль ИЛИ две подписки в одном Set ИЛИ effect подписывается дважды. **Трейсы должны это развести.**

## Что сделать

1. **Dep:** добавить `@capsuletech/web-profiler` (`workspace:*`) в `package.json` web-remote. Импорт: `import { trace } from '@capsuletech/web-profiler/trace'` — лёгкий субпатх (no-op когда тогл off / нет sink; zero runtime-deps, leaf-сервис — цикла нет, см. резолюцию ADR 062). Резолвится через exports→dist как `web-core/bootstrap`.

2. **Инструментировать узлы** (node-префикс `remote.*`, чтобы `trace.enable('remote')` ловил всё):
   - **`transport/IframeTransport.ts`** (node `remote.transport`):
     - `ctor` — `trace('remote.transport','ctor',{ sessionId })` (ловит инстанс-дубль транспорта).
     - `subscribe` / `unsubscribe` — с `{ subscribers: this.subscribers.size }` ПОСЛЕ изменения (видно рост/дубль подписок).
     - `deliver` — в фан-ауте на КАЖДОЕ сообщение: `{ eventName: msg.eventName, subscribers: this.subscribers.size }` (сколько подписчиков дёрнули на один месседж).
     - `dispose`.
   - **`runtime/RemoteComponent.tsx`** (node `remote.component`):
     - `mount` / `dispose` (в эффектах/onCleanup) — `{ name, instanceId }`.
     - event-routing `receive` (строка ~225, на каждое контракт-событие): `{ eventName: msg.eventName, branch: cb ? 'on-prop' : 'emit-host' }` — видно сколько раз RemoteComponent реально получает событие и какой веткой ушёл.

   Уровень — `debug`. Гард в `trace()` сам отсекает когда off (ноль аллокаций), руками не гейтить.

3. **Диагностика по трейсам:** локально dist профайлера собран (`trace.mjs` есть). Поднять host (`:3050` /workspace/web-studio/store), включить `?trace=remote` (или `trace.enable('remote')`), кликнуть кнопку канваса, прочитать Traces-панель / console-trace-reporter. Развести:
   - два `remote.transport.ctor` → дубль транспорта (копать, кто монтит Provider дважды);
   - `remote.transport.subscribe` с `subscribers` >1 на один `RemoteComponent.mount` → дубль подписки в одном транспорте (effect/cleanup);
   - один `deliver` с `subscribers:2` → один Set, два подписчика.

4. **Фикс A:** по тому, что покажет трейс — гарантировать **единственную живую** delivery-подписку на смонтированный `Remote.View` (корректный onCleanup / дедуп / единственный transport). 

5. **Верификация:** по трейсам **один клик → ровно один `remote.component.receive`**. Прогнать `pnpm --filter @capsuletech/web-remote test` + `build`, обновить/добавить тест на «один inbound → один deliver».

## НЕ делать
- НЕ инструментировать web-core (host-bridge/logic-wrapper) — bug B, отдельный шаг (другая зона).
- НЕ добавлять traceId в конверт протокола — это для сквозного ретрейса (D4), следующий шаг.
- НЕ трогать apps/*, контракт. Push не делать (commit-only).

## Инструментация — ПОСТОЯННАЯ
Это не временный дебаг: узлы остаются размеченными (наблюдаемость = часть функционала, тогл off по дефолту, ноль оверхеда). Не вырезать после фикса A.

Верни последние строки test/build + что показали трейсы по ×2.

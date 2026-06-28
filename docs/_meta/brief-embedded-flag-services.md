# Brief — expose `embedded`/`standalone` run-mode flags в services (owner-web-core)

**Зона:** `packages/web/runtime/core/` (scope `core`). Запускать owner-сессией (`claude-scope core`).

## Зачем
При embed (web-remote) контракт `in` **аддитивен**: host может драйвить метод, но локальные/автономные триггеры аппа продолжают работать. Чтобы апп сам решал «в embedded не сеять свои данные автономно — уступить хосту» (кейс списка с `onInit`-севом), ему нужен честный флаг режима запуска.

Жёсткий override метода под капотом **отвергнут** (silent no-op + ломает кейсы additive/merge). Флаг гибче: апп явно пишет `if (standalone) seed()`. Две ручки на стороне аппа (гейт триггера × replace/accumulate в хендлере) дают все 3 кейса: additive (таблица), yield (список), merge.

## Источник правды
`isEmbedded()` (проверка `window.parent !== window`) — **НЕ** наличие host-bridge контекстов. Апп может быть embedded и без контракта (hostInbound/rootForward тогда `undefined`, но апп всё равно в хосте). `isEmbedded` уже импортирован в `createCapsuleApp.tsx` (~строка 54).

## Правки (`packages/web/runtime/core/src/`)

1. **`engine/host-bridge.ts`** — добавить:
   - `EmbedModeContext = createContext<{ embedded: boolean }>({ embedded: false })` — дефолт `{ embedded: false }` = standalone (корректно для тестов/без provider'а).
   - хук `useEmbedMode = (): { embedded: boolean } => useContext(EmbedModeContext)`.
   - Стиль/доки — как у соседних `HostInboundContext`/`RootForwardContext` в этом файле.

2. **`bootstrap/createCapsuleApp.tsx`**:
   - `const embedded = isEmbedded()` один раз в `createCapsuleApp` (рядом с резолвом embedParams).
   - Прокинуть `embedded` в `buildAppComponent(...)` новым параметром.
   - В `buildAppComponent` обернуть дерево `<EmbedModeContext.Provider value={{ embedded }}>` рядом с `RootForwardContext.Provider`/`HostInboundContext.Provider` (любой консистентный уровень, главное чтобы оборачивал `BaseProviders`, где монтируются Feature/Controller).

3. **`engine/logic-wrapper.tsx`**:
   - `const { embedded } = useEmbedMode();`
   - Добавить `embedded` и `standalone: !embedded` в `services` (ОБЕ ветки — `kind === 'feature'` и controller). Поля **статичные**, не реактивные (режим фиксирован на сессию).

4. **`wrappers/interfaces.ts`** (`IServices`) — добавить `embedded: boolean` и `standalone: boolean` с doc-комментариями (статичный run-режим; `standalone === !embedded`; источник — bootstrap iframe-check).

5. **Тесты** (`engine/__tests__/embed-mode.test.tsx` или в существующий logic-wrapper тест) — покрыть:
   - services несёт оба флага;
   - standalone-дефолт (`EmbedModeContext` дефолт) → `embedded:false`/`standalone:true`;
   - провайдер `{embedded:true}` → `embedded:true`/`standalone:false`.

6. **`docs/_meta/web-core.md`** — обновить shape `services` (добавить embedded/standalone). Канон: готово = код+тесты+доки.

## НЕ делать
- НЕ трогать `contract.ts` / forward-gate / host-inbound механику — `in`/`out` поведение не меняется, это чисто экспозиция флага.
- НЕ трогать `apps/*`.
- Push НЕ делать (commit-only; интеграцию/push координирует architect/user — дерево shared, есть uncommitted app-WIP на `feat/remote-comms`).

## Проверка
`pnpm --filter @capsuletech/web-core test` + `pnpm --filter @capsuletech/web-core build` (apps резолвят dist через package.json#exports → build обязателен). Вернуть последние строки обоих.

## Использование в аппе (для контекста, апп НЕ трогать)
```js
Controller(({ embedded, standalone }) => ({
  states: { idle: {
    // standalone: сеем свои данные; embedded: молчим, данные придут от хоста через contract.in
    onInit: ({ emit }) => { if (standalone) emit('addItems', { payload: localData }) },
  }},
}))
```

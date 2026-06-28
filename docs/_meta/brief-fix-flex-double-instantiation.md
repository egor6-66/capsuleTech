# Brief — fix: `Flex` дважды инстанцирует детей (bug A root, owner @capsuletech/web-ui)

**ADR:** [[062-runtime-observability-trace-channel]] (диагностика). **Зона:** `packages/web/kit/ui/src/primitives/layout/flex/flex.tsx` (+ `grid/grid.tsx`). **Приоритет: P0** (framework-баг, бьёт по любому stateful/effectful потомку Flex).

> **СТАТУС: ПОДТВЕРЖДЁН системным трейсом** (после `brief-trace-all-web-ui-primitives`, commit 5f7093c6). Дамп /store: один `web-core.widget` (cl-580) → один `web-ui.flex` (cl-581) → дети (`web-ui.button` + `remote.component`) монтируются **дважды** внутри единственного Flex (один flex-mount исключает «Widget-контент двоится»). Owner web-ui отдельно подтвердил тот же паттерн в `grid.tsx`. Это не гипотеза — чините.

## Симптом (bug A)

Один `<Remote.View name="universal-canvas">` внутри `<Ui.Layout.Flex>` → **2 `RemoteComponent`** монтируются → каждый подписывается на transport 2× (by design) → **4 подписчика на 1 канвас** → один inbound postMessage доставляется дважды (`remote.component:receive ×2`). В DOM при этом 1 iframe.

## Доказательство (чистый trace, probe=1)

Канвас-Widget, варьируем только контент (apps/playground), замер через trace-канал:

| Контент Widget | `remote.component:mount` | transport subscribers |
|---|---|---|
| `<Flex><Button meta/><Remote.View/></Flex>` (оригинал) | **2** | 4 |
| `<Remote.View/>` напрямую (без Flex) | **1** | 2 |
| `<Flex><Remote.View/></Flex>` (Flex без Button) | **2** | 4 |

⇒ `web-core.widget:mount` = 1 (Widget-обёртка чиста), Button/UiProxy сняты с подозрения, **корень = `Flex`**: добавление Flex удваивает инстанс контента.

## Корень в коде (`flex.tsx`)

1. **стр. 105:** `const resolved = children(() => props.children)` — резолвит детей, чтобы посчитать `isEmpty()`. `children()` — мемо, которое **инстанцирует** потомков (это owner #1). Используется только для пустоты, в DOM **не вставляется**.
2. **стр. 72-93:** `splitProps(props, [...layout])` → `polyAndRest`; затем `splitProps(polyAndRest, ['as'])` → `poly` + `others`. **`children` нигде не выделяется** → остаётся в `others`.
3. **стр. 150-159:** `<Slot {...others} />` — спред `others` передаёт в Slot **сырой `props.children`** → Slot инстанцирует их **второй раз** (owner #2, это то, что реально в DOM).

Итог: потомки инстанцируются **дважды** — раз мемо `resolved` (осиротевший, отсюда churn mount→dispose), раз Slot (живой). Для обычного `<div>`/`<span>` это незаметно; для компонента с эффектами/подписками (RemoteComponent, MapView, DataTable, любой `createEffect`/`onMount`) — двойные эффекты, двойные подписки, утечки.

## Что сделать

Резолвить детей **ровно один раз** и **этот же** результат рендерить в Slot. Канонический Solid-паттерн: единственная точка резолва — `children()`.

Набросок (на усмотрение owner'а, но суть — одна инстанциация):
```tsx
const resolved = children(() => (props as { children?: JSX.Element }).children);
const isEmpty = () => {
  const r = resolved();
  return r == null || (Array.isArray(r) && r.length === 0);
};
// ...
return (
  <Slot
    {...({
      as: (poly.as as T) ?? ('div' as T),
      class: classes(),
      style: mergeStyle(computed(), own.style) as never,
      ...(others as object),
      children: resolved(),   // ← единственный инстанс; перекрывает сырой children из others
    } as any)}
  />
);
```
(Либо выделить `children` из `others` через `splitProps` и передать `resolved()` явно — главное, чтобы Slot НЕ получал второй, сырой `props.children`.)

## Проверка тех же кейсов в Grid

`flex.tsx` импортит `mergeStyle, toGap` из `../grid/utils` — проверь, нет ли **того же паттерна** (`children(() => props.children)` для isEmpty + `{...others}` с сырым children) в **Grid** (`primitives/layout/grid/`) и в любых других обёртках над `Slot`. Если есть — фикс там же, тем же приёмом. Это, вероятно, не единичный случай.

## Тесты

- Добавь тест на **single-instantiation**: потомок с side-effect-счётчиком (`createEffect`/`onMount` инкремент) внутри `<Flex>` → счётчик == 1, не 2. (Зеркало `singleI…`-теста в web-remote — синхронизируй паттерн.)
- Тест на `isEmpty` (пустой Flex → `min-height: var(--size-slot)`) должен остаться зелёным.
- `pnpm --filter @capsuletech/web-ui test` + `build` — верни последние строки и список затронутых файлов.

## После фикса (architect, НЕ в этом брифе)

- `ba945dba` (web-core `widget.tsx`, single-instance контента через `children()`) — **оставить**: трейс показал контент = ОДИН Flex (фикс работает корректно), баг был ниже, в Flex. Revert не нужен.
- Верификация трейсом: дамп /store → `web-ui.button` net 1, `remote.component` net 1, subscribers 2; канвас-кнопка → ровно 1 `remote.component:receive`.

## НЕ делать

- Не трогать apps/*, web-remote, web-core. Только `Flex` (+ Grid если тот же баг).
- Push не делать — commit-only.

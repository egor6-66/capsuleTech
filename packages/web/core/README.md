# @capsuletech/web-core

> Сердце фреймворка Capsule. Здесь живут **6 wrapper-функций HCA-слоёв**, **две Proxy-механики** (UiProxy + ControllerProxy), **createRoot** + **BaseProviders**. Всё, что нужно, чтобы превратить декларативный JSX в FSM-управляемое приложение.

**Версия:** см. `package.json` (текущая `0.1.x`)
**Runtime:** Solid.js 1.9, XState (через `@xstate/solid`), TanStack Solid Router
**Архитектура:** [[docs/01-architecture/]] · [[docs/09-packages/core.md]]
**Бандл:** isomorphic (тот же код для SSR и CSR — DOM-проверки точечные)

---

## Оглавление

- [TL;DR — что делает этот пакет](#tldr--что-делает-этот-пакет)
- [Точки входа](#точки-входа)
- [Карта файлов](#карта-файлов)
- [Архитектура одной картинкой](#архитектура-одной-картинкой)
- [Публичный API](#публичный-api)
  - [Wrappers](#wrappers-entity--widget--page--controller--feature--shape)
  - [`createRoot` + `BaseProviders`](#createroot--baseproviders)
  - [Типы](#типы)
- [Контракты и инварианты (read this if you're an agent)](#контракты-и-инварианты-read-this-if-youre-an-agent)
- [Поток события (end-to-end)](#поток-события-end-to-end)
- [`ITarget` — единый payload для handler'ов](#itarget--единый-payload-для-handlerов)
- [Slot-registry: как UI-слои «видят» друг друга](#slot-registry-как-ui-слои-видят-друг-друга)
- [Shape — декларативные data-формы](#shape--декларативные-data-формы)
- [Что **не** входит в core](#что-не-входит-в-core)
- [Тесты](#тесты)
- [Сборка](#сборка)
- [Известные слабые места и направления улучшения](#известные-слабые-места-и-направления-улучшения)
- [Гайд для агентов / контрибьюторов](#гайд-для-агентов--контрибьюторов)
- [FAQ / ловушки](#faq--ловушки)

---

## TL;DR — что делает этот пакет

```
+---------------------- apps/<app> --------------------+
|                                                      |
|   .capsule/bootstrap.tsx                             |
|       createRoot(Bootstrap) ─→ <BaseProviders ...>   |
|                                  ↓                   |
|         Page  ───────────────────┤  ui-layer         |
|         Widget ──────────────────┤  composition      |
|         Entity ──────────────────┤  stateless UI     |
|         Controller ──────────────┤  FSM (UI events)  |
|         Feature ─────────────────┤  FSM (API/IO)     |
|         Shape ───────────────────┤  data-форма       |
|                                                      |
+------------------------------------------------------+
```

`web-core` **не** содержит UI-компонентов, API-клиента и стейт-движка — он их **склеивает** через wrapper-функции и две Proxy:

- **`UiProxy`** оборачивает UI-kit и превращает любой `<X meta={{tags:[...]}}>` в реактивно-регистрируемый, event-перехватываемый узел.
- **`ControllerProxy`** превращает schema FSM в объект `controller.<method>(target, ctx)` с авто-bubble к родителю.

Всё это объединяет [[docs/01-architecture/manifest|HCA-манифест]]: «UI is a Shadow» — интерфейс это немая проекция логики.

---

## Точки входа

`package.json → exports`:

| subpath | для чего | импорт |
|---|---|---|
| `.` | wrapper'ы, типы, `Providers` namespace | `import { Entity, Widget, Page, Controller, Feature, Shape, useShapeUi } from '@capsuletech/web-core'` |
| `./create` | DOM-bootstrap | `import { createRoot } from '@capsuletech/web-core/create'` |
| `./providers` | корневой Router/Vitals провайдер | `import { BaseProviders } from '@capsuletech/web-core/providers'` |

Всё остальное (`engine/*`, `ui-kit/*`) — **внутреннее**, не импортируется снаружи. Если что-то нужно публично — сначала задокументируй сюда.

---

## Карта файлов

```
packages/web/core/src/
├── index.ts                        # barrel: wrappers + Providers + interfaces
├── interfaces.ts                   # re-export wrappers/interfaces (IAppConfig переехал в web-query/app-config)
│
├── create/
│   ├── index.ts
│   └── createRoot.ts               # render(Component, container) + ensureTheme + import CSS/themes
│
├── providers/
│   ├── index.ts
│   └── base.tsx                    # BaseProviders<TRouteTree> — RouterProvider + (опц.) VitalsMonitoringProvider
│
├── engine/                         # ВНУТРЕННЕЕ — публичного API не имеет
│   ├── ctx.ts                      # ICtx / IControllerHandle + Solid Context + useCtx
│   ├── controller-proxy.ts         # ControllerProxy (FSM dispatch + next-цепочка + state.set/matches)
│   ├── ui-proxy.tsx                # UiProxy + wrapComponent + EVENT_HANDLERS (6 событий)
│   ├── logic-wrapper.tsx           # createLogicWrapper('controller' | 'feature') — общая фабрика
│   ├── derivation.ts               # deriveName / deriveInputType / TAG_TO_INPUT_TYPE / getTargetData
│   └── registry.ts                 # getGlobalRegistry<K>(key) — единый резолвер слотов
│
├── ui-kit/
│   ├── imports.tsx                 # lazy()-обёртки над @capsuletech/web-ui (Button/Input/Card/Field/...)
│   └── index.tsx                   # export * as Ui
│
└── wrappers/
    ├── index.ts                    # re-export Entity/Widget/Page/Controller/Feature/Shape
    ├── interfaces.ts               # IDefineStateSchema/IHandlerApi/IServices/ITarget + global Widgets/Entities/...
    ├── entity.tsx                  # EntityWrapper — оборачивает UI в UiProxy внутри Controller-tree
    ├── widget.tsx                  # WidgetWrapper — композиция (Outlet + Ui + Features + Controllers + Entities)
    ├── page.tsx                    # PageWrapper — корневой layout (Ui + Widgets + Outlet)
    ├── controller.tsx              # ControllerWrapper = createLogicWrapper('controller')
    ├── feature.tsx                 # FeatureWrapper = createLogicWrapper('feature')   (только Feature получает services.api)
    └── shape/
        ├── index.ts                # re-export Shape + ShapeUiContext + useShapeUi
        ├── wrapper.tsx             # Shape factory — polymorphic-компонент с as/children/data приоритетом
        ├── context.tsx             # ShapeUiContext — проброс проксированного Ui из Entity в Shape
        ├── ui-tracker.ts           # Proxy-tracker для ui.X.Y → ['X','Y'] + resolveByPath
        └── types.ts                # IShapeFactory / IShapeDefinition / IShapeWrapper / ShapeItem<S>
```

> Структура сложилась после Phase E (engine/wrappers split, см. ADR-серию в `docs/01-architecture/adr/`). До этого `wrappers/{ui, logic}/...` дублировал интерфейсы; `engine/` сейчас — единственное место с внутренней механикой.

---

## Архитектура одной картинкой

```
                 ┌─────────────────────────────────────────────────┐
   Page          │  Page = top-level layout. Получает Outlet + Ui  │
       │        │  + Widgets registry (через slot-codegen).       │
       ▼        └─────────────────────────────────────────────────┘
   Widget   ─→  композиция Entity + Controller (+ Outlet). Единственное место,
       │       где можно «склеивать» сущности.
       ▼
   Controller (FSM)  ─→  Feature (FSM, имеет services.api)  ─→  parent.next() …
       │
       ▼
   Entity (stateless UI)  ─→  UiProxy(Ui)  ─→  data-meta event-binding
       │
       ▼
   UI-kit (@capsuletech/web-ui)
```

Запрещены **upward** и **horizontal** импорты — это enforced линтером `@capsuletech/compliance` (см. ADR 004, режим `warn`).

---

## Публичный API

### Wrappers (Entity / Widget / Page / Controller / Feature / Shape)

Все wrapper'ы — **глобальные** в apps (инжектятся через `unplugin-auto-import`, **не импортируются в коде apps**). Здесь — публичные сигнатуры:

```ts
// stateless UI. Получает UI-примитивы + Shapes registry.
const Entity: <C>(component: (ui: EntityUi, shapes: Shapes) => JSX.Element) => Component<C>;

// композиция. Получает Ui (с Outlet) + Features + Controllers + Entities.
const Widget: <C>(component: (
  ui: WidgetUi,
  features: Features,
  controllers: Controllers,
  entities: Entities,
) => JSX.Element) => Component<C>;

// top-level layout. Получает Ui (Layout + Outlet) + Widgets.
const Page: <C>(component: (ui: PageUi, widgets: Widgets) => JSX.Element) => Component<C>;

// FSM-обёртка для UI-логики. services = { router }.
const Controller: (schema: (services: { router }) => IDefineStateSchema) => Component<IWrapperProps>;

// FSM-обёртка для domain-логики. services = { router, api }.
const Feature:    (schema: (services: { router, api }) => IDefineStateSchema) => Component<IWrapperProps>;

// polymorphic-компонент для повторяющихся data-форм (см. Shape ниже).
const Shape: <S extends ZodArray<...>>(factory: IShapeFactory<S>) => IShapeComponent<...>;
```

#### `Controller` / `Feature` — props

```ts
interface IWrapperProps {
  children: any;
  /** Ремап имён методов при bubbling к родителю. Пример: { onClick: 'submit' }. */
  overrides?: Record<string, string>;
  /** Опциональный fallback для встроенного <Suspense> вокруг детей. */
  fallback?: JSXElement;
}
```

#### Что инжектируется в schema-функцию

| | Controller | Feature |
|---|---|---|
| `services.router` | ✅ | ✅ |
| `services.api`    | ❌ | ✅ (compliance: IO запрещено в Controller'е) |

### `createRoot` + `BaseProviders`

```ts
// apps/<app>/.capsule/index.ts
import { createRoot } from '@capsuletech/web-core/create';
import Bootstrap from './bootstrap';

createRoot(Bootstrap);                                  // в #root
createRoot(Bootstrap, { container: 'my-app' });         // в #my-app
createRoot(Bootstrap, { container: document.body });    // или DOM-нодой
createRoot(Bootstrap, { defaultTheme: 'light' });       // если ещё нет <html data-theme>
```

`createRoot` импортирует `@capsuletech/web-style/css` + `/themes` (side-effects), гарантирует `<html data-theme>` (если ещё не задан), возвращает Solid-disposer.

```tsx
// apps/<app>/.capsule/bootstrap.tsx
import { BaseProviders } from '@capsuletech/web-core/providers';
import { routeTree } from './routes/routeTree.gen';

export default function Bootstrap() {
  return (
    <BaseProviders routeTree={routeTree} vitals={import.meta.env.DEV}>
      {/* TanStack Router рендерит routeTree через RouterProvider — children здесь fallback */}
    </BaseProviders>
  );
}
```

`BaseProviders<TRouteTree>` оборачивает:
- `RouterContext.Provider` + `RouterProvider` (TanStack) — если передан `routeTree`. Без `routeTree` — рендерит `children` напрямую.
- (опц.) `VitalsMonitoringProvider` от `@capsuletech/web-profiler` — если `vitals={true}`.

### Типы

Re-exports из `@capsuletech/web-core` (см. `wrappers/interfaces.ts`):

| Тип | Зачем |
|---|---|
| `IDefineStateSchema<TCtx>` | shape FSM-схемы (`initial`, `context`, `states`, hooks) |
| `IStateHandlers` | shape `schema.states[name]` (onClick/onInput/onInit/onExit + custom methods) |
| `IHandlerApi<TCtx>` | `{ target, context, next, state, store }` — что приходит в каждый handler |
| `INext` | `{ (): Promise<T|null>; with(arg): Promise<T|null> }` — bubble-функция |
| `IErrorHandlerApi<TCtx>` | `IHandlerApi` + `{ error, method }` — то что приходит в `schema.onError` |
| `ITarget` | payload event'а (name/value/meta/dynamicMeta/**payload**/**from**/key/modifiers) |
| `IStateApi` | `{ current, set, matches }` — внутри handler'а |
| `IServices` | `{ router, api? }` |
| `IWrapperProps` | `{ children, overrides?, fallback? }` |
| `IBaseStateHandlers`, `IBaseStateSchema`, `IBridge` | реэкспорты из `@capsuletech/web-state` (см. Phase F unification) |
| `IShapeFactory`, `IShapeDefinition`, `IShapeWrapper`, `ShapeItem<S>`, ... | Shape API |

Глобальные slot-интерфейсы (`Widgets`/`Entities`/`Controllers`/`Features`/`Shapes`/`CapsuleApi`) расширяются через interface merging codegen'ом плагинов (`.capsule/@types/slots.d.ts`, `api.d.ts`).

---

## Контракты и инварианты (read this if you're an agent)

Жирные инварианты — нарушение валит механику или ломает совместимость с остальными слоями.

1. **Entity без Controller-родителя — UiProxy выключен.**
   Любые `meta` на JSX-узлах **не регистрируются** в store, **не получают event-binding**. В DEV-режиме это даёт `console.warn`. Сценарий валидный (Storybook, изолированный preview), но в продакшен-дереве это, скорее всего, ошибка интеграции.

2. **`meta` активирует side-effects только когда он указан НА ЭТОМ JSX-узле явно** (политика C — *own meta opt-in*).
   Унаследованный `dynamicMeta` (от Entity-prop) **не считается**. Структурные обёртки (`<Field>`, `<Field.Label>`, …) проходят сквозным рендером, регистрируются только конкретные нативные/семантические узлы.

3. **`id` компонента стабилен через `createUniqueId`** + `createEffect` (re-register при изменении props) + `onCleanup` (unregister на dispose). Регрессии тут ловит `engine/__tests__/ui-proxy.test.tsx`.

4. **Шесть и только шесть событий** перехватываются `UiProxy`: `onClick`, `onInput`, `onChange`, `onBlur`, `onFocus`, `onKeyDown` (см. ADR 009). Из них **`onInput`/`onChange`** дополнительно пишут `target` в `store.components[id]` (флаг `updateStore: true`).
   Расширение этого набора = breaking-change → требует ADR.

5. **Event-bubble дедупится через event-marker `__capsule_<eventName>__`**. Первый сработавший wrapper пишет флаг → верхние обёртки в DOM-цепочке пропускают. Один клик = один вызов handler'а на текущей обёртке.

6. **Порядок mergeProps в `wrapComponent`** (зафиксирован):
   `props < dynamicProps (class/disabled/name/type) < ctx.store.props[id] (patch'и от Controller) < local (children)`.
   `props` патч из Controller передан **функцией** в `mergeProps` — Solid дёргает её на каждом read, поэтому реактивность XState доходит до final-props без явного `createMemo`.

7. **ControllerProxy method resolution**:
   `schema.states[current][method]` → `schema[method]` (top-level fallback) → `await next()` (auto-bubble к parent). Никогда не вызывается `current` старого/предыдущего стейта — `state.value` читается на каждом dispatch'е.

8. **`state.set(name)`** под капотом шлёт `{type: '__GOTO_<name>__'}` в XState. Транзишн на эту маркер-event'у генерится `createState(schema)` в `@capsuletech/web-state`. **Не дёргать `__GOTO_*__` руками** — это внутренний контракт.

9. **Bubble-функция `next` — два API:**
    - `next()` — пассивный bubble. `target.payload` сохраняется (JSX-immutable), `target.from` сбрасывается в `undefined`.
    - `next.with(arg)` — bubble с явной передачей данных в `target.from = arg`. `payload` всё равно не меняется.

    Имя метода у родителя = `overrides[method] ?? method`. Возврат — `Promise<T | null>` (null если родителя нет или у parent'а нет такого метода).

    **Контракт `from`:** каждый handler видит **только** `from` от своего непосредственного ребёнка, не аккумулируется через цепочку. Хочешь форвардить — пиши явно: `await next.with(target.from)`.

10. **Async-ошибки в handler'ах:**
    - В `UiProxy` (на DOM-event) → `safeCall` ловит и **логирует** (sync-throw + async-reject). Поток не падает.
    - В `ControllerProxy` (вызов `controller.<method>(...)`) → `schema.onError?` фаерит → ошибка **re-throw**. Колбэк `next()` пробрасывает её обратно.
    Разная семантика **намеренная**: внутри DOM-event никто не ждёт promise, в цепочке `next()` — ждут. `onError` даёт точку централизованной реакции (Sentry, setErrors → store, fallback-логика) — re-throw'нуть из неё нельзя (логируется и глотается).

11. **`onRegister` — top-level hook FSM-схемы — фаерит РЕАКТИВНО на каждое register/unregister компонента** в `store.components`. Не «один раз на mount». От пользователя требуется идемпотентность. Это работает с lazy-детьми (Suspense, lazy-роуты).
    Семантически отличается от `states[X].onInit`: последний — про переход FSM, `onRegister` — про настройку реактивного состояния по составу UI-дерева.
    Одноразовый mount-effect → `states[initial].onInit`. Teardown → `onDispose`.

12. **`getTargetData(e, props, derived)`** — pure-функция. Приоритеты:
    - `name`: DOM `el.name` → `derived` (из `meta.tags`) → `props.name`.
    - `value`: для checkbox = `el.checked`, иначе `el.value ?? props.value`.
    - `meta`/`payload`/`dynamicMeta` — из JSX props (НЕ из DOM-атрибутов — Solid их не сериализует, см. A-5 в cleanup-plan).
    - `modifiers` — `undefined`, если event отсутствует (lifecycle-вызов).

13. **Teardown — через `schema.onDispose`.** Фаерит один раз на unmount Controller/Feature (Solid `onCleanup`). На момент вызова `store.components` уже пуст (UiProxy-обёртки disposed первыми). Async-возврат не ждётся (Solid `onCleanup` синхронный) — promise глотает rejection через `.catch` + log.

14. **Slot-реестры (`Widgets`/`Entities`/`Controllers`/`Features`/`Shapes`) приходят через `globalThis`** — кладёт `apps/<app>/.capsule/bootstrap.tsx`. Чтение — `getGlobalRegistry(key)`. Это известная техдолг-точка: миграция на context-провайдер запланирована (см. A-2/A-3 в cleanup-plan).

---

## Поток события (end-to-end)

```
User кликает <button meta={{tags:['submit']}}>
  ↓
DOM click → wrapComponent.onClick(e)
  ↓
__capsule_onClick__ marker → ставится в true, верхние wrapper'ы skip'нут event
  ↓
getTargetData(e, props, deriveName(meta)) → ITarget
  ↓
если onClick.updateStore=false → пропускаем; (для onInput/onChange — ctx.store.update({[id]: target}))
  ↓
safeCall(ctx.controller.onClick, target, ctx.store.ctx)
  ↓
ControllerProxy.onClick(target, ctx)
  ↓
state.value = 'idle'  →  schema.states['idle'].onClick → handler({target, context, next, store, state})
                                                                                          │
                                            handler возвращает await next() либо await next.with(arg)
                                                                                          ↓
                                              parent.controller[overrides?.onClick ?? 'onClick'](enrichedTarget, ctx)
                                                                                          ↓
                                          enrichedTarget: { ...target, from: arg | undefined }
                                                                                          ↓
                                                  ... до самого верха или до Feature ...
                                                                                          ↓
                                                   Feature: services.api.user.update(...)
                                                                                          ↓
                                                   state.set('done') → __GOTO_done__ → XState transition
                                                                                          ↓
                                                   Bridge переподписывается → store.styles/disabled/props
                                                                                          ↓
                                                                            UiProxy mergeProps читает →
                                                                            реактивно обновляет UI

Если handler бросил → schema.onError?({error, method, ...api}) → re-throw к caller'у
```

---

## `ITarget` — единый payload для handler'ов

```ts
interface ITarget {
  name?: string;          // DOM name → derived из meta.tags → props.name
  value?: unknown;        // el.value / el.checked (для checkbox) / props.value
  type?: string;          // el.type (DOM input type)
  meta?: ITagMeta;        // JSX-meta (с этим узлом)
  dynamicMeta?: ITagMeta; // dynamicMeta от Entity-prop (сценарная окраска от Widget)
  payload?: unknown;      // JSX-declared payload, immutable через цепочку
  from?: unknown;         // данные от непосредственного child via next.with(arg)
  key?: string;           // keyboard-события
  modifiers?: { ctrl, shift, alt, meta };
}
```

**Два канала передачи данных — раздельные:**

### `payload` — JSX-declared, immutable

Что автор Entity положил на JSX-узел. **Не меняется** через bubble-цепочку — каждый уровень видит то же значение.

```tsx
<Nav.Item meta={{tags:['nav']}} payload={{href:'/branches'}} />
// → target.payload === { href: '/branches' }  во ВСЕХ Controller'ах + Feature
```

### `from` — bubble-channel через `next.with(arg)`

Что **непосредственный** child-Controller хочет сообщить parent'у. Сбрасывается на каждом уровне:
- На прямом UI-event'е → `undefined` (нет «предыдущего»).
- При пассивном `next()` → `undefined` (этот уровень ничего явно не передаёт).
- При `next.with(arg)` → `arg`.

```ts
// Controller A:
await next.with({ kind: 'navigate', to: target.payload.href });

// Controller B (parent):  // target.from === { kind: 'navigate', to: '/branches' }
                           // target.payload === { href: '/branches' } (immutable JSX)
```

**Контракт строгий**: каждый handler видит **только** `from` от своего ребёнка, не аккумулируется. Хочешь форвардить — пиши явно:
```ts
await next.with(target.from);
```

Тесты — `engine/__tests__/controller-proxy.test.ts` секции `next() bubbling (passive)` и `next.with(arg) bubbling (explicit)`.

---

## Slot-registry: как UI-слои «видят» друг друга

У каждого wrapper'а свой набор позиционных аргументов:

```ts
Page((ui, widgets) => ...)
Widget((ui, features, controllers, entities) => ...)
Entity((ui, shapes) => ...)
Controller((services) => schema)
Feature((services) => schema)
```

Все реестры (кроме `ui`) приходят из `getGlobalRegistry('Widgets'|'Entities'|...)`, который читает `globalThis`. Apps кладут реестры в `apps/<app>/.capsule/bootstrap.tsx` через `Object.assign(globalThis, registry)` — это делает `ExportGeneratorPlugin` (см. `packages/builders/vite/src/plugins/ExportGenerator`).

Типизация реестров — через **interface merging**:
- В `wrappers/interfaces.ts` объявлены пустые `interface Widgets {}`, `interface Entities {}` и т.д.
- Codegen генерит `.capsule/@types/slots.d.ts` с `interface Widgets { ViewerLogin: typeof import('@widgets/viewer/login').default; ... }` — TS склеивает, Ctrl+Click ведёт в источник.
- Аналогично `CapsuleApi` (но он живёт в `@capsuletech/web-query/createApi.ts` — родной дом, бо это return-type `getApiClient()`).

---

## Shape — декларативные data-формы

`Shape` — polymorphic-компонент для **повторяющихся data-форм** (nav items, list rows, …). Декларирует:

```ts
const NavItems = Shape((z, ui) => ({
  schema: z.array(z.object({ name: z.string(), href: z.string() })),
  defaults: [{ name: 'Branches', href: '/branches' }, { name: 'Users', href: '/users' }],
  as: ui.Navigation.Item,                       // path-tracker (резолвится lazy)
  props: (item) => ({                            // map item → templateProps
    meta: { tags: ['nav'] },
    payload: { href: item.href },
    children: item.name,
  }),
}));

// usage in Entity:
<Navigation>
  <Navigation.List>
    <Shapes.NavItems />                          {/* defaults, default template */}
    <Shapes.NavItems data={fromStore()} />       {/* override данных */}
    <Shapes.NavItems as={CustomItem} />          {/* override template'а */}
    <Shapes.NavItems>{(item, i) => ...}</Shapes.NavItems>  {/* full escape hatch */}
  </Navigation.List>
</Navigation>
```

**Path-tracker** (`createUiTracker`): `ui.Navigation.Item` запоминает путь `['Navigation', 'Item']`. На рендере Shape резолвит этот путь по проксированному Ui из `ShapeUiContext` (его проставляет родительский Entity), получая корректный wrapped-компонент с UiProxy-event-binding'ом.

Приоритет резолва шаблона:
1. `props.children` (render-prop) — escape hatch.
2. `props.as` от JSX-сайта — explicit override.
3. `definition.as` от factory — default template (lazy через context, если path-tracker).
4. default — рендерит `templateProps.children` без обёртки.

См. [[docs/07-binding/shape.md]] и тесты `shape/__tests__/ui-tracker.test.ts`.

---

## Что **не** входит в core

| | Где живёт |
|---|---|
| API-клиент, endpoints, middleware | `@capsuletech/web-query` (Feature видит `services.api`) |
| FSM-движок, Bridge, createState | `@capsuletech/web-state` |
| UI-компоненты | `@capsuletech/web-ui` (Button/Input/Card/Field/Layout/…) |
| Темизация, CSS, CVA | `@capsuletech/web-style` |
| Router | `@capsuletech/web-router` (тонкая обёртка над TanStack) |
| Vite-плагины, builder | `@capsuletech/vite-builder`, `@capsuletech/lib-builder` |
| Compliance-linter | `@capsuletech/compliance` (Vite-плагин) |
| Web Vitals, profiler | `@capsuletech/web-profiler` |
| Zod-расширения | `@capsuletech/shared-zod` |

---

## Тесты

```bash
pnpm --filter @capsuletech/web-core test
```

Покрытие (5 файлов, jsdom-env):

| Файл | Что проверяет |
|---|---|
| `engine/__tests__/ui-proxy.test.tsx` | pass-through (без meta) / own-meta path / register-unregister / event-bubble dedupe / safeCall / sub-component Proxy |
| `engine/__tests__/controller-proxy.test.ts` | system fields / state-vs-top dispatch / state.set/matches / next() bubble + payload + overrides / error handling |
| `engine/__tests__/derivation.test.ts` | `deriveName` (skip `@`-aliases) / `deriveInputType` mapping / `TAG_TO_INPUT_TYPE` closed-set |
| `engine/__tests__/getTargetData.test.ts` | name/value/meta/payload/key/modifiers — приоритеты |
| `wrappers/shape/__tests__/ui-tracker.test.ts` | path-tracker / resolveByPath / integration Shape pattern |

Что **не** покрыто (intentionally):
- `wrappers/{entity,widget,page,controller,feature}` — это thin glue, ловить тут регрессии без реального XState-рантайма дорого.
- `create/createRoot` — DOM-bootstrap, ловится smoke-тестами на уровне apps.
- `providers/base` — реэкспорт + Show-условка.
- `logic-wrapper.tsx` — orchestrator XState + ControllerProxy + Bridge; ловится integration-тестами в apps.

Если правишь `engine/` — **сначала запусти тесты**, потом меняй. Тесты — единственный реальный safety net.

---

## Сборка

```bash
pnpm nx build @capsuletech/web-core            # vite build через @capsuletech/lib-builder
pnpm --filter @capsuletech/web-core release:local patch     # publish-флоу (см. scripts/release.mjs)
```

`vite.config.mts` использует `libConfig({ entry, name, runtime: 'isomorphic' })` — три entry: `index`, `create`, `providers`. Build output — ESM `.mjs` + типы.

Аудит:
```bash
pnpm audit:exports                              # publint + attw (бар: bundler-✅)
```

---

## Известные слабые места и направления улучшения

> Это не баги — это техдолг и точки роста. Не «фиксить заодно», только если задача об этом.

### ✅ Закрыто до старта проекта (pre-adoption sweep)

- ✅ `onMount` → переименован в **`onRegister`**. Имя теперь точно отражает семантику (фаерит на каждый register/unregister компонента).
- ✅ Двойная семантика `ITarget.payload` → **разделена на 2 канала**: `target.payload` (JSX-immutable) + `target.from` (bubble-channel через `next.with(arg)`). Старый `next(arg)` больше не перетирает payload — он стал `next()` (pass-through) + `next.with(arg)` (explicit).
- ✅ `IControllerHandle.destroy` (фейковый no-op) → удалён. Teardown теперь через **`schema.onDispose`**.
- ✅ Несогласованный error-handling → добавлен **`schema.onError`** — централизованный hook, фаерит до re-throw.
- ✅ `Suspense` без fallback в logic-wrapper → теперь принимает опциональный `IWrapperProps.fallback`.
- ✅ `Object.entries(EVENT_HANDLERS)` в hot-path → вынесен в module-level `EVENT_ENTRIES` (pre-computed marker'ы).
- ✅ Event-marker `__capsule_<eventName>__` inline-template → экспортируется как функция `eventMarker(name)`.

### 1. `globalThis`-реестры

`engine/registry.ts` читает реестры через `globalThis`. Это:
- усложняет тестирование (нужно глобально мокать),
- мешает multi-app сценариям (Storybook + apps в одном процессе),
- невидимая зависимость (нет import-graph'а).

**План:** мигрировать на context-провайдер через `BaseProviders` props. Тогда `getGlobalRegistry` станет thin-wrapper'ом:
```tsx
<BaseProviders registries={{ widgets, entities, controllers, features, shapes }} />
```
Не блокирует старт проекта (касается только `bootstrap.tsx`, не handler-кода).

### 2. UI-kit жёстко вшит в `ui-kit/imports.tsx`

`core` напрямую `lazy()`-импортит конкретные компоненты `@capsuletech/web-ui`. Если кто-то захочет собрать app c альтернативным UI-kit, A/B-тест разных Field/Input, shadcn-like инжекцию — придётся форкать core. Возможный refactor:
```tsx
<BaseProviders ui={{ Button, Input, Field, ... }}>
```
Но: типы (`EntityUi`/`WidgetUi`/`PageUi`) в `wrappers/interfaces.ts` уже жёстко привязаны к `@capsuletech/web-ui` import'ам — это не косметика, а type-engineering усилие.

### 3. Дублирование `buildStateApi` в logic-wrapper и controller-proxy

`logic-wrapper.tsx` строит `stateApi` для lifecycle (`onInit`/`onExit`/`onRegister`/`onDispose`), `controller-proxy.ts` — для handler'ов. Структура одинаковая (`{current, set, matches}`). Стоит экспортнуть один helper из `controller-proxy.ts` и переиспользовать.

### 4. `getApiClient()` дёргается на каждый Feature-mount

В `logic-wrapper.tsx` для Feature'ов: `api: getApiClient()`. Это hidden global. Лучше передавать через Context (как router), особенно для тестирования.

### 5. Type-safety Controller-методов

`controller: any` (см. `IControllerHandle`) и `state: any` — цена за Proxy-dispatch. Можно усилить generic-выводом из schema (`schema.states[...] → method names`), но это серьёзный type-engineering effort и риск ухудшения IDE-perf на больших schema'х.

### 6. Нет dev-warn'а если wrapper применили дважды

`Page(Page(Component))` не упадёт, но даст странный результат. HMRWrappingPlugin специально превращает `const X = Page(...)` в `() => Page(...)()`, чтобы Solid HMR работал — потому wrapper'ы должны быть идемпотентны при двойном вызове. Сейчас этой защиты нет — стоит подумать.

---

## Гайд для агентов / контрибьюторов

> **Если ты агент, читающий это перед задачей — это твоё «как не сломать».**

### Куда писать

| Что нужно сделать | Куда |
|---|---|
| Добавить новый wrapper (новый слой) | новый файл в `wrappers/` + ре-export в `wrappers/index.ts` + публичный тип в `wrappers/interfaces.ts` + ADR |
| Расширить event-set UiProxy | `engine/ui-proxy.tsx` (EVENT_HANDLERS) + `engine/derivation.ts` (getTargetData) + тест в `__tests__/ui-proxy.test.tsx` + обновить `IStateHandlers` + ADR 009 |
| Изменить FSM-dispatch (state-priority и т.п.) | `engine/controller-proxy.ts` + `__tests__/controller-proxy.test.ts` + ADR |
| Добавить новый сервис в schema-функцию | `wrappers/interfaces.ts → IServices` + `engine/logic-wrapper.tsx` (инжекция, learn about compliance — IO в Controller запрещён) |
| Новый tag → input-type mapping | `engine/derivation.ts → TAG_TO_INPUT_TYPE` + тест в `derivation.test.ts` (`closed-set guarantee`) |
| Новый publishable export | `package.json → exports` + `vite.config.mts → libConfig.entry` |
| Обновить документацию core | этот README + `docs/09-packages/core.md` (Obsidian-vault) |

### Куда **не** писать

- **`engine/*`** ничего, что зависит от конкретных компонентов `@capsuletech/web-ui`. UiProxy/ControllerProxy должны работать на **любом** UI-kit, переданном через `Ui` параметр.
- **`wrappers/*`** ничего, что про конкретный API-клиент / store / роутер. Это всё инжектится через services.
- **`ui-kit/imports.tsx`** не пихать business-логику. Это только lazy()-обёртки. Если нужно что-то сложнее — нужен отдельный wrapper.

### Перед PR

1. Запусти `pnpm --filter @capsuletech/web-core test` — все тесты должны быть зелёными.
2. Запусти `pnpm --filter @capsuletech/web-core build` — типы должны собираться без ошибок.
3. Если правил публичный API — обнови:
   - `wrappers/interfaces.ts` (sigs),
   - `docs/09-packages/core.md` (в Obsidian),
   - этот README,
   - `CHANGELOG.md` через `pnpm changeset` (semver bump).
4. Если правил `engine/` — добавь характеризационный тест **перед** изменением. Сначала запиши текущее поведение, потом меняй (паттерн «test before refactor» из `feedback_test_before_refactor`).
5. Если меняешь Proxy-механики — прочитай ADR 001, 002, 007, 008, 009 в `docs/01-architecture/adr/`. Сейчас они стабильны, любое изменение — новая ADR.

### Какие специализированные агенты помогают

(см. `.claude/agents/`)

| Агент | Когда вызывать (касательно core) |
|---|---|
| `controller`, `feature`, `entity`, `widget`, `page`, `shape` | пишут артефакты apps/, **не** трогая core. Если core нужно расширить — это работа главного |
| `ui-component` | добавляет компонент в `@capsuletech/web-ui` — потом руками wire'ить в `ui-kit/imports.tsx` |

**В этом пакете** субагентов нет — все правки в core делает главный, потому что любое изменение задевает контракты с другими слоями.

---

## FAQ / ловушки

**Q: Entity не реагирует на клики — почему?**
A: Скорее всего у узла нет `meta`. Без `meta` UiProxy не навешивает event-binding. Проверь, что **на конкретном JSX-узле** (не на родительской Entity-prop'е) стоит `meta={{tags:[...]}}`.

**Q: Хочу передать данные от Controller к Feature — как?**
A: `await next.with(arg)`. В Feature читай `target.from`. `target.payload` остаётся JSX-immutable — там то, что положил автор Entity на узел, не транзитная переменная.

**Q: `target.payload` пустое в Feature, хотя в JSX было `payload={{...}}`**
A: Возможно ты ждал что Controller-ы между Entity и Feature перетирают payload — раньше так и было. Сейчас payload **immutable** через всю цепочку, а transient-данные летят через `target.from` (см. `next.with`).

**Q: `onRegister` фаерит несколько раз — это баг?**
A: Нет. Это **реактивный** хук от изменения `store.components`. Делай идемпотентным. Если нужен одноразовый mount-эффект — используй `states[initial].onInit`.

**Q: Как сделать teardown — отписаться от listener'а на unmount?**
A: `schema.onDispose?: (api) => { ... }` — фаерит на Solid `onCleanup`. Async-возврат не ждётся (cleanup синхронный), reject'ы логируются.

**Q: Где централизованно ловить ошибки handler'ов?**
A: `schema.onError?: ({ error, method, target, context, ... }) => { ... }`. Фаерит до re-throw. Re-throw из самой `onError` глотается (нельзя ронять teardown). Подавить пробрасывание — лови в самом handler'е через `try/catch`.

**Q: Получаю warn `[Entity] rendered outside of Controller` — что не так?**
A: Entity рендерится без Controller-родителя (Storybook? голый preview?). В app-дереве это обычно ошибка — оберни Entity в Widget с Controller'ом.

**Q: Хочу новое событие (например `onSubmit`)**
A: Это ADR-уровень. Текущий closed-set — 6 событий (ADR 009). Добавление: `EVENT_HANDLERS` + `IStateHandlers` + `getTargetData` обновления + тесты.

**Q: Хочу типизировать `controller.<myMethod>` в IDE**
A: Сейчас `controller: any`. Можно сделать через `useCtx<MyController>()`, но это manual. Auto-вывод из schema — открытая задача (см. слабое место #9).

**Q: Где UI-kit оборачивается в Proxy?**
A: В `wrappers/entity.tsx`: `const Ui = ctx ? UiProxy(BaseUi, ctx, wrapperProps) : BaseUi;`. UiProxy создаёт Proxy над `{...Ui}` — каждый property-access wrap'ит компонент (и его sub-component'ы через рекурсивный Proxy).

**Q: Почему `BaseUi` — флэт-объект (все компоненты в одном namespace)?**
A: Это даёт wrapper'ам Widget/Page бесплатный доступ ко всему через rest-spread + сужение типа (`{ ...(Ui as any), Outlet } as any`). UI-разделение (что увидит Entity vs Widget vs Page) — на уровне типов в `wrappers/interfaces.ts`.

**Q: Где TS-типы для slot-реестров?**
A: `.capsule/@types/slots.d.ts` (генерится `ExportGeneratorPlugin`'ом) делает interface merging в global `Widgets`/`Entities`/.... Сами реестры рантайма — `globalThis.Widgets` и т.д., ставит `apps/<app>/.capsule/bootstrap.tsx`.

---

## Связанное

- [[docs/00-index|MOC]] · [[docs/09-packages/core|Obsidian-doc этого пакета]]
- ADR-серия: [[docs/01-architecture/adr/001-xstate-as-sole-fsm|001 XState as Sole FSM]] · [[docs/01-architecture/adr/002-create-logic-wrapper|002 createLogicWrapper]] · [[docs/01-architecture/adr/003-router-context|003 Router Context]] · [[docs/01-architecture/adr/004-compliance|004 Compliance Linter]] · [[docs/01-architecture/adr/007-uiproxy-cleanup|007 UiProxy Cleanup]] · [[docs/01-architecture/adr/008-controllerproxy-via-xstate|008 ControllerProxy via XState]] · [[docs/01-architecture/adr/009-uiproxy-events|009 UiProxy Closed Events]]
- Глубокие гайды: [[docs/07-binding/ui-proxy]] · [[docs/07-binding/controller-proxy]] · [[docs/07-binding/shape]] · [[docs/07-binding/overrides]] · [[docs/07-binding/tag-registry]]
- Соседние пакеты: [[docs/09-packages/state|@capsuletech/web-state]] · [[docs/09-packages/router|@capsuletech/web-router]] · [[docs/09-packages/ui|@capsuletech/web-ui]] · [[docs/09-packages/style|@capsuletech/web-style]]

---

**Maintainer-checklist** на каждое изменение:

- [ ] Тесты обновлены / добавлены
- [ ] `wrappers/interfaces.ts` отражает реальный публичный API
- [ ] Этот README отражает реальное поведение
- [ ] `docs/09-packages/core.md` в Obsidian отражает изменения
- [ ] CHANGELOG через `pnpm changeset`
- [ ] Если breaking — ADR в `docs/01-architecture/adr/`

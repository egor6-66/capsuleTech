---
tags: [meta, web-core, ai-context]
status: documented
type: ai-anchor
audience: claude
last-verified: 2026-05-27
---

# 🤖 Web Core — AI context anchor

> [!ai]
> Шпаргалка для Claude-инстансов. Без воды. Юзеру — [[core|core.md]] (когда появится).

## TL;DR

Корневой пакет HCA-фреймворка. **Семь** wrapper-функций: `View`, `Widget`, `Page`, `Shape`, `Controller`, `Feature` (UI/logic слои) + `Entity` (domain data layer — plain config, не компонент). Поверх двух Proxy-движков: **UiProxy** (per-instance event-binding + meta-registration) и **ControllerProxy** (FSM-aware dispatch с auto-bubbling через `next()`). `createRoot()` — DOM-bootstrap (`render` + theme-injection). `BaseProviders` — composition корневых providers (RouterProvider + VitalsMonitoring). `Ui` — namespace lazy-импортов всех web-ui примитивов через `createLazy()`.

**Семантика wrapper-args (v0.3.0+)**: `(Ui, props?)` для UI-слоёв, `(services)` для logic-слоёв. Всё остальное — глобалы через `Object.assign(globalThis, _registry)` в bootstrap. См. ADR 002 + commit 477b0fb.

## Где что лежит

| Файл | Что |
|---|---|
| `packages/web/core/src/index.ts` | публичный barrel: 7 wrappers + `useShapeUi` + `Providers` namespace + типы |
| `packages/web/core/src/wrappers/entity/wrapper.ts` | `Entity` — domain data layer factory. Plain config (не компонент). `Object.freeze(factory())`. Factory без аргументов — Zod через глобал. |
| `packages/web/core/src/wrappers/entity/types.ts` | `IEntityDefinition`, `IEntityFactory`, `IEntityWrapper` |
| `packages/web/core/src/wrappers/view.tsx` | `ViewWrapper` — простой leaf, UiProxy под ControllerContext, ShapeUiContext.Provider |
| `packages/web/core/src/wrappers/widget.tsx` | `WidgetWrapper` — добавляет `Outlet` в Ui, ShapeUiContext.Provider |
| `packages/web/core/src/wrappers/page.tsx` | `PageWrapper` — `{ Layout, Outlet, Animate }` в Ui, ShapeUiContext.Provider |
| `packages/web/core/src/wrappers/shape/wrapper.tsx` | `ShapeWrapper` — batch flow (v0.4.0+): `splitProps`+`mergeProps`, передаёт `data` + extras в `as` через `Dynamic`. Path-tracker резолвится через `ShapeUiContext`. |
| `packages/web/core/src/wrappers/shape/context.tsx` | `ShapeUiContext` — несёт **только** Ui (после revert PR #114) |
| `packages/web/core/src/wrappers/shape/ui-path-tracker.ts` | Proxy-based path-tracker для `as: ui.X.Y` |
| `packages/web/core/src/wrappers/logic-wrapper.tsx` | `createLogicWrapper(kind)` — Controller/Feature общая фабрика (services injection + XState + lifecycle) |
| `packages/web/core/src/wrappers/interfaces.ts` | публичные типы: `IViewWrapper`, `IWidgetWrapper`, `IPageWrapper`, `IDefineStateSchema`, `ITarget`, `IHandlerApi` |
| `packages/web/core/src/engine/ui-proxy.tsx` | UiProxy — `EVENT_HANDLERS` (6 событий), meta-registration, event-bubble dedup |
| `packages/web/core/src/engine/controller-proxy.ts` | ControllerProxy — dispatch state lookup, `next()` bubbling, state.set/matches |
| `packages/web/core/src/engine/ctx.ts` | `useCtx()` — ControllerContext (xstate state + send + bridge) |
| `packages/web/core/src/engine/derivation.ts` | `deriveName`, `deriveInputType`, `TAG_TO_INPUT_TYPE` |
| `packages/web/core/src/engine/registry.ts` | `getGlobalRegistry(key)` — читает `globalThis.Widgets/Views/...` |
| `packages/web/core/src/ui-kit/imports.tsx` | `Ui` — lazy-импорты всех web-ui примитивов через `createLazy` |
| `packages/web/core/src/providers/base.tsx` | `BaseProviders` — RouterProvider + VitalsMonitoring |
| `packages/web/core/src/create/createRoot.ts` | DOM bootstrap: `render(Bootstrap, container)` + theme `data-theme` |
| `packages/web/core/src/wrappers/__tests__/view-props.test.tsx` | 7 характеризационных тестов нового `(Ui, props)` контракта |

## Public API

```ts
import {
  View, Widget, Page, Controller, Feature, Shape,    // 6 UI/logic wrappers (глобалы через AutoImport в apps)
  Entity,                                             // domain data layer wrapper (глобал через AutoImport — pending owner-builders)
  Providers,                                          // namespace { BaseProviders }
  useShapeUi,                                         // hook — Ui namespace из ShapeUiContext
  type ITarget, type IHandlerApi,
  type IDefineStateSchema, type IStateHandlers,
  type IServices, type IWrapperProps,
  type INext, type IStateApi,
  type IViewWrapper, type IViewRenderer,
  type IUiMetaProps, type ITagMeta,                  // UiProxy meta-props для Ui-компонентов
  type IEntityDefinition, type IEntityWrapper,        // Entity-specific types
} from '@capsuletech/web-core';

import { createRoot } from '@capsuletech/web-core/create';
import { BaseProviders } from '@capsuletech/web-core/providers';
```

### Wrapper-сигнатуры (v0.3.0+)

```ts
// Domain data layer — НЕ компонент, plain frozen config object
// z убран из аргументов (BREAKING). Схема строится через глобал Zod (auto-import shared-zod).
Entity(() => {
  schema: ZodType;          // любая zod-схема (обычно Zod.array(Zod.object(...)))
  defaults?: TData;         // sample fixtures для разработки и тестов
}): { schema: ZodType; defaults?: TData }   // возвращает ровно то что вернула factory (frozen)

View<P>((Ui: ViewUi, props: P) => JSX.Element): Component<P>
  // ViewUi теперь содержит: Layout (Grid, Flex), Table, DataTable, Button, Input, Card, Field, 
  // Dropdown, DropdownMenu, DarkModeToggle, LayoutModeToggle, ThemePicker и другие primitives/composites
Widget<P>((Ui: WidgetUi, props: P) => JSX.Element): Component<P>
Page<P>((Ui: PageUi, props: P) => JSX.Element): Component<P>
  // PageUi содержит Layout (Grid, Flex, Matrix), а также Widget-доступные компоненты
// v2 (ADR 036): двухфазная форма. z убран из arg1; config вынесен в arg2.
// arg1 (bind) — module-load; arg2 (config) — объект ИЛИ (props)=>config, реактивен.
Shape(
  (ui: UiPathTracker) => ({
    schema: ZodType;          // → RowOf<S> для типизации arg2 и consumer-props
    as?: Component;           // контейнер/шаблон; несёт __tpl HKT-маркер
    item?: {                  // batch-элемент (nav-паттерн)
      use?: Component;        // use — не второй as
      props?: (it: Row) => Record<string, unknown>;  // row-типизирован через overloads
    };
  }),
  // arg2 необязателен. Row-тип вытекает из schema через IShapeWrapper-overloads.
  (props) => ({ defaults?, columns?, sorting?, ...extras }) // ИЛИ plain-объект
): Component<{
  data?: TData;        // overrides config.defaults
  as?: Component;      // overrides bind.as
  [extraKey: string]: unknown; // consumer extras win (переданы в шаблон)
}>
Controller((services: IServices) => IDefineStateSchema): Component
Feature((services: IServices) => IDefineStateSchema): Component
```

**Shape v2 BREAKING (ADR 036):** `z` убран из bind-аргумента (был `(z, ui)`, стал `(ui)`). Config вынесен в arg2 (`(props)=>config` | объект). `IShapeFactory` и `IShapeDefinition` помечены `@deprecated`. `IShapeTemplateProps`/`IShapeRender` — удалены в v0.4.0, остаются удалёнными. Старая форма `Shape((z, ui) => { ...extras })` не поддерживается — hard-switch. HKT-маркер (`__tpl`, `MarkerOf`, `ApplyRowFrom`, `RowOf`) — новый публичный API из `shape/types.ts`.

**Generic `<P extends Record<string, any>>`** на View/Widget/Page renderer'ах — для типизации props на call site (Shape `as`-pattern: template-View получает item-данные как props).

**Registries — глобалы** (доступны прямо из factory body):
- `Views` / `Widgets` / `Shapes` / `Controllers` / `Features` — через `Object.assign(globalThis, _registry)` в bootstrap.
- `Ui` — единственное что приходит **параметром**, потому что per-instance (UiProxy под текущий ControllerContext).

## Lifecycle flow

```
apps/<app>/src/pages/welcome.tsx                  ← Page((Ui) => <Ui.Layout.Matrix slots={...}>)
  └─ PageWrapper готовит pageUi = { Layout, Outlet, Animate }
       └─ ShapeUiContext.Provider value={pageUi}
            └─ Component(pageUi, wrapperProps)            ← factory вызвана, JSX из неё
                 └─ <Widgets.Auth.Login />                ← глобал, lazy()
                      └─ WidgetWrapper готовит baseUi = { ...Ui, Outlet }
                           └─ ShapeUiContext.Provider value={baseUi}
                                └─ Component(baseUi, wrapperProps)
                                     └─ <Features.Viewer.Auth>          ← глобал
                                          └─ createLogicWrapper готовит services
                                               └─ <Controllers.Universal.Form>
                                                    └─ createLogicWrapper готовит services
                                                         └─ ControllerContext.Provider
                                                              └─ <Ui.Card>
                                                                   └─ <Views.Forms.Field />   ← глобал
                                                                        └─ ViewWrapper:
                                                                             useCtx() → ControllerContext
                                                                             UiProxy(BaseUi, ctx, props)
                                                                             ShapeUiContext.Provider
                                                                             Component(proxiedUi, wrapperProps)
                                                                             ↓
                                                                             event-binding ✓
                                                                             meta-registration ✓
                                                                             store-styled class ✓
```

## UiProxy mechanic (engine/ui-proxy.tsx)

Policy **C — own meta opt-in**: побочные эффекты (registration, event-binding) активируются **только** на JSX-узлах с явным `meta={{...}}`. Структурные обёртки (Field, Card, Field.Label) проходят сквозным рендером.

Для элементов с `meta`:
- `id = createUniqueId()` (стабильный) + `createEffect` для re-register на изменение props + `onCleanup` для unregister
- автоподписка на 6 событий: `onClick`, `onInput`, `onChange`, `onBlur`, `onFocus`, `onKeyDown`
- дедупликация bubbling через event-marker `__capsule_<event>__`
- инжект реактивного `class` (с подмесом `store.styles[name]`), `name` (deriveName из tags), `type` (deriveInputType). **`disabled` НЕ инжектится** — убран авто-`disabled` из `store.loading` (был «магией»); теперь только `props.disabled` + адресный `store.patch([tags], { disabled })` через `store.props[id]` (mergeProps-источник). `store.loading` стал чистым loader-сигналом (см. gotcha #29)
- `target` собирается как `{ meta, dynamicMeta, key, modifiers, payload }`

### KIND_TAGS auto-inject (PR #167)

`wrapComponent` принимает 4-й опциональный аргумент `componentName?: string`. Top-level `UiProxy` getter пробрасывает `propName` как `componentName`. Внутри `ComponentWrapper` функция `getEffectiveMeta()` аппендит kind-tag из whitelist к user-tags (без дублирования):

```ts
const KIND_TAGS: Record<string, string> = {
  Input: 'input',
  Textarea: 'input',
  Select: 'input',
  Checkbox: 'input',
  Button: 'button',
};
```

Все 5 читателей `effectiveMeta` (`registerComponent`, `getTargetData` в event bindings, `class`/`name`/`type` геттеры) используют `getEffectiveMeta()` вместо `props.meta` напрямую.

Эффект: `<Input meta={{ tags: ['login'] }} />` достаточно. UiProxy сам добавит `'input'` → `store.pick(['@input'])` матчит после alias-expansion. Sub-components (`Card.Header`, `Field.Label`) НЕ получают kind-tag — `componentName` не пробрасывается через recursive proxy на sub-components (намеренно).

### store.updateComponent вместо store.update (PR #166)

Раньше при событии с `updateStore: true` UiProxy писал весь target в `ctx.store.update({ [id]: data })` (SET_DATA → `context.data[id]`). Теперь:

```ts
ctx.store.updateComponent({ [id]: { value: data.value, type: data.type } });
// UPDATE_COMPONENT → merge в context.components[id]
```

Полный `target` (8 полей: name/value/type/meta/dynamicMeta/payload/key/modifiers) **по-прежнему** идёт в `ctx.controller[name]` как аргумент. В store-payload — только runtime-mutable поля (value/type). Семантика разделения: `registerComponent` — единоразово на mount; `updateComponent` — runtime patches, мержится в существующий `components[id]`; `update`/SET_DATA — user API для `schema.context`, UiProxy её больше не использует. Подробнее — [[web-state]] + [[020-component-data-flow-split]].

## useEmit (engine/use-emit.ts) — ADR 032, фаза 1

Программный близнец DOM-dispatch'а UiProxy. Источник: `src/engine/use-emit.ts`, экспортируется из `wrappers/index.ts` → `src/index.ts`.

```ts
import { useEmit } from '@capsuletech/web-core';

// Внутри View/Widget рендерящегося в Controller-tree:
const emit = useEmit();
emit('onDrop', { payload: { nodeId: 'x' }, meta: { tags: ['canvas'] } });
// → ctx.controller['onDrop'](normalizedTarget, ctx.store.ctx)
// → ControllerProxy: states[cur].onDrop → top-level → next() автобаблинг
```

**Сигнатура:** `useEmit(): (eventName: string, target?: Partial<ITarget>) => unknown`

- `eventName: string` — любое имя (строгая типизация против schema-ключей — фазы 3-4 ADR 032, TODO в файле).
- `target?: Partial<ITarget>` — нормализуется через `normalizeTarget()`: `name` выводится из `meta.tags` через `deriveName`, `modifiers` не выставляется (нет DOM-события), `from` пробрасывается если задан.
- Возврат — то что вернул handler (включая Promise); async-reject не проглатывается.
- Вне Controller/Feature-scope бросает: `"useEmit must be used inside a Controller or Feature scope"`.

**Dispatch-путь идентичен UiProxy (`buildEventBindings`, строка 124 ui-proxy.tsx):**
`ctx.controller[eventName](normalizedTarget, ctx.store.ctx)`

ControllerProxy резолвит `states[currentState][name]` → top-level → `next()` автобаблинг. Новый механизм не вводится.

**Два сценария использования (ADR 032):**
- **Primary (meta-bound)** — package entry-point (`web-dnd/controllers` droppable) внутри сам зовёт `useEmit()`.emit; симметрично `<Input meta>`.
- **Escape (low-level)** — `const emit = useEmit(); emit('onSelect', { payload })` для полностью кастомных интеракций.

**Намеренное исключение из правила «engine/* не public»** (gotcha #9): единственный способ дать внешним пакетам доступ к dispatch-механизму без его дублирования. Ацикличный граф сохранён (пакеты → web-core, не наоборот). Контракт ограничен только `useEmit`; остальное engine остаётся internal.

## ControllerProxy mechanic (engine/controller-proxy.ts)

- Текущий стейт **читается из XState**: `state.value`. Собственного runtime нет.
- При вызове `controller.<method>(target, ctx)` ищет хэндлер: `schema.states[current][method]` → `schema[method]` (top-level) → `await next()` (автобабблинг).
- Передаёт в хэндлер API: `{ target, context, next, store, state }`.
- `state.set(name)` — `__GOTO_<name>__` в XState; `state.matches(name|name[])` — сверка.
- `next(payload)` — **прямой вызов** `parent.controller[name]`, не XState event-bus. Опционально ремапит имя через `overrides` prop на Controller-обёртке.

## Известные грабли

19. **`Entity` — единственный wrapper без Solid-компонента.** Все остальные wrappers (`View`, `Widget`, `Page`, `Controller`, `Feature`, `Shape`) возвращают `Component<P>`. `Entity` возвращает **frozen plain object** `{ schema, defaults? }`. HMRWrappingPlugin не трогает `entities/` файлы (нет `const X = Wrapper(...)` component pattern). UiProxy и ControllerProxy к Entity не применяются — это pure data layer. AutoImport делает `Entity` глобальным через `WRAPPER_NAMES` (owner-builders добавляет). Codegen `Entities.*` — через `ExportGeneratorPlugin` scan `entities/` (owner-builders добавляет). **BREAKING (ADR 036 / web-table-founding):** `z` убран из factory-аргумента. Старая форма `Entity((z) => ...)` не работает — factory теперь `() => ...`, Zod строится через глобал `Zod`.

20. **Типизация `Entities.*` глобала пока пуста.** `interface Entities {}` в `wrappers/interfaces.ts` — placeholder. Заполняется через codegen (ExportGeneratorPlugin scan `entities/` → `.capsule/@types/slots.d.ts`). До добавления owner-builders: `Entities.Users` будет `any`; после — `typeof import('@entities/users').default`.

1. **`createRoot` ≠ Solid `createRoot`.** Наш — render-фабрика (`render(Bootstrap, container)` + `data-theme` inject). Solid'ская — для реактивного scope без рендера. Часто путают. Источник: `src/create/createRoot.ts`.

2. **CSS удалён из пакета.** `createRoot` больше не делает `import './styles.css'`. Приложение само импортирует `.capsule/styles.css` (генерится `ScaffoldPlugin` из builders). Если CSS не применяется — смотри `bootstrap.tsx.template` в vite-builder scaffold.

3. **`Providers` — namespace, не named export.** `import { Providers } from '@capsuletech/web-core'; <Providers.BaseProviders>`. Расширяемая namespace для будущих `Providers.TestingProvider`. Не плющи в named.

4. **`Ui.Layout` — plain object**, не вызываемый компонент. `{ Grid, Flex, Matrix }` — три lazy-компонента. Источник: `src/ui-kit/imports.tsx:17`. В отличие от него, `Ui.Table` — вызываемый compound (`Object.assign(TableBase, { Header, Body, Row, Head, Cell })`), доступен в `ViewUi` и `WidgetUi`. `Ui.DataTable` — простой callable (без sub-components), доступен в `ViewUi` и `WidgetUi`. Generic `<TData>` — TS инферирует тип строки из `data`/`columns` props. Subpath: `@capsuletech/web-ui/dataTable`. **Layout subset для View:** ViewUiRaw содержит `Layout: Pick<typeof Layout, 'Grid' | 'Flex'>` (Matrix остаётся Widget/Page-only, PR #169). `Ui.Dropdown` — compound из @kobalte/core (семейство Sub-компонентов, keyboard-nav, ARIA, Portal mounting, PR #173/#174). `Ui.DropdownMenu` — higher-level composite с discriminated union API для declarative menu (PR #175). `Ui.DarkModeToggle`, `Ui.LayoutModeToggle`, `Ui.ThemePicker` — composites из web-ui (переехали из web-style) с `layoutMode='edit'`/`'view'` поддержкой (PR #176/#177). `Ui.ThemeSwitcher` удалён (BREAKING, PR #176).

5. **Все `Ui.*` — lazy через `createLazy`.** Обёртка над `lazy(() => import(...).then(m => ({ default: m[name] })))`. Нужен `<Suspense>` вокруг дерева. `createRoot` оборачивает в Suspense автоматически.

6. **UiProxy policy C — own meta opt-in.** Побочные эффекты только если на JSX-узле явно `meta={{...}}`. Структурные обёртки (Field, Card) проходят сквозным рендером. Изменение этой политики — массовый impact, нужен ADR.

7. **`EVENT_HANDLERS` — захардкожены 6 событий.** `onClick`, `onInput`, `onChange`, `onBlur`, `onFocus`, `onKeyDown`. Добавление нового (`onScroll`) — правка `engine/ui-proxy.tsx > EVENT_HANDLERS` + опционально `engine/derivation.ts > TAG_TO_INPUT_TYPE`. См. ADR 009.

8. **`next(payload)` — прямой вызов**, не XState event. `parent.controller[name]` через `await`. Не переписывай на event-bus без ADR (см. ADR 008 — гибридная FSM-схема).

9. **`engine/*` — НЕ public.** `index.ts` не экспортирует ничего из `engine/`. Если что-то из engine нужно во внешнем коде — симптом, документируй причину перед public-экспортом.

16. **`IUiMetaProps` (`meta`/`payload`/`dynamicMeta`/`modifiers`) — UiProxy-layer, не web-ui.** `<Ui.Input meta={{tags:['email']}} />` типизируется через `WithMetaProps<ViewUiRaw>` в `wrappers/interfaces.ts`. UiProxy перехватывает эти props в `wrapComponent` и не прокидывает их в реальный DOM-компонент. web-ui компоненты их не знают — типы расширяются здесь (web-core), не там. Источник: `src/wrappers/interfaces.ts`.

17. **Compound sub-components (`Card.Header`, `Field.Label`, …) сохраняются через `StaticProps<T>`.** `WithMetaProps` для callable `T[K]` возвращает `((props: P & IUiMetaProps) => R) & WithMetaProps<StaticProps<T[K]>>`. `StaticProps<T>` — `{ [K in keyof T as K extends keyof Function ? never : K]: T[K] }` — отфильтровывает `name/length/bind/call/apply/prototype` из Function.prototype. Рекурсия через `WithMetaProps<StaticProps<...>>` гарантирует что `Card.Header` тоже принимает `meta`. `Layout` (plain object) идёт через `extends object` ветку — не затронут. Источник: `src/wrappers/interfaces.ts` (`StaticProps` + `WithMetaProps`). `Ui.Navigation` удалён (2026-05-22, primitive deleted from web-ui).

10. **8 workspace deps.** `web-core` зависит от `web-profiler`, `web-router`, `web-state`, `web-ui`, `web-query`, `shared-zod`, `vite-builder`, `web-style`. При изменении контрактов в любом из них — координируй с owner'ом.

11. **`IBaseStateSchema` в `web-state`.** `IDefineStateSchema` в `wrappers/interfaces.ts` расширяет `IBaseStateSchema` из `web-state` (Phase F unification). Не инвертируй направление зависимости.

12. **`ShapeUiContext` несёт только `Ui`** (после revert PR #114 в commit 477b0fb). Раньше был combined `{ ...Ui, Views }` — теперь Shape берёт View-templates через global `Views.X.Y` в `as`, не через `ui.Views.X.Y` path-tracker.

18. **Shape v2 — двухфазная форма, hard-switch (ADR 036).** Старая форма `Shape((z, ui) => ({ schema, as, ...extras }))` удалена. Новая: `Shape((ui)=>({schema,as,item?}), (props)=>({...config}))`. `z` убран из bind; config вынесен в arg2. `item: { use, props }` — batch-элемент (use, не второй as). HKT-маркер `__tpl` на шаблоне даёт row-типизацию без дубля. Экспортируются `MarkerOf`, `ApplyRow`, `ApplyRowFrom`, `RowOf`, `IShapeBind`, `IShapeConfigArg` из `shape/index.ts`. `IShapeFactory`/`IShapeDefinition` — `@deprecated`, удалятся после миграции apps. Реактивность arg2-функции: `mergeProps(configSource)` — Solid сам оборачивает функцию в `createMemo`.

13. **Generic `<P>` на wrapper'ах требует `extends Record<string, any>`** — чтобы соответствовать Solid `Component<P>`. Default `Record<string, any>` сохраняет backward-compat для factory без `<P>`. Не упрощай до `<P = unknown>` — Solid Component откажет.

14. **`Object.assign(globalThis, _registry)` ломает tree-shaking** для registry. Поэтому `wrappers.ts` использует `lazy()` для каждого компонента — это обходит проблему через code-splitting. Eager-import всех registries → fat initial bundle. См. session note про lazy registry в memory.

15. **`HMRWrappingPlugin` ожидает factory-call в default export.** `const X = View(...)` + `export default X` — обязательный паттерн. Плагин превращает `View(...)` в `(props) => View(...)(props)` чтобы HMR не сбрасывал state. Если `export default` отсутствует — HMR продолжит работать (плагин добавит), но TS не увидит default → сломается типизация slot-кодгена.

21. **UiProxy KIND_TAGS auto-inject — module-private whitelist.** `KIND_TAGS` в `engine/ui-proxy.tsx` — закрытый объект, не экспортируется. Расширять точечно: каждый новый entry означает что apps могут опустить тег и он будет добавлен автоматически. Switch/Radio пока не добавлены (не используются в ewc). Sub-components (`Card.Header`, `Field.Label`) не затрагиваются: `componentName` forward'ится только из top-level `UiProxy` getter'а, через recursive proxy на sub-components — не пробрасывается (намеренно).

22. **`store.update` (SET_DATA) больше не вызывается из UiProxy** (PR #166). UiProxy при событии с `updateStore: true` использует только `store.updateComponent` (UPDATE_COMPONENT → `context.components[id]`). `store.update` остаётся публичным API для user-land state (`schema.context`), но UiProxy его не трогает. Если увидишь `store.update` вызовы в engine-коде — это регрессия, смотри ADR [[020-component-data-flow-split]].

23. **AutoImport `dirs:` убран** (PR #165, ADR [[019-autoimport-dirs-drop]]). Registry-объекты (`Widgets`/`Views`/`Shapes`/...) доступны как глобалы **только** через `Object.assign(globalThis, _registry)` в bootstrap. TS-типы — из `slots.d.ts` (ExportGeneratorPlugin). Строка `dirs: [join(capsuleRoot, 'registry')]` в `capsuleConfig.ts` удалена — она экспонировала named exports из `.capsule/registry/*.ts` как глобалы и вызывала self-import TDZ цикл через `createApi.ts`.

24. **ViewUi содержит Grid + Flex, но не Matrix** (PR #169). Matrix дорогая по весу (DnD, resize) — остаётся Widget/Page-only. View может использовать простые layout'ы для stateless композиции.

25. **Dropdown sub-components через `createLazy`** (PR #173/#174). `Ui.Dropdown` инжектируется с named re-exports: `DropdownTrigger`, `DropdownContent`, `DropdownItem`, … — это позволяет `createLazy` резолвить их как глобалы. Compound API внутри: `<Dropdown.Trigger>` / `<Dropdown.Content>` работают через Object.assign + context. Kobalte-зависимости (Floating UI, Portal) вынесены в web-ui.

30. **`Tooltip` — compound в `Ui` namespace** (2026-06-03). `Ui.Tooltip` = lazy root + `Ui.Tooltip.Trigger` / `Ui.Tooltip.Content` / `Ui.Tooltip.Arrow`. Named re-exports в `@capsuletech/web-ui/tooltip`: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipArrow`. По точному паттерну Dropdown. Доступен в `ViewUi` и `WidgetUi`. Cursor-tracking включён по умолчанию (panel появляется у курсора, не у края элемента — идеально для крупных trigger'ов). Отключить: `cursorTracking={false}`. Arrow опционален — помещается внутрь `Tooltip.Content`.

26. **LayoutMode gating для Matrix** (PR #172). `layoutMode='view'` (default) → DnD/resize/affordances off. `layoutMode='edit'` → всё on. Flex также получил `handleDisabled?: boolean` для гейтинга resize-handles. `store` имеет signal `useLayoutMode()` из web-style + setter для toggle. App управляет режимом через `store.setLayoutMode('edit')`.

27. **Switcher state vs UI split** (PR #176). `web-style` теперь содержит **только** state-stores: `useTheme()`, `useDarkMode()`, `useLayoutMode()` (signal accessors) + `setTheme`, `setDarkMode`, `toggleDarkMode`, `setLayoutMode`, `toggleLayoutMode` + `DISCOVERED_THEMES` и `DENSITY_PRESETS`. Visual компоненты (`DarkModeToggle`, `LayoutModeToggle`, `ThemePicker`) переехали в `web-ui` (composites). `Ui.ThemeSwitcher` **удалён из core** — это BREAKING; используй `Ui.DarkModeToggle` вместо. `Ui.LayoutModeToggle` и `Ui.ThemePicker` — новые в WidgetUi/ViewUi.

28. **ThemePicker mode='sub' для nested submenus** (PR #177). Стандартный ThemePicker → `mode='standalone'` (own Dropdown root). Для встраивания в существующий Dropdown используй `mode='sub'` (генерирует Dropdown.Sub/SubTrigger/SubContent вместо top-level Dropdown).

29. **Widget loader-колбэк + убран авто-`disabled`** (loader mechanism). `Widget` теперь принимает опциональный **2-й колбэк** — лоадер: `Widget(content, loader?)`, где `content = (Ui, store, props) => JSX` (как было), `loader = (Ui, props) => JSX` (stateless, БЕЗ `store` — только presentation, не зависит от данных). Рантайм в `wrappers/widget.tsx`: `<Show when={!(loader && store.loading)} fallback={loader(Ui, props)}>{content(...)}</Show>` — неактивная ветка `<Show>` **не монтируется**, поэтому тяжёлый контент (MapLibre-карта, виртуал-таблица) не инстанцируется, пока показан лоадер — это и убирает flicker при навигации. Лоадер-`Ui` содержит `Ui.Skeleton` / `Ui.Spinner` (lazy-регистрация в `ui-kit/imports.tsx`, типы в `ViewUiRaw`/`WidgetUiRaw`; сам `Skeleton` в web-ui обёрнут вокруг `@kobalte/core` Skeleton). Логика (Feature/Controller) дёргает ТОЛЬКО `store.setLoading(true/false)` (bracket вокруг async, `false` в `finally`) — про вид лоадера ничего не знает; одна Feature может оборачивать и таблицу, и карту, и каждый Widget подаёт свой скелетон. **Связанный breaking:** авто-`disabled` из `store.loading` **убран** из UiProxy (был «магией» — дизейблил инпуты по глобальному флагу). Теперь `store.loading` это чистый loader-сигнал без скрытых side-effect'ов; блокировка инпутов — explicit и адресно через `store.patch([tags], { disabled: true })`. См. [[widget-loader]], [[ui-proxy]], [[lifecycle]]. Эталон: `apps/ewc` (`features/incidents.ts` + `widgets/tables/incidents.tsx` + `widgets/maps/world.tsx`).

31. **`useEmit` — намеренное исключение из «engine/* не public»** (ADR 032). `src/engine/use-emit.ts` экспортируется в публичный barrel — единственный способ дать внешним пакетам (`web-dnd/controllers`, `web-renderer/controllers`) доступ к dispatch-механизму без дублирования engine-логики. Контракт: только `useEmit` + `normalizeTarget` (последняя нужна для тестов и package entry-points). Если появляется соблазн добавить туда другие engine-exports — остановись и задай вопрос: это симптом, что нужен другой механизм или ADR. `normalizeTarget` не экспортируется из barrel (только из файла), она internal-helper для пакетов, работающих через subpath.

## Что менять когда

| Хочу… | Куда лезть |
|---|---|
| Добавить новый Entity (domain data) | `apps/<app>/src/entities/<name>.ts` → `Entity(() => ({ schema: Zod.array(...), defaults? }))` + `export default`. Zod доступен как глобал через auto-import (@capsuletech/shared-zod). Codegen подхватит в `Entities.*`. `z.infer<typeof Entities.X.schema>` для типа. |
| Расширить IEntityDefinition (validators, relations) | `packages/web/core/src/wrappers/entity/types.ts` → добавить поле в `IEntityDefinition`. При breaking change — bump major. |
| Добавить новый primitive в `Ui` (например `Dialog`) | `src/ui-kit/imports.tsx` (lazy + `Object.assign` для compound) + тип в `ViewUiRaw`/`WidgetUiRaw` в `src/wrappers/interfaces.ts` + характеризационные тесты в `src/wrappers/__tests__/ui-meta-props.test.tsx`. Если primitive из другого пакета (не web-ui), проверь наличие subpath в его `package.json exports` и `tsconfig.base.json paths`. Composites (Dropdown, DropdownMenu, etc.) импортируются из web-ui (иногда с sub-components как `createLazy` named re-exports для compat). |
| Добавить Layout component в View (например новый Matrix) | Layout.Grid и Layout.Flex уже доступны в ViewUi (PR #169 — subset). Matrix остаётся Widget/Page-only (дорогая по весу). Для добавления новой layout-варианты в View — определить в web-ui, затем добавить в `ViewUiRaw` тип и `src/ui-kit/imports.tsx`. |
| Добавить новый wrapper-слой (например `Adapter`) | `WRAPPER_NAMES` в `packages/builders/vite/src/plugins/constants.ts` (SSOT для AutoImport, делает owner-builders) + новый wrapper в `packages/web/core/src/wrappers/` + публичный API в `index.ts` + AI-anchor entry |
| Добавить новое поле в `ITarget` (например `meta.section`) | `packages/web/core/src/wrappers/interfaces.ts > ITarget` + сборщик `target` в `engine/ui-proxy.tsx` + опционально `engine/derivation.ts` если выводится из tags. Tests! |
| Добавить новый handler-event (`onScroll`) | `engine/ui-proxy.tsx > EVENT_HANDLERS` + (опц) `engine/derivation.ts > TAG_TO_INPUT_TYPE`. ADR 009. Tests! |
| Расширить `useEmit` (строгая типизация имён событий) | `engine/use-emit.ts` — generic-параметр `<TSchema extends IDefineStateSchema>` на `emit`. Фазы 3-4 ADR 032: когда пакеты экспортируют Controller'ы из `/controllers`, тип `eventName` можно сузить до `keyof TSchema['states'][string]`. TODO в файле. |
| Добавить новый primitive в KIND_TAGS auto-inject (например `Switch`) | `engine/ui-proxy.tsx > KIND_TAGS` + характеризационный тест в `engine/__tests__/ui-proxy.test.tsx`. Сам primitive должен быть добавлен в `@capsuletech/web-ui` ДО этого. Sub-components не трогать — они обходятся через recursive proxy без `componentName`. |
| Изменить wrapper-сигнатуру | `packages/web/core/src/wrappers/<wrapper>.tsx` + `interfaces.ts` (типы) + CLI templates (`packages/cli/src/templates/`) + `.claude/agents/{view,widget,page,shape}.md` + `CLAUDE.md` table + characterization tests. BREAKING → bump major. |
| Расширить ShapeUiContext | `packages/web/core/src/wrappers/shape/context.tsx`. **Не плющить registries в Ui** — это уже было (PR #114, реверт). Если нужен новый namespace — отдельный Context. |
| Добавить новый Provider в BaseProviders | `packages/web/core/src/providers/base.tsx` + публичный API из `web-core/providers`. Координируй с owner'ом нового пакета. |
| SSR-готовность | `createRoot` сейчас CSR-only (`document` в hot path). Нужна `hydrate`-ветка. Backlog: P3 в OWNERSHIP.md. |
| Devtools-integration | Exporter для `@capsuletech/web-profiler` — backlog P3. |
| TypingProvider для services | Generic-context для типизации `services` через app-level config. Backlog P3. |

## Cross-links

- OWNERSHIP: [packages/web/core/OWNERSHIP.md](../../packages/web/core/OWNERSHIP.md)
- ADRs: [[001-xstate-only-fsm]], [[002-logic-wrapper-unification]], [[007-uiproxy-cleanup]], [[008-hybrid-fsm-with-direct-next]], [[009-event-handlers-hardcoded]], [[019-autoimport-dirs-drop]], [[020-component-data-flow-split]], [[021-uiproxy-auto-kind-tags]]
- Связанные пакеты: [[web-state]] (Bridge, IBaseStateSchema), [[web-router]] (router в services), [[web-ui]] (Ui-kit), [[web-style]] (theme tokens), [[web-profiler]] (VitalsMonitoring)
- Builders: [[builders|builders.md]] — WRAPPER_NAMES, HMRWrappingPlugin, RouterPlugin, ExportGeneratorPlugin
- Release: web-core в группе `web_base` (fixed-versioning, tag `web@{version}`)

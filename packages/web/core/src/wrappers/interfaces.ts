/**
 * Public types of `@capsuletech/web-core` wrappers.
 *
 * Слиты в один файл из `ui/interfaces.ts` + `logic/interfaces.ts` после Phase E
 * рестракта — два искусственных кластера wrappers/ui/ + wrappers/logic/ убраны,
 * соответственно их type-партиционирование тоже теряло смысл. Внутренние
 * engine-типы (`ICtx`, `IControllerHandle`) живут в `engine/ctx.ts`.
 */

import type { Utils as UtilsNamespace } from '@capsuletech/shared-utils';
import type { Zod as ZodNamespace } from '@capsuletech/shared-zod';
import type { ICapsuleRouter } from '@capsuletech/web-router';
import type { IBaseStateSchema, IBridge, IMachineContext } from '@capsuletech/web-state';
import type { Button, Card, Field, Group, Input, Layout, List } from '@capsuletech/web-ui';
import type { Dropdown } from '@capsuletech/web-ui/dropdown';
import type { DropdownMenu } from '@capsuletech/web-ui/dropdownMenu';
import type { PreviewCard } from '@capsuletech/web-ui/previewCard';
import type { Select } from '@capsuletech/web-ui/select';
import type { Skeleton } from '@capsuletech/web-ui/skeleton';
import type { Spinner } from '@capsuletech/web-ui/spinner';
import type { Textarea } from '@capsuletech/web-ui/textarea';
import type { Tooltip } from '@capsuletech/web-ui/tooltip';
import type { Typography } from '@capsuletech/web-ui/typography';
import type { Link } from '@tanstack/solid-router';
import type {
  Component,
  For,
  Index,
  JSX,
  JSXElement,
  Match,
  ParentComponent,
  Show,
  Switch,
} from 'solid-js';
import type { Dynamic } from 'solid-js/web';

// -----------------------------------------------------------------------------
// UiProxy meta-props: дополнительные props, которые UiProxy перехватывает
// и НЕ прокидывает в реальный web-ui компонент. Добавляются к каждому
// компоненту в Ui-namespace на уровне типов — так TS принимает
// `<Ui.Input meta={{tags: ['email']}} />` без TS2322.
//
// Why here (web-core) а не в web-ui:
//   web-ui не знает ничего про UiProxy/meta-registration. Эти props существуют
//   только в HCA-контексте, когда View рендерится внутри Controller-tree.
//   web-ui компоненты — чистые DOM/style primitives, не HCA-aware.
// -----------------------------------------------------------------------------

/** Meta-теги для идентификации элемента в Controller store. */
export interface ITagMeta {
  tags?: string[];
  [k: string]: any;
}

/**
 * Дополнительные props, принимаемые UiProxy-обёрткой для каждого Ui-компонента.
 * Runtime: UiProxy их перехватывает через `splitProps` / читает напрямую —
 * в итоговый web-ui компонент они НЕ попадают (DOM их не увидит).
 *
 * @see engine/ui-proxy.tsx — `wrapComponent`, политика C (own meta opt-in).
 */
export interface IUiMetaProps {
  /**
   * Идентификация элемента (теги-роли). Активирует opt-in регистрацию
   * в Controller store + event-binding для 6 событий.
   * Без `meta` — сквозной рендер без побочных эффектов.
   */
  meta?: ITagMeta;
  /**
   * Immutable JSX-declared payload от автора View:
   * `<Ui.Nav meta={{tags:['nav']}} payload={{href:'/home'}}>` → `target.payload.href`.
   * Не меняется при bubble через `next()` — каждый уровень цепочки видит
   * один и тот же payload, заданный в JSX. Для трансформации между уровнями
   * используй `next.with(arg)` → `target.from`.
   */
  payload?: unknown;
  /**
   * Дополнительный meta из outer View-prop (Widget/Shape передаёт contextual
   * теги). Не активирует регистрацию — только дополняет target при dispatch'е.
   */
  dynamicMeta?: ITagMeta;
  /**
   * Keyboard modifiers для `onKeyDown`. Заполняется UiProxy автоматически из
   * KeyboardEvent; при явном указании — переопределяет.
   */
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
}

/**
 * Вспомогательный тип: из callable-значения извлекает только «прикреплённые»
 * статические свойства — те ключи `T`, которые не входят в прототип `Function`
 * (`name`, `length`, `call`, `apply`, `bind`, `prototype`, `toString` и т.д.).
 *
 * Используется внутри `WithMetaProps` чтобы сохранить `Card.Header`, `Field.Label`,
 * `Navigation.Item` и т.п. после augmentation callable-сигнатуры с `IUiMetaProps`.
 *
 * Пример: `typeof Card` = `Component<ICardProps> & { Header: ...; Title: ...; ... }`
 * После применения — intersection callable + mapped static props.
 */
type StaticProps<T> = {
  // biome-ignore lint/complexity/noBannedTypes: intentional use of keyof Function to filter function-prototype keys in mapped type
  [K in keyof T as K extends keyof Function ? never : K]: T[K];
};

/**
 * Применяет `IUiMetaProps` к каждому компоненту в Ui-namespace рекурсивно.
 *
 * Правила маппинга:
 *  - Callable `(props: P) => R` без attached statics → `(props: P & IUiMetaProps) => R`
 *  - Callable `(props: P) => R` с attached statics (Card, Field) →
 *    `((props: P & IUiMetaProps) => R) & WithMetaProps<StaticProps<T[K]>>`
 *    Статические sub-компоненты тоже рекурсивно augment'ятся `IUiMetaProps`.
 *  - Plain object (Layout namespace `{ Grid, Flex }`) → рекурсивный
 *    `WithMetaProps<T[K]>`
 *  - Всё остальное (Outlet, примитивы) → без изменений
 *
 * Этот тип **намеренно не экспортируется** как публичный API — он используется
 * только для типизации аргументов `IViewRenderer`/`IWidgetRenderer`/`IPageRenderer`.
 * Пользователь видит расширенные типы только через autocomplete на `Ui.*`.
 */
type WithMetaProps<T> = {
  [K in keyof T]: T[K] extends (props: infer P) => infer R
    ? ((props: P & IUiMetaProps) => R) & WithMetaProps<StaticProps<T[K]>>
    : T[K] extends object
      ? WithMetaProps<T[K]>
      : T[K];
};

// -----------------------------------------------------------------------------
// UI-вкус: что приходит wrapper'ам в первый позиционный аргумент.
// -----------------------------------------------------------------------------

/**
 * Solid control-flow primitives exposed as `Ui.Flow.*` inside View/Widget/Page
 * factories. These are raw Solid components — UiProxy returns the Flow namespace
 * verbatim (never wrapped). See `RAW_PASSTHROUGH_KEYS` in engine/ui-proxy.tsx.
 *
 * Usage: `<Ui.Flow.For each={items()}>{(item) => <.../>}</Ui.Flow.For>`
 */
type FlowNamespace = {
  For: typeof For;
  Show: typeof Show;
  Switch: typeof Switch;
  Match: typeof Match;
  Index: typeof Index;
  Dynamic: typeof Dynamic;
};

/** Layout-subset: Grid + Flex. Matrix переехал в @capsuletech/web-shell (ADR 033), не в Ui-namespace. */
type ViewLayoutSubset = Pick<typeof Layout, 'Grid' | 'Flex'>;

/**
 * Примитивы, валидные в **любом** слое (View / Widget / Page).
 * Рантайм всех трёх wrapper'ов спредит полный BaseUi — ограничение только типовое.
 * `Flow` сюда не входит: он добавляется отдельно verbatim-интерсекцией
 * в финальных `ViewUi`/`WidgetUi`/`PageUi`, чтобы `WithMetaProps` не трогал
 * сигнатуры Solid control-flow компонентов.
 */
type UniversalUiRaw = {
  /** Grid + Flex для internal layout. Matrix переехал в @capsuletech/web-shell. */
  Layout: ViewLayoutSubset;
  Typography: typeof Typography;
};

type ViewUiRaw = UniversalUiRaw & {
  Field: typeof Field;
  Button: typeof Button;
  Group: typeof Group;
  Input: typeof Input;
  List: typeof List;
  PreviewCard: typeof PreviewCard;
  Skeleton: typeof Skeleton;
  Spinner: typeof Spinner;
  Dropdown: typeof Dropdown;
  DropdownMenu: typeof DropdownMenu;
  Tooltip: typeof Tooltip;
  Select: typeof Select;
  Textarea: typeof Textarea;
  Card: typeof Card;
  Link: typeof Link;
  /**
   * Solid control-flow primitives. Raw — NOT UiProxy-wrapped.
   * `<Ui.Flow.For each={...}>{(x) => ...}</Ui.Flow.For>`
   */
  Flow: FlowNamespace;
};

/**
 * Сырой (без WithMetaProps) набор UI-примитивов View-уровня.
 * Экспортируется для Shape: `IShapeUi` производится из этого типа,
 * чтобы `ui.PreviewCard`, `ui.Group` и т.д. несли реальные типы
 * компонентов (включая phantom `__tpl`-маркеры) без hardcode-списка.
 *
 * Компоненты в `IShapeUi` НЕ оборачиваются `WithMetaProps` (meta-opt-in
 * актуален только в View-дереве под Controller; в Shape factory
 * выбирается только `as`-шаблон, а не рендерится JSX).
 *
 * При добавлении нового компонента в `ViewUiRaw` — `IShapeUi` автоматически
 * подхватит его без каких-либо ручных правок в `shape/types.ts`.
 */
export type IViewUiRaw = ViewUiRaw;

type Outlet = () => JSXElement;

type WidgetUiRaw = UniversalUiRaw & {
  Button: typeof Button;
  Card: typeof Card;
  Outlet: Outlet;
  PreviewCard: typeof PreviewCard;
  Skeleton: typeof Skeleton;
  Spinner: typeof Spinner;
  Dropdown: typeof Dropdown;
  DropdownMenu: typeof DropdownMenu;
  Tooltip: typeof Tooltip;
  Select: typeof Select;
  Textarea: typeof Textarea;
  /**
   * Solid control-flow primitives. Raw — NOT UiProxy-wrapped.
   * `<Ui.Flow.For each={...}>{(x) => ...}</Ui.Flow.For>`
   */
  Flow: FlowNamespace;
};

type PageUiRaw = UniversalUiRaw & {
  Outlet: Outlet;
  /**
   * Solid control-flow primitives. Raw — NOT UiProxy-wrapped.
   * `<Ui.Flow.For each={...}>{(x) => ...}</Ui.Flow.For>`
   */
  Flow: FlowNamespace;
};

/**
 * `WithMetaProps` recurses into every object-valued key. `Flow` must stay raw
 * (Solid's For/Show/Switch/Match/Index/Dynamic must not have IUiMetaProps added
 * to their props — it would break their render-prop signatures). We exclude it
 * from the mapped type and re-add it verbatim via intersection.
 */
/** Ui namespace доступный внутри View factory — все компоненты принимают IUiMetaProps. */
export type ViewUi = WithMetaProps<Omit<ViewUiRaw, 'Flow'>> & { Flow: FlowNamespace };
/** Ui namespace доступный внутри Widget factory — все компоненты принимают IUiMetaProps. */
export type WidgetUi = WithMetaProps<Omit<WidgetUiRaw, 'Flow'>> & { Flow: FlowNamespace };
/** Ui namespace доступный внутри Page factory — все компоненты принимают IUiMetaProps. */
export type PageUi = WithMetaProps<Omit<PageUiRaw, 'Flow'>> & { Flow: FlowNamespace };

/**
 * Глобальные slot-реестры. Заполняются codegen'ом в
 * `.capsule/@types/slots.d.ts` (ExportGeneratorPlugin). Здесь — пустые
 * fallback-интерфейсы; через interface merging они расширяются user-кодом.
 *
 * Используем `interface` (а не `type X = ...` через conditional), потому что:
 *  - interface merging с пустым fallback не порождает конфликта свойств;
 *  - имя интерфейса сохраняется в IDE-tooltip без раскрытия в полную структуру.
 */
declare global {
  interface Widgets {}
  /**
   * Placeholder для будущего domain data layer (User, Product — zod schema + meta).
   * Не используется wrappers'ами — зарезервировано под domain-entities.
   * UI JSX-leaf переехал в Views.
   */
  interface Entities {}
  /** UI JSX-leaf реестр (бывший Entities). Заполняется codegen'ом. */
  interface Views {}
  interface Controllers {}
  interface Features {}
  interface Shapes {}
  // CapsuleApi живёт в @capsuletech/web-query/createApi.ts — родной дом
  // (это типизация getApiClient). web-core видит её через interface-merging,
  // потому что зависит от web-query (для value-import getApiClient).

  /**
   * Извлекает `TCtx` из phantom-поля `__ctx` компонента Controller/Feature.
   *
   * ```ts
   * type ICtx = CtxOf<typeof Features.Incidents>;  // → IIncidentsCtx
   * ```
   *
   * Возвращает `never` если `F` не несёт `__ctx` (например View/Widget без Feature-parent).
   */
  type CtxOf<F> = F extends { readonly __ctx?: infer C } ? C : never;

  /**
   * Извлекает event-map из phantom-поля `__events` пакетного Controller/Feature-компонента.
   *
   * Пакетные компоненты (из `@capsuletech/web-shell`, `@capsuletech/web-dnd` и т.д.)
   * несут `readonly __events?: TEvents` на своём типе. `EventsOf` позволяет
   * получить этот map и передать его в `Feature<EventsOf<typeof Shell.Matrix>>(...)`.
   *
   * ```ts
   * // В app-Feature, адаптирующей пакетный Controller:
   * const LayoutFeature = Feature<EventsOf<typeof Shell.Matrix>, ILayoutCtx>((s) => ({
   *   context: { saving: false } as ILayoutCtx,
   *   onLayoutChange({ target }) {
   *     // target.payload: { id: string; kind: 'swap' | 'resize' } | undefined  ← типизировано
   *   },
   * }));
   * ```
   *
   * Возвращает `never` если компонент не несёт `__events` (plain компоненты без пакетного контракта).
   */
  type EventsOf<C> = C extends { readonly __events?: infer E } ? E : never;

  /**
   * Типизированный `IBridge` для конкретного Controller/Feature.
   * Оверрайдит `ctx` так, что `store.ctx.data` имеет тип `CtxOf<F>`.
   *
   * ```ts
   * Widget((Ui, store: StoreOf<typeof Features.Incidents>) => {
   *   store.ctx.data;  // → IIncidentsCtx
   * });
   * ```
   *
   * Backward-compat: если `Widget((Ui, store) => ...)` без аннотации —
   * `store` остаётся `IBridge | undefined`.
   */
  type StoreOf<F> = Omit<IBridge, 'ctx'> & { readonly ctx: IMachineContext<CtxOf<F>> };
}

/**
 * View: stateless UI. Позиционные аргументы:
 * 1. UI-примитивы view-уровня (Field, Button, Input, List, Navigation).
 * 2. props — внешние props, переданные в компонент-обёртку (опционально).
 *    Используется для «generic View template» паттерна: когда View рендерится
 *    через `<Dynamic component={Template} {...tplProps} />` (например внутри
 *    Shape `as`), item-данные (label, type, name, tags) приходят сюда.
 *    Если factory подписана без 2-го аргумента — backward-compat гарантирован
 *    (лишний аргумент JS просто игнорирует).
 *
 * Registries (Views/Shapes/Controllers/Features) доступны как глобалы через
 * `Object.assign(globalThis, _registry)` в bootstrap. Не нужны как args.
 */
export type IViewRenderer<P extends Record<string, any> = Record<string, any>> = (
  ui: ViewUi,
  props: P,
) => JSX.Element;

/**
 * IViewWrapper: `View(factory)` → `Component<P>`.
 *
 * Generic над `P` позволяет типизировать props на call site:
 *   `const Field = View<FieldTplProps>((ui, props) => ...)`
 * Без generic — `P` инферируется как `Record<string, any>`, что backward-совместимо
 * с существующими factory'ями `(ui) => JSX` (лишний arg JS игнорирует).
 * Constraint `P extends Record<string, any>` нужен чтобы соответствовать
 * `Component<P>` от Solid.
 */
export type IViewWrapper = <P extends Record<string, any> = Record<string, any>>(
  component: IViewRenderer<P>,
) => Component<P>;

/**
 * Widget: композиция всего что ниже. Позиционные аргументы:
 * 1. UI-примитивы widget-уровня.
 * 2. store — реактивный IBridge из ближайшего родительского Controller/Feature.
 *    `undefined` когда Widget рендерится вне Controller-tree (допустимый случай —
 *    например, standalone-Storybook или top-level Page без логического родителя).
 * 3. props — внешние props (опционально).
 *
 * Решение A1: store поступает только через composition layer (Widget/Page),
 * не прямо в View/Shape — View остаётся строго props-only.
 *
 * Registries (Views/Features/Controllers) доступны как глобалы через
 * `Object.assign(globalThis, _registry)` в bootstrap. Не нужны как args.
 */
/**
 * Маркер: «нет явного источника» — дефолтный F в Widget/Page generic.
 * Отдельный номинальный тип, чтобы не конфликтовать с реальными Feature/Controller.
 * @internal
 */
declare const _noSource: unique symbol;
/** @internal */
type DefaultFeatureSource = typeof _noSource;

/**
 * Разрешает тип store по явному источнику `F`:
 *  - `F = DefaultFeatureSource` (дефолт, нет `<F>`) → `IBridge | undefined`
 *  - любой Controller/Feature-тип (несёт phantom `__ctx`) → `StoreOf<F>`
 *
 * Благодаря этому:
 *  - `Widget((Ui, store) => ...)` — `store: IBridge | undefined` (backward-compat)
 *  - `Widget<typeof Features.X>((Ui, store) => ...)` — `store: StoreOf<typeof Features.X>`
 */
type WidgetStore<F> = F extends DefaultFeatureSource ? IBridge | undefined : StoreOf<F>;

/**
 * Widget render-function.
 *
 * Generic `S` — тип store; по умолчанию выводится из `F` через `WidgetStore<F>`:
 *  - без явного `<F>`: `S = IBridge | undefined` (backward-compat);
 *  - `Widget<typeof Features.X>(...)`: `S = StoreOf<typeof Features.X>` — выводится автоматически;
 *  - inline-аннотация `store: StoreOf<typeof Features.X>`: `S` инферируется из аннотации
 *    (второй generic), `F` остаётся `DefaultFeatureSource`. Оба стиля компилируются.
 */
export type IWidgetRenderer<
  P extends Record<string, any> = Record<string, any>,
  S = IBridge | undefined,
> = (ui: WidgetUi, store: S, props: P) => JSX.Element;

/**
 * Loader render-function: same shape as IViewRenderer — (Ui, props) only, no store.
 * The loader is stateless (no access to IBridge) — it cannot depend on data, only Ui primitives.
 * When `store.loading === true` AND a Loader is provided, Widget renders Loader instead of content.
 */
export type IWidgetLoader<P extends Record<string, any> = Record<string, any>> = (
  ui: WidgetUi,
  props: P,
) => JSX.Element;

/**
 * Descriptor for a single widget setting rendered in the settings-strip overlay.
 *
 * Union type — start with `toggle`, extend with `checkbox | input | select` later.
 * `value` receives `store.ctx.data` (reactive, called inside JSX) and returns
 * a boolean indicating the active/incoming visual state.
 * `tags` are passed directly to `meta.tags` — UiProxy binds onClick and routes
 * the event to the parent Feature/Controller handler.
 */
export type ISetting = {
  type: 'toggle';
  label: string;
  value: (data: any) => boolean;
  tags: string[];
};

/**
 * Options bag for `Widget(component, options?)`.
 * Replaces the positional `loader?` second argument (clean break).
 *
 * - `loader` — swap render while `store.loading === true` (same semantics as before).
 * - `settings` — declarative config for the settings-strip overlay rendered when
 *   global `settingsMode` is ON and `store` is available.
 */
export interface IWidgetOptions<P extends Record<string, any> = Record<string, any>> {
  loader?: IWidgetLoader<P>;
  settings?: ISetting[];
}

/**
 * `IWidgetWrapper` — wrapper-функция Widget.
 *
 * **Generic-аrity: `<F, P, S>`**
 *
 * - `F` — **явный** логический источник (Feature/Controller-тип). Первый дженерик.
 *   Определяет тип `store` по умолчанию через `WidgetStore<F>`:
 *   ```ts
 *   Widget<typeof Features.Incidents>((Ui, store) => {
 *     store.ctx.data; // IIncidentsCtx — типизировано
 *   });
 *   ```
 * - `P` — тип props (второй дженерик, обычно выводится). Default: `Record<string, any>`.
 * - `S` — тип store (третий дженерик). По умолчанию `WidgetStore<F>`.
 *   При inline-аннотации `store: StoreOf<typeof Features.X>` TS инферирует `S` из аннотации,
 *   `F` остаётся `DefaultFeatureSource`. Оба стиля компилируются:
 *   ```ts
 *   // Стиль 1 — явный source generic:
 *   Widget<typeof Features.Incidents>((Ui, store) => { store.ctx.data; });
 *   // Стиль 2 — inline-аннотация (backward-compat, ewc):
 *   Widget((Ui, store: StoreOf<typeof Features.Incidents>) => { store.ctx.data; });
 *   ```
 *
 * **Дефолт без дженерика:** `Widget((Ui, store) => ...)` → `store: IBridge | undefined`.
 */
export type IWidgetWrapper = <
  F = DefaultFeatureSource,
  P extends Record<string, any> = Record<string, any>,
  S = WidgetStore<F>,
>(
  component: IWidgetRenderer<P, S>,
  options?: IWidgetOptions<P>,
) => ParentComponent<P>;

/**
 * Page: корневой layout. Позиционные аргументы:
 * 1. UI page-уровня (Layout, Outlet).
 * 2. store — реактивный IBridge из ближайшего родительского Controller/Feature.
 *    `undefined` когда Page рендерится вне Controller-tree (типичный случай —
 *    Page обычно является корневым компонентом дерева).
 * 3. props — внешние props (опционально).
 *
 * Решение A1: store поступает только через composition layer (Widget/Page),
 * не прямо в View/Shape — View остаётся строго props-only.
 *
 * Registries (Widgets) доступны как глобалы через
 * `Object.assign(globalThis, _registry)` в bootstrap. Не нужны как args.
 */
/**
 * Page render-function. Generic `S` — тип store (аналогично IWidgetRenderer).
 */
export type IPageRenderer<
  P extends Record<string, any> = Record<string, any>,
  S = IBridge | undefined,
> = (ui: PageUi, store: S, props: P) => JSX.Element;

/**
 * `IPageWrapper` — wrapper-функция Page. Та же generic-схема что `IWidgetWrapper`:
 *
 * - `F` — явный источник: `Page<typeof Features.X>((Ui, store) => { store.ctx.data; })`.
 * - `P` — тип props.
 * - `S` — тип store, по умолчанию `WidgetStore<F>`.
 * - Без `<F>`: `store: IBridge | undefined`.
 * - Inline-аннотация `store: StoreOf<typeof Features.X>` — backward-compat (ewc).
 */
export type IPageWrapper = <
  F = DefaultFeatureSource,
  P extends Record<string, any> = Record<string, any>,
  S = WidgetStore<F>,
>(
  component: IPageRenderer<P, S>,
) => ParentComponent<P>;

// -----------------------------------------------------------------------------
// Logic-вкус: FSM-schema + handler-API для Controller/Feature.
// -----------------------------------------------------------------------------

export interface ITarget<TPayload = unknown> {
  name?: string;
  value?: unknown;
  type?: string;
  /** Идентификация (теги-роли). Только `{ tags }` — данные кладутся в `payload`. */
  meta?: ITagMeta;
  /** Сценарная окраска от Widget'а. */
  dynamicMeta?: ITagMeta;
  /**
   * **Immutable JSX-declared payload** автора Entity:
   * `<Nav.Item meta={{tags:['nav']}} payload={{href:'/branches'}}>` → `target.payload.href`.
   *
   * Не меняется при bubble через `next()` / `next.with()` — каждый уровень
   * цепочки видит один и тот же payload, заданный в JSX. Для трансформации
   * между уровнями используй `target.from` (см. ниже) + `next.with(arg)`.
   *
   * Generic `TPayload` типизируется автоматически для пакетных событий через
   * `IHandlerApi<TCtx, TPayload>` — при использовании `Feature<TEvents>`.
   */
  payload?: TPayload;
  /**
   * Данные, которые **непосредственный предыдущий уровень** цепочки передал
   * через `next.with(arg)`. Сбрасывается в `undefined`:
   *  - на первом уровне (прямой UI-event, нет «предыдущего»),
   *  - при пассивном bubble через `next()` (без аргумента — нет явного сигнала).
   *
   * Контракт: каждый handler видит **только** `from` от своего непосредственного
   * ребёнка, не аккумулируется через цепочку. Если хочешь форвардить дальше —
   * пиши явно: `await next.with(target.from)`.
   */
  from?: unknown;
  /** для keyboard-событий */
  key?: string;
  modifiers?: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean };
  /**
   * Идентификатор источника события — компонент/пакет, который эмитнул событие.
   * Позволяет разграничивать одноимённые методы от разных источников.
   * Выставляется пакетными контроллерами через `useEmit` с явным `source` в partial.
   * Опционально — не заполняется при DOM-dispatch'е через UiProxy.
   *
   * Пример: `emit('onLayoutChange', { source: '@capsuletech/web-shell/matrix', payload: {...} })`
   */
  source?: string;
}

export interface IStateApi {
  current: string;
  set: (name: string) => void;
  matches: (name: string | string[]) => boolean;
}

export type { IRegisteredComponent } from '@capsuletech/web-state';

/**
 * Тип функции `emit` в `IHandlerApi` и `IServices`.
 *
 * `emit(eventName, partial?)`:
 *  - нормализует `partial` → полный `ITarget` (через `normalizeTarget`);
 *  - диспатчит в СОБСТВЕННЫЙ контроллер: `ctx.controller[eventName](target, ctx.store.ctx)`;
 *  - ControllerProxy резолвит `states[cur][eventName]` → top-level → `next()` автобаблинг.
 *
 * Определён в `wrappers/interfaces.ts` (не в engine), чтобы избежать circular import:
 * engine/use-emit.ts импортирует этот тип, а не наоборот.
 *
 * ADR 032, фаза 1.
 */
export type EmitFn = (eventName: string, target?: Partial<ITarget>) => unknown;

/**
 * Bubble-up функция:
 *  - `next()` — пассивный bubble к родителю; `target.payload` сохраняется (immutable),
 *    `target.from` сбрасывается в `undefined` (нет явного сигнала от этого уровня).
 *  - `next.with(arg)` — bubble с явной передачей `arg` родителю как `target.from`.
 *    `target.payload` всё ещё JSX-immutable.
 *
 * Возврат — `null` если у Controller'а нет parent'а или у parent'а нет метода
 * с таким именем (с учётом `overrides`). Иначе — то, что вернул handler родителя.
 */
export interface INext {
  <T = any>(): Promise<T | null>;
  with: <T = any>(arg: unknown) => Promise<T | null>;
}

export interface IHandlerApi<TCtx = any, TPayload = unknown> {
  target: ITarget<TPayload>;
  context: TCtx;
  next: INext;
  state: IStateApi;
  store: IBridge;
  /**
   * Программный HCA-event dispatch в **собственный** контроллер.
   *
   * `emit(eventName, partial?)` → нормализует target → `ctx.controller[eventName](target, ctx.store.ctx)`
   *
   * ControllerProxy резолвит `states[cur][eventName]` → top-level → `next()` автобаблинг
   * к родительской Feature/Controller — ровно как DOM-событие через UiProxy.
   *
   * Ключевой кейс: пакетный Controller эмитит именованное событие из async lifecycle
   * (`onInit`/`onExit`), которое app-Feature ловит через свой handler (cross-boundary канал).
   *
   * @example
   * ```ts
   * Controller(({ api }) => ({
   *   states: {
   *     submitting: {
   *       onInit: async ({ store, state, emit }) => {
   *         const res = await api.auth.login(input);
   *         emit('onLogin', { payload: { token: res.token } });
   *       },
   *     },
   *   },
   * }));
   * ```
   *
   * ADR 032, фаза 1 (handler-API extension).
   */
  emit: EmitFn;
}

/** Расширение `IHandlerApi` для `schema.onError` — добавляет сам `error` + `method`. */
export interface IErrorHandlerApi<TCtx = any> extends IHandlerApi<TCtx> {
  error: unknown;
  method: string;
}

/**
 * Фиксированные DOM/lifecycle-хэндлеры — общая часть для open и closed форм.
 * Выделены в отдельный тип чтобы не дублировать в conditional.
 */
type IFixedHandlers<TCtx> = {
  onInit?: (api: IHandlerApi<TCtx>) => void | Promise<void>;
  onExit?: (api: IHandlerApi<TCtx>) => void | Promise<void>;
  onClick?: (api: IHandlerApi<TCtx>) => any;
  onDblClick?: (api: IHandlerApi<TCtx>) => any;
  onInput?: (api: IHandlerApi<TCtx>) => any;
  onChange?: (api: IHandlerApi<TCtx>) => any;
  onBlur?: (api: IHandlerApi<TCtx>) => any;
  onFocus?: (api: IHandlerApi<TCtx>) => any;
  onKeyDown?: (api: IHandlerApi<TCtx>) => any;
};

/**
 * Per-state user-handlers. Типизирует UI-события и custom-методы.
 *
 * Намеренно не расширяет `IBaseStateHandlers` напрямую — `IBaseStateHandlers.onExit`
 * типизирован как `(api: any) => any`, что несовместимо с `IFixedHandlers.onExit`.
 * Структурная совместимость сохранена (все ключи `IBaseStateHandlers` присутствуют).
 *
 * Generic `TCtx` — тип `context` из `schema.context`. Default `any` — backward-compat.
 *
 * Используется в ОТКРЫТОЙ форме (без TEvents). Index-signature разрешает произвольные
 * имена методов — backward-compat для app-кода без typed events.
 */
export interface IStateHandlers<TCtx = any> extends IFixedHandlers<TCtx> {
  /** пользовательские методы (для приёма от next()) */
  [methodName: string]: ((api: IHandlerApi<TCtx>) => any) | undefined;
}

/**
 * Per-state handlers для ЗАКРЫТОЙ формы (typed events).
 *
 * Аналог `IStateHandlers`, но **без** index-signature — иначе contextual typing
 * `target.payload` убивается (index sig принуждает TS выводить наименее конкретный
 * общий тип). Вместо index-sig: `IFixedHandlers<TCtx>` (фиксированные DOM/lifecycle)
 * плюс mapped union `{ [K in keyof TEvents]?: (api: IHandlerApi<TCtx, TEvents[K]>) => any }`.
 *
 * Итог: внутри состояния в closed-форме:
 *   - `onClick`, `onInit`, `onExit` и др. из IFixedHandlers — сохраняют типизацию TCtx;
 *   - `onLogin`, `onDrop` и др. из TEvents — `target.payload` типизирован по событию;
 *   - произвольные строковые ключи НЕ разрешены (всё должно быть в TEvents).
 */
type IStateHandlersClosed<TCtx, TEvents> = IFixedHandlers<TCtx> & {
  [K in keyof TEvents]?: (api: IHandlerApi<TCtx, TEvents[K]>) => any;
};

/**
 * Lifecycle + error-хэндлеры верхнего уровня — общие для open и closed форм.
 */
type ITopLevelLifecycle<TCtx> = {
  /**
   * Lifecycle: фаерит **реактивно** при каждой регистрации/анрегистрации
   * компонента в `store.components`. То есть первый вызов — на mount'е (часто
   * с пустым реестром, до того как дети успели зарегистрироваться), затем по
   * разу на каждого нового потомка (включая lazy-загруженных через
   * `lazy(import())`, TanStack lazy-routes, Suspense-fallback'и).
   *
   * Обязательное условие: callback должен быть идемпотентным.
   *
   * Семантически отличается от `states[X].onInit`: последний — про вход в
   * стейт FSM (фаер на каждом переходе FSM); `onRegister` — про настройку
   * реактивного состояния по составу UI-дерева.
   */
  onRegister?: (api: IHandlerApi<TCtx>) => any;
  /**
   * Lifecycle: один раз на unmount Controller/Feature (Solid `onCleanup`).
   * Зеркало `states[initial].onInit` на конце жизни — используй для:
   *  - отписки от внешних source'ов (event listeners, intervals, WebSocket'ы);
   *  - финализации side-effect'ов (flushing analytics, persist state);
   *  - явного teardown того, что было создано в `onRegister`/`onInit`.
   *
   * Вызывается **после** Solid disposed дочерние UiProxy-обёртки
   * (которые сами отрабатывают `unregisterComponent`), так что `store.components`
   * на этот момент уже пуст. Не пытайся читать состав UI-дерева отсюда.
   */
  onDispose?: (api: IHandlerApi<TCtx>) => any;
  /**
   * Централизованный error-hook: фаерит, когда handler (per-state или top-level)
   * бросил/reject'нул. Получает обычный `IHandlerApi` + сам `error` + `method`
   * (имя метода в schema, который упал).
   *
   * Контракт:
   *  - вызывается **до** того как ошибка пробрасывается дальше;
   *  - re-throw из самой `onError` логируется и **глотается** (нельзя ронять teardown);
   *  - ошибка handler'а всё равно re-throw'ается из ControllerProxy после `onError` —
   *    т.е. `next()` цепочка наверху ловит её через свой `try/await`. Если хочешь
   *    подавить пробрасывание — лови в самом handler'е через `try/catch`.
   *
   * Полезно для: централизованный setErrors → store, sentry-репорт, fallback-логика.
   */
  onError?: (api: IErrorHandlerApi<TCtx>) => any;
};

/**
 * Полный публичный shape HCA-схемы — ОТКРЫТАЯ форма (backward-compat).
 *
 * Используется когда `TEvents = {}` (default, `keyof TEvents extends never`).
 * Разрешает `[methodName: string]: any` — пользовательские методы без типизации.
 * TCtx инферируется из поля `context` объекта, возвращаемого factory.
 *
 * Backward-compat: существующий app-код без `TEvents` работает без изменений.
 */
type IDefineStateSchemaOpen<TCtx> = IBaseStateSchema<TCtx> &
  ITopLevelLifecycle<TCtx> &
  IFixedHandlers<TCtx> & {
    states: Record<string, IStateHandlers<TCtx>>;
    /** пользовательские top-level методы — открытая форма */
    [methodName: string]: any;
  };

/**
 * Полный публичный shape HCA-схемы — ЗАКРЫТАЯ форма (typed events).
 *
 * Используется когда `TEvents` явно передан в `Feature<TEvents>`.
 * Mapped type `{ [K in keyof TEvents]?: (api: IHandlerApi<TCtx, TEvents[K]>) => any }`
 * даёт contextual typing `target.payload` **без** per-handler аннотации.
 *
 * Нет `[methodName: string]: any` и нет `extends IBaseStateSchema` — намеренно.
 * Index signature убивает contextual typing (PoC C.1). `IBaseStateSchema` содержит
 * `[methodName: string]: any` — поэтому в closed форме мы не расширяем его,
 * а декларируем нужные поля явно. Structural compatibility с `IBaseStateSchema`
 * сохранена через `initial` + `context` + `states`.
 *
 * Все custom-методы должны входить в TEvents.
 *
 * TCtx должен быть передан явно вторым generic'ом — circular inference TS не позволяет
 * одновременно вывести TCtx из `context`-поля и использовать его в typed handlers
 * одного объекта.
 */
type IDefineStateSchemaClosed<TCtx, TEvents> = ITopLevelLifecycle<TCtx> &
  IFixedHandlers<TCtx> & {
    /** FSM initial state. */
    initial?: string;
    /** User context — типизируется TCtx. */
    context?: TCtx;
    /**
     * Per-state handlers — ЗАКРЫТАЯ форма.
     * Использует `IStateHandlersClosed<TCtx, TEvents>` вместо `IStateHandlers<TCtx>`,
     * чтобы typed-event handlers (из TEvents) внутри состояния получали типизированный
     * `target.payload` — так же, как top-level handlers в той же закрытой схеме.
     * Index-signature намеренно отсутствует (см. комментарий к IStateHandlersClosed).
     */
    states?: Record<string, IStateHandlersClosed<TCtx, TEvents>>;
  } & {
    [K in keyof TEvents]?: (api: IHandlerApi<TCtx, TEvents[K]>) => any;
  };

/**
 * Полный публичный shape HCA-схемы. Conditional форма:
 *
 * - `TEvents = {}` (default) → открытая форма: `[methodName: string]: any`.
 *   Полный backward-compat — существующий app-код без изменений.
 *
 * - `TEvents` явный → закрытая форма: `{ [K in keyof TEvents]?: handler }`.
 *   `target.payload` типизируется по имени метода без per-handler аннотации.
 *   `TCtx` следует передавать явно вторым generic'ом для типизации `context`.
 *
 * ```ts
 * // Открытая форма (существующий app-код — не меняется):
 * const AuthCtrl = Controller((s) => ({
 *   context: { loading: false },
 *   states: { idle: { onClick({ target }) { ... } } }
 * }));
 *
 * // Закрытая форма (пакетный Controller/Feature с типизацией событий):
 * type IMyEvents = { onLayoutChange: { id: string; kind: 'swap' | 'resize' } };
 * const LayoutFeature = Feature<IMyEvents, ILayoutCtx>((s) => ({
 *   context: { saving: false } as ILayoutCtx,
 *   onLayoutChange({ target }) {
 *     // target.payload: { id: string; kind: 'swap' | 'resize' } | undefined
 *   },
 * }));
 * ```
 */
export type IDefineStateSchema<
  TCtx = any,
  TEvents = Record<never, never>,
> = keyof TEvents extends never
  ? IDefineStateSchemaOpen<TCtx>
  : IDefineStateSchemaClosed<TCtx, TEvents>;

/**
 * Augmentable interface для пакетных services.
 *
 * Доменные пакеты (web-auth, web-dnd, …) расширяют этот интерфейс через
 * TypeScript module augmentation, чтобы поля, зарегистрированные через
 * `registerPackageServices(namespace, obj)`, получили строгую типизацию
 * в factory-телах Controller/Feature:
 *
 * ```ts
 * // В @capsuletech/web-auth:
 * import '@capsuletech/web-core';
 *
 * declare module '@capsuletech/web-core' {
 *   interface CapsuleServices {
 *     auth: {
 *       login: (credentials: ICredentials) => Promise<IAuthToken>;
 *       logout: () => Promise<void>;
 *     };
 *   }
 * }
 * ```
 *
 * После этого в любом Feature/Controller приложения:
 * ```ts
 * Feature((services) => ({
 *   states: {
 *     idle: {
 *       async onSubmit({ target }) {
 *         const token = await services.auth.login(target.value);
 *         // ^^^^^^ типизировано без импорта типов web-auth
 *       },
 *     },
 *   },
 * }));
 * ```
 *
 * Пустой fallback ({}): пакеты добавляют поля через merging,
 * конфликтов с базовыми полями IServices нет по контракту namespace'ов.
 */
// biome-ignore lint/suspicious/noEmptyInterface: intentional augmentation point
export interface CapsuleServices {}

export interface IServices extends CapsuleServices {
  router: ICapsuleRouter;
  /**
   * Typed API — собран `createApi(...)` из endpoints. Инжектится ТОЛЬКО в Feature
   * (compliance запрещает IO в Controller'е). `undefined` если приложение не
   * вызвало `setApiClient(...)` (т.е. в `capsule.app.ts` нет поля `api`).
   *
   * Тип `CapsuleApi` — глобальный interface; пустой fallback здесь сливается
   * через interface merging с `EndpointsRegistryPlugin`'овой `.capsule/@types/
   * api.d.ts` → `services.api.user.get({ id })` корректно типизируется.
   */
  api?: CapsuleApi;
  /**
   * Программный HCA-event dispatch — доступен в factory-теле Controller/Feature.
   *
   * `emit` в `services` — удобный alias когда нужно сослаться на emit **на уровне
   * factory** (вне конкретного handler'а). Например, чтобы передать его в helper или
   * хранить ссылку. В большинстве случаев достаточно `emit` из `IHandlerApi`
   * (приходит в каждый handler, event + lifecycle).
   *
   * `undefined` до первого рендера контроллера (factory вызывается до создания ctx).
   * Замыкание обновляется реактивно — вызывать лениво (внутри handler'а), не на верхнем
   * уровне factory.
   *
   * ADR 032, фаза 1.
   */
  emit?: EmitFn;
  /**
   * Capsule-расширенный Zod namespace (CapsuleZ). Инжектируется per-instance в
   * factory тела Controller/Feature. Идентичен глобалу `Zod` (unplugin-auto-import),
   * но доступен явно как capability — без зависимости от AutoImport.
   *
   * Пример: `zod.object({ email: zod.string().email() })`
   */
  zod: typeof ZodNamespace;
  /**
   * Curated utility surface (es-toolkit + gap-филлеры). Инжектируется per-instance
   * в factory тела Controller/Feature. Идентичен глобалу `Utils` (unplugin-auto-import),
   * но доступен явно как capability — без зависимости от AutoImport.
   *
   * Пример: `utils.includes(target.meta?.tags ?? [], 'logout')`
   */
  utils: typeof UtilsNamespace;
  [k: string]: any;
}

export type IWrapperProps = {
  children: any;
  overrides?: Record<string, string>;
  /**
   * Опциональный fallback для встроенного `<Suspense>` вокруг детей Controller/Feature.
   * Если `undefined` — Suspense без fallback'а (suspend пробросится к ближайшему
   * предку с fallback'ом). Имеет смысл задавать, когда внутри есть lazy-импорты
   * (UI-kit, lazy-routes), которые могут suspend'нуть.
   */
  fallback?: JSXElement;
};

/**
 * Тип wrapper-функции `Controller(factory) => Component`.
 *
 * Generic `TCtx` — выводится из возвращаемого типа factory через `context`-поле.
 * Благодаря этому handler-параметры типизируются автоматически:
 *
 * ```ts
 * // Пакетный Controller — context типизирован без кастов:
 * const EditorController = Controller((services) => ({
 *   context: { selectedId: null } as IEditorCtx,
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       onSelect({ target, context }) {
 *         // context: IEditorCtx  ← выводится из поля `context` выше
 *       },
 *     },
 *   },
 * }));
 * ```
 *
 * Backward-compat: старый app-код без явного `context` поля получает `TCtx = any`.
 */
/**
 * Тип wrapper-функции `Controller(factory) => Component`.
 *
 * Generic `TCtx` — выводится из возвращаемого типа factory через `context`-поле.
 * Phantom-поле `__ctx` несёт `TCtx` на уровне типа компонента:
 * `typeof MyFeature.__ctx` → `TCtx`, что позволяет `CtxOf<typeof MyFeature>`
 * извлечь контекст без явного дженерика.
 *
 * ```ts
 * const MyFeature = Feature((services) => ({
 *   context: { count: 0 } as IMyCtx,
 *   initial: 'idle',
 *   states: { idle: {} },
 * }));
 *
 * // В Widget:
 * Widget((Ui, store: StoreOf<typeof MyFeature>) => {
 *   store.ctx.data; // IMyCtx — типизировано
 * });
 * ```
 */
/**
 * Тип wrapper-функции `Controller(factory)` / `Feature(factory)`.
 *
 * Generic-arity: `TEvents` первым (explicit при пакетных событиях), `TCtx` вторым.
 *
 * - `Controller((s) => ...)` — TEvents = {}, TCtx инферируется из `context`-поля. Backward-compat.
 * - `Feature<IMyEvents>((s) => ...)` — открыта closed-форма, TCtx = any (payload типизирован).
 * - `Feature<IMyEvents, IMyCtx>((s) => ...)` — оба явные, payload + context типизированы.
 *
 * Phantom-поле `__ctx` несёт `TCtx` на уровне типа компонента:
 * `CtxOf<typeof MyFeature>` → `TCtx`.
 */
export type IControllerWrapper = <TEvents = Record<never, never>, TCtx = any>(
  defineStateSchema: (services: IServices) => IDefineStateSchema<TCtx, NoInfer<TEvents>>,
) => ((props: IWrapperProps) => any) & { readonly __ctx?: TCtx };

export type IFeatureWrapper = IControllerWrapper;

// Re-export Entity types для удобства потребителей.
export type {
  IEntityDefinition,
  IEntityFactory,
  IEntityTools,
  IEntityWrapper,
} from './entity/types';
// Re-export Shape types для удобства потребителей.
export type {
  IShapeComponent,
  IShapeComponentProps,
  IShapeTools,
  IShapeUi,
  IShapeWrapper,
  ShapeData,
} from './shape/types';

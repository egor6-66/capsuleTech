import type { Component, ValidComponent } from 'solid-js';
import type { ZodArray, ZodType, ZodTypeAny, z as zod } from 'zod';
import type { IViewUiRaw } from '../interfaces';

/**
 * Path-tracker для первого аргумента factory'и (`ui`). Proxy, фиксирующий путь.
 * Резолв реального компонента происходит в момент рендера через `ShapeUiContext`.
 *
 * Тип производится из `IViewUiRaw` (без `WithMetaProps`) — это гарантирует что
 * `ui.PreviewCard`, `ui.Button`, `ui.Group` и т.д. несут реальные типы компонентов
 * с phantom `__tpl`-маркерами. При добавлении нового компонента в `ViewUiRaw`
 * `IShapeUi` подхватит его автоматически — без ручных правок в этом файле.
 *
 * Рантайм: `createUiTracker` возвращает Proxy, тип с ним расходится — это норма.
 * Proxy-структура нужна только для фиксации пути к компоненту (`as: ui.PreviewCard`).
 *
 * Сохранены гибкие расширения:
 *  - `Views: Record<string, any>` — composite user Views (`ui.Views.Forms.Field`)
 *  - `[key: string]: any` — любые нестандартные пути, которые tracker поддерживает
 *    в рантайме (например `ui.SomePackageWidget`)
 */
export type IShapeUi = IViewUiRaw & {
  /** Views registry — composite user Views (`ui.Views.Forms.Field`). */
  Views: Record<string, any>;
  /** Index-fallback — позволяет использовать произвольные пути через tracker. */
  [key: string]: any;
};

/**
 * Извлекает тип `data` из схемы Shape:
 *  - `ZodArray<E>` → `zod.infer<E>[]` (array items, batch flow).
 *  - Любой другой `ZodType` → `zod.infer<S>` (single value / object).
 */
export type ShapeData<S extends ZodType> =
  S extends ZodArray<infer E> ? (E extends ZodTypeAny ? zod.infer<E>[] : never) : zod.infer<S>;

/**
 * Извлекает тип одной строки (элемента) из схемы:
 *  - `ZodArray<E>` → `zod.infer<E>` (item type).
 *  - Иной `ZodType` → `zod.infer<S>`.
 */
export type RowOf<S extends ZodType> =
  S extends ZodArray<infer E extends ZodTypeAny> ? zod.infer<E> : zod.infer<S>;

// ---------------------------------------------------------------------------
// HKT-маркерная машинерия
// ---------------------------------------------------------------------------

/**
 * Извлекает маркер `__tpl` из компонента-шаблона.
 * `MarkerOf<A>` = `A['__tpl']` если есть, иначе `never`.
 */
export type MarkerOf<A> = A extends { readonly __tpl?: infer M } ? M : never;

/**
 * Применяет конкретный row к HKT-маркеру через intersection.
 * `(M & { row: R })['props']` — TS 5.x резолвит `this['row']` в маркере как `R`
 * при intersection, если `props` типизирован через `this['row']` на top-level.
 */
export type ApplyRow<M extends { row: unknown; props: unknown }, R> = (M & { row: R })['props'];

/**
 * Применяет row к маркеру компонента `A`.
 * Если `A` не имеет `__tpl` маркера — возвращает `Record<string, unknown>` (фолбэк).
 */
export type ApplyRowFrom<A, R> =
  MarkerOf<A> extends { row: unknown; props: unknown }
    ? ApplyRow<MarkerOf<A>, R>
    : Record<string, unknown>;

// ---------------------------------------------------------------------------
// Bind (arg1) — фиксирует schema + as
// ---------------------------------------------------------------------------

/**
 * Результат bind-функции (arg1). Содержит schema + as шаблон.
 * `item` убран в ADR 036: batch-дескриптор переехал в arg2 (`child`),
 * чтобы избежать sibling-инференс (item.props рядом со schema → it: any).
 */
export interface IShapeBind<S extends ZodType = ZodType> {
  schema: S;
  /** Контейнер/шаблон — несёт `__tpl` маркер для HKT-типизации. */
  as?: ValidComponent;
}

/**
 * Bind-функция: принимает `ui` (path-tracker), возвращает `IShapeBind`.
 * Вызывается на module-load — один раз.
 */
export type IShapeBindFn<S extends ZodType = ZodType, A = unknown> = (
  ui: IShapeUi,
) => IShapeBind<S> & { as?: A };

// ---------------------------------------------------------------------------
// Config (arg2) — row-зависимая презентационная конфигурация
// ---------------------------------------------------------------------------

/**
 * Тело config-объекта: шаблонные props + опциональный `defaults` + опциональный `child`.
 * `defaults` — начальные данные Shape (канон: arg2, ADR 036 §2).
 * `child` — batch-дескриптор (переехал из arg1 `item` в ADR 036):
 *   `use` — компонент каждого элемента, `props` — маппер row→props.
 *   Типизирован через `RowOf<S>` — резолвится без sibling-инференс,
 *   т.к. arg2 отдельно от `schema` в arg1.
 *
 * Используется вместо голого `Partial<TConfig>` в `IShapeConfigArg`,
 * чтобы не требовать excess-property проверки для `defaults` на объектном литерале.
 */
export type IShapeConfigBody<TConfig, S extends ZodType> = Partial<TConfig> & {
  defaults?: ShapeData<S>;
  /**
   * Batch-дескриптор: `use` — компонент каждого элемента, `props` — маппер row→props.
   * `use` НЕ называется `as` чтобы не конфликтовать с верхнеуровневым контейнером.
   *
   * `it: RowOf<S>` — тип элемента схемы выводится автоматически, без аннотации,
   * т.к. `child` находится в arg2, отдельно от `schema` (нет sibling-инференс).
   */
  child?: {
    use?: ValidComponent;
    props?: (it: RowOf<S>) => Record<string, unknown>;
  };
};

/**
 * Config arg2 — объект ИЛИ функция `(ui, props) => body`.
 * TConfig — тип конфигурации (определяется из маркера шаблона).
 * TProps — тип консьюмер-props (типизированы через RowOf).
 * S — схема Shape (нужна для типизации `defaults` и `child.props`).
 *
 * Функциональная форма получает `ui` первым аргументом (path-tracker),
 * что позволяет использовать `ui.Link`, `ui.Button` и т.д. в `child.use`
 * и других полях config.
 */
export type IShapeConfigArg<TConfig, TProps, S extends ZodType = ZodType> =
  | IShapeConfigBody<TConfig, S>
  | ((ui: IShapeUi, props: TProps) => IShapeConfigBody<TConfig, S>);

// ---------------------------------------------------------------------------
// Consumer props (что принимает итоговый компонент Shape на JSX-сайте)
// ---------------------------------------------------------------------------

/**
 * Базовые консьюмер-props, всегда присутствующие независимо от шаблона.
 */
export interface IShapeBaseProps<TData> {
  /** Override данных. Приоритет: consumer `data` > definition `defaults`. */
  data?: TData;
  /** Override batch-template из definition. */
  as?: ValidComponent;
  /** Любые дополнительные props → прокидываются в template поверх config extras. */
  [extraKey: string]: unknown;
}

export type IShapeComponentProps<TData> = IShapeBaseProps<TData>;
export type IShapeComponent<TData> = Component<IShapeComponentProps<TData>>;

// ---------------------------------------------------------------------------
// IShapeWrapper — полная типизированная сигнатура с перегрузками
// ---------------------------------------------------------------------------

/**
 * Полный типизированный Shape-враппер.
 *
 * Три перегрузки для multi-template dispatch:
 *  1. Маркированный шаблон (has `__tpl`) — config типизируется через HKT.
 *  2. Без arg2 (простой кейс — только bind).
 *  3. Generic фолбэк — без маркера, config = Record<string, unknown>.
 *
 * Двухфазная форма:
 * ```ts
 * Shape(
 *   (ui) => ({ schema, as }),                    // BIND: фиксирует schema и шаблон
 *   (ui, props) => ({ columns, child, sorting }) // CONFIG: row-типизирован из schema; ui — path-tracker
 * );
 * ```
 */
export interface IShapeWrapper {
  // Перегрузка 1: шаблон с маркером __tpl + arg2 → consumer-props row-типизированы.
  // Возвращаемый компонент принимает: IShapeBaseProps (data/as) & ApplyRowFrom (itemPayload, getRowId, …).
  // RowOf<S> инлайнится напрямую — нет контравариантного R-generic.
  <S extends ZodType, A extends { readonly __tpl?: object }>(
    bind: (ui: IShapeUi) => IShapeBind<S> & { as?: A },
    config: IShapeConfigArg<ApplyRowFrom<A, RowOf<S>>, IShapeBaseProps<ShapeData<S>> & ApplyRowFrom<A, RowOf<S>>, S>,
  ): Component<IShapeBaseProps<ShapeData<S>> & ApplyRowFrom<A, RowOf<S>>>;

  // Перегрузка 2: только bind (без arg2), шаблон с маркером → consumer-props row-типизированы.
  <S extends ZodType, A extends { readonly __tpl?: object }>(
    bind: (ui: IShapeUi) => IShapeBind<S> & { as?: A },
  ): Component<IShapeBaseProps<ShapeData<S>> & ApplyRowFrom<A, RowOf<S>>>;

  // Перегрузка 3: только bind без маркера (plain компонент, row-тип недоступен).
  <S extends ZodType>(
    bind: (ui: IShapeUi) => IShapeBind<S>,
  ): IShapeComponent<ShapeData<S>>;

  // Перегрузка 4: bind без маркера + generic config (plain, без row-типизации).
  <S extends ZodType>(
    bind: (ui: IShapeUi) => IShapeBind<S>,
    config: IShapeConfigArg<Record<string, unknown>, IShapeBaseProps<ShapeData<S>>, S>,
  ): IShapeComponent<ShapeData<S>>;
}


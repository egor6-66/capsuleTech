import type { Component, ValidComponent } from 'solid-js';
import type { ZodArray, ZodType, ZodTypeAny, z as zod } from 'zod';

/**
 * Path-tracker для первого аргумента factory'и (`ui`). Proxy, фиксирующий путь.
 * Резолв реального компонента происходит в момент рендера через `ShapeUiContext`.
 *
 * Тип намеренно гибкий (Record<string, any>) — tracker — это Proxy без реальной структуры.
 */
export type IShapeUi = Record<string, any> & {
  /** Views registry — composite user Views (`ui.Views.Forms.Field`). */
  Views: Record<string, any>;
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
 * `item` — для batch-элементов (nav-паттерн): `{ use, props }`.
 *
 * Второй параметр `R` = row-тип из схемы (`RowOf<S>`).
 * На call-site IShapeWrapper overloads инферируют `R` из `S` автоматически —
 * вручную указывать не нужно. Значение по умолчанию `RowOf<S>` обеспечивает
 * обратную совместимость с IShapeBindFn<S>.
 */
export interface IShapeBind<S extends ZodType = ZodType, R = RowOf<S>> {
  schema: S;
  /** Контейнер/шаблон — несёт `__tpl` маркер для HKT-типизации. */
  as?: ValidComponent;
  /**
   * Batch-элемент: `use` — компонент каждого элемента, `props` — маппер row→props.
   * `use` НЕ называется `as` чтобы не конфликтовать с верхнеуровневым `as`.
   *
   * `props` типизирован через `R` = `RowOf<S>`: `it` = элемент схемы без ручных аннотаций.
   * Вывод `R` происходит на уровне IShapeWrapper overloads, где `S` уже инферирован.
   */
  item?: {
    use?: ValidComponent;
    props?: (it: R) => Record<string, unknown>;
  };
}

/**
 * Bind-функция: принимает `ui` (path-tracker), возвращает `IShapeBind`.
 * Вызывается на module-load — один раз.
 *
 * `R = RowOf<S>` — row-тип передаётся в `IShapeBind` чтобы `item.props` был типизирован.
 */
export type IShapeBindFn<S extends ZodType = ZodType, A = unknown, R = RowOf<S>> = (
  ui: IShapeUi,
) => IShapeBind<S, R> & { as?: A };

// ---------------------------------------------------------------------------
// Config (arg2) — row-зависимая презентационная конфигурация
// ---------------------------------------------------------------------------

/**
 * Тело config-объекта: шаблонные props + опциональный `defaults`.
 * `defaults` — начальные данные Shape (канон: arg2, ADR 036 §2).
 *
 * Используется вместо голого `Partial<TConfig>` в `IShapeConfigArg`,
 * чтобы не требовать excess-property проверки для `defaults` на объектном литерале.
 */
export type IShapeConfigBody<TConfig, S extends ZodType> = Partial<TConfig> & {
  defaults?: ShapeData<S>;
};

/**
 * Config arg2 — объект ИЛИ функция от консьюмер-props.
 * TConfig — тип конфигурации (определяется из маркера шаблона).
 * TProps — тип консьюмер-props (типизированы через RowOf).
 * S — схема Shape (нужна для типизации `defaults`).
 */
export type IShapeConfigArg<TConfig, TProps, S extends ZodType = ZodType> =
  | IShapeConfigBody<TConfig, S>
  | ((props: TProps) => IShapeConfigBody<TConfig, S>);

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
 *   (ui) => ({ schema, as }),         // BIND: фиксирует schema и шаблон
 *   (props) => ({ columns, sorting }) // CONFIG: row-типизирован из schema
 * );
 * ```
 */
export interface IShapeWrapper {
  // Перегрузка 1: шаблон с маркером __tpl + arg2 → consumer-props row-типизированы.
  // Возвращаемый компонент принимает: IShapeBaseProps (data/as) & ApplyRowFrom (itemPayload, getRowId, …).
  // R = RowOf<S> — row-тип явно передаётся в IShapeBind чтобы item.props был типизирован.
  <S extends ZodType, A extends { readonly __tpl?: object }, R extends RowOf<S> = RowOf<S>>(
    bind: (ui: IShapeUi) => IShapeBind<S, R> & { as?: A },
    config: IShapeConfigArg<ApplyRowFrom<A, R>, IShapeBaseProps<ShapeData<S>> & ApplyRowFrom<A, R>, S>,
  ): Component<IShapeBaseProps<ShapeData<S>> & ApplyRowFrom<A, R>>;

  // Перегрузка 2: только bind (без arg2), шаблон с маркером → consumer-props row-типизированы.
  <S extends ZodType, A extends { readonly __tpl?: object }, R extends RowOf<S> = RowOf<S>>(
    bind: (ui: IShapeUi) => IShapeBind<S, R> & { as?: A },
  ): Component<IShapeBaseProps<ShapeData<S>> & ApplyRowFrom<A, R>>;

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


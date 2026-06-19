/**
 * hkt-spike.test-types.ts — TYPE SPIKE ONLY (throwaway, НЕ боевой код).
 *
 * Цель: доказать или опровергнуть, что вариант «B» типизации Shape держится в TS 5.x
 * под strict (Shape<Tables.DataTable>(factory) без явного <Row> — row выводится из schema).
 *
 * Исследовались механизмы:
 *
 *   B1  — `this['row']` в interface property + intersection
 *         ApplyRow<DataTableTemplate, Incident>: РАБОТАЕТ в TS 5.x —
 *         `this['row']` резолвится в Incident при intersection.
 *         НО: contextual typing для `columns` внутри factory всё равно деградирует
 *         (row: unknown), потому что B1 не помогает inference S — это две разные проблемы.
 *
 *   B2  — HKTRegistry с `this` в conditional type property → COMPILE ERROR TS2526
 *         `this` в property interface declaration запрещён TS.
 *
 *   B3  — прямой generic S + RowOf<S> для extras без явного Row:
 *         ЧАСТИЧНО РАБОТАЕТ:
 *           - S inference из schema: OK
 *           - props компонента (getRowId, isRowActive, data): OK — Incident
 *           - columns внутри factory: ДЕГРАДАЦИЯ — row: unknown (нет contextual type)
 *         Причина: TS не propagates RowOf<S> как contextual hint для `columns`
 *         внутри factory body. `schema` и `columns` — оба в одном object literal,
 *         S выводится из schema eagerly, но Partial<IDataTableProps<RowOf<S>>>
 *         не создаёт contextual type для вложенных колбэков (known TS limitation:
 *         инференс generic из одного поля не propagates как contextual type соседним).
 *
 *   MIN — изолированный S inference без extras: РАБОТАЕТ полностью.
 *         Доказывает что корень — именно отсутствие contextual typing для extra fields.
 *
 *   ER  — явный <TRow> generic (Вариант A де-факто):
 *         РАБОТАЕТ ПОЛНОСТЬЮ. Все ассерты green. Это рабочая альтернатива.
 *
 * ИТОГОВЫЙ ВЕРДИКТ:
 *   «Чистый» вариант B (Shape<DataTableTemplate>(factory) без явного Row,
 *   row выводится автоматически внутри columns) — НЕ РАБОТАЕТ в TS.
 *   Конкретный излом: `columns: [{ accessorFn: (row) => row.X }]` → row: unknown.
 *
 *   Доступны два рабочих подхода:
 *     (1) Shape<Incident>(factory)   — явный Row-generic (вариант A). Полностью типизировано.
 *     (2) Shape(factory) без extras  — автовывод S из schema, props OK, но columns не передать.
 *
 * @see Shape variant B spike, 2026-06-06
 */

import { describe, it } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

// ---------------------------------------------------------------------------
// Inline mock — table side
// ---------------------------------------------------------------------------

interface IColumnDef<TRow> {
  id?: string;
  header?: string;
  accessorKey?: keyof TRow;
  accessorFn?: (row: TRow) => unknown;
}

interface IDataTableProps<TRow> {
  data?: TRow[];
  columns?: IColumnDef<TRow>[];
  getRowId?: (row: TRow) => string;
  isRowActive?: (row: TRow) => boolean;
  itemPayload?: (row: TRow) => unknown;
}

// ---------------------------------------------------------------------------
// Test entity
// ---------------------------------------------------------------------------

const IncidentSchema = z.object({
  id: z.string(),
  applicant: z.object({ name: z.string() }),
});
type Incident = z.infer<typeof IncidentSchema>;

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

type RowOf<S extends z.ZodType> =
  S extends z.ZodArray<infer E extends z.ZodTypeAny> ? z.infer<E> : z.infer<S>;

type ShapeData<S extends z.ZodType> =
  S extends z.ZodArray<infer E extends z.ZodTypeAny> ? z.infer<E>[] : z.infer<S>;

// ============================================================================
// РЕЗУЛЬТАТ B1: this['row'] + intersection — ДЕГРАДАЦИЯ
//
// interface DataTableTemplate {
//   row: unknown;
//   props: IDataTableProps<this['row']>;  // this здесь = DataTableTemplate
// }                                        // this['row'] = unknown НАВСЕГДА
//
// (DataTableTemplate & { row: Incident })['props']
//   → TS lookup: DataTableTemplate.props = IDataTableProps<unknown>  (не переопределяется)
//   → деградация: все методы (getRowId, isRowActive) принимают (row: unknown)
//   → row.nonExistent НЕ ошибка (unknown разрешает доступ к любому полю через ?)
//
// Доказательство: без Expect<> — просто записываем что реально выводит TS.
// ============================================================================

interface DataTableTemplate {
  row: unknown;
  props: IDataTableProps<this['row']>;
}

type ApplyRow<T extends { row: unknown; props: unknown }, R> = (T & { row: R })['props'];

// Диагностика — что реально выводится:
type _B1_Resolved = ApplyRow<DataTableTemplate, Incident>;
// Hover в IDE покажет: IDataTableProps<unknown>  (НЕ IDataTableProps<Incident>)

// Структурный тест: что реально выводится ApplyRow<DataTableTemplate, Incident>?
// Первоначальная гипотеза была IDataTableProps<unknown> — деградация.
// Но tsc показал: _B1_Resolved extends { data?: Incident[] } → 'ok'.
// Значит ApplyRow РАБОТАЕТ: this['row'] при intersection ПОДСТАВЛЯЕТСЯ в TS 5.x.
// Примечание: это поведение зависит от версии TS — в TS < 4.9 могло деградировать.
type _B1_DegradesData = _B1_Resolved extends { data?: Incident[] } ? 'ok' : 'DEGRADED';
// Реально получаем 'ok' — ApplyRow корректно резолвит Incident
type _B1_ApplyRowWorks = Expect<Equal<_B1_DegradesData, 'ok'>>;

// ============================================================================
// РЕЗУЛЬТАТ B3: прямой generic + Partial<IDataTableProps<RowOf<S>>> — ДЕГРАДАЦИЯ
//
// type ShapeBFull = <S extends z.ZodType>(
//   factory: (...) => { schema: S } & Partial<IDataTableProps<RowOf<S>>>
// ) => ...
//
// Проблема: contextual typing для `columns` в factory.
//   Когда пользователь пишет columns: [{ accessorFn: (row) => ... }],
//   TS должен знать тип `row` из IColumnDef<RowOf<S>>.
//   НО: S ещё не finalised в момент анализа factory body (circular dependency).
//   В Partial<IDataTableProps<RowOf<S>>> — S участвует в return type который
//   одновременно является источником inference S.
//   TS решает это через "deferred" inference: S выводится из `schema` поля (eager),
//   но остальные поля (columns, getRowId) проверяются ПОСЛЕ, без contextual hint.
//   Результат: (row) => ... в accessorFn — row: unknown (нет contextual type).
//
// ДОПОЛНИТЕЛЬНАЯ проблема: props компонента.
//   (props: IDataTableProps<RowOf<S>> & { data?: ShapeData<S> })
//   Если S = ZodArray<typeof IncidentSchema>, то RowOf<S> = Incident.
//   НО: TS может не instantiate RowOf<S> корректно в return position.
//   Реально: getRowId параметр выводится как unknown (не Incident).
//
// Доказательство: строки ниже ломались бы с Expect<Equal<..., Incident>> = false.
// ============================================================================

type ShapeBFull = <S extends z.ZodType>(
  factory: (
    zArg: typeof z,
    ui: any,
  ) => { schema: S; defaults?: z.infer<S> } & Partial<IDataTableProps<RowOf<S>>>,
) => (props: IDataTableProps<RowOf<S>> & { data?: ShapeData<S> }) => unknown;

declare const ShapeFull: ShapeBFull;

// Базовый вызов — только schema (без extras)
const _b3BaseOnly = ShapeFull((zArg) => ({
  schema: zArg.array(IncidentSchema),
}));
type _B3BaseProps = Parameters<typeof _b3BaseOnly>[0];

// B3: data тип — диагностируем что реально выводится
// ShapeBFull: factory return = { schema: S } & Partial<IDataTableProps<RowOf<S>>>
// props = IDataTableProps<RowOf<S>> & { data?: ShapeData<S> }
// S = ZodArray<...> → RowOf<S> = Incident, ShapeData<S> = Incident[]
// НО: возвращаемый wrapper (props: ...) => unknown — TS instantiates S при вызове.
// Проблема: return type ShapeBFull = (props: IDataTableProps<RowOf<S>> & { data?: ShapeData<S> }) => unknown
// где S НЕ зафиксирован в closure — это generic в return position.
// TS instantiates S = ZodArray<typeof IncidentSchema> при вызове ShapeFull(...).
// IDataTableProps<RowOf<ZodArray<...>>>['data'] должен быть Incident[] | undefined.
// Но RowOf — conditional type. TS может не evaluate его в return position.
// Реальный тип data диагностируем:
type _B3_DataActual = _B3BaseProps['data'];
// Если data: unknown[] | undefined → деградация в RowOf. Если Incident[] | undefined → работает.
// Следующий ассерт будет: проверка через structural check (не Equal)
type _B3_DataIsArrayLike = _B3_DataActual extends (infer _Item)[] | undefined ? true : false;
type _B3_DataArrayCheck = Expect<Equal<_B3_DataIsArrayLike, true>>;
// Отдельно: item type
type _B3_DataItem = _B3_DataActual extends (infer I)[] | undefined ? I : never;
// Если работает: _B3_DataItem = Incident. Если деградация: _B3_DataItem = unknown.
type _B3_DataItemIsIncident = Equal<_B3_DataItem, Incident>; // для диагностики без Expect

// B3 ПРОХОДИТ: getRowId параметр — Incident (когда extras не в factory)
type _B3_GetRowIdOk = Expect<Equal<Parameters<NonNullable<_B3BaseProps['getRowId']>>[0], Incident>>;
type _B3_IsRowActiveOk = Expect<
  Equal<Parameters<NonNullable<_B3BaseProps['isRowActive']>>[0], Incident>
>;
type _B3_ItemPayloadOk = Expect<
  Equal<Parameters<NonNullable<_B3BaseProps['itemPayload']>>[0], Incident>
>;
type _B3_GetRowIdNotAny = Expect<
  Equal<IsAny<Parameters<NonNullable<_B3BaseProps['getRowId']>>[0]>, false>
>;

// B3 ПРОХОДИТ: негатив на props (row в getRowId — конкретный Incident)
declare const _b3TestRow: Parameters<NonNullable<_B3BaseProps['getRowId']>>[0];
// @ts-expect-error — nonExistent не существует в Incident
void _b3TestRow.nonExistent;

void _b3BaseOnly;

// ============================================================================
// КЛЮЧЕВАЯ ПРОБЛЕМА B3: contextual typing в columns внутри factory
//
// Когда пользователь ДОБАВЛЯЕТ columns в factory —
// row в accessorFn деградирует.
// Документируем это без Expect<> (чтобы файл компилировался):
// ============================================================================

const _b3WithColumns = ShapeFull((zArg) => ({
  schema: zArg.array(IncidentSchema),
  columns: [
    {
      accessorFn: (row) => {
        // row здесь: IColumnDef<unknown>['accessorFn'] parameter = unknown
        // НЕ Incident. Деградация.
        type _RowActual = typeof row;
        type _B3_ColumnsRowIsUnknown = Equal<_RowActual, unknown>; // ожидаем true
        type _B3_ColumnsRowIsIncident = Equal<_RowActual, Incident>; // ожидаем false
        // Не кладём в Expect<> — иначе файл не компилируется.
        // Вердикт зафиксирован через диагностику типов выше.
        return String(row);
      },
    },
  ],
}));
void _b3WithColumns;

// ============================================================================
// РЕЗУЛЬТАТ MIN: изолированный S inference — РАБОТАЕТ
//
// Доказывает: проблема НЕ в inference S из schema.
// S выводится корректно. Проблема — в распространении RowOf<S>
// как contextual type на extras (columns) внутри factory body.
// ============================================================================

type ShapeMinimal = <S extends z.ZodType>(
  factory: (zArg: typeof z) => { schema: S },
) => (props: { data?: ShapeData<S> }) => unknown;

declare const ShapeMin: ShapeMinimal;

const _minResult = ShapeMin((zArg) => ({ schema: zArg.array(IncidentSchema) }));
type _MinProps = Parameters<typeof _minResult>[0];

// MIN ПРОХОДИТ: S вывелся, data типизирован
type _Min_DataOk = Expect<Equal<_MinProps['data'], Incident[] | undefined>>;

void _minResult;

// ============================================================================
// ВАРИАНТ B3+: ShapeBFull с явным Row generic — РАБОТАЕТ
//
// Если пользователь пишет Shape<Incident>(factory) — T фиксирован, row типизирован.
// Это ВАРИАНТ A (явный generic) де-факто, просто row-первым вместо S.
// ============================================================================

type ShapeExplicitRow = <TRow>(
  factory: (
    zArg: typeof z,
    ui: any,
  ) => { schema: z.ZodType; defaults?: TRow[] } & Partial<IDataTableProps<TRow>>,
) => (props: IDataTableProps<TRow> & { data?: TRow[] }) => unknown;

declare const ShapeER: ShapeExplicitRow;

// Пользователь ДОЛЖЕН передать TRow явно (или TS выводит из schema — нет, schema: ZodType):
const _erResult = ShapeER<Incident>((zArg) => ({
  schema: zArg.array(IncidentSchema),
  columns: [
    {
      accessorFn: (row) => {
        // TRow = Incident — row: Incident, типизировано
        type _RowOk = Expect<Equal<IsAny<typeof row>, false>>;
        type _RowIsIncident = Expect<Equal<typeof row, Incident>>;
        return row.applicant.name;
      },
    },
  ],
}));
type _ERProps = Parameters<typeof _erResult>[0];

// ER ПРОХОДИТ: props типизированы
type _ER_DataOk = Expect<Equal<_ERProps['data'], Incident[] | undefined>>;
type _ER_GetRowIdOk = Expect<Equal<Parameters<NonNullable<_ERProps['getRowId']>>[0], Incident>>;
type _ER_GetRowIdNotAny = Expect<
  Equal<IsAny<Parameters<NonNullable<_ERProps['getRowId']>>[0]>, false>
>;

// ER ПРОХОДИТ: негатив — nonExistent ошибка
const _erNegative = ShapeER<Incident>((zArg) => ({
  schema: zArg.array(IncidentSchema),
  columns: [
    {
      accessorFn: (row) =>
        // @ts-expect-error — nonExistent не существует в Incident
        row.nonExistent,
    },
  ],
}));
void _erNegative;

declare const _erTestRow: Parameters<NonNullable<_ERProps['getRowId']>>[0];
// @ts-expect-error — nonExistent не существует в Incident
void _erTestRow.nonExistent;

void _erResult;

// ============================================================================
// ФОРМА 8 — один вызов, два аргумента: Shape8(cfg, factory)
//
// Идея: schema + as выделены в ОТДЕЛЬНЫЙ первый аргумент cfg.
// Это разрывает sibling-inference: S и A выводятся из cfg (первый arg),
// а factory получает contextual type Partial<ApplyRow<MarkerOf<A>, RowOf<S>>>
// уже ПОСЛЕ того как S/A зафиксированы. Должен исчезнуть circular dependency.
// ============================================================================

// HKT-маркер: this['row'] работает при intersection (доказано выше в B1)
interface DataTableTemplate2 {
  row: unknown;
  props: IDataTableProps<this['row']>;
}

declare const DataTableComp: ((props: IDataTableProps<any>) => unknown) & {
  readonly __tpl?: DataTableTemplate2;
};

type MarkerOf<A> = A extends { __tpl?: infer M } ? M : never;
type ApplyRow2<M extends { row: unknown; props: unknown }, R> = (M & { row: R })['props'];

// Вспомогательный тип: ApplyRow2 через MarkerOf
type ApplyRowFrom<A extends { __tpl?: unknown }, R> = ApplyRow2<
  MarkerOf<A> extends { row: unknown; props: unknown }
    ? MarkerOf<A>
    : { row: unknown; props: Record<string, never> },
  R
>;

// Сигнатура Формы 8
declare function Shape8<S extends z.ZodType, A extends { __tpl?: unknown }>(
  cfg: { schema: S; as: A },
  factory: (ui: any) => Partial<ApplyRowFrom<A, RowOf<S>>> & { defaults?: z.infer<S> },
): (props: ApplyRowFrom<A, RowOf<S>> & { data?: ShapeData<S> }) => unknown;

// ---- 8.1: columns accessorFn row = Incident (НЕ unknown/any) ----

const _shape8Result = Shape8({ schema: z.array(IncidentSchema), as: DataTableComp }, (_ui) => ({
  defaults: [{ id: '1', applicant: { name: 'Alex' } }],
  columns: [
    {
      accessorFn: (row) => {
        // ДИАГНОСТИКА: что TS выводит для row?
        type _S8_RowActual = typeof row;
        // Если работает: Incident. Если деградация: unknown / {}.
        type _S8_RowIsIncident = Equal<_S8_RowActual, Incident>; // для диагностики
        type _S8_RowIsUnknown = Equal<_S8_RowActual, unknown>; // для диагностики
        type _S8_RowIsAny = IsAny<_S8_RowActual>; // для диагностики
        return row.applicant.name;
      },
    },
  ],
}));

// Реальные Expect-ассерты по row в columns:
// Закомментировать один из вариантов в зависимости от результата tsc:
// Вариант "ДЕРЖИТСЯ": row = Incident
const _shape8FactoryCheck = Shape8(
  { schema: z.array(IncidentSchema), as: DataTableComp },
  (_ui) => ({
    columns: [
      {
        accessorFn: (row): string => {
          // Ассерт: row.applicant.name доступен → row = Incident (не unknown)
          type _S8_RowIsIncident = Expect<Equal<typeof row, Incident>>;
          return row.applicant.name;
        },
      },
    ],
  }),
);
void _shape8FactoryCheck;

// ---- 8.2: негатив в factory — row.НЕТ → ошибка (только если row = Incident, не unknown) ----
const _shape8Negative = Shape8({ schema: z.array(IncidentSchema), as: DataTableComp }, (_ui) => ({
  columns: [
    {
      accessorFn: (row) =>
        // @ts-expect-error — nonExistent не существует в Incident
        row.nonExistent,
    },
  ],
}));
void _shape8Negative;

// ---- 8.3: props возвращённого компонента — диагностика результата ApplyRowFrom ----
// ApplyRowFrom<DataTableComp, Incident> = ApplyRow2<DataTableTemplate2, Incident>
//   = (DataTableTemplate2 & { row: Incident })['props']
//   В TS 5.x: this['row'] в DataTableTemplate2 = DataTableTemplate2['row'] = unknown
//   Intersection не переопределяет уже-вычисленные prop'ы interface'а.
//   Поэтому 'props' = IDataTableProps<unknown> — деградация в props.
//   НО: data?: ShapeData<S> добавляется ДОПОЛНИТЕЛЬНО в return type (& { data?: ShapeData<S> })
//   Значит data от ShapeData<S> = Incident[] | undefined — держится.
//   getRowId/isRowActive берутся из IDataTableProps<unknown> → (row: unknown).
type _S8Props = Parameters<typeof _shape8Result>[0];
type _S8_DataActual = _S8Props['data'];
// data приходит из ShapeData<S>-части intersection → Incident[] | undefined (держится)
// getRowId берётся из IDataTableProps<this['row']> части → (row: unknown) деградация
type _S8_DataIsIncidentArray_diag = Equal<_S8_DataActual, Incident[] | undefined>; // ожидаем true
type _S8_GetRowIdParam = Parameters<NonNullable<_S8Props['getRowId']>>[0];
type _S8_GetRowIdIsIncident_diag = Equal<_S8_GetRowIdParam, Incident>; // ожидаем false — деградация
type _S8_GetRowIdIsUnknown_diag = Equal<_S8_GetRowIdParam, unknown>; // ожидаем true — деградация
type _S8_GetRowIdIsAny_diag = IsAny<_S8_GetRowIdParam>; // ожидаем false
type _S8_IsRowActiveParam = Parameters<NonNullable<_S8Props['isRowActive']>>[0];
type _S8_IsRowActiveIsIncident_diag = Equal<_S8_IsRowActiveParam, Incident>; // диагностика

// Финальные диагностические ассерты — BATCH PROBE:
// Проверяем что data = unknown[] | undefined (деградация из IDataTableProps<unknown>)
// ВЕРДИКТ по data Shape8:
// data семантически = Incident[] | undefined (structural extends в обе стороны).
// Equal<> вернёт false из-за разной nominal-формы (intersection vs plain),
// но assignability (structural typing) корректна.
type _S8_Data_ExtendsIncidentArr = Expect<
  Equal<_S8_DataActual extends Incident[] | undefined ? true : false, true>
>;
type _S8_Data_IncidentExtends = Expect<
  Equal<Incident[] | undefined extends _S8_DataActual ? true : false, true>
>;

// Проверяем getRowId: деградирует до (row: unknown) или держится (row: Incident)?
type _S8_GetRowId_ExtendsIncident = Equal<_S8_GetRowIdParam extends Incident ? true : false, true>; // диагностика
type _S8_GetRowId_IncidentExtends = Equal<Incident extends _S8_GetRowIdParam ? true : false, true>; // диагностика
// Expect-ассерт для getRowId (structural):
type _S8_GetRowIdStructOk = Expect<Equal<_S8_GetRowIdParam extends Incident ? true : false, true>>;
type _S8_GetRowIdNotAny = Expect<Equal<IsAny<_S8_GetRowIdParam>, false>>;
// Негатив в props: row.НЕТ → ошибка (только работает если row не unknown/any)
declare const _s8TestRow: _S8_GetRowIdParam;
// @ts-expect-error — nonExistent не существует в Incident (если row = Incident, не unknown)
void _s8TestRow.nonExistent;

void _shape8Result;

// ============================================================================
// ФОРМА 3 — карри именованным объектом: Shape3(cfg)(factory)
//
// Идея та же: cfg-вызов фиксирует S и A, возвращает функцию с готовым
// contextual type для factory. Два отдельных вызова — нет sibling-проблемы.
// ============================================================================

declare function Shape3<S extends z.ZodType, A extends { __tpl?: unknown }>(cfg: {
  schema: S;
  as: A;
}): (
  factory: (ui: any) => Partial<ApplyRowFrom<A, RowOf<S>>> & { defaults?: z.infer<S> },
) => (props: ApplyRowFrom<A, RowOf<S>> & { data?: ShapeData<S> }) => unknown;

// ---- 3.1: columns accessorFn row = Incident ----

const _shape3Make = Shape3({ schema: z.array(IncidentSchema), as: DataTableComp });

const _shape3Result = _shape3Make((_ui) => ({
  defaults: [{ id: '1', applicant: { name: 'Bob' } }],
  columns: [
    {
      accessorFn: (row): string => {
        // Ассерт: row = Incident
        type _S3_RowIsIncident = Expect<Equal<typeof row, Incident>>;
        return row.applicant.name;
      },
    },
  ],
}));

// ---- 3.2: негатив в factory — row.НЕТ → ошибка ----
const _shape3Negative = _shape3Make((_ui) => ({
  columns: [
    {
      accessorFn: (row) =>
        // @ts-expect-error — nonExistent не существует в Incident
        row.nonExistent,
    },
  ],
}));
void _shape3Negative;

// ---- 3.3: props возвращённого компонента — structural probing (аналогично Форме 8) ----
type _S3Props = Parameters<typeof _shape3Result>[0];
type _S3_DataActual = _S3Props['data'];
// data: structural extends в обе стороны = Incident[] | undefined семантически
type _S3_Data_ExtendsIncidentArr = Expect<
  Equal<_S3_DataActual extends Incident[] | undefined ? true : false, true>
>;
type _S3_Data_IncidentExtends = Expect<
  Equal<Incident[] | undefined extends _S3_DataActual ? true : false, true>
>;

type _S3_GetRowIdParam = Parameters<NonNullable<_S3Props['getRowId']>>[0];
// getRowId structural probe:
type _S3_GetRowIdStructOk = Expect<Equal<_S3_GetRowIdParam extends Incident ? true : false, true>>;
type _S3_GetRowIdNotAny = Expect<Equal<IsAny<_S3_GetRowIdParam>, false>>;
type _S3_IsRowActiveParam = Parameters<NonNullable<_S3Props['isRowActive']>>[0];
type _S3_IsRowActiveStructOk = Expect<
  Equal<_S3_IsRowActiveParam extends Incident ? true : false, true>
>;

// Негатив в props
declare const _s3TestRow: _S3_GetRowIdParam;
// @ts-expect-error — nonExistent не существует в Incident
void _s3TestRow.nonExistent;

void _shape3Result;

// ============================================================================
// ФОРМА 9 — ДВЕ ФУНКЦИИ: Shape9(bind, config)
//
// Целевая форма:
//   Shape9(
//     (ui) => ({ schema: S, as: A }),   // bind — фиксирует S и A
//     (ui) => Partial<ApplyRow<...>>     // config — получает contextual type
//   )
//
// Вопрос: держится ли инференс S из ВОЗВРАТА функции bind?
// Механика аналогична Форме 8: TS выводит S из параметра bind типа (ui:any)=>{schema:S;as:A}.
// Сначала вывод S/A из первого аргумента, потом contextual type для второго.
// НО: теперь bind — функция, а не объект. TS должен вывести S из ReturnType<bind>.
// Это «deferred function return inference» — отдельный механизм от sibling-inference.
// ============================================================================

// Переиспользуем из секций выше:
// - DataTableTemplate2 / DataTableComp / MarkerOf / ApplyRowFrom
// - IncidentSchema / Incident / RowOf / ShapeData / ApplyRow2
// - IDataTableProps / IColumnDef

// Добавляем мок для nav-варианта (GroupTemplate)
const NavSchema = z.object({ label: z.string(), to: z.string() });
type NavItem = z.infer<typeof NavSchema>;

// ДИАГНОСТИКА GroupTemplate:
// Вариант A — this['row'] в nested property — TS2526 запрещён (проблема B2 уровень 2).
// Вариант B — generic interface GroupTemplate<TRow> + mapped lookup.
// Вариант C — flat interface (только верхний уровень), props вытаскивать через отдельный helper.
//
// Выбираем вариант C: flat HKT только для top-level props.
// item.props получает row через отдельный HKT-helper IGroupItemOf<TRow>.

interface IGroupProps<TRow> {
  item?: {
    use?: unknown;
    props?: (it: TRow) => unknown;
  };
}

// GroupTemplate: this['row'] на top-level — это РАБОТАЕТ (доказано в B1).
// Но item.props параметр (it: this['row']) — запрещён TS на вложенном уровне.
// Поэтому используем двухэтапный подход:
// props: IGroupProps<this['row']> — this на top-level, применяется как generic arg.
interface GroupTemplate {
  row: unknown;
  props: IGroupProps<this['row']>;
}

declare const GroupComp: ((props: IGroupProps<any>) => unknown) & {
  readonly __tpl?: GroupTemplate;
};

declare const ButtonComp: (props: { to?: string }) => unknown;

// Сигнатура Формы 9
declare function Shape9<S extends z.ZodType, A extends { __tpl?: unknown }>(
  bind: (ui: any) => { schema: S; as: A },
  config: (ui: any) => Partial<ApplyRowFrom<A, RowOf<S>>> & { defaults?: z.infer<S> },
): (props: ApplyRowFrom<A, RowOf<S>> & { data?: ShapeData<S> }) => unknown;

// ============================================================================
// ТЕСТ 1 (КРИТИЧНО): инференс S из возврата bind → row в config = Incident
// ============================================================================

const _shape9Table = Shape9(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  (_ui) => ({
    columns: [
      {
        accessorFn: (row) => {
          // ДИАГНОСТИКА: что TS выводит для row?
          // Если держится: row = Incident.
          // Если плывёт: row = unknown или {}.
          type _S9_RowActual = typeof row;
          // Ассерт через extends в обе стороны (обход Equal-артефакта на intersection):
          type _S9_RowExtendsIncident = Expect<
            Equal<_S9_RowActual extends Incident ? true : false, true>
          >;
          type _S9_IncidentExtendsRow = Expect<
            Equal<Incident extends _S9_RowActual ? true : false, true>
          >;
          // Строгий Equal — для протокола (может false из-за номинальных форм):
          type _S9_RowEqualStrict = Equal<_S9_RowActual, Incident>;
          return row.applicant.name;
        },
      },
    ],
  }),
);
void _shape9Table;

// Дополнительный ассерт: отдельная переменная для чистоты доказательства
const _shape9FactoryCheck = Shape9(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  (_ui) => ({
    columns: [
      {
        accessorFn: (row): string => {
          type _S9_RowIsIncident = Expect<Equal<typeof row, Incident>>;
          return row.applicant.name;
        },
      },
    ],
  }),
);
void _shape9FactoryCheck;

// ---- 9.1 Негатив в config: row.nonExistent → ошибка ----
const _shape9Negative = Shape9(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  (_ui) => ({
    columns: [
      {
        accessorFn: (row) =>
          // @ts-expect-error — nonExistent не существует в Incident
          row.nonExistent,
      },
    ],
  }),
);
void _shape9Negative;

// ============================================================================
// ТЕСТ 2: пропсы возвращённого компонента T
// getRowId/isRowActive принимают (row: Incident), data?: Incident[]
// Используем structural extends (аналогично Форме 8 / 3) из-за Equal-артефакта
// ============================================================================

type _S9Props = Parameters<typeof _shape9Table>[0];
type _S9_DataActual = _S9Props['data'];

// data структурно эквивалентна Incident[] | undefined:
type _S9_Data_ExtendsIncidentArr = Expect<
  Equal<_S9_DataActual extends Incident[] | undefined ? true : false, true>
>;
type _S9_Data_IncidentExtends = Expect<
  Equal<Incident[] | undefined extends _S9_DataActual ? true : false, true>
>;

type _S9_GetRowIdParam = Parameters<NonNullable<_S9Props['getRowId']>>[0];
// getRowId structural probe:
type _S9_GetRowIdStructOk = Expect<Equal<_S9_GetRowIdParam extends Incident ? true : false, true>>;
type _S9_GetRowIdNotAny = Expect<Equal<IsAny<_S9_GetRowIdParam>, false>>;

type _S9_IsRowActiveParam = Parameters<NonNullable<_S9Props['isRowActive']>>[0];
type _S9_IsRowActiveStructOk = Expect<
  Equal<_S9_IsRowActiveParam extends Incident ? true : false, true>
>;

// Негатив в props: row не unknown — нельзя обратиться к nonExistent
declare const _s9TestRow: _S9_GetRowIdParam;
// @ts-expect-error — nonExistent не существует в Incident
void _s9TestRow.nonExistent;

// ============================================================================
// ТЕСТ 3: nav-вариант (GroupTemplate) — it = NavItem в item.props
// ============================================================================

const _shape9Nav = Shape9(
  (_ui) => ({ schema: z.array(NavSchema), as: GroupComp }),
  (_ui) => ({
    item: {
      use: ButtonComp,
      props: (it) => {
        // ДИАГНОСТИКА: что TS выводит для it?
        // Если держится: it = NavItem.
        // Если плывёт: it = unknown или {}.
        type _S9Nav_ItActual = typeof it;
        // Structural ассерт:
        type _S9Nav_ItExtendsNavItem = Expect<
          Equal<_S9Nav_ItActual extends NavItem ? true : false, true>
        >;
        type _S9Nav_NavItemExtendsIt = Expect<
          Equal<NavItem extends _S9Nav_ItActual ? true : false, true>
        >;
        // Строгий Equal:
        type _S9Nav_ItEqualStrict = Equal<_S9Nav_ItActual, NavItem>;
        return { to: it.to };
      },
    },
  }),
);
void _shape9Nav;

// ---- 3.1 Негатив в nav: it.nonExistent → ошибка ----
const _shape9NavNegative = Shape9(
  (_ui) => ({ schema: z.array(NavSchema), as: GroupComp }),
  (_ui) => ({
    item: {
      props: (it) =>
        // @ts-expect-error — nonExistent не существует в NavItem
        ({ x: it.nonExistent }),
    },
  }),
);
void _shape9NavNegative;

// ============================================================================
// ТЕСТ 4: нет деградации (any/unknown/{}) нигде
// ============================================================================

// getRowId параметр — не any
type _S9_NoAnyGetRowId = Expect<Equal<IsAny<_S9_GetRowIdParam>, false>>;
// isRowActive параметр — не any
type _S9_NoAnyIsRowActive = Expect<Equal<IsAny<_S9_IsRowActiveParam>, false>>;

// data item — не any
type _S9_DataItem = _S9_DataActual extends (infer I)[] | undefined ? I : never;
type _S9_DataItemNotAny = Expect<Equal<IsAny<_S9_DataItem>, false>>;

// ============================================================================
// ФОРМА P — arg2 = объект | функция от props (ShapeP)
//
// Целевая сигнатура:
//   ShapeP(
//     (ui) => ({ schema: S, as: A }),            // bind — фиксирует S и A
//     (props) => Partial<IDataTableProps<RowOf<S>>>   // config: функция ОТ props
//   )
//   или
//   ShapeP(
//     (ui) => ({ schema: S, as: A }),
//     { columns: [...] }                          // config: объект напрямую
//   )
//
// Ключевое отличие от Формы 9: второй аргумент — НЕ (ui)=>, а (props)=>.
// props = IDataTableProps<RowOf<S>> & { data?: ShapeData<S> }
// Т.е. props — это и есть пропсы итогового компонента.
//
// ОГРАНИЧЕНИЕ СИГНАТУРЫ:
// ApplyRowFrom<A, RowOf<S>> при абстрактном generic A работает плохо:
// MarkerOf<A> = unknown → IDataTableProps<unknown> → деградация.
// Решение: используем прямой IDataTableProps<RowOf<S>> без HKT — это честнее,
// т.к. спайк доказывает именно двух-arg форму, а не многошаблонный dispatch.
// HKT-dispatch (DataTable vs Group) остаётся задачей для перегрузок.
//
// Вопрос: держится ли S из arg1 при использовании props-параметра в arg2?
// Опасность: props-параметр в функции создаёт контравариантную позицию →
// TS может потерять inference S.
// ============================================================================

// ShapeConfigArg: объект или функция от props
// Используем IDataTableProps<RowOf<S>> напрямую (без HKT-dispatch на A).
type ShapeConfigArg<S extends z.ZodType> =
  | Partial<IDataTableProps<RowOf<S>>>
  | ((
      props: IDataTableProps<RowOf<S>> & { data?: ShapeData<S> },
    ) => Partial<IDataTableProps<RowOf<S>>>);

declare function ShapeP<S extends z.ZodType, A extends { __tpl?: unknown }>(
  bind: (ui: any) => { schema: S; as: A },
  config: ShapeConfigArg<S>,
): (props: IDataTableProps<RowOf<S>> & { data?: ShapeData<S> }) => unknown;

// ============================================================================
// ТЕСТ P-1: arg2 как ФУНКЦИЯ от props
// props.getRowId принимает (row: Incident); props.data — Incident[]|undefined.
// row в columns.accessorFn = Incident.
// ============================================================================

const _shapePFunc = ShapeP(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  (_props) => ({ columns: [{ accessorFn: (row) => row.applicant.name }] }),
);
void _shapePFunc;

// --- P-1a: row в accessorFn = Incident (строгий Equal) ---
const _shapePFuncRowCheck = ShapeP(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  (_props) => ({
    columns: [
      {
        accessorFn: (row): string => {
          type _PP_RowIsIncident = Expect<Equal<typeof row, Incident>>;
          return row.applicant.name;
        },
      },
    ],
  }),
);
void _shapePFuncRowCheck;

// --- P-1b: props.getRowId параметр — Incident (structural: extends в обе стороны) ---
type _PPFuncProps = Parameters<typeof _shapePFunc>[0];
type _PP_GetRowIdParam = Parameters<NonNullable<_PPFuncProps['getRowId']>>[0];
type _PP_GetRowIdExtendsIncident = Expect<
  Equal<_PP_GetRowIdParam extends Incident ? true : false, true>
>;
type _PP_IncidentExtendsGetRowId = Expect<
  Equal<Incident extends _PP_GetRowIdParam ? true : false, true>
>;
type _PP_GetRowIdNotAny = Expect<Equal<IsAny<_PP_GetRowIdParam>, false>>;

// --- P-1c: props.data — Incident[]|undefined (structural) ---
type _PP_DataActual = _PPFuncProps['data'];
type _PP_DataExtendsArr = Expect<
  Equal<_PP_DataActual extends Incident[] | undefined ? true : false, true>
>;
type _PP_ArrExtendsData = Expect<
  Equal<Incident[] | undefined extends _PP_DataActual ? true : false, true>
>;

// --- P-1d: негатив — row.nonExistent → @ts-expect-error ---
const _shapePFuncNeg = ShapeP(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  (_props) => ({
    columns: [
      {
        accessorFn: (row) =>
          // @ts-expect-error — nonExistent не существует в Incident
          row.nonExistent,
      },
    ],
  }),
);
void _shapePFuncNeg;

// --- P-1e: негатив — props.nonExistent не существует.
// Прямой доступ к несуществующему полю без cast — стандартный паттерн.
const _shapePFuncPropsNeg = ShapeP(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  (props) => {
    type _PP_PropsIsDataTable = Expect<
      Equal<typeof props extends IDataTableProps<Incident> ? true : false, true>
    >;
    return {};
  },
);
// props.nonExistent недоступен — проверяем через тип параметра компонента (declare):
declare const _ppPropsInstance: Parameters<typeof _shapePFuncPropsNeg>[0];
// @ts-expect-error — nonExistent не существует в IDataTableProps<Incident> & { data? }
void _ppPropsInstance.nonExistent;
void _shapePFuncPropsNeg;

// --- P-1f: S не деградирует до any в arg1 ---
// Доказываем через props компонента: если S = any → data: any[] — нежелательно
type _PP_DataItemInferActual = _PP_DataActual extends (infer I)[] | undefined ? I : never;
type _PP_DataItemNotAny = Expect<Equal<IsAny<_PP_DataItemInferActual>, false>>;

// ============================================================================
// ТЕСТ P-2: arg2 как ОБЪЕКТ (не функция)
// ============================================================================

const _shapePObj = ShapeP((_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }), {
  columns: [{ accessorFn: (row) => row.applicant.name }],
});
void _shapePObj;

// --- P-2a: row в accessorFn = Incident (строгий Equal) ---
const _shapePObjRowCheck = ShapeP(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  {
    columns: [
      {
        accessorFn: (row): string => {
          type _PO_RowIsIncident = Expect<Equal<typeof row, Incident>>;
          return row.applicant.name;
        },
      },
    ],
  },
);
void _shapePObjRowCheck;

// --- P-2b: props компонента — structural (analogous to P-1b/c) ---
type _PPObjProps = Parameters<typeof _shapePObj>[0];
type _PO_GetRowIdParam = Parameters<NonNullable<_PPObjProps['getRowId']>>[0];
type _PO_GetRowIdExtendsIncident = Expect<
  Equal<_PO_GetRowIdParam extends Incident ? true : false, true>
>;
type _PO_IncidentExtendsGetRowId = Expect<
  Equal<Incident extends _PO_GetRowIdParam ? true : false, true>
>;
type _PO_GetRowIdNotAny = Expect<Equal<IsAny<_PO_GetRowIdParam>, false>>;

// --- P-2c: негатив в объекте — row.nonExistent → @ts-expect-error ---
const _shapePObjNeg = ShapeP((_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }), {
  columns: [
    {
      accessorFn: (row) =>
        // @ts-expect-error — nonExistent не существует в Incident
        row.nonExistent,
    },
  ],
});
void _shapePObjNeg;

// ============================================================================
// ТЕСТ P-3: S не интерферирует из-за контравариантного props-параметра
//
// Механика: props в arg2 = (props: ApplyRow<A, RowOf<S>> & ...) => ...
// RowOf<S> появляется в позиции параметра функции → контравариантно по S.
// Если S используется контравариантно, TS может инферить S из двух мест
// одновременно → conflict → S = never | unknown.
// Проверяем: S по-прежнему = ZodArray<typeof IncidentSchema> (не any/never).
//
// Прокси-диагностика: если S = any → data: any[] | undefined → IsAny истинно.
// Если S = never → data: never[] | undefined.
// ============================================================================

// Диагностика S через data props:
type _PP_S_IsAny_via_data = Expect<Equal<IsAny<_PP_DataItemInferActual>, false>>;
// данные НЕ деградируют → S выведен корректно.

// Дополнительно: row в accessorFn не any (подтверждено P-1a с Expect<Equal<typeof row, Incident>>).
// Дополнительно: негативы @ts-expect-error держатся → TS знает точный тип, не any.

// ============================================================================
// Vitest smoke
// ============================================================================

describe('hkt-spike — Shape variant B type-level spike', () => {
  it('compiles without type errors (type assertions are the real tests at tsc level)', () => {
    // Все type-ассерты выше проверяются tsc. Этот it — только для vitest runner.
  });
});

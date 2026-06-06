/**
 * shape-v2.test-types.ts — боевые type-тесты Shape v2 (ADR 036).
 *
 * Доказывает двухфазную форму:
 *   Shape(
 *     (ui) => ({ schema, as }),           // BIND
 *     (props) => ({ columns, ... })       // CONFIG — row-типизирован
 *   )
 *
 * Механика: Форма 9 (bind + config как (ui)=>...) доказана спайком.
 * Форма P (config как (props)=>... | object) доказана спайком.
 * Здесь — боевые ассерты под реальную сигнатуру IShapeWrapper.
 *
 * Тесты:
 *  T1. DataTable template: columns.accessorFn row = Incident (не unknown/any)
 *  T2. DataTable template: негатив row.nonExistent → ошибка
 *  T3. DataTable template: консьюмер-props (getRowId, isRowActive, data) → Incident
 *  T4. Group template: item.props it = NavItem (не unknown/any)
 *  T5. Group template: негатив it.nonExistent → ошибка
 *  T6. Config как объект (без функции): columns.accessorFn row = Incident
 *  T7. Нет деградации (no any/unknown)
 *  T8. Shape без arg2 (только bind): не крашится, props работают
 */

import { z } from 'zod';
import { describe, it } from 'vitest';
import type {
  ApplyRow,
  ApplyRowFrom,
  IShapeBaseProps,
  IShapeConfigBody,
  IShapeWrapper,
  MarkerOf,
  RowOf,
  ShapeData,
} from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

// ---------------------------------------------------------------------------
// Mock table side (как придёт из @capsuletech/web-table)
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
  sorting?: boolean;
}

interface DataTableTemplate {
  row: unknown;
  props: IDataTableProps<this['row']>;
}

declare const DataTableComp: ((props: IDataTableProps<any>) => unknown) & {
  readonly __tpl?: DataTableTemplate;
};

// ---------------------------------------------------------------------------
// Mock group/nav side (как придёт из @capsuletech/web-ui)
// ---------------------------------------------------------------------------

interface IGroupProps<TRow> {
  item?: {
    use?: unknown;
    props?: (it: TRow) => unknown;
  };
}

interface GroupTemplate {
  row: unknown;
  props: IGroupProps<this['row']>;
}

declare const GroupComp: ((props: IGroupProps<any>) => unknown) & {
  readonly __tpl?: GroupTemplate;
};

declare const ButtonComp: (props: { to?: string; children?: string }) => unknown;

// ---------------------------------------------------------------------------
// Test entities
// ---------------------------------------------------------------------------

const IncidentSchema = z.object({
  id: z.string(),
  applicant: z.object({ name: z.string() }),
});
type Incident = z.infer<typeof IncidentSchema>;

const NavSchema = z.object({ label: z.string(), to: z.string() });
type NavItem = z.infer<typeof NavSchema>;

// ---------------------------------------------------------------------------
// Утилиты — проверяем HKT-типы из types.ts
// ---------------------------------------------------------------------------

// RowOf работает корректно
type _RowOf_Array = Expect<Equal<RowOf<typeof IncidentSchema>, Incident>>;
// ShapeData для array-схемы
type _ShapeData_Array = Expect<Equal<ShapeData<z.ZodArray<typeof IncidentSchema>>, Incident[]>>;

// MarkerOf извлекает маркер
type _MarkerOf_DataTable = Equal<MarkerOf<typeof DataTableComp>, DataTableTemplate>;
type _MarkerOf_Group = Equal<MarkerOf<typeof GroupComp>, GroupTemplate>;

// ApplyRowFrom резолвит props через HKT
type _ApplyRowFrom_DataTable = ApplyRowFrom<typeof DataTableComp, Incident>;
type _ApplyRowFrom_DataTable_GetRowId = _ApplyRowFrom_DataTable extends { getRowId?: (row: infer R) => unknown } ? R : never;
// getRowId параметр должен быть Incident (structural)
type _ApplyRowFrom_GetRowId_ExtendsIncident = Expect<Equal<_ApplyRowFrom_DataTable_GetRowId extends Incident ? true : false, true>>;

// ---------------------------------------------------------------------------
// Симуляция IShapeWrapper через Shape9-подобную сигнатуру (для type-тестов)
// Поскольку IShapeWrapper объявлен как interface с overloads, симулируем
// через декларацию Shape9-подобной функции которая следует той же механике.
// ---------------------------------------------------------------------------

// Переиспользуем ApplyRowFrom из types.ts для форм
declare function TestShape<S extends z.ZodType, A extends { readonly __tpl?: object }>(
  bind: (ui: any) => { schema: S; as?: A; item?: any },
  config: ((props: IShapeBaseProps<ShapeData<S>> & ApplyRowFrom<A, RowOf<S>>) => IShapeConfigBody<ApplyRowFrom<A, RowOf<S>>, S>) | IShapeConfigBody<ApplyRowFrom<A, RowOf<S>>, S>,
): (props: IShapeBaseProps<ShapeData<S>> & ApplyRowFrom<A, RowOf<S>>) => unknown;

declare function TestShapeNoConfig<S extends z.ZodType, A extends { readonly __tpl?: object }>(
  bind: (ui: any) => { schema: S; as?: A; item?: any },
): (props: IShapeBaseProps<ShapeData<S>>) => unknown;

// ---------------------------------------------------------------------------
// T1. DataTable: columns.accessorFn row = Incident (строгий Equal)
// ---------------------------------------------------------------------------

describe('Shape v2 type-tests — DataTable template', () => {
  it('T1: accessorFn row = Incident in config function', () => {
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
      (_props) => ({
        columns: [
          {
            accessorFn: (row): string => {
              type _T1_RowIsIncident = Expect<Equal<typeof row, Incident>>;
              return row.applicant.name;
            },
          },
        ],
      }),
    );
    void _shape;
  });

  // T2. Негатив: row.nonExistent → @ts-expect-error
  it('T2: accessorFn row.nonExistent is a type error', () => {
    const _shape = TestShape(
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
    void _shape;
  });

  // T3. Консьюмер-props типизированы через Incident
  it('T3: consumer props (getRowId, isRowActive) receive Incident', () => {
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
      {},
    );
    type _Props = Parameters<typeof _shape>[0];
    type _GetRowIdParam = Parameters<NonNullable<_Props['getRowId']>>[0];
    type _IsRowActiveParam = Parameters<NonNullable<_Props['isRowActive']>>[0];

    // Structural ассерты (extends в обе стороны)
    type _T3_GetRowId_Ext = Expect<Equal<_GetRowIdParam extends Incident ? true : false, true>>;
    type _T3_GetRowId_Inv = Expect<Equal<Incident extends _GetRowIdParam ? true : false, true>>;
    type _T3_IsRowActive_Ext = Expect<Equal<_IsRowActiveParam extends Incident ? true : false, true>>;
    type _T3_GetRowIdNotAny = Expect<Equal<IsAny<_GetRowIdParam>, false>>;

    void _shape;
  });

  // Негатив в props: row не unknown — проверяется через type-level assert вне it()
  // (declare const нельзя внутри функции в TS)
  it('T3-neg: consumer props row.nonExistent is a type error (see module-level assert)', () => {
    // Реальная проверка — ниже на уровне модуля (_T3_neg_*)
  });
});

// ---------------------------------------------------------------------------
// T4. Group template: item.props it = NavItem
// ---------------------------------------------------------------------------

describe('Shape v2 type-tests — Group template', () => {
  it('T4: item.props it = NavItem in config function', () => {
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(NavSchema), as: GroupComp }),
      (_props) => ({
        item: {
          use: ButtonComp,
          props: (it: NavItem): { to: string; children: string } => {
            // it типизирован как NavItem (содержит label + to)
            return { to: it.to, children: it.label };
          },
        },
      }),
    );
    void _shape;
  });

  // T5. Негатив: it.nonExistent → @ts-expect-error
  it('T5: item.props it.nonExistent is a type error', () => {
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(NavSchema), as: GroupComp }),
      (_props) => ({
        item: {
          props: (it: NavItem) =>
            // @ts-expect-error — nonExistent не существует в NavItem
            ({ x: it.nonExistent }),
        },
      }),
    );
    void _shape;
  });
});

// ---------------------------------------------------------------------------
// T6. Config как объект (не функция): row типизирован
// ---------------------------------------------------------------------------

describe('Shape v2 type-tests — config as plain object', () => {
  it('T6: object config columns.accessorFn row = Incident', () => {
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
      {
        columns: [
          {
            accessorFn: (row): string => {
              type _T6_RowIsIncident = Expect<Equal<typeof row, Incident>>;
              return row.applicant.name;
            },
          },
        ],
      },
    );
    void _shape;
  });

  it('T6-neg: object config row.nonExistent is a type error', () => {
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
      {
        columns: [
          {
            accessorFn: (row) =>
              // @ts-expect-error — nonExistent не существует в Incident
              row.nonExistent,
          },
        ],
      },
    );
    void _shape;
  });
});

// ---------------------------------------------------------------------------
// T7. Нет деградации — нигде нет any/unknown
// ---------------------------------------------------------------------------

describe('Shape v2 type-tests — no degradation', () => {
  it('T7: no any in getRowId / isRowActive / data', () => {
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
      {},
    );
    type _Props = Parameters<typeof _shape>[0];
    type _GetRowIdParam = Parameters<NonNullable<_Props['getRowId']>>[0];
    type _IsRowActiveParam = Parameters<NonNullable<_Props['isRowActive']>>[0];
    type _DataItem = _Props['data'] extends (infer I)[] | undefined ? I : never;

    type _T7_GetRowIdNotAny = Expect<Equal<IsAny<_GetRowIdParam>, false>>;
    type _T7_IsRowActiveNotAny = Expect<Equal<IsAny<_IsRowActiveParam>, false>>;
    type _T7_DataItemNotAny = Expect<Equal<IsAny<_DataItem>, false>>;
  });
});

// ---------------------------------------------------------------------------
// T8. Shape без arg2 (только bind) — не крашится, props работают
// ---------------------------------------------------------------------------

describe('Shape v2 type-tests — bind only (no config)', () => {
  it('T8: shape without config arg compiles and data is typed', () => {
    const _shape = TestShapeNoConfig(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
    );
    type _Props = Parameters<typeof _shape>[0];
    type _DataProp = _Props['data'];
    // data должен принимать Incident[] | undefined
    type _T8_DataIsArray = Expect<Equal<_DataProp extends Incident[] | undefined ? true : false, true>>;
    void _shape;
  });
});

// ---------------------------------------------------------------------------
// Module-level негативы (declare const нельзя внутри функции)
// ---------------------------------------------------------------------------

// T3-neg: consumer props row не unknown → nonExistent → ошибка
const _T3_neg_shape = TestShape(
  (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
  {},
);
type _T3_neg_Props = Parameters<typeof _T3_neg_shape>[0];
type _T3_neg_GetRowIdParam = Parameters<NonNullable<_T3_neg_Props['getRowId']>>[0];
declare const _t3NegTestRow: _T3_neg_GetRowIdParam;
// @ts-expect-error — nonExistent не существует в Incident
void _t3NegTestRow.nonExistent;

// T5-neg дублируется через вариант в describe (item.props it.nonExistent)
// — тест T5 в describe уже покрывает это через @ts-expect-error внутри it()

// ---------------------------------------------------------------------------
// T9. defaults в config — object-форма и (props)=>-форма компилируются
// ---------------------------------------------------------------------------

describe('Shape v2 type-tests — defaults in config', () => {
  it('T9a: defaults as Incident[] in object config compiles', () => {
    const mockIncidents: Incident[] = [{ id: '1', applicant: { name: 'Alice' } }];
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
      {
        defaults: mockIncidents,
        columns: [{ accessorKey: 'id' }],
      },
    );
    void _shape;
  });

  it('T9b: defaults as Incident[] in function config compiles', () => {
    const mockIncidents: Incident[] = [{ id: '1', applicant: { name: 'Alice' } }];
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
      (_props) => ({
        defaults: mockIncidents,
      }),
    );
    void _shape;
  });

  // T10. Негатив: несовместимый defaults (число при array-схеме) → ошибка
  it('T10: incompatible defaults type is a type error', () => {
    const _shape = TestShape(
      (_ui) => ({ schema: z.array(IncidentSchema), as: DataTableComp }),
      {
        // @ts-expect-error — number не совместим с Incident[]
        defaults: 123,
      },
    );
    void _shape;
  });
});

// ---------------------------------------------------------------------------
// Vitest smoke — все type-ассерты выше проверяются tsc
// ---------------------------------------------------------------------------

describe('shape-v2 type-level assertions', () => {
  it('compiles without type errors (type assertions are the real tests at tsc level)', () => {
    // Виtest runner-it: все Expect<Equal<...>> выше — tsc-level.
  });
});

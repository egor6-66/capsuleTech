/**
 * shape-real-wrapper.test-types.ts — ЧЕСТНЫЙ репро на РЕАЛЬНОМ IShapeWrapper.
 *
 * Цель: доказать, что после удаления R-generic из overloads IShapeWrapper
 * реальная сигнатура (не TestShape-мок) доносит RowOf<S> = Incident в
 * arg2-коллбэк без ручной аннотации.
 *
 * Использует:
 *   - `declare const Shape: IShapeWrapper` (реальный тип, не мок)
 *   - MarkedComp с __tpl-маркером (ЧИСТЫЙ, не-union тип пропсов — как в спайке)
 *   - z.array(IncidentSchema) в arg1-bind
 *   - accessorFn: (row) => row.applicant.name  — row БЕЗ аннотации
 *
 * Ключевые ассерты:
 *   ПОЗИТИВ: typeof row extends Incident → true (не unknown/any)
 *   НЕГАТИВ: row.nonExistent → @ts-expect-error
 */

import { z } from 'zod';
import type { Component } from 'solid-js';
import { describe, it } from 'vitest';
import type { IShapeWrapper, IShapeUi, RowOf, ShapeData, ApplyRowFrom } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;

// ---------------------------------------------------------------------------
// Test entity — идентично спайку (hkt-spike)
// ---------------------------------------------------------------------------

const IncidentSchema = z.object({
  id: z.string(),
  applicant: z.object({ name: z.string() }),
});
type Incident = z.infer<typeof IncidentSchema>;

// ---------------------------------------------------------------------------
// Mock table template — ЧИСТЫЙ (не-union), с __tpl маркером.
// Форма идентична DataTableComp из доказанного спайка (форма 9/P).
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

// HKT-маркер: this['row'] на top-level — TS 5.x резолвит при intersection.
interface DataTableTemplate {
  row: unknown;
  props: IDataTableProps<this['row']>;
}

// Компонент-шаблон: ЧИСТЫЙ тип пропсов (IDataTableProps<any>), несёт __tpl.
// Форма идентична DataTableComp из hkt-spike.
// Возвращает JSX.Element-совместимый тип (Component<any> = Solid ValidComponent).
declare const MarkedComp: Component<IDataTableProps<any>> & {
  readonly __tpl?: DataTableTemplate;
};

// ---------------------------------------------------------------------------
// Реальный IShapeWrapper — не мок, не TestShape
// ---------------------------------------------------------------------------

declare const Shape: IShapeWrapper;

// ---------------------------------------------------------------------------
// CORE TEST: arg2-коллбэк получает row = Incident без аннотации
// ---------------------------------------------------------------------------

// Основной вызов — форма как у пользователя в приложении
const _s = Shape(
  (ui) => ({ schema: z.array(IncidentSchema), as: MarkedComp }),
  (props) => ({
    columns: [
      {
        accessorFn: (row) => row.applicant.name,
      },
    ],
  }),
);
void _s;

// Строгий ассерт: row = Incident (не unknown/any)
const _sCoreCheck = Shape(
  (ui) => ({ schema: z.array(IncidentSchema), as: MarkedComp }),
  (props) => ({
    columns: [
      {
        accessorFn: (row): string => {
          // ЯДРО: row должен быть Incident без аннотации
          type _CoreRowIsIncident = Expect<Equal<typeof row, Incident>>;
          type _CoreRowNotAny = Expect<Equal<IsAny<typeof row>, false>>;
          return row.applicant.name;
        },
      },
    ],
  }),
);
void _sCoreCheck;

// Негатив: row.nonExistent → ошибка (доказывает что row не any/unknown)
const _sCoreNeg = Shape(
  (ui) => ({ schema: z.array(IncidentSchema), as: MarkedComp }),
  (props) => ({
    columns: [
      {
        accessorFn: (row) =>
          // @ts-expect-error — nonExistent не существует в Incident
          row.nonExistent,
      },
    ],
  }),
);
void _sCoreNeg;

// ---------------------------------------------------------------------------
// Consumer-props: возвращённый компонент типизирован
// ---------------------------------------------------------------------------

type _ConsumerProps = Parameters<typeof _s>[0];
type _GetRowIdParam = Parameters<NonNullable<_ConsumerProps['getRowId']>>[0];
type _IsRowActiveParam = Parameters<NonNullable<_ConsumerProps['isRowActive']>>[0];
type _ItemPayloadParam = Parameters<NonNullable<_ConsumerProps['itemPayload']>>[0];
type _DataActual = _ConsumerProps['data'];

// getRowId/isRowActive/itemPayload принимают Incident (structural: extends в обе стороны)
type _GetRowId_ExtendsIncident = Expect<Equal<_GetRowIdParam extends Incident ? true : false, true>>;
type _GetRowId_IncidentExtends = Expect<Equal<Incident extends _GetRowIdParam ? true : false, true>>;
type _IsRowActive_ExtendsIncident = Expect<Equal<_IsRowActiveParam extends Incident ? true : false, true>>;
type _ItemPayload_ExtendsIncident = Expect<Equal<_ItemPayloadParam extends Incident ? true : false, true>>;
type _GetRowIdNotAny = Expect<Equal<IsAny<_GetRowIdParam>, false>>;

// data структурно = Incident[] | undefined
type _Data_ExtendsArr = Expect<Equal<_DataActual extends (Incident[] | undefined) ? true : false, true>>;
type _Data_ArrExtends = Expect<Equal<(Incident[] | undefined) extends _DataActual ? true : false, true>>;

// Негатив: row.nonExistent в consumer-props → ошибка
declare const _consumerRow: _GetRowIdParam;
// @ts-expect-error — nonExistent не существует в Incident
void _consumerRow.nonExistent;

// ---------------------------------------------------------------------------
// МОД C: ui.PreviewCard из IShapeUi (ADR 036 мод C)
//
// Доказывает, что IShapeUi теперь производится от IViewUiRaw, а не
// Record<string,any> → `ui.PreviewCard` несёт реальный тип компонента
// с phantom __tpl-маркером → row в arg2-коллбэке выводится без аннотации.
//
// PreviewCard принимает одиночный item (data: TRow), поэтому schema —
// z.object (не z.array). RowOf<ZodObject> = Incident (single row).
// ---------------------------------------------------------------------------

// Реальный IShapeUi (после Шага 2) — не Record<string,any>
declare const mockUi: IShapeUi;

// PreviewCard из IShapeUi должен нести __tpl (аналогично MarkedComp выше)
// Тест через typeof: тип ui.PreviewCard — это typeof PreviewCard из web-ui,
// который несёт __tpl-маркер. Проверяем: extends { __tpl? } → true.
type _UiPreviewCardType = (typeof mockUi)['PreviewCard'];
type _UiPreviewCardHasTpl = _UiPreviewCardType extends { readonly __tpl?: infer _M }
  ? true
  : false;
// Ассерт: ui.PreviewCard должен иметь __tpl (не Record<string,any>-based fallback)
type _ModC_HasMarker = Expect<Equal<_UiPreviewCardHasTpl, true>>;

// Полный вызов Shape с ui.PreviewCard из IShapeUi:
// PreviewCard: одиночный item → schema = z.object(...), RowOf<S> = Incident.
const _sModC = Shape(
  (ui: IShapeUi) => ({ schema: IncidentSchema, as: ui.PreviewCard }),
  (props) => ({
    fields: [
      {
        header: 'Applicant',
        accessorFn: (row) => {
          // МОД C ЯДРО: row = Incident выведен через ui.PreviewCard.__tpl из IShapeUi
          type _ModCRowIsIncident = Expect<Equal<typeof row, Incident>>;
          type _ModCRowNotAny = Expect<Equal<IsAny<typeof row>, false>>;
          return row.applicant.name;
        },
      },
    ],
  }),
);
void _sModC;

// Негатив: row.nonExistent → ошибка (ui.PreviewCard несёт реальный маркер, row не any)
const _sModCNeg = Shape(
  (ui: IShapeUi) => ({ schema: IncidentSchema, as: ui.PreviewCard }),
  (props) => ({
    fields: [
      {
        header: 'ID',
        accessorFn: (row) =>
          // @ts-expect-error — nonExistent не существует в Incident (мод C)
          row.nonExistent,
      },
    ],
  }),
);
void _sModCNeg;

// ---------------------------------------------------------------------------
// BATCH (nav-pattern): `child` в arg2 — row-типизирован из schema
//
// Доказывает: `child` переехал из arg1 в arg2 → `it` в `child.props` выводится
// как NavItem без аннотации (нет sibling-инференс с schema).
// Негатив: it.nonExistent → @ts-expect-error.
// arg2-коллбэк получает (ui, props) — ui: IShapeUi (первый аргумент).
// ---------------------------------------------------------------------------

const NavSchema = z.object({ label: z.string(), to: z.string() });
type NavItem = z.infer<typeof NavSchema>;

// Mock batch-container template
interface INavGroupProps<TRow> {
  child?: { use?: unknown; props?: (it: TRow) => unknown };
}
interface NavGroupTemplate { row: unknown; props: INavGroupProps<this['row']>; }
declare const NavGroupComp: Component<INavGroupProps<any>> & { readonly __tpl?: NavGroupTemplate };

// ПОЗИТИВ: child.props it = NavItem — без аннотации
const _sBatch = Shape(
  (ui) => ({ schema: z.array(NavSchema), as: NavGroupComp }),
  (ui, props) => ({
    child: {
      // ui доступен в arg2 для path-tracker (например ui.Button)
      use: ui.Button,
      props: (it) => {
        // ЯДРО: it должен быть NavItem без аннотации
        type _BatchItIsNavItem = Expect<Equal<typeof it, NavItem>>;
        type _BatchItNotAny = Expect<Equal<IsAny<typeof it>, false>>;
        return { to: it.to, children: it.label };
      },
    },
    defaults: [{ label: 'Home', to: '/' }],
  }),
);
void _sBatch;

// Строгий ассерт: it = NavItem
const _sBatchCheck = Shape(
  (ui) => ({ schema: z.array(NavSchema), as: NavGroupComp }),
  (ui, props) => ({
    child: {
      props: (it): Record<string, unknown> => {
        type _ItIsNavItem = Expect<Equal<typeof it, NavItem>>;
        type _ItNotAny = Expect<Equal<IsAny<typeof it>, false>>;
        return { to: it.to, label: it.label };
      },
    },
  }),
);
void _sBatchCheck;

// НЕГАТИВ: it.nonExistent → ошибка (доказывает что it не any/unknown)
const _sBatchNeg = Shape(
  (ui) => ({ schema: z.array(NavSchema), as: NavGroupComp }),
  (ui, props) => ({
    child: {
      props: (it) =>
        // @ts-expect-error — nonExistent не существует в NavItem
        ({ bad: it.nonExistent }),
    },
  }),
);
void _sBatchNeg;

// ОБЪЕКТНАЯ ФОРМА arg2 — child без функции (static конфиг)
const _sBatchObj = Shape(
  (ui) => ({ schema: z.array(NavSchema), as: NavGroupComp }),
  { defaults: [{ label: 'Static', to: '/static' }] },
);
void _sBatchObj;

// ---------------------------------------------------------------------------
// Vitest smoke
// ---------------------------------------------------------------------------

describe('shape-real-wrapper — IShapeWrapper type-level core test', () => {
  it('core: accessorFn row = Incident on real IShapeWrapper (no annotation)', () => {
    // Все Expect<Equal<...>> выше проверяются tsc — это runner-stub.
    void _sCoreCheck;
  });

  it('core-neg: accessorFn row.nonExistent is a type error on real IShapeWrapper', () => {
    void _sCoreNeg;
  });

  it('consumer-props: getRowId/isRowActive/itemPayload params = Incident', () => {
    void _s;
  });

  it('mod-C: ui.PreviewCard from IShapeUi carries __tpl marker (not Record<string,any>)', () => {
    void _sModC;
  });

  it('mod-C neg: accessorFn row.nonExistent is a type error when template = ui.PreviewCard', () => {
    void _sModCNeg;
  });

  it('batch: child.props it = NavItem without annotation (arg2 child, no sibling-infer)', () => {
    void _sBatchCheck;
  });

  it('batch-neg: child.props it.nonExistent is a type error (it not any)', () => {
    void _sBatchNeg;
  });

  it('batch: ui is available as first arg in config fn (arg2 ui-tracker)', () => {
    void _sBatch;
  });

  it('batch: object form of arg2 works (no child fn required)', () => {
    void _sBatchObj;
  });
});

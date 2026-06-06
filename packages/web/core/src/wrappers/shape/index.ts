export type { IShapeUiNamespace } from './context';
export { ShapeUiContext, useShapeUi } from './context';
export type {
  // v2 (двухфазная форма, ADR 036)
  ApplyRow,
  ApplyRowFrom,
  IShapeBind,
  IShapeBindFn,
  IShapeComponent,
  IShapeComponentProps,
  IShapeConfigArg,
  IShapeBaseProps,
  IShapeUi,
  IShapeWrapper,
  MarkerOf,
  RowOf,
  ShapeData,
  // deprecated (будут удалены после миграции apps)
  IShapeDefinition,
  IShapeFactory,
  ShapeItem,
} from './types';
export { Shape } from './wrapper';

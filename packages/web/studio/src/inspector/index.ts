export { FieldRenderer } from './fields';
export type { IParsedUnit } from './fields/parse-unit';
export { formatUnit, parseUnit } from './fields/parse-unit';
export { Inspector } from './Inspector';
export { DEFAULT_KIT } from './kit';
export { PropsPanel } from './PropsPanel';
export type {
  IBooleanField,
  ICategory,
  IFieldDef,
  IInspectorKit,
  IInspectorProps,
  INumberField,
  INumberUnitField,
  ISelectField,
  ITextareaField,
  ITextField,
  OnChangeFn,
  ValuesMap,
} from './types';
export { schemaToInspectorCategories } from './zod-to-categories';

import type { JSX } from 'solid-js';
import type { IInspectorKit } from '../kit';
import { DEFAULT_KIT } from '../kit';
import type { IFieldDef, OnChangeFn, ValuesMap } from '../types';
import { BooleanField } from './BooleanField';
import { NumberField } from './NumberField';
import { NumberUnitField } from './NumberUnitField';
import { SelectField } from './SelectField';
import { TextareaField } from './TextareaField';
import { TextField } from './TextField';

/**
 * Диспатчер по `field.type`. Каждый case передаёт уже-типизированный field
 * и пробрасывает изменения через единый `onChange(key, value)`.
 *
 * `kit` — инъектируемый UI-кит (по умолчанию DEFAULT_KIT из @capsuletech/web-ui).
 */
export const renderField = (
  field: IFieldDef,
  values: ValuesMap,
  onChange: OnChangeFn,
  kit: IInspectorKit = DEFAULT_KIT,
): JSX.Element => {
  const emit = (v: unknown) => onChange(field.key, v);
  const raw = values[field.key];
  switch (field.type) {
    case 'text':
      return (
        <TextField field={field} value={raw as string | undefined} onChange={emit} kit={kit} />
      );
    case 'textarea':
      return (
        <TextareaField field={field} value={raw as string | undefined} onChange={emit} kit={kit} />
      );
    case 'number':
      return (
        <NumberField field={field} value={raw as number | undefined} onChange={emit} kit={kit} />
      );
    case 'number-unit':
      return (
        <NumberUnitField
          field={field}
          value={raw as string | undefined}
          onChange={emit}
          kit={kit}
        />
      );
    case 'boolean':
      return (
        <BooleanField field={field} value={raw as boolean | undefined} onChange={emit} kit={kit} />
      );
    case 'select':
      return (
        <SelectField field={field} value={raw as string | undefined} onChange={emit} kit={kit} />
      );
    default:
      // exhaustive — TS подсветит если добавили новый тип и забыли тут
      return null;
  }
};

export { BooleanField, NumberField, NumberUnitField, SelectField, TextareaField, TextField };

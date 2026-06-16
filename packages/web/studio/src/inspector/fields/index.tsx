/**
 * FieldRenderer — Solid-компонент-диспатчер полей.
 *
 * Был обычной функцией `renderField` — возвращал JSX snapshot, не реактивный.
 * Теперь Solid Component: `<Switch>` диспатчит по `props.field.type`,
 * каждое поле читает `props.values[key]` реактивно через Solid props proxy
 * (values приходит из Solid Store) → изменения значений отражаются на
 * input'ах без re-mount → фокус сохраняется при вводе.
 */

import { type Component, Match, Switch } from 'solid-js';
import type { IInspectorKit } from '../kit';
import { DEFAULT_KIT } from '../kit';
import type {
  IBooleanField,
  IFieldDef,
  INumberField,
  INumberUnitField,
  ISelectField,
  ITextareaField,
  ITextField,
  OnChangeFn,
  ValuesMap,
} from '../types';
import { BooleanField } from './BooleanField';
import { NumberField } from './NumberField';
import { NumberUnitField } from './NumberUnitField';
import { SelectField } from './SelectField';
import { TextareaField } from './TextareaField';
import { TextField } from './TextField';

interface IFieldRendererProps {
  field: IFieldDef;
  values: ValuesMap;
  onChange: OnChangeFn;
  kit?: IInspectorKit;
}

export const FieldRenderer: Component<IFieldRendererProps> = (props) => {
  const kit = () => props.kit ?? DEFAULT_KIT;
  const emit = (v: unknown) => props.onChange(props.field.key, v);
  // value() читается реактивно — Solid wrap'ает JSX-выражение { ... value() ... }
  // в reactive computation. Когда values (Solid Store) меняется, обновляется
  // только value-prop у уже-смонтированного поля.
  const value = () => props.values[props.field.key];

  return (
    <Switch>
      <Match when={props.field.type === 'text'}>
        <TextField
          field={props.field as ITextField}
          value={value() as string | undefined}
          onChange={emit}
          kit={kit()}
        />
      </Match>
      <Match when={props.field.type === 'textarea'}>
        <TextareaField
          field={props.field as ITextareaField}
          value={value() as string | undefined}
          onChange={emit}
          kit={kit()}
        />
      </Match>
      <Match when={props.field.type === 'number'}>
        <NumberField
          field={props.field as INumberField}
          value={value() as number | undefined}
          onChange={emit}
          kit={kit()}
        />
      </Match>
      <Match when={props.field.type === 'number-unit'}>
        <NumberUnitField
          field={props.field as INumberUnitField}
          value={value() as string | undefined}
          onChange={emit}
          kit={kit()}
        />
      </Match>
      <Match when={props.field.type === 'boolean'}>
        <BooleanField
          field={props.field as IBooleanField}
          value={value() as boolean | undefined}
          onChange={emit}
          kit={kit()}
        />
      </Match>
      <Match when={props.field.type === 'select'}>
        <SelectField
          field={props.field as ISelectField}
          value={value() as string | undefined}
          onChange={emit}
          kit={kit()}
        />
      </Match>
    </Switch>
  );
};

export { BooleanField, NumberField, NumberUnitField, SelectField, TextareaField, TextField };

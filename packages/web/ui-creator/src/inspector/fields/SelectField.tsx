import type { IInspectorKit } from '../kit';
import type { ISelectField } from '../types';
import { FieldShell } from './FieldShell';

interface IProps {
  field: ISelectField;
  value: string | undefined;
  onChange: (v: string) => void;
  kit: IInspectorKit;
}

/** Выпадающий список — использует kit.Select (Select из @capsuletech/web-ui). */
export const SelectField = (props: IProps) => (
  <FieldShell label={props.field.label} hint={props.field.hint}>
    <props.kit.Select
      options={props.field.options.map((o) => ({ value: o.value, label: o.label ?? o.value }))}
      value={props.value ?? ''}
      disabled={props.field.disabled}
      onChange={props.onChange}
    />
  </FieldShell>
);

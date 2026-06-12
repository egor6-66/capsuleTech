import type { IInspectorKit } from '../kit';
import type { INumberField } from '../types';
import { FieldShell } from './FieldShell';

interface IProps {
  field: INumberField;
  value: number | undefined;
  onChange: (v: number) => void;
  kit: IInspectorKit;
}

export const NumberField = (props: IProps) => (
  <FieldShell label={props.field.label} hint={props.field.hint}>
    <props.kit.Input
      type="number"
      value={props.value ?? ''}
      min={props.field.min}
      max={props.field.max}
      step={props.field.step}
      disabled={props.field.disabled}
      onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) => {
        const v = e.currentTarget.valueAsNumber;
        if (!Number.isNaN(v)) props.onChange(v);
      }}
    />
  </FieldShell>
);

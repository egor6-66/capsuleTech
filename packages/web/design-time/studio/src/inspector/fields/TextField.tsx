import type { IInspectorKit } from '../kit';
import type { ITextField } from '../types';
import { FieldShell } from './FieldShell';

interface IProps {
  field: ITextField;
  value: string | undefined;
  onChange: (v: string) => void;
  kit: IInspectorKit;
}

export const TextField = (props: IProps) => (
  <FieldShell label={props.field.label} hint={props.field.hint}>
    <props.kit.Input
      type="text"
      classList={{ 'font-mono': props.field.mono }}
      value={props.value ?? ''}
      placeholder={props.field.placeholder}
      disabled={props.field.disabled}
      onInput={(e: InputEvent & { currentTarget: HTMLInputElement }) =>
        props.onChange(e.currentTarget.value)
      }
    />
  </FieldShell>
);

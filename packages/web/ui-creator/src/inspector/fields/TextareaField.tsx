import type { IInspectorKit } from '../kit';
import type { ITextareaField } from '../types';
import { FieldShell } from './FieldShell';

interface IProps {
  field: ITextareaField;
  value: string | undefined;
  onChange: (v: string) => void;
  kit: IInspectorKit;
}

/** Многострочный ввод — использует kit.Textarea (Textarea из @capsuletech/web-ui). */
export const TextareaField = (props: IProps) => {
  const monoClass = () => (props.field.mono ? ' font-mono' : '');

  return (
    <FieldShell label={props.field.label} hint={props.field.hint}>
      <props.kit.Textarea
        rows={props.field.rows ?? 3}
        class={`w-full resize-y${monoClass()}`}
        value={props.value ?? ''}
        placeholder={props.field.placeholder}
        disabled={props.field.disabled}
        onInput={(e: InputEvent & { currentTarget: HTMLTextAreaElement }) => props.onChange(e.currentTarget.value)}
      />
    </FieldShell>
  );
};

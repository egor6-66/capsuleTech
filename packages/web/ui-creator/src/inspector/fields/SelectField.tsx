import { For } from 'solid-js';
import type { IInspectorKit } from '../kit';
import type { ISelectField } from '../types';
import { FieldShell } from './FieldShell';

interface IProps {
  field: ISelectField;
  value: string | undefined;
  onChange: (v: string) => void;
  kit: IInspectorKit;
}

/**
 * Выпадающий список.
 *
 * Если кит содержит `Select` — используем его. Иначе нативный <select>.
 *
 * GAP: @capsuletech/web-ui не экспортирует Select-компонент (только DropdownMenu).
 * Эскалировать owner-web-ui: нужен `Select` на базе Kobalte Select/Listbox.
 */
export const SelectField = (props: IProps) => (
  <FieldShell label={props.field.label} hint={props.field.hint}>
    {props.kit.Select ? (
      <props.kit.Select
        value={props.value ?? ''}
        disabled={props.field.disabled}
        onChange={props.onChange}
      >
        <For each={props.field.options}>
          {(opt) => <option value={opt.value}>{opt.label ?? opt.value}</option>}
        </For>
      </props.kit.Select>
    ) : (
      // Нативный fallback до появления kit.Select
      <select
        class="w-full px-2 py-1 bg-white/5 border border-white/15 rounded text-sm outline-none focus:border-blue-400/60 transition-colors disabled:opacity-40"
        value={props.value ?? ''}
        disabled={props.field.disabled}
        onChange={(e) => props.onChange(e.currentTarget.value)}
      >
        <For each={props.field.options}>
          {(opt) => <option value={opt.value}>{opt.label ?? opt.value}</option>}
        </For>
      </select>
    )}
  </FieldShell>
);

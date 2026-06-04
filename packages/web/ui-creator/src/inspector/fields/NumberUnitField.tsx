import { createMemo } from 'solid-js';
import type { IInspectorKit } from '../kit';
import type { INumberUnitField } from '../types';
import { FieldShell } from './FieldShell';
import { formatUnit, parseUnit } from './parse-unit';

interface IProps {
  field: INumberUnitField;
  value: string | undefined;
  onChange: (v: string) => void;
  kit: IInspectorKit;
}

/** Число + единица измерения в одной строке. */
export const NumberUnitField = (props: IProps) => {
  const fallbackUnit = () => props.field.defaultUnit ?? props.field.units[0] ?? 'px';
  const parsed = createMemo(() => parseUnit(props.value, fallbackUnit()));

  const onNumberInput = (e: Event) => {
    const raw = (e.currentTarget as HTMLInputElement).valueAsNumber;
    if (Number.isNaN(raw)) return;
    props.onChange(formatUnit(raw, parsed().unit));
  };

  const onUnitChange = (nextUnit: string) => {
    props.onChange(formatUnit(parsed().value, nextUnit));
  };

  return (
    <FieldShell label={props.field.label} hint={props.field.hint}>
      <div class="flex gap-1">
        {/* Числовая часть — kit.Input */}
        <props.kit.Input
          type="number"
          step={props.field.step}
          class="flex-1 min-w-0"
          value={parsed().value ?? ''}
          disabled={props.field.disabled || parsed().unit === 'auto'}
          onInput={onNumberInput}
        />
        {/* Единица — kit.Select */}
        <props.kit.Select
          options={props.field.units.map((u) => ({ value: u, label: u }))}
          value={parsed().unit}
          disabled={props.field.disabled}
          onChange={onUnitChange}
          class="w-20 shrink-0"
        />
      </div>
    </FieldShell>
  );
};

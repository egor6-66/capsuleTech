import { createMemo } from 'solid-js';
import { formatOklch, parseOklch } from '../oklch';
import { Slider } from './Slider';

interface IProps {
  value: string;
  onChange: (oklch: string) => void;
}

/**
 * Три слайдера L/C/H для пиксельной подстройки primary. После выбора
 * пресета сразу видно текущие значения и можно сместить hue/lightness.
 */
export const OklchSliders = (props: IProps) => {
  const parsed = createMemo(() => parseOklch(props.value));

  const update = (patch: Partial<ReturnType<typeof parsed>>) => {
    props.onChange(formatOklch({ ...parsed(), ...patch }));
  };

  return (
    <div class="flex flex-col gap-2">
      <Labelled label="Lightness">
        <Slider
          value={parsed().l}
          min={0}
          max={1}
          step={0.01}
          precision={2}
          onChange={(l) => update({ l })}
        />
      </Labelled>
      <Labelled label="Chroma">
        <Slider
          value={parsed().c}
          min={0}
          max={0.4}
          step={0.005}
          precision={3}
          onChange={(c) => update({ c })}
        />
      </Labelled>
      <Labelled label="Hue">
        <Slider
          value={parsed().h}
          min={0}
          max={360}
          step={1}
          precision={0}
          unit="°"
          onChange={(h) => update({ h })}
        />
      </Labelled>
    </div>
  );
};

const Labelled = (p: { label: string; children: any }) => (
  <div class="flex items-center gap-3">
    <span class="text-xs text-muted-foreground w-20 shrink-0">{p.label}</span>
    <div class="flex-1">{p.children}</div>
  </div>
);

import { For } from 'solid-js';
import { FONT_OPTIONS } from '../presets';
import { Slider } from './Slider';

interface IProps {
  family: string;
  size: number;
  onFamilyChange: (stack: string) => void;
  onSizeChange: (v: number) => void;
}

/**
 * Два контрола: семейство (горизонтальный selector с превью каждого шрифта
 * собственным `font-family`) и базовый размер (slider).
 */
export const FontControl = (props: IProps) => (
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-3 gap-2">
      <For each={FONT_OPTIONS}>
        {(f) => {
          const isActive = () => props.family === f.stack;
          return (
            <button
              type="button"
              onClick={() => props.onFamilyChange(f.stack)}
              class="rounded-md border border-border bg-card/40 px-2.5 py-2 text-left text-sm transition-all hover:bg-card/80 hover:border-foreground/30"
              classList={{ 'ring-2 ring-ring shadow-md': isActive() }}
              style={{ 'font-family': f.stack }}
            >
              <div class="text-sm">{f.label}</div>
              <div class="text-[10px] text-muted-foreground truncate">Aa Bb Cc</div>
            </button>
          );
        }}
      </For>
    </div>
    <Slider
      value={props.size}
      min={0.75}
      max={1.25}
      step={0.0625}
      precision={3}
      unit="rem"
      onChange={props.onSizeChange}
    />
  </div>
);

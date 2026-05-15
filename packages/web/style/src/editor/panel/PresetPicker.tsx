import { For } from 'solid-js';
import { COLOR_PRESETS } from '../presets';

interface IProps {
  current: string;
  onPick: (oklch: string) => void;
}

/**
 * Сетка пресет-цветов. Activeное состояние — синий ring + лёгкая шкала.
 * Сами «капельки» — кружок с заливкой `var(--swatch)`, чтобы не зависеть
 * от темы.
 */
export const PresetPicker = (props: IProps) => (
  <div class="grid grid-cols-3 gap-2">
    <For each={COLOR_PRESETS}>
      {(p) => {
        const isActive = () => props.current === p.primary;
        return (
          <button
            type="button"
            onClick={() => props.onPick(p.primary)}
            class="group flex items-center gap-2 rounded-md border border-border bg-card/40 px-2.5 py-2 text-left text-sm transition-all hover:bg-card/80 hover:border-foreground/30"
            classList={{ 'ring-2 ring-ring shadow-md scale-[1.02]': isActive() }}
          >
            <span
              class="h-4 w-4 rounded-full ring-1 ring-foreground/20 shrink-0"
              style={{ background: p.primary }}
              aria-hidden
            />
            <span class="truncate">{p.label}</span>
          </button>
        );
      }}
    </For>
  </div>
);

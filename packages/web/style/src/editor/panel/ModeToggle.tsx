import { Moon, Sun } from 'lucide-solid';
import type { ThemeMode } from '../types';

interface IProps {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}

/**
 * Сегментный switch light/dark. Выбранный сегмент — primary-фон.
 * Кнопки покрывают всю секцию, чтобы кликабельная зона была щедрой.
 */
export const ModeToggle = (props: IProps) => (
  <div class="inline-flex rounded-md border border-border bg-card/40 p-1 gap-1">
    <button
      type="button"
      onClick={() => props.onChange('light')}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors"
      classList={{
        'bg-primary text-primary-foreground shadow-sm': props.mode === 'light',
        'text-muted-foreground hover:text-foreground': props.mode !== 'light',
      }}
    >
      <Sun size={14} />
      Light
    </button>
    <button
      type="button"
      onClick={() => props.onChange('dark')}
      class="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors"
      classList={{
        'bg-primary text-primary-foreground shadow-sm': props.mode === 'dark',
        'text-muted-foreground hover:text-foreground': props.mode !== 'dark',
      }}
    >
      <Moon size={14} />
      Dark
    </button>
  </div>
);

import type { IFontOption, IPresetColor, ITheme } from './types';

/**
 * Цветовые пресеты primary. Значения подсмотрены у shadcn (OKLCH) и
 * дают узнаваемые «бренд-настроения». Один OKLCH применяется и в light,
 * и в dark — shadcn делает так же, тонкая разница компенсируется
 * остальными токенами темы.
 */
export const COLOR_PRESETS: IPresetColor[] = [
  { id: 'zinc', label: 'Zinc', primary: 'oklch(0.21 0 0)' },
  { id: 'slate', label: 'Slate', primary: 'oklch(0.45 0.04 264)' },
  { id: 'stone', label: 'Stone', primary: 'oklch(0.27 0.01 50)' },
  { id: 'red', label: 'Red', primary: 'oklch(0.58 0.22 27)' },
  { id: 'rose', label: 'Rose', primary: 'oklch(0.65 0.22 16)' },
  { id: 'orange', label: 'Orange', primary: 'oklch(0.7 0.18 48)' },
  { id: 'green', label: 'Green', primary: 'oklch(0.6 0.16 158)' },
  { id: 'blue', label: 'Blue', primary: 'oklch(0.55 0.18 256)' },
  { id: 'violet', label: 'Violet', primary: 'oklch(0.55 0.22 285)' },
];

export const FONT_OPTIONS: IFontOption[] = [
  {
    id: 'system',
    label: 'System UI',
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: 'inter',
    label: 'Inter',
    stack: '"Inter", system-ui, sans-serif',
  },
  {
    id: 'geist',
    label: 'Geist',
    stack: '"Geist", "Inter", system-ui, sans-serif',
  },
  {
    id: 'mono',
    label: 'Mono',
    stack: '"JetBrains Mono", ui-monospace, "Cascadia Code", monospace',
  },
  {
    id: 'serif',
    label: 'Serif',
    stack: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  },
];

export const DEFAULT_THEME: ITheme = {
  mode: 'dark',
  primary: COLOR_PRESETS[7].primary, // Blue по дефолту
  radius: 0.5,
  spacingBase: 1,
  fontBaseSize: 1,
  fontFamily: FONT_OPTIONS[0].stack,
};

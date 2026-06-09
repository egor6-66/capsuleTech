import { contrastForeground } from './oklch';
import type { ITheme } from './types';

/**
 * Применяет тему к одному элементу как inline CSS-переменные. Так редактор
 * может быть scoped (только preview-зона) или глобальным (apply на
 * `document.documentElement`).
 *
 * Для `mode` переключает класс `.dark` на элементе — наш `index.css` уже
 * слушает `.dark` / `[data-theme="dark"]`.
 */
export const applyTheme = (el: HTMLElement, theme: ITheme): void => {
  el.style.setProperty('--primary', theme.primary);
  el.style.setProperty('--primary-foreground', contrastForeground(theme.primary));
  // `--ring` обычно идёт «по primary» — повторим, чтобы focus-кольцо тоже окрасилось.
  el.style.setProperty('--ring', theme.primary);
  el.style.setProperty('--radius', `${theme.radius}rem`);
  el.style.setProperty('--spacing', `${theme.spacingBase}rem`);
  el.style.setProperty('--font-size-base', `${theme.fontBaseSize}rem`);
  el.style.setProperty('font-family', theme.fontFamily);
  if (theme.mode === 'dark') el.classList.add('dark');
  else el.classList.remove('dark');
};

/** Полностью убирает все inline-overrides + класс `.dark`. */
export const resetTheme = (el: HTMLElement): void => {
  for (const prop of [
    '--primary',
    '--primary-foreground',
    '--ring',
    '--radius',
    '--spacing',
    '--font-size-base',
  ]) {
    el.style.removeProperty(prop);
  }
  el.style.removeProperty('font-family');
  el.classList.remove('dark');
};

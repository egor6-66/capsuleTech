import { contrastForeground } from './oklch';
import type { ITheme } from './types';

/**
 * Сериализует текущую тему в CSS-блок, готовый к копипасте в проектный
 * `globals.css` (или эквивалент). Покрывает только токены, которые реально
 * редактирует UI — остальные пусть берутся из проектных дефолтов.
 */
export const exportTheme = (theme: ITheme): string => {
  const root = theme.mode === 'dark' ? '.dark' : ':root';
  return `${root} {
  --primary: ${theme.primary};
  --primary-foreground: ${contrastForeground(theme.primary)};
  --ring: ${theme.primary};
  --radius: ${theme.radius}rem;
  --spacing-base: ${theme.spacingBase}rem;
  --text-base-size: ${theme.fontBaseSize}rem;
  font-family: ${theme.fontFamily};
}`;
};

/** Копирует в clipboard. Возвращает promise (для feedback). */
export const copyTheme = async (theme: ITheme): Promise<void> => {
  await navigator.clipboard.writeText(exportTheme(theme));
};

/**
 * Launcher presets — именованные конфигурации ВИДА лаунчера (рычаг №1 канона
 * [[feedback_product_wide_kit_layering]]).
 *
 * Пресет = композиция **замороженных** токенов spacing-шкалы + Typography-размеров
 * (ADR 042), НЕ новые классы. Цель: «studio-look» vs «learn-look» = выбор пресета.
 * Для пилота — один дефолт-пресет + заложенная точка расширения (`resolve...`).
 */

/** Размерная шкала Typography (совпадает с `ITypographyProps['size']`). */
type TypoSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

/** Разрешённая конфигурация вида Launcher (все значения — шаги spacing-шкалы / токены). */
export interface ILauncherPresetConfig {
  /** padding корневого контейнера. */
  padding: number;
  /** вертикальный зазор между hero / грид / hint. */
  outerGap: number;
  /** зазор внутри hero (title ↔ description). */
  heroGap: number;
  /** max-width hero-колонки. */
  heroMaxW: number;
  /** зазор между карточками. */
  gridGap: number;
  /** max-width грид-ряда карточек. */
  gridMaxW: number;
  /** размер заголовка hero. */
  titleSize: TypoSize;
  /** размер подзаголовка hero. */
  descriptionSize: TypoSize;
  /** размер hint. */
  hintSize: TypoSize;
}

export const launcherPresets: Readonly<Record<string, ILauncherPresetConfig>> = {
  /** Дефолт: центрированный hero + горизонтальный ряд карточек (learn-look). */
  default: {
    padding: 12,
    outerGap: 8,
    heroGap: 4,
    heroMaxW: 160,
    gridGap: 4,
    gridMaxW: 200,
    titleSize: '4xl',
    descriptionSize: 'lg',
    hintSize: 'sm',
  },
};

/** Резолвит имя пресета в конфиг. Неизвестное имя → дефолт (без падения). */
export const resolveLauncherPreset = (preset?: string): ILauncherPresetConfig =>
  launcherPresets[preset ?? 'default'] ?? launcherPresets.default;

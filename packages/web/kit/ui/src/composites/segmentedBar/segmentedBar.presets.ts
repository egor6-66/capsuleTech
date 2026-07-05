/**
 * SegmentedBar presets — именованные конфигурации ВИДА бара (рычаг №1 канона
 * [[feedback_product_wide_kit_layering]]).
 *
 * Пресет = композиция **замороженных** токенов/вариантов (ADR 042), НЕ новые
 * классы. Цель: «studio-look» vs «learn-look» = выбор пресета, не class-оверрайд.
 * Для пилота — один дефолт-пресет + заложенная точка расширения (`resolve...`).
 */

import type { ButtonVariants } from '../../primitives/button';
import type { IGroupProps } from '../../primitives/group';

type ButtonVariant = NonNullable<ButtonVariants['variant']>;

/** Разрешённая конфигурация вида SegmentedBar. */
export interface ISegmentedBarPresetConfig {
  /** Ось бара (`Group.orientation`). */
  orientation: NonNullable<IGroupProps['orientation']>;
  /** Вариант контейнера (`Group.variant`). `attached` = склеенный сегмент-контрол. */
  container: NonNullable<IGroupProps['variant']>;
  /** Вариант кнопки активного сегмента. */
  active: ButtonVariant;
  /** Вариант кнопки неактивного сегмента. */
  inactive: ButtonVariant;
}

export const segmentedBarPresets: Readonly<Record<string, ISegmentedBarPresetConfig>> = {
  /** Дефолт: горизонтальный склеенный сегмент-контрол, active=primary, inactive=ghost. */
  default: {
    orientation: 'horizontal',
    container: 'attached',
    active: 'default',
    inactive: 'ghost',
  },
};

/** Резолвит имя пресета в конфиг. Неизвестное имя → дефолт (без падения). */
export const resolveSegmentedBarPreset = (preset?: string): ISegmentedBarPresetConfig =>
  segmentedBarPresets[preset ?? 'default'] ?? segmentedBarPresets.default;

import type { VariantProps } from 'class-variance-authority';
import type { toggleTrackCva } from './variants';

export type ToggleVariants = VariantProps<typeof toggleTrackCva>;

export interface IToggleProps extends ToggleVariants {
  /** Controlled: текущее состояние. Если не задано — режим uncontrolled. */
  checked?: boolean;
  /** Начальное состояние для uncontrolled-режима. */
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Подпись справа от переключателя. Если не задана — рисуется только трек. */
  label?: string;
  class?: string;
}

import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';

import type { spinnerCva } from './variants';

export type SpinnerVariants = VariantProps<typeof spinnerCva>;

export interface ISpinnerProps extends SpinnerVariants {
  class?: string;
  style?: JSX.CSSProperties | string;
  /** Accessible label announced to screen readers. Defaults to 'Loading'. */
  label?: string;
}

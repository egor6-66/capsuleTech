import type { SliderRootProps } from '@kobalte/core/slider';
import type { JSX } from 'solid-js';

/**
 * Props for the Slider primitive.
 *
 * Wraps Kobalte `Slider.Root` with a simplified single-thumb API suited for
 * controlled float-range inputs (e.g. alpha 0–1).
 *
 * `value` / `onChange` operate on a single `number` (not `number[]`) to keep
 * the consumer API clean. Internally Kobalte uses `number[]`.
 */
export interface ISliderProps
  extends Omit<SliderRootProps, 'value' | 'defaultValue' | 'onChange' | 'onChangeEnd'> {
  /**
   * Controlled value. When provided the component is in controlled mode.
   * Should be kept in sync via `onChange`.
   */
  value?: number;

  /**
   * Initial value for uncontrolled mode.
   * @default min (0 by default)
   */
  defaultValue?: number;

  /** Fired on every value change while dragging / arrowing. */
  onChange?: (value: number) => void;

  /** Fired once when the interaction ends (pointer-up / key-up). */
  onChangeEnd?: (value: number) => void;

  /**
   * Minimum value.
   * @default 0
   */
  min?: number;

  /**
   * Maximum value.
   * @default 1
   */
  max?: number;

  /**
   * Step increment.
   * @default 0.01
   */
  step?: number;

  /**
   * Optional label rendered above the slider.
   * If omitted only the track + thumb are rendered.
   */
  label?: string;

  /**
   * Whether to display the current numeric value next to the label.
   * @default false
   */
  showValue?: boolean;

  /** Extra CSS classes merged with the root element. */
  class?: string;

  /** Inline styles forwarded to the root element. */
  style?: JSX.CSSProperties | string;

  /** Whether the slider is disabled. */
  disabled?: boolean;
}

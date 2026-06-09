import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import type { textareaCva } from './variants';

export type TextareaVariants = VariantProps<typeof textareaCva>;

export interface ITextareaProps
  extends Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    TextareaVariants {
  /**
   * Controls `resize` CSS property.
   * - `none`      — no resize handle
   * - `vertical`  — default; resize only vertically
   * - `horizontal`— resize only horizontally
   * - `both`      — free resize
   */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  /** Initial value for uncontrolled usage (data-filled seed). Not in Solid JSX types. */
  defaultValue?: string | number;
}

import type { VariantProps } from 'class-variance-authority';
import type { JSX } from 'solid-js';
import type { inputCva } from './variants';

export type InputVariants = VariantProps<typeof inputCva>;

export interface IInputProps
  extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    InputVariants {
  /** Initial value for uncontrolled usage (data-filled seed). Not in Solid JSX types. */
  defaultValue?: string | number;
}

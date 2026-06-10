import { cva } from '@capsuletech/web-style';

import { INPUT_FIELD_BASE } from '../base';

export const variants = {
  variant: {
    default: '',
  },
  size: {
    // sm/lg override only py — base already carries px-input; twMerge resolves
    sm: 'py-1 text-xs',
    default: 'text-sm',
    lg: 'py-3 text-base',
  },
} as const;

export const textareaCva = cva(
  [
    INPUT_FIELD_BASE,
    // Textarea-specific: multiline, no fixed height; py-input from base was removed
    // (base now carries px-input only), so we restore vertical padding here.
    'py-input',
    // Textarea-specific layout
    'min-h-[80px] text-foreground',
    // Background state 2: filled (data-filled set by component when value is non-empty)
    'data-[filled]:bg-muted/40',
  ].join(' '),
  {
    variants,
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

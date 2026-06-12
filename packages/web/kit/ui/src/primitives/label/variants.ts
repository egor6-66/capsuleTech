import { cva } from '@capsuletech/web-style';

export const variants = {
  variant: {
    // text-primary: label text uses primary colour for visual hierarchy.
    // shadow removed — text-shadow on label text is inappropriate.
    default: 'text-primary',
  },
  size: {
    default: '',
  },
};

export const labelCva = cva(
  'text-sm font-medium leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants,
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

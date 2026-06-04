import { cva } from '@capsuletech/web-style';

export const variants = {
  variant: {
    default: '',
  },
  size: {
    sm: 'px-input py-1 text-xs',
    default: 'px-input py-input text-sm',
    lg: 'px-input py-3 text-base',
  },
} as const;

export const textareaCva = cva(
  'flex min-h-[80px] w-full rounded-md border border-input bg-background text-foreground shadow-sm transition-colors duration-fast placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants,
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

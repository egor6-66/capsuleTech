import { cva } from '@capsuletech/web-style';

export const variants = {
  variant: {
    default: '',
  },
  size: {
    default: '',
  },
  interactive: {
    true: 'cursor-pointer transition-colors duration-200 hover:bg-accent hover:text-accent-foreground',
    false: '',
  },
  selected: {
    true: 'bg-accent text-accent-foreground',
    false: '',
  },
  padding: {
    none: '',
    sm: 'p-card-tight',
    md: 'p-card',
  },
};

export const cardCva = cva('rounded-lg border bg-card text-card-foreground shadow', {
  variants,

  defaultVariants: {
    variant: 'default',
    size: 'default',
    interactive: false,
    selected: false,
  },
});

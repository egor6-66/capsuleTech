import { cva } from '@capsuletech/web-style';

export const listVariants = cva('flex w-full', {
  variants: {
    orientation: {
      vertical: 'flex-col gap-1',
      horizontal: 'flex-row gap-2 items-center',
    },
    variant: {
      default: 'p-1',
      flush: 'p-0 gap-0',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
    variant: 'default',
  },
});

/**
 * Selectable list leaf (`Ui.List.Item`). Migrates the studio palette's raw
 * leaf-button classes into the kit where they are legitimate. `selected`
 * variant supplies the accent highlight; hover/focus live in the base.
 */
export const selectableItemCva = cva(
  [
    'flex w-full cursor-pointer items-center gap-2 rounded-sm',
    'px-2 py-1.5 text-left text-xs text-muted-foreground',
    'transition-colors duration-200 outline-none',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:bg-accent focus-visible:text-accent-foreground',
    'focus-visible:ring-1 focus-visible:ring-ring',
  ].join(' '),
  {
    variants: {
      selected: {
        true: 'bg-accent text-accent-foreground',
        false: '',
      },
    },
    defaultVariants: {
      selected: false,
    },
  },
);

export const listItemVariants = cva(
  'flex items-center px-cell py-cell-tight rounded-md text-sm transition-colors duration-200 cursor-pointer outline-none shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:bg-accent hover:text-accent-foreground focus:bg-accent',
        active: 'bg-primary text-primary-foreground',
        ghost: 'hover:bg-muted',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

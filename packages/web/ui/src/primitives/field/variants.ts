import { cva } from '@capsuletech/web-style';

export const variants = {
  orientation: {
    vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
    horizontal: [
      'flex-row items-center',
      '[&>[data-slot=field-label]]:flex-auto',
      'has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px has-[>[data-slot=field-content]]:items-start',
    ],
    responsive: [
      '@md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto flex-col [&>*]:w-full [&>.sr-only]:w-auto',
      '@md/field-group:[&>[data-slot=field-label]]:flex-auto',
      '@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
    ],
  },
};

export const fieldCva = cva(
  // Field group container — layout only, no button chrome.
  // Orientation (flex-col / flex-row / responsive) is controlled via variants below.
  'flex w-full gap-2',
  {
    variants,
    defaultVariants: {
      orientation: 'vertical',
    },
  },
);

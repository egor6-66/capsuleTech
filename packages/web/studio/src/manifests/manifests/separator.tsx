import { z } from '@capsuletech/shared-zod';
import { Minus } from '@capsuletech/web-ui/icons';
import type { IComponentManifest } from '../types';

export const SeparatorManifest: IComponentManifest = {
  type: 'ui.Separator',
  label: 'Separator',
  category: 'feedback',
  icon: () => <Minus size={16} />,
  description: 'Визуальный разделитель — горизонтальный или вертикальный',
  isLeaf: true,
  defaultProps: {
    variant: 'horizontal',
  },
  propsSchema: z.object({
    variant: z.enum(['horizontal', 'vertical']).optional().default('horizontal'),
    class: z.string().optional(),
  }),
};

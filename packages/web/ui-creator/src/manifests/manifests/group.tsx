import { z } from '@capsuletech/shared-zod';
import { Group } from 'lucide-solid';
import type { IComponentManifest } from '../types';

export const GroupManifest: IComponentManifest = {
  type: 'ui.Group',
  label: 'Group',
  category: 'container',
  icon: () => <Group size={16} />,
  description: 'Flex-обёртка для группировки элементов (separate или attached)',
  canBeRoot: true,
  defaultProps: {
    orientation: 'horizontal',
    variant: 'separate',
    gap: 2,
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    orientation: z.enum(['horizontal', 'vertical']).optional().default('horizontal'),
    variant: z.enum(['separate', 'attached']).optional().default('separate'),
    gap: z.number().optional().default(2),
    class: z.string().optional(),
  }),
};

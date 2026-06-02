import { z } from '@capsuletech/shared-zod';
import { List } from 'lucide-solid';
import type { IComponentManifest } from '../types';

export const ListManifest: IComponentManifest = {
  type: 'ui.List',
  label: 'List',
  category: 'container',
  icon: () => <List size={16} />,
  description: 'Семантический список — принимает произвольные children',
  canBeRoot: true,
  defaultProps: {
    orientation: 'vertical',
    variant: 'default',
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    orientation: z.enum(['vertical', 'horizontal']).optional().default('vertical'),
    variant: z.enum(['default', 'flush']).optional().default('default'),
    class: z.string().optional(),
  }),
};

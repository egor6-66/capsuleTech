import { z } from '@capsuletech/shared-zod';
import { Tag } from '../../icons';
import type { IComponentManifest } from '../types';

export const LabelManifest: IComponentManifest = {
  type: 'ui.Label',
  label: 'Label',
  category: 'typography',
  icon: () => <Tag size={16} />,
  description: 'HTML-лейбл для форм — ассоциируется с полем через htmlFor',
  isLeaf: true,
  defaultProps: {
    children: 'Label',
  },
  propsSchema: z.object({
    children: z.string().default('Label'),
    class: z.string().optional(),
  }),
};

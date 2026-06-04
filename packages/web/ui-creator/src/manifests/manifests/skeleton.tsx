import { z } from '@capsuletech/shared-zod';
import { RectangleHorizontal } from '@capsuletech/web-ui/icons';
import type { IComponentManifest } from '../types';

export const SkeletonManifest: IComponentManifest = {
  type: 'ui.Skeleton',
  label: 'Skeleton',
  category: 'feedback',
  icon: () => <RectangleHorizontal size={16} />,
  description: 'Плейсхолдер контента — анимированный скелетон',
  isLeaf: true,
  defaultProps: {
    variant: 'text',
    rows: 3,
  },
  propsSchema: z.object({
    variant: z.enum(['text', 'table', 'list', 'card', 'map']).optional().default('text'),
    rows: z.number().optional().default(3),
    class: z.string().optional(),
  }),
};

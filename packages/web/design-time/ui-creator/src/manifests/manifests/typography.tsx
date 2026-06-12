import { z } from '@capsuletech/shared-zod';
import { Type } from '@capsuletech/web-ui/icons';
import type { IComponentManifest } from '../types';

export const TypographyManifest: IComponentManifest = {
  type: 'ui.Typography',
  label: 'Typography',
  category: 'typography',
  icon: () => <Type size={16} />,
  description: 'Текстовый блок с вариантами оформления (h1/h2/p/lead/muted/…)',
  isLeaf: true,
  defaultProps: {
    variant: 'p',
    color: 'default',
    children: 'Text',
  },
  propsSchema: z.object({
    variant: z.enum(['h1', 'h2', 'p', 'blockquote', 'code', 'lead', 'muted']).default('p'),
    color: z.enum(['default', 'muted', 'primary', 'destructive']).optional().default('default'),
    children: z.string().default('Text'),
    class: z.string().optional(),
  }),
};

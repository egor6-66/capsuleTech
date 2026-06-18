import { z } from '@capsuletech/shared-zod';
import { MousePointerClick } from '../../icons';
import type { IComponentManifest } from '../../manifest/types';
import { ButtonContract } from './button.contract';

export const ButtonManifest: IComponentManifest = {
  type: 'ui.Button',
  label: 'Button',
  category: 'control',
  icon: () => <MousePointerClick size={16} />,
  description: 'Кнопка с вариантами оформления',
  isLeaf: true,
  contract: ButtonContract,
  docSlug: 'web-ui/primitives/button',
  defaultProps: {
    variant: 'default',
    children: 'Button',
  },
  propsSchema: z.object({
    variant: z
      .enum(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'])
      .default('default'),
    children: z.string().default('Button'),
    class: z.string().optional(),
  }),
};

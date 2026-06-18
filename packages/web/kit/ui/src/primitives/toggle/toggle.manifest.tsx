import { z } from '@capsuletech/shared-zod';
import { ToggleLeft } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';

export const ToggleManifest: IPrimitiveManifestEntry = {
  type: 'ui.Toggle',
  label: 'Toggle',
  category: 'control',
  icon: () => <ToggleLeft size={16} />,
  description: 'Переключатель on/off с подписью',
  isLeaf: true,
  defaultProps: {
    size: 'md',
    defaultChecked: false,
  },
  propsSchema: z.object({
    size: z.enum(['sm', 'md', 'lg']).optional().default('md'),
    label: z.string().optional(),
    checked: z.boolean().optional(),
    defaultChecked: z.boolean().optional().default(false),
    disabled: z.boolean().optional(),
    class: z.string().optional(),
  }),
};

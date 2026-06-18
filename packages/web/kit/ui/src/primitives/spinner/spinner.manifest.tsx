import { z } from '@capsuletech/shared-zod';
import { Loader2 } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';

export const SpinnerManifest: IPrimitiveManifestEntry = {
  type: 'ui.Spinner',
  label: 'Spinner',
  category: 'feedback',
  icon: () => <Loader2 size={16} />,
  description: 'Индикатор загрузки — анимированный спиннер',
  isLeaf: true,
  defaultProps: {
    size: 'md',
  },
  propsSchema: z.object({
    size: z.enum(['sm', 'md', 'lg']).optional().default('md'),
    label: z.string().optional(),
    class: z.string().optional(),
  }),
};

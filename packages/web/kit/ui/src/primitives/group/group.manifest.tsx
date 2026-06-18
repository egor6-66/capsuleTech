import { z } from '@capsuletech/shared-zod';
import { Group } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';

export const GroupManifest: IPrimitiveManifestEntry = {
  type: 'ui.Group',
  label: 'Group',
  category: 'container',
  icon: () => <Group size={16} />,
  description: 'Flex-обёртка для группировки элементов (separate или attached)',
  canBeRoot: true,
  defaultProps: {
    orientation: 'horizontal',
    variant: 'separate',
    // gap: --space-tight — плотный шаг для inline-групп кнопок/тегов
    // (меньше, чем --space-component, который для крупных блоков).
    // В режиме attached gap игнорируется — only for separate mode.
    gap: 'var(--space-tight)',
    // padding через инлайн-стиль с CSS-токеном — всегда применяется, не требует
    // content-scan Tailwind в приложении-консьюмере. --space-component = краевой отступ группы.
    style: { padding: 'var(--space-component)' },
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    orientation: z.enum(['horizontal', 'vertical']).optional().default('horizontal'),
    variant: z.enum(['separate', 'attached']).optional().default('separate'),
    // gap: string (CSS value) или number (× 0.25rem). Предпочтителен токен-строкой.
    gap: z.union([z.number(), z.string()]).optional().default('var(--space-tight)'),
    style: z.record(z.string()).optional().default({ padding: 'var(--space-component)' }),
  }),
};

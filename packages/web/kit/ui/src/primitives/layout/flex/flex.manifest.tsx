import { z } from '@capsuletech/shared-zod';
import { Rows3 } from '../../../icons';
import type { IComponentManifest } from '../../../manifest/types';

export const FlexManifest: IComponentManifest = {
  type: 'ui.Layout.Flex',
  label: 'Flex',
  category: 'container',
  icon: () => <Rows3 size={16} />,
  description: 'Flexbox-контейнер: направление, выравнивание, gap',
  canBeRoot: true,
  defaultProps: {
    direction: 'col',
    // gap: --space-component — стандартный шаг между компонентами в колонке/строке.
    gap: 'var(--space-component)',
    class: 'w-full',
    // padding через инлайн-стиль с CSS-токеном — всегда применяется, не требует
    // content-scan Tailwind в приложении-консьюмере. --space-card = отступ карточки/секции.
    style: { padding: 'var(--space-card)' },
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    direction: z.enum(['row', 'row-reverse', 'col', 'col-reverse']).optional().default('col'),
    align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
    justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
    wrap: z.enum(['wrap', 'nowrap', 'wrap-reverse']).optional(),
    // gap: string (CSS value) или number (× 0.25rem). Предпочтителен токен-строкой.
    gap: z.union([z.number(), z.string()]).optional().default('var(--space-component)'),
    // h/w: число (spacing-шкала) или 'full' (100%).
    h: z.union([z.number(), z.literal('full')]).optional(),
    w: z.union([z.number(), z.literal('full')]).optional(),
    class: z.string().optional().default('w-full'),
    style: z.record(z.string()).optional().default({ padding: 'var(--space-card)' }),
  }),
};

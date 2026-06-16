import { z } from '@capsuletech/shared-zod';
import { LayoutGrid } from '../../../icons';
import type { IComponentManifest } from '../../../manifest/types';

export const GridManifest: IComponentManifest = {
  type: 'ui.Layout.Grid',
  label: 'Grid',
  category: 'container',
  icon: () => <LayoutGrid size={16} />,
  description: 'CSS-grid контейнер: равномерные колонки, строки, gap',
  canBeRoot: true,
  defaultProps: {
    cols: 2,
    // gap через семантический токен --space-component (расстояние между
    // компонентами внутри контейнера; density-aware, реагирует на --spacing-base).
    // toGap() в Grid/Flex передаёт строку напрямую в CSS gap.
    gap: 'var(--space-component)',
    class: 'w-full',
    // padding через инлайн-стиль с CSS-токеном — всегда применяется, не требует
    // content-scan Tailwind в приложении-консьюмере. --space-card = отступ карточки/секции.
    style: { padding: 'var(--space-card)' },
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    cols: z.number().optional().default(2),
    rows: z.number().optional(),
    // gap: string (CSS value) или number (× 0.25rem). Предпочтителен токен-строкой.
    gap: z.union([z.number(), z.string()]).optional().default('var(--space-component)'),
    class: z.string().optional().default('w-full'),
    style: z.record(z.string()).optional().default({ padding: 'var(--space-card)' }),
  }),
};

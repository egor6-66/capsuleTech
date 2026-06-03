import { z } from '@capsuletech/shared-zod';
import { LayoutGrid, Rows3 } from 'lucide-solid';
import type { IComponentManifest } from '../types';

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
    class: z.string().optional().default('w-full'),
    style: z.record(z.string()).optional().default({ padding: 'var(--space-card)' }),
  }),
};

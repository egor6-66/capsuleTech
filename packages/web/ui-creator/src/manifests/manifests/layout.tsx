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
    gap: 4,
    class: 'w-full',
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    cols: z.number().optional().default(2),
    rows: z.number().optional(),
    gap: z.number().optional().default(4),
    class: z.string().optional().default('w-full'),
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
    gap: 4,
    class: 'w-full',
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    direction: z.enum(['row', 'row-reverse', 'col', 'col-reverse']).optional().default('col'),
    align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
    justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
    wrap: z.enum(['wrap', 'nowrap', 'wrap-reverse']).optional(),
    gap: z.number().optional().default(4),
    class: z.string().optional().default('w-full'),
  }),
};

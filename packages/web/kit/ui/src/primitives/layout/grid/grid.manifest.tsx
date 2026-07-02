import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { LayoutGrid } from '../../../icons';
import type { IPrimitiveManifestEntry } from '../../../manifest/types';
import { GridContract } from './grid.contract';
import { gridPresets } from './grid.presets';

// Contract = root for props (cols, rows, gap, …). Manifest re-adds cols default
// + Inspector-only fields (class, style).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(GridContract);
if (!baseProps) throw new Error('GridContract has no props schema — add rule.props(...)');

export const GridManifest: IPrimitiveManifestEntry = {
  type: 'ui.Layout.Grid',
  label: 'Grid',
  category: 'container',
  icon: () => <LayoutGrid size={16} />,
  description: 'CSS-grid контейнер: равномерные колонки, строки, gap',
  canBeRoot: true,
  contract: GridContract,
  docSlug: 'web-ui/primitives/layout/grid',
  defaultProps: {
    cols: 2,
    // gap через семантический токен --space-component (density-aware).
    gap: 'var(--space-component)',
    class: 'w-full',
    // padding через инлайн-стиль с CSS-токеном — не требует Tailwind content-scan
    // в приложении-консьюмере. --space-card = отступ карточки/секции.
    style: { padding: 'var(--space-card)' },
  },
  styleSlots: ['root'],
  propsSchema: baseProps.extend({
    cols: z
      .union([z.number(), z.string(), z.array(z.string())])
      .optional()
      .default(2),
    class: z.string().optional().default('w-full'),
    style: z.record(z.string()).optional().default({ padding: 'var(--space-card)' }),
  }),
  presets: gridPresets,
};

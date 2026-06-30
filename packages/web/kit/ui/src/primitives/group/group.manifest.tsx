import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Group } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { GroupContract } from './group.contract';
import { groupPresets } from './group.presets';

// Contract = root for props (orientation, variant, gap).
// Manifest extends gap with default + Inspector-only style.
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(GroupContract);
if (!baseProps) throw new Error('GroupContract has no props schema — add rule.props(...)');

export const GroupManifest: IPrimitiveManifestEntry = {
  type: 'ui.Group',
  label: 'Group',
  category: 'container',
  icon: () => <Group size={16} />,
  description: 'Flex-обёртка для группировки элементов (separate или attached)',
  canBeRoot: true,
  contract: GroupContract,
  defaultProps: {
    orientation: 'horizontal',
    variant: 'separate',
    // gap: --space-tight — плотный шаг для inline-групп кнопок/тегов.
    gap: 'var(--space-tight)',
    // padding через инлайн-стиль с CSS-токеном — всегда применяется, не требует
    // content-scan Tailwind в приложении-консьюмере. --space-component = краевой отступ группы.
    style: { padding: 'var(--space-component)' },
  },
  styleSlots: ['root'],
  propsSchema: baseProps.extend({
    gap: z.union([z.number(), z.string()]).optional().default('var(--space-tight)'),
    style: z.record(z.string()).optional().default({ padding: 'var(--space-component)' }),
  }),
  presets: groupPresets,
};

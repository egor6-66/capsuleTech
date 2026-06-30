import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { List } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { ListContract } from './list.contract';
import { listPresets } from './list.presets';

// Contract = root for props (orientation, variant).
// Manifest extends with Inspector-only field (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(ListContract);
if (!baseProps) throw new Error('ListContract has no props schema — add rule.props(...)');

export const ListManifest: IPrimitiveManifestEntry = {
  type: 'ui.List',
  label: 'List',
  category: 'container',
  icon: () => <List size={16} />,
  description: 'Семантический список — принимает произвольные children',
  canBeRoot: true,
  contract: ListContract,
  defaultProps: {
    orientation: 'vertical',
    variant: 'default',
  },
  styleSlots: ['root'],
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: listPresets,
};

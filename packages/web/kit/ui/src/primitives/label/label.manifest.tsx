import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Tag } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { LabelContract } from './label.contract';
import { labelPresets } from './label.presets';

// Contract = root for props (for). Manifest extends with Inspector-only fields
// (children — текстовое содержимое, class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(LabelContract);
if (!baseProps) throw new Error('LabelContract has no props schema — add rule.props(...)');

export const LabelManifest: IPrimitiveManifestEntry = {
  type: 'ui.Label',
  label: 'Label',
  category: 'typography',
  icon: () => <Tag size={16} />,
  description: 'HTML-лейбл для форм — ассоциируется с полем через for',
  isLeaf: true,
  contract: LabelContract,
  docSlug: 'web-ui/primitives/label',
  defaultProps: {
    children: 'Label',
  },
  propsSchema: baseProps.extend({
    children: z.string().default('Label'),
    class: z.string().optional(),
  }),
  presets: labelPresets,
};

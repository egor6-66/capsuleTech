import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Minus } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { SeparatorContract } from './separator.contract';
import { separatorPresets } from './separator.presets';

// Contract = root for props (variant, orientation, decorative).
// Manifest extends with Inspector-only field (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(SeparatorContract);
if (!baseProps) throw new Error('SeparatorContract has no props schema — add rule.props(...)');

export const SeparatorManifest: IPrimitiveManifestEntry = {
  type: 'ui.Separator',
  label: 'Separator',
  category: 'feedback',
  icon: () => <Minus size={16} />,
  description: 'Визуальный разделитель — горизонтальный или вертикальный',
  isLeaf: true,
  contract: SeparatorContract,
  defaultProps: {
    variant: 'horizontal',
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: separatorPresets,
};

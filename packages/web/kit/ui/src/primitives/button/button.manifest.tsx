import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { MousePointerClick } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { ButtonContract } from './button.contract';
import { buttonPresets } from './button.presets';

// Contract = root for props (variant, size, disabled, loading, fullWidth, aria-invalid).
// Manifest extends with Inspector-only fields (children, class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(ButtonContract);
if (!baseProps) throw new Error('ButtonContract has no props schema — add rule.props(...)');

export const ButtonManifest: IPrimitiveManifestEntry = {
  type: 'ui.Button',
  label: 'Button',
  category: 'control',
  icon: () => <MousePointerClick size={16} />,
  description: 'Кнопка с вариантами оформления',
  isLeaf: true,
  contract: ButtonContract,
  docSlug: 'web-ui/primitives/button',
  defaultProps: {
    variant: 'default',
    children: 'Button',
  },
  propsSchema: baseProps.extend({
    children: z.string().default('Button'),
    class: z.string().optional(),
  }),
  presets: buttonPresets,
  fieldRule: (props) => (props.size === 'icon' ? { hidden: ['children'] } : {}),
};

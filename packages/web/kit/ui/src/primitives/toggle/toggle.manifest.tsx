import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { ToggleLeft } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { ToggleContract } from './toggle.contract';
import { togglePresets } from './toggle.presets';

// Contract = root for props (size, label, checked, defaultChecked, disabled, ...).
// Manifest extends with Inspector-only fields (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(ToggleContract);
if (!baseProps) throw new Error('ToggleContract has no props schema — add rule.props(...)');

export const ToggleManifest: IPrimitiveManifestEntry = {
  type: 'ui.Toggle',
  label: 'Toggle',
  category: 'control',
  icon: () => <ToggleLeft size={16} />,
  description: 'Переключатель on/off с подписью',
  isLeaf: true,
  contract: ToggleContract,
  docSlug: 'web-ui/primitives/toggle',
  defaultProps: {
    size: 'md',
    defaultChecked: false,
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: togglePresets,
  // fieldRule: не добавляем — нет реального UX-кейса, при котором поле теряет
  //            смысл в зависимости от значения другого (канон «не на гипотетике»).
};

import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { ChevronsUpDown } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { SelectContract } from './select.contract';
import { selectPresets } from './select.presets';

// Contract = root for props. Manifest extends with Inspector-only fields (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(SelectContract);
if (!baseProps) throw new Error('SelectContract has no props schema — add rule.props(...)');

export const SelectManifest: IPrimitiveManifestEntry = {
  type: 'ui.Select',
  label: 'Select',
  category: 'control',
  icon: () => <ChevronsUpDown size={16} />,
  description: 'Выпадающий список с выбором одного значения',
  isLeaf: true,
  contract: SelectContract,
  docSlug: 'web-ui/primitives/select',
  defaultProps: {
    placeholder: 'Выберите…',
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: selectPresets,
  // fieldRule: не добавляем без реального UX-кейса (канон «не на гипотетике»).
  //            Когда появится multi-select или async-options — может понадобиться.
};

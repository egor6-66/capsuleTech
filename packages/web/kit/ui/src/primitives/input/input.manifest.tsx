import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { TextCursorInput } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { InputContract } from './input.contract';
import { inputPresets } from './input.presets';

// Contract = root for props (type, placeholder, value, disabled, required, ...).
// Manifest extends with Inspector-only fields (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(InputContract);
if (!baseProps) throw new Error('InputContract has no props schema — add rule.props(...)');

export const InputManifest: IPrimitiveManifestEntry = {
  type: 'ui.Input',
  label: 'Input',
  category: 'control',
  icon: () => <TextCursorInput size={16} />,
  description: 'Однострочный текстовый ввод',
  isLeaf: true,
  contract: InputContract,
  docSlug: 'web-ui/primitives/input',
  defaultProps: {
    type: 'text',
    placeholder: '',
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: inputPresets,
  // fieldRule: пока не нужен — все поля имеют смысл при любом type'е.
  //            Если появится реальный кейс (например, скрывать pattern при type==='number')
  //            — добавим тогда, не на гипотетике.
};

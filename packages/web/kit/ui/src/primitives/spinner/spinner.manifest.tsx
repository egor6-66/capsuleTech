import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Loader2 } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { SpinnerContract } from './spinner.contract';
import { spinnerPresets } from './spinner.presets';

// Contract = root for props (size, label). Manifest extends with Inspector-only field (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(SpinnerContract);
if (!baseProps) throw new Error('SpinnerContract has no props schema — add rule.props(...)');

export const SpinnerManifest: IPrimitiveManifestEntry = {
  type: 'ui.Spinner',
  label: 'Spinner',
  category: 'feedback',
  icon: () => <Loader2 size={16} />,
  description: 'Индикатор загрузки — анимированный спиннер',
  isLeaf: true,
  contract: SpinnerContract,
  defaultProps: {
    size: 'md',
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: spinnerPresets,
};

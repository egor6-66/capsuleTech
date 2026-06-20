import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Type } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { TypographyContract } from './typography.contract';
import { typographyPresets } from './typography.presets';

// Contract = root for props. Manifest extends with Inspector-only fields
// (children = text content, class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(TypographyContract);
if (!baseProps) throw new Error('TypographyContract has no props schema — add rule.props(...)');

export const TypographyManifest: IPrimitiveManifestEntry = {
  type: 'ui.Typography',
  label: 'Typography',
  category: 'typography',
  icon: () => <Type size={16} />,
  description: 'Текстовый блок с вариантами оформления (h1/h2/p/lead/muted/…)',
  isLeaf: true,
  contract: TypographyContract,
  docSlug: 'web-ui/primitives/typography',
  defaultProps: {
    variant: 'p',
    children: 'Text',
  },
  propsSchema: baseProps.extend({
    children: z.string().default('Text'),
    class: z.string().optional(),
  }),
  presets: typographyPresets,
  // fieldRule: пока не нужен — все поля имеют смысл при любом variant'е.
  //            Возможный кейс на будущее: скрывать `size` для `code`-variant'а
  //            (моноширина обычно фиксирована); добавим когда появится реальное
  //            расхождение, не на гипотетике.
};

import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { FileText } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { ProseContract } from './prose.contract';
import { prosePresets } from './prose.presets';

// Contract = root for props. Manifest extends with Inspector-only fields
// (children = text content, class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(ProseContract);
if (!baseProps) throw new Error('ProseContract has no props schema — add rule.props(...)');

export const ProseManifest: IPrimitiveManifestEntry = {
  type: 'ui.Prose',
  label: 'Prose',
  category: 'typography',
  icon: () => <FileText size={16} />,
  description: 'Типографика для rendered-markdown: заголовки/списки/таблицы/код на токенах',
  isLeaf: true,
  contract: ProseContract,
  docSlug: 'web-ui/primitives/prose',
  defaultProps: {
    size: 'md',
    innerHTML: '<h2>Heading</h2><p>Rendered markdown body.</p>',
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: prosePresets,
};

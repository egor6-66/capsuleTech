import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Rows3 } from '../../../icons';
import type { IPrimitiveManifestEntry } from '../../../manifest/types';
import { FlexContract } from './flex.contract';
import { flexPresets } from './flex.presets';

// Contract = root for props. Manifest extends with Inspector-only fields (class, style).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(FlexContract);
if (!baseProps) throw new Error('FlexContract has no props schema — add rule.props(...)');

export const FlexManifest: IPrimitiveManifestEntry = {
  type: 'ui.Layout.Flex',
  label: 'Flex',
  category: 'container',
  icon: () => <Rows3 size={16} />,
  description: 'Flexbox-контейнер: направление, выравнивание, gap',
  // НЕ ставим isLeaf — Flex принимает детей.
  canBeRoot: true,
  contract: FlexContract,
  docSlug: 'web-ui/primitives/layout/flex',
  defaultProps: {
    direction: 'col',
    // gap токеном — стандартный шаг между компонентами в колонке/строке.
    gap: 'var(--space-component)',
    class: 'w-full',
    // padding через инлайн-стиль с CSS-токеном — не требует Tailwind content-scan
    // в приложении-консьюмере.
    style: { padding: 'var(--space-card)' },
  },
  propsSchema: baseProps.extend({
    class: z.string().optional().default('w-full'),
    style: z.record(z.string()).optional().default({ padding: 'var(--space-card)' }),
  }),
  presets: flexPresets,
  // styleSlots приходят из contract.surface (rule.styleSlots(['root'])).
  // fieldRule: НЕ добавляем. Возможный будущий кейс — скрывать `direction`,
  //            когда `orientation` задан (overlap), но это hint, не constraint;
  //            решим когда появится UX-боль.
};

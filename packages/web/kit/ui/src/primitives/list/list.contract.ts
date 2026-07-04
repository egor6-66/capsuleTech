import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

/**
 * ListContract — декларативный контракт List-контейнера для studio inspector,
 * palette preview, DnD-валидации.
 *
 * List — container, НЕ leaf. Палитра использует СЕМАНТИЧЕСКИЙ режим (plain
 * children-ноды). Batch (`data` + `item.use`) и render-prop (`items` + fn) —
 * runtime-режимы, в сериализуемый палитра-контракт не входят. `class` / `style` —
 * inspector-only, расширяются в propsSchema манифеста.
 *
 * @see list.manifest.tsx — propsSchemaOf
 * @see list.presets.ts — пресеты для палитры студио
 */
export const ListContract = defineContract({ name: 'List', kind: 'primitive' }, [
  rule.props(
    z.object({
      // Ось списка: vertical = колонка (default), horizontal = строка.
      orientation: z.enum(['vertical', 'horizontal']).optional(),
      // default — с padding/gap; flush — edge-to-edge (p-0 gap-0) для вложения в Card/Panel.
      variant: z.enum(['default', 'flush']).optional(),
      // Batch-only (runtime, не сериализуется в палитру): content-width
      // flex-wrap layout вместо grid (min) — тег/чип/тайл-сетки с разной
      // длиной текста. См. README §wrap.
      wrap: z.boolean().optional(),
      // justify-content для wrap-режима (без эффекта в min/plain).
      justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
      // Padding контейнера — spacing-шкала, паритет с Flex.p/px/py.
      p: z.number().optional(),
      px: z.number().optional(),
      py: z.number().optional(),
    }),
  ),
  rule.variants(['default', 'flush']),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'vertical', props: { orientation: 'vertical', variant: 'default' } },
    { name: 'horizontal', props: { orientation: 'horizontal', variant: 'default' } },
    { name: 'flush', props: { orientation: 'vertical', variant: 'flush' } },
  ]),
]);

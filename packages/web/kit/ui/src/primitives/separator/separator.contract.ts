import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const SeparatorContract = defineContract({ name: 'Separator', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      // Визуальная ориентация (CVA variant). Если не задан — берётся из `orientation`.
      variant: z.enum(['horizontal', 'vertical']).optional(),
      // a11y-ориентация (kobalte SeparatorRoot) — управляет aria-orientation.
      orientation: z.enum(['horizontal', 'vertical']).optional(),
      // Декоративный (role=none) vs семантический (role=separator) разделитель.
      decorative: z.boolean().optional(),
    }),
  ),
  rule.variants(['horizontal', 'vertical']),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'horizontal', props: { variant: 'horizontal' } },
    { name: 'vertical', props: { variant: 'vertical' } },
    { name: 'semantic', props: { variant: 'horizontal', decorative: false } },
  ]),
]);

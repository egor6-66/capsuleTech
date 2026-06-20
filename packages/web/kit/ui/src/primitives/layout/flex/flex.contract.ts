import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

// Sizing-шкала: положительные числа (spacing × 0.25rem) или 'full' (100%).
const sizingScale = z.union([z.number(), z.literal('full')]);

/**
 * FlexContract — декларативный контракт Flex-контейнера для studio inspector,
 * palette preview, DnD-валидации.
 *
 * Flex — container, НЕ leaf. Принимает любых детей (без rule.accepts).
 * `as` (полиморфизм) — runtime-only, в контракт не входит.
 * `class` / `style` — inspector-only поля, расширяются в propsSchema манифеста.
 *
 * @see flex.manifest.tsx — где контракт используется через propsSchemaOf
 * @see flex.presets.ts — пресеты для палитры студио
 */
export const FlexContract = defineContract({ name: 'Flex', kind: 'primitive' }, [
  // container: НЕ isLeaf, accepts детей любого типа (default behaviour без rule.accepts).
  rule.props(
    z.object({
      // Ось/направление.
      orientation: z.enum(['horizontal', 'vertical']).optional(),
      direction: z.enum(['row', 'row-reverse', 'col', 'col-reverse']).optional(),
      // Раскладка.
      wrap: z.enum(['wrap', 'nowrap', 'wrap-reverse']).optional(),
      align: z.enum(['start', 'center', 'end', 'stretch', 'baseline']).optional(),
      justify: z.enum(['start', 'center', 'end', 'between', 'around', 'evenly']).optional(),
      // gap: число (× 0.25rem) или сырое CSS-значение (для токенов вроде 'var(--space-component)').
      gap: z.union([z.number(), z.string()]).optional(),
      gapX: z.union([z.number(), z.string()]).optional(),
      gapY: z.union([z.number(), z.string()]).optional(),
      // display: inline-flex.
      inline: z.boolean().optional(),
      // Sizing.
      h: sizingScale.optional(),
      minH: z.number().optional(),
      maxH: z.number().optional(),
      w: sizingScale.optional(),
      minW: z.number().optional(),
      maxW: z.number().optional(),
      // Responsive basis: flex: 1 1 Npx.
      fluid: z.number().optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'row', props: { direction: 'row', gap: 2, align: 'center' } },
    { name: 'col', props: { direction: 'col', gap: 2 } },
    { name: 'centered', props: { direction: 'col', align: 'center', justify: 'center' } },
    { name: 'space-between', props: { direction: 'row', justify: 'between', align: 'center' } },
    { name: 'wrap', props: { direction: 'row', wrap: 'wrap', gap: 2 } },
    { name: 'inline', props: { direction: 'row', inline: true, gap: 1, align: 'center' } },
    { name: 'fixed-height', props: { direction: 'col', h: 40 } },
    { name: 'full-width', props: { direction: 'row', w: 'full', align: 'center' } },
    { name: 'fluid-card', props: { direction: 'col', fluid: 320, gap: 2 } },
  ]),
]);

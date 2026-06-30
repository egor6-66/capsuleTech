import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

/**
 * GroupContract — декларативный контракт Group-контейнера для studio inspector,
 * palette preview, DnD-валидации.
 *
 * Group — container (обёртка над Flex), НЕ leaf. Принимает любых детей
 * (без rule.accepts). Batch-mode props (`data` / `item` / `tags` / `resizable`) —
 * runtime-only, в сериализуемый контракт палитры не входят. `class` / `style` —
 * inspector-only, расширяются в propsSchema манифеста.
 */
export const GroupContract = defineContract({ name: 'Group', kind: 'primitive' }, [
  rule.props(
    z.object({
      // Ось группы: horizontal = row (default), vertical = col.
      orientation: z.enum(['horizontal', 'vertical']).optional(),
      // separate — items с gap; attached — прижаты, внутренние радиусы/границы сливаются.
      variant: z.enum(['separate', 'attached']).optional(),
      // gap между items в режиме separate: число (× 0.25rem) или CSS-токен-строка.
      gap: z.union([z.number(), z.string()]).optional(),
    }),
  ),
  rule.variants(['separate', 'attached']),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'separate', props: { orientation: 'horizontal', variant: 'separate' } },
    { name: 'attached', props: { orientation: 'horizontal', variant: 'attached' } },
    { name: 'vertical', props: { orientation: 'vertical', variant: 'separate' } },
  ]),
]);

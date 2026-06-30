import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const LabelContract = defineContract({ name: 'Label', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      // Ассоциация с контролом по id поля (Solid рендерит как нативный `for`).
      // Клик по подписи фокусирует связанный input.
      for: z.string().optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'default', props: { children: 'Label' } },
    { name: 'for-field', props: { for: 'email', children: 'E-mail' } },
  ]),
]);

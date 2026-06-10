import { defineContract, rule } from '@capsuletech/web-contract';
import { z } from '@capsuletech/shared-zod';

export const ButtonContract = defineContract(
  { name: 'Button', kind: 'primitive' },
  [
    rule.isLeaf(),
    rule.props(
      z.object({
        variant: z.enum(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']).optional(),
        size: z.enum(['default', 'sm', 'lg', 'icon']).optional(),
      }),
    ),
    rule.variants(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']),
    rule.styleSlots(['root']),
    rule.recommend((ctx) => ctx.hasLabel !== true, 'Кнопке желателен лейбл'),
    rule.examples([
      { name: 'default', props: { variant: 'default' } },
      { name: 'destructive', props: { variant: 'destructive' } },
      { name: 'ghost', props: { variant: 'ghost', size: 'sm' } },
    ]),
  ],
);

import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const ButtonContract = defineContract({ name: 'Button', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      variant: z
        .enum(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'])
        .optional(),
      size: z.enum(['default', 'sm', 'lg', 'icon', 'xs']).optional(),
      disabled: z.boolean().optional(),
      loading: z.boolean().optional(),
      fullWidth: z.boolean().optional(),
      'aria-invalid': z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
      // active-link состояние: router Link ставит aria-current="page" на активной
      // ссылке, Button рисует primary-акцент из базового CVA (без пропсов у consumer'а)
      'aria-current': z.literal('page').optional(),
    }),
  ),
  rule.variants(['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']),
  rule.styleSlots(['root']),
  rule.recommend((ctx) => ctx.hasLabel !== true, 'Кнопке желателен лейбл'),
  rule.examples([
    { name: 'default', props: { variant: 'default' } },
    { name: 'destructive', props: { variant: 'destructive' } },
    { name: 'ghost', props: { variant: 'ghost', size: 'sm' } },
    { name: 'loading', props: { variant: 'default', loading: true } },
    { name: 'fullWidth', props: { variant: 'default', fullWidth: true } },
    { name: 'aria-invalid', props: { variant: 'default', 'aria-invalid': 'true' } },
    { name: 'as-link', props: { as: 'a', variant: 'outline', href: '/foo' } },
    {
      name: 'active-link',
      props: { as: 'a', variant: 'ghost', href: '/current', 'aria-current': 'page' },
    },
  ]),
]);

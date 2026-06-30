import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const SkeletonContract = defineContract({ name: 'Skeleton', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      variant: z.enum(['text', 'table', 'list', 'card', 'map']).optional(),
      // Кол-во строк для text/table/list. Дефолты: text=3, table=8, list=5.
      rows: z.number().optional(),
    }),
  ),
  rule.variants(['text', 'table', 'list', 'card', 'map']),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'text', props: { variant: 'text', rows: 3 } },
    { name: 'list', props: { variant: 'list' } },
    { name: 'card', props: { variant: 'card' } },
    { name: 'table', props: { variant: 'table', rows: 8 } },
    { name: 'map', props: { variant: 'map' } },
  ]),
]);

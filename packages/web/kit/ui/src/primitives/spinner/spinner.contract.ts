import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const SpinnerContract = defineContract({ name: 'Spinner', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      size: z.enum(['sm', 'md', 'lg']).optional(),
      // a11y-подпись для скринридера (aria-label). По умолчанию 'Loading'.
      label: z.string().optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'sm', props: { size: 'sm' } },
    { name: 'md', props: { size: 'md' } },
    { name: 'lg', props: { size: 'lg' } },
    { name: 'with-label', props: { size: 'md', label: 'Загрузка…' } },
  ]),
]);

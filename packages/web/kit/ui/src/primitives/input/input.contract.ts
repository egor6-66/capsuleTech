import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const InputContract = defineContract({ name: 'Input', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      type: z.enum(['text', 'password', 'email', 'tel', 'number', 'url', 'search']).optional(),
      placeholder: z.string().optional(),
      value: z.union([z.string(), z.number()]).optional(),
      defaultValue: z.union([z.string(), z.number()]).optional(),
      disabled: z.boolean().optional(),
      required: z.boolean().optional(),
      readonly: z.boolean().optional(),
      name: z.string().optional(),
      autocomplete: z.string().optional(),
      'aria-invalid': z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    { name: 'text', props: { type: 'text', placeholder: 'Введите текст' } },
    { name: 'password', props: { type: 'password', placeholder: 'Пароль' } },
    { name: 'number', props: { type: 'number', placeholder: '0' } },
    { name: 'disabled', props: { type: 'text', disabled: true, value: 'readonly' } },
    { name: 'aria-invalid', props: { type: 'text', 'aria-invalid': 'true' } },
  ]),
]);

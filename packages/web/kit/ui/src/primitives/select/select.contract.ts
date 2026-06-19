import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const SelectContract = defineContract({ name: 'Select', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      // Options — массив { value, label, disabled? }. Обязателен для рендера
      // dropdown'а; пресеты должны его задавать.
      options: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
            disabled: z.boolean().optional(),
          }),
        )
        .optional(),
      // Управляемое значение (single-select). `multiple` пока не поддерживаем
      // в контракте — Kobalte Select наш wrapper типизирован под string.
      value: z.string().optional(),
      defaultValue: z.string().optional(),
      placeholder: z.string().optional(),
      disabled: z.boolean().optional(),
      required: z.boolean().optional(),
      name: z.string().optional(),
      'aria-invalid': z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
    }),
  ),
  // Slots: root = trigger; content = popover panel.
  rule.styleSlots(['root', 'content']),
  rule.examples([
    {
      name: 'simple',
      props: {
        placeholder: 'Выберите…',
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
          { value: 'c', label: 'Option C' },
        ],
      },
    },
    {
      name: 'preselected',
      props: {
        value: 'b',
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ],
      },
    },
    {
      name: 'disabled',
      props: {
        disabled: true,
        placeholder: 'Нельзя выбрать',
        options: [{ value: 'a', label: 'Option A' }],
      },
    },
    {
      name: 'aria-invalid',
      props: {
        'aria-invalid': 'true',
        placeholder: 'Выберите…',
        options: [{ value: 'a', label: 'Option A' }],
      },
    },
  ]),
]);

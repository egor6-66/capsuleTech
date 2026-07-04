import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const CardContract = defineContract({ name: 'Card', kind: 'composition' }, [
  rule.accepts(['Card.Header', 'Card.Title', 'Card.Description', 'Card.Content', 'Card.Footer']),
  rule.props(
    z.object({
      // Тень-возвышение карточки (shadow-{level}). Default 'sm' = текущая тень.
      elevation: z.enum(['none', 'sm', 'md', 'lg', 'xl']).optional(),
      // Cursor-pointer + hover-поверхность (визуальный аффорданс, не биндит onClick).
      interactive: z.boolean().optional(),
      // Персистентная "выбранная" поверхность + data-selected.
      selected: z.boolean().optional(),
      // Root padding-токен: none (default, chrome-only) / sm (p-card-tight) / md (p-card).
      padding: z.enum(['none', 'sm', 'md']).optional(),
    }),
  ),
  rule.styleSlots(['root', 'header', 'title', 'description', 'content', 'footer']),
  rule.examples([
    {
      name: 'basic',
      props: {},
      children: [
        { name: 'Card.Header', props: {} },
        { name: 'Card.Content', props: {} },
        { name: 'Card.Footer', props: {} },
      ],
    },
    {
      name: 'with-title-description',
      props: {},
      children: [
        {
          name: 'Card.Header',
          props: {},
          children: [
            { name: 'Card.Title', props: {} },
            { name: 'Card.Description', props: {} },
          ],
        },
        { name: 'Card.Content', props: {} },
      ],
    },
  ]),
]);

import { defineContract, rule } from '@capsuletech/web-contract';

export const CardContract = defineContract({ name: 'Card', kind: 'composition' }, [
  rule.accepts(['Card.Header', 'Card.Title', 'Card.Description', 'Card.Content', 'Card.Footer']),
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

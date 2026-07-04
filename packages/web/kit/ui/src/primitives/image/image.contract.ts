import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const ImageContract = defineContract({ name: 'Image', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      src: z.string(),
      alt: z.string(),
      shape: z.enum(['square', 'circle']).optional(),
      size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
    }),
  ),
  rule.variants(['square', 'circle']),
  rule.styleSlots(['root']),
  rule.examples([
    {
      name: 'square-md',
      props: {
        src: 'https://via.placeholder.com/40',
        alt: 'Placeholder',
        shape: 'square',
        size: 'md',
      },
    },
    {
      name: 'circle-md',
      props: {
        src: 'https://via.placeholder.com/40',
        alt: 'Placeholder',
        shape: 'circle',
        size: 'md',
      },
    },
    {
      name: 'circle-lg',
      props: {
        src: 'https://via.placeholder.com/48',
        alt: 'Placeholder',
        shape: 'circle',
        size: 'lg',
      },
    },
    {
      name: 'square-sm',
      props: {
        src: 'https://via.placeholder.com/32',
        alt: 'Placeholder',
        shape: 'square',
        size: 'sm',
      },
    },
  ]),
]);

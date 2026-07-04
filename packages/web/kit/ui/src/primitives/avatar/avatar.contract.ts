import { z } from '@capsuletech/shared-zod';
import { defineContract, rule } from '@capsuletech/web-contract';

export const AvatarContract = defineContract({ name: 'Avatar', kind: 'primitive' }, [
  rule.isLeaf(),
  rule.props(
    z.object({
      src: z.string(),
      alt: z.string(),
      size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).optional(),
      fallback: z.string().optional(), // Note: Only string fallback in contract; JSX is runtime convenience
    }),
  ),
  rule.styleSlots(['root']),
  rule.examples([
    {
      name: 'sm-initials',
      props: { src: 'https://via.placeholder.com/32', alt: 'John Doe', size: 'sm', fallback: 'JD' },
    },
    {
      name: 'md-initials',
      props: {
        src: 'https://via.placeholder.com/40',
        alt: 'Jane Smith',
        size: 'md',
        fallback: 'JS',
      },
    },
    {
      name: 'lg-initials',
      props: {
        src: 'https://via.placeholder.com/48',
        alt: 'Alice Johnson',
        size: 'lg',
        fallback: 'AJ',
      },
    },
    {
      name: 'xl-initials',
      props: {
        src: 'https://via.placeholder.com/64',
        alt: 'Bob Wilson',
        size: 'xl',
        fallback: 'BW',
      },
    },
  ]),
]);

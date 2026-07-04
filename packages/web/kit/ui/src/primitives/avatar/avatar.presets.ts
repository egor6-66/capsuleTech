import type { IPreset } from '../../manifest/types';

const singleAvatar = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'avt',
    nodes: {
      avt: { id: 'avt', type: 'ui.Avatar', parentId: null, children: [], props },
    },
  },
});

export const avatarPresets: readonly IPreset[] = [
  {
    id: 'sm-initials',
    label: 'Small with Initials',
    schema: singleAvatar({
      src: 'https://via.placeholder.com/32',
      alt: 'User Name',
      size: 'sm',
      fallback: 'UN',
    }),
    description:
      'Small avatar 32×32px with string initials. Use for compact lists, comment threads, team mentions.',
  },
  {
    id: 'md-initials',
    label: 'Medium with Initials',
    schema: singleAvatar({
      src: 'https://via.placeholder.com/40',
      alt: 'User Name',
      size: 'md',
      fallback: 'UN',
    }),
    description:
      'Medium avatar 40×40px with string initials. Standard size for profiles, comments, user cards.',
  },
  {
    id: 'lg-initials',
    label: 'Large with Initials',
    schema: singleAvatar({
      src: 'https://via.placeholder.com/48',
      alt: 'User Name',
      size: 'lg',
      fallback: 'UN',
    }),
    description:
      'Large avatar 48×48px with string initials. Hero profiles, detail pages, prominent user displays.',
  },
  {
    id: 'xl-initials',
    label: 'Extra Large with Initials',
    schema: singleAvatar({
      src: 'https://via.placeholder.com/64',
      alt: 'User Name',
      size: 'xl',
      fallback: 'UN',
    }),
    description:
      'Extra-large avatar 64×64px with string initials. Full-page profiles, user detail headers.',
  },
  {
    id: 'sm-image',
    label: 'Small Image',
    schema: singleAvatar({ src: 'https://via.placeholder.com/32', alt: 'User Name', size: 'sm' }),
    description:
      'Small avatar 32×32px without fallback. Use when image load is guaranteed or fallback not needed.',
  },
  {
    id: 'md-image',
    label: 'Medium Image',
    schema: singleAvatar({ src: 'https://via.placeholder.com/40', alt: 'User Name', size: 'md' }),
    description: 'Medium avatar 40×40px without fallback.',
  },
];

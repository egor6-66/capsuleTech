import type { IPreset } from '../../manifest/types';

const singleImage = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'img',
    nodes: {
      img: { id: 'img', type: 'ui.Image', parentId: null, children: [], props },
    },
  },
});

export const imagePresets: readonly IPreset[] = [
  {
    id: 'square-sm',
    label: 'Square Small',
    schema: singleImage({
      src: 'https://via.placeholder.com/32',
      alt: 'Placeholder',
      shape: 'square',
      size: 'sm',
    }),
    description:
      'Square image 32×32px, rounded corners. Use for thumbnails, list items, inline badges.',
  },
  {
    id: 'square-md',
    label: 'Square Medium',
    schema: singleImage({
      src: 'https://via.placeholder.com/40',
      alt: 'Placeholder',
      shape: 'square',
      size: 'md',
    }),
    description:
      'Square image 40×40px, rounded corners. General-purpose card and form illustrations.',
  },
  {
    id: 'square-lg',
    label: 'Square Large',
    schema: singleImage({
      src: 'https://via.placeholder.com/48',
      alt: 'Placeholder',
      shape: 'square',
      size: 'lg',
    }),
    description: 'Square image 48×48px, rounded corners. Hero sections and prominent thumbnails.',
  },
  {
    id: 'circle-sm',
    label: 'Circle Small',
    schema: singleImage({
      src: 'https://via.placeholder.com/32',
      alt: 'Placeholder',
      shape: 'circle',
      size: 'sm',
    }),
    description: 'Circle image 32×32px. Small avatars, profile icons, comment threads.',
  },
  {
    id: 'circle-md',
    label: 'Circle Medium',
    schema: singleImage({
      src: 'https://via.placeholder.com/40',
      alt: 'Placeholder',
      shape: 'circle',
      size: 'md',
    }),
    description: 'Circle image 40×40px. Standard avatar size for profiles, team members, comments.',
  },
  {
    id: 'circle-lg',
    label: 'Circle Large',
    schema: singleImage({
      src: 'https://via.placeholder.com/64',
      alt: 'Placeholder',
      shape: 'circle',
      size: 'lg',
    }),
    description:
      'Circle image 64×64px. Large profile photos, hero avatars, prominent user indicators.',
  },
  {
    id: 'circle-xl',
    label: 'Circle XL',
    schema: singleImage({
      src: 'https://via.placeholder.com/64',
      alt: 'Placeholder',
      shape: 'circle',
      size: 'xl',
    }),
    description: 'Circle image 64×64px. Maximum size for user avatars in detail pages or headers.',
  },
];

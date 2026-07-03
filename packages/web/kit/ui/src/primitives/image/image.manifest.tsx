import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { Image as ImageIcon } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { ImageContract } from './image.contract';
import { imagePresets } from './image.presets';

// Contract = root for props (src, alt, shape, size). Manifest extends with Inspector-only field (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(ImageContract);
if (!baseProps) throw new Error('ImageContract has no props schema — add rule.props(...)');

export const ImageManifest: IPrimitiveManifestEntry = {
  type: 'ui.Image',
  label: 'Image',
  category: 'feedback',
  icon: () => <ImageIcon size={16} />,
  description: 'Stateless responsive image with shape and size variants',
  isLeaf: true,
  contract: ImageContract,
  docSlug: 'web-ui/primitives/image',
  defaultProps: {
    src: 'https://via.placeholder.com/40',
    alt: 'Image',
    shape: 'square',
    size: 'md',
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: imagePresets,
};

import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { User } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { AvatarContract } from './avatar.contract';
import { avatarPresets } from './avatar.presets';

// Contract = root for props (src, alt, size, fallback). Manifest extends with Inspector-only field (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(AvatarContract);
if (!baseProps) throw new Error('AvatarContract has no props schema — add rule.props(...)');

export const AvatarManifest: IPrimitiveManifestEntry = {
  type: 'ui.Avatar',
  label: 'Avatar',
  category: 'feedback',
  icon: () => <User size={16} />,
  description: 'Composed circular image for user profiles with string-fallback convenience',
  isLeaf: true,
  contract: AvatarContract,
  docSlug: 'web-ui/primitives/avatar',
  defaultProps: {
    src: 'https://via.placeholder.com/40',
    alt: 'User',
    size: 'md',
    fallback: 'US',
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: avatarPresets,
};

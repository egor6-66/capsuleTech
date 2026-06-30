import { type ZodObject, type ZodTypeAny, z } from '@capsuletech/shared-zod';
import { propsSchemaOf } from '@capsuletech/web-contract';
import { RectangleHorizontal } from '../../icons';
import type { IPrimitiveManifestEntry } from '../../manifest/types';
import { SkeletonContract } from './skeleton.contract';
import { skeletonPresets } from './skeleton.presets';

// Contract = root for props (variant, rows). Manifest extends with Inspector-only field (class).
const baseProps = propsSchemaOf<ZodObject<Record<string, ZodTypeAny>>>(SkeletonContract);
if (!baseProps) throw new Error('SkeletonContract has no props schema — add rule.props(...)');

export const SkeletonManifest: IPrimitiveManifestEntry = {
  type: 'ui.Skeleton',
  label: 'Skeleton',
  category: 'feedback',
  icon: () => <RectangleHorizontal size={16} />,
  description: 'Плейсхолдер контента — анимированный скелетон',
  isLeaf: true,
  contract: SkeletonContract,
  defaultProps: {
    variant: 'text',
    rows: 3,
  },
  propsSchema: baseProps.extend({
    class: z.string().optional(),
  }),
  presets: skeletonPresets,
};

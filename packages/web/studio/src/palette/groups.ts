/**
 * Palette L1-группировка: примитивы | композиции.
 *
 * Маппинг через `manifest.category` (поле в kit'е):
 *  - 'composition'                                    → «Композиции»
 *  - 'control' | 'typography' | 'container'
 *    | 'feedback' | 'wrapper'                         → «Примитивы»
 *  - 'composite'                                      → скрыт (parts чужой композиции,
 *                                                       не standalone-компонент)
 */

import type {
  ComponentCategory,
  IPrimitiveManifestEntry,
} from '@capsuletech/web-ui/manifest';

const PRIMITIVE_CATEGORIES: readonly ComponentCategory[] = [
  'control',
  'typography',
  'container',
  'feedback',
  'wrapper',
];

const COMPOSITION_CATEGORIES: readonly ComponentCategory[] = ['composition'];

export interface IPaletteGroups {
  primitives: readonly IPrimitiveManifestEntry[];
  compositions: readonly IPrimitiveManifestEntry[];
}

export const groupManifests = (
  manifests: readonly IPrimitiveManifestEntry[],
): IPaletteGroups => ({
  primitives: manifests.filter((m) => PRIMITIVE_CATEGORIES.includes(m.category)),
  compositions: manifests.filter((m) => COMPOSITION_CATEGORIES.includes(m.category)),
});

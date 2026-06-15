/**
 * Per-primitive manifest registry — single source of truth for
 * `@capsuletech/web-ui` manifests post-S2 unification.
 *
 * Consumers:
 *   - `@capsuletech/web-studio` palette, inspector, DnD validation
 *     (via `@capsuletech/web-ui/manifest` subpath)
 *   - `scripts/build-manifest.mjs` reads the runtime list to merge
 *     hand-authored fields with auto-generated bundle-cost data
 *     (this is a future W4 follow-up; today build-manifest derives
 *     auto-fields independently).
 */

import { AnimateManifest } from '../primitives/wrappers/animate.manifest';
import { ButtonManifest } from '../primitives/button/button.manifest';
import {
  CardContentManifest,
  CardDescriptionManifest,
  CardFooterManifest,
  CardHeaderManifest,
  CardManifest,
  CardTitleManifest,
} from '../primitives/card/card.manifest';
import {
  FieldContentManifest,
  FieldDescriptionManifest,
  FieldErrorManifest,
  FieldLabelManifest,
  FieldManifest,
} from '../primitives/field/field.manifest';
import { GroupManifest } from '../primitives/group/group.manifest';
import { InputManifest } from '../primitives/input/input.manifest';
import { LabelManifest } from '../primitives/label/label.manifest';
import { FlexManifest } from '../primitives/layout/flex/flex.manifest';
import { GridManifest } from '../primitives/layout/grid/grid.manifest';
import { ListManifest } from '../primitives/list/list.manifest';
import { SeparatorManifest } from '../primitives/separator/separator.manifest';
import { SkeletonManifest } from '../primitives/skeleton/skeleton.manifest';
import { SpinnerManifest } from '../primitives/spinner/spinner.manifest';
import { ToggleManifest } from '../primitives/toggle/toggle.manifest';
import { TypographyManifest } from '../primitives/typography/typography.manifest';
import type { ComponentCategory, IManifestSummary, IPrimitiveManifestEntry } from './types';

const ALL: IPrimitiveManifestEntry[] = [
  // controls
  ButtonManifest,
  InputManifest,
  ToggleManifest,
  // typography
  TypographyManifest,
  LabelManifest,
  // containers
  CardManifest,
  FieldManifest,
  GridManifest,
  FlexManifest,
  GroupManifest,
  ListManifest,
  // composite parts
  CardHeaderManifest,
  CardTitleManifest,
  CardDescriptionManifest,
  CardContentManifest,
  CardFooterManifest,
  FieldLabelManifest,
  FieldContentManifest,
  FieldDescriptionManifest,
  FieldErrorManifest,
  // feedback
  SeparatorManifest,
  SpinnerManifest,
  SkeletonManifest,
  // wrappers
  AnimateManifest,
];

const BY_TYPE = new Map<string, IPrimitiveManifestEntry>(ALL.map((m) => [m.type, m]));

/** Резолв манифеста по `node.type` (тот же, что в renderer'е). */
export const getManifest = (type: string): IPrimitiveManifestEntry | undefined => BY_TYPE.get(type);

/** Все манифесты в порядке регистрации. */
export const getAllManifests = (): readonly IPrimitiveManifestEntry[] => ALL;

/** Манифесты конкретной категории — для секции палитры. */
export const listByCategory = (
  category: ComponentCategory,
): readonly IPrimitiveManifestEntry[] => ALL.filter((m) => m.category === category);

/** Сводка (без `propsSchema`/`defaultProps`) — для лёгких UI-кусков. */
export const summarize = (m: IPrimitiveManifestEntry): IManifestSummary => ({
  type: m.type,
  label: m.label,
  category: m.category,
  icon: m.icon,
  description: m.description,
});

/**
 * Проверка: можно ли вставить childType внутрь parentType. Учитывает `isLeaf`
 * (всегда false) и `accepts` (если не задано — true для не-leaf'ов).
 * Если родительский манифест не найден — разрешаем (renderer всё равно
 * отрендерит, а compliance — отдельный вопрос).
 */
export const canAcceptChild = (parentType: string, childType: string): boolean => {
  const parent = BY_TYPE.get(parentType);
  if (!parent) return true;
  if (parent.isLeaf) return false;
  if (!parent.accepts) return true;
  return parent.accepts(childType);
};

/** Все уникальные категории среди зарегистрированных манифестов. */
export const getCategories = (): ComponentCategory[] => {
  const seen = new Set<ComponentCategory>();
  for (const m of ALL) seen.add(m.category);
  return Array.from(seen);
};
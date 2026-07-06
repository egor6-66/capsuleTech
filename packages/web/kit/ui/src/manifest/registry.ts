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

import type { Contract } from '@capsuletech/web-contract';
import { ArticleManifest } from '../composites/article/article.manifest';
import { SectionedListManifest } from '../composites/sectionedList/sectionedList.manifest';
import {
  AccordionContentManifest,
  AccordionItemManifest,
  AccordionManifest,
  AccordionTriggerManifest,
} from '../primitives/accordion/accordion.manifest';
import { AvatarManifest } from '../primitives/avatar/avatar.manifest';
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
import { ImageManifest } from '../primitives/image/image.manifest';
import { InputManifest } from '../primitives/input/input.manifest';
import { LabelManifest } from '../primitives/label/label.manifest';
import { FlexManifest } from '../primitives/layout/flex/flex.manifest';
import { GridManifest } from '../primitives/layout/grid/grid.manifest';
import { ListManifest } from '../primitives/list/list.manifest';
import { ProseManifest } from '../primitives/prose/prose.manifest';
import { SelectManifest } from '../primitives/select/select.manifest';
import { SeparatorManifest } from '../primitives/separator/separator.manifest';
import { SkeletonManifest } from '../primitives/skeleton/skeleton.manifest';
import { SpinnerManifest } from '../primitives/spinner/spinner.manifest';
import { ToggleManifest } from '../primitives/toggle/toggle.manifest';
import { TypographyManifest } from '../primitives/typography/typography.manifest';
import type {
  ComponentCategory,
  FieldRule,
  IFieldRuleResult,
  IManifestSummary,
  IPreset,
  IPrimitiveManifestEntry,
} from './types';

const ALL: IPrimitiveManifestEntry[] = [
  // controls
  ButtonManifest,
  InputManifest,
  SelectManifest,
  ToggleManifest,
  // typography
  TypographyManifest,
  LabelManifest,
  ProseManifest,
  // containers
  CardManifest,
  FieldManifest,
  GridManifest,
  FlexManifest,
  GroupManifest,
  ListManifest,
  AccordionManifest,
  // composites (molecules)
  ArticleManifest,
  SectionedListManifest,
  // composite parts
  AccordionItemManifest,
  AccordionTriggerManifest,
  AccordionContentManifest,
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
  // media
  ImageManifest,
  AvatarManifest,
];

const BY_TYPE = new Map<string, IPrimitiveManifestEntry>(ALL.map((m) => [m.type, m]));

/** Резолв манифеста по `node.type` (тот же, что в renderer'е). */
export const getManifest = (type: string): IPrimitiveManifestEntry | undefined => BY_TYPE.get(type);

/**
 * Резолв контракта по `node.type`.
 *
 * Возвращает `Contract` если он co-located в манифесте (`manifest.contract`),
 * иначе `undefined`. Используется studio-инспектором и тестами вместо
 * hand-maintained `contract-registry.ts` в studio.
 */
export const getContract = (type: string): Contract | undefined => BY_TYPE.get(type)?.contract;

/** Все манифесты в порядке регистрации. */
export const getAllManifests = (): readonly IPrimitiveManifestEntry[] => ALL;

/** Манифесты конкретной категории — для секции палитры. */
export const listByCategory = (category: ComponentCategory): readonly IPrimitiveManifestEntry[] =>
  ALL.filter((m) => m.category === category);

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

/** Presets примитива по `node.type`. Пусто (`[]`) если presets не заданы. */
export const getPresets = (type: string): readonly IPreset[] => BY_TYPE.get(type)?.presets ?? [];

/** true если примитив имеет хотя бы один preset. */
export const hasPresets = (type: string): boolean => (BY_TYPE.get(type)?.presets?.length ?? 0) > 0;

/**
 * Применяет field-rule примитива к текущим props. Возвращает `{}` если rule
 * не задана. Результат содержит `hidden` и/или `disabled` наборы полей.
 */
export const applyFieldRule = (type: string, props: Record<string, unknown>): IFieldRuleResult =>
  BY_TYPE.get(type)?.fieldRule?.(props) ?? {};

// Re-export types so that consumers can import from one place.
export type { FieldRule, IFieldRuleResult, IPreset };

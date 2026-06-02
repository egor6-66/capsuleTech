import { AnimateManifest } from './manifests/animate';
import { ButtonManifest } from './manifests/button';
import {
  CardContentManifest,
  CardDescriptionManifest,
  CardFooterManifest,
  CardHeaderManifest,
  CardManifest,
  CardTitleManifest,
} from './manifests/card';
import {
  FieldContentManifest,
  FieldDescriptionManifest,
  FieldErrorManifest,
  FieldLabelManifest,
  FieldManifest,
} from './manifests/field';
import { GroupManifest } from './manifests/group';
import { InputManifest } from './manifests/input';
import { LabelManifest } from './manifests/label';
import { FlexManifest, GridManifest } from './manifests/layout';
import { ListManifest } from './manifests/list';
import { SeparatorManifest } from './manifests/separator';
import { SkeletonManifest } from './manifests/skeleton';
import { SpinnerManifest } from './manifests/spinner';
import { ToggleManifest } from './manifests/toggle';
import { TypographyManifest } from './manifests/typography';
import type { ComponentCategory, IComponentManifest, IManifestSummary } from './types';

const ALL: IComponentManifest[] = [
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

const BY_TYPE = new Map<string, IComponentManifest>(ALL.map((m) => [m.type, m]));

/** Резолв манифеста по `node.type` (тот же, что в renderer'е). */
export const getManifest = (type: string): IComponentManifest | undefined => BY_TYPE.get(type);

/** Все манифесты в порядке регистрации. */
export const getAllManifests = (): readonly IComponentManifest[] => ALL;

/** Манифесты конкретной категории — для секции палитры. */
export const listByCategory = (category: ComponentCategory): readonly IComponentManifest[] =>
  ALL.filter((m) => m.category === category);

/** Сводка (без `propsSchema`/`defaultProps`) — для лёгких UI-кусков. */
export const summarize = (m: IComponentManifest): IManifestSummary => ({
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

import type { ComponentCategory } from '../manifests/types';
import { generate } from './engine';
import { BUTTON_OUTLINE_PRESET, BUTTON_PRIMARY_PRESET } from './presets/button-primary';
import { CARD_PRODUCT_PRESET } from './presets/card-product';
import { FORM_PRESET } from './presets/form';
import { LAYOUT_2COL_PRESET } from './presets/layout-2col';
import { TYPOGRAPHY_H1_PRESET, TYPOGRAPHY_PARAGRAPH_PRESET } from './presets/typography';
import type { IEditorTree, IPreset } from './types';

/**
 * Описание одного темплейта. Темплейт = именованный preset + метаданные для
 * палитры. Пользователь видит `label` в дропдауне; `previewSeed` используется
 * для стабильного превью-эскиза.
 *
 * `forType` — dot-path компонента-владельца (напр. `'ui.Card'`). Используется
 * для группировки в палитре: «Темплейты для Card», «Темплейты для Button» и т.д.
 *
 * `group` — category из manifests — для секций в UI (composition / container /
 * control / typography / …).
 */
export interface ITemplate {
  /** Kebab-case уникальный идентификатор темплейта. */
  id: string;
  /** Человекочитаемое название для палитры (RU). */
  label: string;
  /** Dot-path компонента-владельца, напр. `'ui.Card'` | `'ui.Button'`. */
  forType: string;
  /** Категория из manifests — для UI-группировки. */
  group: ComponentCategory;
  /** Грамматика генерации. */
  preset: IPreset;
  /** Фиксированный seed для стабильного превью в дропдауне. */
  previewSeed: number;
}

/**
 * Все зарегистрированные темплейты в порядке отображения.
 * Добавляй сюда — не импортируй список напрямую (он приватный).
 */
const ALL_TEMPLATES: readonly ITemplate[] = [
  // --- composition / ui.Card ---
  {
    id: 'card-form',
    label: 'Форма',
    forType: 'ui.Card',
    group: 'composition',
    preset: FORM_PRESET,
    previewSeed: 42,
  },
  {
    id: 'card-product',
    label: 'Карточка товара',
    forType: 'ui.Card',
    group: 'composition',
    preset: CARD_PRODUCT_PRESET,
    previewSeed: 17,
  },

  // --- container / ui.Layout.Grid ---
  {
    id: 'layout-2col',
    label: '2 колонки',
    forType: 'ui.Layout.Grid',
    group: 'container',
    preset: LAYOUT_2COL_PRESET,
    previewSeed: 1,
  },

  // --- control / ui.Button ---
  {
    id: 'button-primary',
    label: 'Primary',
    forType: 'ui.Button',
    group: 'control',
    preset: BUTTON_PRIMARY_PRESET,
    previewSeed: 1,
  },
  {
    id: 'button-outline',
    label: 'Outline',
    forType: 'ui.Button',
    group: 'control',
    preset: BUTTON_OUTLINE_PRESET,
    previewSeed: 1,
  },

  // --- typography / ui.Typography ---
  {
    id: 'typography-h1',
    label: 'Заголовок H1',
    forType: 'ui.Typography',
    group: 'typography',
    preset: TYPOGRAPHY_H1_PRESET,
    previewSeed: 1,
  },
  {
    id: 'typography-paragraph',
    label: 'Параграф',
    forType: 'ui.Typography',
    group: 'typography',
    preset: TYPOGRAPHY_PARAGRAPH_PRESET,
    previewSeed: 1,
  },
];

/** Все темплейты (readonly). */
export const getAllTemplates = (): readonly ITemplate[] => ALL_TEMPLATES;

/**
 * Темплейты для конкретного компонента-владельца.
 * @param forType Dot-path компонента, напр. `'ui.Card'`.
 */
export const listTemplatesFor = (forType: string): ITemplate[] =>
  ALL_TEMPLATES.filter((t) => t.forType === forType);

/**
 * Материализовать темплейт в фрагмент дерева редактора.
 * Если `seed` не задан — используется `t.previewSeed` (стабильный превью).
 */
export const buildTemplate = (t: ITemplate, seed?: number): IEditorTree =>
  generate(t.preset, { seed: seed ?? t.previewSeed });

/**
 * Group presets — именованные варианты Group-контейнера для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Суть Group видна ТОЛЬКО по детям — на пустом контейнере variant/orientation
 * не дают визуального эффекта. Поэтому каждый preset наполнен кнопками: на них
 * читается и сшивание краёв (`attached`), и зазор (`separate`), и смена оси
 * (`orientation`). Кнопки — самый частый кейс Group (toolbar / actions / меню).
 */

import type { IEditorNode } from '@capsuletech/web-contract';
import type { IPreset } from '../../manifest/types';

const buttonNode = (id: string, props: Record<string, unknown>): IEditorNode => ({
  id,
  type: 'ui.Button',
  parentId: 'grp',
  children: [],
  props,
});

/** Строит схему: Group-контейнер + N кнопок-детей. */
const group = (
  props: Record<string, unknown>,
  buttons: Array<Record<string, unknown>>,
): IPreset['schema'] => {
  const ids = buttons.map((_, i) => `btn-${i + 1}`);
  return {
    components: {
      root: 'grp',
      nodes: {
        grp: { id: 'grp', type: 'ui.Group', parentId: null, children: ids, props },
        ...Object.fromEntries(buttons.map((b, i) => [ids[i], buttonNode(ids[i], b)])),
      },
    },
  };
};

export const groupPresets: readonly IPreset[] = [
  {
    id: 'attached',
    label: 'Segmented',
    schema: group({ orientation: 'horizontal', variant: 'attached' }, [
      { variant: 'outline', children: 'День' },
      { variant: 'outline', children: 'Неделя' },
      { variant: 'outline', children: 'Месяц' },
    ]),
    description:
      'Сегментированный контрол — кнопки прижаты вплотную, внутренние радиусы и границы сливаются в единый блок. Канон для переключателей режима/диапазона (день/неделя/месяц), view-тогглов.',
  },
  {
    id: 'separate',
    label: 'Action group',
    schema: group({ orientation: 'horizontal', variant: 'separate' }, [
      { variant: 'secondary', children: 'Отмена' },
      { variant: 'default', children: 'Сохранить' },
    ]),
    description:
      'Группа действий с зазором (gap) — кнопки рядом, но раздельные. Канон для footer-баров форм и диалогов (Отмена / Сохранить).',
  },
  {
    id: 'vertical',
    label: 'Vertical menu',
    schema: group({ orientation: 'vertical', variant: 'separate' }, [
      { variant: 'ghost', children: 'Профиль' },
      { variant: 'ghost', children: 'Настройки' },
      { variant: 'ghost', children: 'Выход' },
    ]),
    description:
      'Вертикальная стопка — кнопки в колонку с зазором. Для боковых меню, секций навигации, dropdown-групп. Показывает ось orientation=vertical.',
  },
];

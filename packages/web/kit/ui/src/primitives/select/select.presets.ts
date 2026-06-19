/**
 * Select presets — именованные варианты Select-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Четыре пресета: simple / preselected / long-list / disabled.
 */

import type { IPreset } from '../../manifest/types';

/** Вспомогательный helper: строит схему с одним Select-узлом. */
const singleSelect = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'sel',
    nodes: {
      sel: { id: 'sel', type: 'ui.Select', parentId: null, children: [], props },
    },
  },
});

export const selectPresets: readonly IPreset[] = [
  {
    id: 'simple',
    label: 'Simple',
    schema: singleSelect({
      placeholder: 'Выберите…',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
      ],
    }),
    description:
      'Стандартный выбор из короткого списка (3-7 опций). Базовый случай для фильтров, селекторов категорий, dropdown-меню в формах.',
  },
  {
    id: 'preselected',
    label: 'Preselected',
    schema: singleSelect({
      value: 'b',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
      ],
    }),
    description:
      'Выбор с дефолтным значением. Используй когда форма редактирует существующую сущность и значение поля уже известно.',
  },
  {
    id: 'long-list',
    label: 'Long list',
    schema: singleSelect({
      placeholder: 'Выберите страну…',
      options: [
        { value: 'ru', label: 'Россия' },
        { value: 'us', label: 'США' },
        { value: 'cn', label: 'Китай' },
        { value: 'de', label: 'Германия' },
        { value: 'fr', label: 'Франция' },
        { value: 'jp', label: 'Япония' },
        { value: 'br', label: 'Бразилия' },
        { value: 'in', label: 'Индия' },
      ],
    }),
    description:
      'Длинный список с прокруткой панели (max-height + overflow). Тест что dropdown не ломается на 8+ опциях и виртуализация не нужна.',
  },
  {
    id: 'disabled',
    label: 'Disabled',
    schema: singleSelect({
      disabled: true,
      placeholder: 'Нельзя выбрать',
      options: [{ value: 'a', label: 'Option A' }],
    }),
    description:
      'Неактивный селект — для контекста, когда выбор временно недоступен (другое поле не заполнено, разрешение отсутствует).',
  },
];

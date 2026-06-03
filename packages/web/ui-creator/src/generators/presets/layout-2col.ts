import type { IPreset, IPropsRefiner } from '../types';

/**
 * LAYOUT_2COL_PRESET — «2 колонки». Структура:
 *
 *   ui.Layout.Grid (cols:2)
 *   ├── ui.Layout.Flex (direction:col)
 *   └── ui.Layout.Flex (direction:col)
 *
 * Минималистичный layout-темплейт: grid из двух flex-колонок.
 * Пользователь наполняет колонки контентом сам через drag-and-drop.
 */

const refineGrid: IPropsRefiner = (props) => ({
  ...props,
  cols: 2,
  gap: 4,
  class: 'w-full',
});

const refineFlex: IPropsRefiner = (props) => ({
  ...props,
  direction: 'col',
  gap: 4,
  class: 'w-full',
});

export const LAYOUT_2COL_PRESET: IPreset = {
  name: 'layout-2col',
  rootCandidates: [
    {
      type: 'ui.Layout.Grid',
      weight: 1,
      refineProps: refineGrid,
      slots: [
        {
          name: 'columns',
          countRange: [2, 2],
          pick: [{ type: 'ui.Layout.Flex', refineProps: refineFlex }],
        },
      ],
    },
  ],
};

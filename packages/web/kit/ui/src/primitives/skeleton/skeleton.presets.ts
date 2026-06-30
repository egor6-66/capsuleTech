/**
 * Skeleton presets — именованные варианты Skeleton-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * По пресету на layout-variant (CVA `variant` enum: text / list / card / table / map).
 */

import type { IPreset } from '../../manifest/types';

const singleSkeleton = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'skl',
    nodes: {
      skl: { id: 'skl', type: 'ui.Skeleton', parentId: null, children: [], props },
    },
  },
});

export const skeletonPresets: readonly IPreset[] = [
  {
    id: 'text',
    label: 'Text',
    schema: singleSkeleton({ variant: 'text', rows: 3 }),
    description:
      'Заглушка под абзац текста — несколько строк разной ширины (последняя короче). Для загрузки описаний, статей, параграфов.',
  },
  {
    id: 'list',
    label: 'List',
    schema: singleSkeleton({ variant: 'list' }),
    description:
      'Заглушка под список с аватарами — кружок + две строки на элемент. Для загрузки ленты, контактов, уведомлений.',
  },
  {
    id: 'card',
    label: 'Card',
    schema: singleSkeleton({ variant: 'card' }),
    description:
      'Заглушка под карточку — header-зона + тело со строками текста, в рамке. Для загрузки карточек товара/профиля.',
  },
  {
    id: 'table',
    label: 'Table',
    schema: singleSkeleton({ variant: 'table', rows: 8 }),
    description:
      'Заглушка под таблицу — header-строка + строки данных с колонками. Для загрузки data-table, отчётов, сеток.',
  },
  {
    id: 'map',
    label: 'Map',
    schema: singleSkeleton({ variant: 'map' }),
    description:
      'Сплошная заглушка на всю площадь контейнера (`h-full w-full`) — для карт, canvas, медиа. Требует родителя с заданной высотой, иначе схлопывается.',
  },
];

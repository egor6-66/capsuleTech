/**
 * Editor-метаданные палитры: метки категорий, порядок секций, ранги.
 *
 * Вынесено из EditorPalette.tsx чтобы держать главный файл тонким
 * и дать возможность использовать утилиты независимо (тесты, будущее расширение).
 */

import type { ComponentCategory } from '../../manifests';

/** Человекочитаемые названия категорий для заголовков секций. */
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  control: 'Контролы',
  typography: 'Типографика',
  container: 'Контейнеры',
  composition: 'Композиции',
  composite: 'Составные',
  feedback: 'Фидбек',
  wrapper: 'Обёртки',
};

/** Порядок отображения секций (composite скрыт — показывается только как часть ContainerItem). */
export const CATEGORY_ORDER: ComponentCategory[] = [
  'control',
  'typography',
  'container',
  'composition',
  'feedback',
  'wrapper',
];

/** Предпочтительный порядок контейнеров: layout-компоненты вперёд. */
export const CONTAINER_ORDER = ['ui.Layout.Grid', 'ui.Layout.Flex', 'ui.Group', 'ui.List'];

/** Ранг категории для сортировки секций. */
export const catRank = (c: ComponentCategory): number => {
  const i = CATEGORY_ORDER.indexOf(c);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

/** Ранг контейнера для сортировки внутри секции 'container'. */
export const orderRank = (type: string): number => {
  const i = CONTAINER_ORDER.indexOf(type);
  return i < 0 ? CONTAINER_ORDER.length : i;
};

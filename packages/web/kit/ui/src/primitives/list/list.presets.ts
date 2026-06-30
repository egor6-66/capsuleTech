/**
 * List presets — именованные варианты List-контейнера для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Палитра использует семантический режим List (plain children) — batch /
 * render-prop требуют runtime-функций и в JSON-схему не сериализуются.
 *
 * Строки списка — `ui.Button` variant `ghost` (канон после удаления Navigation,
 * см. OWNERSHIP: «используй Ui.List + as: Ui.Button»). На них видна суть List:
 * вертикальная/горизонтальная ось (`orientation`) и плотность (`variant`
 * default с gap vs flush edge-to-edge).
 */

import type { IEditorNode } from '@capsuletech/web-contract';
import type { IPreset } from '../../manifest/types';

const buttonNode = (id: string, props: Record<string, unknown>): IEditorNode => ({
  id,
  type: 'ui.Button',
  parentId: 'list',
  children: [],
  props,
});

/** Строит схему: List-контейнер + N кнопок-строк. */
const list = (
  props: Record<string, unknown>,
  buttons: Array<Record<string, unknown>>,
): IPreset['schema'] => {
  const ids = buttons.map((_, i) => `row-${i + 1}`);
  return {
    components: {
      root: 'list',
      nodes: {
        list: { id: 'list', type: 'ui.List', parentId: null, children: ids, props },
        ...Object.fromEntries(buttons.map((b, i) => [ids[i], buttonNode(ids[i], b)])),
      },
    },
  };
};

export const listPresets: readonly IPreset[] = [
  {
    id: 'vertical',
    label: 'Vertical',
    schema: list({ orientation: 'vertical', variant: 'default' }, [
      { variant: 'ghost', fullWidth: true, children: 'Главная' },
      { variant: 'ghost', fullWidth: true, children: 'Проекты' },
      { variant: 'ghost', fullWidth: true, children: 'Команда' },
      { variant: 'ghost', fullWidth: true, children: 'Настройки' },
    ]),
    description:
      'Вертикальный список строк с зазором — дефолт для side-меню, навигации, секций настроек. Самый частый кейс List.',
  },
  {
    id: 'flush',
    label: 'Flush',
    schema: list({ orientation: 'vertical', variant: 'flush' }, [
      { variant: 'ghost', fullWidth: true, children: 'Документ 1' },
      { variant: 'ghost', fullWidth: true, children: 'Документ 2' },
      { variant: 'ghost', fullWidth: true, children: 'Документ 3' },
    ]),
    description:
      'Без внутренних отступов и gap (edge-to-edge) — для списков, вложенных в Card/Panel, где рамку и разделители даёт контейнер. Строки прижаты друг к другу.',
  },
  {
    id: 'horizontal',
    label: 'Horizontal',
    schema: list({ orientation: 'horizontal', variant: 'default' }, [
      { variant: 'ghost', children: 'Все' },
      { variant: 'ghost', children: 'Активные' },
      { variant: 'ghost', children: 'Архив' },
    ]),
    description:
      'Горизонтальная строка элементов — для inline-навигации, фильтр-табов, сегментов под заголовком. Показывает ось orientation=horizontal.',
  },
];

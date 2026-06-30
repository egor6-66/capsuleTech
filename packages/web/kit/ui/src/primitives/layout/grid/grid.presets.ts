/**
 * Grid presets — именованные варианты Grid-контейнера для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Как и у Flex, суть сетки видна ТОЛЬКО по детям — на пустом контейнере
 * `cols` / `rows` / `gap` не дают визуального эффекта. Поэтому каждый preset
 * наполнен ШЕСТЬЮ плитками: меняешь `cols` в инспекторе (2 → 3 → 4) — и плитки
 * реально перестраиваются (6 = 3×2 / 2×3 / wrap), `gap` раздвигает ячейки.
 *
 * Плитки — `ui.Card` шириной во всю ячейку (`width: 100%`): размер колонки
 * задаёт сам grid-трек, плитка его заполняет. Контейнер несёт лёгкий пунктирный
 * бордер, чтобы границы сетки читались. Стиль — инлайн через CSS-токены
 * (НЕ Tailwind-классы): не требует content-scan в приложении-консьюмере.
 */

import type { IEditorNode } from '@capsuletech/web-contract';
import type { IPreset } from '../../../manifest/types';

/** Лёгкий каркас контейнера — пунктирный бордер + padding, чтобы сетка читалась. */
const containerStyle: Record<string, string> = {
  width: '100%',
  padding: 'var(--space-card)',
  border: '1px dashed var(--color-border)',
  'border-radius': 'var(--radius-md)',
};

const TILE_IDS = ['tile-1', 'tile-2', 'tile-3', 'tile-4', 'tile-5', 'tile-6'] as const;

/**
 * Плитка-плейсхолдер. `width: 100%` заполняет ячейку трека — так смена `cols`
 * визуально перестраивает сетку, а `gap` читается как зазор между ячейками.
 */
const tileNode = (id: string): IEditorNode => ({
  id,
  type: 'ui.Card',
  parentId: 'grid',
  children: [],
  props: {
    style: {
      width: '100%',
      height: '56px',
      background: 'var(--color-muted)',
    } as Record<string, string>,
  },
});

const singleGrid = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'grid',
    nodes: {
      grid: {
        id: 'grid',
        type: 'ui.Layout.Grid',
        parentId: null,
        children: [...TILE_IDS],
        props: { ...props, style: containerStyle },
      },
      ...Object.fromEntries(TILE_IDS.map((id) => [id, tileNode(id)])),
    },
  },
});

export const gridPresets: readonly IPreset[] = [
  {
    id: 'two-col',
    label: '2 columns',
    schema: singleGrid({ cols: 2, gap: 2 }),
    description:
      'Две равные колонки — самый частый старт. Дефолт для пар «лейбл/значение», split-карточек, форм в две колонки. Покрути `cols` в инспекторе (2→3→4) — шесть плиток перестроятся.',
  },
  {
    id: 'three-col',
    label: '3 columns',
    schema: singleGrid({ cols: 3, gap: 2 }),
    description:
      'Три равные колонки — для карточных дашбордов, плиточных меню, галерей фиксированной ширины. Шесть плиток дают ровные 3×2; меняй `gap`, чтобы подобрать плотность.',
  },
  {
    id: 'auto-fit',
    label: 'Auto-fit gallery',
    schema: singleGrid({ cols: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 2 }),
    description:
      'Адаптивная галерея без media-queries: `cols` = `repeat(auto-fill, minmax(120px, 1fr))` — колонки сами добавляются/убираются под ширину контейнера. Для responsive-плиток, продуктовых сеток, фотогалерей.',
  },
];

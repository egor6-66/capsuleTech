/**
 * Flex presets — именованные варианты Flex-контейнера для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Контейнерные пресеты — это «формы layout'а», и суть layout'а (`direction` /
 * `wrap` / `gap` / `align` / `justify`) видна ТОЛЬКО по детям — на пустом
 * контейнере кручение инспектора не даёт визуального эффекта. Поэтому каждый
 * preset наполнен тремя плитками-плейсхолдерами (`tileNode`): при изменении
 * настроек реально видно перестроение (gap-зазор, перенос при `wrap`, смена
 * оси при `direction`, расталкивание при `justify`).
 *
 * Плитки — нейтральные боксы `ui.Layout.Flex` (пустые, без детей) с
 * фиксированным размером (`min-width` фиксирует ширину, чтобы `wrap`
 * срабатывал в узком контейнере). НЕ `ui.Card`: Card тащит свой хром
 * (shadow / border / padding / max-w) и плитка рисуется крупнее задуманного.
 * Сам контейнер несёт лёгкий пунктирный бордер, чтобы границы Flex читались.
 *
 * Стиль — инлайн через CSS-токены (НЕ Tailwind-классы): не требует
 * content-scan в приложении-консьюмере. Тот же приём, что в `flex.manifest`
 * (`defaultProps.style.padding = var(--space-card)`).
 */

import type { IEditorNode } from '@capsuletech/web-contract';
import type { IPreset } from '../../../manifest/types';

/**
 * Лёгкий каркас самого контейнера — пунктирный бордер + min-height + padding,
 * чтобы границы Flex читались. Без фона: плитки (`--color-muted`) должны
 * контрастировать. Все значения — themed CSS-токены (без Tailwind-скана).
 */
const containerStyle: Record<string, string> = {
  width: '100%',
  'min-height': 'var(--size-slot)',
  padding: 'var(--space-card)',
  border: '1px dashed var(--color-border)',
  'border-radius': 'var(--radius-md)',
};

const TILE_IDS = ['tile-1', 'tile-2', 'tile-3'] as const;

/**
 * Плитка-плейсхолдер фиксированного размера. `min-width` не даёт ужиматься —
 * так `wrap` визуально срабатывает в узком контейнере, а `gap` читается.
 */
const tileNode = (id: string): IEditorNode => ({
  id,
  type: 'ui.Layout.Flex',
  parentId: 'flex',
  children: [],
  props: {
    style: {
      width: '96px',
      'min-width': '96px',
      height: '56px',
      background: 'var(--color-muted)',
      'border-radius': 'var(--radius-md)',
    } as Record<string, string>,
  },
});

const singleFlex = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'flex',
    nodes: {
      flex: {
        id: 'flex',
        type: 'ui.Layout.Flex',
        parentId: null,
        children: [...TILE_IDS],
        props: { ...props, style: containerStyle },
      },
      ...Object.fromEntries(TILE_IDS.map((id) => [id, tileNode(id)])),
    },
  },
});

export const flexPresets: readonly IPreset[] = [
  {
    id: 'row',
    label: 'Row',
    schema: singleFlex({ direction: 'row', gap: 2, align: 'center' }),
    description:
      'Горизонтальная строка с базовым gap и выравниванием по центру (cross-axis). Дефолт для toolbar, header-строки, inline-actions.',
  },
  {
    id: 'col',
    label: 'Column',
    schema: singleFlex({ direction: 'col', gap: 2 }),
    description:
      'Вертикальная колонка с базовым gap. Дефолт для form-полей, секций, sidebar-меню. Один из самых частых контейнеров приложения.',
  },
  {
    id: 'centered',
    label: 'Centered',
    schema: singleFlex({ direction: 'col', align: 'center', justify: 'center', gap: 2 }),
    description:
      'Центрирование по обеим осям. Используй для empty-state, loading-фолбэков, hero-блоков, авторизационных карточек.',
  },
  {
    id: 'space-between',
    label: 'Space between',
    schema: singleFlex({ direction: 'row', justify: 'between', align: 'center' }),
    description:
      'Прижимает первый и последний элемент к краям, остальное растягивает. Канон для header-баров (logo ←→ actions), листинговых строк, panel-footer.',
  },
  {
    id: 'wrap',
    label: 'Wrap',
    schema: singleFlex({ direction: 'row', wrap: 'wrap', gap: 2 }),
    description:
      'Горизонтальная раскладка с переносом. Используй для tag-cloud, фильтр-чипов, gallery-сеток до перехода на полноценный Grid.',
  },
  {
    id: 'fluid-card',
    label: 'Fluid card',
    schema: singleFlex({ direction: 'col', fluid: 320, gap: 2 }),
    description:
      'Адаптивный карточный блок: растёт/сжимается, basis = 320px. В сочетании с родителем `wrap=wrap` даёт responsive-grid из карточек без CSS Grid.',
  },
];

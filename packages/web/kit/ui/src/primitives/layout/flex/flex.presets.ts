/**
 * Flex presets — именованные варианты Flex-контейнера для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Контейнерные пресеты — это «формы layout'а». Без детей Flex-блок невидим
 * (прозрачный), поэтому каждый preset несёт `placeholderStyle`: пунктирный
 * бордер + приглушённый фон + min-height — «пустой контейнер виден как
 * контейнер» в канвасе/палитре. Юзер после DnD'а наполняет его детьми
 * (и чистит scaffold-стиль через инспектор).
 *
 * Стиль — инлайн через CSS-токены (НЕ Tailwind-классы): не требует
 * content-scan в приложении-консьюмере. Тот же приём, что в `flex.manifest`
 * (`defaultProps.style.padding = var(--space-card)`).
 */

import type { IPreset } from '../../../manifest/types';

/**
 * Scaffold-стиль пустого контейнера — делает dropped/selected Flex видимым.
 * Все значения — themed CSS-токены, поэтому корректны в любой теме без
 * Tailwind-сканирования у консьюмера.
 */
const placeholderStyle: Record<string, string> = {
  width: '100%',
  'min-height': 'var(--size-slot)',
  padding: 'var(--space-card)',
  border: '1px dashed var(--color-border)',
  'border-radius': 'var(--radius-md)',
  background: 'var(--color-muted)',
};

const singleFlex = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'flex',
    nodes: {
      flex: {
        id: 'flex',
        type: 'ui.Layout.Flex',
        parentId: null,
        children: [],
        props: { ...props, style: placeholderStyle },
      },
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

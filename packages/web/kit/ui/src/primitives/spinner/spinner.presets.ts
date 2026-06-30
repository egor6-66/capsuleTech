/**
 * Spinner presets — именованные варианты Spinner-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Три размера (CVA `size` enum: sm / md / lg) + вариант с a11y-подписью.
 */

import type { IPreset } from '../../manifest/types';

const singleSpinner = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'spn',
    nodes: {
      spn: { id: 'spn', type: 'ui.Spinner', parentId: null, children: [], props },
    },
  },
});

export const spinnerPresets: readonly IPreset[] = [
  {
    id: 'small',
    label: 'Small',
    schema: singleSpinner({ size: 'sm' }),
    description:
      'Компактный спиннер (16px) — inline в кнопке, рядом с текстом, в плотных списках. Не перетягивает внимание.',
  },
  {
    id: 'medium',
    label: 'Medium',
    schema: singleSpinner({ size: 'md' }),
    description:
      'Базовый размер (24px) — дефолт для загрузки секции/карточки. Используй когда грузится отдельный блок контента.',
  },
  {
    id: 'large',
    label: 'Large',
    schema: singleSpinner({ size: 'lg' }),
    description:
      'Крупный спиннер (32px) — для полноэкранной загрузки, пустого состояния страницы, центрального лоадера.',
  },
  {
    id: 'with-label',
    label: 'With label',
    schema: singleSpinner({ size: 'md', label: 'Загрузка…' }),
    description:
      'Спиннер с a11y-подписью для скринридера (`label` → aria-label). Используй когда контекст загрузки неочевиден из окружения.',
  },
];

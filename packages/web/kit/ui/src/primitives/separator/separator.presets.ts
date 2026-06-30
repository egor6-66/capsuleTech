/**
 * Separator presets — именованные варианты Separator-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Два варианта по ориентации (CVA `variant` enum: horizontal / vertical).
 */

import type { IPreset } from '../../manifest/types';

const singleSeparator = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'sep',
    nodes: {
      sep: { id: 'sep', type: 'ui.Separator', parentId: null, children: [], props },
    },
  },
});

export const separatorPresets: readonly IPreset[] = [
  {
    id: 'horizontal',
    label: 'Horizontal',
    schema: singleSeparator({ variant: 'horizontal' }),
    description:
      'Горизонтальная линия между блоками контента — секции списка, группы настроек, разделы формы. Тянется на всю ширину родителя (`w-full`).',
  },
  {
    id: 'vertical',
    label: 'Vertical',
    schema: singleSeparator({ variant: 'vertical' }),
    description:
      'Вертикальная линия между inline-элементами — кнопки в тулбаре, breadcrumb-сегменты. Требует родителя с заданной высотой (`h-full`), иначе схлопывается.',
  },
];

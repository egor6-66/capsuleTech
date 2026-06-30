/**
 * Label presets — именованные варианты Label-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Label тривиален (нет CVA-variant'ов) — один базовый пресет достаточен.
 */

import type { IPreset } from '../../manifest/types';

const singleLabel = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'lbl',
    nodes: {
      lbl: { id: 'lbl', type: 'ui.Label', parentId: null, children: [], props },
    },
  },
});

export const labelPresets: readonly IPreset[] = [
  {
    id: 'default',
    label: 'Default',
    schema: singleLabel({ children: 'Label' }),
    description:
      'Текстовая подпись к полю формы. Связывается с контролом через `for` (id поля) — клик по подписи фокусирует input. Текст задаётся в `children`.',
  },
];

/**
 * Field presets — именованные варианты Field-композиции для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Field — композиция form-поля: суть в наборе частей (Label + Content[control]
 * + Description/Error) и раскладке (`orientation`). Пресеты — многоуровневые
 * деревья из `ui.Field.*` частей; контрол внутри Content — `ui.Input` / `ui.Toggle`.
 */

import type { IEditorNode } from '@capsuletech/web-contract';
import type { IPreset } from '../../manifest/types';

/** Декларативная нода-спека — компилируется в плоскую {root, nodes} карту. */
type NodeSpec = { type: string; props?: Record<string, unknown>; children?: NodeSpec[] };

/** Плоская карта нод из вложенной спеки. Id детерминированы по пути (`n` → `n-0` → `n-0-1`). */
const buildSchema = (spec: NodeSpec): IPreset['schema'] => {
  const nodes: Record<string, IEditorNode> = {};
  const walk = (s: NodeSpec, id: string, parentId: string | null): void => {
    const childIds = (s.children ?? []).map((_, i) => `${id}-${i}`);
    nodes[id] = {
      id,
      type: s.type,
      parentId,
      children: childIds,
      ...(s.props ? { props: s.props } : {}),
    };
    (s.children ?? []).forEach((c, i) => {
      walk(c, childIds[i], id);
    });
  };
  walk(spec, 'n', null);
  return { components: { root: 'n', nodes } };
};

export const fieldPresets: readonly IPreset[] = [
  {
    id: 'default',
    label: 'Input field',
    schema: buildSchema({
      type: 'ui.Field',
      props: { orientation: 'vertical' },
      children: [
        { type: 'ui.Field.Label', props: { children: 'E-mail' } },
        {
          type: 'ui.Field.Content',
          children: [
            { type: 'ui.Input', props: { type: 'email', placeholder: 'you@example.com' } },
          ],
        },
        {
          type: 'ui.Field.Description',
          props: { children: 'Не публикуется — нужен только для входа.' },
        },
      ],
    }),
    description:
      'Базовое поле формы: метка над вводом + поясняющее описание. Дефолт для форм регистрации, настроек, фильтров.',
  },
  {
    id: 'with-error',
    label: 'With error',
    schema: buildSchema({
      type: 'ui.Field',
      props: { orientation: 'vertical' },
      children: [
        { type: 'ui.Field.Label', props: { children: 'Пароль' } },
        {
          type: 'ui.Field.Content',
          children: [{ type: 'ui.Input', props: { type: 'password', placeholder: '••••••••' } }],
        },
        { type: 'ui.Field.Error', props: { children: 'Минимум 8 символов.' } },
      ],
    }),
    description:
      'Поле в состоянии ошибки валидации — метка + ввод + сообщение об ошибке (вместо описания). Для inline-валидации форм.',
  },
  {
    id: 'horizontal',
    label: 'Horizontal toggle',
    schema: buildSchema({
      type: 'ui.Field',
      props: { orientation: 'horizontal' },
      children: [
        { type: 'ui.Field.Label', props: { children: 'Уведомления' } },
        {
          type: 'ui.Field.Content',
          children: [{ type: 'ui.Toggle', props: { defaultChecked: true } }],
        },
      ],
    }),
    description:
      'Горизонтальное поле — метка слева, контрол справа. Канон для строк настроек с переключателями (toggle/checkbox).',
  },
];

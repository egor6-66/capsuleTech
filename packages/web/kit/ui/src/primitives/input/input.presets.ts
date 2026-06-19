/**
 * Input presets — именованные варианты Input-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Три базовых пресета покрывают наиболее частые типы однострочного ввода:
 * text (общий), password (секреты), number (числа).
 */

import type { IPreset } from '../../manifest/types';

const singleInput = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'in',
    nodes: {
      in: { id: 'in', type: 'ui.Input', parentId: null, children: [], props },
    },
  },
});

export const inputPresets: readonly IPreset[] = [
  {
    id: 'text',
    label: 'Text',
    schema: singleInput({ type: 'text', placeholder: 'Введите текст' }),
    description:
      'Обычный однострочный ввод. Дефолт для имён, описаний, поиска без специальной семантики.',
  },
  {
    id: 'password',
    label: 'Password',
    schema: singleInput({ type: 'password', placeholder: 'Пароль' }),
    description:
      'Маскированный ввод для секретов. Браузер скрывает символы, отключает autocomplete по умолчанию. Используй для passwords, PIN, OTP.',
  },
  {
    id: 'number',
    label: 'Number',
    schema: singleInput({ type: 'number', placeholder: '0' }),
    description:
      'Числовой ввод с native step-controls. Для количеств, цен, возраста. Для денег с дробной частью — следи за локалью (точка vs запятая).',
  },
];

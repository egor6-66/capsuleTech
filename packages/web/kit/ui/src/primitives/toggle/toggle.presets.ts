/**
 * Toggle presets — именованные варианты Toggle-компонента для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Покрываем 5 базовых кейсов: off (дефолт), on (preselected), три размера, disabled.
 */

import type { IPreset } from '../../manifest/types';

const singleToggle = (props: Record<string, unknown>): IPreset['schema'] => ({
  components: {
    root: 'tgl',
    nodes: {
      tgl: { id: 'tgl', type: 'ui.Toggle', parentId: null, children: [], props },
    },
  },
});

export const togglePresets: readonly IPreset[] = [
  {
    id: 'off',
    label: 'Off',
    schema: singleToggle({ size: 'md', label: 'Уведомления' }),
    description:
      'Переключатель в выключенном состоянии (дефолт). Используй для опций которые по умолчанию неактивны (включить экспериментальный режим, подписаться на рассылку).',
  },
  {
    id: 'on',
    label: 'On',
    schema: singleToggle({ size: 'md', label: 'Уведомления', defaultChecked: true }),
    description:
      'Переключатель в активном состоянии (preselected). Используй когда опция включена по умолчанию (auto-save, push-уведомления).',
  },
  {
    id: 'small',
    label: 'Small',
    schema: singleToggle({ size: 'sm', label: 'Компакт' }),
    description: 'Компактный размер — для плотных списков настроек, inline-флагов в таблицах.',
  },
  {
    id: 'large',
    label: 'Large',
    schema: singleToggle({ size: 'lg', label: 'Крупный' }),
    description: 'Крупный размер — для primary-настройки экрана, onboarding-флоу, touch-зоны.',
  },
  {
    id: 'disabled',
    label: 'Disabled',
    schema: singleToggle({ size: 'md', label: 'Заблокирован', disabled: true }),
    description:
      'Неактивный переключатель — когда опция временно недоступна (требует другой настройки, нет разрешения).',
  },
];

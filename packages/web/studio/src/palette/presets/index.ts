/**
 * Presets registry — палитра берёт варианты компонента по его `type`
 * (dot-path из kit-манифеста, e.g. `'ui.Button'`).
 *
 * Сейчас только Button. По мере добавления презентационных вариантов
 * других компонентов их пресеты регистрируются здесь.
 */

import { buttonPresets } from './button';
import type { IPreset } from './types';

const PRESETS_BY_TYPE: Record<string, readonly IPreset[]> = {
  'ui.Button': buttonPresets,
};

export const getPresets = (type: string): readonly IPreset[] =>
  PRESETS_BY_TYPE[type] ?? [];

export const hasPresets = (type: string): boolean => getPresets(type).length > 0;

export type { IPreset } from './types';
/**
 * @capsuletech/web-studio/palette — палитра компонентов студио.
 *
 * Итерация 1 экспортит только структурный компонент `Palette` —
 * трёхуровневый accordion (примитивы/композиции → компоненты → дефолт/кастом)
 * без режимов взаимодействия (DnD/click → следующие итерации).
 */

export { groupManifests, type IPaletteGroups } from './groups';
export { Palette } from './Palette';

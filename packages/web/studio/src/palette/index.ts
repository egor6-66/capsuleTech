/**
 * @capsuletech/web-studio/palette — палитра компонентов студио.
 *
 * Только имена компонентов и пресетов (без live preview в самой палитре).
 * Click по пресету пишет его в `<WebStudio.Provider>` selection — `<WebStudio.Canvas>`
 * рендерит preview через Renderer. Композиция-режим (DnD сборка) — будущая итерация.
 *
 * Пресеты — JSON-схемы для Renderer'а; сейчас зарегистрированы только для Button
 * (`ui.Button` — обычная и иконочная).
 */

export { ComponentsPalette } from './ComponentsPalette';
export { groupManifests, type IPaletteGroups } from './groups';

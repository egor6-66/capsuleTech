/**
 * WebStudio.CanvasStyle — тонкая HCA-обёртка над `<CanvasStyle>` блоком.
 *
 * Канон thin-controller'а студио (см. memory `studio_controller_thin`):
 * controllers/ = read-store→pass-props, вся презентация и helpers в
 * одноимённой папке-модуле (`canvas-style/`). Здесь делать нечего —
 * canvas-style сам читает свой singleton stateless'ово, контроллер просто
 * экспортирует блок для регистрации в `capsule.ts`.
 */

export { CanvasStyle as WebStudioCanvasStyle } from '../canvas-style';

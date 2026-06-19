/**
 * @capsuletech/web-studio/controllers
 *
 * Surface связки палитры/канваса/инспектора пропсов:
 *  - WebStudioCanvas      — preview выбранного пресета через Renderer (kit хардкод)
 *  - WebStudioCanvasStyle — canvas-only override темы/dark (рядом с Inspector'ом)
 *  - WebStudioProps       — редактор пропсов выбранного пресета
 *  - WebStudioInfo        — info-панель (контракт / манифест / readme)
 *
 * Selection state — singleton, см. корневой `@capsuletech/web-studio` или
 * `@capsuletech/web-studio/selection`.
 *
 * Регистрация в app: через `@capsuletech/web-studio/capsule` (ADR 033).
 */

export { WebStudioCanvas } from './WebStudioCanvas';
export { WebStudioCanvasStyle } from './WebStudioCanvasStyle';
export {
  type IWebStudioCreatorRootProps,
  WebStudioCreatorRoot,
} from './WebStudioCreatorRoot';
export { WebStudioInfo } from './WebStudioInfo';
export { WebStudioProps } from './WebStudioProps';
export { WebStudioTree } from './WebStudioTree';
export { WebStudioWelcome } from './WebStudioWelcome';

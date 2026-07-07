/**
 * core/ — cross-cutting студии: провайдер, контексты, SSOT-стор дерева и
 * координация режима. Зеркало `learn/core/index.ts` (анатомия
 * `docs/_meta/package-anatomy.md`). Импортируется модулями как `../../core`.
 */

export { CanvasNameContext, DEFAULT_CANVAS_NAME, useCanvasName } from './canvasContext';
export { COMPOSITION_ROOT_ID, type DocMode, type IWebStudioDocument, useDocument } from './document';
export { type IStudioProviderProps, StudioProvider } from './provider';
export { type StudioMode, useStudioMode } from './useStudioMode';

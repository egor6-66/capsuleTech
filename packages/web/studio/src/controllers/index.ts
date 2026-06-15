/**
 * @capsuletech/web-studio/controllers
 *
 * HCA-integration subpath (ADR 032, фаза 5-6). Зависит на @capsuletech/web-core —
 * изолировано в этом subpath'е, generic-ядро пакета (src/index.ts) web-core
 * не импортирует.
 *
 * Поставляет:
 *  - WebStudioController — package-shipped HCA-Controller (tree/selection/drag/marks)
 *  - WebStudioOverlay    — edit-decoration компонент для <Renderer editOverlay={...} />
 *  - WebStudioProvider   — WebStudio.Provider: kit-context + Controllers.WebStudio wrapper
 *  - WebStudioCanvas     — WebStudio.Canvas: render surface с DnD drop-зоной
 *  - useWebStudio        — типизированный хук (плоские getter'ы без кастов)
 *  - useWebStudioKit     — читает kit из WebStudioProvider context
 *
 * Регистрация в app: через @capsuletech/web-studio/capsule (ADR 033).
 * Прямой импорт: для кастомных сценариев или unit-тестов.
 */

export { WebStudioCanvas } from './WebStudioCanvas';
export type {
  IWebStudioCtx,
  IOnDragOverCanvasPayload,
  IOnDragOverTreePayload,
  IOnDropPayload,
  IOnMarkPayload,
  IOnUpdateNodePropsPayload,
} from './WebStudioController';
export { default as WebStudioController } from './WebStudioController';
export { WebStudioInspector, schemaToInspectorCategories } from './WebStudioInspector';
export { WebStudioOverlay } from './WebStudioOverlay';
export {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CONTAINER_ORDER,
  catRank,
  WebStudioPalette,
  orderRank,
} from './WebStudioPalette';
export type { WebStudioKit, IWebStudioProviderProps } from './WebStudioProvider';
export { WebStudioProvider, useWebStudioKit } from './WebStudioProvider';
export { WebStudioTree } from './WebStudioTree';
export type { IUseWebStudioResult } from './useWebStudio';
export { useWebStudio } from './useWebStudio';

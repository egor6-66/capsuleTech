/**
 * @capsuletech/web-ui-creator/controllers
 *
 * HCA-integration subpath (ADR 032, фаза 5-6). Зависит на @capsuletech/web-core —
 * изолировано в этом subpath'е, generic-ядро пакета (src/index.ts) web-core
 * не импортирует.
 *
 * Поставляет:
 *  - EditorController — package-shipped HCA-Controller (tree/selection/drag/marks)
 *  - EditorOverlay    — edit-decoration компонент для <Renderer editOverlay={...} />
 *  - EditorProvider   — Editor.Provider: kit-context + Controllers.Editor wrapper
 *  - EditorCanvas     — Editor.Canvas: render surface с DnD drop-зоной
 *  - useEditor        — типизированный хук (плоские getter'ы без кастов)
 *  - useEditorKit     — читает kit из EditorProvider context
 *
 * Регистрация в app: через @capsuletech/web-ui-creator/capsule (ADR 033).
 * Прямой импорт: для кастомных сценариев или unit-тестов.
 */

export { EditorCanvas } from './EditorCanvas';
export type {
  IEditorCtx,
  IOnDragOverCanvasPayload,
  IOnDragOverTreePayload,
  IOnDropPayload,
  IOnMarkPayload,
  IOnUpdateNodePropsPayload,
} from './EditorController';
export { default as EditorController } from './EditorController';
export { EditorInspector, schemaToInspectorCategories } from './EditorInspector';
export { EditorOverlay } from './EditorOverlay';
export {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CONTAINER_ORDER,
  catRank,
  EditorPalette,
  orderRank,
} from './EditorPalette';
export type { EditorKit, IEditorProviderProps } from './EditorProvider';
export { EditorProvider, useEditorKit } from './EditorProvider';
export { EditorTree } from './EditorTree';
export type { IUseEditorResult } from './useEditor';
export { useEditor } from './useEditor';

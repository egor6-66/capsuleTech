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

export { default as EditorController } from './EditorController';
export type {
  IEditorCtx,
  IOnDragOverCanvasPayload,
  IOnDragOverTreePayload,
  IOnDropPayload,
  IOnMarkPayload,
} from './EditorController';

export { EditorOverlay } from './EditorOverlay';

export { EditorProvider, useEditorKit } from './EditorProvider';
export type { EditorKit, IEditorProviderProps } from './EditorProvider';

export { EditorCanvas } from './EditorCanvas';

export { EditorTree } from './EditorTree';

export { useEditor } from './useEditor';
export type { IUseEditorResult } from './useEditor';

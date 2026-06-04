/**
 * @capsuletech/web-ui-creator/controllers
 *
 * HCA-integration subpath (ADR 032, фаза 5). Зависит на @capsuletech/web-core —
 * изолировано в этом subpath'е, generic-ядро пакета (src/index.ts) web-core
 * не импортирует.
 *
 * Поставляет:
 *  - EditorController — package-shipped HCA-Controller (tree/selection/drag/marks)
 *  - EditorOverlay    — edit-decoration компонент для <Renderer editOverlay={...} />
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

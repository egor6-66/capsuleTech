/**
 * WebStudio.CreatorRoot — обёртка верхнего уровня для creator-страницы студии.
 *
 * Монтирует общий `<DnDProvider>` для палитры и canvas'а: drag начинается в
 * `WebStudio.ComponentsPalette` (`DraggablePresetItem`), приземляется в
 * `WebStudio.Canvas` (creator-mode drop-target). Один Provider на дереве —
 * иначе drag/drop в разных под-tree'ях не коммуницируют.
 *
 * Использование на стороне app:
 * ```tsx
 * const Creator = Page((Ui) => (
 *   <WebStudio.CreatorRoot>
 *     <Layouts.Matrix preset="app-shell" slots={{
 *       sidebar: { children: <Widgets.Studio.ComponentsPalette /> },
 *       main: { children: <Widgets.Studio.Canvas /> },
 *       ...
 *     }} />
 *   </WebStudio.CreatorRoot>
 * ));
 * ```
 *
 * **Что НЕ делает (намеренно для первой итерации):**
 *  - НЕ создаёт ControllerContext / FSM — composition-store пока singleton
 *    (`@capsuletech/web-studio/composition`), без HCA-обёртки. Подъём в
 *    Controllers.WebStudioCreator — следующая итерация когда понадобится
 *    intent-state (drag-over zones, selection в дереве, undo).
 *  - НЕ монтирует `DragOverlay` — Provider по-умолчанию показывает ghost'а
 *    (showDefaultOverlay=true), для первой итерации достаточно. Кастомный
 *    overlay — следующая итерация.
 */

import { DnDProvider } from '@capsuletech/web-dnd';
import type { JSX } from 'solid-js';

export interface IWebStudioCreatorRootProps {
  children: JSX.Element;
}

export const WebStudioCreatorRoot = (props: IWebStudioCreatorRootProps) => (
  <DnDProvider showDefaultOverlay>{props.children}</DnDProvider>
);

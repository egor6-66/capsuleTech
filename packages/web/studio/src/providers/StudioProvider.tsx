/**
 * WebStudio.Provider — провайдер верхнего уровня студии.
 *
 * Монтирует общий `<DnDProvider>` для палитры и creator-mode drop-target'а: drag
 * начинается в `WebStudio.ComponentsPalette` (`DraggablePresetItem`), приземляется
 * в drop-зоне creator-режима. Один Provider на дереве — иначе drag/drop в разных
 * под-tree'ях не коммуницируют.
 *
 * Это будущий дом для всей под-капотной обвязки студио (движок + событийный
 * seam); в текущей итерации тело — только `<DnDProvider showDefaultOverlay>`
 * (Provider показывает дефолтного ghost'а, кастомный `DragOverlay` — позже).
 *
 * Регистрируется как `WebStudio.Provider` через `../capsule` (ADR 033).
 */

import { DnDProvider } from '@capsuletech/web-dnd';
import type { JSX } from 'solid-js';

export interface IStudioProviderProps {
  children: JSX.Element;
}

export const StudioProvider = (props: IStudioProviderProps) => (
  <DnDProvider showDefaultOverlay>{props.children}</DnDProvider>
);

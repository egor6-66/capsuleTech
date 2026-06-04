/**
 * useEditor — типизированный хук для чтения контекста EditorController.
 *
 * Создан через `createUseCtx<IEditorCtx>()` из `@capsuletech/web-core`.
 * Используется в компонентах, монтируемых внутри `<Controllers.Editor>`:
 *   `const ctx = useEditor(); ctx.store.ctx.data` → `IEditorCtx`
 *
 * Экспортируется из `/controllers` barrel — доступен потребителям subpath'а.
 */

import { createUseCtx } from '@capsuletech/web-core';
import type { IEditorCtx } from './EditorController';

/**
 * Типизированный хук для компонентов внутри EditorController-scope.
 *
 * ```tsx
 * const ctx = useEditor();
 * const tree = ctx.store.ctx.data as IEditorCtx; // no TS2352
 * ```
 */
export const useEditor = createUseCtx<IEditorCtx>();

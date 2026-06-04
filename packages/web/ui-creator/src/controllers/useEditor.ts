/**
 * useEditor — типизированный хук для чтения контекста EditorController.
 *
 * Возвращает плоские реактивные getter'ы `{ tree, selectedId, dragSpec, … }` —
 * без кастов на call-site. Внутри хранит единственный каст `any → IEditorCtx`
 * (Bridge.ctx.data типизирован как `any`), скрытый от потребителей.
 *
 * Используется в компонентах, монтируемых внутри `<Controllers.Editor>`:
 * ```tsx
 * const ed = useEditor();
 * ed.tree          // IEditorTree
 * ed.selectedId    // NodeId | null
 * ```
 *
 * Не используй `useCtx()` напрямую в editor-поверхностях — это обходит
 * типизацию и вводит касты обратно.
 */

import { useCtx } from '@capsuletech/web-core';
import type { IEditorCtx } from './EditorController';

/**
 * Доступ к IEditorCtx без кастов на call-site.
 *
 * Все поля ленивые (getter'ы) — Solid реактивно отслеживает обращения
 * к `store.ctx.data.*` через Bridge-прокси, как при прямом доступе.
 */
export const useEditor = () => {
  const ctx = useCtx();
  // Единственный каст в этом файле: Bridge.ctx.data типизирован как `any`
  // (IMachineContext<TCtx> не параметризован сквозь IBridge).
  // Каст безопасен: EditorController кладёт IEditorCtx в schema.context.
  const data = () => ctx.store.ctx.data as IEditorCtx;

  return {
    get tree() {
      return data().tree;
    },
    get selectedId() {
      return data().selectedId;
    },
    get dragSpec() {
      return data().dragSpec;
    },
    get dropTargetId() {
      return data().dropTargetId;
    },
    get intent() {
      return data().intent;
    },
    get marks() {
      return data().marks;
    },
    /** Прямой доступ к raw ctx для нестандартных use-case'ов (избегай). */
    get _ctx() {
      return ctx;
    },
  };
};

export type IUseEditorResult = ReturnType<typeof useEditor>;

/**
 * Editor.Provider — контекст-обёртка редактора (ADR 032, фаза 6).
 *
 * Принимает `kit` — объект UI-компонентов, который Canvas использует как
 * render-registry (передаёт в `<Renderer registry={{ ui: kit }}>`).
 * Таким образом редактор параметризуется китом и не хардкодит @capsuletech/web-ui.
 *
 * Монтирует `<Controllers.Editor>` внутри, поэтому дочерние компоненты
 * (Canvas, Overlay, Inspector) видят и editor-kit через `useEditorKit()`,
 * и editor-state через `useEditor()`.
 *
 * Использование в app:
 * ```tsx
 * const WorkspacePage = Page((Ui) => (
 *   <Editor.Provider kit={Ui}>
 *     <Editor.Canvas />
 *   </Editor.Provider>
 * ));
 * ```
 *
 * `Controllers.Editor` — глобал, инжектируется через capsule-registry
 * (@capsuletech/web-ui-creator/capsule → defineCapsuleModule).
 * Provider не импортирует Controllers напрямую — читает из globalThis
 * как и любой Widget в приложении.
 */

import { createContext, useContext, type JSX } from 'solid-js';
import type { Registry } from '@capsuletech/web-renderer';

// ── Kit context ────────────────────────────────────────────────────────────────

/**
 * Кит — объект UI-компонентов, пригодный как registry для web-renderer.
 * App передаёт свой `Ui` (проксированная копия), пакет не хардкодит реализацию.
 *
 * На runtime это тот же shape что Registry['ui'] — вложенный объект компонентов.
 */
export type EditorKit = Registry;

const EditorKitContext = createContext<EditorKit>();

/**
 * Читает kit из Editor.Provider.
 *
 * @throws если вызван вне `<Editor.Provider>` (context = undefined).
 */
export const useEditorKit = (): EditorKit => {
  const kit = useContext(EditorKitContext);
  if (!kit) {
    throw new Error(
      '[web-ui-creator] useEditorKit() вызван вне <Editor.Provider>. ' +
        'Убедись что Editor.Canvas / EditorOverlay монтируются внутри <Editor.Provider>.',
    );
  }
  return kit;
};

// ── Provider props ────────────────────────────────────────────────────────────

export interface IEditorProviderProps {
  /**
   * UI-кит для render-registry. Обычно `Ui` из Page factory — уже проксированная
   * копия под текущий ControllerContext.
   */
  kit: EditorKit;
  children: JSX.Element;
}

/**
 * Editor.Provider — монтирует EditorController + прокидывает kit в context.
 *
 * `Controllers.Editor` читается из globalThis (capsule-registry inject).
 * Если registry ещё не инициализирован (unit-тест без bootstrap) —
 * рендерит только kit-context без Controller-обёртки.
 */
export const EditorProvider = (props: IEditorProviderProps) => {
  // Controllers — глобальный реестр, инжектируемый capsule-bootstrap'ом.
  // В unit-тестах или SSR без bootstrap'а Controllers может быть undefined.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EditorCtrl = (globalThis as any).Controllers?.Editor as
    | ((p: { children: JSX.Element }) => JSX.Element)
    | undefined;

  return (
    <EditorKitContext.Provider value={props.kit}>
      {EditorCtrl ? (
        <EditorCtrl>{props.children}</EditorCtrl>
      ) : (
        props.children
      )}
    </EditorKitContext.Provider>
  );
};

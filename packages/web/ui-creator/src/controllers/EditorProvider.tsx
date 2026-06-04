/**
 * Editor.Provider — контекст-обёртка редактора (ADR 032, фаза 6).
 *
 * ## Два кита редактора
 *
 * Редактор работает с двумя независимыми наборами компонентов:
 *
 * ### 1. КОНТЕНТ-кит (`kit` prop → `useEditorKit()`)
 * Передаётся пропом в `<Editor.Provider kit={...}>`. Это UI-компоненты, ИЗ которых
 * пользователь строит свой UI: им наполняется палитра (превью) и рендерится Canvas.
 * Результат редактора — JSON-дерево под этот кит. Юзер может передать любой кит.
 * Доступен через `useEditorKit()`. Используется ТОЛЬКО в Canvas и превью Palette.
 *
 * ### 2. Chrome-кит (= `@capsuletech/web-ui`, прямая зависимость пакета)
 * Фиксированный набор UI-компонентов, КОТОРЫМИ нарисован сам редактор: поля
 * инспектора, дропдауны Palette/Tree, кнопки панелей. Импортируется напрямую
 * из `@capsuletech/web-ui/*` в каждом файле где нужен. НЕ зависит от редактируемого
 * контента и НЕ передаётся через контекст.
 *
 * **Правило:** редактировать контент → `useEditorKit()`; рисовать chrome редактора → `@capsuletech/web-ui`.
 *
 * ---
 *
 * Принимает `kit` — объект UI-компонентов, который Canvas использует как
 * render-registry (передаёт в `<Renderer registry={{ ui: kit }}>`).
 * Таким образом редактор параметризуется китом и не хардкодит @capsuletech/web-ui.
 *
 * Монтирует `<Controllers.Editor>` внутри, поэтому дочерние компоненты
 * (Canvas, Overlay, Inspector) видят и editor-kit через `useEditorKit()`,
 * и editor-state через `useEditor()`.
 *
 * Также монтирует `<DnDProvider>` — редактор владеет своим drag-and-drop,
 * app-консумер про web-dnd знать не должен.
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
import { DnDProvider } from '@capsuletech/web-dnd';

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
 * Читает КОНТЕНТ-кит из Editor.Provider.
 *
 * КОНТЕНТ-кит — UI-компоненты, ИЗ которых пользователь строит свой UI
 * (Canvas render + Palette превью). НЕ используется для chrome самого редактора
 * (поля инспектора, Dropdown, кнопки) — chrome импортирует из `@capsuletech/web-ui` напрямую.
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
   * КОНТЕНТ-кит — UI-компоненты, ИЗ которых пользователь строит свой UI.
   * Используется как render-registry в Canvas и как источник превью в Palette.
   * Обычно `Ui` из Page factory — уже проксированная копия под текущий ControllerContext.
   *
   * Chrome самого редактора (Dropdown, Input, Toggle) — прямые импорты из
   * `@capsuletech/web-ui`, не зависят от этого кита.
   */
  kit: EditorKit;
  children: JSX.Element;
  /**
   * Показывать ли встроенный drag-оверлей (ghost под курсором во время drag).
   * По умолчанию `true` — editor-internal affordance.
   */
  showDefaultOverlay?: boolean;
}

/**
 * Editor.Provider — монтирует DnDProvider + EditorController + прокидывает kit в context.
 *
 * Порядок вложенности (снаружи → внутри):
 *   DnDProvider  →  EditorKitContext  →  Controllers.Editor  →  children
 *
 * Такой порядок гарантирует что surfaces-потомки видят всех трёх:
 * - DnD-context (useDnD)
 * - kit (useEditorKit)
 * - editor-state (useEditor через ControllerContext Controllers.Editor)
 *
 * `Controllers.Editor` читается из globalThis (capsule-registry inject).
 * Если registry ещё не инициализирован (unit-тест без bootstrap) —
 * рендерит только DnD + kit-context без Controller-обёртки.
 */
export const EditorProvider = (props: IEditorProviderProps) => {
  // Controllers — глобальный реестр, инжектируемый capsule-bootstrap'ом.
  // В unit-тестах или SSR без bootstrap'а Controllers может быть undefined.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const EditorCtrl = (globalThis as any).Controllers?.Editor as
    | ((p: { children: JSX.Element }) => JSX.Element)
    | undefined;

  const showOverlay = () => props.showDefaultOverlay ?? true;

  return (
    <DnDProvider showDefaultOverlay={showOverlay()}>
      <EditorKitContext.Provider value={props.kit}>
        {EditorCtrl ? (
          <EditorCtrl>{props.children}</EditorCtrl>
        ) : (
          props.children
        )}
      </EditorKitContext.Provider>
    </DnDProvider>
  );
};

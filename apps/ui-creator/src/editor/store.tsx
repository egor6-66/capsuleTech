/**
 * Editor store — общий стейт конструктора (дерево + выделение), доступный из
 * любой панели (Canvas / Tree / Inspector) через `useEditor()`.
 *
 * Простой Solid-контекст: дерево — единственный источник правды. Tree рисует по
 * нему иерархию, Canvas рендерит + мутирует через `setTree`. Провайдер оборачивает
 * Matrix в Constructor (как DnDProvider) — слот-контент создаётся в его scope,
 * поэтому `useEditor` его видит.
 *
 * Пока обычный signal-store. Когда появятся side-effects (save на бэк и т.п.) —
 * та часть уедет в Feature; дерево-стейт может остаться тут.
 */
import { createEmptyTree, type IEditorTree, type NodeId } from '@capsuletech/web-ui-creator/state';
import { createContext, createSignal, type JSX, useContext } from 'solid-js';

const createEditorStore = () => {
  const [tree, setTree] = createSignal<IEditorTree>(createEmptyTree('ui.Layout.Grid'));
  const [selectedId, setSelectedId] = createSignal<NodeId | null>(null);
  return { tree, setTree, selectedId, setSelectedId };
};

export type IEditorStore = ReturnType<typeof createEditorStore>;

const EditorContext = createContext<IEditorStore>();

export const EditorProvider = (props: { children: JSX.Element }): JSX.Element => (
  <EditorContext.Provider value={createEditorStore()}>{props.children}</EditorContext.Provider>
);

export const useEditor = (): IEditorStore => {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('[ui-creator] useEditor must be used inside <EditorProvider>');
  return ctx;
};

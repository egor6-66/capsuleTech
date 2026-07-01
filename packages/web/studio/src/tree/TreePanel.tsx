/**
 * TreePanel — connected-обёртка над деревом композиции creator-режима.
 *
 * Читает schema + selection из единого document-стора (`useDocument`),
 * пробрасывает в stateless `<Tree>`. Клик строки → `selectNode`; клик пресета
 * в мини-палитре узла → `insertPreset(preset, nodeId)`. Презентация
 * (рекурсивные строки + Accordion-обёртки + мини-палитра) — чистая в `./Tree`.
 *
 * Регистрируется как `WebStudio.Tree` через `../capsule` (ADR 033).
 */

import { useDocument } from '../document';
import { Tree } from './Tree';

export const TreePanel = () => {
  const { schema, selectedNodeId, selectNode, insertPreset } = useDocument();
  return (
    <Tree
      nodes={schema().components.nodes}
      rootId={schema().components.root}
      selectedNodeId={selectedNodeId()}
      onSelect={selectNode}
      onInsert={(preset, parentId) => insertPreset(preset, parentId)}
    />
  );
};

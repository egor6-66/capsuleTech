/**
 * TreePanel — connected-обёртка над деревом композиции creator-режима.
 *
 * Читает `creator`-слайс document-стора (`useDocument('creator')`) — дерево
 * живёт только в creator и не мешается со store-слайсом (переход store↔creator
 * его не обнуляет). Клик строки → `selectNode`; клик пресета в мини-палитре узла
 * → `insertPreset(preset, nodeId)`; раскрытие/сворачивание → `setExpanded`
 * (persist open-состояния). Презентация — чистая в `./Tree`.
 *
 * Регистрируется как `WebStudio.Tree` через `../capsule` (ADR 033).
 */

import { useDocument } from '../document';
import { Tree } from './Tree';

export const TreePanel = () => {
  const { schema, selectedNodeId, selectNode, insertPreset, isExpanded, setExpanded, moveNode } =
    useDocument('creator');
  return (
    <Tree
      nodes={schema().components.nodes}
      rootId={schema().components.root}
      selectedNodeId={selectedNodeId()}
      onSelect={selectNode}
      onInsert={(preset, parentId) => insertPreset(preset, parentId)}
      isExpanded={isExpanded}
      onToggleExpand={setExpanded}
      onMove={moveNode}
    />
  );
};

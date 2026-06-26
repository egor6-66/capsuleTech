/**
 * TreePanel — connected-обёртка над деревом композиции creator-режима.
 *
 * Читает schema + selection через `useComposition()` (singleton), пробрасывает
 * в stateless `<Tree>`. Презентация (рекурсивные строки + Accordion-обёртки
 * для контейнеров) остаётся чистой в `./Tree`.
 *
 * Регистрируется как `WebStudio.Tree` через `../capsule` (ADR 033).
 */

import { useComposition } from '../composition';
import { Tree } from './Tree';

export const TreePanel = () => {
  const { schema, selectedNodeId, selectNode } = useComposition();
  return (
    <Tree
      nodes={schema().components.nodes}
      rootId={schema().components.root}
      selectedNodeId={selectedNodeId()}
      onSelect={selectNode}
    />
  );
};

/**
 * WebStudio.Tree — controller-обёртка над деревом композиции creator-режима.
 *
 * Читает schema + selection через `useComposition()` (singleton), пробрасывает
 * в `<Tree>` как пропсы. Презентация (рекурсивные строки + Accordion-обёртки
 * для контейнеров) — в `../tree/`.
 *
 * Селекшен пишется через `selectNode(id)` того же стора. Inspector / Canvas
 * editOverlay подтянутся к этому выбору в следующей итерации.
 */

import { useComposition } from '../composition';
import { Tree } from '../tree';

export const WebStudioTree = () => {
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

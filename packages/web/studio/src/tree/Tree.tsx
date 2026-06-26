/**
 * Tree — stateless дерево композиции creator-режима.
 *
 * Получает nodes/rootId/selectedNodeId/onSelect через props (резолвит
 * `TreePanel` connected-обёртка). Структура зеркалит `Info` / `ComponentsPalette`:
 * surface-компонент в `<Flex>`-обёртке, сам контент через рекурсивный
 * `<TreeRow>`. Раскрытие/сворачивание — kit `Accordion` per узел.
 *
 * `overflow-auto` на корне — длинное дерево скроллит внутри panel'а.
 */

import { Flex } from '@capsuletech/web-ui/flex';
import { TreeRow } from './TreeRow';
import type { ITreeProps } from './types';

export const Tree = (props: ITreeProps) => (
  <Flex orientation="vertical" class="h-full w-full overflow-auto">
    <TreeRow
      nodes={props.nodes}
      rootId={props.rootId}
      selectedNodeId={props.selectedNodeId}
      onSelect={props.onSelect}
      nodeId={props.rootId}
      depth={0}
    />
  </Flex>
);

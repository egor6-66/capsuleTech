/**
 * Row — реактивный wrapper строки дерева: indent (`padding-left` по `depth`),
 * hover/selected визуал, click-handler. Stateless, prop-driven.
 *
 * Используется в двух местах:
 *  - **Leaf:** напрямую как строка (нет потомков → нет Accordion-обёртки).
 *  - **Container:** внутри `Accordion.Trigger` как content того button-trigger'а.
 *    Click на Row фейерит `onSelect` + bubble'ом доходит до button → Kobalte
 *    toggles expand. Один клик = select + toggle (UX дерева).
 *
 * `Accordion.Trigger` строго типизирован (только `class` + `children`) — поэтому
 * `onClick`/`style`/`classList`/`data-testid` живут на Row, не на trigger'е.
 */

import { Flex } from '@capsuletech/web-ui/flex';
import type { IPrimitiveManifestEntry } from '@capsuletech/web-ui/manifest';
import { RowLabel } from './RowLabel';

export interface IRowProps {
  nodeId: string;
  nodeType: string | undefined;
  manifest: IPrimitiveManifestEntry | undefined;
  depth: number;
  selected: boolean;
  onSelect: () => void;
}

export const Row = (props: IRowProps) => (
  <Flex
    align="center"
    class="w-full cursor-pointer rounded-sm py-1 pr-2 transition-colors hover:bg-accent/40"
    classList={{ 'bg-accent text-accent-foreground hover:bg-accent': props.selected }}
    style={{ 'padding-left': `${props.depth * 12 + 8}px` }}
    onClick={props.onSelect}
    data-testid={`tree-row-${props.nodeId}`}
  >
    <RowLabel manifest={props.manifest} nodeType={props.nodeType} />
  </Flex>
);

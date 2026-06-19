/**
 * TreeRow — рекурсивная строка дерева композиции.
 *
 * Контейнерные ноды (`children.length > 0`) рендерятся через kit `Accordion` —
 * каждый узел = собственный `Accordion` с одним `Item`. Chevron + раскрытие
 * рисует сам Accordion.Trigger; click внутри Row'а bubble'ом доходит до
 * trigger-button'а → Kobalte toggles. Тот же клик через `Row.onSelect`
 * обновляет selection — один клик = select + toggle, без cancel/stopPropagation.
 *
 * Лист (`children.length === 0`) рендерится напрямую через `<Row>` — без
 * Accordion-обёртки, чтобы не платить за неё на каждом leaf'е.
 *
 * Per-row `defaultValue={[nodeId]}` → новые ноды по умолчанию раскрыты
 * (UX: drop в Flex root — сразу видишь куда упало).
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import { getManifest } from '@capsuletech/web-ui/manifest';
import { For, Show } from 'solid-js';
import { Row } from './Row';
import type { ITreeRowProps } from './types';

export const TreeRow = (props: ITreeRowProps) => {
  const node = () => props.nodes[props.nodeId];
  const manifest = () => {
    const n = node();
    return n ? getManifest(n.type) : undefined;
  };
  const hasChildren = () => (node()?.children.length ?? 0) > 0;
  const isSelected = () => props.selectedNodeId === props.nodeId;

  return (
    <Show
      when={hasChildren()}
      fallback={
        <Row
          nodeId={props.nodeId}
          nodeType={node()?.type}
          manifest={manifest()}
          depth={props.depth}
          selected={isSelected()}
          onSelect={() => props.onSelect(props.nodeId)}
        />
      }
    >
      <Accordion multiple defaultValue={[props.nodeId]} class="w-full divide-y-0">
        <Accordion.Item value={props.nodeId} class="border-0">
          <Accordion.Trigger class="px-0 py-0 text-xs font-normal">
            <Row
              nodeId={props.nodeId}
              nodeType={node()?.type}
              manifest={manifest()}
              depth={props.depth}
              selected={isSelected()}
              onSelect={() => props.onSelect(props.nodeId)}
            />
          </Accordion.Trigger>
          <Accordion.Content>
            <For each={node()!.children}>
              {(childId) => (
                <TreeRow
                  nodes={props.nodes}
                  rootId={props.rootId}
                  selectedNodeId={props.selectedNodeId}
                  onSelect={props.onSelect}
                  nodeId={childId}
                  depth={props.depth + 1}
                />
              )}
            </For>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Show>
  );
};

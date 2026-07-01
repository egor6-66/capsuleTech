/**
 * TreeRow — рекурсивная строка дерева композиции.
 *
 * Контейнерные ноды (узел ПРИНИМАЕТ детей по манифесту — `acceptsChildren`, а не
 * «уже имеет детей») рендерятся через kit `Accordion` — каждый узел = собственный
 * `Accordion` с одним `Item`. Chevron + раскрытие рисует сам Accordion.Trigger;
 * click внутри Row'а bubble'ом доходит до trigger-button'а → Kobalte toggles.
 * Тот же клик через `Row.onSelect` обновляет selection — один клик = select +
 * toggle, без cancel/stopPropagation.
 *
 * Внутри контейнера после детей — мини-палитра вставки (`<NodePalette>`): клик по
 * пресету вставляет ребёнка ИМЕННО в этот узел (creator-mode, вставка кликом).
 * Поэтому контейнер рисуется как Accordion ДАЖЕ пустым — иначе пустой корневой
 * Flex не получил бы первую вставку (бриф §3).
 *
 * Лист (тип не принимает детей) рендерится напрямую через `<Row>` — без
 * Accordion-обёртки и без мини-палитры.
 *
 * Per-row `defaultValue={[nodeId]}` → новые ноды по умолчанию раскрыты
 * (UX: вставка в Flex root — сразу видишь куда упало).
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import { getManifest } from '@capsuletech/web-ui/manifest';
import { For, Show } from 'solid-js';
import { acceptsChildren } from '../manifests';
import { NodePalette } from './NodePalette';
import { Row } from './Row';
import type { ITreeRowProps } from './types';

export const TreeRow = (props: ITreeRowProps) => {
  const node = () => props.nodes[props.nodeId];
  const manifest = () => {
    const n = node();
    return n ? getManifest(n.type) : undefined;
  };
  const hasChildren = () => (node()?.children.length ?? 0) > 0;
  const isContainer = () => acceptsChildren(node()?.type);
  const isSelected = () => props.selectedNodeId === props.nodeId;

  return (
    <Show
      when={isContainer() || hasChildren()}
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
            <For each={node()?.children ?? []}>
              {(childId) => (
                <TreeRow
                  nodes={props.nodes}
                  rootId={props.rootId}
                  selectedNodeId={props.selectedNodeId}
                  onSelect={props.onSelect}
                  onInsert={props.onInsert}
                  nodeId={childId}
                  depth={props.depth + 1}
                />
              )}
            </For>
            <Show when={isContainer()}>
              <NodePalette
                nodeType={node()!.type}
                depth={props.depth}
                onInsert={(preset) => props.onInsert(preset, props.nodeId)}
              />
            </Show>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Show>
  );
};

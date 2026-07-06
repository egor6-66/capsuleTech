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
 * **Корень (`nodeId === rootId`) — всегда открыт, БЕЗ сворачивания** (мандат
 * USER): рендерится как статическая строка (без Accordion/chevron) + дети +
 * мини-палитра всегда видны. Корень — точка входа всей сборки, скрывать его
 * незачем.
 *
 * Внутри контейнера после детей — мини-палитра вставки (`<NodePalette>`): клик по
 * пресету вставляет ребёнка ИМЕННО в этот узел (creator-mode, вставка кликом).
 * Поэтому контейнер рисуется как контейнер ДАЖЕ пустым — иначе пустой корневой
 * Flex не получил бы первую вставку (бриф §3).
 *
 * Лист (тип не принимает детей) рендерится напрямую через `<Row>` — без
 * Accordion-обёртки и без мини-палитры.
 *
 * Open-состояние не-корневых контейнеров — **controlled** через `isExpanded`/
 * `onToggleExpand` (persist в document-сторе, не в Kobalte): по дефолту закрыто;
 * при сворачивании родителя Kobalte анмаунтит контент, но состояние ребёнка
 * живёт в сторе → при ремаунте восстанавливается (свернул родителя — ребёнок
 * сохранил открыт/закрыт).
 */

import { DropIndicator } from '@capsuletech/web-dnd';
import { Accordion } from '@capsuletech/web-ui/accordion';
import { getManifest } from '@capsuletech/web-ui/manifest';
import { For, Show } from 'solid-js';
import { acceptsChildren } from '../../shared/manifests';
import { NodePalette } from './NodePalette';
import { Row } from './Row';
import type { ITreeRowProps } from './types';
import { useRowDnd } from './useRowDnd';

export const TreeRow = (props: ITreeRowProps) => {
  const node = () => props.nodes[props.nodeId];
  const manifest = () => {
    const n = node();
    return n ? getManifest(n.type) : undefined;
  };
  const hasChildren = () => (node()?.children.length ?? 0) > 0;
  const isContainer = () => acceptsChildren(node()?.type);
  const isSelected = () => props.selectedNodeId === props.nodeId;
  const isRoot = () => props.nodeId === props.rootId;

  const dnd = useRowDnd({
    nodeId: props.nodeId,
    nodeType: () => node()?.type,
    isRoot: props.nodeId === props.rootId,
    nodes: () => props.nodes,
    onMove: props.onMove,
  });

  // Строка + DnD-обёртка: draggable/droppable + индикатор зоны (before/after
  // линия, inside кольцо). Ровно один branch (leaf/container/root) монтируется,
  // поэтому setRef регистрирует DnD один раз.
  const renderRow = () => (
    <div ref={dnd.setRef} class="relative" classList={{ 'opacity-40': dnd.isDragging() }}>
      {/* Индикатор вставки (сепаратор before/after, кольцо inside) — visual owned
          by web-dnd (инлайн-стили, видим без Tailwind-скана пакета). */}
      <DropIndicator zone={dnd.zone()} />
      <Row
        nodeId={props.nodeId}
        nodeType={node()?.type}
        manifest={manifest()}
        depth={props.depth}
        selected={isSelected()}
        onSelect={() => props.onSelect(props.nodeId)}
      />
    </div>
  );

  // Мини-палитра + дети — общий блок для accordion-контента и корневой строки.
  // «＋ добавить» ПЕРЕД детьми — закреплён вверху контейнера, не съезжает вниз
  // по мере добавления компонентов (мандат USER).
  const childrenBlock = () => (
    <>
      <Show when={isContainer()}>
        <NodePalette
          nodeType={node()!.type}
          depth={props.depth}
          onInsert={(preset) => props.onInsert(preset, props.nodeId)}
        />
      </Show>
      <For each={node()?.children ?? []}>
        {(childId) => (
          <TreeRow
            nodes={props.nodes}
            rootId={props.rootId}
            selectedNodeId={props.selectedNodeId}
            onSelect={props.onSelect}
            onInsert={props.onInsert}
            isExpanded={props.isExpanded}
            onToggleExpand={props.onToggleExpand}
            onMove={props.onMove}
            nodeId={childId}
            depth={props.depth + 1}
          />
        )}
      </For>
    </>
  );

  return (
    <Show when={isContainer() || hasChildren()} fallback={renderRow()}>
      <Show
        when={isRoot()}
        fallback={
          <Accordion
            multiple
            value={props.isExpanded(props.nodeId) ? [props.nodeId] : []}
            onChange={(v) =>
              props.onToggleExpand(props.nodeId, (v as string[]).includes(props.nodeId))
            }
            class="divide-y-0"
          >
            {/* RESIDUAL (kit-gap): `border-0` (Item) + `px-0 py-0` (Trigger) —
                flush-de-chrome kit Accordion под строку дерева. Нужен flush/
                unpadded вариант Accordion (owner-web-ui). `divide-y-0` grep-safe. */}
            <Accordion.Item value={props.nodeId} class="border-0">
              <Accordion.Trigger class="px-0 py-0">{renderRow()}</Accordion.Trigger>
              <Accordion.Content>{childrenBlock()}</Accordion.Content>
            </Accordion.Item>
          </Accordion>
        }
      >
        {/* Корень: всегда открыт, без Accordion/chevron. */}
        <div>
          {renderRow()}
          {childrenBlock()}
        </div>
      </Show>
    </Show>
  );
};

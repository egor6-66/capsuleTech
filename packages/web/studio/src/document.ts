/**
 * Document — единый singleton-стор редактируемого UI-дерева студии.
 *
 * Абсорбирует роли, которые раньше делили `selection.ts` (preview одиночного
 * пресета в store-режиме) и `composition.ts` (ручная сборка в creator-режиме).
 * Оба хранили один и тот же editable `ISchema` + нодовые ops — это и порождало
 * «два флоу». Теперь стор ОДИН, а режим (`store` / `creator`) — только
 * authoring-поверхность над одной моделью (см. бриф §1, §9).
 *
 * Хранилище — Solid Store: granular reactivity на глубокие мутации
 * (Renderer читает `node().props.variant` реактивно и применяет CVA-классы без
 * re-mount; Inspector видит изменения полей без потери фокуса input'а).
 *
 * Семантика режимов над одним стором:
 *  - **store-mode**: клик пресета → `loadPreset` (document := единственный
 *    пресет, root выбран); смена пресета = replace.
 *  - **creator-mode**: `insertPreset(preset, nodeId)` инкрементально в узел;
 *    `selectNode` по клику строки дерева.
 *
 * Все три будущих вида — store (document из одного пресета), creator
 * (многокорневой document), custom-comp («сохранить document как пресет») —
 * это виды над одной моделью. Канвас всегда рисует `schema()`; rightbar всегда
 * по `selectedNode()`.
 */

import type { IEditorNode, ISchema } from '@capsuletech/web-renderer';
import type { IPreset } from '@capsuletech/web-ui/manifest';
import { createStore, produce } from 'solid-js/store';

/**
 * ID корневого Flex-контейнера пустого document'а. Стабильный — потребители
 * (creator-mode дерево, insertPreset default parent) могут на него ссылаться.
 * В store-режиме `loadPreset` заменяет весь document → root становится корнем
 * пресета; поэтому root-guard в `removeNode` смотрит на актуальный
 * `schema.components.root`, а не на эту константу.
 */
export const COMPOSITION_ROOT_ID = 'creator-root';

const makeRoot = (): IEditorNode => ({
  id: COMPOSITION_ROOT_ID,
  // Канонический dot-path Flex — `ui.Layout.Flex` (совпадает с манифестом и
  // flex-пресетами; renderer его резолвит). Legacy `ui.Flex` не имел манифеста,
  // из-за чего container-gate `acceptsChildren` не видел root'а и мини-палитра
  // не появлялась на пустом дереве.
  type: 'ui.Layout.Flex',
  parentId: null,
  children: [],
  props: {
    direction: 'col',
    gap: 2,
    class: 'h-full w-full p-4',
  },
});

const initialSchema = (): ISchema => ({
  components: {
    root: COMPOSITION_ROOT_ID,
    nodes: { [COMPOSITION_ROOT_ID]: makeRoot() },
  },
});

interface IDocumentState {
  schema: ISchema;
  /** ID выбранной ноды. Null = ничего не выбрано. Root всегда selectable. */
  selectedNodeId: string | null;
  /**
   * ID пресета, из которого загружен document (store-mode provenance).
   * Нужен только палитре для подсветки активного пресета и info-панели для
   * показа реального описания пресета. `null` в creator-mode (document
   * собран инкрементально, не из одного пресета).
   */
  loadedPresetId: string | null;
}

const [state, setState] = createStore<IDocumentState>({
  schema: initialSchema(),
  selectedNodeId: null,
  loadedPresetId: null,
});

let idCounter = 0;
const nextNodeId = (): string => `n${Date.now().toString(36)}_${idCounter++}`;

/**
 * store-mode: document := независимая editable копия схемы пресета, root выбран.
 * `structuredClone` — пресет в registry иммутабелен. `loadedPresetId` фиксирует
 * провенанс (подсветка палитры + описание в info-панели).
 */
const loadPreset = (preset: IPreset): void => {
  setState({
    schema: structuredClone(preset.schema),
    selectedNodeId: preset.schema.components.root,
    loadedPresetId: preset.id,
  });
};

/**
 * creator-mode: клон нод пресета с ремапом id → append ребёнком в `parentId`
 * (дефолт — актуальный корень document'а). Ремап id избегает коллизий при
 * повторной вставке того же пресета.
 */
const insertPreset = (preset: IPreset, parentId?: string): void => {
  const src = preset.schema;

  const oldToNew: Record<string, string> = {};
  for (const oldId of Object.keys(src.components.nodes)) {
    oldToNew[oldId] = nextNodeId();
  }

  setState(
    produce((s) => {
      const targetParentId = parentId ?? s.schema.components.root;
      const targetParent = s.schema.components.nodes[targetParentId];
      if (!targetParent) return; // parentId невалиден — no-op

      const newPresetRootId = oldToNew[src.components.root];

      for (const [oldId, node] of Object.entries(src.components.nodes)) {
        const newId = oldToNew[oldId];
        s.schema.components.nodes[newId] = {
          ...node,
          id: newId,
          // Корень пресета цепляется к targetParent; остальные сохраняют свою
          // preset-вложенность через oldToNew-map.
          parentId:
            node.parentId === null ? targetParentId : (oldToNew[node.parentId] ?? targetParentId),
          children: node.children.map((c) => oldToNew[c] ?? c),
          // structuredClone на props — preset.schema иммутабельна (registry).
          props: node.props ? structuredClone(node.props) : node.props,
        };
      }

      targetParent.children.push(newPresetRootId);
    }),
  );
};

const selectNode = (id: string | null): void => {
  setState('selectedNodeId', id);
};

/** Патчит пропсы конкретной ноды (granular reactive update — per-key set). */
const patchProps = (nodeId: string, props: Record<string, unknown>): void => {
  setState(
    produce((s) => {
      const node = s.schema.components.nodes[nodeId];
      if (!node) return;
      if (!node.props) node.props = {};
      // Per-key set вместо `node.props = {...new}` — Solid Store трекает каждый
      // ключ гранулярно, Renderer'овский mergeProps thunk на конкретный prop
      // (например, `variant`) ре-эвалюэйтит → CVA-класс обновляется без re-mount.
      const target = node.props as Record<string, unknown>;
      for (const [k, v] of Object.entries(props)) {
        target[k] = v;
      }
    }),
  );
};

/** Меняет тип ноды (для icon-picker'а: `ui.Icons.Plus` → `ui.Icons.Settings`). */
const patchNodeType = (nodeId: string, type: string): void => {
  setState(
    produce((s) => {
      const node = s.schema.components.nodes[nodeId];
      if (!node) return;
      node.type = type;
    }),
  );
};

/**
 * Удаляет ноду + всё её поддерево. Корень document'а удалить нельзя (silent
 * no-op). Если удалённая ветка содержала текущий selection — сбрасываем.
 */
const removeNode = (id: string): void => {
  setState(
    produce((s) => {
      if (id === s.schema.components.root) return;
      const node = s.schema.components.nodes[id];
      if (!node) return;

      // Соберём все ID для удаления (нода + дети + потомки).
      const toDelete: string[] = [];
      const collect = (nid: string) => {
        toDelete.push(nid);
        const n = s.schema.components.nodes[nid];
        if (n) for (const c of n.children) collect(c);
      };
      collect(id);

      // Отвяжем от родителя.
      if (node.parentId) {
        const parent = s.schema.components.nodes[node.parentId];
        if (parent) parent.children = parent.children.filter((c) => c !== id);
      }

      for (const did of toDelete) delete s.schema.components.nodes[did];

      // Если selection попал в удалённую ветку — сбрасываем.
      if (s.selectedNodeId && toDelete.includes(s.selectedNodeId)) {
        s.selectedNodeId = null;
      }
    }),
  );
};

const reset = (): void => {
  setState({ schema: initialSchema(), selectedNodeId: null, loadedPresetId: null });
};

export interface IWebStudioDocument {
  schema: () => ISchema;
  selectedNodeId: () => string | null;
  /** Резолв `nodes[selectedNodeId]` — источник rightbar'а (props/contract/readme). */
  selectedNode: () => IEditorNode | null;
  /** Провенанс store-mode: id пресета, из которого загружен document (или null). */
  loadedPresetId: () => string | null;
  loadPreset: (preset: IPreset) => void;
  insertPreset: (preset: IPreset, parentId?: string) => void;
  selectNode: (id: string | null) => void;
  patchProps: (nodeId: string, props: Record<string, unknown>) => void;
  patchNodeType: (nodeId: string, type: string) => void;
  removeNode: (id: string) => void;
  reset: () => void;
}

export const useDocument = (): IWebStudioDocument => ({
  schema: () => state.schema,
  selectedNodeId: () => state.selectedNodeId,
  selectedNode: () => {
    const id = state.selectedNodeId;
    if (!id) return null;
    return state.schema.components.nodes[id] ?? null;
  },
  loadedPresetId: () => state.loadedPresetId,
  loadPreset,
  insertPreset,
  selectNode,
  patchProps,
  patchNodeType,
  removeNode,
  reset,
});

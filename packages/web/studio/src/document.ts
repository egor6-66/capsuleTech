/**
 * Document — singleton-стор редактируемого UI-дерева студии, РАЗДЕЛЁННЫЙ по
 * режимам (`store` / `creator`).
 *
 * Абсорбирует роли, которые раньше делили `selection.ts` (preview одиночного
 * пресета) и `composition.ts` (ручная сборка) — API и модель ноды одни. Но
 * держит ДВА независимых слайса, по одному на режим:
 *  - **store**: активный пресет (loadPreset заменяет весь слайс);
 *  - **creator**: собираемая композиция (insertPreset инкрементально).
 *
 * Слайсы не мешают друг другу — переход creator↔store НЕ обнуляет дерево
 * creator'а и НЕ сбрасывает активный компонент store'а (мандат USER). Каждый
 * потребитель читает/пишет слайс своего режима: палитра → `store`, дерево →
 * `creator`; rightbar/канвас → активный режим (URL) через `useStudioMode`.
 *
 * Хранилище — Solid Store: granular reactivity на глубокие мутации (Renderer
 * читает `node().props.variant` без re-mount; Inspector — без потери фокуса).
 *
 * `expandedIds` — персист open-состояния строк дерева (creator): по дефолту всё
 * закрыто, состояние живёт ВНЕ Kobalte (его `Accordion.Content` анмаунтит
 * контент при сворачивании), поэтому при сворачивании родителя ребёнок сохраняет
 * своё открыт/закрыт — читается обратно из этого мапа при ремаунте.
 */

import type { IEditorNode, ISchema } from '@capsuletech/web-renderer';
import type { IPreset } from '@capsuletech/web-ui/manifest';
import { createStore, produce } from 'solid-js/store';

/** Режим-слайс: store (активный пресет) / creator (композиция). */
export type DocMode = 'store' | 'creator';

/**
 * ID корневого Flex-контейнера пустого слайса. Стабильный — потребители
 * (creator-дерево, insertPreset default parent) могут на него ссылаться. В
 * store-режиме `loadPreset` заменяет слайс → root становится корнем пресета;
 * поэтому root-guard в `removeNode` смотрит на актуальный `schema.components.root`.
 */
export const COMPOSITION_ROOT_ID = 'creator-root';

const makeRoot = (): IEditorNode => ({
  id: COMPOSITION_ROOT_ID,
  // Канонический dot-path Flex — `ui.Layout.Flex` (совпадает с манифестом и
  // flex-пресетами; renderer его резолвит). Legacy `ui.Flex` не имел манифеста,
  // из-за чего container-gate `acceptsChildren` не видел root'а.
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

interface IDocSlice {
  schema: ISchema;
  /** ID выбранной ноды. Null = ничего не выбрано. Root всегда selectable. */
  selectedNodeId: string | null;
  /**
   * ID пресета, из которого загружен слайс (store-провенанс). Нужен палитре для
   * подсветки активного пресета и info-панели для реального описания пресета.
   * `null` в creator (собран инкрементально, не из одного пресета).
   */
  loadedPresetId: string | null;
  /**
   * Open-состояние строк дерева по nodeId (creator). Отсутствие ключа / `false`
   * = закрыто (дефолт). Map, а не Set — Solid Store трекает ключи гранулярно.
   */
  expandedIds: Record<string, boolean>;
}

const makeSlice = (): IDocSlice => ({
  schema: initialSchema(),
  selectedNodeId: null,
  loadedPresetId: null,
  expandedIds: {},
});

const [state, setState] = createStore<Record<DocMode, IDocSlice>>({
  store: makeSlice(),
  creator: makeSlice(),
});

let idCounter = 0;
const nextNodeId = (): string => `n${Date.now().toString(36)}_${idCounter++}`;

/**
 * store: слайс := независимая editable копия схемы пресета, root выбран.
 * `structuredClone` — пресет в registry иммутабелен. `loadedPresetId` фиксирует
 * провенанс. `expandedIds` сбрасывается (новый контент).
 */
const loadPreset = (mode: DocMode, preset: IPreset): void => {
  setState(mode, {
    schema: structuredClone(preset.schema),
    selectedNodeId: preset.schema.components.root,
    loadedPresetId: preset.id,
    expandedIds: {},
  });
};

/**
 * creator: клон нод пресета с ремапом id → append ребёнком в `parentId` (дефолт
 * — актуальный корень слайса). Ремап id избегает коллизий при повторной вставке.
 */
const insertPreset = (mode: DocMode, preset: IPreset, parentId?: string): void => {
  const src = preset.schema;

  const oldToNew: Record<string, string> = {};
  for (const oldId of Object.keys(src.components.nodes)) {
    oldToNew[oldId] = nextNodeId();
  }

  setState(
    mode,
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
          parentId:
            node.parentId === null ? targetParentId : (oldToNew[node.parentId] ?? targetParentId),
          children: node.children.map((c) => oldToNew[c] ?? c),
          props: node.props ? structuredClone(node.props) : node.props,
        };
      }

      targetParent.children.push(newPresetRootId);
    }),
  );
};

const selectNode = (mode: DocMode, id: string | null): void => {
  setState(mode, 'selectedNodeId', id);
};

/** Патчит пропсы конкретной ноды (granular reactive update — per-key set). */
const patchProps = (mode: DocMode, nodeId: string, props: Record<string, unknown>): void => {
  setState(
    mode,
    produce((s) => {
      const node = s.schema.components.nodes[nodeId];
      if (!node) return;
      if (!node.props) node.props = {};
      const target = node.props as Record<string, unknown>;
      for (const [k, v] of Object.entries(props)) {
        target[k] = v;
      }
    }),
  );
};

/** Меняет тип ноды (для icon-picker'а: `ui.Icons.Plus` → `ui.Icons.Settings`). */
const patchNodeType = (mode: DocMode, nodeId: string, type: string): void => {
  setState(
    mode,
    produce((s) => {
      const node = s.schema.components.nodes[nodeId];
      if (!node) return;
      node.type = type;
    }),
  );
};

/**
 * Удаляет ноду + всё её поддерево. Корень слайса удалить нельзя (silent no-op).
 * Если удалённая ветка содержала текущий selection — сбрасываем. Open-состояние
 * удалённых нод чистим.
 */
const removeNode = (mode: DocMode, id: string): void => {
  setState(
    mode,
    produce((s) => {
      if (id === s.schema.components.root) return;
      const node = s.schema.components.nodes[id];
      if (!node) return;

      const toDelete: string[] = [];
      const collect = (nid: string) => {
        toDelete.push(nid);
        const n = s.schema.components.nodes[nid];
        if (n) for (const c of n.children) collect(c);
      };
      collect(id);

      if (node.parentId) {
        const parent = s.schema.components.nodes[node.parentId];
        if (parent) parent.children = parent.children.filter((c) => c !== id);
      }

      for (const did of toDelete) {
        delete s.schema.components.nodes[did];
        delete s.expandedIds[did];
      }

      if (s.selectedNodeId && toDelete.includes(s.selectedNodeId)) {
        s.selectedNodeId = null;
      }
    }),
  );
};

/** Явно задать open-состояние строки дерева (persist вне Kobalte). */
const setExpanded = (mode: DocMode, id: string, open: boolean): void => {
  setState(mode, 'expandedIds', id, open);
};

const reset = (mode: DocMode): void => {
  setState(mode, makeSlice());
};

export interface IWebStudioDocument {
  schema: () => ISchema;
  selectedNodeId: () => string | null;
  /** Резолв `nodes[selectedNodeId]` — источник rightbar'а (props/contract/readme). */
  selectedNode: () => IEditorNode | null;
  /** Провенанс store: id пресета, из которого загружен слайс (или null). */
  loadedPresetId: () => string | null;
  /** Открыта ли строка дерева `id` (дефолт закрыто). */
  isExpanded: (id: string) => boolean;
  loadPreset: (preset: IPreset) => void;
  insertPreset: (preset: IPreset, parentId?: string) => void;
  selectNode: (id: string | null) => void;
  patchProps: (nodeId: string, props: Record<string, unknown>) => void;
  patchNodeType: (nodeId: string, type: string) => void;
  removeNode: (id: string) => void;
  setExpanded: (id: string, open: boolean) => void;
  reset: () => void;
}

/**
 * @param mode — слайс режима: строка (`'store'` / `'creator'`) для фикс-режимных
 *   потребителей (палитра=store, дерево=creator) ИЛИ accessor `() => DocMode`
 *   для потребителей активного режима (rightbar/канвас через `useStudioMode`).
 *   Дефолт `'store'`. Accessor держит селекторы реактивными к смене URL-режима.
 */
export const useDocument = (mode: DocMode | (() => DocMode) = 'store'): IWebStudioDocument => {
  const m = typeof mode === 'function' ? mode : () => mode;
  return {
    schema: () => state[m()].schema,
    selectedNodeId: () => state[m()].selectedNodeId,
    selectedNode: () => {
      const slice = state[m()];
      const id = slice.selectedNodeId;
      if (!id) return null;
      return slice.schema.components.nodes[id] ?? null;
    },
    loadedPresetId: () => state[m()].loadedPresetId,
    isExpanded: (id) => state[m()].expandedIds[id] === true,
    loadPreset: (preset) => loadPreset(m(), preset),
    insertPreset: (preset, parentId) => insertPreset(m(), preset, parentId),
    selectNode: (id) => selectNode(m(), id),
    patchProps: (nodeId, props) => patchProps(m(), nodeId, props),
    patchNodeType: (nodeId, type) => patchNodeType(m(), nodeId, type),
    removeNode: (id) => removeNode(m(), id),
    setExpanded: (id, open) => setExpanded(m(), id, open),
    reset: () => reset(m()),
  };
};

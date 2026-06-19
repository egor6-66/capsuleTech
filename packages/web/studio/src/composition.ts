/**
 * Composition — singleton store сборки компонента в creator-режиме.
 *
 * Хранит JSON-схему для Renderer'а: корневой `ui.Flex`-контейнер + дети,
 * добавляемые drag'ом из палитры. Структура совместима с `@capsuletech/web-renderer`
 * (тот же `ISchema`, что у preset'ов).
 *
 * Отдельный store от `selection.ts` (тот хранит preview конкретного пресета
 * в store-режиме). Здесь — composition users собирают руками. Когда-нибудь
 * объединим в общий state, но сейчас режимы изолированы — это проще.
 *
 * **API:**
 *  - `schema()` — текущая композиция (root + nodes).
 *  - `insertPreset(preset)` — append preset.schema'у как ребёнка корневого Flex'а.
 *                              Ноды пресета клонируются с новыми ID'ами (избегаем
 *                              коллизий при multiple-drop того же preset'а).
 *  - `reset()` — сброс в пустой Flex.
 *
 * **Note:** insertPreset кладёт preset'овский root прямо в Flex.children, не
 * пытаясь сохранить вложенные `parentId` пресета — `parentId` пересчитывается
 * под новую иерархию. Простая семантика для первой итерации; reordering и
 * drop в произвольный узел — следующая итерация.
 */

import type { IEditorNode, ISchema } from '@capsuletech/web-renderer';
import type { IPreset } from '@capsuletech/web-ui/manifest';
import { createStore, produce } from 'solid-js/store';

/** ID корневого Flex-контейнера. Стабильный — потребители могут на него ссылаться. */
export const COMPOSITION_ROOT_ID = 'creator-root';

const makeRoot = (): IEditorNode => ({
  id: COMPOSITION_ROOT_ID,
  type: 'ui.Flex',
  parentId: null,
  children: [],
  props: {
    orientation: 'vertical',
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

interface ICompositionState {
  schema: ISchema;
  /** ID выбранной ноды в Tree. Null = ничего не выбрано. Root всегда selectable. */
  selectedNodeId: string | null;
}

const [state, setState] = createStore<ICompositionState>({
  schema: initialSchema(),
  selectedNodeId: null,
});

let idCounter = 0;
const nextNodeId = (): string => `n${Date.now().toString(36)}_${idCounter++}`;

const insertPreset = (preset: IPreset): void => {
  const src = preset.schema;

  // Remap preset's nodeIds → новые уникальные ID, чтобы повторный drop того
  // же preset'а не давал коллизий в `composition.nodes`.
  const oldToNew: Record<string, string> = {};
  for (const oldId of Object.keys(src.components.nodes)) {
    oldToNew[oldId] = nextNodeId();
  }

  const cloned: Record<string, IEditorNode> = {};
  for (const [oldId, node] of Object.entries(src.components.nodes)) {
    const newId = oldToNew[oldId];
    cloned[newId] = {
      ...node,
      id: newId,
      // Корень пресета теперь child of COMPOSITION_ROOT; остальные сохраняют
      // свою preset-вложенность (oldToNew map'ом).
      parentId:
        node.parentId === null
          ? COMPOSITION_ROOT_ID
          : (oldToNew[node.parentId] ?? COMPOSITION_ROOT_ID),
      children: node.children.map((c) => oldToNew[c] ?? c),
      // structuredClone на props — preset.schema иммутабельна (в registry).
      props: node.props ? structuredClone(node.props) : node.props,
    };
  }

  const newPresetRootId = oldToNew[src.components.root];

  setState(
    produce((s) => {
      Object.assign(s.schema.components.nodes, cloned);
      s.schema.components.nodes[COMPOSITION_ROOT_ID].children.push(newPresetRootId);
    }),
  );
};

const reset = (): void => {
  setState({ schema: initialSchema(), selectedNodeId: null });
};

const selectNode = (id: string | null): void => {
  setState('selectedNodeId', id);
};

/**
 * Удаляет ноду + всё её поддерево. Root удалить нельзя (silent no-op).
 * Если удалённая ветка содержала текущий selection — selection сбрасывается.
 */
const removeNode = (id: string): void => {
  if (id === COMPOSITION_ROOT_ID) return;
  setState(
    produce((s) => {
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

export interface IComposition {
  schema: () => ISchema;
  selectedNodeId: () => string | null;
  insertPreset: (preset: IPreset) => void;
  selectNode: (id: string | null) => void;
  removeNode: (id: string) => void;
  reset: () => void;
}

export const useComposition = (): IComposition => ({
  schema: () => state.schema,
  selectedNodeId: () => state.selectedNodeId,
  insertPreset,
  selectNode,
  removeNode,
  reset,
});

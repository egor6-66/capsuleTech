/**
 * Selection — shared singleton state для всех модулей студио.
 *
 * Хранилище — Solid Store: даёт granular reactivity на глубокие мутации
 * (Renderer внутри `mergeProps` читает `node().props.variant` реактивно и
 * применяет CVA-классы без re-mount компонента; Inspector видит изменения
 * values по полям без потери фокуса).
 *
 * При смене пресета store полностью заменяется (full replace) — это
 * корректно для семантически другого контента; Renderer перерендерит дерево.
 * При patchProps делаем granular `produce`-мутацию — только изменённые поля,
 * фокус input'а сохраняется.
 */

import type { ISchema } from '@capsuletech/web-renderer';
import type { IPreset } from '@capsuletech/web-ui/manifest';
import { createStore, produce } from 'solid-js/store';

interface ISelectionState {
  preset: IPreset | null;
  schema: ISchema | null;
}

const [state, setState] = createStore<ISelectionState>({ preset: null, schema: null });

const setSelected = (next: IPreset | null) => {
  setState({
    preset: next,
    // structuredClone — независимая editable копия; пресет в registry неизменен.
    schema: next ? structuredClone(next.schema) : null,
  });
};

/** Патчит пропсы конкретной ноды (granular reactive update — per-key set). */
const patchProps = (nodeId: string, props: Record<string, unknown>) => {
  setState(
    produce((s) => {
      const node = s.schema?.components.nodes[nodeId];
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
const patchNodeType = (nodeId: string, type: string) => {
  setState(
    produce((s) => {
      const node = s.schema?.components.nodes[nodeId];
      if (!node) return;
      node.type = type;
    }),
  );
};

export interface IWebStudioSelection {
  selected: () => IPreset | null;
  setSelected: (next: IPreset | null) => void;
  schema: () => ISchema | null;
  patchProps: (nodeId: string, props: Record<string, unknown>) => void;
  patchNodeType: (nodeId: string, type: string) => void;
}

export const useSelectedPreset = (): IWebStudioSelection => ({
  selected: () => state.preset,
  setSelected,
  schema: () => state.schema,
  patchProps,
  patchNodeType,
});

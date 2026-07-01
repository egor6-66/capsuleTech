/**
 * NodePalette — мини-палитра вставки внутри узла-контейнера дерева (creator-mode).
 *
 * Affordance «＋ добавить» раскрывает список пресетов, которые ЭТОТ узел может
 * принять ребёнком (по реальному accept-предикату манифеста — `presetsForNode`,
 * см. `manifests/rules.ts`). Клик по пресету → `onInsert(preset)` → стор
 * `insertPreset(preset, nodeId)` вставляет ребёнком именно в этот узел.
 *
 * Вставка кликом, БЕЗ DnD (iter1 — ядро на кликах; reorder-DnD = iter2, бриф §6).
 * Reuse preset-рендера палитры не через компонент, а через общий источник
 * пресетов (`presetsForNode` поверх `getPresets`) — палитра как модуль не
 * выбрасывается, её accept-логика релоцирована в узел (бриф §3).
 *
 * Stateless относительно стора: получает `nodeType` + `onInsert` пропами
 * (резолвит TreeRow). Локальный `open`-сигнал — чистый UI-стейт раскрытия.
 */

import type { IPreset } from '@capsuletech/web-ui/manifest';
import { createSignal, For, Show } from 'solid-js';
import { presetsForNode } from '../manifests';

export interface INodePaletteProps {
  /** Тип узла-контейнера, в который вставляем. */
  nodeType: string;
  /** Уровень вложенности узла — для отступа (выравнивание с детьми). */
  depth: number;
  /** Клик по пресету — потребитель вставляет его в стор. */
  onInsert: (preset: IPreset) => void;
}

export const NodePalette = (props: INodePaletteProps) => {
  const [open, setOpen] = createSignal(false);
  const presets = () => presetsForNode(props.nodeType);
  // Дети рисуются на depth+1 — мини-палитра выравнивается с ними.
  const indent = () => `${(props.depth + 1) * 12 + 8}px`;

  return (
    <div style={{ 'padding-left': indent() }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        class="flex w-full items-center gap-1 rounded-sm py-1 pr-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/40 hover:text-accent-foreground"
        data-testid={`node-add-${props.nodeType}`}
      >
        <span class="shrink-0">＋</span>
        <span class="truncate">добавить компонент</span>
      </button>

      <Show when={open()}>
        <div class="flex flex-col">
          <For
            each={presets()}
            fallback={
              <div class="px-2 py-1 text-[11px] text-muted-foreground">
                Нет подходящих компонентов
              </div>
            }
          >
            {(p) => (
              <button
                type="button"
                onClick={() => {
                  props.onInsert(p);
                  setOpen(false);
                }}
                class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                data-testid={`node-preset-${p.id}`}
              >
                {p.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

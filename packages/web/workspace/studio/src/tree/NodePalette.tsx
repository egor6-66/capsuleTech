/**
 * NodePalette — узловая мини-палитра вставки (creator-mode).
 *
 * Тот же сегментированный блок, что и store-палитра (`<ComponentSegments>`) —
 * НЕ отдельный компонент. Источник — `manifestsForNode(nodeType)` (только те
 * компоненты, которых этот узел может принять ребёнком, по реальному
 * accept-предикату манифеста). Клик по пресету → `onInsert(preset)` → стор
 * `insertPreset(preset, nodeId)`. Так «добавили компонент/пресет в палитру → он
 * сам появляется в узле» — без дрейфа между двумя палитрами (бриф).
 *
 * Обёртка «＋ добавить компонент» — kit `Accordion` (плавный вылет, как везде),
 * а не `createSignal(open)`+`<Show>`. Единственное отличие от store-палитры —
 * стили под узел дерева (отступ по `depth`) и `data-testid` (`node-add-*`,
 * `node-preset-*`).
 *
 * Вставка кликом, БЕЗ DnD (iter1; reorder-DnD внутри дерева = iter2). Stateless
 * относительно стора: `nodeType` + `onInsert` пропами (резолвит TreeRow).
 */

import { Accordion } from '@capsuletech/web-ui/accordion';
import type { IPreset } from '@capsuletech/web-ui/manifest';
import { Show } from 'solid-js';
import { manifestsForNode } from '../manifests';
// Прямой путь (не barrel) — не тянем ComponentsPalette c web-core-зависимостью
// в tree-чанк. ComponentSegments также экспортится из `../palette` для внешних.
import { ComponentSegments } from '../palette/ComponentSegments';

export interface INodePaletteProps {
  /** Тип узла-контейнера, в который вставляем. */
  nodeType: string;
  /** Уровень вложенности узла — для отступа (выравнивание с детьми). */
  depth: number;
  /** Клик по пресету — потребитель вставляет его в стор. */
  onInsert: (preset: IPreset) => void;
}

export const NodePalette = (props: INodePaletteProps) => {
  const manifests = () => manifestsForNode(props.nodeType);
  // Дети рисуются на depth+1 — мини-палитра выравнивается с ними.
  const indent = () => `${(props.depth + 1) * 12 + 8}px`;

  return (
    <div style={{ 'padding-left': indent() }}>
      <Accordion multiple class="w-full divide-y-0">
        <Accordion.Item value="add" class="border-0">
          <Accordion.Trigger
            class="px-0 py-1 text-xs font-normal text-muted-foreground"
            data-testid={`node-add-${props.nodeType}`}
          >
            ＋ добавить компонент
          </Accordion.Trigger>
          <Accordion.Content>
            <Show
              when={manifests().length > 0}
              fallback={
                <div class="px-2 py-1 text-[11px] text-muted-foreground">
                  Нет подходящих компонентов
                </div>
              }
            >
              <ComponentSegments
                manifests={manifests()}
                onSelect={props.onInsert}
                testIdPrefix="node-preset"
              />
            </Show>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};

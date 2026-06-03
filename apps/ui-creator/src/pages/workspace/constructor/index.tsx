/**
 * Конструктор (`/workspace/constructor`) — рабочий стол редактора UI.
 *
 * Каркас Matrix (preset app-shell): sidebar | main (canvas) | rightBar (inspector).
 * `layoutMode="edit"` даёт ресайз-хэндлы + swap-DnD asides (sidebar ↔ rightBar).
 *
 * Обёртки (снаружи внутрь):
 *  - `<EditorProvider>` — общий стор дерева (Canvas мутирует, Tree читает);
 *  - `<DnDProvider>` (web-dnd) — palette → canvas DnD. Слот-контент создаётся в
 *    scope Constructor'а, поэтому и `useEditor`, и `useDnD` видят провайдеры
 *    именно отсюда (внутренний DnDProvider Matrix'а слотам не виден; его swap
 *    панелей живёт отдельно и не пересекается).
 *
 * Sidebar — вертикальный resizable Flex: Palette (верх) + Tree (низ).
 * main — `Widgets.Canvas`.
 */
import { DnDProvider } from '@capsuletech/web-dnd';

import { EditorProvider } from '../../../editor/store';

const Constructor = Page((Ui) => (
  <EditorProvider>
    <DnDProvider showDefaultOverlay>
      <Ui.Layout.Matrix
        preset="app-shell"
        slots={{
          sidebar: {
            children: (
              <Ui.Layout.Flex
                orientation="vertical"
                withHandle
                class="h-full"
                items={[
                  { children: <Widgets.Palette />, resizable: true, initialSize: 0.5 },
                  { children: <Widgets.Tree />, resizable: true, initialSize: 0.5 },
                ]}
              />
            ),
            initialSize: 0.14,
            draggable: true,
          },
          main: {
            children: <Widgets.Canvas />,
          },
          rightBar: {
            children: <Widgets.Inspector />,
            initialSize: 0.14,
            draggable: true,
          },
        }}
      />
    </DnDProvider>
  </EditorProvider>
));

export default Constructor;

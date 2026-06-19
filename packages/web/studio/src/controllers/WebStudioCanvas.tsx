/**
 * WebStudio.Canvas — область превью / сборки в студии.
 *
 * Поведение зависит от studio-режима (`useStudioMode()`, URL-derived):
 *
 *  - **store** (`/workspace/web-studio/store`) — preview выбранного пресета.
 *    Читает schema через `useSelectedPreset()` (singleton store), рендерит
 *    через `<Renderer>` внутри `<CanvasFrame>` (iframe-isolated тема/dark).
 *    Schema обновляется реактивно через Solid Store proxy → mergeProps в
 *    RenderNode видит новые props без re-mount.
 *
 *  - **creator** (`/workspace/web-studio/creator`) — composition canvas.
 *    Корневой `ui.Flex` (через composition-store) растянут на всю область,
 *    обёрнут в `createDroppable` — drop palette-preset'а вставляет его
 *    schema как ребёнка Flex'а. Без iframe — DnD должен видеть pointer
 *    из палитры (общий `DnDProvider` из `WebStudio.CreatorRoot`).
 *
 * Registry — ХАРДКОД на `@capsuletech/web-ui`: студио оперирует только нашим
 * UI-kit'ом. Renderer резолвит dot-path'ы: `ui.Button` → kit.Button,
 * `ui.Icons.<Name>` → kit.Icons.<Name>, `ui.Flex` → kit.Flex.
 *
 * **Iframe isolation (store-mode):** см. `canvas-frame/CanvasFrame.tsx` —
 * canvas-only тема/dark-mode без влияния на app-chrome. В creator-mode
 * пока без iframe — поднимем когда понадобится cross-frame DnD.
 */

import { createDroppable, useDnD } from '@capsuletech/web-dnd';
import { type Registry, Renderer } from '@capsuletech/web-renderer';
import * as kit from '@capsuletech/web-ui';
import { Flex } from '@capsuletech/web-ui/flex';
import * as kitIcons from '@capsuletech/web-ui/icons';
import type { IPreset } from '@capsuletech/web-ui/manifest';
import { Select } from '@capsuletech/web-ui/select';
import { Textarea } from '@capsuletech/web-ui/textarea';
import { Typography } from '@capsuletech/web-ui/typography';
import { Show } from 'solid-js';
import { CanvasFrame } from '../canvas-frame';
import { useCanvasDark, useCanvasTheme } from '../canvas-style';
import { useComposition } from '../composition';
import { useStudioMode } from '../navigation/useStudioMode';
import { useSelectedPreset } from '../selection';

// Select / Textarea не в root-барреле `@capsuletech/web-ui` намеренно (W4 PR #313 —
// tree-shake split: consumers потребляют через subpaths). Студия рендерит всё, что
// есть в палитре — добавляем явно из subpath'ов.
const REGISTRY: Registry = {
  ui: {
    ...(kit as unknown as Record<string, unknown>),
    Select,
    Textarea,
    Icons: kitIcons as unknown as Record<string, unknown>,
  },
} as unknown as Registry;

/** Store-mode: текущий preview-флоу (без изменений). */
const StoreCanvas = () => {
  const { schema } = useSelectedPreset();
  const canvasTheme = useCanvasTheme();
  const canvasDark = useCanvasDark();

  return (
    <CanvasFrame class="h-full w-full" theme={canvasTheme()} dark={canvasDark()}>
      <Flex
        orientation="vertical"
        justify="center"
        align="center"
        class="h-full w-full overflow-auto p-2"
      >
        <Show
          when={schema()}
          fallback={<Typography tone="muted">Выберите компонент в палитре</Typography>}
          keyed
        >
          {(s) => <Renderer schema={s} registry={REGISTRY} mode="static" />}
        </Show>
      </Flex>
    </CanvasFrame>
  );
};

/**
 * Creator-mode: composition canvas в iframe + drop-target снаружи iframe.
 *
 * **Layout-обвязка (важно для DnD через iframe boundary):**
 *
 *   <div drop-target>          ← createDroppable ref, в main document
 *     <CanvasFrame>            ← iframe (изоляция темы/dark + Portal-mount)
 *       <Renderer ... />       ← composition.schema внутри iframe body
 *     </CanvasFrame>
 *   </div>
 *
 * Drop-target — main-document'овский div, ОБЁРТЫВАЮЩИЙ iframe. DnD-провайдер
 * делает `document.elementFromPoint(x, y)` в main document — над canvas
 * областью это вернёт <iframe>-элемент, далее `findDroppableAt` идёт по
 * `parentElement` вверх и находит наш drop-target div (см.
 * `web-dnd/context.tsx:178-186`).
 *
 * Renderer внутри iframe рисует composition. Kit Portal-based примитивы
 * (Select/Dropdown/Tooltip) подтягивают `useMountTarget()` из MountProvider
 * который CanvasFrame ставит на iframe body — popover'ы остаются в iframe.
 *
 * Drop palette-preset'а вызывает `insertPreset(preset)` — composition store
 * мутируется, Renderer реактивно подхватывает (Solid Store proxy).
 *
 * Подсветка drop-зоны — ring при `canDrop` (полноценный overlay с зонами
 * before/after/inside — следующая итерация).
 */
const CreatorCanvas = () => {
  const { schema, insertPreset } = useComposition();
  const canvasTheme = useCanvasTheme();
  const canvasDark = useCanvasDark();
  const dnd = useDnD();

  /**
   * Pointer events над `<iframe>` уходят в iframe-window и **не** доходят до
   * main-document'овского `pointermove` слушателя web-dnd (`findDroppableAt`).
   * Чтобы drop-target вокруг iframe мог быть подсвечен и принять drop —
   * во время drag'а ставим iframe в `pointer-events: none`: pointer-события
   * «проваливаются» сквозь iframe-элемент к его parent'у (наш drop-target div)
   * в main document. Тогда `document.elementFromPoint` возвращает drop-target
   * div напрямую, а DnD hit-test находит его в `elToDroppableId`.
   *
   * Side-effect: интерактивность контента внутри iframe тоже отключена пока
   * drag активен. Это OK — пользователь не кликает по контенту во время drag'а.
   */
  const isDragging = () => dnd.state.activeId() !== null;
  const frameClass = () => (isDragging() ? 'pointer-events-none h-full w-full' : 'h-full w-full');

  const drop = createDroppable({
    id: 'creator-canvas-root',
    accepts: (data) => data?.source === 'palette-preset',
    onDrop: (data) => {
      if (data?.source === 'palette-preset' && data.preset) {
        insertPreset(data.preset as IPreset);
      }
    },
  });

  return (
    <div
      ref={drop.ref}
      class="relative h-full w-full transition-colors duration-150"
      classList={{ 'ring-2 ring-primary ring-inset bg-primary/5': drop.canDrop() }}
      data-testid="creator-canvas-root"
    >
      <CanvasFrame class={frameClass()} theme={canvasTheme()} dark={canvasDark()}>
        <Renderer schema={schema()} registry={REGISTRY} mode="static" />
      </CanvasFrame>
    </div>
  );
};

export const WebStudioCanvas = () => {
  const mode = useStudioMode();
  return (
    <Show when={mode() === 'creator'} fallback={<StoreCanvas />}>
      <CreatorCanvas />
    </Show>
  );
};

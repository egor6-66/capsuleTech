/**
 * WebStudio.Provider — провайдер верхнего уровня студии.
 *
 * Монтирует, сверху вниз:
 *   1. `<DnDProvider>` — общий drag-context палитры и creator-mode drop-target'а.
 *      Один Provider на дереве — иначе drag/drop в разных под-tree'ях не общаются.
 *   2. `<Remote.Provider>` — remote-runtime для встроенного канваса (ADR 015/053).
 *      Модуль регистрируется под `canvasName` с origin `canvasUrl`.
 *   3. `CanvasNameContext` — шарит `canvasName` вниз (Provider — single source).
 *   4. `<CanvasBinding>` — внутренняя логик-связка «палитра → канвас» (сток
 *      баблинга `onPresetSelect`, держит remote-handle для dispatch'а).
 *
 * Апп НЕ знает про remote-механику — даёт только координату `canvasUrl`. Канвас
 * монтируется как `WebStudio.Canvas` (тонкий `<Remote.View>`) в `children`.
 *
 * Регистрируется как `WebStudio.Provider` через `../capsule` (ADR 033).
 */

import { DnDProvider } from '@capsuletech/web-dnd';
import { RemoteProvider } from '@capsuletech/web-remote';
import type { JSX } from 'solid-js';
import CanvasBinding from './CanvasBinding';
import { CanvasNameContext, DEFAULT_CANVAS_NAME } from './canvasContext';

export interface IStudioProviderProps {
  children: JSX.Element;
  /** Origin встроенного канваса (`http://host:port`). Манифест тянется с `${url}/capsule.manifest.json`. */
  canvasUrl: string;
  /** Имя remote-модуля канваса. Дефолт — `'universal-canvas'`. */
  canvasName?: string;
}

export const StudioProvider = (props: IStudioProviderProps) => {
  const canvasName = () => props.canvasName ?? DEFAULT_CANVAS_NAME;

  return (
    <DnDProvider showDefaultOverlay>
      <RemoteProvider modules={[{ name: canvasName(), url: props.canvasUrl }]}>
        <CanvasNameContext.Provider value={canvasName()}>
          <CanvasBinding>{props.children}</CanvasBinding>
        </CanvasNameContext.Provider>
      </RemoteProvider>
    </DnDProvider>
  );
};

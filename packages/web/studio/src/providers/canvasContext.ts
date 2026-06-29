/**
 * CanvasNameContext — имя remote-модуля канваса, расшаренное вниз от
 * `WebStudio.Provider` к двум потребителям внутри студии:
 *   - `CanvasBinding` (логик-сток `onPresetSelect` → dispatch в канвас);
 *   - `WebStudio.Canvas` (тонкий `<Remote.View>`-embed, который апп кладёт в
 *     main-слот Matrix — он рендерится в `children` Provider'а, не самим Provider'ом).
 *
 * Single source of truth = проп `canvasName` у Provider'а (дефолт
 * `'universal-canvas'`). Контекст нужен именно потому, что embed монтирует апп,
 * а не Provider — пропом canvasName до него не дотянуться, только контекстом.
 */

import { createContext, useContext } from 'solid-js';

/** Дефолтное имя remote-модуля канваса (совпадает с `remotes`-реестром аппа). */
export const DEFAULT_CANVAS_NAME = 'universal-canvas';

/** Имя remote-модуля канваса. Дефолт — `DEFAULT_CANVAS_NAME` (standalone-safe). */
export const CanvasNameContext = createContext<string>(DEFAULT_CANVAS_NAME);

/** Читает имя канваса из ближайшего `WebStudio.Provider`. */
export const useCanvasName = (): string => useContext(CanvasNameContext);

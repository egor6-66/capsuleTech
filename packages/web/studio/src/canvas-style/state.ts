/**
 * Canvas-style override state — singleton signals для canvas-LOCAL темы/dark-mode.
 *
 * Назначение: студио показывает компонент в iframe-canvas'е, и иногда нужно
 * посмотреть как он выглядит в другой теме / другом режиме без переключения
 * глобального `@capsuletech/web-style` switcher'а (это бы перекрасило сам
 * студийный chrome). Этот стор хранит OVERRIDE'ы — `null` означает "inherit"
 * (canvas зеркалит parent'ское `<html>`), non-null — "override активен,
 * canvas игнорирует parent и применяет своё значение".
 *
 * Контракт:
 *  - `useCanvasTheme()` → `Accessor<string | null>` — текущий override темы.
 *  - `useCanvasDark()` → `Accessor<boolean | null>` — текущий override dark-mode.
 *  - `setCanvasTheme(name | null)` / `setCanvasDark(value | null)` — установить override.
 *  - `resetCanvasStyle()` — сбросить оба (вернуться к inherit для обоих осей).
 *
 * **НЕ персистится** (нет localStorage). Студио — preview-зона, defaults
 * "как у app'а" предсказуемее между сессиями. Если в будущем понадобится
 * sticky-override — добавим отдельным флагом, по умолчанию остаётся reset.
 *
 * **НЕ касается `@capsuletech/web-style`.** Глобальный `useTheme/setTheme`
 * там продолжает рулить app-chrome'ом, canvas-style — параллельная ось.
 * Связка с iframe DOM делается в `canvas-frame/CanvasFrame.tsx` (override
 * пропы) + `controllers/WebStudioCanvas.tsx` (читает эти signal'ы и форвардит).
 */

import { type Accessor, createSignal } from 'solid-js';

const [theme, setThemeSignal] = createSignal<string | null>(null);
const [dark, setDarkSignal] = createSignal<boolean | null>(null);

/** Reactive accessor for the canvas-local theme override (null = inherit). */
export const useCanvasTheme = (): Accessor<string | null> => theme;

/** Reactive accessor for the canvas-local dark-mode override (null = inherit). */
export const useCanvasDark = (): Accessor<boolean | null> => dark;

/** Set/clear the canvas-local theme override. Pass `null` to return to inherit. */
export const setCanvasTheme = (name: string | null): void => {
  setThemeSignal(name);
};

/** Set/clear the canvas-local dark-mode override. Pass `null` to return to inherit. */
export const setCanvasDark = (value: boolean | null): void => {
  setDarkSignal(value);
};

/** Reset BOTH axes back to inherit-from-parent. */
export const resetCanvasStyle = (): void => {
  setThemeSignal(null);
  setDarkSignal(null);
};

/** `true` if at least one axis is currently overridden. */
export const useCanvasStyleActive = (): Accessor<boolean> => () => theme() !== null || dark() !== null;

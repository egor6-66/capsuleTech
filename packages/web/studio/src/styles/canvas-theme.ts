/**
 * Canvas-theme — shared singleton state для canvas-local override темы.
 *
 * Хранит тему/режим, которыми студия рисует **remote-канвас** (`<Remote>` в
 * `WebStudio.Canvas`) — независимо от темы хрома самой студии. Паттерн —
 * копия `selection.ts`: singleton Solid-store + `use*`-hook, без Provider'а;
 * все модули читают/пишут глобально.
 *
 * Семантика `undefined`:
 *   - `theme === undefined` / `dark === undefined` → «наследовать host».
 *     `RemoteComponent` делает `rawProps.theme ?? hostTheme()` —
 *     `undefined`-проп форвардит host-тему в iframe. Сброс через `reset()`.
 *
 * НЕ персистится (v1): canvas-override — design-time сессия (как `selection.ts`,
 * in-memory). НЕ трогает `capsule-theme` localStorage-ключ — это host-тема
 * (`@capsuletech/web-style`), её менять нельзя, иначе перекрасится хром студии.
 *
 * НЕ вызывает `web-style.setTheme` — override живёт только в этом синглтоне и
 * долетает в канвас пропами `<Remote theme={…} dark={…} />`.
 */

import { createStore } from 'solid-js/store';

/** `undefined` = наследовать тему/режим хоста (host fallback в RemoteComponent). */
export interface ICanvasThemeState {
  theme?: string;
  dark?: boolean;
}

const [state, setState] = createStore<ICanvasThemeState>({ theme: undefined, dark: undefined });

/** Override темы канваса. `undefined` → наследовать host-тему. */
const setTheme = (name: string | undefined): void => {
  setState('theme', name);
};

/** Override режима канваса. `undefined` → наследовать host-режим. */
const setDark = (value: boolean | undefined): void => {
  setState('dark', value);
};

/** Сброс обоих override → канвас наследует тему/режим host'а. */
const reset = (): void => {
  setState({ theme: undefined, dark: undefined });
};

export interface IWebStudioCanvasTheme {
  theme: () => string | undefined;
  dark: () => boolean | undefined;
  setTheme: (name: string | undefined) => void;
  setDark: (value: boolean | undefined) => void;
  reset: () => void;
}

/**
 * Reactive-доступ к canvas-theme override. Все getter'ы трекаются Solid'ом —
 * смена override ре-шлёт envelope в iframe через реактивный effect в
 * `RemoteComponent`.
 */
export const useCanvasTheme = (): IWebStudioCanvasTheme => ({
  theme: () => state.theme,
  dark: () => state.dark,
  setTheme,
  setDark,
  reset,
});

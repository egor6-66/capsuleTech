import type { JSX } from 'solid-js';
import { render } from 'solid-js/web';

/**
 * Options для `createRoot()`. Все поля опциональны — без них работает как
 * `createRoot(Bootstrap)` со значениями по умолчанию.
 */
export interface ICreateRootOptions {
  /**
   * Container DOM-node или его id (без `#`). По умолчанию — id `'root'`.
   *  - string  → `document.getElementById(container)`
   *  - HTMLElement → используется напрямую (для embed-в-чужой-SPA сценариев)
   */
  container?: string | HTMLElement;

  /**
   * Дефолтная theme — ставится на `<html data-theme="...">`, если атрибут
   * ещё не задан (например, кастомным `<script>` в `index.html` для anti-FOUC).
   * По умолчанию — `'black'`.
   */
  defaultTheme?: string;
}

const DEFAULT_CONTAINER_ID = 'root';
const DEFAULT_THEME = 'black';

const ensureTheme = (theme: string) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root.hasAttribute('data-theme')) {
    root.setAttribute('data-theme', theme);
  }
};

const resolveContainer = (container: string | HTMLElement): HTMLElement => {
  if (typeof container !== 'string') return container;
  const el = document.getElementById(container);
  if (!el) {
    throw new Error(
      `[createRoot] container element #${container} not found in DOM. ` +
        `Make sure index.html has <div id="${container}"></div> or pass ` +
        `{ container: <HTMLElement> } explicitly.`,
    );
  }
  return el;
};

/**
 * Точка входа Capsule-приложения. Рендерит `Component` в контейнер, гарантирует
 * наличие `data-theme` на `<html>`. Возвращает disposer для unmount'а (тот же,
 * что отдаёт `solid-js/web` `render()`).
 *
 * @example
 *   createRoot(Bootstrap);
 *   createRoot(Bootstrap, { container: 'my-app', defaultTheme: 'light' });
 *   createRoot(Bootstrap, { container: document.body });
 */
export function createRoot(
  Component: () => JSX.Element,
  options: ICreateRootOptions = {},
): () => void {
  ensureTheme(options.defaultTheme ?? DEFAULT_THEME);
  const container = resolveContainer(options.container ?? DEFAULT_CONTAINER_ID);
  return render(Component, container);
}

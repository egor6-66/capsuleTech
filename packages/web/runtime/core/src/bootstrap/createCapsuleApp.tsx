/**
 * createCapsuleApp — унифицированная точка входа для standalone и embedded apps.
 *
 * Решает две проблемы (ADR-053 consequences 7a + 7b):
 *
 * 1. **Единая bootstrap-цепочка** (7a):
 *    Сейчас `.capsule/bootstrap.tsx` и `.capsule/remote-entry.ts` — два разрозненных
 *    генерированных файла. `createCapsuleApp` собирает их в один вызов:
 *    - standalone: `createCapsuleApp(container, { routeTree, appConfig })`
 *    - embedded:   `createCapsuleApp(root, { routeTree, appConfig, configOverride, runtimeProps, eventSink })`
 *    HCA-слои (Feature / Controller) не знают в каком режиме работает приложение.
 *
 * 2. **EmitProvider routing** (7b):
 *    В embedded-режиме `useEmit`-события дополнительно маршрутизируются в
 *    `eventSink.send` (канал к хосту) через `EmitProvider`.
 *
 * 3. **Multi-Solid (ADR-053 Вариант C)**:
 *    Проблема решается инъекцией import-map в iframe srcdoc (зона web-remote,
 *    buildSrcdoc.ts). Этот файл предоставляет утилиты в `solidBundleShim.ts`.
 *    `createCapsuleApp` сам по себе multi-Solid не устраняет — он предназначен
 *    для кода ВНУТРИ iframe (после того как import-map уже применён).
 *
 * @example
 * // Standalone (apps/<app>/src/main.tsx или .capsule/index.ts):
 * import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
 * createCapsuleApp(document.getElementById('root')!, { routeTree, appConfig });
 *
 * @example
 * // Embedded (apps/<app>/src/remote.ts):
 * import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
 * import type { IRemoteBootstrap } from '@capsuletech/web-remote';
 *
 * export const bootstrap: IRemoteBootstrap = (root, ctx) =>
 *   createCapsuleApp(root, {
 *     routeTree,
 *     appConfig,
 *     configOverride: ctx.config,
 *     runtimeProps: ctx.props,
 *     eventSink: ctx.channel,
 *   });
 *
 * @module
 */

import type { AnyRoute } from '@capsuletech/web-router';
import { type JSX, Suspense } from 'solid-js';
import { render } from 'solid-js/web';
import type { IAppConfig } from '../app-config';
import { BaseProviders } from '../providers/base';
import { EmitProvider, type IEmitSink } from './EmitProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Public API types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Опции `createCapsuleApp`.
 *
 * Поля без `?` обязательны в обоих режимах (standalone + embedded).
 * Поля с `?` активируют embedded-режим ADR-053.
 */
export interface ICreateCapsuleAppOptions {
  /**
   * Типизированное route-дерево приложения.
   * Генерируется TanStack Router CLI в `.capsule/routes/routeTree.gen.ts`.
   */
  routeTree: AnyRoute;

  /**
   * Конфиг приложения из `capsule.app.ts`.
   * Содержит `router`, `api`, `intl` и прочие секции.
   */
  appConfig: IAppConfig;

  /**
   * Базовый путь приложения (Vite `BASE_URL`).
   * В standalone: обычно `import.meta.env.BASE_URL`.
   * В embedded: обычно `'/'` или явно задан конфигом.
   * @default '/'
   */
  basepath?: string;

  /**
   * Дефолтная тема — ставится на `<html data-theme="...">` если атрибут не задан.
   * @default 'black'
   */
  defaultTheme?: string;

  // ── Embedded-only (ADR-053 Decision 3 + 4) ─────────────────────────────────

  /**
   * Host-side config envelope (ADR-053 Decision 3).
   * Reactive proxy-object: direct property access is tracked by Solid.
   * Передаётся из `bootstrap(root, ctx)` как `ctx.config`.
   *
   * В standalone-режиме не задавать — конфиг берётся из `appConfig`.
   */
  configOverride?: Record<string, unknown>;

  /**
   * Host-side props envelope (ADR-053 Decision 4).
   * Reactive proxy-object: `createEffect(() => runtimeProps.X)` реагирует
   * на изменения `<Remote.View X={signal()}>` на хосте.
   * Передаётся из `bootstrap(root, ctx)` как `ctx.props`.
   *
   * В standalone-режиме не задавать.
   */
  runtimeProps?: Record<string, unknown>;

  /**
   * Канал для embedded useEmit routing (ADR-053 Decision 5).
   * Структурно совместим с `IRemoteChannel` из @capsuletech/web-remote.
   * Передаётся из `bootstrap(root, ctx)` как `ctx.channel`.
   *
   * Если задан — `useEmit`-события дополнительно пересылаются хосту
   * через `eventSink.send(event, payload)`. Локальный dispatch через
   * ControllerProxy продолжает работать параллельно.
   *
   * В standalone-режиме не задавать.
   */
  eventSink?: IEmitSink;
}

// ─────────────────────────────────────────────────────────────────────────────
// Implementation
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_THEME = 'black';

const ensureTheme = (theme: string): void => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root.hasAttribute('data-theme')) {
    root.setAttribute('data-theme', theme);
  }
};

/**
 * Строит корневой компонент приложения.
 *
 * Обёртки снаружи внутрь:
 *   Suspense → EmitProvider (если eventSink) → BaseProviders (router + vitals)
 *
 * EmitProvider должен быть снаружи BaseProviders (RouterProvider),
 * потому что emit-события могут происходить из любого места дерева,
 * включая Route-компоненты.
 */
const buildAppComponent = (opts: ICreateCapsuleAppOptions): (() => JSX.Element) => {
  const { routeTree, appConfig, basepath, eventSink } = opts;

  return () => (
    <Suspense>
      <EmitProvider eventSink={eventSink}>
        <BaseProviders
          routeTree={routeTree}
          basepath={basepath ?? '/'}
          notFoundRedirect={appConfig.router?.notFoundRedirect}
          beforeLoad={appConfig.router?.beforeLoad}
          transition={appConfig.router?.transition}
        />
      </EmitProvider>
    </Suspense>
  );
};

/**
 * Unified Capsule app bootstrap.
 *
 * Рендерит приложение в `container` и возвращает disposer для unmount'а.
 * В embedded-режиме disposer должен быть вызван при unmount iframe'а
 * (shell вызовет его автоматически через `IRemoteBootstrap` contract).
 *
 * @param container - DOM-элемент или id контейнера.
 *   В embedded-режиме: `root` из `bootstrap(root, ctx)`.
 *   В standalone-режиме: `document.getElementById('root')` или аналог.
 * @param opts - Опции (routeTree, appConfig, + embedded-only поля).
 * @returns Disposer `() => void` — вызвать при unmount для cleanup reactive roots.
 *
 * @throws {Error} если container — строка и элемент с таким id не найден.
 */
export const createCapsuleApp = (
  container: HTMLElement | string,
  opts: ICreateCapsuleAppOptions,
): (() => void) => {
  // Resolve container element
  let el: HTMLElement;
  if (typeof container === 'string') {
    const found = document.getElementById(container);
    if (!found) {
      throw new Error(
        `[createCapsuleApp] container element #${container} not found. ` +
          `Make sure index.html has <div id="${container}"></div> or pass an HTMLElement directly.`,
      );
    }
    el = found;
  } else {
    el = container;
  }

  ensureTheme(opts.defaultTheme ?? DEFAULT_THEME);

  const AppComponent = buildAppComponent(opts);
  return render(AppComponent, el);
};

/**
 * createCapsuleApp — унифицированная точка входа для standalone и embedded apps.
 *
 * Приложение монтирует себя своим обычным entry'ем. Embed-режим невидим для
 * app-разработчика: если приложение оказалось внутри хост-iframe, фреймворк сам
 * делает postMessage-handshake, принимает host-override config'а и мержит его в
 * реактивный config-store ДО mount'а (ADR 059 Phase 1). App-разработчик пишет
 * только `capsule.app.ts` и читает `config.X` — никакого embedding-кода.
 *
 * Поток:
 *  - **standalone** (`window.parent === window`): сразу mount на app-config.
 *  - **embedded** (`window.parent !== window`): читаем identity из query URL iframe →
 *    шлём `__capsule_app_ready__` хосту → ждём `__capsule_remote_config__` (или таймаут
 *    ~1500мс) → merge патча в config-store → mount. Последующие патчи в рантайме →
 *    реактивный ре-мерж store (D4). HCA-слои (Feature / Controller) не знают о режиме.
 *
 * Единственный источник override = postMessage-handshake (ADR 059, вариант A2).
 * Push-поля `configOverride`/`runtimeProps` (ADR-053) удалены — модель заменена.
 *
 * EmitProvider routing (ADR-053 7b): в embedded-режиме `useEmit`-события дополнительно
 * маршрутизируются в `eventSink.send` (канал к хосту). `eventSink` остаётся.
 *
 * @example
 * // Standalone (apps/<app>/.capsule/index.ts):
 * import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
 * createCapsuleApp(document.getElementById('root')!, { routeTree, appConfig });
 *
 * @example
 * // Embedded: тот же вызов. Handshake включается сам, если app внутри iframe.
 * // `eventSink` (опц.) — канал useEmit-событий к хосту:
 * createCapsuleApp(root, { routeTree, appConfig, eventSink: hostChannel });
 *
 * @module
 */

import type { AnyRoute } from '@capsuletech/web-router';
import { type JSX, Suspense } from 'solid-js';
import { render } from 'solid-js/web';
import type { IAppConfig } from '../app-config';
import { BaseProviders } from '../providers/base';
import { createConfigStore } from './embedConfig';
import {
  DEFAULT_HANDSHAKE_TIMEOUT_MS,
  EMBED_PROTOCOL,
  type IEmbedParams,
  isEmbedded,
  readEmbedParams,
  startHandshake,
} from './embedHandshake';
import { EmitProvider, type IEmitSink } from './EmitProvider';

// ─────────────────────────────────────────────────────────────────────────────
// Public API types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Опции `createCapsuleApp`.
 *
 * Поля без `?` обязательны в обоих режимах (standalone + embedded).
 */
export interface ICreateCapsuleAppOptions {
  /**
   * Типизированное route-дерево приложения.
   * Генерируется TanStack Router CLI в `.capsule/routes/routeTree.gen.ts`.
   */
  routeTree: AnyRoute;

  /**
   * Конфиг приложения из `capsule.app.ts` — база config-store.
   * В embedded-режиме host-override-патчи мержатся поверх него.
   */
  appConfig: IAppConfig;

  /**
   * Базовый путь приложения (Vite `BASE_URL`).
   * @default '/'
   */
  basepath?: string;

  /**
   * Дефолтная тема — ставится на `<html data-theme="...">` если атрибут не задан.
   * @default 'black'
   */
  defaultTheme?: string;

  /**
   * Канал для embedded useEmit routing (ADR-053 Decision 5).
   * Структурно совместим с `IRemoteChannel` из @capsuletech/web-remote.
   *
   * Если задан — `useEmit`-события дополнительно пересылаются хосту через
   * `eventSink.send(event, payload)`. Локальный dispatch через ControllerProxy
   * продолжает работать параллельно. В standalone-режиме не задавать.
   */
  eventSink?: IEmitSink;

  /**
   * Таймаут ожидания первого host config-патча в embedded-режиме (мс).
   * По истечении — mount на app-дефолтах (медленный хост не вешает app).
   * @default 1500
   */
  handshakeTimeoutMs?: number;
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

const resolveContainer = (container: HTMLElement | string): HTMLElement => {
  if (typeof container !== 'string') return container;
  const found = document.getElementById(container);
  if (!found) {
    throw new Error(
      `[createCapsuleApp] container element #${container} not found. ` +
        `Make sure index.html has <div id="${container}"></div> or pass an HTMLElement directly.`,
    );
  }
  return found;
};

/**
 * Строит корневой компонент приложения.
 *
 * Обёртки снаружи внутрь:
 *   Suspense → EmitProvider (если eventSink) → BaseProviders (router + vitals)
 *
 * Router-настройки читаются из реактивного `config` (merged base ⊕ override).
 * Mount происходит ПОСЛЕ merge (или таймаута), поэтому значения уже учитывают
 * host-патч. EmitProvider снаружи BaseProviders — emit может происходить из
 * Route-компонентов.
 */
const buildAppComponent = (
  opts: ICreateCapsuleAppOptions,
  config: IAppConfig,
): (() => JSX.Element) => {
  const { routeTree, basepath, eventSink } = opts;

  return () => (
    <Suspense>
      <EmitProvider eventSink={eventSink}>
        <BaseProviders
          routeTree={routeTree}
          basepath={basepath ?? '/'}
          notFoundRedirect={config.router?.notFoundRedirect}
          beforeLoad={config.router?.beforeLoad}
          transition={config.router?.transition}
        />
      </EmitProvider>
    </Suspense>
  );
};

/**
 * Unified Capsule app bootstrap.
 *
 * Рендерит приложение в `container` и возвращает disposer для unmount'а.
 * В embedded-режиме mount отложен до первого config-патча или таймаута; disposer
 * возвращается синхронно и корректно отменяет отложенный mount + handshake-слушатель.
 *
 * @param container - DOM-элемент или id контейнера.
 * @param opts - Опции (routeTree, appConfig, + опциональные поля).
 * @returns Disposer `() => void` — вызвать при unmount для cleanup.
 *
 * @throws {Error} если container — строка и элемент с таким id не найден.
 */
export const createCapsuleApp = (
  container: HTMLElement | string,
  opts: ICreateCapsuleAppOptions,
): (() => void) => {
  const el = resolveContainer(container);
  ensureTheme(opts.defaultTheme ?? DEFAULT_THEME);

  const { config, applyOverride } = createConfigStore(opts.appConfig);

  let disposed = false;
  let rootDispose: (() => void) | undefined;
  let detachHandshake: (() => void) | undefined;
  let detachPageHide: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Identity встроенного app'а — резолвится в embedded-ветке; нужна в mount() для
  // mounted-сигнала. null в standalone и embedded-без-params → сигнал не постится.
  let embedParams: IEmbedParams | null = null;

  const mount = (): void => {
    if (disposed || rootDispose) return; // идемпотентно: монтируем один раз
    rootDispose = render(buildAppComponent(opts, config), el);
    if (embedParams && typeof window !== 'undefined') {
      // app→host: «я отрисовался» → хост снимает loader-overlay (web-remote).
      // Постится РОВНО раз — mount() идемпотентен (гард выше).
      // targetOrigin='*' — cross-origin hardening отложен (ADR 059 open question #1).
      window.parent.postMessage(
        {
          from: embedParams.name,
          fromInstance: embedParams.name,
          to: EMBED_PROTOCOL.hostTarget,
          sessionId: embedParams.sessionId,
          eventName: EMBED_PROTOCOL.mountedEvent,
        },
        '*',
      );
    }
  };

  if (!isEmbedded()) {
    mount();
  } else {
    const params = readEmbedParams();
    if (!params) {
      // Embedded, но хост не передал identity в URL → handshake невозможен,
      // монтируемся на app-дефолтах.
      mount();
    } else {
      embedParams = params; // mount() пошлёт mounted-сигнал после render()
      if (typeof window !== 'undefined') {
        const onPageHide = (): void => {
          // app→host: «я выгружаюсь» (t0 reparent/reload) → хост ставит loader-overlay.
          // postMessage во время pagehide внутрипроцессно доставляется. targetOrigin='*'
          // (cross-origin hardening отложен, ADR 059 open question #1).
          window.parent.postMessage(
            {
              from: params.name,
              fromInstance: params.name,
              to: EMBED_PROTOCOL.hostTarget,
              sessionId: params.sessionId,
              eventName: EMBED_PROTOCOL.unloadEvent,
            },
            '*',
          );
        };
        window.addEventListener('pagehide', onPageHide);
        detachPageHide = () => window.removeEventListener('pagehide', onPageHide);
      }
      timer = setTimeout(mount, opts.handshakeTimeoutMs ?? DEFAULT_HANDSHAKE_TIMEOUT_MS);
      detachHandshake = startHandshake({
        params,
        onConfig: (patch) => {
          applyOverride(patch); // реактивный merge (initial + runtime патчи)
          if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
          }
          mount(); // первый патч снимает таймаут и монтирует; далее no-op
        },
      });
    }
  }

  return () => {
    disposed = true;
    if (timer !== undefined) clearTimeout(timer);
    detachHandshake?.();
    detachPageHide?.();
    rootDispose?.();
  };
};

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
import { type IContract, validateEvent } from '../contract';
import {
  createHostInbound,
  EmbedModeContext,
  HostInboundContext,
  type IHostInbound,
  type IRootForward,
  RootForwardContext,
} from '../engine/host-bridge';
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
   * Публичный контракт приложения (ADR 060). Прокидывается генерируемым
   * bootstrap'ом (builders) из `apps/<app>/contract.ts`.
   *
   * В embedded-режиме включает root-event-bus мост (ADR 060 D1):
   *  - **app→host:** событие, дошедшее до КОРНЕВОГО Feature/Controller, чьё имя ∈
   *    `contract.out`, форвардится хосту ВМЕСТО локального хендлера (forward-instead-of-handle);
   *    payload валидируется по схеме. Триггер — корневой dispatch, НЕ `useEmit`.
   *  - **host→app:** входящий dispatch валидируется по `contract.in` и инжектится
   *    в корневую HCA-шину аппа.
   *
   * Нет contract (или standalone) → мост выключен, апп работает как обычно.
   */
  contract?: IContract;

  /**
   * Legacy-канал embedded useEmit routing (ADR-053 Decision 5). Опциональный явный sink:
   * `useEmit`-события дополнительно пересылаются хосту через `eventSink.send(event, payload)`.
   * НЕ связан с contract-форвардом (ADR 060 D1 форвардит с корня, а не через `useEmit`).
   * В standalone-режиме не задавать.
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
 * Строит app→host event-sink, **gated контрактом** (ADR 060 D1).
 *
 * `send(eventName, payload)` форвардит хосту ТОЛЬКО если `eventName ∈ contract.out`
 * (снимает прошлую утечку «форвардим все useEmit» — held-back инфра 2026-06-24);
 * payload дополнительно валидируется по `contract.out[eventName]` — невалид → warn + drop.
 *
 * Envelope идентичен mounted/unload-сигналам: `{ from, fromInstance, to:'__host__',
 * sessionId, eventName, payload }`. Host матчит по `from` + `eventName`.
 *
 * @internal exported for unit-testing only
 */
export const buildContractGatedSink = (params: IEmbedParams, contract: IContract): IEmitSink => ({
  send: (eventName: string, payload?: unknown): void => {
    if (typeof window === 'undefined') return;
    // Gate: незаявленное out-событие молча не уходит (loose coupling, принцип 5).
    if (!Object.hasOwn(contract.out, eventName)) return;

    const res = validateEvent(contract, 'out', eventName, payload);
    if (!res.ok) {
      console.warn(`[capsule] outbound event "${eventName}" dropped (contract): ${res.error}`);
      return;
    }

    // targetOrigin='*' — cross-origin hardening отложен (ADR 059 open question #1).
    window.parent.postMessage(
      {
        from: params.name,
        fromInstance: params.name,
        to: EMBED_PROTOCOL.hostTarget,
        sessionId: params.sessionId,
        eventName,
        payload,
      },
      '*',
    );
  },
});

/**
 * Строит обработчик host→app dispatch-сообщений (ADR 060 D1).
 *
 * Конверт host→app (согласован с web-remote 3-of-3): `{ to: <appName>, sessionId,
 * eventName: <name ∈ contract.in>, payload }`. `eventName` несёт имя контракт-события
 * напрямую — контракт и есть фильтр (принцип 6). От config/handshake-сигналов отличается
 * именем события (зарезервированные `__capsule_*` не входят в `contract.in`).
 *
 * Фильтр+защита (принцип 5):
 *  - чужой `sessionId` / не-наш `to` → игнор;
 *  - незаявленное `in`-событие → молчаливый drop (loose coupling);
 *  - заявленное, но невалидный payload → drop + warn;
 *  - валидное → `inbound.emit(name, parsedValue)` → инжект в корень аппа.
 *
 * @internal exported for unit-testing only
 */
export const buildHostInboundHandler =
  (params: IEmbedParams, contract: IContract, inbound: IHostInbound) =>
  (event: MessageEvent): void => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    const msg = data as { sessionId?: string; eventName?: string; to?: string; payload?: unknown };

    if (msg.sessionId !== params.sessionId) return;
    if (typeof msg.eventName !== 'string') return;
    // Опциональное сужение по адресату: если хост проставил `to` — требуем наше имя.
    if (msg.to !== undefined && params.name !== '' && msg.to !== params.name) return;
    // Gate: только заявленные in-события (исключает config/handshake-имена). Молча.
    if (!Object.hasOwn(contract.in, msg.eventName)) return;

    const res = validateEvent(contract, 'in', msg.eventName, msg.payload);
    if (!res.ok) {
      console.warn(`[capsule] inbound event "${msg.eventName}" dropped (contract): ${res.error}`);
      return;
    }

    inbound.emit(msg.eventName, res.value);
  };

/**
 * Строит корневой компонент приложения.
 *
 * Обёртки снаружи внутрь:
 *   Suspense → EmbedModeContext (статичный run-режим) → RootForwardContext (app→host
 *   forward-gate корня) → HostInboundContext (host→app inject) → EmitProvider (legacy
 *   useEmit sink) → BaseProviders (router + vitals)
 *
 * `EmbedModeContext` несёт статичный `{ embedded }` (источник — `isEmbedded()` в bootstrap)
 * — его читает logic-wrapper и выдаёт `embedded`/`standalone` в services. Оборачивает
 * `BaseProviders`, где монтируются Feature/Controller. В отличие от host-bridge контекстов
 * он ставится ВСЕГДА (включая standalone и embedded-без-contract) — режим не зависит от моста.
 *
 * Router-настройки читаются из реактивного `config` (merged base ⊕ override).
 * Mount происходит ПОСЛЕ merge (или таймаута), поэтому значения уже учитывают
 * host-патч. Контексты снаружи BaseProviders — корневой Feature монтируется внутри.
 */
const buildAppComponent = (
  opts: ICreateCapsuleAppOptions,
  config: IAppConfig,
  embedded: boolean,
  hostInbound: IHostInbound | undefined,
  rootForward: IRootForward | undefined,
): (() => JSX.Element) => {
  const { routeTree, basepath } = opts;

  return () => (
    <Suspense>
      <EmbedModeContext.Provider value={{ embedded }}>
        <RootForwardContext.Provider value={rootForward}>
          <HostInboundContext.Provider value={hostInbound}>
            <EmitProvider eventSink={opts.eventSink}>
              <BaseProviders
                routeTree={routeTree}
                basepath={basepath ?? '/'}
                notFoundRedirect={config.router?.notFoundRedirect}
                beforeLoad={config.router?.beforeLoad}
                transition={config.router?.transition}
              />
            </EmitProvider>
          </HostInboundContext.Provider>
        </RootForwardContext.Provider>
      </EmbedModeContext.Provider>
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

  // Статичный run-режим: источник правды — iframe-check, НЕ наличие contract-моста.
  // Резолвится один раз; прокидывается в дерево через EmbedModeContext (services flag).
  const embedded = isEmbedded();

  const { config, applyOverride } = createConfigStore(opts.appConfig);

  let disposed = false;
  let rootDispose: (() => void) | undefined;
  let detachHandshake: (() => void) | undefined;
  let detachPageHide: (() => void) | undefined;
  let detachHostMessage: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Identity встроенного app'а — резолвится в embedded-ветке; нужна в mount() для
  // mounted-сигнала. null в standalone и embedded-без-params → сигнал не постится.
  let embedParams: IEmbedParams | null = null;
  // Root-event-bus мост (ADR 060 D1) — резолвятся в embedded+contract ветке.
  // undefined → мост off (standalone / нет contract): апп работает как обычно.
  let hostInbound: IHostInbound | undefined;
  let rootForward: IRootForward | undefined;

  const mount = (): void => {
    if (disposed || rootDispose) return; // идемпотентно: монтируем один раз
    rootDispose = render(buildAppComponent(opts, config, embedded, hostInbound, rootForward), el);
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

  if (!embedded) {
    mount();
  } else {
    const params = readEmbedParams();
    if (!params) {
      // Embedded, но хост не передал identity в URL → handshake невозможен,
      // монтируемся на app-дефолтах.
      mount();
    } else {
      embedParams = params; // mount() пошлёт mounted-сигнал после render()

      // Root-event-bus мост (ADR 060 D1): включается только при наличии contract.
      // out — forward-from-root (gate+валидация); in — валидация+инжект host→app.
      const contract = opts.contract;
      if (contract && typeof window !== 'undefined') {
        // app→host: форвард с КОРНЯ (НЕ через useEmit). Sink переиспользуется как
        // forward; shouldForward (имя ∈ out) решает skip-handler на корне.
        const sink = buildContractGatedSink(params, contract);
        rootForward = {
          shouldForward: (eventName) => Object.hasOwn(contract.out, eventName),
          forward: (eventName, payload) => sink.send(eventName, payload),
        };
        // host→app: per-instance inbound-канал + postMessage listener.
        hostInbound = createHostInbound();
        const onHostMessage = buildHostInboundHandler(params, contract, hostInbound);
        window.addEventListener('message', onHostMessage as EventListener);
        detachHostMessage = () =>
          window.removeEventListener('message', onHostMessage as EventListener);
      }

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
    detachHostMessage?.();
    rootDispose?.();
  };
};

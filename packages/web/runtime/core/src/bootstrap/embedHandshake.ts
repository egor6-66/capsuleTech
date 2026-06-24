/**
 * embedHandshake — детект встраивания + postMessage-handshake (ADR 059 Phase 1).
 *
 * Модель ADR 059 (self-contained iframe-src): приложение монтируется СВОИМ обычным
 * entry'ем. Если оно внутри хост-iframe (`window.parent !== window`) — `createCapsuleApp`
 * сам делает handshake:
 *
 *   1. читает `sessionId`/`name` из query-params URL iframe (хост ставит `src` с
 *      `?__capsule_session=...&__capsule_name=...`) — синхронно, до первого сообщения;
 *   2. шлёт хосту `__capsule_app_ready__` (envelope-форма IRemoteMessage);
 *   3. слушает `__capsule_remote_config__` (override-патч), фильтруя по `sessionId`;
 *   4. первый патч (или таймаут) → mount; последующие патчи → реактивный ре-мерж.
 *
 * Это НОВАЯ модель — она не пересекается со старым srcdoc-shell'ом `web-remote/boot.ts`
 * (`__capsule_remote_ready__` + инжект `window.__CAPSULE_REMOTE__`). Host-side для
 * ADR 059 (отправка `__capsule_remote_config__` в ответ на `__capsule_app_ready__`)
 * реализует Brief 3 / web-remote, импортируя `EMBED_PROTOCOL` отсюда как контракт.
 *
 * SOURCE OF TRUTH протокола: `EMBED_PROTOCOL` ниже. Brief 2/3 берут как есть.
 *
 * @module
 */

/**
 * Протокол embed-handshake — единый контракт имён/полей для app-side (этот пакет)
 * и host-side (web-remote, Brief 3).
 */
export const EMBED_PROTOCOL = {
  /** app→host: «я загрузился, монтируюсь, шли config». */
  readyEvent: '__capsule_app_ready__',
  /** host→app: override-патч конфига (не полный config). */
  configEvent: '__capsule_remote_config__',
  /** app→host: «я реально отрисовался» — постится ПОСЛЕ `render()` (loader-overlay снимается). */
  mountedEvent: '__capsule_app_mounted__',
  /** app→host: «я выгружаюсь» — постится на pagehide (хост СТАВИТ loader-overlay). */
  unloadEvent: '__capsule_app_unloading__',
  /** Routing-target в envelope для сообщений к хосту. */
  hostTarget: '__host__',
  /** Query-ключи в URL iframe, через которые хост передаёт identity. */
  query: {
    session: '__capsule_session',
    name: '__capsule_name',
  },
} as const;

/** Таймаут ожидания первого config-патча. По истечении — mount на app-дефолтах. */
export const DEFAULT_HANDSHAKE_TIMEOUT_MS = 1500;

/** Identity встроенного приложения, прочитанная из URL iframe. */
export interface IEmbedParams {
  sessionId: string;
  name: string;
}

/**
 * Outgoing ready-envelope. Структурно совместим с `IRemoteMessage` из web-remote
 * (duck typing, без import-зависимости → нет цикла web-core ↔ web-remote).
 *
 * `fromInstance` = `name`: в self-contained модели каждый iframe — отдельный документ
 * с уникальным `sessionId`, который и служит ключом маршрутизации; отдельный instanceId
 * избыточен (хост матчит ответ по `sessionId`).
 */
export interface IAppReadyMessage {
  from: string;
  fromInstance: string;
  to: string;
  sessionId: string;
  eventName: typeof EMBED_PROTOCOL.readyEvent;
}

/**
 * Outgoing mounted-envelope. Тот же shape, что `IAppReadyMessage`, но постится ПОСЛЕ
 * реального `render()` (app→host: «я отрисовался»). Хост матчит по `from` + `eventName`
 * и снимает loader-overlay (web-remote). Структурно совместим с `IRemoteMessage`.
 */
export interface IAppMountedMessage {
  from: string;
  fromInstance: string;
  to: string;
  sessionId: string;
  eventName: typeof EMBED_PROTOCOL.mountedEvent;
}

/**
 * Outgoing unloading-envelope. Тот же shape, постится на `pagehide` (app→host: «я выгружаюсь»,
 * t0 reparent/reload). Хост матчит по `from` + `eventName` и СТАВИТ loader-overlay (web-remote).
 * Парный к `IAppMountedMessage` (тот снимает overlay). Структурно совместим с `IRemoteMessage`.
 */
export interface IAppUnloadingMessage {
  from: string;
  fromInstance: string;
  to: string;
  sessionId: string;
  eventName: typeof EMBED_PROTOCOL.unloadEvent;
}

/**
 * Приложение исполняется внутри хост-iframe (родительское окно отлично от self).
 * `false` в standalone и в не-DOM окружениях (SSR/тесты).
 */
export const isEmbedded = (): boolean =>
  typeof window !== 'undefined' && window.parent !== window;

/**
 * Читает identity из query URL iframe. Синхронно, доступно до первого host-сообщения
 * (без гонки с postMessage). `null`, если `sessionId` отсутствует — handshake невозможен.
 *
 * @param search — query-строка (для тестов). По умолчанию `window.location.search`.
 */
export const readEmbedParams = (search?: string): IEmbedParams | null => {
  const raw = search ?? (typeof window !== 'undefined' ? window.location.search : undefined);
  if (raw === undefined) return null;
  const qs = new URLSearchParams(raw);
  const sessionId = qs.get(EMBED_PROTOCOL.query.session);
  if (!sessionId) return null;
  return { sessionId, name: qs.get(EMBED_PROTOCOL.query.name) ?? '' };
};

/** Минимальный source-контракт для прослушивания host-сообщений (тестируемость). */
type MessageSource = Pick<Window, 'addEventListener' | 'removeEventListener'>;
/** Минимальный host-контракт для отправки ready-сигнала. */
type MessageHost = Pick<Window, 'postMessage'>;

export interface IStartHandshakeOptions {
  /** Identity из `readEmbedParams`. */
  params: IEmbedParams;
  /**
   * Вызывается на КАЖДЫЙ `__capsule_remote_config__` патч (initial + runtime).
   * Получает сырой payload — schema-фильтр/merge живут в `applyOverride` (embedConfig).
   */
  onConfig: (patch: Record<string, unknown>) => void;
  /** Окно хоста для ready-сигнала. По умолчанию `window.parent`. */
  host?: MessageHost;
  /** Источник host-сообщений. По умолчанию `window`. */
  source?: MessageSource;
}

/**
 * Запускает handshake: шлёт `__capsule_app_ready__` хосту и подписывается на
 * `__capsule_remote_config__` (фильтр по `sessionId`). Возвращает cleanup,
 * отцепляющий слушатель.
 *
 * Слушатель остаётся живым после mount'а — runtime-патчи ре-мержатся реактивно (D4).
 * Cleanup вызывается при unmount приложения (disposer `createCapsuleApp`).
 */
export const startHandshake = (opts: IStartHandshakeOptions): (() => void) => {
  const { params, onConfig } = opts;
  const host: MessageHost | undefined =
    opts.host ?? (typeof window !== 'undefined' ? window.parent : undefined);
  const source: MessageSource | undefined =
    opts.source ?? (typeof window !== 'undefined' ? window : undefined);
  if (!host || !source) return () => {};

  const onMessage = (event: MessageEvent): void => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    const msg = data as {
      sessionId?: string;
      eventName?: string;
      to?: string;
      payload?: unknown;
    };
    if (msg.sessionId !== params.sessionId) return;
    if (msg.eventName !== EMBED_PROTOCOL.configEvent) return;
    // Опциональное сужение по адресату: если хост проставил `to` — требуем наше имя.
    if (msg.to !== undefined && params.name !== '' && msg.to !== params.name) return;
    if (msg.payload && typeof msg.payload === 'object') {
      onConfig(msg.payload as Record<string, unknown>);
    }
  };

  source.addEventListener('message', onMessage as EventListener);

  const ready: IAppReadyMessage = {
    from: params.name,
    fromInstance: params.name,
    to: EMBED_PROTOCOL.hostTarget,
    sessionId: params.sessionId,
    eventName: EMBED_PROTOCOL.readyEvent,
  };
  // targetOrigin='*' — cross-origin hardening (known origin) вынесен в отдельный
  // TODO вне этого брифа (ADR 059 follow-up).
  host.postMessage(ready, '*');

  return () => source.removeEventListener('message', onMessage as EventListener);
};

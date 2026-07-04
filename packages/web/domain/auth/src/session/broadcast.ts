/**
 * BroadcastChannel-синк auth-состояния между вкладками/аппами одного origin
 * (ADR 068 D4).
 *
 * Канал `'capsule-auth'`. Сторона, совершившая login/register/logout, постит
 * `{ type: 'auth-changed' }` → слушатели (все открытые вкладки/аппы) ре-фетчат
 * `GET /auth/me` и обновляют свой session-store. Смысл: логаут в одном аппе
 * мгновенно виден всем вкладкам single-origin.
 *
 * Один shared-instance канала на модуль: BroadcastChannel НЕ доставляет
 * сообщение самому себе → вкладка-инициатор не делает лишний ре-фетч.
 *
 * SSR/Node-safe: без `BroadcastChannel` в среде — тихий no-op (capsule-registry
 * читает модули через Node build-time).
 */

/** Имя канала синка (контракт ADR 068 D4 — одинаков для всех capsule-аппов). */
export const AUTH_CHANNEL_NAME = 'capsule-auth';

interface IAuthSyncMessage {
  type: 'auth-changed';
}

let _channel: BroadcastChannel | null = null;

const getChannel = (): BroadcastChannel | null => {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (_channel === null) _channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  return _channel;
};

/**
 * Оповестить остальные вкладки/аппы об изменении auth-состояния.
 * Вызывается стороной, совершившей login/register/logout.
 */
export const notifyAuthChanged = (): void => {
  const message: IAuthSyncMessage = { type: 'auth-changed' };
  getChannel()?.postMessage(message);
};

/**
 * Подписаться на изменения auth-состояния из других вкладок/аппов.
 * Возвращает функцию отписки.
 */
export const onAuthChanged = (handler: () => void): (() => void) => {
  const channel = getChannel();
  if (!channel) return () => {};
  const listener = (event: MessageEvent) => {
    if ((event.data as IAuthSyncMessage | undefined)?.type === 'auth-changed') handler();
  };
  channel.addEventListener('message', listener);
  return () => channel.removeEventListener('message', listener);
};

/**
 * Сброс shared-канала — ТОЛЬКО для тестов (пересоздание после подмены
 * глобального BroadcastChannel-мока между кейсами).
 */
export const _resetAuthChannelForTests = (): void => {
  _channel?.close();
  _channel = null;
};

/**
 * @capsuletech/web-auth/session — session v2, cookie-first (ADR 068 D3).
 *
 * Реактивный session-store (Solid createStore) + хук `useAuth()` для чтения
 * user/role/статуса в любом слое аппа. Общий для всех стратегий.
 *
 * ## Модель v2
 *
 * Носитель сессии — httpOnly-кука `capsule_session`: фронт токен НЕ видит и
 * НЕ возит (XSS-стойкость). Персистентность = сама кука + `GET /auth/me`:
 * апп вызывает `initAuthSession()` один раз при загрузке — 200 → authed(user),
 * 401 → guest (штатное состояние, не ошибка). Никакого localStorage для
 * сессии — кука единственный носитель.
 *
 * `initAuthSession` также подписывает вкладку на BroadcastChannel-синк
 * (`'capsule-auth'`, ADR 068 D4): login/logout в любой вкладке/аппе того же
 * origin → ре-фетч `/me` → session-store обновлён.
 *
 * ## Legacy (role-mock, playground)
 *
 * `ISessionStorage`/`localSessionStorage`/`configureAuthSession` остаются
 * ТОЛЬКО как опора legacy role-mock-стратегии (playground: мок-endpoint без
 * бэка, персист user'а в localStorage через app-config-кодоген
 * `auth.session: { storage: 'local', key }`). Для cookie-флоу НЕ использовать —
 * помечены `@deprecated`. Персистируется только `{ user }` (токена в модели
 * v2 нет).
 *
 * Создание session-store вне Controller-scope намеренно (Solid createStore
 * работает вне реактивного root'а — singleton на время жизни модуля).
 * Для SSR/multiple-root — создавай отдельный store через `createAuthSession()`.
 *
 * Интерфейс `IAuthSessionStore` объявлен в `types.ts` (избегаем циклических
 * импортов types ↔ session). Здесь — только реализация.
 */

import { createStore } from 'solid-js/store';
import { DEFAULT_API_BASE, meRequest } from '../api/client';
import type { AuthStatus, IAuthSession, IAuthSessionStore, IAuthUser } from '../types';
import { onAuthChanged } from './broadcast';

// Re-export чтобы потребители /session могли импортировать из одного места.
export type { IAuthSessionStore } from '../types';
export { AUTH_CHANNEL_NAME, notifyAuthChanged, onAuthChanged } from './broadcast';

// ─── Legacy session storage (role-mock опора, @deprecated) ────────────────────

/**
 * Запись, которую `ISessionStorage` сериализует. v2: только `{ user }` —
 * токена в модели нет (кука httpOnly).
 *
 * @deprecated Legacy-опора role-mock-стратегии (playground). Cookie-флоу
 * персистентность не нужна — сессию хранит сама кука + `initAuthSession()`.
 */
export interface IPersistedSession {
  user: IAuthUser;
}

/**
 * Хранилище персиста сессии для role-mock-флоу (без бэка кука невозможна).
 *
 * @deprecated Legacy-опора role-mock-стратегии. Для cookie-флоу используй
 * `initAuthSession()` — кука единственный носитель.
 */
export interface ISessionStorage {
  getSession(): IPersistedSession | null;
  setSession(session: IPersistedSession): void;
  clearSession(): void;
}

/**
 * localStorage-адаптер персиста `{ user }`.
 *
 * @deprecated Legacy-опора role-mock-стратегии (playground `auth.session`
 * app-config). Для cookie-флоу НЕ использовать.
 */
export const localSessionStorage = (key: string): ISessionStorage => ({
  getSession(): IPersistedSession | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as Record<string, unknown>).user === 'object' &&
        (parsed as Record<string, unknown>).user !== null &&
        typeof (parsed as Record<string, Record<string, unknown>>).user.role === 'string'
      ) {
        return { user: (parsed as { user: IAuthUser }).user };
      }
      return null;
    } catch {
      return null;
    }
  },
  setSession(session: IPersistedSession): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(session));
    }
  },
  clearSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
});

// ─── Session store ────────────────────────────────────────────────────────────

/** Начальная (guest) сессия. */
export const emptySession: IAuthSession = {
  user: null,
  status: 'idle',
};

/**
 * Создаёт изолированный session-store.
 *
 * `storage` — ТОЛЬКО для legacy role-mock-флоу (`@deprecated`, персист
 * `{ user }` в localStorage + синхронный rehydrate). Cookie-флоу вызывает
 * без аргументов: персистентность обеспечивают кука + `initAuthSession()`.
 */
export const createAuthSession = (storage?: ISessionStorage): IAuthSessionStore => {
  // Начальное состояние: восстанавливаем из legacy-storage если передан.
  let initial: IAuthSession = { ...emptySession };
  if (storage) {
    const persisted = storage.getSession();
    if (persisted) {
      initial = { user: persisted.user, status: 'authed' };
    }
  }

  const [session, setSession] = createStore<IAuthSession>(initial);

  return {
    get session() {
      return session;
    },
    login(user: IAuthUser) {
      storage?.setSession({ user });
      setSession({ user, status: 'authed' });
    },
    logout() {
      storage?.clearSession();
      setSession({ ...emptySession });
    },
    setStatus(status: AuthStatus) {
      setSession('status', status);
    },
  };
};

// ─── Mutable singleton для useAuth() ─────────────────────────────────────────

/**
 * Внутренний ref-обёртка вокруг defaultAuthSession. Инициализируется ЛЕНИВО
 * (null на старте модуля) чтобы не вызывать Solid `createStore` при
 * module-eval в Node/SSR-контексте (capsule-registry читает capsule.app.ts
 * через Node — простой импорт модуля не должен запускать client-only API).
 *
 * Первый реальный клиентский вызов (useAuth(), initAuthSession(), login/
 * logout) создаёт store через `_getDefaultSession()` и запоминает результат.
 */
const _sessionRef: { current: IAuthSessionStore | null } = {
  current: null,
};

const _getDefaultSession = (): IAuthSessionStore => {
  if (_sessionRef.current === null) {
    _sessionRef.current = createAuthSession();
  }
  return _sessionRef.current;
};

/**
 * Синглтон-сессия. Auth-FSM обновляет её при login/logout; `useAuth()` читает.
 *
 * Для нескольких независимых app-root'ов — используй `createAuthSession()`
 * и пробрасывай явно (`sessionStore` prop).
 *
 * Сам объект — ленивый прокси: Solid `createStore` НЕ вызывается при импорте
 * модуля; store создаётся при первом клиентском обращении к члену объекта.
 */
export const defaultAuthSession: IAuthSessionStore = {
  get session() {
    return _getDefaultSession().session;
  },
  login(user) {
    _getDefaultSession().login(user);
  },
  logout() {
    _getDefaultSession().logout();
  },
  setStatus(status) {
    _getDefaultSession().setStatus(status);
  },
};

// ─── initAuthSession — bootstrap cookie-сессии (v2) ──────────────────────────

let _syncUnsubscribe: (() => void) | null = null;

/**
 * Ре-фетч `GET /auth/me` → обновление session-store.
 * 200 → authed(user); 401 → guest (logout). Network/5xx на фоне синка или
 * bootstrap не роняет апп: warn + текущее состояние остаётся guest-safe.
 */
const refreshSessionFromServer = async (
  apiBase: string,
  store: IAuthSessionStore,
): Promise<IAuthUser | null> => {
  try {
    const user = await meRequest(apiBase);
    if (user) {
      store.login(user);
    } else {
      store.logout();
    }
    return user;
  } catch (err) {
    console.warn('[web-auth] GET /auth/me failed — session state unchanged:', err);
    return null;
  }
};

/**
 * Bootstrap cookie-сессии — ОДИН вызов при загрузке аппа:
 *
 * ```ts
 * import { initAuthSession } from '@capsuletech/web-auth/session';
 * await initAuthSession(); // '/api' по умолчанию (single-origin канон)
 * ```
 *
 * - `GET /auth/me` (credentials: same-origin): 200 → authed(user),
 *   401 → guest (`status: 'idle'`, `user: null`). Guest — штатное состояние.
 * - Подписывает вкладку на BroadcastChannel-синк `'capsule-auth'` (ADR 068 D4):
 *   login/register/logout в другой вкладке/аппе → авто ре-фетч `/me`.
 *
 * Повторный вызов переустанавливает подписку (не дублирует слушателей).
 *
 * @returns аутентифицированный user либо `null` (guest / сеть недоступна).
 */
export const initAuthSession = async (
  apiBase: string = DEFAULT_API_BASE,
  sessionStore: IAuthSessionStore = defaultAuthSession,
): Promise<IAuthUser | null> => {
  _syncUnsubscribe?.();
  _syncUnsubscribe = onAuthChanged(() => {
    void refreshSessionFromServer(apiBase, sessionStore);
  });

  return refreshSessionFromServer(apiBase, sessionStore);
};

// ─── configureAuthSession (legacy role-mock) ──────────────────────────────────

/**
 * Параметры одноразовой конфигурации дефолтной сессии.
 *
 * @deprecated Legacy-опора role-mock-стратегии — см. `configureAuthSession`.
 */
export interface IConfigureAuthSessionOptions {
  /**
   * Тип хранилища.
   * - `'memory'` — без персистентности (дефолт, не нужно вызывать).
   * - `'local'`  — localStorage; обязательно укажи `key`.
   */
  storage: 'memory' | 'local';
  /**
   * Ключ localStorage. Обязателен при `storage: 'local'`.
   * @example 'playground-auth'
   */
  key?: string;
}

/**
 * Конфигурирует `defaultAuthSession` для персиста `{ user }` в localStorage
 * + синхронный rehydrate. Дёргается app-config-кодогеном
 * (`auth.session: { storage: 'local', key }` в capsule.app.ts → app-config.gen).
 *
 * @deprecated ТОЛЬКО для legacy role-mock-стратегии (playground: мок без
 * бэка, куку поставить некому). Cookie-флоу (credentials, backend/auth)
 * использует `initAuthSession()` — кука единственный носитель, localStorage
 * запрещён (ADR 068 D3).
 */
export const configureAuthSession = (options: IConfigureAuthSessionOptions): void => {
  if (options.storage === 'local') {
    if (!options.key) {
      throw new Error('[web-auth] configureAuthSession: "key" is required when storage is "local"');
    }
    _sessionRef.current = createAuthSession(localSessionStorage(options.key));
  } else {
    // 'memory' — сбрасываем к чистому store (полезно в тестах).
    _sessionRef.current = createAuthSession();
  }
};

// ─── useAuth() ────────────────────────────────────────────────────────────────

export interface IUseAuthResult {
  /** Реактивный current-user. */
  readonly user: IAuthUser | null;
  /** Роль текущего пользователя (shorthand). */
  readonly role: string | null;
  /** Статус auth-FSM. */
  readonly status: AuthStatus;
  /** true если сессия аутентифицирована. */
  readonly isAuthed: boolean;
}

/**
 * Читает текущую сессию реактивно. Используется в любом слое аппа.
 * v2: токена в API нет — носитель сессии httpOnly-кука.
 *
 * ```ts
 * import { useAuth } from '@capsuletech/web-auth/session';
 *
 * const { role, isAuthed } = useAuth();
 * ```
 */
export const useAuth = (sessionStore?: IAuthSessionStore): IUseAuthResult => {
  const s = sessionStore ?? defaultAuthSession;
  return {
    get user() {
      return s.session.user;
    },
    get role() {
      return s.session.user?.role ?? null;
    },
    get status() {
      return s.session.status;
    },
    get isAuthed() {
      return s.session.status === 'authed';
    },
  };
};

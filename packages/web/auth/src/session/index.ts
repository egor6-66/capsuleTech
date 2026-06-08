/**
 * @capsuletech/web-auth/session
 *
 * Реактивный session-store (Solid createStore) + хук `useAuth()` для чтения
 * роли/статуса в любом слое аппа. Общий для всех стратегий.
 *
 * Токен-хранилище — config-driven через `TokenStorage` (дефолт: memory).
 * Air-gapped: никаких внешних URL, никакого хардкода localStorage-ключа.
 *
 * Создание session-store вне Controller-scope намеренно (Solid createStore
 * работает вне реактивного root'а — singleton на время жизни модуля).
 * Для SSR/multiple-root — создавай отдельный store через `createAuthSession()`.
 *
 * Интерфейс `IAuthSessionStore` объявлен в `types.ts` (избегаем циклических
 * импортов types ↔ session). Здесь — только реализация.
 */

import { createStore } from 'solid-js/store';
import type { AuthStatus, IAuthSession, IAuthSessionStore, IAuthUser } from '../types';

// Re-export чтобы потребители /session могли импортировать тип из одного места.
export type { IAuthSessionStore } from '../types';

// ─── Token storage interface (config-driven) ─────────────────────────────────

/**
 * Config-driven токен-хранилище. Дефолт — memory (air-gapped, без external
 * зависимостей). Апп может передать localStorage-адаптер:
 *   createLocalStorageStorage('capsule-auth-token')
 */
export interface ITokenStorage {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

/** Дефолт: in-memory хранилище. Не переживает перезагрузку страницы. */
export const memoryStorage = (): ITokenStorage => {
  let _token: string | null = null;
  return {
    get: () => _token,
    set: (t) => {
      _token = t;
    },
    clear: () => {
      _token = null;
    },
  };
};

/** localStorage-адаптер. Апп передаёт в `createAuthSession` для персистентной сессии. */
export const localStorageStorage = (key: string): ITokenStorage => ({
  get: () => (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  set: (t) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, t);
  },
  clear: () => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
});

// ─── Session store ────────────────────────────────────────────────────────────

/** Начальная (неаутентифицированная) сессия. */
export const emptySession: IAuthSession = {
  token: null,
  user: null,
  status: 'idle',
};

/**
 * Создаёт изолированный session-store. Используется внутри AuthController
 * и через синглтон `defaultAuthSession` для `useAuth()`.
 */
export const createAuthSession = (storage?: ITokenStorage): IAuthSessionStore => {
  const store = storage ?? memoryStorage();
  const [session, setSession] = createStore<IAuthSession>({ ...emptySession });

  return {
    get session() {
      return session;
    },
    login(token: string, user: IAuthUser) {
      store.set(token);
      setSession({ token, user, status: 'authed' });
    },
    logout() {
      store.clear();
      setSession({ ...emptySession });
    },
    setStatus(status: AuthStatus) {
      setSession('status', status);
    },
  };
};

// ─── Singleton для useAuth() ──────────────────────────────────────────────────

/**
 * Синглтон-сессия (memory-default). AuthController обновляет её при login/logout;
 * `useAuth()` читает из неё.
 *
 * Для нескольких независимых app-root'ов — используй `createAuthSession(storage)`
 * и пробрасывай явно.
 */
export const defaultAuthSession = createAuthSession();

// ─── useAuth() ────────────────────────────────────────────────────────────────

export interface IUseAuthResult {
  /** Реактивный токен. */
  readonly token: string | null;
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
    get token() {
      return s.session.token;
    },
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

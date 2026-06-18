/**
 * @capsuletech/web-auth/session
 *
 * Реактивный session-store (Solid createStore) + хук `useAuth()` для чтения
 * роли/статуса в любом слое аппа. Общий для всех стратегий.
 *
 * Токен-хранилище — config-driven через `ITokenStorage` (дефолт: memory).
 * Персистентная сессия (token + user) — через `ISessionStorage`.
 * Air-gapped: никаких внешних URL, никакого хардкода localStorage-ключа.
 *
 * Создание session-store вне Controller-scope намеренно (Solid createStore
 * работает вне реактивного root'а — singleton на время жизни модуля).
 * Для SSR/multiple-root — создавай отдельный store через `createAuthSession()`.
 *
 * Интерфейс `IAuthSessionStore` объявлен в `types.ts` (избегаем циклических
 * импортов types ↔ session). Здесь — только реализация.
 *
 * ## Персистентность
 *
 * Чтобы пережить перезагрузку страницы, апп вызывает один раз при загрузке:
 *
 * ```ts
 * import { configureAuthSession } from '@capsuletech/web-auth/session';
 * configureAuthSession({ storage: 'local', key: 'my-app-auth' });
 * ```
 *
 * После этого `useAuth().isAuthed` и `useAuth().role` уже содержат
 * восстановленную сессию — синхронно, до первого рендера.
 */

import { createStore } from 'solid-js/store';
import type { AuthStatus, IAuthSession, IAuthSessionStore, IAuthUser } from '../types';

// Re-export чтобы потребители /session могли импортировать тип из одного места.
export type { IAuthSessionStore } from '../types';

// ─── Token storage interface (config-driven, backward compat) ────────────────

/**
 * Config-driven токен-хранилище (только строка). Дефолт — memory.
 * Для хранения полной сессии используй `ISessionStorage`.
 */
export interface ITokenStorage {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

// ─── Session storage interface (persists token + user) ───────────────────────

/** Запись, которую `ISessionStorage` сериализует. */
export interface IPersistedSession {
  token: string;
  user: IAuthUser;
}

/**
 * Расширенное хранилище: персистирует `{ token, user }` как единую запись.
 * Позволяет восстановить роль после перезагрузки страницы.
 *
 * `getSession()` возвращает `IPersistedSession | null` — null если хранилище
 * пусто или запись невалидна (JSON-ошибка, отсутствие обязательных полей).
 */
export interface ISessionStorage {
  getSession(): IPersistedSession | null;
  setSession(session: IPersistedSession): void;
  clearSession(): void;
}

// ─── Storage implementations ──────────────────────────────────────────────────

/** Дефолт: in-memory хранилище токена. Не переживает перезагрузку страницы. */
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

/** localStorage-адаптер только для токена (backward compat). */
export const localStorageStorage = (key: string): ITokenStorage => ({
  get: () => (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null),
  set: (t) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, t);
  },
  clear: () => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
});

/**
 * localStorage-адаптер полной сессии (token + user).
 * Апп передаёт в `createAuthSession` или использует через `configureAuthSession`.
 *
 * @example
 * ```ts
 * const store = createAuthSession(localSessionStorage('my-app-auth'));
 * ```
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
        typeof (parsed as Record<string, unknown>).token === 'string' &&
        typeof (parsed as Record<string, unknown>).user === 'object' &&
        (parsed as Record<string, unknown>).user !== null &&
        typeof (parsed as Record<string, Record<string, unknown>>).user.role === 'string'
      ) {
        return parsed as IPersistedSession;
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

/** Начальная (неаутентифицированная) сессия. */
export const emptySession: IAuthSession = {
  token: null,
  user: null,
  status: 'idle',
};

/**
 * Создаёт изолированный session-store.
 *
 * Принимает либо `ISessionStorage` (token + user, полная персистентность)
 * либо `ITokenStorage` (только токен, backward compat), либо ничего (memory).
 *
 * Если передан `ISessionStorage` и в нём есть валидная запись — store
 * инициализируется восстановленной сессией (status: 'authed').
 */
export const createAuthSession = (storage?: ITokenStorage | ISessionStorage): IAuthSessionStore => {
  // Определяем тип хранилища: ISessionStorage имеет метод `getSession`.
  const isSessionStorage = (s: ITokenStorage | ISessionStorage): s is ISessionStorage =>
    typeof (s as ISessionStorage).getSession === 'function';

  // Начальное состояние: восстанавливаем из ISessionStorage если доступно.
  let initial: IAuthSession = { ...emptySession };
  if (storage && isSessionStorage(storage)) {
    const persisted = storage.getSession();
    if (persisted) {
      initial = { token: persisted.token, user: persisted.user, status: 'authed' };
    }
  }

  const [session, setSession] = createStore<IAuthSession>(initial);

  return {
    get session() {
      return session;
    },
    login(token: string, user: IAuthUser) {
      if (storage && isSessionStorage(storage)) {
        storage.setSession({ token, user });
      } else if (storage) {
        // ITokenStorage backward compat — persist token only
        storage.set(token);
      }
      setSession({ token, user, status: 'authed' });
    },
    logout() {
      if (storage && isSessionStorage(storage)) {
        storage.clearSession();
      } else if (storage) {
        storage.clear();
      }
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
 * Первый реальный клиентский вызов (useAuth(), configureAuthSession(), login/
 * logout) создаёт store через `_getDefaultSession()` и запоминает результат.
 */
const _sessionRef: { current: IAuthSessionStore | null } = {
  current: null,
};

/**
 * Возвращает (или создаёт при первом обращении) дефолтный session-store.
 * Единственная точка, где вызывается `createAuthSession()` для синглтона.
 * Клиентский код всегда попадает сюда через useAuth()/configureAuthSession() —
 * т.е. только на стороне браузера.
 */
const _getDefaultSession = (): IAuthSessionStore => {
  if (_sessionRef.current === null) {
    _sessionRef.current = createAuthSession();
  }
  return _sessionRef.current;
};

/**
 * Синглтон-сессия (memory-default). AuthController обновляет её при login/logout;
 * `useAuth()` читает из неё.
 *
 * Апп может изменить хранилище через `configureAuthSession` (один раз при
 * загрузке). Для нескольких независимых app-root'ов — используй
 * `createAuthSession(storage)` и пробрасывай явно.
 *
 * Сам объект — ленивый прокси: Solid `createStore` НЕ вызывается при импорте
 * модуля; store создаётся при первом клиентском обращении к члену объекта.
 */
export const defaultAuthSession: IAuthSessionStore = {
  get session() {
    return _getDefaultSession().session;
  },
  login(token, user) {
    _getDefaultSession().login(token, user);
  },
  logout() {
    _getDefaultSession().logout();
  },
  setStatus(status) {
    _getDefaultSession().setStatus(status);
  },
};

// ─── configureAuthSession ─────────────────────────────────────────────────────

/** Параметры одноразовой конфигурации дефолтной сессии. */
export interface IConfigureAuthSessionOptions {
  /**
   * Тип хранилища.
   * - `'memory'` — без персистентности (дефолт, не нужно вызывать).
   * - `'local'`  — localStorage; обязательно укажи `key`.
   */
  storage: 'memory' | 'local';
  /**
   * Ключ localStorage. Обязателен при `storage: 'local'`.
   * Выбирай namespace, специфичный для приложения.
   * @example 'playground-auth'
   */
  key?: string;
}

/**
 * Конфигурирует `defaultAuthSession` (ту, что использует `useAuth()` и
 * `AuthController` по умолчанию) для персистентного хранения сессии.
 *
 * Вызови один раз при загрузке аппа (до монтирования root-компонента):
 *
 * ```ts
 * // apps/playground/src/main.tsx (или top-level side-effect)
 * import { configureAuthSession } from '@capsuletech/web-auth/session';
 * configureAuthSession({ storage: 'local', key: 'playground-auth' });
 * ```
 *
 * После вызова:
 * - `useAuth().isAuthed` немедленно `true` если в localStorage есть валидная сессия.
 * - `useAuth().role` возвращает сохранённую роль.
 * - Последующие `login()` / `logout()` пишут/очищают localStorage автоматически.
 *
 * Повторный вызов перезаписывает конфигурацию (не рекомендуется; для тестов — ок).
 */
export const configureAuthSession = (options: IConfigureAuthSessionOptions): void => {
  if (options.storage === 'local') {
    if (!options.key) {
      throw new Error('[web-auth] configureAuthSession: "key" is required when storage is "local"');
    }
    // Создаём новый store с localStorage-персистентностью и rehydrate синхронно.
    _sessionRef.current = createAuthSession(localSessionStorage(options.key));
  } else {
    // 'memory' — сбрасываем к memory (полезно в тестах).
    // Даже если лениво ещё не создан — выставляем явно (чтобы тесты, вызывающие
    // configureAuthSession('memory') в beforeEach, получали чистый store).
    _sessionRef.current = createAuthSession();
  }
};

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

/**
 * @capsuletech/web-auth — общие контракты домена auth.
 *
 * Единственное место объявления shared-типов (session + стратегия + события +
 * form-поля). Импортируются блоками стратегий (/role, /credentials, …),
 * /session, /controllers, /ui.
 *
 * ## Session v2 — cookie-first (ADR 068 D3)
 *
 * Носитель сессии — httpOnly-кука `capsule_session`: фронт токен НЕ видит и
 * НЕ возит (XSS-стойкость). Персистентность = сама кука + `GET /auth/me` на
 * bootstrap (`initAuthSession`). Поля `token` в модели НЕТ — это breaking
 * change против token-эры playground-моков (v1).
 */

import type { JSX } from 'solid-js';

// ─── Session ─────────────────────────────────────────────────────────────────

/** Статус auth-FSM (generic-флоу, параметризуется стратегией). */
export type AuthStatus = 'idle' | 'submitting' | 'authed' | 'error';

/**
 * Аутентифицированный пользователь — выровнен на контракт backend/auth
 * (`UserOut`: `{ id, login, role }`).
 *
 * `id`/`login` опциональны ТОЛЬКО ради legacy role-mock-стратегии (playground):
 * она аутентифицирует по роли и не имеет ни id, ни login. Credentials-флоу
 * (cookie, backend/auth) заполняет все три поля всегда.
 *
 * Маппинг роль→права (app-specific permissions) живёт в АППЕ, не в пакете.
 */
export interface IAuthUser {
  id?: number;
  login?: string;
  /** Роль (user/admin/developer/…) — общая для всех стратегий. */
  role: string;
}

/**
 * Сессия v2: пользователь + статус. БЕЗ token — носитель сессии httpOnly-кука,
 * фронту токен недоступен by design. Читается через `useAuth()`.
 */
export interface IAuthSession {
  user: IAuthUser | null;
  status: AuthStatus;
}

/**
 * Контракт session-store (реализован в /session, объявлен здесь чтобы
 * избежать циклического импорта types ↔ session).
 *
 * Реализация `createAuthSession` / `defaultAuthSession` — в `@capsuletech/web-auth/session`.
 */
export interface IAuthSessionStore {
  /** Реактивное состояние сессии. */
  readonly session: IAuthSession;
  /** Установить сессию после успешного логина (v2: user, без token). */
  login(user: IAuthUser): void;
  /** Сбросить сессию при логауте. */
  logout(): void;
  /** Установить промежуточный статус (submitting/error). */
  setStatus(status: AuthStatus): void;
}

// ─── Форм-поля (config-driven form-блок) ─────────────────────────────────────

/** Тип одного поля формы для config-driven рендера в AuthLoginForm. */
export type AuthFieldType = 'select' | 'password' | 'text';

export interface IAuthFormField {
  /** Уникальный тег поля — передаётся как `meta.tags: [tag]` в форму. */
  tag: string;
  type: AuthFieldType;
  label: string;
  placeholder?: string;
  /** Опции для select-поля. */
  options?: ReadonlyArray<{ value: string; label: string }>;
  /** Значение по умолчанию. */
  defaultValue?: string;
}

// ─── Стратегия ────────────────────────────────────────────────────────────────

/** Идентификатор стратегии входа = subpath-блок. */
export type AuthStrategyId = 'role' | 'credentials' | 'oauth2' | 'qr';

/**
 * Контракт стратегии входа. Каждый subpath-блок (/role, /credentials, …)
 * реализует его: декларация полей формы + параметры auth-FSM.
 *
 * `TInput` — форма данных, которые стратегия собирает для аутентификации.
 */
export interface IAuthStrategy<TInput = Record<string, unknown>> {
  id: AuthStrategyId;
  /** Декларация полей для config-driven form-блока (web-ui), не хардкод-разметка. */
  fields?: ReadonlyArray<IAuthFormField>;
  /** Дефолтные значения input. */
  defaults?: Partial<TInput>;
  /**
   * Текст ошибки для invalid-credentials (401 / "invalid" / "wrong" / …).
   * Стратегия задаёт свой вариант — например, /role не имеет поля «логин»,
   * поэтому использует «Неверный пароль» вместо «Неверный логин или пароль».
   * @default 'Неверный логин или пароль'
   */
  invalidCredentialsMessage?: string;
}

// ─── События (ADR 032) ────────────────────────────────────────────────────────

/**
 * ИМЕНОВАННЫЕ события Auth-блоков, эмиттятся через `emit` handler-API.
 * Phantom `__events` → типизация `target.payload` на стороне аппа
 * (`Feature<EventsOf<typeof Auth.Login>>`).
 *
 * v2: `onLogin` несёт ТОЛЬКО user (БЕЗ token — кука httpOnly, фронт токен
 * не видит). `Auth.Register` при успехе тоже эмиттит `onLogin` — бэк ставит
 * session-куку сразу при регистрации, пользователь аутентифицирован.
 */
export interface IAuthEvents {
  onLogin: { user: IAuthUser };
  onLogout: Record<string, never>;
  onLoginError: { message: string };
}

// ─── Публичный props-контракт Auth.Login (discriminated union) ─────────────────

/**
 * Брендинг и общие props Auth.Login — не зависят от стратегии.
 *
 * Апп передаёт только данные-пропсы. `Ui` отсутствует: форма построена
 * на web-core `View`, который подхватывает Ui-kit автоматически из
 * ближайшего Controller-scope (AuthFsm) через UiProxy.
 */
export interface IAuthBranding {
  /** Заголовок формы. @default 'Вход' */
  title?: string;
  /** Подзаголовок формы (опционально). */
  subtitle?: string;
  /** Текст кнопки. @default 'Войти' */
  submitLabel?: string;
  /** Сноска внизу формы (брендинг аппа). */
  footerNote?: string;
  /**
   * Session-store. Дефолт — `defaultAuthSession` (singleton memory).
   * Апп передаёт кастомный store если нужен изолированный root.
   */
  sessionStore?: IAuthSessionStore;
  /** Overrides для ControllerProxy name-mapping. */
  overrides?: Record<string, string>;
  /** Кастомная форма (заменяет встроенную). */
  children?: JSX.Element;
}

/**
 * Публичный props-тип `Auth.Login` — discriminated union по `type`.
 *
 * Стратегия = дискриминатор; поля типизируются от него.
 * Апп передаёт только данные — никаких импортов билдеров.
 *
 * @example
 * ```tsx
 * // credentials (cookie-флоу, backend/auth):
 * <Auth.Login type="credentials" title="Вход" />
 *
 * // role (legacy mock, playground):
 * <Auth.Login
 *   type="role"
 *   roles={[{ value: 'developer', label: 'Developer' }, { value: 'support', label: 'Support' }]}
 * />
 * ```
 */
export type IAuthLoginProps =
  | ({
      /** Стратегия входа по роли: Select(role) + Input(password). Legacy mock-опора. */
      type: 'role';
      /** Список ролей для Select. НЕ хардкод в пакете — апп задаёт. */
      roles: ReadonlyArray<{ value: string; label: string }>;
      /** Дефолтная роль. @default первая роль из `roles` */
      defaultRole?: string;
      /** Метка поля роли в Select. @default 'Роль' */
      roleLabel?: string;
      /** Метка поля пароля. @default 'Пароль' */
      passwordLabel?: string;
    } & IAuthBranding)
  | ({
      /**
       * Стратегия по логину+паролю (cookie-флоу, backend/auth ADR 068).
       * Submit → `POST /auth/login` (credentials: same-origin) → Set-Cookie →
       * session.login(user) + BroadcastChannel-синк + emit('onLogin').
       */
      type: 'credentials';
      /** Префикс API (single-origin канон). @default '/api' */
      apiBase?: string;
      /** Метка поля логина. @default 'Логин' */
      loginLabel?: string;
      /** Метка поля пароля. @default 'Пароль' */
      passwordLabel?: string;
    } & IAuthBranding)
  | ({
      /**
       * Стратегия через OAuth 2.0 (redirect/PKCE).
       * Провайдер/redirect — config-driven props аппа (air-gapped, НЕ хардкод URL).
       * TODO: реализовать в следующей итерации.
       */
      type: 'oauth2';
      // TODO arms — provider config, redirect URI via props
    } & IAuthBranding)
  | ({
      /**
       * Стратегия через QR-код (polling за подтверждением скана).
       * TODO: реализовать в следующей итерации.
       */
      type: 'qr';
      // TODO arms — polling interval, QR endpoint via props
    } & IAuthBranding);

// ─── Публичный props-контракт Auth.Register ──────────────────────────────────

/**
 * Props `Auth.Register` — форма регистрации (login + password + подтверждение).
 * Только credentials-флоу (cookie): `POST /auth/register` → Set-Cookie →
 * session.login(user) + emit('onLogin').
 */
export interface IAuthRegisterProps extends IAuthBranding {
  /** Префикс API (single-origin канон). @default '/api' */
  apiBase?: string;
  /** Метка поля логина. @default 'Логин' */
  loginLabel?: string;
  /** Метка поля пароля. @default 'Пароль' */
  passwordLabel?: string;
  /** Метка поля подтверждения пароля. @default 'Повторите пароль' */
  confirmLabel?: string;
}

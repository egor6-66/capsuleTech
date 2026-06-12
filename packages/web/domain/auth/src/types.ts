/**
 * @capsuletech/web-auth — общие контракты домена auth.
 *
 * Единственное место объявления shared-типов (session + login-контракт +
 * стратегия + события). Импортируются блоками стратегий (/role, /credentials,
 * …), /session, /controllers, /ui.
 *
 * SKELETON: контракты-черновики. owner-web-auth уточняет при реализации
 * (в т.ч. решает Zod-схема vs interface для login-контракта — пакет зависит
 * от @capsuletech/shared-zod, валидация ответа возможна через `schema.parse`).
 */

import type { JSX } from 'solid-js';

// ─── Session ─────────────────────────────────────────────────────────────────

/** Статус auth-FSM (generic-флоу, параметризуется стратегией). */
export type AuthStatus = 'idle' | 'submitting' | 'authed' | 'error';

/**
 * Аутентифицированный пользователь. Намеренно минимальный/generic —
 * маппинг роль→права (app-specific permissions) живёт в АППЕ, не в пакете.
 */
export interface IAuthUser {
  id?: string;
  /** Роль (developer/support/…) — ось стратегии /role; общая для всех стратегий. */
  role: string;
  name?: string;
}

/** Сессия: токен + текущий пользователь + статус. Читается через `useAuth()`. */
export interface IAuthSession {
  token: string | null;
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
  /** Установить сессию после успешного логина. */
  login(token: string, user: IAuthUser): void;
  /** Сбросить сессию при логауте. */
  logout(): void;
  /** Установить промежуточный статус (submitting/error). */
  setStatus(status: AuthStatus): void;
}

// ─── Login-контракт (граница пакет ↔ backend) ─────────────────────────────────

/**
 * Тело `POST /auth/login`. Поля зависят от стратегии — generic-параметр `TInput`.
 * Контракт — в пакете; реализация endpoint'а — в app/backend.
 */
export interface ILoginRequest<TInput = Record<string, unknown>> {
  strategy: AuthStrategyId;
  input: TInput;
}

/** Ответ `POST /auth/login` (чистый контракт, без мок-веток). */
export interface ILoginResponse {
  token: string;
  role: string;
  user?: IAuthUser;
}

// ─── Стратегия ────────────────────────────────────────────────────────────────

/** Идентификатор стратегии входа = subpath-блок. */
export type AuthStrategyId = 'role' | 'credentials' | 'oauth2' | 'qr';

/**
 * Контракт стратегии входа. Каждый subpath-блок (/role, /credentials, …)
 * реализует его: endpoint-контракт + form-конфиг + параметры auth-FSM.
 *
 * `TInput` — форма данных, которые стратегия собирает и шлёт в `/auth/login`.
 *
 * TODO(owner-web-auth): финализировать форму (поля для config-driven form-блока,
 * валидация, post-resolve в session). Старт — `/role` по playground-прототипу.
 */
export interface IAuthStrategy<TInput = Record<string, unknown>> {
  id: AuthStrategyId;
  /** Декларация полей для config-driven form-блока (web-ui), не хардкод-разметка. */
  fields?: unknown;
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
 * ИМЕНОВАННЫЕ события Controllers.Auth, эмиттятся через `useEmit` в app-Feature.
 * Phantom `__events` → типизация `target.payload` на стороне аппа.
 *
 * TODO(owner-web-auth): завести phantom-тип в /controllers по образцу
 * package-event-flow (Feature<Auth.Events>).
 */
export interface IAuthEvents {
  onLogin: { token: string; user: IAuthUser };
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
   * Апп передаёт кастомный store если нужен localStorage или изолированный root.
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
 * Апп передаёт только данные (roles, defaultRole) — никаких импортов билдеров.
 *
 * @example
 * ```tsx
 * // Ноль импортов в app — только данные-пропсы:
 * <Auth.Login
 *   type="role"
 *   roles={[{ value: 'developer', label: 'Developer' }, { value: 'support', label: 'Support' }]}
 *   title="Вход"
 * />
 * ```
 */
export type IAuthLoginProps =
  | ({
      /** Стратегия входа по роли: Select(role) + Input(password). */
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
       * Стратегия по логину+паролю.
       * TODO: реализовать в следующей итерации.
       */
      type: 'credentials';
      // TODO arms — fields for login/password form
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

/**
 * @capsuletech/web-auth/controllers — connected-блоки Auth.Login / Auth.Register /
 * Auth.Gate (ADR 032).
 *
 * Единственный subpath с зависимостью на `@capsuletech/web-core`.
 *
 * `AuthLogin` / `AuthRegister` — Tier 2 connected blocks: создают Controller-scope
 * (web-core Feature wrapper) с FSM `idle → submitting → authed/error` и рендерят
 * форму внутри своего scope.
 *
 * `AuthGate` — guest-блок целиком: Login ↔ Register + ссылка-переключатель;
 * mode-стейт внутри (Gate-FSM), события вложенных форм баблятся сквозь него
 * без изменений (auto-bubble — у Gate-схемы нет onLogin/onLoginError-хендлеров).
 *
 * Submit-канал: стандартный UiProxy meta-tags path:
 *   AuthLoginForm → <Button meta={{ tags: ['submit'] }}> → onClick → ControllerProxy dispatch.
 *
 * Emit-канал: `emit` из handler-API (`IHandlerApi.emit`), доступен в каждом хендлере
 * включая async lifecycle (`onInit`).
 *
 * ## Стратегии (v2, cookie-first)
 *
 * - `type="credentials"` — канонический cookie-флоу (ADR 068): собственный
 *   HTTP-клиент пакета (`loginRequest`, credentials: 'same-origin'), httpOnly-кука,
 *   session.login(user) + BroadcastChannel-синк. `apiBase` — prop (@default '/api').
 * - `type="role"` — legacy mock-опора (playground): IO через app-endpoint
 *   `services.api.auth.login` (preRequest-мок). Токен из ответа мока
 *   ИГНОРИРУЕТСЯ — session v2 хранит только user.
 *
 * Phantom `__events?: IAuthEvents` → app-DX:
 *   Feature<EventsOf<typeof Auth.Login>>(({ router }) => ({
 *     onLogin: ({ target }) => { router.goTo('/'); },   // payload: { user } — БЕЗ token
 *     onLoginError: ({ target }) => { ... },
 *   }));
 *
 * Props-контракт: discriminated union по `type` (IAuthLoginProps из types.ts).
 * Стратегия строится ВНУТРИ компонента из пропов (инверсия зависимости).
 */

import type { IHandlerApi } from '@capsuletech/web-core';
import { Feature, useCtx } from '@capsuletech/web-core';
import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import {
  AuthApiError,
  InvalidCredentialsError,
  LoginTakenError,
  loginRequest,
  registerRequest,
} from '../api/client';
import { credentialsStrategy, type ICredentialsStrategy } from '../credentials/index';
import type { IRoleStrategy } from '../role/index';
import { roleStrategy } from '../role/index';
import { defaultAuthSession, type IAuthSessionStore, notifyAuthChanged } from '../session/index';
import type {
  AuthGateMode,
  IAuthEvents,
  IAuthGateProps,
  IAuthLoginProps,
  IAuthRegisterProps,
  IAuthUser,
} from '../types';
import { AuthGateSwitch } from '../ui/gateSwitch';
import { AuthLoginForm } from '../ui/loginForm';

// ─── Маппинг ошибок в дружелюбный текст формы ────────────────────────────────
//
// Сообщение показывается В ФОРМЕ (package-level). emit('onLoginError') несёт
// оригинальный rawMessage для app-уровня.

const DEFAULT_INVALID_CREDENTIALS_MESSAGE = 'Неверный логин или пароль';
const DEFAULT_ERROR_MESSAGE = 'Не удалось войти. Попробуйте ещё раз.';
const NETWORK_ERROR_MESSAGE = 'Не удалось подключиться к серверу';

/**
 * Legacy string-sniffing маппинг для role-mock-стратегии (мок кидает plain
 * Error с текстом). Credentials-флоу использует типизированный
 * `mapCredentialsError` — точнее, без эвристик по подстрокам.
 */
const mapAuthError = (
  rawMessage: string,
  invalidCredentialsMessage: string = DEFAULT_INVALID_CREDENTIALS_MESSAGE,
): string => {
  const msg = rawMessage.toLowerCase();
  if (
    msg.includes('401') ||
    msg.includes('unauthorized') ||
    msg.includes('invalid') ||
    msg.includes('wrong') ||
    msg.includes('incorrect') ||
    msg.includes('password') ||
    msg.includes('пароль') ||
    msg.includes('неверн')
  ) {
    return invalidCredentialsMessage;
  }
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('connection') ||
    msg.includes('connect') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused')
  ) {
    return NETWORK_ERROR_MESSAGE;
  }
  return DEFAULT_ERROR_MESSAGE;
};

/**
 * Типизированный маппинг ошибок HTTP-клиента (credentials-флоу):
 * 401 → invalid-creds текст стратегии, 409 → «Логин уже занят»,
 * 422 (pydantic-валидация бэка) → требования к полям, сетевые
 * (fetch TypeError) → «Не удалось подключиться…», прочее → дефолт.
 */
const mapCredentialsError = (
  err: unknown,
  invalidCredentialsMessage: string = DEFAULT_INVALID_CREDENTIALS_MESSAGE,
): string => {
  if (err instanceof InvalidCredentialsError) return invalidCredentialsMessage;
  if (err instanceof LoginTakenError) return 'Логин уже занят';
  if (err instanceof AuthApiError) {
    if (err.status === 422) return 'Логин — от 3 символов, пароль — от 8 символов';
    return DEFAULT_ERROR_MESSAGE;
  }
  // fetch кидает TypeError на network-failure (offline/ECONNREFUSED/CORS).
  if (err instanceof TypeError) return NETWORK_ERROR_MESSAGE;
  return DEFAULT_ERROR_MESSAGE;
};

const rawMessageOf = (err: unknown): string => (err instanceof Error ? err.message : '');

// ─── Общие куски FSM (idle-переход + error-state clear) ──────────────────────

const idleState = {
  onClick: ({ target, state }: IHandlerApi) => {
    const tags = (target.meta?.tags ?? []) as readonly string[];
    if (tags.includes('submit')) state.set('submitting');
  },
};

const errorState = {
  /** Retry через submit — гасим ошибку и возвращаемся в idle. */
  onClick: ({ target, store, state }: IHandlerApi) => {
    const tags = (target.meta?.tags ?? []) as readonly string[];
    if (tags.includes('submit')) {
      store.update({ errorMessage: '' });
      state.set('idle');
    }
  },
  /** Любое взаимодействие с инпутом — сразу гасим ошибку + возврат в idle. */
  onInput: ({ store, state }: IHandlerApi) => {
    store.update({ errorMessage: '' });
    state.set('idle');
  },
  /** onChange — для Select (изменение роли тоже гасит ошибку). */
  onChange: ({ store, state }: IHandlerApi) => {
    store.update({ errorMessage: '' });
    state.set('idle');
  },
};

const authedState = (sessionStore: IAuthSessionStore) => ({
  onLogout: ({ state, emit }: IHandlerApi) => {
    sessionStore.logout();
    notifyAuthChanged();
    state.set('idle');
    emit('onLogout', {});
  },
});

/** Общий фейл-путь submitting-хендлеров: session/FSM/форма/emit. */
const failSubmit = (
  { store, state, emit }: Pick<IHandlerApi, 'store' | 'state' | 'emit'>,
  sessionStore: IAuthSessionStore,
  errorMessage: string,
  rawMessage: string,
) => {
  sessionStore.setStatus('error');
  state.set('error');
  store.update({ errorMessage });
  emit('onLoginError', { payload: { message: rawMessage || errorMessage } });
};

/** Общий успех-путь: session + синк + FSM + emit (v2: payload БЕЗ token). */
const succeedSubmit = (
  { state, emit }: Pick<IHandlerApi, 'state' | 'emit'>,
  sessionStore: IAuthSessionStore,
  user: IAuthUser,
) => {
  sessionStore.login(user);
  notifyAuthChanged();
  state.set('authed');
  emit('onLogin', { payload: { user } });
};

// ─── buildRoleFeature: legacy role-mock FSM (IO через app-endpoint) ──────────
//
// IO (api.auth.login) требует Feature, а не Controller — api инжектится
// web-core'ом ТОЛЬКО в Feature (по контракту IServices).

const buildRoleFeature = (
  strategy: IRoleStrategy,
  sessionStore: IAuthSessionStore,
  roleTag: string,
  passwordTag: string,
) =>
  Feature(({ api }) => ({
    initial: 'idle' as const,

    states: {
      idle: idleState,

      submitting: {
        onInit: async ({ store, state, emit }: IHandlerApi) => {
          if (!api) {
            console.error('[Auth.Login] api client not initialized');
            failSubmit(
              { store, state, emit },
              sessionStore,
              DEFAULT_ERROR_MESSAGE,
              'API not initialized',
            );
            return;
          }

          store.patch(['@submit'], { loading: true });
          store.patch(['@input'], { disabled: true });

          const values = store.values(['@input']) as Record<string, string>;
          const roleValue = values[roleTag] ?? strategy.defaults?.role ?? '';
          const passwordValue = values[passwordTag] ?? '';

          sessionStore.setStatus('submitting');

          try {
            // Мок-endpoint возвращает { token, role } — token в v2 ИГНОРИРУЕТСЯ
            // (сессия cookie-first, токен фронту не нужен).
            const result = await (
              api as {
                auth: {
                  login: (input: {
                    role: string;
                    password: string;
                  }) => Promise<{ role: string; user?: IAuthUser }>;
                };
              }
            ).auth.login({
              role: roleValue,
              password: passwordValue,
            });

            const user: IAuthUser = result.user ?? { role: result.role };
            succeedSubmit({ state, emit }, sessionStore, user);
          } catch (err) {
            const rawMessage = rawMessageOf(err);
            const errorMessage = mapAuthError(rawMessage, strategy.invalidCredentialsMessage);
            failSubmit({ store, state, emit }, sessionStore, errorMessage, rawMessage);
          } finally {
            store.patch(['@submit'], { loading: false });
            store.patch(['@input'], { disabled: false });
          }
        },
      },

      authed: authedState(sessionStore),

      error: errorState,
    },
  }));

// ─── buildCredentialsFeature: cookie-флоу login (собственный HTTP-клиент) ────

const buildCredentialsFeature = (
  strategy: ICredentialsStrategy,
  sessionStore: IAuthSessionStore,
  apiBase?: string,
) =>
  Feature(() => ({
    initial: 'idle' as const,

    states: {
      idle: idleState,

      submitting: {
        onInit: async ({ store, state, emit }: IHandlerApi) => {
          store.patch(['@submit'], { loading: true });
          store.patch(['@input'], { disabled: true });

          const values = store.values(['@input']) as Record<string, string>;
          const login = values.login ?? '';
          const password = values.password ?? '';

          sessionStore.setStatus('submitting');

          try {
            const user = await loginRequest({ login, password }, apiBase);
            succeedSubmit({ state, emit }, sessionStore, user);
          } catch (err) {
            const errorMessage = mapCredentialsError(err, strategy.invalidCredentialsMessage);
            failSubmit({ store, state, emit }, sessionStore, errorMessage, rawMessageOf(err));
          } finally {
            store.patch(['@submit'], { loading: false });
            store.patch(['@input'], { disabled: false });
          }
        },
      },

      authed: authedState(sessionStore),

      error: errorState,
    },
  }));

// ─── buildRegisterFeature: cookie-флоу register (login+password+confirm) ─────

const buildRegisterFeature = (sessionStore: IAuthSessionStore, apiBase?: string) =>
  Feature(() => ({
    initial: 'idle' as const,

    states: {
      idle: idleState,

      submitting: {
        onInit: async ({ store, state, emit }: IHandlerApi) => {
          const values = store.values(['@input']) as Record<string, string>;
          const login = values.login ?? '';
          const password = values.password ?? '';
          const confirm = values.confirm ?? '';

          // Клиентская проверка совпадения паролей — без сетевого запроса.
          if (password !== confirm) {
            failSubmit(
              { store, state, emit },
              sessionStore,
              'Пароли не совпадают',
              'passwords do not match',
            );
            return;
          }

          store.patch(['@submit'], { loading: true });
          store.patch(['@input'], { disabled: true });

          sessionStore.setStatus('submitting');

          try {
            // 201 + Set-Cookie: бэк аутентифицирует сразу при регистрации.
            const user = await registerRequest({ login, password }, apiBase);
            succeedSubmit({ state, emit }, sessionStore, user);
          } catch (err) {
            const errorMessage = mapCredentialsError(err);
            failSubmit({ store, state, emit }, sessionStore, errorMessage, rawMessageOf(err));
          } finally {
            store.patch(['@submit'], { loading: false });
            store.patch(['@input'], { disabled: false });
          }
        },
      },

      authed: authedState(sessionStore),

      error: errorState,
    },
  }));

// ─── Helpers для построения стратегии из props ────────────────────────────────

/**
 * Строит `IRoleStrategy` из discriminated-union props `type='role'`.
 * Это внутренняя деталь — апп передаёт только `roles` + опциональный `defaultRole`.
 */
const buildRoleStrategyFromProps = (
  props: Extract<IAuthLoginProps, { type: 'role' }>,
): IRoleStrategy => {
  // defaultRole переопределяет первую роль если задан
  const resolvedRoles = props.defaultRole
    ? [
        // defaultRole идёт первым чтобы стать дефолтным значением Select
        ...props.roles.filter((r) => r.value === props.defaultRole),
        ...props.roles.filter((r) => r.value !== props.defaultRole),
      ]
    : [...props.roles];

  return roleStrategy({
    roles: resolvedRoles,
    roleLabel: props.roleLabel,
    passwordLabel: props.passwordLabel,
  });
};

// ─── AuthLoginComponent ───────────────────────────────────────────────────────

const AuthLoginComponent = (props: IAuthLoginProps): JSX.Element => {
  const sessionStore = props.sessionStore ?? defaultAuthSession;

  if (props.type === 'role') {
    const strategy = buildRoleStrategyFromProps(props);

    // Feature(factory) вызывается при рендере — каждый <Auth.Login> instance
    // получает свой FSM-scope (своё замыкание buildRoleFeature).
    const AuthFsm = buildRoleFeature(strategy, sessionStore, 'role', 'password');

    return (
      <AuthFsm overrides={props.overrides}>
        {/* AuthLoginForm — web-core View, рендерится внутри Controller-scope.
            View-wrapper подхватывает AuthFsm-context через UiProxy автоматически:
            meta.tags биндятся в AuthFsm, а не в вызывающий апп-контекст.
            Если переданы children — рендерим их (кастомная форма аппа). */}
        {props.children ?? (
          <AuthLoginForm
            strategy={strategy}
            title={props.title}
            subtitle={props.subtitle}
            submitLabel={props.submitLabel}
            footerNote={props.footerNote}
          />
        )}
      </AuthFsm>
    );
  }

  if (props.type === 'credentials') {
    const strategy = credentialsStrategy({
      loginLabel: props.loginLabel,
      passwordLabel: props.passwordLabel,
    });
    const AuthFsm = buildCredentialsFeature(strategy, sessionStore, props.apiBase);

    return (
      <AuthFsm overrides={props.overrides}>
        {props.children ?? (
          <AuthLoginForm
            strategy={strategy}
            title={props.title}
            subtitle={props.subtitle}
            submitLabel={props.submitLabel}
            footerNote={props.footerNote}
          />
        )}
      </AuthFsm>
    );
  }

  if (props.type === 'oauth2') {
    // TODO: реализовать в следующей итерации (redirect/PKCE, provider config через props)
    throw new Error('[Auth.Login] strategy "oauth2" not implemented yet');
  }

  if (props.type === 'qr') {
    // TODO: реализовать в следующей итерации (QR polling, FSM шаг ожидания)
    throw new Error('[Auth.Login] strategy "qr" not implemented yet');
  }

  // Exhaustive check — TS narrowing гарантирует недостижимость
  const _exhaustive: never = props;
  throw new Error(
    `[Auth.Login] unknown strategy type: ${(_exhaustive as IAuthLoginProps & { type: string }).type}`,
  );
};

// ─── AuthRegisterComponent ────────────────────────────────────────────────────

const AuthRegisterComponent = (props: IAuthRegisterProps): JSX.Element => {
  const sessionStore = props.sessionStore ?? defaultAuthSession;
  const RegisterFsm = buildRegisterFeature(sessionStore, props.apiBase);

  // Форма регистрации — тот же config-driven AuthLoginForm: поля задаются
  // декларацией, не отдельной разметкой (login + password + confirm).
  const fields = [
    {
      tag: 'login',
      type: 'text' as const,
      label: props.loginLabel ?? 'Логин',
      placeholder: 'login',
    },
    {
      tag: 'password',
      type: 'password' as const,
      label: props.passwordLabel ?? 'Пароль',
      placeholder: '•••••••••',
    },
    {
      tag: 'confirm',
      type: 'password' as const,
      label: props.confirmLabel ?? 'Повторите пароль',
      placeholder: '•••••••••',
    },
  ];

  return (
    <RegisterFsm overrides={props.overrides}>
      {props.children ?? (
        <AuthLoginForm
          strategy={{ fields }}
          title={props.title ?? 'Регистрация'}
          subtitle={props.subtitle}
          submitLabel={props.submitLabel ?? 'Зарегистрироваться'}
          footerNote={props.footerNote}
        />
      )}
    </RegisterFsm>
  );
};

// ─── buildGateFeature: mode-FSM guest-блока (вход ↔ регистрация) ─────────────
//
// Один state 'guest'; режим — в context.data.mode (store.update), не в FSM-стейтах:
// пере-mount форм делает Show по реактивному mode, самим FSM-переходам тут нечего
// моделировать. Клики переключателя приходят meta-тегами to-register/to-login
// (AuthGateSwitch в Gate-scope); ВСЁ остальное прозрачно баблится наверх.

const buildGateFeature = (initialMode: AuthGateMode) =>
  Feature(() => ({
    initial: 'guest' as const,

    context: {
      mode: initialMode,
    },

    states: {
      guest: {
        // Чужие клики (из authed-фазы вложенных FSM и т.п.) отдаём next() —
        // Gate не должен глотать события между вложенными FSM и root-Feature аппа.
        onClick: ({ target, store, next }: IHandlerApi) => {
          const tags = (target.meta?.tags ?? []) as readonly string[];
          if (tags.includes('to-register')) {
            store.update({ mode: 'register' });
            return;
          }
          if (tags.includes('to-login')) {
            store.update({ mode: 'login' });
            return;
          }
          return next();
        },
      },
    },
  }));

// ─── AuthGateComponent ────────────────────────────────────────────────────────

/**
 * Тело Gate — отдельный компонент, потому что реактивный mode читается через
 * `useCtx()` и требует рендера ВНУТРИ Gate-FSM scope (children `<GateFsm>`
 * evaluate'ятся под Context.Provider — как AuthLoginForm внутри AuthFsm).
 *
 * Show пере-mount'ит форму при переключении: каждая фаза получает свежий
 * FSM-instance (idle, без остаточной ошибки/loading) — это желаемое поведение.
 */
const AuthGateBody = (props: IAuthGateProps): JSX.Element => {
  const ctx = useCtx();
  const mode = () =>
    (ctx?.store?.ctx?.data?.mode as AuthGateMode | undefined) ?? props.initialMode ?? 'login';

  return (
    <>
      <Show
        when={mode() === 'register'}
        fallback={
          <AuthLoginComponent
            type="credentials"
            apiBase={props.apiBase}
            sessionStore={props.sessionStore}
            title={props.login?.title ?? props.title}
            subtitle={props.login?.subtitle ?? props.subtitle}
            submitLabel={props.login?.submitLabel}
            footerNote={props.login?.footerNote ?? props.footerNote}
            loginLabel={props.login?.loginLabel}
            passwordLabel={props.login?.passwordLabel}
          />
        }
      >
        <AuthRegisterComponent
          apiBase={props.apiBase}
          sessionStore={props.sessionStore}
          title={props.register?.title ?? props.title}
          subtitle={props.register?.subtitle ?? props.subtitle}
          submitLabel={props.register?.submitLabel}
          footerNote={props.register?.footerNote ?? props.footerNote}
          loginLabel={props.register?.loginLabel}
          passwordLabel={props.register?.passwordLabel}
          confirmLabel={props.register?.confirmLabel}
        />
      </Show>
      <AuthGateSwitch toRegisterLabel={props.toRegisterLabel} toLoginLabel={props.toLoginLabel} />
    </>
  );
};

const AuthGateComponent = (props: IAuthGateProps): JSX.Element => {
  const GateFsm = buildGateFeature(props.initialMode ?? 'login');

  return (
    <GateFsm overrides={props.overrides}>
      <AuthGateBody {...props} />
    </GateFsm>
  );
};

// ─── Публичные блоки с phantom __events ──────────────────────────────────────

/**
 * Auth.Login — connected component: Controller-scope (auth-FSM) + форма.
 *
 * Props: discriminated union по `type` (`IAuthLoginProps`).
 *
 * ```tsx
 * <Auth.Login type="credentials" title="Вход" />
 * ```
 *
 * Несёт phantom `__events?: IAuthEvents` для типизации:
 *   `Feature<EventsOf<typeof Auth.Login>>` → `target.payload` типизирован.
 *
 * v2: `onLogin.payload = { user }` — БЕЗ token (httpOnly-кука, ADR 068 D3).
 */
export const AuthLogin: ((props: IAuthLoginProps) => JSX.Element) & {
  readonly __events?: IAuthEvents;
} = AuthLoginComponent;

/**
 * Auth.Register — connected component: регистрация (login+password+confirm).
 *
 * `POST /auth/register` → 201 + Set-Cookie: пользователь аутентифицирован
 * сразу, при успехе эмиттится `onLogin { user }`.
 *
 * ```tsx
 * <Auth.Register title="Регистрация" />
 * ```
 */
export const AuthRegister: ((props: IAuthRegisterProps) => JSX.Element) & {
  readonly __events?: IAuthEvents;
} = AuthRegisterComponent;

/**
 * Auth.Gate — готовый guest-блок: Login-форма ↔ Register-форма + переключатель.
 *
 * Mode-стейт ВНУТРИ блока (Gate-FSM context.data.mode) — апп монтирует один
 * компонент вместо самодельного switch-mode. Только credentials-флоу (cookie).
 *
 * ```tsx
 * <Auth.Gate title="Capsule ID" footerNote="© Capsule" />
 * ```
 *
 * События вложенных форм (`onLogin`/`onLogout`/`onLoginError`) баблятся сквозь
 * Gate БЕЗ изменений (auto-bubble ControllerProxy: у Gate-схемы нет их хендлеров),
 * поэтому phantom `__events` тот же `IAuthEvents`.
 */
export const AuthGate: ((props: IAuthGateProps) => JSX.Element) & {
  readonly __events?: IAuthEvents;
} = AuthGateComponent;

export default AuthLogin;

// Re-export для удобства потребителей /controllers
export type { IAuthEvents, IAuthGateProps, IAuthLoginProps, IAuthRegisterProps } from '../types';

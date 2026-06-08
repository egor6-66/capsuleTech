/**
 * @capsuletech/web-auth/controllers — Auth.Login connected component (ADR 032).
 *
 * Единственный subpath с зависимостью на `@capsuletech/web-core`.
 *
 * `AuthLogin` — Tier 2 connected block: создаёт Controller-scope (web-core Controller
 * wrapper) с FSM `idle → submitting → authed/error` и рендерит форму внутри своего scope.
 *
 * Submit-канал: стандартный UiProxy meta-tags path:
 *   AuthLoginForm → <Button meta={{ tags: ['submit'] }}> → onClick → ControllerProxy dispatch.
 *
 * Emit-канал: `emit` из handler-API (`IHandlerApi.emit`), доступен в каждом хендлере
 * включая async lifecycle (`onInit`). НЕ использует `useEmit`/EmitProbe — это старый паттерн.
 *
 * Регистрируется в capsule.ts как `components: { Login: AuthLogin }`.
 *
 * Phantom `__events?: IAuthEvents` → app-DX:
 *   Feature<EventsOf<typeof Auth.Login>>(({ router }) => ({
 *     onLogin: ({ target }) => { router.goTo('/'); },
 *     onLoginError: ({ target }) => { ... },
 *   }));
 *
 * Props-контракт: discriminated union по `type` (IAuthLoginProps из types.ts).
 * Апп передаёт только данные-пропсы — никаких импортов билдеров стратегий:
 *
 *   <Auth.Login
 *     type="role"
 *     roles={[{ value: 'developer', label: 'Developer' }]}
 *     title="Вход"
 *   />
 *
 * Стратегия строится ВНУТРИ компонента из пропов (инверсия зависимости).
 * `roleStrategy` — внутренняя деталь реализации (экспорт из /role остаётся
 * для advanced-кейсов, но Auth.Login его не требует).
 */

import type { IHandlerApi } from '@capsuletech/web-core';
import { Feature } from '@capsuletech/web-core';
import type { JSX } from 'solid-js';
import type { IRoleStrategy } from '../role/index';
import { roleStrategy } from '../role/index';
import { defaultAuthSession, type IAuthSessionStore } from '../session/index';
import type { IAuthEvents, IAuthLoginProps, IAuthUser } from '../types';
import { AuthLoginForm } from '../ui/loginForm';

// ─── buildAuthFeature: строит Feature-компонент с auth-FSM ───────────────────
//
// IO (api.auth.login) требует Feature, а не Controller — api инжектится
// web-core'ом ТОЛЬКО в Feature (по контракту IServices; Controller получает
// только router/store/state, но не api). Controller без api → undefined → ошибка.

/**
 * Строит Feature-компонент с auth-FSM.
 * Параметризован стратегией и session-store через замыкание.
 * Вызывается при рендере AuthLoginComponent — один раз на instance.
 */
const buildAuthFeature = (
  strategy: IRoleStrategy,
  sessionStore: IAuthSessionStore,
  roleTag: string,
  passwordTag: string,
) =>
  Feature(({ api }) => ({
    initial: 'idle' as const,

    states: {
      idle: {
        onClick: ({ target, state }: IHandlerApi) => {
          const tags = (target.meta?.tags ?? []) as readonly string[];
          if (tags.includes('submit')) state.set('submitting');
        },
      },

      submitting: {
        onInit: async ({ store, state, emit }: IHandlerApi) => {
          if (!api) {
            console.error('[Auth.Login] api client not initialized');
            sessionStore.setStatus('error');
            state.set('error');
            emit('onLoginError', { payload: { message: 'API not initialized' } });
            return;
          }

          store.patch(['@submit'], { loading: true });
          store.patch(['@input'], { disabled: true });

          const values = store.values(['@input']) as Record<string, string>;
          const roleValue = values[roleTag] ?? strategy.defaults?.role ?? '';
          const passwordValue = values[passwordTag] ?? '';

          sessionStore.setStatus('submitting');

          try {
            const result = await (
              api as {
                auth: {
                  login: (input: {
                    role: string;
                    password: string;
                  }) => Promise<{ token: string; role: string; user?: IAuthUser }>;
                };
              }
            ).auth.login({
              role: roleValue,
              password: passwordValue,
            });

            const user: IAuthUser = result.user ?? { role: result.role };
            sessionStore.login(result.token, user);
            state.set('authed');

            emit('onLogin', { payload: { token: result.token, user } });
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            sessionStore.setStatus('error');
            state.set('error');
            emit('onLoginError', { payload: { message } });
          } finally {
            store.patch(['@submit'], { loading: false });
            store.patch(['@input'], { disabled: false });
          }
        },
      },

      authed: {
        onLogout: ({ state, emit }: IHandlerApi) => {
          sessionStore.logout();
          state.set('idle');
          emit('onLogout', {});
        },
      },

      error: {
        onClick: ({ target, state }: IHandlerApi) => {
          const tags = (target.meta?.tags ?? []) as readonly string[];
          if (tags.includes('submit')) state.set('idle');
        },
      },
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
    const roleTag = 'role';
    const passwordTag = 'password';

    // Feature(factory) вызывается при рендере — каждый <Auth.Login> instance
    // получает свой FSM-scope (своё замыкание buildAuthFeature).
    // Feature используется потому что onInit вызывает api.auth.login (IO).
    const AuthFsm = buildAuthFeature(strategy, sessionStore, roleTag, passwordTag);

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
    // TODO: реализовать в следующей итерации
    throw new Error('[Auth.Login] strategy "credentials" not implemented yet');
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

// ─── Публичный AuthLogin с phantom __events ────────────────────────────────────

/**
 * Auth.Login — connected component: Controller-scope (auth-FSM) + форма.
 *
 * Props: discriminated union по `type` (`IAuthLoginProps`).
 * Апп передаёт только данные — никаких импортов билдеров стратегий:
 *
 * ```tsx
 * <Auth.Login
 *   type="role"
 *   roles={[{ value: 'developer', label: 'Developer' }, { value: 'support', label: 'Support' }]}
 *   title="Вход"
 * />
 * ```
 *
 * Несёт phantom `__events?: IAuthEvents` для типизации:
 *   `Feature<EventsOf<typeof Auth.Login>>` → `target.payload` типизирован.
 *
 * Пример app DX:
 * ```ts
 * // В app feature (ловит именованное событие):
 * const AuthFeature = Feature<EventsOf<typeof Auth.Login>>(({ router }) => ({
 *   onLogin: ({ target }) => {
 *     // target.payload: { token: string; user: IAuthUser }
 *     router.goTo('/dashboard');
 *   },
 *   onLoginError: ({ target }) => {
 *     // target.payload: { message: string }
 *   },
 * }));
 * ```
 */
export const AuthLogin: ((props: IAuthLoginProps) => JSX.Element) & {
  readonly __events?: IAuthEvents;
} = AuthLoginComponent;

export default AuthLogin;

// Re-export для удобства потребителей /controllers
export type { IAuthEvents, IAuthLoginProps } from '../types';

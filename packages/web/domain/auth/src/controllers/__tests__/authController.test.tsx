/**
 * Auth.Login / Auth.Register — тесты FSM-переходов + emit именованных событий (v2).
 *
 * Контракт:
 *  1. Phantom __events присутствует как тип (undefined в runtime).
 *  2. onLogin emit несёт { user } — БЕЗ token (session v2 cookie-first).
 *  3. onLoginError emit несёт rawMessage; форма получает дружелюбный текст.
 *  4. FSM начинается в состоянии 'idle'; idle.onClick(submit) → submitting;
 *     error.* → clear-on-interaction; authed.onLogout → сброс.
 *  5. role-арм (legacy mock): IO через services.api.auth.login, token ответа
 *     ИГНОРИРУЕТСЯ.
 *  6. credentials-арм (cookie): IO через loginRequest HTTP-клиента пакета,
 *     типизированный маппинг ошибок (401/сеть).
 *  7. Auth.Register: confirm-валидация без сети, 409 → «Логин уже занят»,
 *     успех → session.login(user) + emit onLogin.
 *
 * Стратегия мокирования:
 *  - Feature (web-core): захватываем schema для прямого вызова handlers.
 *  - role-IO: services.api.auth.login → vi.fn.
 *  - credentials-IO: vi.mock('../../api/client') — loginRequest/registerRequest
 *    мокаются, error-классы остаются реальными (typed mapping).
 */

/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Мок api клиента (role-арм, app-endpoint) ────────────────────────────────

const mockLogin = vi.fn();

vi.mock('@capsuletech/web-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-query')>();
  return {
    ...actual,
    getApiClient: () => ({
      auth: { login: mockLogin },
    }),
  };
});

// ─── Мок HTTP-клиента пакета (credentials-арм) ───────────────────────────────

const mockLoginRequest = vi.fn();
const mockRegisterRequest = vi.fn();

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    loginRequest: (...args: unknown[]) => mockLoginRequest(...args),
    registerRequest: (...args: unknown[]) => mockRegisterRequest(...args),
  };
});

// ─── Мок web-core ─────────────────────────────────────────────────────────────

let capturedSchema: any = null;

vi.mock('@capsuletech/web-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-core')>();
  return {
    ...actual,
    // Feature: захватываем schema + передаём api в services (Feature получает api,
    // Controller — нет; именно поэтому auth-FSM строится через Feature).
    // emit передаётся в каждый handler через handler-API (IHandlerApi.emit).
    Feature: (factory: (services: any) => any) => {
      return (props: any) => {
        const services = {
          router: { goTo: vi.fn() },
          api: { auth: { login: mockLogin } },
        };
        capturedSchema = factory(services);
        return props.children;
      };
    },
    // useCtx: mock для компонентов внутри Feature-scope.
    useCtx: () => ({ controller: {}, store: {}, state: {} }),
  };
});

// ─── Импорт после мока ────────────────────────────────────────────────────────

import { render } from 'solid-js/web';
import { InvalidCredentialsError, LoginTakenError } from '../../api/client';
import { createAuthSession } from '../../session/index';
import { AuthLogin, AuthRegister } from '../index';

// ─── Фикстуры ─────────────────────────────────────────────────────────────────

/** Тестовые роли — передаются как props (ноль импортов билдера стратегии). */
const testRoles = [
  { value: 'developer', label: 'Developer' },
  { value: 'support', label: 'Support' },
];

const USER = { id: 1, login: 'alice', role: 'user' };

const makeStore = (values: Record<string, string> = {}) => ({
  patch: vi.fn(),
  update: vi.fn(),
  values: vi.fn().mockReturnValue(values),
});

// ─── Setup/teardown ───────────────────────────────────────────────────────────

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  mockLogin.mockReset();
  mockLoginRequest.mockReset();
  mockRegisterRequest.mockReset();
  capturedSchema = null;
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

// ─── Тесты — структура ────────────────────────────────────────────────────────

describe('Auth.Login — структура', () => {
  it('монтируется без ошибок (type=role)', () => {
    expect(() => {
      cleanup = render(
        () => (
          <AuthLogin type="role" roles={testRoles}>
            <div data-testid="child">form</div>
          </AuthLogin>
        ),
        container,
      );
    }).not.toThrow();
  });

  it('монтируется без ошибок (type=credentials)', () => {
    expect(() => {
      cleanup = render(
        () => (
          <AuthLogin type="credentials">
            <div data-testid="child">form</div>
          </AuthLogin>
        ),
        container,
      );
    }).not.toThrow();
  });

  it('children рендерятся внутри Controller-scope', () => {
    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles}>
          <div data-testid="login-form">form</div>
        </AuthLogin>
      ),
      container,
    );
    expect(container.querySelector('[data-testid="login-form"]')).not.toBeNull();
  });

  it('phantom __events = undefined (runtime)', () => {
    expect((AuthLogin as any).__events).toBeUndefined();
    expect((AuthRegister as any).__events).toBeUndefined();
  });
});

// ─── Тесты — discriminated union type prop ─────────────────────────────────────

describe('Auth.Login — discriminated union', () => {
  it('type="oauth2" бросает not-implemented (stub)', () => {
    expect(() => {
      render(() => <AuthLogin type="oauth2" />, container);
    }).toThrow('not implemented yet');
  });

  it('type="qr" бросает not-implemented (stub)', () => {
    expect(() => {
      render(() => <AuthLogin type="qr" />, container);
    }).toThrow('not implemented yet');
  });
});

// ─── Тесты — FSM schema (общая механика, role-арм) ────────────────────────────

describe('Auth.Login — FSM schema', () => {
  it('initial state = "idle"', () => {
    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles}>
          <div />
        </AuthLogin>
      ),
      container,
    );
    expect(capturedSchema?.initial).toBe('idle');
  });

  it('schema содержит states: idle, submitting, authed, error', () => {
    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles}>
          <div />
        </AuthLogin>
      ),
      container,
    );
    const stateNames = Object.keys(capturedSchema?.states ?? {});
    expect(stateNames).toContain('idle');
    expect(stateNames).toContain('submitting');
    expect(stateNames).toContain('authed');
    expect(stateNames).toContain('error');
  });

  it('idle.onClick с тегом "submit" → state.set("submitting")', () => {
    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockState = { set: vi.fn() };
    capturedSchema.states.idle.onClick({
      target: { meta: { tags: ['submit'] } },
      state: mockState,
      store: makeStore(),
      emit: vi.fn(),
    });

    expect(mockState.set).toHaveBeenCalledWith('submitting');
  });

  it('idle.onClick с другим тегом → НЕ переходит в submitting', () => {
    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockState = { set: vi.fn() };
    capturedSchema.states.idle.onClick({
      target: { meta: { tags: ['role'] } },
      state: mockState,
      store: makeStore(),
      emit: vi.fn(),
    });

    expect(mockState.set).not.toHaveBeenCalled();
  });

  it('error.onClick с тегом "submit" → state.set("idle") + errorMessage="" (retry)', () => {
    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockState = { set: vi.fn() };
    const mockStore = makeStore();
    capturedSchema.states.error.onClick({
      target: { meta: { tags: ['submit'] } },
      state: mockState,
      store: mockStore,
      emit: vi.fn(),
    });

    expect(mockState.set).toHaveBeenCalledWith('idle');
    expect(mockStore.update).toHaveBeenCalledWith({ errorMessage: '' });
  });

  it('error.onInput → state.set("idle") + errorMessage="" (clear-on-input)', () => {
    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockState = { set: vi.fn() };
    const mockStore = makeStore();
    capturedSchema.states.error.onInput({
      target: {},
      state: mockState,
      store: mockStore,
      emit: vi.fn(),
    });

    expect(mockState.set).toHaveBeenCalledWith('idle');
    expect(mockStore.update).toHaveBeenCalledWith({ errorMessage: '' });
  });

  it('error.onChange → state.set("idle") + errorMessage="" (clear-on-change для Select)', () => {
    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockState = { set: vi.fn() };
    const mockStore = makeStore();
    capturedSchema.states.error.onChange({
      target: {},
      state: mockState,
      store: mockStore,
      emit: vi.fn(),
    });

    expect(mockState.set).toHaveBeenCalledWith('idle');
    expect(mockStore.update).toHaveBeenCalledWith({ errorMessage: '' });
  });
});

// ─── Тесты — role-арм (legacy mock): onLogin без token ────────────────────────

describe('Auth.Login role — onLogin emit (v2)', () => {
  it('успешный login → emit("onLogin") с { user }, БЕЗ token; token мока игнорируется', async () => {
    mockLogin.mockResolvedValue({ token: 'jwt-test', role: 'developer' });

    const sessionStore = createAuthSession();

    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles} sessionStore={sessionStore}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockEmit = vi.fn();
    const mockState = { set: vi.fn() };

    await capturedSchema.states.submitting.onInit({
      store: makeStore({ role: 'developer', password: '123' }),
      state: mockState,
      emit: mockEmit,
    });

    expect(mockEmit).toHaveBeenCalledWith(
      'onLogin',
      expect.objectContaining({
        payload: { user: { role: 'developer' } },
      }),
    );
    // token НЕ попадает ни в payload, ни в session (v2 cookie-first)
    const payload = mockEmit.mock.calls.find((c) => c[0] === 'onLogin')?.[1]?.payload;
    expect(payload).not.toHaveProperty('token');

    expect(mockState.set).toHaveBeenCalledWith('authed');
    expect(sessionStore.session.user).toEqual({ role: 'developer' });
    expect(sessionStore.session.status).toBe('authed');
    expect('token' in sessionStore.session).toBe(false);
  });

  it('api.auth.login получает роль и пароль из form-values', async () => {
    mockLogin.mockResolvedValue({ token: 'jwt-abc', role: 'support' });
    const sessionStore = createAuthSession();

    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles} sessionStore={sessionStore}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    await capturedSchema.states.submitting.onInit({
      store: makeStore({ role: 'support', password: 'secret' }),
      state: { set: vi.fn() },
      emit: vi.fn(),
    });

    expect(mockLogin).toHaveBeenCalledWith({ role: 'support', password: 'secret' });
  });
});

describe('Auth.Login role — onLoginError emit', () => {
  it('ошибка login → emit rawMessage + форма «Неверный пароль» (role без поля логин)', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid password'));
    const sessionStore = createAuthSession();

    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles} sessionStore={sessionStore}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockEmit = vi.fn();
    const mockStore = makeStore({ role: 'developer', password: 'wrong' });
    const mockState = { set: vi.fn() };

    await capturedSchema.states.submitting.onInit({
      store: mockStore,
      state: mockState,
      emit: mockEmit,
    });

    expect(mockEmit).toHaveBeenCalledWith(
      'onLoginError',
      expect.objectContaining({
        payload: expect.objectContaining({ message: 'Invalid password' }),
      }),
    );
    expect(mockStore.update).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Неверный пароль' }),
    );
    expect(mockState.set).toHaveBeenCalledWith('error');
    expect(sessionStore.session.status).toBe('error');
  });

  it('сетевая ошибка → «Не удалось подключиться к серверу»', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));
    const sessionStore = createAuthSession();

    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles} sessionStore={sessionStore}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockStore = makeStore({ role: 'developer', password: '' });

    await capturedSchema.states.submitting.onInit({
      store: mockStore,
      state: { set: vi.fn() },
      emit: vi.fn(),
    });

    expect(mockStore.update).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Не удалось подключиться к серверу' }),
    );
  });

  it('неизвестная ошибка → дефолт «Не удалось войти. Попробуйте ещё раз.»', async () => {
    mockLogin.mockRejectedValue(new Error('Unexpected server malfunction'));
    const sessionStore = createAuthSession();

    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles} sessionStore={sessionStore}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockStore = makeStore({ role: 'developer', password: '' });

    await capturedSchema.states.submitting.onInit({
      store: mockStore,
      state: { set: vi.fn() },
      emit: vi.fn(),
    });

    expect(mockStore.update).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Не удалось войти. Попробуйте ещё раз.' }),
    );
  });
});

// ─── Тесты — credentials-арм (cookie-флоу) ────────────────────────────────────

describe('Auth.Login credentials — cookie-флоу', () => {
  const renderCredentials = (
    sessionStore: ReturnType<typeof createAuthSession>,
    apiBase?: string,
  ) => {
    cleanup = render(
      () => (
        <AuthLogin type="credentials" sessionStore={sessionStore} apiBase={apiBase}>
          <div />
        </AuthLogin>
      ),
      container,
    );
  };

  it('успешный login → loginRequest({login,password}, apiBase) + session.login(user) + emit onLogin', async () => {
    mockLoginRequest.mockResolvedValue(USER);
    const sessionStore = createAuthSession();
    renderCredentials(sessionStore, '/gateway');

    const mockEmit = vi.fn();
    const mockState = { set: vi.fn() };

    await capturedSchema.states.submitting.onInit({
      store: makeStore({ login: 'alice', password: 'secret123' }),
      state: mockState,
      emit: mockEmit,
    });

    expect(mockLoginRequest).toHaveBeenCalledWith(
      { login: 'alice', password: 'secret123' },
      '/gateway',
    );
    expect(sessionStore.session.user).toEqual(USER);
    expect(sessionStore.session.status).toBe('authed');
    expect(mockState.set).toHaveBeenCalledWith('authed');
    expect(mockEmit).toHaveBeenCalledWith(
      'onLogin',
      expect.objectContaining({ payload: { user: USER } }),
    );
  });

  it('401 (InvalidCredentialsError) → «Неверный логин или пароль»', async () => {
    mockLoginRequest.mockRejectedValue(new InvalidCredentialsError());
    const sessionStore = createAuthSession();
    renderCredentials(sessionStore);

    const mockStore = makeStore({ login: 'alice', password: 'wrong' });
    const mockEmit = vi.fn();

    await capturedSchema.states.submitting.onInit({
      store: mockStore,
      state: { set: vi.fn() },
      emit: mockEmit,
    });

    expect(mockStore.update).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Неверный логин или пароль' }),
    );
    expect(mockEmit).toHaveBeenCalledWith(
      'onLoginError',
      expect.objectContaining({
        payload: expect.objectContaining({ message: 'invalid credentials' }),
      }),
    );
    expect(sessionStore.session.status).toBe('error');
  });

  it('network-failure (TypeError) → «Не удалось подключиться к серверу»', async () => {
    mockLoginRequest.mockRejectedValue(new TypeError('Failed to fetch'));
    const sessionStore = createAuthSession();
    renderCredentials(sessionStore);

    const mockStore = makeStore({ login: 'alice', password: 'x' });

    await capturedSchema.states.submitting.onInit({
      store: mockStore,
      state: { set: vi.fn() },
      emit: vi.fn(),
    });

    expect(mockStore.update).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Не удалось подключиться к серверу' }),
    );
  });

  it('loading-стейт: @submit loading + @input disabled на время запроса', async () => {
    mockLoginRequest.mockResolvedValue(USER);
    const sessionStore = createAuthSession();
    renderCredentials(sessionStore);

    const mockStore = makeStore({ login: 'alice', password: 'secret123' });

    await capturedSchema.states.submitting.onInit({
      store: mockStore,
      state: { set: vi.fn() },
      emit: vi.fn(),
    });

    expect(mockStore.patch).toHaveBeenCalledWith(['@submit'], { loading: true });
    expect(mockStore.patch).toHaveBeenCalledWith(['@input'], { disabled: true });
    expect(mockStore.patch).toHaveBeenCalledWith(['@submit'], { loading: false });
    expect(mockStore.patch).toHaveBeenCalledWith(['@input'], { disabled: false });
  });
});

// ─── Тесты — Auth.Register ────────────────────────────────────────────────────

describe('Auth.Register — cookie-флоу', () => {
  const renderRegister = (sessionStore: ReturnType<typeof createAuthSession>, apiBase?: string) => {
    cleanup = render(
      () => (
        <AuthRegister sessionStore={sessionStore} apiBase={apiBase}>
          <div />
        </AuthRegister>
      ),
      container,
    );
  };

  it('пароли не совпадают → ошибка БЕЗ сетевого запроса', async () => {
    const sessionStore = createAuthSession();
    renderRegister(sessionStore);

    const mockStore = makeStore({ login: 'alice', password: 'secret123', confirm: 'other' });
    const mockState = { set: vi.fn() };
    const mockEmit = vi.fn();

    await capturedSchema.states.submitting.onInit({
      store: mockStore,
      state: mockState,
      emit: mockEmit,
    });

    expect(mockRegisterRequest).not.toHaveBeenCalled();
    expect(mockStore.update).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Пароли не совпадают' }),
    );
    expect(mockState.set).toHaveBeenCalledWith('error');
    expect(mockEmit).toHaveBeenCalledWith(
      'onLoginError',
      expect.objectContaining({
        payload: expect.objectContaining({ message: 'passwords do not match' }),
      }),
    );
  });

  it('успешная регистрация → registerRequest + session.login(user) + emit onLogin', async () => {
    mockRegisterRequest.mockResolvedValue(USER);
    const sessionStore = createAuthSession();
    renderRegister(sessionStore, '/api');

    const mockEmit = vi.fn();
    const mockState = { set: vi.fn() };

    await capturedSchema.states.submitting.onInit({
      store: makeStore({ login: 'alice', password: 'secret123', confirm: 'secret123' }),
      state: mockState,
      emit: mockEmit,
    });

    expect(mockRegisterRequest).toHaveBeenCalledWith(
      { login: 'alice', password: 'secret123' },
      '/api',
    );
    expect(sessionStore.session.user).toEqual(USER);
    expect(sessionStore.session.status).toBe('authed');
    expect(mockEmit).toHaveBeenCalledWith(
      'onLogin',
      expect.objectContaining({ payload: { user: USER } }),
    );
  });

  it('409 (LoginTakenError) → «Логин уже занят»', async () => {
    mockRegisterRequest.mockRejectedValue(new LoginTakenError());
    const sessionStore = createAuthSession();
    renderRegister(sessionStore);

    const mockStore = makeStore({ login: 'taken', password: 'secret123', confirm: 'secret123' });

    await capturedSchema.states.submitting.onInit({
      store: mockStore,
      state: { set: vi.fn() },
      emit: vi.fn(),
    });

    expect(mockStore.update).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: 'Логин уже занят' }),
    );
    expect(sessionStore.session.status).toBe('error');
  });
});

// ─── Тесты — onLogout ─────────────────────────────────────────────────────────

describe('Auth.Login — onLogout', () => {
  it('authed.onLogout → emit("onLogout") + сессия сброшена + state=idle', () => {
    const sessionStore = createAuthSession();
    sessionStore.login({ role: 'developer' });

    cleanup = render(
      () => (
        <AuthLogin type="role" roles={testRoles} sessionStore={sessionStore}>
          <div />
        </AuthLogin>
      ),
      container,
    );

    const mockEmit = vi.fn();
    const mockState = { set: vi.fn() };

    capturedSchema.states.authed.onLogout({
      target: {},
      state: mockState,
      emit: mockEmit,
    });

    expect(mockEmit).toHaveBeenCalledWith('onLogout', {});
    expect(mockState.set).toHaveBeenCalledWith('idle');
    expect(sessionStore.session.user).toBeNull();
    expect(sessionStore.session.status).toBe('idle');
  });
});

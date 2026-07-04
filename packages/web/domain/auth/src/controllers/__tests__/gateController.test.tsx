/**
 * Auth.Gate — тесты guest-блока «формы + переключение вход↔регистрация».
 *
 * Контракт (бриф auth-gate-block-switchmode):
 *  1. Render обеих фаз: mode 'login' → Login-форма (login+password),
 *     mode 'register' → Register-форма (login+password+confirm); переключатель
 *     (AuthGateSwitch) — всегда под формой.
 *  2. Переключение: Gate-FSM guest.onClick по тегам to-register/to-login →
 *     store.update({ mode }); реактивный mode из context.data пере-mount'ит форму.
 *  3. Emit прозрачен: у Gate-схемы НЕТ хендлеров onLogin/onLogout/onLoginError
 *     (ни top-level, ни в states) → ControllerProxy auto-bubble несёт события
 *     вложенных форм наверх без изменений; чужие клики Gate отдаёт next().
 *  4. Branding: общие title/subtitle/footerNote форвардятся в обе формы;
 *     точечные login/register-секции перекрывают общие.
 *
 * Стратегия мокирования — как в authController.test:
 *  - Feature (web-core): захват ВСЕХ schema (Gate + вложенные формы) в массив.
 *  - useCtx: управляемый reactive-контекст (createMutable) — проверка
 *    реактивного переключения фаз.
 *  - ui/loginForm + ui/gateSwitch: маркер-div'ы с data-атрибутами props
 *    (реальный рендер web-ui — вне скоупа schema-тестов, канон файла).
 *  - api/client: loginRequest — мок (emit-прозрачность + apiBase-форвардинг).
 */

/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Захват schema всех Feature-инстансов (Gate + вложенные формы) ────────────

const capturedSchemas: any[] = [];

/** Реактивный context.data мокнутого useCtx — переназначается в beforeEach. */
let mockCtxData: Record<string, unknown>;

vi.mock('@capsuletech/web-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-core')>();
  return {
    ...actual,
    Feature: (factory: (services: any) => any) => {
      return (props: any) => {
        capturedSchemas.push(factory({ router: { goTo: vi.fn() } }));
        return props.children;
      };
    },
    useCtx: () => ({ controller: {}, store: { ctx: { data: mockCtxData } }, state: {} }),
  };
});

// ─── Маркеры вместо web-ui рендера ────────────────────────────────────────────

vi.mock('../../ui/loginForm', () => ({
  AuthLoginForm: (props: any) => (
    <div
      data-testid="auth-form"
      data-fields={(props.strategy?.fields ?? []).map((f: any) => f.tag).join(',')}
      data-title={props.title ?? ''}
      data-subtitle={props.subtitle ?? ''}
      data-submit={props.submitLabel ?? ''}
      data-footer={props.footerNote ?? ''}
    />
  ),
}));

vi.mock('../../ui/gateSwitch', () => ({
  AuthGateSwitch: (props: any) => (
    <div
      data-testid="gate-switch"
      data-to-register={props.toRegisterLabel ?? ''}
      data-to-login={props.toLoginLabel ?? ''}
    />
  ),
}));

// ─── Мок HTTP-клиента (emit-прозрачность + apiBase) ──────────────────────────

const mockLoginRequest = vi.fn();

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    loginRequest: (...args: unknown[]) => mockLoginRequest(...args),
  };
});

// ─── Импорт после моков ───────────────────────────────────────────────────────

import { createMutable } from 'solid-js/store';
import { render } from 'solid-js/web';
import { createAuthSession } from '../../session/index';
import { AuthGate } from '../index';

// ─── Фикстуры ─────────────────────────────────────────────────────────────────

const USER = { id: 1, login: 'alice', role: 'user' };

const makeStore = (values: Record<string, string> = {}) => ({
  patch: vi.fn(),
  update: vi.fn(),
  values: vi.fn().mockReturnValue(values),
});

const gateSchema = () => capturedSchemas.find((s) => s?.initial === 'guest');
/** Вложенная форм-FSM (login/register) — единственная схема с initial 'idle'. */
const formSchema = () => capturedSchemas.find((s) => s?.initial === 'idle');

const form = () => container.querySelector('[data-testid="auth-form"]') as HTMLElement | null;

// ─── Setup/teardown ───────────────────────────────────────────────────────────

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  mockLoginRequest.mockReset();
  capturedSchemas.length = 0;
  mockCtxData = createMutable<Record<string, unknown>>({});
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

// ─── Тесты — render обеих фаз ─────────────────────────────────────────────────

describe('Auth.Gate — render фаз', () => {
  it('дефолт: mode "login" → Login-форма (login,password) + переключатель под ней', () => {
    cleanup = render(() => <AuthGate />, container);

    expect(form()?.getAttribute('data-fields')).toBe('login,password');
    expect(container.querySelector('[data-testid="gate-switch"]')).not.toBeNull();
  });

  it('initialMode="register" → Register-форма (login,password,confirm)', () => {
    mockCtxData = createMutable<Record<string, unknown>>({ mode: 'register' });
    cleanup = render(() => <AuthGate initialMode="register" />, container);

    expect(form()?.getAttribute('data-fields')).toBe('login,password,confirm');
    expect(container.querySelector('[data-testid="gate-switch"]')).not.toBeNull();
  });

  it('phantom __events = undefined (runtime)', () => {
    expect((AuthGate as any).__events).toBeUndefined();
  });

  it('тексты переключателя форвардятся в AuthGateSwitch', () => {
    cleanup = render(
      () => <AuthGate toRegisterLabel="Создать аккаунт" toLoginLabel="Уже с нами?" />,
      container,
    );

    const sw = container.querySelector('[data-testid="gate-switch"]');
    expect(sw?.getAttribute('data-to-register')).toBe('Создать аккаунт');
    expect(sw?.getAttribute('data-to-login')).toBe('Уже с нами?');
  });
});

// ─── Тесты — переключение ─────────────────────────────────────────────────────

describe('Auth.Gate — переключение', () => {
  it('реактивный mode из context.data пере-mount-ит форму: login → register → login', () => {
    mockCtxData = createMutable<Record<string, unknown>>({ mode: 'login' });
    cleanup = render(() => <AuthGate />, container);

    expect(form()?.getAttribute('data-fields')).toBe('login,password');

    mockCtxData.mode = 'register';
    expect(form()?.getAttribute('data-fields')).toBe('login,password,confirm');

    mockCtxData.mode = 'login';
    expect(form()?.getAttribute('data-fields')).toBe('login,password');
  });

  it('guest.onClick тег "to-register" → store.update({ mode: "register" }), БЕЗ next', () => {
    cleanup = render(() => <AuthGate />, container);

    const mockStore = makeStore();
    const mockNext = vi.fn();
    gateSchema().states.guest.onClick({
      target: { meta: { tags: ['to-register'] } },
      store: mockStore,
      next: mockNext,
    });

    expect(mockStore.update).toHaveBeenCalledWith({ mode: 'register' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('guest.onClick тег "to-login" → store.update({ mode: "login" })', () => {
    cleanup = render(() => <AuthGate />, container);

    const mockStore = makeStore();
    gateSchema().states.guest.onClick({
      target: { meta: { tags: ['to-login'] } },
      store: mockStore,
      next: vi.fn(),
    });

    expect(mockStore.update).toHaveBeenCalledWith({ mode: 'login' });
  });

  it('context.mode стартует из initialMode', () => {
    cleanup = render(() => <AuthGate initialMode="register" />, container);
    expect(gateSchema().context.mode).toBe('register');
  });
});

// ─── Тесты — прозрачность (события/клики сквозь Gate) ─────────────────────────

describe('Auth.Gate — прозрачность', () => {
  it('чужой клик (незнакомые теги) → next(), store НЕ трогается', () => {
    cleanup = render(() => <AuthGate />, container);

    const mockStore = makeStore();
    const mockNext = vi.fn();
    gateSchema().states.guest.onClick({
      target: { meta: { tags: ['logout'] } },
      store: mockStore,
      next: mockNext,
    });

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockStore.update).not.toHaveBeenCalled();
  });

  it('у Gate-схемы НЕТ хендлеров onLogin/onLogout/onLoginError → auto-bubble наверх', () => {
    cleanup = render(() => <AuthGate />, container);

    const schema = gateSchema();
    for (const event of ['onLogin', 'onLogout', 'onLoginError']) {
      expect(schema[event]).toBeUndefined();
      expect(schema.states.guest[event]).toBeUndefined();
    }
  });

  it('вложенная Login-FSM живёт под Gate и эмиттит onLogin как обычно (apiBase/sessionStore форвардятся)', async () => {
    mockLoginRequest.mockResolvedValue(USER);
    const sessionStore = createAuthSession();
    cleanup = render(() => <AuthGate apiBase="/gateway" sessionStore={sessionStore} />, container);

    const mockEmit = vi.fn();
    await formSchema().states.submitting.onInit({
      store: makeStore({ login: 'alice', password: 'secret123' }),
      state: { set: vi.fn() },
      emit: mockEmit,
    });

    expect(mockLoginRequest).toHaveBeenCalledWith(
      { login: 'alice', password: 'secret123' },
      '/gateway',
    );
    expect(sessionStore.session.user).toEqual(USER);
    expect(mockEmit).toHaveBeenCalledWith(
      'onLogin',
      expect.objectContaining({ payload: { user: USER } }),
    );
  });
});

// ─── Тесты — branding ─────────────────────────────────────────────────────────

describe('Auth.Gate — branding', () => {
  it('общие title/subtitle/footerNote форвардятся в login-форму', () => {
    cleanup = render(
      () => <AuthGate title="Capsule ID" subtitle="Вход в систему" footerNote="© Capsule" />,
      container,
    );

    const el = form();
    expect(el?.getAttribute('data-title')).toBe('Capsule ID');
    expect(el?.getAttribute('data-subtitle')).toBe('Вход в систему');
    expect(el?.getAttribute('data-footer')).toBe('© Capsule');
  });

  it('общие title/footerNote форвардятся и в register-форму', () => {
    mockCtxData = createMutable<Record<string, unknown>>({ mode: 'register' });
    cleanup = render(
      () => <AuthGate initialMode="register" title="Capsule ID" footerNote="© Capsule" />,
      container,
    );

    const el = form();
    expect(el?.getAttribute('data-title')).toBe('Capsule ID');
    expect(el?.getAttribute('data-footer')).toBe('© Capsule');
  });

  it('точечная login-секция перекрывает общий title', () => {
    cleanup = render(
      () => <AuthGate title="Общий" login={{ title: 'Вход', submitLabel: 'Погнали' }} />,
      container,
    );

    const el = form();
    expect(el?.getAttribute('data-title')).toBe('Вход');
    expect(el?.getAttribute('data-submit')).toBe('Погнали');
  });

  it('точечная register-секция перекрывает общий title', () => {
    mockCtxData = createMutable<Record<string, unknown>>({ mode: 'register' });
    cleanup = render(
      () => <AuthGate initialMode="register" title="Общий" register={{ title: 'Регистрация' }} />,
      container,
    );

    expect(form()?.getAttribute('data-title')).toBe('Регистрация');
  });
});

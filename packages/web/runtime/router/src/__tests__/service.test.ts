import { describe, expect, it, vi } from 'vitest';
import { normalizeBase, wrap } from '../types';

// wrap(raw) — pure обёртка над TanStack-роутером (AnyRouter), вынесена в types.ts
// без value-импорта @tanstack/solid-router. Благодаря этому покрывается в
// node-env без jsdom.
//
// Сам createRouter() тут не тестируется: он value-импортит @tanstack/solid-router,
// который тянет клиентские Solid-API (CatchBoundary и т.п.) и падает в node.
// Интеграция createRouter <-> wrap тривиальна — её держит apps/*/bootstrap.tsx
// как end-to-end smoke.

const mkRaw = (overrides: Partial<any> = {}) => {
  const navigate = vi.fn();
  const historyBack = vi.fn();
  const raw = {
    navigate,
    state: { location: { pathname: '/cur' } },
    history: { back: historyBack },
    options: { context: {} },
    ...overrides,
  } as any;
  return { raw, navigate, historyBack };
};

describe('wrap — shape', () => {
  it('returns ICapsuleRouter with goTo/back/current/params/param/raw', () => {
    const { raw } = mkRaw();
    const w = wrap(raw);
    expect(typeof w.goTo).toBe('function');
    expect(typeof w.back).toBe('function');
    expect(typeof w.current).toBe('function');
    expect(typeof w.params).toBe('function');
    expect(typeof w.param).toBe('function');
    expect(w.raw).toBe(raw);
  });
});

describe('wrap — params / param', () => {
  // TanStack мёржит параметры предков в leaf-матч → читаем последний match.
  // Реактивность (raw.state — Solid-memo) покрыта отдельным real-router тестом
  // params.reactive.test.tsx; тут — чистое чтение leaf-shape'а через мок.
  const withMatches = (matches: Array<{ params?: Record<string, string> }>) =>
    mkRaw({ state: { location: { pathname: '/cur' }, matches } }).raw;

  it('returns params of the leaf match', () => {
    const raw = withMatches([{ params: {} }, { params: { ruleId: 'a' } }]);
    expect(wrap(raw).params()).toEqual({ ruleId: 'a' });
  });

  it('leaf carries merged ancestor params (TanStack merge)', () => {
    const raw = withMatches([{ params: { lang: 'en' } }, { params: { lang: 'en', ruleId: 'a' } }]);
    expect(wrap(raw).params()).toEqual({ lang: 'en', ruleId: 'a' });
  });

  it('returns {} when no route matched (empty matches)', () => {
    const raw = withMatches([]);
    expect(wrap(raw).params()).toEqual({});
  });

  it('param(name) — sugar for a single key', () => {
    const raw = withMatches([{ params: { ruleId: 'a' } }]);
    expect(wrap(raw).param('ruleId')).toBe('a');
  });

  it('param(name) → undefined for a missing key', () => {
    const raw = withMatches([{ params: { ruleId: 'a' } }]);
    expect(wrap(raw).param('nope')).toBeUndefined();
  });

  it('param(name) → undefined when no route matched', () => {
    const raw = withMatches([]);
    expect(wrap(raw).param('ruleId')).toBeUndefined();
  });

  it('reads params dynamically (не закешировано)', () => {
    const raw = withMatches([{ params: { ruleId: 'a' } }]);
    const w = wrap(raw);
    expect(w.param('ruleId')).toBe('a');
    (raw.state.matches as Array<{ params: Record<string, string> }>)[0].params = { ruleId: 'b' };
    expect(w.param('ruleId')).toBe('b');
  });
});

describe('wrap — goTo', () => {
  // С ADR 014 второй аргумент — options-объект:
  //   { params?, search?, hash?, replace? }
  // Все поля прямо мапятся в raw.navigate({ to, ...opts }).

  it('delegates to raw.navigate with just { to } when no opts', () => {
    const { raw, navigate } = mkRaw();
    wrap(raw).goTo('/bar');
    expect(navigate).toHaveBeenCalledWith({ to: '/bar' });
  });

  it('forwards params via opts.params', () => {
    const { raw, navigate } = mkRaw();
    wrap(raw).goTo('/users/:id', { params: { id: 42 } });
    expect(navigate).toHaveBeenCalledWith({ to: '/users/:id', params: { id: 42 } });
  });

  it('forwards search query', () => {
    const { raw, navigate } = mkRaw();
    wrap(raw).goTo('/items', { search: { tag: 'urgent', sort: 'date' } });
    expect(navigate).toHaveBeenCalledWith({
      to: '/items',
      search: { tag: 'urgent', sort: 'date' },
    });
  });

  it('forwards hash', () => {
    const { raw, navigate } = mkRaw();
    wrap(raw).goTo('/docs', { hash: 'section-3' });
    expect(navigate).toHaveBeenCalledWith({ to: '/docs', hash: 'section-3' });
  });

  it('forwards replace flag', () => {
    const { raw, navigate } = mkRaw();
    wrap(raw).goTo('/login', { replace: true });
    expect(navigate).toHaveBeenCalledWith({ to: '/login', replace: true });
  });

  it('combines all opts in one call', () => {
    const { raw, navigate } = mkRaw();
    wrap(raw).goTo('/orgs/:slug/items', {
      params: { slug: 'acme' },
      search: { q: 'laptop' },
      hash: 'top',
      replace: true,
    });
    expect(navigate).toHaveBeenCalledWith({
      to: '/orgs/:slug/items',
      params: { slug: 'acme' },
      search: { q: 'laptop' },
      hash: 'top',
      replace: true,
    });
  });

  it('does not throw on empty path', () => {
    const { raw, navigate } = mkRaw();
    expect(() => wrap(raw).goTo('')).not.toThrow();
    expect(navigate).toHaveBeenCalledWith({ to: '' });
  });
});

describe('wrap — back', () => {
  it('delegates to raw.history.back (не window.history напрямую)', () => {
    const { raw, historyBack } = mkRaw();
    wrap(raw).back();
    expect(historyBack).toHaveBeenCalledOnce();
  });
});

describe('wrap — current', () => {
  it('returns raw.state.location.pathname', () => {
    const { raw } = mkRaw();
    expect(wrap(raw).current()).toBe('/cur');
  });

  it('reads pathname dynamically (не закешировано)', () => {
    const { raw } = mkRaw();
    const w = wrap(raw);
    expect(w.current()).toBe('/cur');
    raw.state.location.pathname = '/next';
    expect(w.current()).toBe('/next');
  });

  // TanStack rewriteBasepath strips the basepath from location.pathname via its
  // input rewrite: browser URL `/ewc/dashboard` → TanStack stores `/dashboard`.
  // So current() is already app-relative; no manual stripping needed in wrap().
  it('returns app-relative pathname (TanStack strips basepath internally)', () => {
    // Simulate what TanStack does after input rewrite: pathname is already stripped.
    const { raw } = mkRaw({ state: { location: { pathname: '/dashboard' } } });
    expect(wrap(raw).current()).toBe('/dashboard');
  });
});

// normalizeBase is a pure helper exported from types.ts — testable in node-env.
describe('normalizeBase', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeBase(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(normalizeBase('')).toBeUndefined();
  });

  it('returns undefined for bare slash', () => {
    expect(normalizeBase('/')).toBeUndefined();
  });

  it('strips trailing slash', () => {
    expect(normalizeBase('/ewc/')).toBe('/ewc');
  });

  it('strips multiple trailing slashes', () => {
    expect(normalizeBase('/ewc///')).toBe('/ewc');
  });

  it('returns path unchanged when no trailing slash', () => {
    expect(normalizeBase('/ewc')).toBe('/ewc');
  });

  it('returns undefined for slash-only after stripping', () => {
    // edge: input '/' → stripped '' → undefined
    expect(normalizeBase('/')).toBeUndefined();
  });

  it('handles nested sub-path', () => {
    expect(normalizeBase('/apps/ewc/')).toBe('/apps/ewc');
  });
});

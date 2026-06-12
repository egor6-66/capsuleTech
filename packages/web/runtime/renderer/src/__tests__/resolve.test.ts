import { describe, expect, it } from 'vitest';
import { resolvePath } from '../resolve';
import type { Registry } from '../types';

describe('resolvePath', () => {
  it('resolves a single-segment path', () => {
    const Button = () => null;
    expect(resolvePath({ Button }, 'Button')).toBe(Button);
  });

  it('resolves a nested dot-path', () => {
    const LoginForm = () => null;
    const registry = { Entities: { Viewer: { LoginForm } } };
    expect(resolvePath(registry, 'Entities.Viewer.LoginForm')).toBe(LoginForm);
  });

  it('returns undefined when a middle segment is missing', () => {
    const registry = { ui: { Button: () => null } };
    expect(resolvePath(registry, 'ui.Field.Label')).toBeUndefined();
  });

  it('returns undefined when the first segment is missing', () => {
    expect(resolvePath({}, 'ui.Button')).toBeUndefined();
  });

  it('returns undefined for empty path', () => {
    expect(resolvePath({ ui: {} }, '')).toBeUndefined();
  });

  // `as` casts ниже: эти тесты намеренно скармливают runtime-инварианты,
  // которые TS-тип `Registry` запрещает (рекурсивно ожидает Component|Registry).
  // Проверяем что resolvePath переживает кривые входы — runtime defensive,
  // type system не верит, что host пришлёт null/число вместо вложения.

  it('returns undefined when an intermediate is null/undefined (no crash)', () => {
    const registry = { ui: null } as unknown as Registry;
    expect(resolvePath(registry, 'ui.Button')).toBeUndefined();
  });

  it('returns the final value even if it is a non-function (renderer decides what to do)', () => {
    expect(resolvePath({ a: { b: 42 } } as unknown as Registry, 'a.b')).toBe(42);
  });

  it('handles paths with leaf-key that resolves to undefined', () => {
    expect(resolvePath({ a: { b: undefined } } as unknown as Registry, 'a.b')).toBeUndefined();
  });
});

// Regression tests for Slot 4: per-registry caching.
// resolvePath не должен ходить по объекту повторно при одинаковом пути.
describe('resolvePath — caching behaviour', () => {
  it('returns identical reference for repeated calls (cache hit)', () => {
    const LoginForm = () => null;
    const registry = { Entities: { Viewer: { LoginForm } } };
    const a = resolvePath(registry, 'Entities.Viewer.LoginForm');
    const b = resolvePath(registry, 'Entities.Viewer.LoginForm');
    expect(a).toBe(b);
    expect(a).toBe(LoginForm);
  });

  it('caches misses (undefined results) — does not re-walk after a missing lookup', () => {
    const registry = { ui: {} };
    expect(resolvePath(registry, 'ui.Missing')).toBeUndefined();
    expect(resolvePath(registry, 'ui.Missing')).toBeUndefined();
    // Поведенческий контракт: cache.has(path) ловит закешированный undefined,
    // повторный walk не делается. Прямой обсервабельной разницы нет — но
    // мутация после первого miss не должна возвращать новый ответ:
    (registry as any).ui.Missing = () => null;
    expect(resolvePath(registry, 'ui.Missing')).toBeUndefined();
  });

  it('does NOT share cache across different registry references', () => {
    const B1 = () => null;
    const B2 = () => null;
    const reg1 = { ui: { Button: B1 } };
    const reg2 = { ui: { Button: B2 } };
    expect(resolvePath(reg1, 'ui.Button')).toBe(B1);
    expect(resolvePath(reg2, 'ui.Button')).toBe(B2);
    // Повторно — каждый из своего кеша:
    expect(resolvePath(reg1, 'ui.Button')).toBe(B1);
    expect(resolvePath(reg2, 'ui.Button')).toBe(B2);
  });
});

// Slot 8 — type-level smoke-tests на сужение Registry.
describe('Registry type — compile-time shape', () => {
  it('accepts nested Component/Registry tree', () => {
    const Comp = () => null;
    const valid: Registry = {
      ui: {
        Button: Comp,
        Field: { Label: Comp, Input: Comp },
      },
      Entities: { Viewer: { LoginForm: Comp } },
    };
    // Просто проверяем что объект собирается под Registry — компилируется значит ок.
    expect(typeof valid.ui).toBe('object');
  });

  it('rejects non-Component non-Registry values at the type level', () => {
    // @ts-expect-error — число не Component и не Registry, тип должен ругнуться.
    const _bad: Registry = { count: 42 };
    // @ts-expect-error — null не Component и не Registry.
    const _alsoBad: Registry = { x: null };
    // Сами объекты создаются — runtime их переживёт через `as Registry` cast'ы,
    // но в нормальном flow TS поймает раньше.
    expect(true).toBe(true);
  });
});

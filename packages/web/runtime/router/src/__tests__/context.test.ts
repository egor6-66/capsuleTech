import { createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { RouterContext, useRouter } from '../context';
import type { ICapsuleRouter } from '../types';

/**
 * `useRouter()` — типизированный read из RouterContext с явной ошибкой при
 * отсутствии Provider'а. Тесты живут в .tsx, потому что Solid Context API
 * требует Solid runtime, и провайдер удобнее проверять через createRoot.
 *
 * Принципиальный контракт:
 *  - throw при использовании вне Provider'а (silent-null категорически нет);
 *  - возвращает ровно то значение, что прокинули в Provider.
 */

describe('useRouter — outside Provider', () => {
  it('throws with descriptive message', () => {
    expect(() => {
      createRoot(() => {
        useRouter();
      });
    }).toThrow(/useRouter\(\) called outside <Providers\.Base>/);
  });
});

describe('useRouter — inside Provider', () => {
  it('returns the injected ICapsuleRouter instance', () => {
    const fake: ICapsuleRouter = {
      raw: {} as any,
      goTo: () => {},
      back: () => {},
      current: () => '/',
    };
    let captured: ICapsuleRouter | null = null;
    createRoot(() => {
      RouterContext.Provider({
        value: fake,
        get children() {
          captured = useRouter();
          return null;
        },
      });
    });
    expect(captured).toBe(fake);
  });
});

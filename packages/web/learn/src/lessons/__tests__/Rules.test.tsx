/**
 * Learn.Lessons.Rules tests — lazy-load списка на mount, карточка на правило
 * (title + tags), клик → `lessonsStore.openRule` (fetch правила + дриллов) +
 * emit `onRuleSelect { id }`. `useEmitOptional` мокнут (прецедент `List`).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Rules } from '../Rules';
import { lessonsStore } from '../store';
import type { IRuleSummary } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

const summary = (id: string): IRuleSummary => ({ id, title: id, tags: ['grammar'] });

const RULES = [summary('grammar-pronouns'), summary('articles')];

const ruleDetail = (id: string) => ({
  id,
  title: id,
  body: `# ${id}`,
  tags: ['grammar'],
  drills: [],
});

const mockFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.includes('/learn/rules/')) {
        return { ok: true, json: async () => ruleDetail('grammar-pronouns') };
      }
      return { ok: true, json: async () => ({ rules: RULES }) };
    }),
  );

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
  lessonsStore.close();
  mockFetch();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  vi.unstubAllGlobals();
});

const flush = () => new Promise((r) => setTimeout(r, 0));
const cards = () => [...container.querySelectorAll('[role="button"]')];

describe('Learn.Lessons.Rules', () => {
  it('lazy-loads on mount, one card per rule with its tags', async () => {
    cleanup = render(() => <Rules />, container);
    await flush();

    expect(fetch).toHaveBeenCalledWith('/learn/rules');
    expect(cards()).toHaveLength(2);
    expect(container.textContent).toContain('#grammar');
  });

  it('click → opens the rule (fetch) and emits onRuleSelect', async () => {
    await lessonsStore.loadRules('');
    cleanup = render(() => <Rules />, container);
    await flush();

    (cards()[0] as HTMLElement).click();
    await flush();

    expect(emitSpy).toHaveBeenCalledWith('onRuleSelect', {
      source: 'Learn.Lessons.Rules',
      payload: { id: 'grammar-pronouns' },
    });
    expect(fetch).toHaveBeenCalledWith('/learn/rules/grammar-pronouns');
    expect(lessonsStore.selectedRuleId()).toBe('grammar-pronouns');
  });
});

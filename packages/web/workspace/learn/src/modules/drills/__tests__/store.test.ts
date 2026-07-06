/**
 * drillsStore unit tests — эфемерный интерактив дрилла: setAnswer/answer
 * round-trip, check POSTs item_index+answer + stores verdict, reset чистит всё.
 *
 * Плейн `createStore` (этот модуль) не трогает `@xstate/solid` reconcile-баг —
 * `reset` через `reconcile({})` реально заменяет map'ы (регрессия: прямой
 * `setState({})` мёржит).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drillsStore } from '../store';

const mockFetch = (
  check: { verdict: string; hint?: string; answer?: string } = { verdict: 'wrong' },
) => {
  const spy = vi.fn(async (_url: string, _init?: { method?: string; body?: string }) => ({
    ok: true,
    json: async () => check,
  }));
  vi.stubGlobal('fetch', spy);
  return spy;
};

describe('web-learn drills store', () => {
  beforeEach(() => {
    drillsStore.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    drillsStore.reset();
  });

  it('setAnswer + answer round-trip per item', () => {
    drillsStore.setAnswer('d1', 0, 'I had eaten');
    expect(drillsStore.answer('d1', 0)).toBe('I had eaten');
    expect(drillsStore.answer('d1', 1)).toBe('');
  });

  it('check POSTs item_index + answer, stores verdict', async () => {
    const spy = mockFetch({ verdict: 'correct' });
    drillsStore.setAnswer('d1', 0, 'I had eaten');
    await drillsStore.check('http://api', 'd1', 0);

    const [url, init] = spy.mock.calls.at(-1) as [string, { method: string; body: string }];
    expect(url).toBe('http://api/learn/drills/d1/check');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ item_index: 0, answer: 'I had eaten', reveal: false });
    expect(drillsStore.verdict('d1', 0)).toEqual({ verdict: 'correct' });
  });

  it('reset clears answers + verdicts (reconcile, not merge)', async () => {
    mockFetch({ verdict: 'correct' });
    drillsStore.setAnswer('d1', 0, 'foo');
    await drillsStore.check('http://api', 'd1', 0);
    expect(drillsStore.verdict('d1', 0)).not.toBeNull();

    drillsStore.reset();
    expect(drillsStore.answer('d1', 0)).toBe('');
    expect(drillsStore.verdict('d1', 0)).toBeNull();
  });
});

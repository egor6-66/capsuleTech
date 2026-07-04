/**
 * Learn.Library.Search tests — keystroke writes query + triggers load via
 * `apiBase` from the nearest `Learn.Provider` (ApiBaseContext).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnProvider } from '../../core/provider';
import { Search } from '../Search';
import { libraryStore } from '../store';

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  libraryStore.select(null);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ senses: [] }) })),
  );
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  vi.unstubAllGlobals();
});

describe('Learn.Library.Search', () => {
  it('types into the input → loads via apiBase from Learn.Provider', async () => {
    cleanup = render(
      () => (
        <LearnProvider apiBase="http://api">
          <Search />
        </LearnProvider>
      ),
      container,
    );

    const input = container.querySelector('input') as HTMLInputElement;
    input.value = 'cat';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith('http://api/learn/lang/senses?q=cat');
    expect(libraryStore.query()).toBe('cat');
  });

  it('falls back to relative apiBase without a Provider', async () => {
    cleanup = render(() => <Search />, container);

    const input = container.querySelector('input') as HTMLInputElement;
    input.value = 'dog';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith('/learn/lang/senses?q=dog');
  });
});

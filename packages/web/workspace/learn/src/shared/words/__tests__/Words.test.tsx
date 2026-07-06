/**
 * Learn.Words tests.
 *
 * Coverage:
 *   1. Lazy-load on mount (empty store → `wordsStore.load`).
 *   2. Tile click → `data-selected` lands on the right tile AND migrates
 *      correctly on re-select (regression guard, see store.test.ts doc).
 *   3. emit `onWordSelect` with the full sense on tile click.
 *   4. emit `onSpeak` with audioUrl on speaker click — without selecting
 *      the tile (stopPropagation).
 *
 * `useEmitOptional` mocked per `Shell.Picker` precedent
 * (`packages/web/domain/shell/src/ui/picker/__tests__/picker.test.tsx`).
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wordsStore } from '../store';
import type { ISense } from '../types';
import { Words } from '../Words';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

const sense = (id: number, text: string, audioUrl: string | null = null): ISense => ({
  id,
  text,
  gloss: null,
  ru: null,
  pos: 'noun',
  level: null,
  register: null,
  frequency: null,
  pron_ru: null,
  connotation: null,
  synset: null,
  tags: [],
  audio: audioUrl ? { url: audioUrl, engines: ['gtts'] } : null,
});

const FIXTURE = [sense(1, 'cat'), sense(2, 'dog', 'https://audio/dog.mp3')];

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
  wordsStore.select(null);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ senses: FIXTURE }) })),
  );
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  vi.unstubAllGlobals();
});

const flush = () => new Promise((r) => setTimeout(r, 0));
const tiles = () => [...container.querySelectorAll('[role="button"]')];

describe('Learn.Words', () => {
  it('lazy-loads senses on mount and renders one tile per sense', async () => {
    cleanup = render(() => <Words />, container);
    await flush();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(tiles()).toHaveLength(2);
  });

  it('data-selected migrates onto the correct tile on re-select (regression)', async () => {
    cleanup = render(() => <Words />, container);
    await flush();

    (tiles()[0] as HTMLElement).click();
    expect(tiles()[0].getAttribute('data-selected')).toBe('true');
    expect(tiles()[1].getAttribute('data-selected')).toBeNull();

    (tiles()[1] as HTMLElement).click();
    expect(tiles()[0].getAttribute('data-selected')).toBeNull();
    expect(tiles()[1].getAttribute('data-selected')).toBe('true');
  });

  it('emits onWordSelect with the full sense on tile click', async () => {
    cleanup = render(() => <Words />, container);
    await flush();

    (tiles()[0] as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onWordSelect', {
      source: 'Learn.Words',
      payload: { sense: FIXTURE[0] },
    });
  });

  it('emits onSpeak with audioUrl on speaker click, without selecting the tile', async () => {
    cleanup = render(() => <Words />, container);
    await flush();

    const speaker = tiles()[1].querySelector('button');
    (speaker as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onSpeak', {
      source: 'Learn.Words',
      payload: { audioUrl: 'https://audio/dog.mp3' },
    });
    expect(tiles()[1].getAttribute('data-selected')).toBeNull();
  });
});

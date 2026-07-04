/**
 * Learn.Library.Info tests — fallback when nothing selected, renders the
 * selected sense, emits `onSpeak` on speaker click.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Info } from '../Info';
import { libraryStore } from '../store';
import type { ISense } from '../types';

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

const SENSE: ISense = {
  id: 1,
  text: 'cat',
  gloss: 'a small domesticated animal',
  ru: 'кошка',
  pos: 'noun',
  level: 'A1',
  register: null,
  frequency: null,
  pron_ru: 'кэт',
  connotation: null,
  synset: null,
  tags: [{ name: 'animal', kind: 'domain' }],
  audio: { url: 'https://audio/cat.mp3', engines: ['gtts'] },
};

const mockSenses = (senses: ISense[]) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ senses }) })),
  );
};

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
  libraryStore.select(null);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
  vi.unstubAllGlobals();
});

describe('Learn.Library.Info', () => {
  it('renders the empty-selection fallback', () => {
    cleanup = render(() => <Info />, container);

    expect(container.textContent).toContain('Выберите слово');
  });

  it('renders the selected sense', async () => {
    mockSenses([SENSE]);
    await libraryStore.load('http://api');
    libraryStore.select(1);

    cleanup = render(() => <Info />, container);

    expect(container.textContent).toContain('cat');
    expect(container.textContent).toContain('кэт');
    expect(container.textContent).toContain('кошка');
    expect(container.textContent).toContain('a small domesticated animal');
    expect(container.textContent).toContain('animal · domain');
  });

  it('emits onSpeak with the selected sense audioUrl on speaker click', async () => {
    mockSenses([SENSE]);
    await libraryStore.load('http://api');
    libraryStore.select(1);

    cleanup = render(() => <Info />, container);
    const speaker = container.querySelector('button');
    (speaker as HTMLElement).click();

    expect(emitSpy).toHaveBeenCalledWith('onSpeak', {
      source: 'Learn.Library.Info',
      payload: { audioUrl: 'https://audio/cat.mp3' },
    });
  });
});

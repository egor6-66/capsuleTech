/**
 * Shell.SegmentNav unit tests.
 *
 * Coverage (per brief pilot-segment-nav-3):
 *   1. Рендер сегментов через web-ui SegmentedBar (items passthrough).
 *   2. activeId — производная от web-router useActiveSegment.
 *   3. Клик → emit('onSegmentNavigate') с { nav, segment } и source 'Shell.SegmentNav'.
 *   4. class passthrough на бар.
 *   5. useActiveSegment получает id'шники сегментов.
 */

/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SegmentNav } from '../segmentNav';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const { emitSpy, activeSpy, activeIdsSpy } = vi.hoisted(() => ({
  emitSpy: vi.fn(),
  activeSpy: vi.fn(() => 'phrases' as string | undefined),
  activeIdsSpy: vi.fn(),
}));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-router', () => ({
  useActiveSegment: (ids: readonly string[]) => {
    activeIdsSpy(ids);
    return activeSpy;
  },
}));

vi.mock('@capsuletech/web-ui/segmentedBar', () => ({
  SegmentedBar: (props: any) => {
    const { For } = require('solid-js');
    return (
      <div data-testid="segmented-bar" data-active={props.activeId} class={props.class}>
        <For each={props.items}>
          {(item: any) => (
            <button
              type="button"
              data-testid="segment"
              data-id={item.id}
              onClick={() => props.onSelect(item.id)}
            >
              {item.label}
            </button>
          )}
        </For>
      </div>
    );
  },
}));

// ---------------------------------------------------------------------------
// Scaffolding
// ---------------------------------------------------------------------------

const SEGMENTS = [
  { id: 'words', label: 'Слова' },
  { id: 'phrases', label: 'Фразы' },
];

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
  activeIdsSpy.mockClear();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

const segments = () => [...container.querySelectorAll('[data-testid="segment"]')] as HTMLElement[];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Shell.SegmentNav — rendering', () => {
  it('renders each segment through SegmentedBar', () => {
    cleanup = render(() => <SegmentNav nav="library" segments={SEGMENTS} />, container);

    expect(segments()).toHaveLength(2);
    expect(segments()[0].textContent).toBe('Слова');
    expect(segments()[1].textContent).toBe('Фразы');
  });

  it('passes class through to the bar', () => {
    cleanup = render(
      () => <SegmentNav nav="library" segments={SEGMENTS} class="mx-auto w-fit" />,
      container,
    );

    const bar = container.querySelector('[data-testid="segmented-bar"]');
    expect(bar?.getAttribute('class')).toBe('mx-auto w-fit');
  });
});

describe('Shell.SegmentNav — active segment', () => {
  it('feeds segment ids to useActiveSegment', () => {
    cleanup = render(() => <SegmentNav nav="library" segments={SEGMENTS} />, container);

    expect(activeIdsSpy).toHaveBeenCalledWith(['words', 'phrases']);
  });

  it('drives activeId from useActiveSegment', () => {
    cleanup = render(() => <SegmentNav nav="library" segments={SEGMENTS} />, container);

    const bar = container.querySelector('[data-testid="segmented-bar"]');
    expect(bar?.getAttribute('data-active')).toBe('phrases');
  });
});

describe('Shell.SegmentNav — select flow', () => {
  it('emits onSegmentNavigate with { nav, segment } and Shell.SegmentNav source', () => {
    cleanup = render(() => <SegmentNav nav="library" segments={SEGMENTS} />, container);
    segments()[0].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('onSegmentNavigate', {
      source: 'Shell.SegmentNav',
      payload: { nav: 'library', segment: 'words' },
    });
  });

  it('carries the nav discriminator into the payload', () => {
    cleanup = render(() => <SegmentNav nav="lessons" segments={SEGMENTS} />, container);
    segments()[1].click();

    expect(emitSpy).toHaveBeenCalledWith('onSegmentNavigate', {
      source: 'Shell.SegmentNav',
      payload: { nav: 'lessons', segment: 'phrases' },
    });
  });
});

/**
 * Shell.Launcher unit tests.
 *
 * Coverage (per brief pilot-segment-nav-3):
 *   1. Рендер разделов через web-ui Launcher (items passthrough).
 *   2. hero-пропы title/description/hint passthrough.
 *   3. Клик → emit('onSegmentNavigate') с { nav, segment } и source 'Shell.Launcher'.
 *   4. Единое событие — тот же контракт, что у SegmentNav.
 */

/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Launcher } from '../launcher';

// ---------------------------------------------------------------------------
// Stubs
// ---------------------------------------------------------------------------

const { emitSpy } = vi.hoisted(() => ({ emitSpy: vi.fn() }));

vi.mock('@capsuletech/web-core', () => ({
  useEmitOptional: () => emitSpy,
}));

vi.mock('@capsuletech/web-ui/launcher', () => ({
  Launcher: (props: any) => {
    const { For } = require('solid-js');
    return (
      <div data-testid="ui-launcher" data-title={props.title} data-hint={props.hint}>
        <p data-testid="launcher-description">{props.description}</p>
        <For each={props.items}>
          {(item: any) => (
            <button
              type="button"
              data-testid="launcher-card"
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
  { id: 'studio', label: 'Студия', description: 'Собрать UI' },
  { id: 'learn', label: 'Обучение' },
];

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  emitSpy.mockClear();
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

const cards = () =>
  [...container.querySelectorAll('[data-testid="launcher-card"]')] as HTMLElement[];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Shell.Launcher — rendering', () => {
  it('renders each segment as a card through the web-ui Launcher', () => {
    cleanup = render(() => <Launcher nav="workspace" segments={SEGMENTS} />, container);

    expect(cards()).toHaveLength(2);
    expect(cards()[0].textContent).toBe('Студия');
    expect(cards()[1].textContent).toBe('Обучение');
  });

  it('passes hero props (title/description/hint) through', () => {
    cleanup = render(
      () => (
        <Launcher
          nav="workspace"
          segments={SEGMENTS}
          title="Мастерская"
          description="Выберите раздел"
          hint="Подсказка"
        />
      ),
      container,
    );

    const el = container.querySelector('[data-testid="ui-launcher"]');
    expect(el?.getAttribute('data-title')).toBe('Мастерская');
    expect(el?.getAttribute('data-hint')).toBe('Подсказка');
    expect(container.querySelector('[data-testid="launcher-description"]')?.textContent).toBe(
      'Выберите раздел',
    );
  });
});

describe('Shell.Launcher — select flow', () => {
  it('emits onSegmentNavigate with { nav, segment } and Shell.Launcher source', () => {
    cleanup = render(() => <Launcher nav="workspace" segments={SEGMENTS} />, container);
    cards()[0].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('onSegmentNavigate', {
      source: 'Shell.Launcher',
      payload: { nav: 'workspace', segment: 'studio' },
    });
  });

  it('carries the nav discriminator into the payload', () => {
    cleanup = render(() => <Launcher nav="home" segments={SEGMENTS} />, container);
    cards()[1].click();

    expect(emitSpy).toHaveBeenCalledWith('onSegmentNavigate', {
      source: 'Shell.Launcher',
      payload: { nav: 'home', segment: 'learn' },
    });
  });
});

/**
 * WebStudio.Nav.Main tests (зеркало learn `MainNav.test`).
 *
 * Coverage:
 *   1. Рендерит одну кнопку на каждый SEGMENTS (store / creator).
 *   2. Кормит id сегментов в useActiveSegment (web-router).
 *   3. Активный сегмент → `aria-current="page"` (производная от URL).
 *   4. Клик → emit('onSegmentNavigate') { nav: 'web-studio', segment } + source
 *      'WebStudio.Nav.Main'.
 *
 * `Shell.Header.Navigation` мокнут минимальным batch-рендером; реальный NavButton
 * держит active/emit-логику.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MainNav from '../MainNav';

const { emitSpy, activeSpy, activeIdsSpy } = vi.hoisted(() => ({
  emitSpy: vi.fn(),
  activeSpy: vi.fn(() => 'creator' as string | undefined),
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

vi.mock('@capsuletech/web-shell/ui', () => ({
  Header: {
    Navigation: (props: any) => {
      const { For } = require('solid-js');
      const Item = props.item.use;
      return (
        <div data-testid="main-nav">
          <For each={props.data}>{(d: any) => <Item {...props.item.props(d)} />}</For>
        </div>
      );
    },
  },
}));

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

const buttons = () => [...container.querySelectorAll('button')] as HTMLButtonElement[];

describe('WebStudio.Nav.Main', () => {
  it('renders one button per segment (store / creator)', () => {
    cleanup = render(() => <MainNav />, container);
    expect(buttons().map((b) => b.textContent)).toEqual(['Store', 'Creator']);
  });

  it('feeds segment ids to useActiveSegment', () => {
    cleanup = render(() => <MainNav />, container);
    expect(activeIdsSpy).toHaveBeenCalledWith(['store', 'creator']);
  });

  it('marks the active segment with aria-current=page', () => {
    cleanup = render(() => <MainNav />, container);
    const current = buttons().filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe('Creator');
  });

  it('emits onSegmentNavigate { nav: web-studio, segment } with WebStudio.Nav.Main source', () => {
    cleanup = render(() => <MainNav />, container);
    buttons()[0].click();
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('onSegmentNavigate', {
      source: 'WebStudio.Nav.Main',
      payload: { nav: 'web-studio', segment: 'store' },
    });
  });
});

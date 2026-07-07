/**
 * Learn.Nav.Main tests.
 *
 * Coverage:
 *   1. Рендерит одну кнопку на каждый MAIN_SEGMENTS (включая `guides` — дрейф
 *      снят при консолидации).
 *   2. Кормит id сегментов в useActiveSegment (web-router).
 *   3. Активный сегмент → `aria-current="page"` (производная от URL).
 *   4. Клик → emit('onSegmentNavigate') { nav: 'root', segment } + source
 *      'Learn.Nav.Main'.
 *
 * `Shell.Header.Navigation` мокнут минимальным batch-рендером (как SegmentNav-тест
 * мокает SegmentedBar) — NavButton (реальный) держит active/emit-логику.
 */
/* @vitest-environment jsdom */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import MainNav from '../MainNav';

const { emitSpy, activeSpy, activeIdsSpy } = vi.hoisted(() => ({
  emitSpy: vi.fn(),
  activeSpy: vi.fn(() => 'library' as string | undefined),
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

describe('Learn.Nav.Main', () => {
  it('renders one button per main segment (incl. guides)', () => {
    cleanup = render(() => <MainNav />, container);

    const labels = buttons().map((b) => b.textContent);
    expect(labels).toEqual(['Lessons', 'Exercises', 'Progress', 'Library', 'Guides']);
  });

  it('feeds segment ids to useActiveSegment', () => {
    cleanup = render(() => <MainNav />, container);

    expect(activeIdsSpy).toHaveBeenCalledWith([
      'lessons',
      'exercises',
      'progress',
      'library',
      'guides',
    ]);
  });

  it('marks the active segment with aria-current=page', () => {
    cleanup = render(() => <MainNav />, container);

    const current = buttons().filter((b) => b.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe('Library');
  });

  it('emits onSegmentNavigate { nav: root, segment } with Learn.Nav.Main source', () => {
    cleanup = render(() => <MainNav />, container);
    buttons()[0].click();

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('onSegmentNavigate', {
      source: 'Learn.Nav.Main',
      payload: { nav: 'root', segment: 'lessons' },
    });
  });
});

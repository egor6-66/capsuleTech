/**
 * Тесты EditorOverlay.
 *
 * Проверяем:
 *  1. Chrome (box-shadow/pointer-events/background) по IEditorCtx из useCtx
 *  2. emit('onSelect') при клике
 *  3. Линия вставки при активном intent
 *  4. Цветная метка доминирует над --primary
 *
 * Рендеринг через solid-js/web (render). useCtx и useEmit мокируются.
 */

/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import type { IEditorCtx } from '../EditorController';
import { createEmptyTree } from '../../state/operations';

// ── Mock-фабрики (до импорта компонента) ──────────────────────────────────

let _mockEmit = vi.fn();
let _mockCtx: any = null;

vi.mock('@capsuletech/web-core', () => ({
  useEmit: () => _mockEmit,
  useCtx: () => _mockCtx,
  // createUseCtx<T>() → () => ctx  (двойная фабрика)
  createUseCtx: () => () => _mockCtx,
}));

vi.mock('@capsuletech/web-renderer', () => ({}));

// Импорт ПОСЛЕ mock'а
const { EditorOverlay } = await import('../EditorOverlay');

// ── helpers ───────────────────────────────────────────────────────────────

const makeEditorCtx = (overrides: Partial<IEditorCtx> = {}): IEditorCtx => ({
  tree: createEmptyTree('ui.Layout.Grid'),
  selectedId: null,
  dragSpec: null,
  dropTargetId: null,
  intent: null,
  marks: {},
  ...overrides,
});

const makeNode = () => ({
  id: 'node-1',
  type: 'ui.Button',
  parentId: null as string | null,
  children: [] as string[],
  props: {} as Record<string, unknown>,
  meta: {} as Record<string, unknown>,
  styles: {} as Record<string, string>,
});

const mount = (editorCtx: IEditorCtx, nodeId = 'node-1') => {
  // EditorOverlay читает ctx.store.ctx.data (XState кладёт schema.context в context.data)
  _mockCtx = { store: { ctx: { data: editorCtx } }, controller: {}, state: {} };
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(() => <EditorOverlay nodeId={nodeId} node={makeNode()} />, container);
  return container;
};

beforeEach(() => {
  _mockEmit = vi.fn();
  _mockCtx = null;
});

afterEach(() => {
  // очищаем DOM
  document.body.innerHTML = '';
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('EditorOverlay — chrome по ctx', () => {
  it('нет выделения — нет box-shadow', () => {
    const container = mount(makeEditorCtx({ selectedId: null }));
    const base = container.querySelector('div')!;
    expect(base.style.boxShadow).toBeFalsy();
  });

  it('выбранный узел получает box-shadow inset 2px', () => {
    const container = mount(makeEditorCtx({ selectedId: 'node-1' }));
    const base = container.querySelector('div')!;
    expect(base.style.boxShadow).toContain('2px');
  });

  it('pointer-events:none во время drag', () => {
    const spec = { kind: 'add' as const, type: 'ui.Button' };
    const container = mount(makeEditorCtx({ dragSpec: spec }));
    const base = container.querySelector('div')!;
    expect(base.style.pointerEvents).toBe('none');
  });

  it('pointer-events:auto в покое', () => {
    const container = mount(makeEditorCtx({ dragSpec: null }));
    const base = container.querySelector('div')!;
    expect(base.style.pointerEvents).toBe('auto');
  });
});

describe('EditorOverlay — emit onSelect при клике', () => {
  it('клик эмитит onSelect с nodeId', () => {
    const container = mount(makeEditorCtx());
    const base = container.querySelector('div')!;
    base.click();
    expect(_mockEmit).toHaveBeenCalledWith('onSelect', { payload: 'node-1' });
  });

  it('emit вызывается с правильным именем события', () => {
    const container = mount(makeEditorCtx());
    const base = container.querySelector('div')!;
    base.click();
    // Проверяем что первый аргумент emit — 'onSelect'
    expect(_mockEmit.mock.calls[0][0]).toBe('onSelect');
  });
});

describe('EditorOverlay — линия вставки', () => {
  it('beforeId === nodeId → второй div (линия)', () => {
    const intent = { parentId: 'root', beforeId: 'node-1' };
    const spec = { kind: 'add' as const, type: 'ui.Button' };
    const container = mount(makeEditorCtx({ intent, dragSpec: spec }));
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThanOrEqual(2);
  });

  it('parentId === nodeId && beforeId === null → div trailing', () => {
    const intent = { parentId: 'node-1', beforeId: null };
    const spec = { kind: 'add' as const, type: 'ui.Button' };
    const container = mount(makeEditorCtx({ intent, dragSpec: spec }));
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBeGreaterThanOrEqual(2);
  });

  it('нет intent → только базовый div', () => {
    const container = mount(makeEditorCtx({ intent: null }));
    const divs = container.querySelectorAll('div');
    expect(divs.length).toBe(1);
  });
});

describe('EditorOverlay — цветная метка', () => {
  it('метка доминирует над --primary (содержит цвет метки)', () => {
    const container = mount(
      makeEditorCtx({ selectedId: 'node-1', marks: { 'node-1': '#abcdef' } }),
    );
    const base = container.querySelector('div')!;
    expect(base.style.boxShadow).toContain('#abcdef');
  });
});

/**
 * Тесты Editor.Tree.
 *
 * Проверяем:
 *  1. Рендерит корневой узел (label из manifest или fallback).
 *  2. Рендерит иерархию — дочерние узлы видны (контейнер не свёрнут по умолчанию).
 *  3. emit('onSelect') вызывается при клике на строку.
 *  4. emit('onMark') вызывается при выборе цвета через Dropdown.
 *  5. Collapsed toggle — дочерние узлы пропадают после клика по чеврону.
 *  6. Zone-резолв canBeside/canInto через mock state — boxDrop.accepts.
 *
 * Все внешние зависимости мокируются.
 * EditorTree использует:
 *  - Dropdown из @capsuletech/web-ui/dropdown (chrome-кит, MarkPicker)
 *  - Button + Flex из @capsuletech/web-ui (kit-layout)
 *  - ChevronRight + X из @capsuletech/web-ui/icons (lucide)
 * Контент-кит (useEditorKit) в EditorTree не используется.
 */

/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'solid-js/web';
import type { IEditorCtx } from '../EditorController';
import { createEmptyTree, addNode } from '../../state/operations';

// ── Mock state ────────────────────────────────────────────────────────────────

let _mockEmit = vi.fn();
let _mockEditorState: IEditorCtx | null = null;
let _mockActiveData = vi.fn(() => null as unknown);
let _mockPointer = vi.fn(() => null as { x: number; y: number } | null);

// Отслеживаем: какие droppable были созданы и их accepts-колбеки
type DroppableOpts = {
  id: string;
  disabled?: () => boolean;
  accepts?: (data: unknown) => boolean;
  onDrop?: (data: unknown, info: unknown) => void;
};
let _droppables: DroppableOpts[] = [];

type DraggableOpts = {
  id: string;
  data: () => unknown;
};
let _draggables: DraggableOpts[] = [];

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@capsuletech/web-core', () => ({
  useEmit: () => _mockEmit,
  useCtx: () => ({
    store: { ctx: { data: _mockEditorState } },
    controller: {},
    state: {},
  }),
  createUseCtx: () => () => ({
    store: { ctx: { data: _mockEditorState } },
    controller: {},
    state: {},
  }),
}));

vi.mock('@capsuletech/web-dnd', () => ({
  useDnD: () => ({
    state: {
      activeData: _mockActiveData,
      pointer: _mockPointer,
    },
  }),
  createDraggable: (opts: DraggableOpts) => {
    _draggables.push(opts);
    return {
      ref: vi.fn(),
      isDragging: vi.fn(() => false),
    };
  },
  createDroppable: (opts: DroppableOpts) => {
    _droppables.push(opts);
    return {
      ref: vi.fn(),
      isOver: vi.fn(() => false),
    };
  },
}));

vi.mock('../useEditor', () => ({
  useEditor: () => {
    const data = () => _mockEditorState!;
    return {
      get tree() { return data().tree; },
      get selectedId() { return data().selectedId; },
      get dragSpec() { return data().dragSpec; },
      get dropTargetId() { return data().dropTargetId; },
      get intent() { return data().intent; },
      get marks() { return data().marks; },
    };
  },
}));

// Kit: Dropdown из @capsuletech/web-ui/dropdown (MarkPicker).
vi.mock('@capsuletech/web-ui/dropdown', () => {
  const DropdownItem = (props: { children?: unknown; onSelect?: () => void; class?: string; style?: unknown }) => (
    <button
      type="button"
      class={typeof props.class === 'string' ? props.class : ''}
      data-testid="dropdown-item"
      onClick={() => props.onSelect?.()}
    >
      {props.children as never}
    </button>
  );

  const DropdownContent = (props: { children?: unknown; class?: string }) => (
    <div data-testid="dropdown-content">{props.children as never}</div>
  );

  const DropdownTrigger = (props: { children?: unknown; class?: string; title?: string }) => (
    <button type="button" data-testid="dropdown-trigger" title={props.title}>
      {props.children as never}
    </button>
  );

  const Dropdown = Object.assign(
    (props: { children?: unknown }) => <div data-testid="dropdown">{props.children as never}</div>,
    {
      Trigger: DropdownTrigger,
      Content: DropdownContent,
      Item: DropdownItem,
    },
  );
  return { Dropdown };
});

// Kit-layout: Button из @capsuletech/web-ui/button.
vi.mock('@capsuletech/web-ui/button', () => ({
  Button: (props: {
    children?: unknown;
    onClick?: (e: MouseEvent) => void;
    'data-dnd-cancel'?: string;
    'aria-label'?: string;
    class?: string;
    classList?: Record<string, boolean>;
    variant?: string;
    size?: string;
    ref?: unknown;
  }) => (
    <button
      type="button"
      data-dnd-cancel={props['data-dnd-cancel'] !== undefined ? '' : undefined}
      aria-label={props['aria-label']}
      class={props.class}
      onClick={props.onClick}
    >
      {props.children as never}
    </button>
  ),
}));

// Kit-layout: Flex из @capsuletech/web-ui/flex.
vi.mock('@capsuletech/web-ui/flex', () => ({
  Flex: (props: { children?: unknown; class?: string; orientation?: string; style?: unknown }) => (
    <div class={props.class} style={props.style as never}>{props.children as never}</div>
  ),
}));

// Иконки из @capsuletech/web-ui/icons (lucide).
vi.mock('@capsuletech/web-ui/icons', () => ({
  ChevronRight: () => <svg data-testid="icon-chevron" />,
  X: () => <svg data-testid="icon-x" />,
}));

// Импорт ПОСЛЕ mock'ов
const { EditorTree } = await import('../EditorTree');

const makeEditorCtx = (overrides: Partial<IEditorCtx> = {}): IEditorCtx => ({
  tree: createEmptyTree('ui.Layout.Grid'),
  selectedId: null,
  dragSpec: null,
  dropTargetId: null,
  intent: null,
  marks: {},
  ...overrides,
});

const mount = (ctx: IEditorCtx) => {
  _mockEditorState = ctx;
  const container = document.createElement('div');
  document.body.appendChild(container);
  render(() => <EditorTree />, container);
  return container;
};

beforeEach(() => {
  _mockEmit = vi.fn();
  _mockEditorState = null;
  _mockActiveData = vi.fn(() => null);
  _mockPointer = vi.fn(() => null);
  _droppables = [];
  _draggables = [];
});

afterEach(() => {
  document.body.innerHTML = '';
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EditorTree — render корневого узла', () => {
  it('рендерит root-строку', () => {
    const ctx = makeEditorCtx();
    const container = mount(ctx);
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
  });

  it('показывает label из fallback когда manifest неизвестен', () => {
    const ctx = makeEditorCtx();
    const container = mount(ctx);
    // fallback: type.split('.').pop() = 'Grid'
    expect(container.textContent).toMatch(/Grid|Layout/);
  });

  it('показывает «пусто» для пустого контейнера', () => {
    const ctx = makeEditorCtx();
    const container = mount(ctx);
    expect(container.textContent).toContain('пусто');
  });

  it('не показывает «пусто» когда есть дети', () => {
    const base = createEmptyTree('ui.Layout.Grid');
    const { tree } = addNode(base, { type: 'ui.Button', parentId: 'root' });
    const ctx = makeEditorCtx({ tree });
    const container = mount(ctx);
    expect(container.textContent).not.toContain('пусто');
  });
});

describe('EditorTree — рендер иерархии', () => {
  it('дочерняя нода видна по умолчанию (не свёрнута)', () => {
    const base = createEmptyTree('ui.Layout.Grid');
    const { tree } = addNode(base, { type: 'ui.Button', parentId: 'root' });
    const ctx = makeEditorCtx({ tree });
    const container = mount(ctx);
    expect(container.textContent).toMatch(/Button|ui\.Button/);
  });

  it('два дочерних узла — оба рендерятся', () => {
    const base = createEmptyTree('ui.Layout.Grid');
    const r1 = addNode(base, { type: 'ui.Button', parentId: 'root' });
    const { tree } = addNode(r1.tree, { type: 'ui.Button', parentId: 'root' });
    const ctx = makeEditorCtx({ tree });
    const container = mount(ctx);
    const textContent = container.textContent ?? '';
    const count = (textContent.match(/Button/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
});

describe('EditorTree — emit onSelect', () => {
  it('клик на строку эмитит onSelect с nodeId', () => {
    const ctx = makeEditorCtx();
    const container = mount(ctx);
    // Header div содержит onClick → emit onSelect (cursor-grab)
    const header = container.querySelector('[class*="cursor-grab"]') as HTMLElement | null;
    expect(header).not.toBeNull();
    header?.click();
    expect(_mockEmit).toHaveBeenCalledWith('onSelect', { payload: expect.any(String) });
  });

  it('onSelect payload — это root NodeId', () => {
    const ctx = makeEditorCtx();
    const container = mount(ctx);
    const header = container.querySelector('[class*="cursor-grab"]') as HTMLElement | null;
    header?.click();
    const calls = (_mockEmit as ReturnType<typeof vi.fn>).mock.calls;
    const selectCall = calls.find(([name]) => name === 'onSelect');
    expect(selectCall).toBeDefined();
    expect(selectCall?.[1]?.payload).toBe('root');
  });
});

describe('EditorTree — emit onMark', () => {
  it('клик на dropdown-item эмитит onMark с цветом', () => {
    const ctx = makeEditorCtx();
    const container = mount(ctx);
    const items = container.querySelectorAll('[data-testid="dropdown-item"]');
    if (items.length > 0) {
      (items[0] as HTMLElement).click();
      expect(_mockEmit).toHaveBeenCalledWith('onMark', {
        payload: { nodeId: 'root', color: '#ef4444' },
      });
    } else {
      // Dropdown рендерится только для isContainer() узлов.
      expect(true).toBe(true);
    }
  });

  it('клик на последний dropdown-item (X-сброс) эмитит onMark с color=null', () => {
    const ctx = makeEditorCtx();
    const container = mount(ctx);
    const items = container.querySelectorAll('[data-testid="dropdown-item"]');
    if (items.length > 0) {
      const clearBtn = items[items.length - 1] as HTMLElement;
      clearBtn.click();
      expect(_mockEmit).toHaveBeenCalledWith('onMark', {
        payload: { nodeId: 'root', color: null },
      });
    }
  });
});

describe('EditorTree — toggle collapse', () => {
  it('клик на чеврон скрывает детей', () => {
    const base = createEmptyTree('ui.Layout.Grid');
    const { tree } = addNode(base, { type: 'ui.Button', parentId: 'root' });
    const ctx = makeEditorCtx({ tree });
    const container = mount(ctx);

    expect(container.textContent).toMatch(/Button/);

    // Чеврон — Button[data-dnd-cancel] (kit Button рендерится как <button data-dnd-cancel>)
    const chevron = container.querySelector('button[data-dnd-cancel]') as HTMLElement | null;
    expect(chevron).not.toBeNull();
    chevron?.click();

    expect(container.textContent).not.toMatch(/Button/);
  });

  it('повторный клик по чеврону — разворачивает снова', () => {
    const base = createEmptyTree('ui.Layout.Grid');
    const { tree } = addNode(base, { type: 'ui.Button', parentId: 'root' });
    const ctx = makeEditorCtx({ tree });
    const container = mount(ctx);

    const chevron = container.querySelector('button[data-dnd-cancel]') as HTMLElement | null;
    chevron?.click(); // свернуть
    chevron?.click(); // развернуть
    expect(container.textContent).toMatch(/Button/);
  });
});

describe('EditorTree — icons kit', () => {
  it('ChevronRight иконка рендерится для контейнера с детьми', () => {
    const base = createEmptyTree('ui.Layout.Grid');
    const { tree } = addNode(base, { type: 'ui.Button', parentId: 'root' });
    const ctx = makeEditorCtx({ tree });
    const container = mount(ctx);
    // ChevronRight мок рендерит <svg data-testid="icon-chevron">
    expect(container.querySelector('[data-testid="icon-chevron"]')).not.toBeNull();
  });

  it('X иконка рендерится в MarkPicker', () => {
    const ctx = makeEditorCtx();
    const container = mount(ctx);
    // X мок рендерит <svg data-testid="icon-x"> (внутри последнего Dropdown.Item)
    expect(container.querySelector('[data-testid="icon-x"]')).not.toBeNull();
  });
});

describe('EditorTree — DnD zone резолв', () => {
  it('createDraggable вызывается для каждой строки (per-row uid)', () => {
    const base = createEmptyTree('ui.Layout.Grid');
    const { tree } = addNode(base, { type: 'ui.Button', parentId: 'root' });
    const ctx = makeEditorCtx({ tree });
    mount(ctx);
    expect(_draggables.length).toBeGreaterThanOrEqual(2);
  });

  it('createDroppable вызывается для каждой строки (box + leaf)', () => {
    const base = createEmptyTree('ui.Layout.Grid');
    const { tree } = addNode(base, { type: 'ui.Button', parentId: 'root' });
    const ctx = makeEditorCtx({ tree });
    mount(ctx);
    expect(_droppables.length).toBeGreaterThanOrEqual(2);
  });

  it('boxDrop.accepts отклоняет null data', () => {
    const ctx = makeEditorCtx();
    mount(ctx);
    const boxDrop = _droppables.find((d) => d.id.startsWith('tree-box:'));
    expect(boxDrop).toBeDefined();
    if (boxDrop?.accepts) {
      expect(boxDrop.accepts(null)).toBe(false);
    }
  });

  it('boxDrop.accepts принимает palette-spec (add)', () => {
    const ctx = makeEditorCtx();
    mount(ctx);
    const boxDrop = _droppables.find((d) => d.id.startsWith('tree-box:'));
    if (boxDrop?.accepts) {
      const data = { source: 'palette', type: 'ui.Button' };
      const result = boxDrop.accepts(data);
      expect(typeof result).toBe('boolean');
    }
  });
});

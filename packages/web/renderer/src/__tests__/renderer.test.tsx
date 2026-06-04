/* @vitest-environment jsdom */
import { type Component, createContext, createSignal, useContext } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Renderer } from '../renderer';
import type { IEditOverlayProps, ISchema, RenderMode } from '../types';

// Renderer = «обобщённый Widget». Здесь cover'аем:
//  1. чистый рендер дерева (resolve / props / meta / fallback)
//  2. реактивность (правка схемы → точечный re-render без re-mount)
//  3. interactions (single / multi / unresolved-ref / props)
//  4. КРИТИЧЕСКИЙ thunk-chain: Wrapper's Context.Provider должен быть установлен
//     ДО того, как inner Component запускается. Если построение inner становится
//     жадным — useContext в Entity вернёт undefined и UiProxy перестанет работать.
//  5. RenderMode: static/controlled/full фильтрация interactions.

let container: HTMLDivElement;
let dispose: () => void = () => {};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  dispose();
  dispose = () => {};
  document.body.removeChild(container);
  vi.restoreAllMocks();
});

const Button: Component<any> = (p) => (
  <button data-testid="btn" type="button">
    {p.children}
  </button>
);
const Card: Component<any> = (p) => <div data-testid="card">{p.children}</div>;

describe('Renderer — basic rendering', () => {
  it('renders a single leaf node with text-children from node.props', () => {
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: {
            id: 'r',
            type: 'ui.Button',
            parentId: null,
            children: [],
            props: { children: 'Hi' },
          },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ ui: { Button } }} />, container);
    expect(container.querySelector('[data-testid="btn"]')?.textContent).toBe('Hi');
  });

  it('renders a nested tree (parent → child)', () => {
    const schema: ISchema = {
      components: {
        root: 'card',
        nodes: {
          card: { id: 'card', type: 'ui.Card', parentId: null, children: ['b'] },
          b: {
            id: 'b',
            type: 'ui.Button',
            parentId: 'card',
            children: [],
            props: { children: 'X' },
          },
        },
      },
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ ui: { Button, Card } }} />,
      container,
    );
    expect(container.querySelector('[data-testid="card"] [data-testid="btn"]')?.textContent).toBe(
      'X',
    );
  });

  it('resolves dot-paths through nested registry', () => {
    const LoginForm: Component<any> = () => <span data-testid="lf">login</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'Entities.Viewer.LoginForm', parentId: null, children: [] },
        },
      },
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Entities: { Viewer: { LoginForm } } }} />,
      container,
    );
    expect(container.querySelector('[data-testid="lf"]')?.textContent).toBe('login');
  });

  it('passes node.props through to component', () => {
    const recv = vi.fn();
    const Probe: Component<any> = (p) => {
      recv({ a: p.a, b: p.b });
      return <span data-testid="p">{p.a}</span>;
    };
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'P', parentId: null, children: [], props: { a: 'A', b: 'B' } },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ P: Probe }} />, container);
    expect(recv).toHaveBeenCalled();
    expect(recv.mock.calls.at(-1)?.[0]).toEqual({ a: 'A', b: 'B' });
  });

  it('passes node.meta through to component', () => {
    const recv = vi.fn();
    const Probe: Component<any> = (p) => {
      recv(p.meta);
      return null;
    };
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'P', parentId: null, children: [], meta: { tags: ['x'] } },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ P: Probe }} />, container);
    expect(recv.mock.calls.at(-1)?.[0]).toEqual({ tags: ['x'] });
  });

  // Slot 9 — `IEditorNode.styles` теперь пробрасывается через mergedProps.
  // Renderer не интерпретирует значения — host применяет сам.
  it('passes node.styles through to component', () => {
    const recv = vi.fn();
    const Probe: Component<any> = (p) => {
      recv(p.styles);
      return null;
    };
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: {
            id: 'r',
            type: 'P',
            parentId: null,
            children: [],
            styles: { btn: 'text-red-500', label: 'font-bold' },
          },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ P: Probe }} />, container);
    expect(recv.mock.calls.at(-1)?.[0]).toEqual({ btn: 'text-red-500', label: 'font-bold' });
  });

  it('styles update reactively when schema changes', () => {
    const Probe: Component<any> = (p) => <span data-testid="p">{p.styles?.btn}</span>;
    const mk = (cls: string): ISchema => ({
      components: {
        root: 'r',
        nodes: {
          r: {
            id: 'r',
            type: 'P',
            parentId: null,
            children: [],
            styles: { btn: cls },
          },
        },
      },
    });
    const [schema, setSchema] = createSignal<ISchema>(mk('red'));
    dispose = render(() => <Renderer schema={schema()} registry={{ P: Probe }} />, container);
    expect(container.querySelector('[data-testid="p"]')?.textContent).toBe('red');
    setSchema(mk('blue'));
    expect(container.querySelector('[data-testid="p"]')?.textContent).toBe('blue');
  });
});

describe('Renderer — fallback', () => {
  it('calls custom fallback when type is unresolved', () => {
    const fb = vi.fn((_p: { type: string; nodeId: string }) => null);
    const schema: ISchema = {
      components: {
        root: 'x',
        nodes: { x: { id: 'x', type: 'ui.Missing', parentId: null, children: [] } },
      },
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ ui: {} }} fallback={fb as any} />,
      container,
    );
    expect(fb).toHaveBeenCalled();
    expect(fb.mock.calls[0][0]).toMatchObject({ type: 'ui.Missing', nodeId: 'x' });
  });

  it('DefaultFallback warns when type unresolved (no custom fallback)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const schema: ISchema = {
      components: {
        root: 'x',
        nodes: { x: { id: 'x', type: 'ui.Missing', parentId: null, children: [] } },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{}} />, container);
    expect(warn).toHaveBeenCalled();
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('cannot resolve component "ui.Missing"')),
    ).toBe(true);
  });
});

describe('Renderer — reactivity', () => {
  it('re-renders on schema change without losing the same component', () => {
    const Probe: Component<any> = (p) => <span data-testid="p">{p.label}</span>;
    const mk = (label: string): ISchema => ({
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'P', parentId: null, children: [], props: { label } } },
      },
    });
    const [schema, setSchema] = createSignal<ISchema>(mk('A'));
    dispose = render(() => <Renderer schema={schema()} registry={{ P: Probe }} />, container);
    expect(container.querySelector('[data-testid="p"]')?.textContent).toBe('A');

    setSchema(mk('B'));
    expect(container.querySelector('[data-testid="p"]')?.textContent).toBe('B');
  });

  it('reflects child additions when schema signal changes', () => {
    const Probe: Component<any> = (p) => <div data-testid={p['data-id']}>{p.children}</div>;
    const without: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'P', parentId: null, children: [], props: { 'data-id': 'root' } },
        },
      },
    };
    const withChild: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'P', parentId: null, children: ['c'], props: { 'data-id': 'root' } },
          c: {
            id: 'c',
            type: 'P',
            parentId: 'r',
            children: [],
            props: { 'data-id': 'child' },
          },
        },
      },
    };
    const [schema, setSchema] = createSignal<ISchema>(without);
    dispose = render(() => <Renderer schema={schema()} registry={{ P: Probe }} />, container);
    expect(container.querySelector('[data-testid="child"]')).toBeNull();
    setSchema(withChild);
    expect(container.querySelector('[data-testid="root"] [data-testid="child"]')).not.toBeNull();
  });
});

describe('Renderer — interactions (controlled mode)', () => {
  it('applies a single interaction.ref as wrapper around the node', () => {
    const Wrap: Component<any> = (p) => <div data-testid="wrap">{p.children}</div>;
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'W' }],
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf, W: Wrap }} />, container);
    expect(container.querySelector('[data-testid="wrap"] [data-testid="leaf"]')).not.toBeNull();
  });

  it('applies multiple interactions: first in array = outermost wrapper', () => {
    const A: Component<any> = (p) => <div data-testid="a">{p.children}</div>;
    const B: Component<any> = (p) => <div data-testid="b">{p.children}</div>;
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [
        { id: 'a', nodeId: 'r', kind: 'feature', ref: 'A' },
        { id: 'b', nodeId: 'r', kind: 'controller', ref: 'B' },
      ],
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf, A, B }} />, container);
    expect(
      container.querySelector('[data-testid="a"] > [data-testid="b"] > [data-testid="leaf"]'),
    ).not.toBeNull();
  });

  it('skips an unresolved interaction.ref with warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'Missing.Wrap' }],
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf }} />, container);
    expect(container.querySelector('[data-testid="leaf"]')).not.toBeNull();
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('"Missing.Wrap" not found in registry')),
    ).toBe(true);
  });

  it('passes interaction.props to wrapper', () => {
    const Wrap = vi.fn((p: any) => <div>{p.children}</div>);
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [
        {
          id: 'i',
          nodeId: 'r',
          kind: 'controller',
          ref: 'W',
          props: { overrides: { submit: 'login' } },
        },
      ],
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Leaf, W: Wrap as any }} />,
      container,
    );
    expect(Wrap).toHaveBeenCalled();
    expect(Wrap.mock.calls[0][0].overrides).toEqual({ submit: 'login' });
  });
});

// THE CRITICAL REGRESSION TEST.
//
// Wrapper устанавливает Context.Provider в своём scope. Inner Component читает
// useContext. Если построение inner станет жадным (build value сначала, потом
// обернуть в Wrapper) — useContext вернёт default `undefined`. Это и есть
// баг, который случится при замене createComponent → <Dynamic> или при
// «упрощении» thunk-chain. Тест ловит регрессию на уровне DOM.
describe('Renderer — thunk-chain preserves Wrapper Context (CRITICAL)', () => {
  it('inner Component sees Context provided by Wrapper interaction', () => {
    const Ctx = createContext<string | undefined>(undefined);

    const Wrap: Component<any> = (p) => <Ctx.Provider value="ctx-ok">{p.children}</Ctx.Provider>;

    const Reader: Component<any> = () => {
      const v = useContext(Ctx);
      return <span data-testid="reader">{v ?? 'NO-CTX'}</span>;
    };

    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Reader', parentId: null, children: [] } },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'W' }],
    };

    dispose = render(() => <Renderer schema={schema} registry={{ Reader, W: Wrap }} />, container);

    expect(container.querySelector('[data-testid="reader"]')?.textContent).toBe('ctx-ok');
  });

  it('multiple wrappers: leaf sees ALL ancestor Contexts (inner + outer)', () => {
    const A = createContext<string | undefined>(undefined);
    const B = createContext<string | undefined>(undefined);
    const WrapA: Component<any> = (p) => <A.Provider value="a-val">{p.children}</A.Provider>;
    const WrapB: Component<any> = (p) => <B.Provider value="b-val">{p.children}</B.Provider>;
    const Reader: Component<any> = () => {
      const a = useContext(A);
      const b = useContext(B);
      return (
        <span data-testid="reader">
          {a ?? '-'}/{b ?? '-'}
        </span>
      );
    };
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Reader', parentId: null, children: [] } },
      },
      interactions: [
        { id: 'a', nodeId: 'r', kind: 'feature', ref: 'WA' },
        { id: 'b', nodeId: 'r', kind: 'controller', ref: 'WB' },
      ],
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Reader, WA: WrapA, WB: WrapB }} />,
      container,
    );
    expect(container.querySelector('[data-testid="reader"]')?.textContent).toBe('a-val/b-val');
  });

  it('Wrapper Context propagates to nested schema-children (deep tree)', () => {
    const Ctx = createContext<string | undefined>(undefined);
    const Wrap: Component<any> = (p) => <Ctx.Provider value="deep-ctx">{p.children}</Ctx.Provider>;
    const Outer: Component<any> = (p) => <div data-testid="outer">{p.children}</div>;
    const Reader: Component<any> = () => {
      const v = useContext(Ctx);
      return <span data-testid="reader">{v ?? 'NO-CTX'}</span>;
    };
    const schema: ISchema = {
      components: {
        root: 'o',
        nodes: {
          o: { id: 'o', type: 'Outer', parentId: null, children: ['r'] },
          r: { id: 'r', type: 'Reader', parentId: 'o', children: [] },
        },
      },
      interactions: [{ id: 'i', nodeId: 'o', kind: 'controller', ref: 'W' }],
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Outer, Reader, W: Wrap }} />,
      container,
    );
    expect(container.querySelector('[data-testid="reader"]')?.textContent).toBe('deep-ctx');
  });
});

describe('Renderer — RenderMode', () => {
  it('static mode ignores interactions entirely', () => {
    const Wrap: Component<any> = (p) => <div data-testid="wrap">{p.children}</div>;
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'W' }],
    };
    dispose = render(
      () => <Renderer mode="static" schema={schema} registry={{ Leaf, W: Wrap }} />,
      container,
    );
    expect(container.querySelector('[data-testid="wrap"]')).toBeNull();
    expect(container.querySelector('[data-testid="leaf"]')).not.toBeNull();
  });

  it('controlled mode warns on inline interaction (not yet supported)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [
        { id: 'i', nodeId: 'r', kind: 'controller', inline: { initial: 'idle', states: {} } },
      ],
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf }} />, container);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('mode is "controlled"'))).toBe(true);
  });

  it('full mode still warns on inline (not implemented)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [
        { id: 'i', nodeId: 'r', kind: 'controller', inline: { initial: 'idle', states: {} } },
      ],
    };
    dispose = render(() => <Renderer mode="full" schema={schema} registry={{ Leaf }} />, container);
    expect(
      warn.mock.calls.some((c) => String(c[0]).includes('requires mode="full" (not implemented')),
    ).toBe(true);
  });
});

describe('Renderer — inline-interaction warn dedup', () => {
  // Регрессия на Slot 2 в backlog: до фикса каждый recompute мемо
  // (правка schema-signal в редакторе) флудил консоль одинаковыми warn'ами.
  it('warns at most once per interaction id across schema updates', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = (p) => <span data-testid="leaf">{p.label}</span>;
    const mk = (label: string): ISchema => ({
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'Leaf', parentId: null, children: [], props: { label } },
        },
      },
      interactions: [
        {
          id: 'i-inline',
          nodeId: 'r',
          kind: 'controller',
          inline: { initial: 'idle', states: {} },
        },
      ],
    });
    const [schema, setSchema] = createSignal<ISchema>(mk('A'));
    dispose = render(() => <Renderer schema={schema()} registry={{ Leaf }} />, container);

    const matches = () => warn.mock.calls.filter((c) => String(c[0]).includes('"i-inline"')).length;
    expect(matches()).toBe(1);

    // Triple-update schema → мемо recompute'ится трижды (interactions — новый
    // массив-ссылка каждый раз). Без дедупа было бы +3 warn'а.
    setSchema(mk('B'));
    setSchema(mk('C'));
    setSchema(mk('D'));
    expect(matches()).toBe(1);
  });

  it('does NOT warn when kind matches the wrapper __capsuleKind marker', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const Ctrl: Component<any> = (p) => <div data-testid="ctrl">{p.children}</div>;
    (Ctrl as any).__capsuleKind = 'controller';
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'C' }],
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf, C: Ctrl }} />, container);
    expect(container.querySelector('[data-testid="ctrl"] [data-testid="leaf"]')).not.toBeNull();
    expect(warn.mock.calls.some((c) => String(c[0]).includes('kind-'))).toBe(false);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('misclassifies'))).toBe(false);
  });

  it('does NOT warn when wrapper has no __capsuleKind marker (graceful skip)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    // No marker — typical case for arbitrary components.
    const Wrap: Component<any> = (p) => <div data-testid="wrap">{p.children}</div>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'feature', ref: 'W' }],
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf, W: Wrap }} />, container);
    expect(container.querySelector('[data-testid="wrap"]')).not.toBeNull();
    expect(warn.mock.calls.some((c) => String(c[0]).includes('misclassifies'))).toBe(false);
  });

  it('warns when kind mismatches __capsuleKind marker (still applies wrapper)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const Feat: Component<any> = (p) => <div data-testid="feat">{p.children}</div>;
    (Feat as any).__capsuleKind = 'feature';
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      // JSON говорит 'controller', а ref на самом деле — feature.
      interactions: [{ id: 'mismatched', nodeId: 'r', kind: 'controller', ref: 'F' }],
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf, F: Feat }} />, container);
    // Wrapper всё равно применён:
    expect(container.querySelector('[data-testid="feat"] [data-testid="leaf"]')).not.toBeNull();
    // И warn:
    expect(
      warn.mock.calls.some(
        (c) =>
          String(c[0]).includes('"mismatched"') &&
          String(c[0]).includes('kind="controller"') &&
          String(c[0]).includes('is a feature'),
      ),
    ).toBe(true);
  });

  it('kind-mismatch warn is deduped across schema updates', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = (p) => <span data-testid="leaf">{p.label}</span>;
    const Ctrl: Component<any> = (p) => <div data-testid="ctrl">{p.children}</div>;
    (Ctrl as any).__capsuleKind = 'controller';
    const mk = (label: string): ISchema => ({
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'Leaf', parentId: null, children: [], props: { label } },
        },
      },
      interactions: [{ id: 'i-mm', nodeId: 'r', kind: 'feature', ref: 'C' }],
    });
    const [schema, setSchema] = createSignal<ISchema>(mk('A'));
    dispose = render(() => <Renderer schema={schema()} registry={{ Leaf, C: Ctrl }} />, container);

    const matches = () => warn.mock.calls.filter((c) => String(c[0]).includes('"i-mm"')).length;
    expect(matches()).toBe(1);
    setSchema(mk('B'));
    setSchema(mk('C'));
    expect(matches()).toBe(1);
  });

  it('warns once per unique id (multiple inline interactions)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [
        {
          id: 'a',
          nodeId: 'r',
          kind: 'controller',
          inline: { initial: 'idle', states: {} },
        },
        {
          id: 'b',
          nodeId: 'r',
          kind: 'controller',
          inline: { initial: 'idle', states: {} },
        },
      ],
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf }} />, container);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('"a"')).length).toBe(1);
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('"b"')).length).toBe(1);
  });
});

// Slot 5 — per-node ErrorBoundary. Один кривой компонент не должен
// валить соседей, и errorFallback должен получить осмысленный контекст.
describe('Renderer — ErrorBoundary', () => {
  it('isolates errors to the failing node — siblings keep rendering', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Card: Component<any> = (p) => <div data-testid="card">{p.children}</div>;
    const Good: Component<any> = () => <span data-testid="good">ok</span>;
    const Bad: Component<any> = () => {
      throw new Error('boom');
    };
    const schema: ISchema = {
      components: {
        root: 'c',
        nodes: {
          c: { id: 'c', type: 'Card', parentId: null, children: ['g', 'b'] },
          g: { id: 'g', type: 'Good', parentId: 'c', children: [] },
          b: { id: 'b', type: 'Bad', parentId: 'c', children: [] },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Card, Good, Bad }} />, container);
    // Good — отрендерился, sibling-isolation работает.
    expect(container.querySelector('[data-testid="good"]')?.textContent).toBe('ok');
    // Default error fallback логирует error и возвращает null.
    expect(
      err.mock.calls.some((c) => String(c[0]).includes('runtime error in component "Bad"')),
    ).toBe(true);
  });

  it('calls custom errorFallback with { type, nodeId, error, reset }', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Bad: Component<any> = () => {
      throw new Error('explode');
    };
    const fb = vi.fn((p: any) => (
      <span data-testid="efb">
        err:{p.type}:{p.nodeId}
      </span>
    ));
    const schema: ISchema = {
      components: {
        root: 'x',
        nodes: { x: { id: 'x', type: 'Bad', parentId: null, children: [] } },
      },
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Bad }} errorFallback={fb as any} />,
      container,
    );
    expect(container.querySelector('[data-testid="efb"]')?.textContent).toBe('err:Bad:x');
    const arg = fb.mock.calls[0][0];
    expect(arg.type).toBe('Bad');
    expect(arg.nodeId).toBe('x');
    expect(arg.error).toBeInstanceOf(Error);
    expect((arg.error as Error).message).toBe('explode');
    expect(typeof arg.reset).toBe('function');
  });

  // Slot 6: реактивность пропов Renderer'а — host меняет мод / fallback / interactions
  // runtime и ожидает что DOM пересоберётся. Тут собраны характеризующие тесты —
  // одни проверяют что reactivity уже работает через Solid auto-wrap getter'ов,
  // другие — что сломанные пути починены.

  // Не часть ErrorBoundary suite, но пусть здесь идёт следом — обёртки тестов
  // рядом. Сразу же ниже — новый describe.
  it('errorFallback is invoked even if a wrapper interaction throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const BadWrap: Component<any> = () => {
      throw new Error('wrapper-died');
    };
    const fb = vi.fn(() => <span data-testid="efb">caught</span>);
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'W' }],
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Leaf, W: BadWrap }} errorFallback={fb as any} />,
      container,
    );
    expect(container.querySelector('[data-testid="efb"]')?.textContent).toBe('caught');
    // Leaf не успел отрендериться, потому что wrapper упал раньше — это OK,
    // boundary не пускает поддерево в DOM.
    expect(container.querySelector('[data-testid="leaf"]')).toBeNull();
  });
});

// Slot 7 — DEV-validation. Renderer переживает кривой JSON (ничего не падает),
// но warn'ит host'у через console.warn. Каждая уникальная проблема — один раз
// per Renderer instance, не флудит на schema-updates в editor'е.
describe('Renderer — DEV schema validation (Slot 7)', () => {
  it('warns when root nodeId is missing from nodes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'ghost',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf }} />, container);
    expect(
      warn.mock.calls.some(
        (c) => String(c[0]).includes('root nodeId "ghost"') && String(c[0]).includes('not found'),
      ),
    ).toBe(true);
  });

  it('warns when a child id references a missing node', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Card: Component<any> = (p) => <div data-testid="card">{p.children}</div>;
    const schema: ISchema = {
      components: {
        root: 'c',
        nodes: {
          c: { id: 'c', type: 'Card', parentId: null, children: ['ghost'] },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Card }} />, container);
    expect(
      warn.mock.calls.some(
        (c) =>
          String(c[0]).includes('node "c"') && String(c[0]).includes('missing child id "ghost"'),
      ),
    ).toBe(true);
  });

  it('warns on duplicate child ids in a node.children array', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Card: Component<any> = (p) => <div data-testid="card">{p.children}</div>;
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'c',
        nodes: {
          c: { id: 'c', type: 'Card', parentId: null, children: ['a', 'a'] },
          a: { id: 'a', type: 'Leaf', parentId: 'c', children: [] },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Card, Leaf }} />, container);
    expect(
      warn.mock.calls.some(
        (c) => String(c[0]).includes('node "c"') && String(c[0]).includes('duplicate child id "a"'),
      ),
    ).toBe(true);
  });

  it('warns when node.id does not match its key in the nodes map', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'wrong-id', type: 'Leaf', parentId: null, children: [] } },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Leaf }} />, container);
    expect(
      warn.mock.calls.some(
        (c) =>
          String(c[0]).includes('node at key "r"') && String(c[0]).includes('node.id="wrong-id"'),
      ),
    ).toBe(true);
  });

  it('does NOT warn for a valid schema', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Card: Component<any> = (p) => <div>{p.children}</div>;
    const Leaf: Component<any> = () => <span>L</span>;
    const schema: ISchema = {
      components: {
        root: 'c',
        nodes: {
          c: { id: 'c', type: 'Card', parentId: null, children: ['a'] },
          a: { id: 'a', type: 'Leaf', parentId: 'c', children: [] },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Card, Leaf }} />, container);
    // Ни одного warn'а с префиксом наших validation-сообщений.
    const validationWarns = warn.mock.calls.filter((c) => {
      const s = String(c[0]);
      return (
        s.includes('root nodeId') ||
        s.includes('missing child id') ||
        s.includes('duplicate child id') ||
        s.includes('node at key')
      );
    });
    expect(validationWarns.length).toBe(0);
  });

  it('warns are deduped across schema updates (same issue → one warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Leaf: Component<any> = (p) => <span data-testid="leaf">{p.label}</span>;
    const mk = (label: string): ISchema => ({
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'Leaf', parentId: null, children: ['ghost'], props: { label } },
        },
      },
    });
    const [schema, setSchema] = createSignal<ISchema>(mk('A'));
    dispose = render(() => <Renderer schema={schema()} registry={{ Leaf }} />, container);
    const count = () =>
      warn.mock.calls.filter((c) => String(c[0]).includes('missing child id "ghost"')).length;
    expect(count()).toBe(1);
    setSchema(mk('B'));
    setSchema(mk('C'));
    setSchema(mk('D'));
    expect(count()).toBe(1);
  });
});

describe('Renderer — runtime props reactivity (Slot 6)', () => {
  it('changing `mode` runtime: static→controlled applies interaction wrapper', () => {
    const Wrap: Component<any> = (p) => <div data-testid="wrap">{p.children}</div>;
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'W' }],
    };
    const [mode, setMode] = createSignal<RenderMode>('static');
    dispose = render(
      () => <Renderer schema={schema} mode={mode()} registry={{ Leaf, W: Wrap }} />,
      container,
    );
    // static — wrapper не применён.
    expect(container.querySelector('[data-testid="wrap"]')).toBeNull();
    expect(container.querySelector('[data-testid="leaf"]')).not.toBeNull();

    setMode('controlled');
    // controlled — wrapper появился.
    expect(container.querySelector('[data-testid="wrap"] [data-testid="leaf"]')).not.toBeNull();

    setMode('static');
    // static обратно — wrapper исчез, leaf остался.
    expect(container.querySelector('[data-testid="wrap"]')).toBeNull();
    expect(container.querySelector('[data-testid="leaf"]')).not.toBeNull();
  });

  it('adding/removing an interaction at runtime updates the wrapper chain', () => {
    const Wrap: Component<any> = (p) => <div data-testid="wrap">{p.children}</div>;
    const Leaf: Component<any> = () => <span data-testid="leaf">L</span>;
    const base: ISchema = {
      components: {
        root: 'r',
        nodes: { r: { id: 'r', type: 'Leaf', parentId: null, children: [] } },
      },
    };
    const withInteraction: ISchema = {
      ...base,
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'W' }],
    };
    const [schema, setSchema] = createSignal<ISchema>(base);
    dispose = render(() => <Renderer schema={schema()} registry={{ Leaf, W: Wrap }} />, container);
    expect(container.querySelector('[data-testid="wrap"]')).toBeNull();

    setSchema(withInteraction);
    expect(container.querySelector('[data-testid="wrap"] [data-testid="leaf"]')).not.toBeNull();

    setSchema(base);
    expect(container.querySelector('[data-testid="wrap"]')).toBeNull();
    expect(container.querySelector('[data-testid="leaf"]')).not.toBeNull();
  });

  it('changing `fallback` runtime is honored when node.type stays unresolved', () => {
    const Fb1: Component<any> = (p) => <span data-testid="fb">v1:{p.type}</span>;
    const Fb2: Component<any> = (p) => <span data-testid="fb">v2:{p.type}</span>;
    const [fb, setFb] = createSignal<Component<any>>(Fb1);
    const schema: ISchema = {
      components: {
        root: 'x',
        nodes: { x: { id: 'x', type: 'Missing', parentId: null, children: [] } },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{}} fallback={fb()} />, container);
    expect(container.querySelector('[data-testid="fb"]')?.textContent).toBe('v1:Missing');
    setFb(() => Fb2);
    expect(container.querySelector('[data-testid="fb"]')?.textContent).toBe('v2:Missing');
  });
});

// ADR 031 — editOverlay: per-node design-поверхность без замеров.
// Overlay монтируется внутрь каждой ноды как position:absolute; inset:0,
// корень ноды форсится position:relative. Ноль getBoundingClientRect/ResizeObserver.
describe('Renderer — editOverlay (ADR 031)', () => {
  // Тестовый overlay: рендерит span с data-overlay={nodeId} для проверки
  // в DOM. Хост в prod сделает box-shadow + pointer-events.
  const TestOverlay: Component<IEditOverlayProps> = (p) => (
    <div data-overlay={p.nodeId} data-testid={`overlay-${p.nodeId}`} />
  );

  it('без editOverlay — оверлеев нет, DOM не меняется (регрессия)', () => {
    const Btn: Component<any> = (p) => (
      <button data-testid="btn" type="button">
        {p.children}
      </button>
    );
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'Btn', parentId: null, children: [], props: { children: 'OK' } },
        },
      },
    };
    dispose = render(() => <Renderer schema={schema} registry={{ Btn }} />, container);
    expect(container.querySelector('[data-overlay]')).toBeNull();
    expect(container.querySelector('[data-testid="btn"]')?.textContent).toBe('OK');
  });

  it('с editOverlay — для каждой ноды монтируется overlay (число оверлеев = число нод)', () => {
    const Card: Component<any> = (p) => <div data-testid="card">{p.children}</div>;
    const Leaf: Component<any> = (p) => <span data-testid="leaf">{p.children}</span>;
    const schema: ISchema = {
      components: {
        root: 'card',
        nodes: {
          card: { id: 'card', type: 'Card', parentId: null, children: ['a', 'b'] },
          a: { id: 'a', type: 'Leaf', parentId: 'card', children: [], props: { children: 'A' } },
          b: { id: 'b', type: 'Leaf', parentId: 'card', children: [], props: { children: 'B' } },
        },
      },
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Card, Leaf }} editOverlay={TestOverlay} />,
      container,
    );
    // 3 ноды → 3 overlay
    const overlays = container.querySelectorAll('[data-overlay]');
    expect(overlays.length).toBe(3);
    // Каждому nodeId соответствует свой overlay
    const ids = Array.from(overlays).map((el) => el.getAttribute('data-overlay'));
    expect(ids).toContain('card');
    expect(ids).toContain('a');
    expect(ids).toContain('b');
  });

  it('реальный контент ноды (children/text) остаётся при наличии editOverlay', () => {
    const Card: Component<any> = (p) => <div data-testid="card">{p.children}</div>;
    const Btn: Component<any> = (p) => (
      <button data-testid="btn" type="button">
        {p.children}
      </button>
    );
    const schema: ISchema = {
      components: {
        root: 'card',
        nodes: {
          card: { id: 'card', type: 'Card', parentId: null, children: ['btn'] },
          btn: {
            id: 'btn',
            type: 'Btn',
            parentId: 'card',
            children: [],
            props: { children: 'Click' },
          },
        },
      },
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Card, Btn }} editOverlay={TestOverlay} />,
      container,
    );
    // Реальный контент на месте
    expect(container.querySelector('[data-testid="btn"]')?.textContent).toBe('Click');
    // Оверлеи присутствуют для обеих нод
    expect(container.querySelector('[data-testid="overlay-card"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="overlay-btn"]')).not.toBeNull();
  });

  it('leaf-нода (children=[], text из props.children) + overlay оба в DOM', () => {
    const Btn: Component<any> = (p) => (
      <button data-testid="btn" type="button">
        {p.children}
      </button>
    );
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'Btn', parentId: null, children: [], props: { children: 'Hi' } },
        },
      },
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Btn }} editOverlay={TestOverlay} />,
      container,
    );
    expect(container.querySelector('[data-testid="btn"]')?.textContent).toBe('Hi');
    expect(container.querySelector('[data-testid="overlay-r"]')).not.toBeNull();
  });

  it('void-нода (ui.Input) — overlay присутствует и рендер не ломается', () => {
    // Фейковый Input-компонент, рендерящий настоящий <input>. Не принимает children.
    const FakeInput: Component<any> = (p) => (
      <input data-testid="input" type="text" placeholder={p.placeholder} />
    );
    const schema: ISchema = {
      components: {
        root: 'inp',
        nodes: {
          inp: {
            id: 'inp',
            type: 'ui.Input',
            parentId: null,
            children: [],
            props: { placeholder: 'Type...' },
          },
        },
      },
    };
    dispose = render(
      () => (
        <Renderer
          schema={schema}
          registry={{ ui: { Input: FakeInput } }}
          editOverlay={TestOverlay}
        />
      ),
      container,
    );
    // Input отрендерился
    const input = container.querySelector('[data-testid="input"]');
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).placeholder).toBe('Type...');
    // Overlay тоже есть
    expect(container.querySelector('[data-testid="overlay-inp"]')).not.toBeNull();
  });

  it('void-обёртка НЕ использует display:contents (CSS-баг: не создаёт containing block)', () => {
    // Регрессионный тест на конкретную структуру DOM:
    // void-нода должна быть обёрнута в span с position:relative и display:block,
    // а НЕ display:contents (который по CSS-спеке не создаёт own box и потому
    // игнорирует position:relative — absolute overlay позиционировался бы
    // относительно ближайшего настоящего containing block, т.е. родителя).
    const FakeInput: Component<any> = () => <input data-testid="void-input" type="text" />;
    const schema: ISchema = {
      components: {
        root: 'inp',
        nodes: {
          inp: {
            id: 'inp',
            type: 'ui.Input',
            parentId: null,
            children: [],
          },
        },
      },
    };
    dispose = render(
      () => (
        <Renderer
          schema={schema}
          registry={{ ui: { Input: FakeInput } }}
          editOverlay={TestOverlay}
        />
      ),
      container,
    );
    // Overlay и Input в DOM
    const overlay = container.querySelector('[data-testid="overlay-inp"]');
    expect(overlay).not.toBeNull();
    const voidInput = container.querySelector('[data-testid="void-input"]');
    expect(voidInput).not.toBeNull();

    // Обёртка (общий родитель overlay и input) должна иметь position:relative
    // и НЕ иметь display:contents.
    const wrapper = overlay?.parentElement?.parentElement as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    // Атрибут style содержит position:relative
    expect(wrapper?.getAttribute('style')).toContain('position:relative');
    // И НЕ содержит display:contents — это был неверный паттерн
    expect(wrapper?.getAttribute('style')).not.toContain('display:contents');
    // display:block — корректный containing block
    expect(wrapper?.getAttribute('style')).toContain('display:block');
  });

  it('editOverlay ортогонален mode: static + editOverlay — overlay есть, interactions нет', () => {
    const Wrap: Component<any> = (p) => <div data-testid="wrap">{p.children}</div>;
    const Btn: Component<any> = (p) => (
      <button data-testid="btn" type="button">
        {p.children}
      </button>
    );
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'Btn', parentId: null, children: [], props: { children: 'X' } },
        },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'W' }],
    };
    dispose = render(
      () => (
        <Renderer
          schema={schema}
          registry={{ Btn, W: Wrap }}
          mode="static"
          editOverlay={TestOverlay}
        />
      ),
      container,
    );
    // static — interaction-wrapper не применён
    expect(container.querySelector('[data-testid="wrap"]')).toBeNull();
    // editOverlay работает независимо от mode
    expect(container.querySelector('[data-testid="overlay-r"]')).not.toBeNull();
    // Контент на месте
    expect(container.querySelector('[data-testid="btn"]')?.textContent).toBe('X');
  });

  it('editOverlay ортогонален mode: controlled + editOverlay — overlay есть, interaction тоже', () => {
    const Wrap: Component<any> = (p) => <div data-testid="wrap">{p.children}</div>;
    const Btn: Component<any> = (p) => (
      <button data-testid="btn" type="button">
        {p.children}
      </button>
    );
    const schema: ISchema = {
      components: {
        root: 'r',
        nodes: {
          r: { id: 'r', type: 'Btn', parentId: null, children: [], props: { children: 'X' } },
        },
      },
      interactions: [{ id: 'i', nodeId: 'r', kind: 'controller', ref: 'W' }],
    };
    dispose = render(
      () => (
        <Renderer
          schema={schema}
          registry={{ Btn, W: Wrap }}
          mode="controlled"
          editOverlay={TestOverlay}
        />
      ),
      container,
    );
    // controlled — interaction-wrapper присутствует
    expect(container.querySelector('[data-testid="wrap"]')).not.toBeNull();
    // editOverlay тоже есть
    expect(container.querySelector('[data-testid="overlay-r"]')).not.toBeNull();
    // Контент на месте
    expect(container.querySelector('[data-testid="btn"]')?.textContent).toBe('X');
  });

  it('overlay корректно передаёт nodeId: data-overlay совпадает с id ноды', () => {
    // TestOverlay (объявлен в describe) рендерит data-testid="overlay-{nodeId}".
    // Тест проверяет что nodeId в overlay совпадает с id конкретной ноды.
    // Компонент должен форвардить children, иначе overlay (инжектируемый через
    // children-prop) не попадёт в DOM-поддерево компонента.
    const Box: Component<any> = (p) => <div data-testid="box">{p.children}</div>;
    const schema: ISchema = {
      components: {
        root: 'mynode',
        nodes: {
          mynode: { id: 'mynode', type: 'Box', parentId: null, children: [] },
        },
      },
    };
    dispose = render(
      () => <Renderer schema={schema} registry={{ Box }} editOverlay={TestOverlay} />,
      container,
    );
    // TestOverlay рендерит data-overlay={p.nodeId} и data-testid="overlay-{p.nodeId}"
    expect(container.querySelector('[data-overlay="mynode"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="overlay-mynode"]')).not.toBeNull();
  });
});

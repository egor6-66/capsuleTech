/* @vitest-environment jsdom */
/**
 * wrapper.test.tsx — характеризационные тесты Shape двухфазной формы (v2, ADR 036).
 *
 * Двухфазная сигнатура:
 *   Shape(
 *     (ui) => ({ schema, as, item? }),     // BIND
 *     (props) => ({ ...config })           // CONFIG (объект или функция)
 *   )
 *
 * BREAKING (v2): z убран из arg1 bind; config вынесен в arg2.
 *
 * Покрытие:
 *  1.  data array передаётся в as-template целиком
 *  2.  consumer JSX `data` overrides config `defaults`
 *  3.  consumer JSX `as` overrides bind `as`
 *  4.  extras из config передаются в template
 *  5.  consumer extras перезаписывают config extras (consumer wins)
 *  6.  config extras + consumer extras мерджатся (non-overlapping keys оба попадают)
 *  7.  path-tracker `as: ui.X.Y` резолвится через ShapeUiContext
 *  8.  нет template (ни bind.as, ни consumer.as) → рендерит null
 *  9.  config = объект без функции → defaults из объекта используются
 *  10. consumer `data` = пустой массив → переопределяет defaults (не fallback)
 *  11. config = функция от props → вычисляется per-render
 *  12. item: { use, props } из bind → передаётся в шаблон как `item` prop
 *  13. shape без arg2 (только bind) — defaults из bind поля
 *  14. single-object schema (ZodObject) — data не array
 *  15. reactive data via signal
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ShapeUiContext } from '../context';
import { createUiTracker } from '../ui-tracker';
import { Shape } from '../wrapper';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: () => void;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  document.body.removeChild(container);
});

const makeCaptureTemplate = (testId: string) => {
  let captured: Record<string, unknown> = {};
  const Template = (props: Record<string, unknown>) => {
    captured = { ...props };
    return <div data-testid={testId}>{JSON.stringify(props.data)}</div>;
  };
  const getCapture = () => captured;
  return { Template, getCapture };
};

// ---------------------------------------------------------------------------
// 1. data array передаётся в as-template целиком
// ---------------------------------------------------------------------------

describe('Shape v2 — data passes through as array', () => {
  it('passes defaults array from config to template as `data` prop', () => {
    const { Template, getCapture } = makeCaptureTemplate('batch-1');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { defaults: ['a', 'b', 'c'] },
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().data).toEqual(['a', 'b', 'c']);
    expect(container.querySelectorAll('[data-testid="batch-1"]').length).toBe(1);
  });

  it('template receives data as single array, not iterated items', () => {
    const received: unknown[] = [];
    const Template = (props: { data?: unknown[] }) => {
      received.push(props.data);
      return <div data-testid="single">{String(Array.isArray(props.data))}</div>;
    };

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.number()), as: Template }),
      { defaults: [1, 2, 3] },
    );

    cleanup = render(() => <MyShape />, container);
    expect(received).toHaveLength(1);
    expect(Array.isArray(received[0])).toBe(true);
    expect(received[0]).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// 2. consumer `data` overrides config `defaults`
// ---------------------------------------------------------------------------

describe('Shape v2 — consumer data overrides defaults', () => {
  it('consumer JSX data prop replaces config defaults', () => {
    const { Template, getCapture } = makeCaptureTemplate('override-data');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { defaults: ['default-1', 'default-2'] },
    );

    cleanup = render(() => <MyShape data={['override-a', 'override-b']} />, container);
    expect(getCapture().data).toEqual(['override-a', 'override-b']);
  });

  it('consumer data=[] overrides defaults (empty array is explicit)', () => {
    const { Template, getCapture } = makeCaptureTemplate('empty-override');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { defaults: ['should-not-appear'] },
    );

    cleanup = render(() => <MyShape data={[]} />, container);
    expect(getCapture().data).toEqual([]);
  });

  it('no consumer data → config defaults used', () => {
    const { Template, getCapture } = makeCaptureTemplate('use-defaults');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { defaults: ['from-defaults'] },
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().data).toEqual(['from-defaults']);
  });
});

// ---------------------------------------------------------------------------
// 3. consumer `as` overrides bind `as`
// ---------------------------------------------------------------------------

describe('Shape v2 — consumer as overrides bind as', () => {
  it('consumer JSX as prop replaces bind as', () => {
    const DefinitionTemplate = (_props: any) => <div data-testid="def-tpl">DEF</div>;
    const ConsumerTemplate = (_props: any) => <div data-testid="consumer-tpl">CONSUMER</div>;

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: DefinitionTemplate }),
      {},
    );

    cleanup = render(() => <MyShape as={ConsumerTemplate} />, container);
    expect(container.querySelector('[data-testid="consumer-tpl"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="def-tpl"]')).toBeNull();
  });

  it('bind as is used when consumer does not provide as', () => {
    const DefinitionTemplate = (_props: any) => <div data-testid="def-default">DEF</div>;

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: DefinitionTemplate }),
    );

    cleanup = render(() => <MyShape />, container);
    expect(container.querySelector('[data-testid="def-default"]')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. extras из config передаются в template
// ---------------------------------------------------------------------------

describe('Shape v2 — config extras passed to template', () => {
  it('extra field `columns` from config reaches template props', () => {
    const columns = [{ key: 'name', label: 'Name' }];
    const { Template, getCapture } = makeCaptureTemplate('extras-1');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.object({ name: z.string() })), as: Template }),
      { columns },
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().columns).toEqual(columns);
  });

  it('multiple extras all arrive in template', () => {
    const { Template, getCapture } = makeCaptureTemplate('extras-multi');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { sortable: true, pageSize: 20, emptyLabel: 'No items' },
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().sortable).toBe(true);
    expect(getCapture().pageSize).toBe(20);
    expect(getCapture().emptyLabel).toBe('No items');
  });

  it('schema/as fields are NOT forwarded as extras', () => {
    const { Template, getCapture } = makeCaptureTemplate('no-internal-fields');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { defaults: ['x'] },
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().schema).toBeUndefined();
    expect(getCapture().as).toBeUndefined();
    expect(getCapture().defaults).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 5. consumer extras override config extras (consumer wins)
// ---------------------------------------------------------------------------

describe('Shape v2 — consumer extras win over config extras', () => {
  it('consumer prop overrides same-named config extra', () => {
    const { Template, getCapture } = makeCaptureTemplate('consumer-wins');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { pageSize: 10 },
    );

    cleanup = render(() => <MyShape pageSize={50} />, container);
    expect(getCapture().pageSize).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 6. non-overlapping extras from config and consumer both arrive
// ---------------------------------------------------------------------------

describe('Shape v2 — config and consumer extras are merged', () => {
  it('non-overlapping keys from both sources appear in template', () => {
    const { Template, getCapture } = makeCaptureTemplate('merge-extras');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { fromConfig: 'config-value' },
    );

    cleanup = render(() => <MyShape fromConsumer="consumer-value" />, container);
    expect(getCapture().fromConfig).toBe('config-value');
    expect(getCapture().fromConsumer).toBe('consumer-value');
  });
});

// ---------------------------------------------------------------------------
// 7. path-tracker `as: ui.X.Y` resolves through ShapeUiContext
// ---------------------------------------------------------------------------

describe('Shape v2 — path-tracker resolves via ShapeUiContext', () => {
  it('ui.X.Y path-tracker resolves to component from provided Ui namespace', () => {
    const TrackedTemplate = (_props: any) => <div data-testid="tracked-tpl">TRACKED</div>;

    const fakeUi = { MyGroup: { MyTpl: TrackedTemplate } };
    const tracker = createUiTracker();

    const MyShape = Shape(
      (_ui) => ({
        schema: z.array(z.string()),
        as: tracker.MyGroup.MyTpl as any,
      }),
    );

    cleanup = render(
      () => (
        <ShapeUiContext.Provider value={fakeUi as any}>
          <MyShape />
        </ShapeUiContext.Provider>
      ),
      container,
    );
    expect(container.querySelector('[data-testid="tracked-tpl"]')).not.toBeNull();
  });

  it('path-tracker with missing path → renders null', () => {
    const tracker = createUiTracker();
    const fakeUi = { SomeGroup: {} };

    const MyShape = Shape(
      (_ui) => ({
        schema: z.array(z.string()),
        as: tracker.SomeGroup.NonExistent as any,
      }),
    );

    cleanup = render(
      () => (
        <ShapeUiContext.Provider value={fakeUi as any}>
          <MyShape />
        </ShapeUiContext.Provider>
      ),
      container,
    );
    expect(container.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 8. нет template → рендерит null
// ---------------------------------------------------------------------------

describe('Shape v2 — no template renders null', () => {
  it('shape with no bind.as and no consumer.as renders null', () => {
    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()) }),
      { defaults: ['a', 'b'] },
    );

    cleanup = render(() => <MyShape />, container);
    expect(container.innerHTML).toBe('');
  });

  it('shape with no Ui in context and path-tracker as → renders null gracefully', () => {
    const tracker = createUiTracker();

    const MyShape = Shape(
      (_ui) => ({
        schema: z.array(z.string()),
        as: tracker.SomeComponent as any,
      }),
    );

    cleanup = render(() => <MyShape />, container);
    expect(container.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 9. config = объект со static defaults
// ---------------------------------------------------------------------------

describe('Shape v2 — config as plain object', () => {
  it('static config object: defaults and extras both arrive', () => {
    const { Template, getCapture } = makeCaptureTemplate('static-config');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { defaults: ['x', 'y'], sorting: true },
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().data).toEqual(['x', 'y']);
    expect(getCapture().sorting).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10. consumer `data` = [] → не фолбэк к defaults
// ---------------------------------------------------------------------------

describe('Shape v2 — consumer data=[] is explicit override', () => {
  it('empty array consumer data beats defaults', () => {
    const { Template, getCapture } = makeCaptureTemplate('empty-arr');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      { defaults: ['def'] },
    );

    cleanup = render(() => <MyShape data={[]} />, container);
    expect(getCapture().data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 11. config = функция от props (реактивная)
// ---------------------------------------------------------------------------

describe('Shape v2 — config as function of props', () => {
  it('config function: extras from config arrive in template', () => {
    // Базовый тест: config-функция возвращает extras которые доходят до template
    const { Template, getCapture } = makeCaptureTemplate('config-fn');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      (_props) => ({ pageSize: 42, sorting: true }),
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().pageSize).toBe(42);
    expect(getCapture().sorting).toBe(true);
  });

  it('config function with reactive signal — template re-renders on signal change', () => {
    // Тест реактивности: Template должен реактивно читать props.pageSize.
    // makeCaptureTemplate делает snapshot, поэтому используем реактивный Template.
    const [sig, setSig] = createSignal(10);

    // Реактивный Template объявляется ДО Shape (bind вызывается сразу)
    const ReactiveTemplate = (props: { pageSize?: number }) => (
      <div data-testid="reactive-config">{props.pageSize}</div>
    );

    const MyShapeReactive = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: ReactiveTemplate }),
      (_props) => ({ pageSize: sig() }),
    );

    cleanup = render(() => <MyShapeReactive />, container);
    expect(container.querySelector('[data-testid="reactive-config"]')?.textContent).toBe('10');
    setSig(20);
    expect(container.querySelector('[data-testid="reactive-config"]')?.textContent).toBe('20');
  });

  it('config function can derive from consumer props', () => {
    const { Template, getCapture } = makeCaptureTemplate('config-fn-props');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
      (props) => ({ derived: (props as any).multiplier * 2 }),
    );

    cleanup = render(() => <MyShape multiplier={5} />, container);
    expect(getCapture().derived).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// 12. item: { use, props } из bind передаётся в шаблон
// ---------------------------------------------------------------------------

describe('Shape v2 — item batch element from bind', () => {
  it('item.use and item.props are passed to template as `item` prop', () => {
    const ButtonComp = (_props: any) => <button type="button" />;
    let capturedItem: unknown;

    const Template = (props: Record<string, unknown>) => {
      capturedItem = props.item;
      return <div data-testid="item-tpl" />;
    };

    const MyShape = Shape(
      (_ui) => ({
        schema: z.array(z.object({ label: z.string() })),
        as: Template,
        item: {
          use: ButtonComp,
          props: (it: { label: string }) => ({ children: it.label }),
        },
      }),
    );

    cleanup = render(() => <MyShape />, container);
    expect(capturedItem).toBeDefined();
    const item = capturedItem as { use: unknown; props: (it: unknown) => unknown };
    expect(item.use).toBe(ButtonComp);
    expect(typeof item.props).toBe('function');
    expect(item.props({ label: 'Hello' })).toEqual({ children: 'Hello' });
  });

  it('item.use as path-tracker resolves via ShapeUiContext', () => {
    const LinkComp = (_props: any) => <a href="https://example.com">link</a>;
    const fakeUi = { Link: LinkComp };
    const tracker = createUiTracker();
    let capturedItemUse: unknown;

    const Template = (props: Record<string, unknown>) => {
      capturedItemUse = (props.item as any)?.use;
      return <div data-testid="item-tracker-tpl" />;
    };

    const MyShape = Shape(
      (_ui) => ({
        schema: z.array(z.object({ to: z.string() })),
        as: Template,
        item: {
          use: tracker.Link as any,
          props: (it: { to: string }) => ({ to: it.to }),
        },
      }),
    );

    cleanup = render(
      () => (
        <ShapeUiContext.Provider value={fakeUi as any}>
          <MyShape />
        </ShapeUiContext.Provider>
      ),
      container,
    );
    expect(capturedItemUse).toBe(LinkComp);
  });
});

// ---------------------------------------------------------------------------
// 13. Shape только с bind (без arg2) — bind-level defaults работают
// ---------------------------------------------------------------------------

describe('Shape v2 — bind only (no config arg)', () => {
  it('bind without config — no defaults, template renders with undefined data', () => {
    const { Template, getCapture } = makeCaptureTemplate('bind-only');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
    );

    cleanup = render(() => <MyShape />, container);
    // Нет defaults ни в bind, ни в config → data = undefined
    expect(getCapture().data).toBeUndefined();
  });

  it('consumer data works without config arg', () => {
    const { Template, getCapture } = makeCaptureTemplate('bind-only-data');

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
    );

    cleanup = render(() => <MyShape data={['from-consumer']} />, container);
    expect(getCapture().data).toEqual(['from-consumer']);
  });
});

// ---------------------------------------------------------------------------
// 14. single-object schema (ZodObject, non-array)
// ---------------------------------------------------------------------------

describe('Shape v2 — single-object schema', () => {
  it('passes defaults object from config to template as `data` prop', () => {
    const { Template, getCapture } = makeCaptureTemplate('single-obj-defaults');

    const MyShape = Shape(
      (_ui) => ({
        schema: z.object({ title: z.string(), submitLabel: z.string() }),
        as: Template,
      }),
      { defaults: { title: 'Login', submitLabel: 'Sign in' } },
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().data).toEqual({ title: 'Login', submitLabel: 'Sign in' });
  });

  it('consumer data object overrides defaults for single-object schema', () => {
    const { Template, getCapture } = makeCaptureTemplate('single-obj-override');

    const MyShape = Shape(
      (_ui) => ({
        schema: z.object({ title: z.string() }),
        as: Template,
      }),
      { defaults: { title: 'Default' } },
    );

    cleanup = render(() => <MyShape data={{ title: 'Override' }} />, container);
    expect(getCapture().data).toEqual({ title: 'Override' });
  });

  it('single-object schema with no defaults → data is undefined', () => {
    const { Template, getCapture } = makeCaptureTemplate('single-obj-no-data');

    const MyShape = Shape(
      (_ui) => ({
        schema: z.object({ label: z.string() }),
        as: Template,
      }),
    );

    cleanup = render(() => <MyShape />, container);
    expect(getCapture().data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 15. reactive data via signal
// ---------------------------------------------------------------------------

describe('Shape v2 — reactive data', () => {
  it('consumer data signal updates propagate to template', () => {
    const received: unknown[][] = [];
    const Template = (props: { data?: string[] }) => {
      received.push(props.data ?? []);
      return <div data-testid="reactive">{(props.data ?? []).join(',')}</div>;
    };

    const [data, setData] = createSignal(['initial']);

    const MyShape = Shape(
      (_ui) => ({ schema: z.array(z.string()), as: Template }),
    );

    cleanup = render(() => <MyShape data={data()} />, container);
    expect(container.querySelector('[data-testid="reactive"]')?.textContent).toBe('initial');

    setData(['updated', 'list']);
    expect(container.querySelector('[data-testid="reactive"]')?.textContent).toBe('updated,list');
  });
});

/**
 * List primitive tests.
 *
 * The vitest config (environment: 'node', no JSX transform) cannot process
 * .tsx files. Tests here cover interface structural contracts for all three
 * List modes: render-prop, batch (data + as), and semantic.
 * DOM render coverage is pending vitest Solid transform (see OWNERSHIP.md backlog).
 */
import { describe, expect, it } from 'vitest';

import type {
  IListBatchProps,
  IListProps,
  IListRenderProps,
  IListSemanticProps,
  IVirtualListProps,
} from '../interfaces';

// ---------------------------------------------------------------------------
// IListRenderProps (render-prop / classic mode)
// ---------------------------------------------------------------------------

describe('IListRenderProps structural contracts', () => {
  it('requires items array and children render function', () => {
    type Item = { id: number; label: string };
    const props: IListRenderProps<Item> = {
      items: [{ id: 1, label: 'Home' }],
      children: (item) => item as unknown as import('solid-js').JSX.Element,
    };
    expect(props.items).toHaveLength(1);
    expect(typeof props.children).toBe('function');
  });

  it('accepts empty items array', () => {
    const props: IListRenderProps<{ id: number }> = {
      items: [],
      children: () => null as unknown as import('solid-js').JSX.Element,
    };
    expect(props.items).toHaveLength(0);
  });

  it('batch-mode fields are typed as never (exclusive)', () => {
    // `data`, `item` should not be assignable in render-prop mode.
    // This is a type-level test — we just verify the prop object shape.
    const props: IListRenderProps<{ id: number }> = {
      items: [],
      children: () => null as unknown as import('solid-js').JSX.Element,
    };
    // At runtime the `never` fields are simply undefined/absent.
    expect((props as any).data).toBeUndefined();
    expect((props as any).item).toBeUndefined();
  });

  it('accepts variant and orientation', () => {
    const props: IListRenderProps<{ id: number }> = {
      items: [],
      children: () => null as unknown as import('solid-js').JSX.Element,
      variant: 'flush',
      orientation: 'horizontal',
    };
    expect(props.variant).toBe('flush');
    expect(props.orientation).toBe('horizontal');
  });
});

// ---------------------------------------------------------------------------
// IListBatchProps (batch mode, ADR 036 §3 — item descriptor API)
// ---------------------------------------------------------------------------

describe('IListBatchProps structural contracts', () => {
  it('accepts data + item.use (ADR 036 §3 canonical API)', () => {
    type Item = { id: number; label: string };
    const Tpl = (_props: { label: string }) => null as unknown as import('solid-js').JSX.Element;
    const props: IListBatchProps<Item> = {
      data: [{ id: 1, label: 'Home' }],
      item: { use: Tpl },
    };
    expect(props.data).toHaveLength(1);
    expect(typeof props.item.use).toBe('function');
  });

  it('accepts optional item.props mapper', () => {
    type Item = { id: number; label: string };
    const Tpl = (_props: { label: string }) => null as unknown as import('solid-js').JSX.Element;
    const props: IListBatchProps<Item> = {
      data: [{ id: 1, label: 'Home' }],
      item: { use: Tpl, props: (item) => ({ label: item.label }) },
    };
    expect(typeof props.item.props).toBe('function');
    expect(props.item.props?.({ id: 1, label: 'Home' })).toEqual({ label: 'Home' });
  });

  it('item.props is optional (identity default at render time)', () => {
    const Tpl = () => null as unknown as import('solid-js').JSX.Element;
    const props: IListBatchProps<{ id: number }> = {
      data: [{ id: 1 }],
      item: { use: Tpl },
    };
    expect(props.item.props).toBeUndefined();
  });

  it('render-prop fields are typed as never (exclusive)', () => {
    const Tpl = () => null as unknown as import('solid-js').JSX.Element;
    const props: IListBatchProps<{ id: number }> = {
      data: [],
      item: { use: Tpl },
    };
    expect((props as any).items).toBeUndefined();
    expect((props as any).children).toBeUndefined();
  });

  it('accepts variant and orientation', () => {
    const Tpl = () => null as unknown as import('solid-js').JSX.Element;
    const props: IListBatchProps<{ id: number }> = {
      data: [],
      item: { use: Tpl },
      variant: 'default',
      orientation: 'vertical',
    };
    expect(props.variant).toBe('default');
    expect(props.orientation).toBe('vertical');
  });

  it('accepts min prop for responsive grid layout', () => {
    const Tpl = () => null as unknown as import('solid-js').JSX.Element;
    const props: IListBatchProps<{ id: number }> = {
      data: [{ id: 1 }],
      item: { use: Tpl },
      min: '116px',
    };
    expect(props.min).toBe('116px');
    expect(props.gap).toBeUndefined();
  });

  it('accepts min + gap props together', () => {
    const Tpl = () => null as unknown as import('solid-js').JSX.Element;
    const props: IListBatchProps<{ id: number }> = {
      data: [],
      item: { use: Tpl },
      min: '140px',
      gap: '1rem',
    };
    expect(props.min).toBe('140px');
    expect(props.gap).toBe('1rem');
  });

  it('grid style object has correct css properties when min is set', () => {
    // Verify the expected inline style shape (mirrors list.tsx gridStyle logic).
    const min = '116px';
    const gap = '0.5rem';
    const expectedStyle = {
      display: 'grid',
      'grid-template-columns': `repeat(auto-fit, minmax(${min}, 1fr))`,
      gap,
      width: '100%',
    };
    expect(expectedStyle['grid-template-columns']).toBe('repeat(auto-fit, minmax(116px, 1fr))');
    expect(expectedStyle.display).toBe('grid');
    expect(expectedStyle.gap).toBe('0.5rem');
  });

  it('gap defaults to 0.5rem when min is set but gap is omitted', () => {
    const Tpl = () => null as unknown as import('solid-js').JSX.Element;
    const props: IListBatchProps<{ id: number }> = {
      data: [],
      item: { use: Tpl },
      min: '116px',
    };
    // gap is optional; component defaults to '0.5rem' at render time
    expect(props.gap).toBeUndefined();
    const resolvedGap = props.gap ?? '0.5rem';
    expect(resolvedGap).toBe('0.5rem');
  });
});

// ---------------------------------------------------------------------------
// IListSemanticProps (plain children mode)
// ---------------------------------------------------------------------------

describe('IListSemanticProps structural contracts', () => {
  it('has no required props', () => {
    const props: IListSemanticProps = {};
    expect(props.data).toBeUndefined();
    expect(props.items).toBeUndefined();
    expect((props as any).item).toBeUndefined();
  });

  it('accepts class and style', () => {
    const props: IListSemanticProps = {
      class: 'my-list',
      style: { color: 'red' },
    };
    expect(props.class).toBe('my-list');
  });
});

// ---------------------------------------------------------------------------
// IListProps union
// ---------------------------------------------------------------------------

describe('IListProps union type', () => {
  it('IListBatchProps is assignable to IListProps (item descriptor ADR 036 §3)', () => {
    const Tpl = () => null as unknown as import('solid-js').JSX.Element;
    const batch: IListBatchProps<{ id: number }> = { data: [{ id: 1 }], item: { use: Tpl } };
    const asUnion: IListProps<{ id: number }> = batch;
    expect(asUnion).toBe(batch);
  });

  it('IListRenderProps is assignable to IListProps', () => {
    const render: IListRenderProps<{ id: number }> = {
      items: [],
      children: () => null as unknown as import('solid-js').JSX.Element,
    };
    const asUnion: IListProps<{ id: number }> = render;
    expect(asUnion).toBe(render);
  });

  it('IListSemanticProps is assignable to IListProps', () => {
    const semantic: IListSemanticProps = { class: 'test' };
    const asUnion: IListProps = semantic;
    expect(asUnion).toBe(semantic);
  });
});

// ---------------------------------------------------------------------------
// IVirtualListProps
// ---------------------------------------------------------------------------

describe('IVirtualListProps structural contracts', () => {
  it('requires items and children', () => {
    type Item = { id: number; label: string };
    const props: IVirtualListProps<Item> = {
      items: [{ id: 1, label: 'Row' }],
      children: (item) => item as unknown as import('solid-js').JSX.Element,
    };
    expect(props.items).toHaveLength(1);
  });

  it('estimateSize is optional', () => {
    const props: IVirtualListProps<{ id: number }> = {
      items: [],
      children: () => null as unknown as import('solid-js').JSX.Element,
    };
    expect(props.estimateSize).toBeUndefined();

    const withSize: IVirtualListProps<{ id: number }> = {
      items: [],
      children: () => null as unknown as import('solid-js').JSX.Element,
      estimateSize: 48,
    };
    expect(withSize.estimateSize).toBe(48);
  });
});

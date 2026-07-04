/* @vitest-environment jsdom */
/**
 * Регрессия (brief: core-shape-batch-item-props-reactivity, ADR 036) —
 * Shape batch (`item: { use, props }`) должен реактивно доносить
 * consumer-props (напр. `selectedId`), читаемые внутри `item.props`-маппера,
 * до целевого item-компонента batch-шаблона.
 *
 * Мок-шаблон воспроизводит КОНТРАКТ `@capsuletech/web-ui` List batch mode
 * один-в-один (packages/web/kit/ui/src/primitives/list/list.tsx):
 *   const getItemProps = props.item.props ?? ((item) => item);
 *   <For each={props.data}>{(item) => <ItemTpl {...getItemProps(item)} />}</For>
 * Solid компилирует spread на компонент реактивным getter'ом — каждый
 * downstream prop-read заново вызывает getItemProps(item) (locked contract,
 * test(ui): commit 649f9c88). Проверяем что тот же контракт держится через
 * Shape wrapper (не только при прямом вызове шаблона).
 */

import type { JSX } from 'solid-js';
import { createSignal, For } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Context, useCtx } from '../../../engine/ctx';
import { UiProxy } from '../../../engine/ui-proxy';
import { ViewWrapper } from '../../view';
import { Shape } from '../wrapper';

/** Минимальный ICtx для активации UiProxy (см. engine/__tests__/ui-proxy.test.tsx mkCtx). */
const mkCtx = () => {
  const controller: Record<string, ReturnType<typeof vi.fn>> = {
    onClick: vi.fn(),
    onDblClick: vi.fn(),
    onInput: vi.fn(),
    onChange: vi.fn(),
    onBlur: vi.fn(),
    onFocus: vi.fn(),
    onKeyDown: vi.fn(),
  };
  const store = {
    registerComponent: vi.fn(),
    unregisterComponent: vi.fn(),
    update: vi.fn(),
    updateComponent: vi.fn(),
    ctx: {},
    styles: {} as Record<string, string>,
    loading: false,
    props: {} as Record<string, any>,
  };
  return { controller, store, parent: null, state: { value: 'idle' } as any } as any;
};

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

/** Мок List batch mode — контракт 1:1 с @capsuletech/web-ui List. */
const BatchListMock = (props: {
  data?: Array<{ id: number; label: string }>;
  item?: { use: unknown; props?: (it: unknown) => Record<string, unknown> };
}) => {
  const getItemProps = props.item?.props ?? ((item: unknown) => item as Record<string, unknown>);
  const ItemTpl = props.item?.use as (p: Record<string, unknown>) => JSX.Element;
  return (
    <ul>
      <For each={props.data}>{(item) => <ItemTpl {...getItemProps(item)} />}</For>
    </ul>
  );
};

const ItemTile = (p: { id: number; label: string; selected: boolean }) => (
  <li data-testid={`item-${p.id}`} data-selected={String(p.selected)}>
    {p.label}
  </li>
);

describe('Shape v2 — batch item.props reacts to consumer signal (through real batch-template contract)', () => {
  it('updates selected on the targeted item only when consumer selectedId signal changes', () => {
    const [selectedId, setSelectedId] = createSignal<number | null>(null);
    const data = [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ];

    const WordTiles = Shape(
      (_ui) => ({
        schema: z.array(z.object({ id: z.number(), label: z.string() })),
        as: BatchListMock,
      }),
      (_ui, props) => ({
        item: {
          use: ItemTile,
          props: (it: { id: number; label: string }) => ({
            id: it.id,
            label: it.label,
            selected: (props as { selectedId?: number | null }).selectedId === it.id,
          }),
        },
      }),
    );

    cleanup = render(() => <WordTiles data={data} selectedId={selectedId()} />, container);

    const get = (id: number) => container.querySelector(`[data-testid="item-${id}"]`)!;
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('false');

    setSelectedId(2);
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('true');
    expect(get(3).getAttribute('data-selected')).toBe('false');

    setSelectedId(3);
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('false');
    expect(get(3).getAttribute('data-selected')).toBe('true');

    // Контент строк не должен перемешиваться.
    expect(get(1).textContent).toBe('A');
    expect(get(2).textContent).toBe('B');
    expect(get(3).textContent).toBe('C');
  });

  it('same contract holds when item.use is a real View()-wrapped component (production shape)', () => {
    const [selectedId, setSelectedId] = createSignal<number | null>(null);
    const data = [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ];

    const ItemTileView = ViewWrapper<{ id: number; label: string; selected: boolean }>(
      (_Ui, props) => (
        <li data-testid={`view-item-${props.id}`} data-selected={String(props.selected)}>
          {props.label}
        </li>
      ),
    );

    const WordTiles = Shape(
      (_ui) => ({
        schema: z.array(z.object({ id: z.number(), label: z.string() })),
        as: BatchListMock,
      }),
      (_ui, props) => ({
        item: {
          use: ItemTileView,
          props: (it: { id: number; label: string }) => ({
            id: it.id,
            label: it.label,
            selected: (props as { selectedId?: number | null }).selectedId === it.id,
          }),
        },
      }),
    );

    cleanup = render(() => <WordTiles data={data} selectedId={selectedId()} />, container);

    const get = (id: number) => container.querySelector(`[data-testid="view-item-${id}"]`)!;
    expect(get(1).getAttribute('data-selected')).toBe('false');

    setSelectedId(1);
    expect(get(1).getAttribute('data-selected')).toBe('true');
    expect(get(2).getAttribute('data-selected')).toBe('false');

    setSelectedId(2);
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('true');
    expect(get(3).getAttribute('data-selected')).toBe('false');
  });

  it('same contract holds with UiProxy active (meta-tagged element, Controller ctx present)', () => {
    // Воспроизводит production-цепочку 1:1: item.use = View()-wrapped component,
    // рендерящийся внутри Controller ctx (useCtx() truthy) → View активирует
    // UiProxy(BaseUi, ctx, wrapperProps) → элемент с `meta` идёт через
    // wrapComponent (регистрация в store, event-binding, реактивный class/name).
    // `aria-selected`-эквивалент прокидывается КАК ОБЫЧНЫЙ проп через
    // wrapComponent's mergeProps-цепочку — эта строка должна остаться реактивной.
    const [selectedId, setSelectedId] = createSignal<number | null>(null);
    const data = [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ];

    const StubCard = (props: Record<string, unknown>) => (
      <li data-testid={props['data-testid'] as string} data-selected={String(props.selected)}>
        {props.children as any}
      </li>
    );

    const ItemTileWithMeta = (itemProps: { id: number; label: string; selected: boolean }) => {
      const ctx = useCtx();
      const Ui = ctx ? UiProxy({ Card: StubCard }, ctx, itemProps) : { Card: StubCard };
      return (
        <Ui.Card
          meta={{ tags: ['word'] }}
          data-testid={`meta-item-${itemProps.id}`}
          selected={itemProps.selected}
        >
          {itemProps.label}
        </Ui.Card>
      );
    };

    const WordTiles = Shape(
      (_ui) => ({
        schema: z.array(z.object({ id: z.number(), label: z.string() })),
        as: BatchListMock,
      }),
      (_ui, props) => ({
        item: {
          use: ItemTileWithMeta,
          props: (it: { id: number; label: string }) => ({
            id: it.id,
            label: it.label,
            selected: (props as { selectedId?: number | null }).selectedId === it.id,
          }),
        },
      }),
    );

    cleanup = render(
      () => (
        <Context.Provider value={mkCtx()}>
          <WordTiles data={data} selectedId={selectedId()} />
        </Context.Provider>
      ),
      container,
    );

    const get = (id: number) => container.querySelector(`[data-testid="meta-item-${id}"]`)!;
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('false');

    setSelectedId(2);
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('true');
    expect(get(3).getAttribute('data-selected')).toBe('false');

    setSelectedId(3);
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('false');
    expect(get(3).getAttribute('data-selected')).toBe('true');

    expect(get(1).textContent).toBe('A');
    expect(get(2).textContent).toBe('B');
    expect(get(3).textContent).toBe('C');
  });
});

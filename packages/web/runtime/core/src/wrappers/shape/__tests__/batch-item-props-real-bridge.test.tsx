/* @vitest-environment jsdom */
/**
 * Регрессия ROUND 2 (brief: core-shape-real-list-bridge-repro, ADR 036/062).
 *
 * Раунд 1 (batch-item-props-reactivity.test.tsx) исключил mergeProps-item-identity
 * гипотезу через 3 реконструкции — но все на `createSignal` и БЕЗ реального
 * `@capsuletech/web-ui` List. Этот файл закрывает обе непокрытые оси разом:
 *
 *  1. Источник состояния — РЕАЛЬНЫЙ Bridge (XState через `createLogicWrapper`),
 *     не `createSignal`: `Feature(context: {senses, selectedId})` →
 *     `store.update({selectedId})` → `@xstate/solid` reconcile → Widget-getter
 *     `store.ctx.data.selectedId` → JSX-prop в Shape. Продовая цепочка 1:1
 *     (apps/learn Widgets.Library.Words).
 *  2. Реальный `ui.List` из `@capsuletech/web-ui` (не мок), режим `wrap: true`
 *     (свежий бранч list.tsx, commit 8151cfa9 — flex-wrap layout, добавлен
 *     ПОСЛЕ owner-ui реактивных тестов).
 *
 * `@capsuletech/web-router` замокан (как в wrappers-trace.test.tsx) — LogicWrapper
 * зовёт `useRouter()` безусловно на рендере, а RouterProvider тут не поднимается.
 */

vi.mock('@capsuletech/web-router', () => ({
  useRouter: () => ({ goTo: () => {}, back: () => {}, current: () => '/', raw: {} }),
  CapsuleOutlet: () => null,
}));

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FeatureWrapper } from '../../feature';
import { ViewWrapper } from '../../view';
import { WidgetWrapper } from '../../widget';
import { Shape } from '../wrapper';

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

describe('Shape v2 — real Bridge (XState) + real @capsuletech/web-ui List (wrap mode)', () => {
  it('data-selected moves to the store.update-targeted tile; old tile un-selects, content stable', () => {
    const data = [
      { id: 1, label: 'A' },
      { id: 2, label: 'B' },
      { id: 3, label: 'C' },
    ];

    let capturedStore: any;

    const WordTileView = ViewWrapper<{ id: number; label: string; selected: boolean }>(
      (_Ui, props) => (
        <li data-testid={`rt-item-${props.id}`} data-selected={String(props.selected)}>
          {props.label}
        </li>
      ),
    );

    // Продовый Shape (apps/learn Shapes.WordTiles): bind.as = реальный ui.List,
    // config.item.props читает consumer-prop selectedId лениво внутри маппера.
    const WordTiles = Shape(
      (ui) => ({
        schema: z.array(z.object({ id: z.number(), label: z.string() })),
        as: ui.List,
      }),
      (_ui, props) => ({
        item: {
          use: WordTileView,
          props: (it: { id: number; label: string }) => ({
            id: it.id,
            label: it.label,
            selected: (props as { selectedId?: number | null }).selectedId === it.id,
          }),
        },
        wrap: true,
      }),
    );

    // Продовый Widget (apps/learn Widgets.Library.Words): store 2-м аргументом,
    // getters читают store.ctx.data.
    const Words = WidgetWrapper((_Ui, store) => {
      capturedStore = store;
      const senses = () => ((store?.ctx as any)?.data?.senses as typeof data) ?? [];
      const selectedId = () => ((store?.ctx as any)?.data?.selectedId as number | null) ?? null;
      return <WordTiles data={senses()} selectedId={selectedId()} />;
    });

    // Продовый Feature (apps/learn Features.Library): реальный XState через createLogicWrapper.
    const LibraryFeature = FeatureWrapper(() => ({
      initial: 'idle',
      context: { senses: data, selectedId: null as number | null },
      states: { idle: {} },
    }));

    cleanup = render(
      () => (
        <LibraryFeature>
          <Words />
        </LibraryFeature>
      ),
      container,
    );

    const get = (id: number) => container.querySelector(`[data-testid="rt-item-${id}"]`)!;
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('false');
    expect(get(3).getAttribute('data-selected')).toBe('false');

    // Клик #1 (симулирован через store.update — идентично Controller onClick → Feature dispatch).
    capturedStore.update({ selectedId: 2 });
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('true');
    expect(get(3).getAttribute('data-selected')).toBe('false');

    // Клик #2 — подсветка должна ПЕРЕЕХАТЬ, не залипнуть на первом выбранном.
    capturedStore.update({ selectedId: 3 });
    expect(get(1).getAttribute('data-selected')).toBe('false');
    expect(get(2).getAttribute('data-selected')).toBe('false');
    expect(get(3).getAttribute('data-selected')).toBe('true');

    // Клик #3 — назад на первый тайл.
    capturedStore.update({ selectedId: 1 });
    expect(get(1).getAttribute('data-selected')).toBe('true');
    expect(get(2).getAttribute('data-selected')).toBe('false');
    expect(get(3).getAttribute('data-selected')).toBe('false');

    // Контент строк не должен перемешиваться ни на одном шаге.
    expect(get(1).textContent).toBe('A');
    expect(get(2).textContent).toBe('B');
    expect(get(3).textContent).toBe('C');
  });
});

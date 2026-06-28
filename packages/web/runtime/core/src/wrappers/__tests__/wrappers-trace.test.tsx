/* @vitest-environment jsdom */
/**
 * wrappers-trace.test.tsx
 *
 * ADR 062 — каждая layer-обёртка эмиттит постоянный mount/dispose-трейс под
 * своим node (`web-core.view` / `.widget` / `.shape` / `.controller` / `.feature`;
 * Page покрыт отдельно в page-trace.test.tsx). `id` (createUniqueId) парит
 * mount↔dispose. Любой будущий дубль/leak слоя виден в одном дампе без ручной
 * бисекции — урок bug A (см. brief-trace-all-layer-wrappers).
 *
 * Мокаем `@capsuletech/web-profiler/trace` единым шпионом (его импортируют все
 * обёртки) и `@capsuletech/web-router` useRouter (logic-wrapper зовёт его
 * безусловно на рендере).
 */

const { traceSpy } = vi.hoisted(() => ({ traceSpy: vi.fn() }));

vi.mock('@capsuletech/web-profiler/trace', () => ({
  trace: (node: string, phase: string, data?: unknown) => traceSpy(node, phase, data),
}));

vi.mock('@capsuletech/web-router', () => ({
  useRouter: () => ({ goTo: () => {}, back: () => {}, current: () => '/', raw: {} }),
  // CapsuleOutlet импортируется как value в widget.tsx/page.tsx, но не рендерится
  // в этих тестах — заглушка достаточна.
  CapsuleOutlet: () => null,
}));

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ControllerWrapper } from '../controller';
import { FeatureWrapper } from '../feature';
import { ShapeUiContext } from '../shape';
import { Shape } from '../shape/wrapper';
import { ViewWrapper } from '../view';
import { WidgetWrapper } from '../widget';

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
  traceSpy.mockClear();
});

/** Возвращает { id } последнего mount-вызова для node, либо undefined. */
const mountIdFor = (node: string): string | undefined => {
  const call = [...traceSpy.mock.calls]
    .reverse()
    .find(([n, phase]) => n === node && phase === 'mount');
  return (call?.[2] as { id?: string } | undefined)?.id;
};

const phasesFor = (node: string): string[] =>
  traceSpy.mock.calls.filter(([n]) => n === node).map(([, phase]) => phase as string);

describe('layer wrappers — mount/dispose trace (ADR 062)', () => {
  it('View эмиттит web-core.view mount + парный dispose с тем же id', () => {
    const V = ViewWrapper(() => <div data-testid="v">v</div>);
    cleanup = render(() => <V />, container);

    const id = mountIdFor('web-core.view');
    expect(id).toEqual(expect.any(String));

    cleanup();
    cleanup = undefined;
    expect(traceSpy).toHaveBeenCalledWith('web-core.view', 'dispose', { id });
  });

  it('Widget эмиттит web-core.widget mount + парный dispose с тем же id', () => {
    const W = WidgetWrapper(() => <div data-testid="w">w</div>);
    cleanup = render(() => <W>{null}</W>, container);

    const id = mountIdFor('web-core.widget');
    expect(id).toEqual(expect.any(String));

    cleanup();
    cleanup = undefined;
    expect(traceSpy).toHaveBeenCalledWith('web-core.widget', 'dispose', { id });
  });

  it('Shape эмиттит web-core.shape mount + парный dispose с тем же id', () => {
    const Sh = Shape(
      () => ({ schema: z.object({ x: z.string() }), as: undefined }),
      () => ({}),
    ) as any;
    cleanup = render(
      () => <ShapeUiContext.Provider value={{} as any}>{Sh({})}</ShapeUiContext.Provider>,
      container,
    );

    const id = mountIdFor('web-core.shape');
    expect(id).toEqual(expect.any(String));

    cleanup();
    cleanup = undefined;
    expect(traceSpy).toHaveBeenCalledWith('web-core.shape', 'dispose', { id });
  });

  it('Controller эмиттит web-core.controller mount + парный dispose с тем же id', () => {
    const Ctl = ControllerWrapper(() => ({ initial: 'idle', states: { idle: {} } })) as any;
    cleanup = render(() => <Ctl>{null}</Ctl>, container);

    const id = mountIdFor('web-core.controller');
    expect(id).toEqual(expect.any(String));

    cleanup();
    cleanup = undefined;
    expect(traceSpy).toHaveBeenCalledWith('web-core.controller', 'dispose', { id });
  });

  it('Feature эмиттит web-core.feature mount + парный dispose с тем же id', () => {
    const Feat = FeatureWrapper(() => ({ initial: 'idle', states: { idle: {} } })) as any;
    cleanup = render(() => <Feat>{null}</Feat>, container);

    const id = mountIdFor('web-core.feature');
    expect(id).toEqual(expect.any(String));

    cleanup();
    cleanup = undefined;
    expect(traceSpy).toHaveBeenCalledWith('web-core.feature', 'dispose', { id });
  });

  it('каждый узел даёт ровно одну пару mount/dispose на инстанс', () => {
    const V = ViewWrapper(() => <div>v</div>);
    cleanup = render(() => <V />, container);
    cleanup();
    cleanup = undefined;
    expect(phasesFor('web-core.view')).toEqual(['mount', 'dispose']);
  });
});

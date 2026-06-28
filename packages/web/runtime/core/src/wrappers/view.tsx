import { trace } from '@capsuletech/web-profiler/trace';
import { createUniqueId, onCleanup } from 'solid-js';
import { useCtx } from '../engine/ctx';
import { UiProxy } from '../engine/ui-proxy';
import { Ui as BaseUi } from '../ui-kit';
import type { IViewWrapper } from './interfaces';
import { ShapeUiContext } from './shape';

export const ViewWrapper: IViewWrapper = (Component) => {
  return function View(wrapperProps) {
    // ADR 062 — постоянная trace-инструментация жизненного цикла View-инстанса
    // (per-mount; `id` парит mount↔dispose). No-op когда trace-канал off.
    const __traceId = createUniqueId();
    trace('web-core.view', 'mount', { id: __traceId });
    onCleanup(() => trace('web-core.view', 'dispose', { id: __traceId }));

    const ctx = useCtx();

    // A-4: View вне Controller-tree — UiProxy не активируется, никакая meta
    // не регистрируется в store и не получает event-binding. Это разрешённый
    // случай (View может рендериться, например, в Storybook), но для
    // user-кода это обычно ошибка интеграции. DEV-only warn.
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV && !ctx) {
      console.warn(
        '[View] rendered outside of Controller — UiProxy is disabled, ' +
          'any meta-tagged elements in this subtree will be decorative ' +
          '(no event binding, no store registration).',
      );
    }

    const Ui = ctx ? UiProxy(BaseUi, ctx, wrapperProps) : BaseUi;
    return (
      <ShapeUiContext.Provider value={Ui as any}>
        {Component(Ui as any, wrapperProps)}
      </ShapeUiContext.Provider>
    );
  };
};

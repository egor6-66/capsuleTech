// Outlet — capsule-обёртка над TanStack <Outlet/> через @capsuletech/web-router.
// CapsuleOutlet владеет view-transition-name: capsule-content-${depth} через
// DepthContext.Provider (ADR 046 Decision 4). Каждый Outlet-уровень получает
// уникальный vt-name → нативный View Transitions API анимирует сегменты
// независимо: смена под-роута на глубине N не триггерит анимацию у родителей.
// Имя `Ui.Outlet` для consumer'ов сохраняется (re-export через alias).
import { trace } from '@capsuletech/web-profiler/trace';
import { CapsuleOutlet as Outlet } from '@capsuletech/web-router';
import { createUniqueId, onCleanup } from 'solid-js';
import { useCtx } from '../engine/ctx';
import { UiProxy } from '../engine/ui-proxy';
import { Ui as BaseUi } from '../ui-kit';
import type { IPageWrapper } from './interfaces';
import { ShapeUiContext } from './shape';

export const PageWrapper: IPageWrapper = (Component) => {
  return function Page(wrapperProps) {
    // ADR 062 — постоянная trace-инструментация жизненного цикла leaf-Page.
    // Срабатывает per-mount (тело Solid-компонента исполняется один раз на инстанс),
    // `id` парит mount↔dispose. No-op когда trace-канал выключен (быстрый return
    // в самом `trace` до сборки события). Эта точка — единственный узел между
    // router.route (CapsuleOutlet трейсит OUTLET-контейнер) и слотами Matrix;
    // позволяет различить «Page-leaf инстанцируется дважды сверху» vs «двоит ниже».
    const __traceId = createUniqueId();
    trace('web-core.page', 'mount', { id: __traceId });
    onCleanup(() => trace('web-core.page', 'dispose', { id: __traceId }));

    const ctx = useCtx();
    const store = ctx?.store;
    const rawUi = {
      ...(BaseUi as any),
      Layout: (BaseUi as any).Layout,
      Outlet,
    } as any;
    // Mirror view.tsx: wrap through UiProxy when inside a Controller-tree.
    // Pages are typically root-level (no Controller parent), so ctx is usually
    // undefined and rawUi passes through — but the proxy must be available for
    // the rare case of a Page rendered inside a Controller subtree.
    const proxiedUi = ctx ? UiProxy(rawUi, ctx, wrapperProps) : rawUi;
    return (
      <ShapeUiContext.Provider value={proxiedUi}>
        {(Component as import('./interfaces').IPageRenderer)(proxiedUi, store, wrapperProps)}
      </ShapeUiContext.Provider>
    );
  };
};

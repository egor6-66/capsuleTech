import { useLayoutMode } from '@capsuletech/web-style';

/**
 * Dashboard (`/workspace/dashboard`) — основной операционный экран EWC.
 *
 * Содержит то, что раньше жило прямо в `/workspace`: таблица вызовов,
 * sidebar-инфо и карта. Workspace shell (см. `../index.tsx`) теперь только
 * предоставляет header + main=Outlet, а сама работа происходит здесь.
 *
 * Matrix preset='app-shell' БЕЗ header-слота (header идёт от родительского
 * workspace layout). Внутренний matrix:
 *   main     — calls table (draggable, swapGroup 'widgets')
 *   rightBar — sidebar (draggable, swapGroup 'widgets')
 *   footer   — карта (draggable, swapGroup 'widgets')
 *
 * `layoutMode` — глобальный store от `@capsuletech/web-style`. Edit-режим
 * включает handles + drag-affordances; переключается из header-menu.
 */
const Dashboard = Page((Ui) => {
  const layoutMode = useLayoutMode();
  return (
    <Ui.Layout.Matrix
      layoutMode={layoutMode()}
      preset="app-shell"
      slots={{
        main: {
          children: <Widgets.Tables.Calls />,
          draggable: true,
          swapGroup: 'widgets',
        },
        rightBar: {
          children: <Widgets.Sidebars.Main />,
          draggable: true,
          swapGroup: 'widgets',
          initialSize: 0.25,
        },
        footer: {
          children: <Widgets.Maps.World />,
          draggable: true,
          swapGroup: 'widgets',
          initialSize: 0.35,
        },
      }}
    />
  );
});

export default Dashboard;

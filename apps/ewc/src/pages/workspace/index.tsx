/**
 * Workspace shell (`/workspace`) — общий каркас для всех авторизованных
 * страниц.
 *
 *   header — `Widgets.Header`
 *   main   — `<Ui.Outlet/>` для дочерних роутов
 *              `/workspace/dashboard` — главный операционный экран
 *              `/workspace/cards`     — sandbox генерации форм
 *              `/workspace/reports`   — отчёты (placeholder)
 *
 * Оба слота `resizable: false` — shell не должен ресайзиться.
 *
 * `layoutMode="view"` локирует shell — global edit-toggle не подсветит
 * header/main edit-affordances. Внутренние страницы (Dashboard) подключают
 * `useLayoutMode` сами через Matrix internal default.
 *
 * **Page-transition анимация:** доступна нативно через
 * `config.router.transition` (View Transitions API) — включается в
 * `capsule.app.ts`, без правок этого файла.
 */
const Workspace = Page((Ui) => (
  <Layouts.Matrix
    mode="view"
    preset="app-shell"
    slots={{
      header: {
        children: <Widgets.Header />,
        resizable: false,
        initialSize: 0.04,
      },
      main: {
        children: <Ui.Outlet />,
        resizable: false,
      },
    }}
  />
));

export default Workspace;

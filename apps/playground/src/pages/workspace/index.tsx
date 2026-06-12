/**
 * Workspace shell (`/workspace`) — каркас для всех авторизованных страниц.
 *
 *   header — `Widgets.Header` (nav: Web Studio · DevOps · Docs)
 *   main   — `<Ui.Outlet/>` под дочерние роуты:
 *              `/workspace/web-studio` — дом креатор-кита (designer)
 *              `/workspace/devops`     — плейсхолдер (devops)
 *              `/workspace/docs`       — документация (всем)
 *
 * `mode="view"` локирует shell (global edit-toggle не подсветит chrome).
 * Оба слота `resizable: false` — shell не ресайзится.
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

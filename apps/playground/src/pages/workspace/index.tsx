/**
 * Workspace shell (`/workspace`) — каркас для всех авторизованных страниц.
 *
 *   header — `Widgets.Header` (nav + меню темы/logout)
 *   main   — `<Ui.Outlet/>` под дочерние роуты:
 *              `/workspace/home`    — приветствие (landing после входа)
 *              `/workspace/profile` — placeholder
 *
 * `mode="view"` локирует shell (global edit-toggle не подсветит chrome).
 * Оба слота `resizable: false` — shell не ресайзится.
 */
const Workspace = Page((Ui) => (
  <Shell.Matrix
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

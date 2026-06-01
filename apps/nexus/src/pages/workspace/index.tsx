/**
 * Workspace shell (`/workspace`) — общий каркас для всех авторизованных страниц.
 *
 *   header — `Widgets.Headers.Main`
 *   main   — `<Ui.Outlet/>` для дочерних роутов
 *
 * `layoutMode="view"` локирует shell — global edit-toggle не подсветит affordances.
 */
const Workspace = Page((Ui) => (
  <Ui.Layout.Matrix
    layoutMode="view"
    preset="app-shell"
    slots={{
      header: {
        children: <Widgets.Headers.Main />,
        resizable: false,
        initialSize: 0.06,
      },
      main: {
        children: <Ui.Outlet />,
        resizable: false,
      },
    }}
  />
));

export default Workspace;

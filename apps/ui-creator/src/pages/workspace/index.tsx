/**
 * Workspace shell (`/workspace`) для UI-creator — каркас Matrix (header + main).
 *
 *   header → Widgets.Header (бренд + навигация)
 *   main   → <Ui.Outlet/> для дочерних роутов:
 *              /workspace/constructor — редактор UI
 *              /workspace/demo        — площадка проверки
 */
const Workspace = Page((Ui) => (
  <Ui.Layout.Matrix
    layoutMode="view"
    preset="app-shell"
    slots={{
      header: {
        children: <Widgets.Header />,
        initialSize: 0.04,
      },
      main: {
        children: <Ui.Outlet />,
      },
    }}
  />
));

export default Workspace;

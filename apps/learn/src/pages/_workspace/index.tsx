/**
 * Workspace shell (`/workspace`) — каркас всех learn-страниц (зеркало playground).
 *
 *   header — `Widgets.Header` (nav: Lessons · Exercises · Progress · Library · Guides + тема)
 *   main   — `<Ui.Outlet/>` под дочерние роуты разделов; `_index` = Learn.Welcome.
 *
 * `Learn.Provider` оборачивает шелл → learn-контекст (apiBase/модуль) персистит между
 * разделами. `mode="view"` + `resizable:false` — shell не редактируется/не ресайзится.
 */
const Workspace = Page((Ui) => (
  <Learn.Provider>
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
          children: (
            <Ui.Layout.Flex h={'full'} class={'p-2'}>
              <Ui.Outlet />
            </Ui.Layout.Flex>
          ),
          resizable: false,
        },
      }}
    />
  </Learn.Provider>
));

export default Workspace;

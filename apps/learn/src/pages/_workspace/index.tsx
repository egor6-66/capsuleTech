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
  <Learn.Provider apiBase="/api">
    <Ui.Layout.Flex orientation={'vertical'} w={'full'} h={'full'}>
      <Widgets.Header />
      <Ui.Separator />
      <Ui.Layout.Flex h={'full'} w={'full'}>
        <Ui.Outlet />
      </Ui.Layout.Flex>
    </Ui.Layout.Flex>
  </Learn.Provider>
));

export default Workspace;

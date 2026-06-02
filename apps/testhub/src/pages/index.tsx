/**
 * Root page — точка входа `/`.
 *
 * `Features.Boot` немедленно редиректит на `/workspace`.
 * `<Ui.Outlet/>` — passthrough для дочерних роутов.
 */
const Index = Page((Ui) => (
  <Features.Boot>
    <Ui.Outlet />
  </Features.Boot>
));

export default Index;

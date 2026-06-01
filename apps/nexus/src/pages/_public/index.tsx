/**
 * `_public` layout — wraps unauthenticated routes (/login, /register) in a
 * centered frame via `<Ui.Outlet/>`. `Features.Boot` redirects the bare `/`
 * entry to /login or /workspace (token-based); it no-ops on the child routes.
 */
const Index = Page((Ui) => (
  <Features.Boot>
    <Ui.Layout.Flex align="center" justify="center" class="min-h-screen">
      <Ui.Outlet />
    </Ui.Layout.Flex>
  </Features.Boot>
));

export default Index;

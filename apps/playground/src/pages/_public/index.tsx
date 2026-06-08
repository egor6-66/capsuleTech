/**
 * _public layout — раздел для неавторизованных (login и т.д.).
 *
 * Pathless-группа (`_`-префикс): URL не содержит `/_public`.
 *   `/login` → _public/login.tsx
 *   `/`      → этот файл (layout + пустой index) — заходить смысла нет,
 *              guard `Features.App` (guest) редиректит на /login.
 *
 * Centered-фон + `<Ui.Outlet/>` под дочерние страницы.
 */
const Public = Page((Ui) => (
  <Ui.Layout.Flex align="center" justify="center" class="min-h-screen vt-route-content">
    <Ui.Outlet />
  </Ui.Layout.Flex>
));

export default Public;

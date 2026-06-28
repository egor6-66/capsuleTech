/**
 * /guides — layout раздела. Слот под `Learn.GuidesNav` (пакет); пока Outlet.
 */
const Guides = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={2} class="min-h-full flex-col p-2">
    {/* TODO: <Learn.GuidesNav /> */}
    <Ui.Outlet />
  </Ui.Layout.Flex>
));

export default Guides;

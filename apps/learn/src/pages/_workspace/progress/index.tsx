/**
 * /progress — layout раздела. Слот под `Learn.ProgressNav` (пакет); пока Outlet.
 */
const ProgressLayout = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={2} class="min-h-full flex-col p-2">
    {/* TODO: <Learn.ProgressNav /> */}
    <Ui.Outlet />
  </Ui.Layout.Flex>
));

export default ProgressLayout;

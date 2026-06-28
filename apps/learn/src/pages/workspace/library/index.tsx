/**
 * /workspace/library — library-layout с под-навигацией (как studio store/creator).
 *
 * `Learn.LibraryNav` (пакетный переключатель, ADR 032) эмитит `onLibraryNavigate` →
 * root-`Features.App` роутит в `/workspace/library/<segment>`. Под-вью — в `<Ui.Outlet/>`;
 * `_index` = Explorer (дефолт).
 */
const Library = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={4} class="min-h-full flex-col p-8">
    <Learn.LibraryNav />
    <Ui.Outlet />
  </Ui.Layout.Flex>
));

export default Library;

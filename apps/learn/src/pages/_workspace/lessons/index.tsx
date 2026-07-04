/**
 * /workspace/library — library-layout с под-навигацией (как studio store/creator).
 *
 * `Learn.LibraryNav` (пакетный переключатель, ADR 032) эмитит `onLibraryNavigate` →
 * root-`Features.App` роутит в `/workspace/library/<segment>`. Под-вью — в `<Ui.Outlet/>`;
 * `_index` = Explorer (дефолт). Стор библиотеки живёт внутри `Learn.Library.*`
 * блоков (пакет) — обёртка `Features.Library` больше не нужна.
 */
const Lessons = Page((Ui) => (
  <Ui.Layout.Flex orientation={'vertical'} w={'full'} h={'full'}>
    <Widgets.Navigation>
      <Learn.LibraryNav />
    </Widgets.Navigation>
    <Ui.Separator />
    <Ui.Layout.Flex h={'full'} w={'full'}>
      <Ui.Outlet />
    </Ui.Layout.Flex>
  </Ui.Layout.Flex>
));

export default Lessons;

/**
 * /workspace/library — library-layout с под-навигацией (как studio store/creator).
 *
 * Обёрнут в `Features.Library` — сток баблинга доменных событий библиотеки:
 * `Learn.LibraryNav` (пакетный переключатель, ADR 032) эмитит `onLibraryNavigate` →
 * фича роутит в `/library/<segment>`. Под-вью — в `<Ui.Outlet/>`; `_index` = Explorer
 * (дефолт). Стор библиотеки живёт внутри `Learn.Library.*` блоков (пакет).
 */
const Library = Page((Ui) => (
  <Features.Library>
    <Ui.Layout.Flex orientation={'vertical'} w={'full'} h={'full'}>
      <Widgets.Navigation>
        <Learn.LibraryNav />
      </Widgets.Navigation>
      <Ui.Separator />
      <Ui.Layout.Flex h={'full'} w={'full'}>
        <Ui.Outlet />
      </Ui.Layout.Flex>
    </Ui.Layout.Flex>
  </Features.Library>
));

export default Library;

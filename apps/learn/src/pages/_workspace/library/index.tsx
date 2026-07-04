/**
 * /workspace/library — library-layout с под-навигацией (как studio store/creator).
 *
 * `Learn.LibraryNav` (пакетный переключатель, ADR 032) эмитит `onLibraryNavigate` →
 * root-`Features.App` роутит в `/workspace/library/<segment>`. Под-вью — в `<Ui.Outlet/>`;
 * `_index` = Explorer (дефолт). Стор библиотеки живёт внутри `Learn.Library.*`
 * блоков (пакет) — обёртка `Features.Library` больше не нужна.
 */
const Library = Page((Ui) => (
  <Layouts.Matrix
    preset="app-shell"
    bordered={false}
    slots={{
      header: {
        children: (
          <Widgets.Navigation>
            <Learn.LibraryNav />
          </Widgets.Navigation>
        ),
        resizable: false,
        initialSize: 0.04,
      },
      main: {
        children: <Ui.Outlet />,
        resizable: false,
        bordered: true,
      },
    }}
  />
));

export default Library;

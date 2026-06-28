/**
 * /workspace/library — library-layout с под-навигацией (как studio store/creator).
 *
 * `Learn.LibraryNav` (пакетный переключатель, ADR 032) эмитит `onLibraryNavigate` →
 * root-`Features.App` роутит в `/workspace/library/<segment>`. Под-вью — в `<Ui.Outlet/>`;
 * `_index` = Explorer (дефолт).
 */
const Library = Page((Ui) => (
  <Features.Library>
    <Layouts.Matrix
      preset="app-shell"
      slots={{
        header: {
          children: <Learn.LibraryNav />,
          resizable: false,
          initialSize: 0.04,
        },
        main: {
          children: <Ui.Outlet />,
          resizable: false,
        },
      }}
    />
  </Features.Library>
));

export default Library;

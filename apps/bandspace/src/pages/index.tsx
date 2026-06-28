/**
 * / — тонкий вход. Корневой Features.App.onInit редиректит на /board/tracks,
 * поэтому здесь только короткий плейсхолдер на кадр до перехода.
 */
const Index = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-screen items-center justify-center">
    <Ui.Typography variant="muted">Загрузка…</Ui.Typography>
  </Ui.Layout.Flex>
));

export default Index;

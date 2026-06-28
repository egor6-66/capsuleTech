/**
 * / — корневой роут. `Features.App` (idle.onInit) редиректит в `/workspace` (шелл).
 * Здесь только короткий placeholder на момент редиректа.
 */
const Index = Page((Ui) => (
  <Ui.Layout.Flex align="center" justify="center" class="min-h-screen">
    <Ui.Typography tone="muted">Загрузка…</Ui.Typography>
  </Ui.Layout.Flex>
));

export default Index;

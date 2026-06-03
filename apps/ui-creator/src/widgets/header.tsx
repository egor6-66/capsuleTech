/**
 * Header — верхняя панель workspace: бренд + основная навигация.
 *
 * Тонкий Widget-хост для `Shapes.Navigation` (Shape напрямую в Page нарушил бы
 * «composition only in widgets»). Дальше тут появятся действия редактора.
 */
const Header = Widget((Ui) => (
  <Ui.Layout.Flex align="center" justify="between" class="h-full border-b bg-background px-cell">
    <Ui.Layout.Flex align="center" class="gap-cell">
      <Ui.Typography variant="h4">UI Creator</Ui.Typography>
      <Shapes.Navigation />
    </Ui.Layout.Flex>
    <Views.WorkspaceMenu />
  </Ui.Layout.Flex>
));

export default Header;

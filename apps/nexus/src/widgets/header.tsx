/**
 * Header — главный хедер Nexus (top-level widget).
 *
 * Слева: бренд «Nexus» + `Shapes.Navigation` (роут-линки).
 * Справа: `Views.WorkspaceMenu` — dropdown (Layout / Widget settings / Theme /
 * Logout). Logout-клик ловит `Features.Workspace` (tag 'logout').
 */
const Header = Widget((Ui) => (
  <Features.Workspace>
    <Ui.Layout.Flex align="center" justify="between" class="h-full border-b bg-background px-cell">
      <Ui.Layout.Flex align="center" class="gap-cell">
        <Ui.Typography variant="h4">Nexus</Ui.Typography>
        <Shapes.Navigation />
      </Ui.Layout.Flex>
      <Views.WorkspaceMenu />
    </Ui.Layout.Flex>
  </Features.Workspace>
));

export default Header;

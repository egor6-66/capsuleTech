/**
 * Main header widget for Nexus.
 *
 * Left:  brand "Nexus" + `Shapes.Navigation` (route links).
 * Right: `Views.WorkspaceMenu` — hamburger dropdown (Layout / Widget settings /
 *        Theme / Logout). Logout click handled by Features.Workspace (tag 'logout').
 */
const Main = Widget((Ui) => (
  <Features.Workspace>
    <Ui.Layout.Flex align="center" justify="between" class="h-full px-cell border-b bg-background">
      <Ui.Layout.Flex align="center" class="gap-cell">
        <Ui.Typography variant="h4">Nexus</Ui.Typography>
        <Shapes.Navigation />
      </Ui.Layout.Flex>
      <Views.WorkspaceMenu />
    </Ui.Layout.Flex>
  </Features.Workspace>
));

export default Main;

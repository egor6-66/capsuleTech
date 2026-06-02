/**
 * Workspace page — корневой роут хаба (`/workspace`).
 *
 * Рендерит `Widgets.Workspace` на всю высоту.
 */
const Workspace = Page(() => (
  <div class="h-screen w-full overflow-hidden">
    <Widgets.Workspace />
  </div>
));

export default Workspace;

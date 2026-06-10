/**
 * Studio.Frame — каркас студии (КОМПОЗИЦИЯ, golden rule #4: склейка ТОЛЬКО в Widget).
 *
 * Монтирует `Controllers.Studio` (shell-state) и собирает:
 *   top-bar (workspace-switcher + lens) · левый рейл · персистентный канвас · <Outlet/> (workspace-панель).
 *
 * Канвас живёт ЗДЕСЬ (layout-роут) → держит subject при свопе дочернего workspace-роута.
 * <Outlet/> — дочерние роуты design/logic/monitor свопают правую панель вокруг живого канваса.
 * Коллапс/ресайз рейлов и линзы-инспектор — наращиваются поверх скелета.
 */
const Frame = Widget((Ui) => (
  <Controllers.Studio>
    <Ui.Layout.Flex class="h-full flex-col">
      <Views.Studio.Topbar />

      <Ui.Layout.Flex class="min-h-0 flex-1">
        <Ui.Layout.Flex class="w-60 shrink-0 border-r border-border">
          <Views.Studio.Rail />
        </Ui.Layout.Flex>

        <Ui.Layout.Flex class="min-w-0 flex-1 p-cell">
          <Views.Studio.Canvas />
        </Ui.Layout.Flex>

        <Ui.Layout.Flex class="w-80 shrink-0 border-l border-border">
          <Ui.Outlet />
        </Ui.Layout.Flex>
      </Ui.Layout.Flex>
    </Ui.Layout.Flex>
  </Controllers.Studio>
));

export default Frame;

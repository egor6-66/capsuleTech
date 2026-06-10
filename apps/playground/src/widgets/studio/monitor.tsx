/**
 * Studio.Monitor — Monitor-workspace панель (заглушка). Timeline + state + network — позже.
 */
const Monitor = Widget((Ui) => (
  <Ui.Layout.Flex class="h-full flex-col gap-tight p-cell">
    <Ui.Typography variant="muted" class="text-xs font-semibold uppercase tracking-wide">
      Monitor
    </Ui.Typography>
    <Ui.Typography variant="muted" class="text-xs">
      Поток событий — скоро.
    </Ui.Typography>
  </Ui.Layout.Flex>
));

export default Monitor;

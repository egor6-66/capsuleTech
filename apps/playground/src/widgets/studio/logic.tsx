/**
 * Studio.Logic — Logic-workspace панель (заглушка). Node-граф — отдельная фаза/ТЗ.
 */
const Logic = Widget((Ui) => (
  <Ui.Layout.Flex class="h-full flex-col gap-tight p-cell">
    <Ui.Typography variant="muted" class="text-xs font-semibold uppercase tracking-wide">
      Logic
    </Ui.Typography>
    <Ui.Typography variant="muted" class="text-xs">
      Node-граф — скоро.
    </Ui.Typography>
  </Ui.Layout.Flex>
));

export default Logic;

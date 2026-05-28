/**
 * Reports stub (`/workspace/reports`) — placeholder для будущей отчётной зоны.
 *
 * Рендерится внутри workspace shell'а (см. `../index.tsx`) через Outlet.
 * Реальный контент — позже отдельной итерацией.
 */
const Reports = Page((Ui) => (
  <Ui.Layout.Flex direction="col" align="center" justify="center" class="h-full p-8">
    <Ui.Typography variant="h2">Reports</Ui.Typography>
    <Ui.Typography variant="muted">— placeholder —</Ui.Typography>
  </Ui.Layout.Flex>
));

export default Reports;

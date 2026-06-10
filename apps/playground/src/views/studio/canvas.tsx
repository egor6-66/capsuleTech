/**
 * Studio.Canvas — центральная область канваса (placeholder).
 * Живёт в layout-роуте каркаса → персистентен при свопе дочернего workspace-роута
 * (subject-константа). Позже: web-renderer + юзерский кит (контракты придут от UI-агента).
 */
const Canvas = View((Ui) => (
  <Ui.Layout.Flex class="h-full items-center justify-center rounded-md border border-dashed border-border bg-muted/20">
    <Ui.Typography variant="muted">Канвас — скоро (web-renderer + кит)</Ui.Typography>
  </Ui.Layout.Flex>
));

export default Canvas;

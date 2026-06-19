/**
 * /workspace/docs — документация. Доступна ВСЕМ (без `meta.can`).
 *
 * Сейчас ПЛЕЙСХОЛДЕР. Контент — публичный user-guide из `apps/playground/public/`
 * (фетчится в вебе), подключим позже.
 */
const Docs = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-full flex-col gap-section p-section">
    <Ui.Typography class="text-xl font-semibold text-foreground">Документация</Ui.Typography>
    <Ui.Typography variant="p" class="text-muted-foreground">
      Раздел в разработке — здесь будет user-guide.
    </Ui.Typography>
  </Ui.Layout.Flex>
));

export default Docs;

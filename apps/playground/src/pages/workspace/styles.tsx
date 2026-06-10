/**
 * /workspace/styles — placeholder секции (контент по мере роста эталона).
 *
 * Настройки финиш-мода переехали в меню «Тема» хедера (`Shell.FinishSettings`).
 */
const Styles = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-full flex-col items-center justify-center gap-cell p-cell">
    <Ui.Typography variant="h3" class="text-xl font-semibold text-foreground">
      Styles
    </Ui.Typography>
    <Ui.Typography variant="p" class="text-muted-foreground">
      Раздел в разработке.
    </Ui.Typography>
  </Ui.Layout.Flex>
));

export default Styles;

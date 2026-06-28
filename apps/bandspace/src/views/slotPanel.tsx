/**
 * SlotPanel — универсальный плейсхолдер-слот (stateless View). title + hint.
 * Используется в матрице календаря, пока секции не наполнены реальными виджетами.
 */
const SlotPanel = View<{ title: string; hint?: string }>((Ui, props) => (
  <Ui.Layout.Flex direction="col" class="h-full gap-tight p-cell">
    <Ui.Typography variant="muted" class="text-xs font-semibold uppercase tracking-wide">
      {props.title}
    </Ui.Typography>
    <Ui.Typography variant="muted" size="sm">
      {props.hint ?? 'Скоро.'}
    </Ui.Typography>
  </Ui.Layout.Flex>
));

export default SlotPanel;

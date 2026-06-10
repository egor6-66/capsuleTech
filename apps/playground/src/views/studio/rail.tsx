/**
 * Studio.Rail — левый рейл (палитра/дерево). Placeholder.
 * Тулзы web-creator (palette/tree) приедут позже — рейл их хостит.
 */
const Rail = View((Ui) => (
  <Ui.Layout.Flex class="h-full flex-col gap-tight p-cell">
    <Ui.Typography variant="muted" class="text-xs font-semibold uppercase tracking-wide">
      Палитра / дерево
    </Ui.Typography>
    <Ui.Typography variant="muted" class="text-xs">
      Тулзы web-creator — скоро.
    </Ui.Typography>
  </Ui.Layout.Flex>
));

export default Rail;

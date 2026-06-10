/**
 * Studio.Inspector — контекстный инспектор (placeholder). Один на студию, контент = f(выделение).
 * Читает selection из Controllers.Studio; наполнение (schema→контролы из контрактов) — позже.
 */
const Inspector = View((Ui) => {
  const ctx = useCtx();
  const sel = (): string | null => (ctx.store.ctx.data?.selection as string | null) ?? null;

  return (
    <Ui.Layout.Flex class="h-full flex-col gap-tight p-cell">
      <Ui.Typography variant="muted" class="text-xs font-semibold uppercase tracking-wide">
        Инспектор
      </Ui.Typography>
      <Ui.Typography variant="muted" class="text-xs">
        {sel() ? `Выбрано: ${sel()}` : 'Ничего не выбрано'}
      </Ui.Typography>
    </Ui.Layout.Flex>
  );
});

export default Inspector;

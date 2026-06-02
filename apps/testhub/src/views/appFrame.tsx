/**
 * AppFrame — область просмотра выбранного приложения в iframe.
 *
 * Stateless: читает `selected` из ControllerContext через `useCtx()`.
 * Если ничего не выбрано — плейсхолдер «Выберите приложение слева».
 * Если выбрано — iframe с `src = selected.url` на всю доступную высоту.
 */
const AppFrame = View((Ui) => {
  const ctx = useCtx();
  const selected = () =>
    (
      ctx.store.ctx.data as
        | {
            selected: { app: string; url: string } | null;
          }
        | undefined
    )?.selected ?? null;

  return (
    <Ui.Layout.Flex direction="col" class="h-full w-full overflow-hidden bg-background">
      <Ui.Flow.Show
        when={selected()}
        fallback={
          <Ui.Layout.Flex
            align="center"
            justify="center"
            direction="col"
            gap={2}
            class="flex-1 text-center"
          >
            <Ui.Typography variant="muted">Выберите приложение слева</Ui.Typography>
          </Ui.Layout.Flex>
        }
      >
        {(app) => (
          <iframe
            src={app().url}
            title={app().app}
            class="h-full w-full flex-1 border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </Ui.Flow.Show>
    </Ui.Layout.Flex>
  );
});

export default AppFrame;

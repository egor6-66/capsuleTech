/**
 * AppList — сайдбар со списком задеплоенных приложений.
 *
 * Stateless: читает `apps` и `selected` из ControllerContext через `useCtx()`.
 * Каждая строка несёт `meta` с тегами `['select-app', 'app:<name>']` — клик
 * перехватывает `Features.Catalog.onClick` и ставит `selected`.
 *
 * Подсветка выбранного — через `classList` по совпадению `app.app === selected?.app`.
 */
const AppList = View((Ui) => {
  const ctx = useCtx();
  const data = () =>
    ctx.store.ctx.data as
      | {
          apps: Array<{ app: string; base: string; url: string; deployedAt: string | null }>;
          selected: { app: string } | null;
          loading: boolean;
        }
      | undefined;

  return (
    <Ui.Layout.Flex direction="col" class="h-full w-full overflow-y-auto border-r bg-muted/30">
      <div class="shrink-0 border-b px-4 py-3">
        <Ui.Typography variant="h4">Приложения</Ui.Typography>
      </div>

      <Ui.Flow.Show
        when={!data()?.loading}
        fallback={
          <Ui.Layout.Flex align="center" justify="center" class="flex-1 p-4">
            <Ui.Typography variant="muted">Загрузка...</Ui.Typography>
          </Ui.Layout.Flex>
        }
      >
        <Ui.Flow.Show
          when={(data()?.apps?.length ?? 0) > 0}
          fallback={
            <Ui.Layout.Flex align="center" justify="center" class="flex-1 p-4">
              <Ui.Typography variant="muted">Нет приложений</Ui.Typography>
            </Ui.Layout.Flex>
          }
        >
          <Ui.Layout.Flex direction="col" gap={0} class="flex-1 overflow-y-auto p-2">
            <Ui.Flow.For each={data()?.apps ?? []}>
              {(app) => {
                const isSelected = () => data()?.selected?.app === app.app;
                return (
                  <div
                    meta={{ tags: ['select-app', `app:${app.app}`] }}
                    class="cursor-pointer rounded-md px-3 py-2.5 transition-colors"
                    classList={{
                      'bg-primary/10 text-primary font-medium': isSelected(),
                      'hover:bg-accent': !isSelected(),
                    }}
                  >
                    <Ui.Layout.Flex direction="col" gap={0.5}>
                      <Ui.Typography variant="body" class="font-medium leading-tight">
                        {app.app}
                      </Ui.Typography>
                      <Ui.Typography variant="muted" class="text-xs">
                        {app.base}
                      </Ui.Typography>
                    </Ui.Layout.Flex>
                  </div>
                );
              }}
            </Ui.Flow.For>
          </Ui.Layout.Flex>
        </Ui.Flow.Show>
      </Ui.Flow.Show>
    </Ui.Layout.Flex>
  );
});

export default AppList;

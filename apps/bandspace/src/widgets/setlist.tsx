/**
 * Setlist — панель «Сет-лист»: треки со статусом `approved`.
 * Читает треки из корневого Features.App (`useCtx`), фильтрует `approved`.
 */
const Setlist = Widget((Ui) => {
  const ctx = useCtx();
  const approved = () =>
    ((ctx.store.ctx.data?.tracks ?? []) as Entities.Track.Row[]).filter(
      (t) => t.status === 'approved',
    );

  return (
    <Ui.Layout.Flex direction="col" class="h-full gap-cell p-cell">
      <Ui.Typography variant="h2">Сет-лист</Ui.Typography>

      <Ui.Layout.Flex direction="col" class="gap-tight">
        <Ui.Flow.For each={approved()}>
          {(track: Entities.Track.Row) => <Views.TrackCard track={track} />}
        </Ui.Flow.For>
        <Ui.Flow.Show when={approved().length === 0}>
          <Ui.Typography variant="muted" size="sm">
            Сет-лист пуст — одобри трек на голосовании.
          </Ui.Typography>
        </Ui.Flow.Show>
      </Ui.Layout.Flex>
    </Ui.Layout.Flex>
  );
});

export default Setlist;

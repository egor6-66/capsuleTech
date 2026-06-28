/**
 * Predlojka — панель «На голосовании»: треки со статусом `pending` + кнопки ревью.
 *
 * Форма добавления вынесена в отдельный слот матрицы (Views.SubmitForm), здесь —
 * только список на ревью. Читает треки из корневого Features.App (`useCtx`).
 */
const Predlojka = Widget((Ui) => {
  const ctx = useCtx();
  const pending = () =>
    ((ctx.store.ctx.data?.tracks ?? []) as Entities.Track.Row[]).filter(
      (t) => t.status === 'pending',
    );

  return (
    <Ui.Layout.Flex direction="col" class="h-full gap-cell p-cell">
      <Ui.Typography variant="h2">На голосовании</Ui.Typography>

      <Ui.Layout.Flex direction="col" class="gap-tight">
        <Ui.Flow.For each={pending()}>
          {(track: Entities.Track.Row) => <Views.TrackCard track={track} review />}
        </Ui.Flow.For>
        <Ui.Flow.Show when={pending().length === 0}>
          <Ui.Typography variant="muted" size="sm">
            Пока нет треков на голосовании.
          </Ui.Typography>
        </Ui.Flow.Show>
      </Ui.Layout.Flex>
    </Ui.Layout.Flex>
  );
});

export default Predlojka;

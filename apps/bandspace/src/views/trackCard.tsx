/**
 * TrackCard — карточка трека (stateless View).
 *
 * props.review=true → показываем кнопки approve/reject. Они meta-tagged + несут
 * `payload={track.id}` → корневой Features.App знает, какой трек обновить.
 * Медиа (аудио/табы) в первой итерации — просто индикаторы наличия ссылки.
 */
const STATUS_LABEL: Record<string, string> = {
  pending: 'на голосовании',
  approved: 'в сет-листе',
  rejected: 'отклонён',
};

const TrackCard = View<{ track: Entities.Track.Row; review?: boolean }>((Ui, props) => (
  <Ui.Card class="w-full" elevation="sm">
    <Ui.Card.Header>
      <Ui.Layout.Flex justify="between" align="center">
        <Ui.Card.Title>{props.track.title}</Ui.Card.Title>
        <Ui.Typography variant="muted" size="xs">
          {STATUS_LABEL[props.track.status] ?? props.track.status}
        </Ui.Typography>
      </Ui.Layout.Flex>
      <Ui.Card.Description>{props.track.author}</Ui.Card.Description>
    </Ui.Card.Header>

    <Ui.Card.Content>
      <Ui.Flow.Show when={props.track.lyrics}>
        <Ui.Typography variant="muted" size="sm">
          {props.track.lyrics}
        </Ui.Typography>
      </Ui.Flow.Show>

      <Ui.Layout.Flex class="gap-tight">
        <Ui.Flow.Show when={props.track.audioUrl}>
          <Ui.Typography variant="muted" size="xs">
            ♪ аудио
          </Ui.Typography>
        </Ui.Flow.Show>
        <Ui.Flow.Show when={props.track.tabUrl}>
          <Ui.Typography variant="muted" size="xs">
            ≣ табы
          </Ui.Typography>
        </Ui.Flow.Show>
      </Ui.Layout.Flex>

      <Ui.Flow.Show when={props.review}>
        <Ui.Layout.Flex class="gap-tight">
          <Ui.Button meta={{ tags: ['approve'] }} payload={props.track.id} size="sm">
            Одобрить
          </Ui.Button>
          <Ui.Button meta={{ tags: ['reject'] }} payload={props.track.id} variant="outline" size="sm">
            Отклонить
          </Ui.Button>
        </Ui.Layout.Flex>
      </Ui.Flow.Show>
    </Ui.Card.Content>
  </Ui.Card>
));

export default TrackCard;

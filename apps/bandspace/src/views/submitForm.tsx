/**
 * SubmitForm — форма предложки (stateless View на web-ui).
 *
 * Инпуты meta-tagged (tag = имя поля) → UiProxy регистрирует их в корневом
 * Features.App и трекает value. Кнопка `tags:['submit']` → App.onClick собирает
 * `store.values(['@input'])`. Форма ничего не знает про FSM — вся логика в App.
 */
const SubmitForm = View((Ui) => (
  <Ui.Card class="w-full" elevation="md">
    <Ui.Card.Header divider>
      <Ui.Card.Title>Предложить трек</Ui.Card.Title>
      <Ui.Card.Description>Добавь трек на голосование группы</Ui.Card.Description>
    </Ui.Card.Header>

    <Ui.Card.Content>
      <Ui.Field>
        <Ui.Field.Label>Название</Ui.Field.Label>
        <Ui.Field.Content>
          <Ui.Input placeholder="Название трека" meta={{ tags: ['title'] }} />
        </Ui.Field.Content>
      </Ui.Field>

      <Ui.Field>
        <Ui.Field.Label>Автор</Ui.Field.Label>
        <Ui.Field.Content>
          <Ui.Input placeholder="Кто предлагает" meta={{ tags: ['author'] }} />
        </Ui.Field.Content>
      </Ui.Field>

      <Ui.Field>
        <Ui.Field.Label>Текст</Ui.Field.Label>
        <Ui.Field.Content>
          <Ui.Input placeholder="Текст песни" meta={{ tags: ['lyrics'] }} />
        </Ui.Field.Content>
      </Ui.Field>

      <Ui.Field>
        <Ui.Field.Label>Аудио (ссылка)</Ui.Field.Label>
        <Ui.Field.Content>
          <Ui.Input placeholder="https://…" meta={{ tags: ['audioUrl'] }} />
        </Ui.Field.Content>
      </Ui.Field>

      <Ui.Field>
        <Ui.Field.Label>Табулатура (ссылка)</Ui.Field.Label>
        <Ui.Field.Content>
          <Ui.Input placeholder="https://…" meta={{ tags: ['tabUrl'] }} />
        </Ui.Field.Content>
      </Ui.Field>

      <Ui.Button meta={{ tags: ['submit'] }} fullWidth>
        Отправить в предложку
      </Ui.Button>
    </Ui.Card.Content>
  </Ui.Card>
));

export default SubmitForm;

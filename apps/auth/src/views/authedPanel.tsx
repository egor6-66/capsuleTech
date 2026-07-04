/**
 * AuthedPanel — карточка authed-состояния: «вы вошли как <login>» +
 * «продолжить» (только при валидном `?next=`) + «выйти».
 *
 * Stateless: данные пропсами, действия — meta-тегами → onClick в root
 * `Features.App` (authed-стейт): continue → полная навигация по next,
 * logout → `authApi.logoutServer()`.
 */
interface IAuthedPanelProps {
  /** Логин вьювера (`Entities.Viewer.Row['login']`). */
  login?: string;
  /** Есть валидный `?next=` — показать «продолжить». */
  hasNext?: boolean;
}

const AuthedPanel = View<IAuthedPanelProps>((Ui, props) => (
  <Ui.Card w={96} elevation="lg">
    <Ui.Card.Header divider>
      <Ui.Card.Title align="center">Вы вошли</Ui.Card.Title>
      <Ui.Card.Description align="center">
        {`Вы вошли как ${props?.login ?? 'пользователь'}`}
      </Ui.Card.Description>
    </Ui.Card.Header>

    <Ui.Card.Content>
      <Ui.Layout.Flex direction="col" gap={2}>
        <Ui.Flow.Show when={props?.hasNext}>
          <Ui.Button meta={{ tags: ['continue'] }}>Продолжить</Ui.Button>
        </Ui.Flow.Show>
        <Ui.Button variant="outline" meta={{ tags: ['logout'] }}>
          Выйти
        </Ui.Button>
      </Ui.Layout.Flex>
    </Ui.Card.Content>
  </Ui.Card>
));

export default AuthedPanel;

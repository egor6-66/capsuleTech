const Auth = Widget((Ui, Features, Controllers, Entities) => (
  <Features.Viewer.Auth>
    <Controllers.Universal.Form overrides={{ onClick: 'authByLogin' }}>
      <Ui.Animate variant="scale" duration={0.3}>
        <Ui.Card class="w-full max-w-sm border-none">
          <Ui.Card.Header class="text-center">
            <Ui.Card.Title class="text-xl">CAPSULE</Ui.Card.Title>
            <Ui.Card.Description>Демо логин-формы</Ui.Card.Description>
          </Ui.Card.Header>

          <Ui.Card.Content>
            <Entities.Viewer.LoginForm meta={{ tags: ['@login-form'] }} />
          </Ui.Card.Content>
        </Ui.Card>
      </Ui.Animate>
    </Controllers.Universal.Form>
  </Features.Viewer.Auth>
));

export default Auth;

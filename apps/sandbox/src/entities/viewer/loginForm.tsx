const LoginForm = Entity(({ Field, Button, Input }) => (
  <Field>
    <Field.Label>Email</Field.Label>
    <Field.Content>
      <Input meta={{ tags: ['email'] }} />
    </Field.Content>
    <Field.Label>Пароль</Field.Label>
    <Field.Content>
      <Input meta={{ tags: ['password'] }} />
    </Field.Content>
    <Button meta={{ tags: ['submit'] }}>Войти</Button>
  </Field>
));

export default LoginForm;

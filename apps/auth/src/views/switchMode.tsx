/**
 * SwitchMode — ссылка-переключатель под формой: вход ↔ регистрация.
 *
 * Stateless: текущий режим пропом, клик — meta-тегом (to-register/to-login)
 * → onClick в root `Features.App` (guest-стейт) → store.mode.
 */
interface ISwitchModeProps {
  /** Текущий режим формы. */
  mode?: 'login' | 'register';
}

const SwitchMode = View<ISwitchModeProps>((Ui, props) => (
  <Ui.Flow.Show
    when={props?.mode === 'register'}
    fallback={
      <Ui.Button variant="link" meta={{ tags: ['to-register'] }}>
        Нет аккаунта? Зарегистрироваться
      </Ui.Button>
    }
  >
    <Ui.Button variant="link" meta={{ tags: ['to-login'] }}>
      Уже есть аккаунт? Войти
    </Ui.Button>
  </Ui.Flow.Show>
));

export default SwitchMode;

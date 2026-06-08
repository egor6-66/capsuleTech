/**
 * /login — публичная страница входа (внутри `_public` layout).
 *
 * `Auth.Login` (глобал из пакета @capsuletech/web-auth) — self-contained
 * connected-блок: внутри свой Controller-scope (auth-FSM) + форма (web-core View).
 * Апп передаёт только данные (роли) + брендинг. Submit → onLogin/onLoginError
 * всплывают в корневую `Features.App` (ADR 032).
 */
const Login = Page(() => (
  <Auth.Login
    type="role"
    roles={[
      { value: 'developer', label: 'Developer' },
      { value: 'support', label: 'Support' },
    ]}
    title="Вход"
    submitLabel="Войти"
    footerNote="Это эталонный app фреймворка Capsule"
  />
));

export default Login;

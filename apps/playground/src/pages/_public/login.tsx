/**
 * /login — публичная страница входа (внутри `_public` layout).
 *
 * Тонкая Page: композиция формы — в `Widgets.LoginForm` (→ Shapes.Login →
 * Auth.Login). Submit → onLogin/onLoginError всплывают в корневую `Features.App`.
 */
const Login = Page(() => <Widgets.LoginForm />);

export default Login;

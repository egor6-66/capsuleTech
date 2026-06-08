/**
 * LoginForm — композиция формы входа (HCA: Page → Widget → Shape → Auth.Login).
 *
 * Рендерит `Shapes.Login`. `type` — стратегия входа; Widget форвардит его
 * (возможность смены: role/credentials/oauth2/qr). Реализована стратегия 'role'.
 */
const LoginForm = Widget((_Ui, _store, props) => <Shapes.Login type={props?.type ?? 'role'} />);

export default LoginForm;

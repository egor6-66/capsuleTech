/**
 * LoginForm — композиция формы входа (HCA: Page → Widget → Shape → Auth.Login).
 *
 * Рендерит `Shapes.Login`. `type` — стратегия входа; Widget форвардит его
 * (возможность смены: role/credentials/oauth2/qr). Реализована стратегия 'role'.
 */
const LoginForm = Widget((Ui, _store, props) => (
  <Ui.Layout.Flex justify={'center'}>
    <Shapes.Login type={props?.type ?? 'role'} />
  </Ui.Layout.Flex>
));

export default LoginForm;

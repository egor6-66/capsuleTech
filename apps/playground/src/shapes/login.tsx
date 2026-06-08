/**
 * Login — presentation-shape стратегии входа.
 *
 * `as: Auth.Login` (connected-блок web-auth). Shape прокидывает config-поля
 * как props в Auth.Login: `type` берётся из consumer-пропа (Widget управляет
 * стратегией), roles + брендинг — здесь. Batch/`item` не используется —
 * Auth.Login одиночный компонент, Shape тут = типизированный props-контейнер.
 */
const Login = Shape(
  (ui, { zod }) => ({
    // Схема ролей стратегии 'role' — данные формы входа.
    schema: zod.array(zod.object({ value: zod.string(), label: zod.string() })),
    as: Auth.Login,
  }),
  (ui, props) => ({
    type: props?.type ?? 'role',
    roles: [
      { value: 'developer', label: 'Developer' },
      { value: 'support', label: 'Support' },
    ],
    title: 'Вход',
    submitLabel: 'Войти',
    footerNote: 'Это эталонный app фреймворка Capsule',
  }),
);

export default Login;

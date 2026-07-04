/**
 * Gate — единственный виджет auth-аппа: guest ↔ authed.
 *
 * guest  — `Auth.Login type="credentials"` / `Auth.Register` (переключение по
 *          store.mode) + Views.SwitchMode под формой.
 * authed — Views.AuthedPanel (login + continue/logout).
 *
 * Store — 2-й аргумент (контекст root `Features.App`), store опционален → гард.
 * Центрирование через документированные props Flex (minH — вертикальное
 * дыхание: у kit'а нет viewport-height пропа, gap зафлажен architect'у).
 */
const Gate = Widget((Ui, store) => {
  const data = () => (store?.ctx as { data?: Record<string, unknown> } | undefined)?.data;
  const viewer = () => data()?.viewer as Entities.Viewer.Row | null | undefined;
  const mode = () => (data()?.mode as 'login' | 'register' | undefined) ?? 'login';
  const hasNext = () => Boolean(data()?.next);

  return (
    <Ui.Layout.Flex direction="col" align="center" justify="center" gap={3} minH={160} py={8}>
      <Ui.Flow.Show
        when={!viewer()}
        fallback={<Views.AuthedPanel login={viewer()?.login} hasNext={hasNext()} />}
      >
        <Ui.Flow.Show
          when={mode() === 'register'}
          fallback={<Auth.Login type="credentials" title="Вход" />}
        >
          <Auth.Register />
        </Ui.Flow.Show>
        <Views.SwitchMode mode={mode()} />
      </Ui.Flow.Show>
    </Ui.Layout.Flex>
  );
});

export default Gate;

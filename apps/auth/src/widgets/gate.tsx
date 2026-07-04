/**
 * Gate — единственный виджет auth-аппа: guest ↔ authed.
 *
 * guest  — пакетный `Auth.Gate`: готовый guest-блок (Login ↔ Register +
 *          ссылка-переключатель), mode-стейт живёт ВНУТРИ блока (Gate-FSM).
 *          Переключение форм — забота пакета, не аппа.
 * authed — Views.AuthedPanel (login + continue/logout).
 *
 * Store — 2-й аргумент (контекст root `Features.App`), store опционален → гард.
 * Центрирование через документированные props Flex (minH — вертикальное
 * дыхание: у kit'а нет viewport-height пропа, gap зафлажен architect'у).
 */
const Gate = Widget((Ui, store) => {
  const data = () => (store?.ctx as { data?: Record<string, unknown> } | undefined)?.data;
  const viewer = () => data()?.viewer as Entities.Viewer.Row | null | undefined;
  const hasNext = () => Boolean(data()?.next);

  return (
    <Ui.Layout.Flex direction="col" align="center" justify="center" gap={3} minH={160} py={8}>
      <Ui.Flow.Show
        when={!viewer()}
        fallback={<Views.AuthedPanel login={viewer()?.login} hasNext={hasNext()} />}
      >
        <Auth.Gate />
      </Ui.Flow.Show>
    </Ui.Layout.Flex>
  );
});

export default Gate;

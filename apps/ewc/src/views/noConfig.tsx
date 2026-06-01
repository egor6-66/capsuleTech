/**
 * NoConfig — заглушка для страниц без готового функционала: центрированная
 * надпись «Нет доступного конфига» + кнопка «Назад».
 *
 * Stateless: сам ничего не навигирует. Родительская Page прокидывает `onBack`
 * (обычно `() => router.back()`) — так View остаётся без импорта router/logic.
 * Используется на `cards/:id` и `reports` (функционал позже).
 */
interface INoConfigProps {
  onBack?: () => void;
}

const NoConfig = View((Ui, props: INoConfigProps) => (
  <Ui.Layout.Flex direction="col" align="center" justify="center" class="h-full gap-4 p-8">
    <Ui.Typography variant="muted">Нет доступного конфига</Ui.Typography>
    <Ui.Button variant="outline" onClick={() => props.onBack?.()}>
      Назад
    </Ui.Button>
  </Ui.Layout.Flex>
));

export default NoConfig;

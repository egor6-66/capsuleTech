/**
 * /lessons/rules — three-pane layout (как студия): аккордеон правил слева
 * (persistent, activeId из URL), тело правила в центре (`Ui.Outlet` — свап
 * подсказка/правило по сегменту), практика справа.
 *
 * URL = источник истины выбора: клик в аккордеоне эмитит `onRuleSelect` →
 * `Features.Lessons` роутит в `/lessons/rules/$ruleId`. `activeId` читаем из
 * `param('ruleId')` реактивно — на голом `/lessons/rules` он `undefined`
 * (аккордеон свёрнут, дриллы = «Практики нет»), на сегменте — подсвечен+раскрыт.
 *
 * `Rules` (sidebar) и `RuleDrills` (rightBar) живут в layout'е — НЕ ремаунтятся
 * при навигации между правилами (сохраняют раскрытие/скролл); тело правила
 * приходит из дочернего роута через `Ui.Outlet`. `Rule` и `RuleDrills` (плоские
 * `Learn.*`) на один
 * `id` = один fetch (стор дедуплицирует `openRule`).
 */
const RulesLayout = Page((Ui) => {
  const router = useRouter();
  const ruleId = () => router.param('ruleId');

  return (
    <Layouts.Matrix
      preset="app-shell"
      slots={{
        sidebar: { children: <Learn.Rules id={ruleId()} /> },
        main: { children: <Ui.Outlet /> },
        rightBar: { children: <Learn.RuleDrills id={ruleId()} /> },
      }}
    />
  );
});

export default RulesLayout;

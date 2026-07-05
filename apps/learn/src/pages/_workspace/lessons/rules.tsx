/**
 * /lessons/rules — вкладка «Правила»: справочник грамматики master-detail из
 * пакетных блоков `Learn.Lessons.*` (стор внутри пакета). `Rules` слева
 * (sidebar) — список правил; `Rule` справа (main) — открытое правило (тело
 * через Markdown→Prose + секция «Практика» с его дриллами). Клик в `Rules`
 * открывает правило в `Rule` через общий стор пакета; 🔊 дриллов баблится в
 * root `Features.App` (app-глобальный плеер).
 */
const RulesPage = Page(() => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Learn.Lessons.Rules />,
      },
      main: {
        children: <Learn.Lessons.Rule />,
      },
    }}
  />
));

export default RulesPage;

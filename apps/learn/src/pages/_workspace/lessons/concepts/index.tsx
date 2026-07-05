/**
 * /lessons/concepts — две колонки: аккордеон концептов слева (persistent,
 * activeId из URL), тело концепта в центре (`Ui.Outlet` — свап подсказка/статья
 * по сегменту). Правой панели нет (концепт = чтение, дриллов у него нет).
 *
 * URL = источник истины: клик в аккордеоне / relatedRules-чип / wikilink эмитят
 * `onConceptSelect`|`onRuleSelect` → `Features.Lessons` роутит. `activeId` из
 * `param('conceptId')` реактивно; `Concepts` в layout'е — не ремаунтится при
 * навигации между концептами.
 */
const ConceptsLayout = Page((Ui) => {
  const router = useRouter();
  const conceptId = () => router.param('conceptId');

  return (
    <Layouts.Matrix
      preset="app-shell"
      slots={{
        sidebar: { children: <Learn.Lessons.Concepts id={conceptId()} /> },
        main: { children: <Ui.Outlet /> },
      }}
    />
  );
});

export default ConceptsLayout;

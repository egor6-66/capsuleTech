/**
 * /lessons/concepts — вкладка «Концепты»: библиотека прозы master-detail из
 * пакетных блоков `Learn.Lessons.*` (стор внутри пакета). `Concepts` слева
 * (sidebar) — список принципов; `Concept` справа (main) — открытая статья
 * (тело через Markdown→Prose, типографика документа). Клик в `Concepts`
 * открывает статью в `Concept` через общий стор пакета.
 */
const ConceptsPage = Page(() => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      sidebar: {
        children: <Learn.Lessons.Concepts />,
      },
      main: {
        children: <Learn.Lessons.Concept />,
      },
    }}
  />
));

export default ConceptsPage;

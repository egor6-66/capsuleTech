/**
 * /lessons/concepts — без выбора: центр показывает подсказку «выберите концепт»
 * (встроенный fallback блока `Learn.Lessons.Concept` без `id`). Аккордеон слева —
 * в layout'е (`concepts/index.tsx`). Рендерится в его `Ui.Outlet`.
 */
const ConceptsHome = Page(() => <Learn.Lessons.Concept />);

export default ConceptsHome;

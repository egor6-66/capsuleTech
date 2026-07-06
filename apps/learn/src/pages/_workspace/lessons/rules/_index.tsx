/**
 * /lessons/rules — без выбора: центр показывает подсказку «выберите правило»
 * (встроенный fallback блока `Learn.Rule` без `id`). Аккордеон слева и
 * дриллы справа — в layout'е (`rules/index.tsx`). Рендерится в его `Ui.Outlet`.
 */
const RulesHome = Page(() => <Learn.Rule />);

export default RulesHome;

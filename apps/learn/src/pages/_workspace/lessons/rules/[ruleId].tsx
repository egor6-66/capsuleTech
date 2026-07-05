/**
 * /lessons/rules/$ruleId — тело выбранного правила (deep-link). `id` из URL
 * (`param('ruleId')`) → `Learn.Lessons.Rule` (Prose-тело, strip-H1, wikilink'и
 * эмитят наверх). Рендерится в центре layout'а `rules/index.tsx` (`Ui.Outlet`);
 * аккордеон и дриллы — в layout'е, на тот же `id`.
 */
const RulePage = Page(() => {
  const router = useRouter();

  return <Learn.Lessons.Rule id={router.param('ruleId')} />;
});

export default RulePage;

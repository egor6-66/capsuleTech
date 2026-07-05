/**
 * /lessons/concepts/$conceptId — статья выбранного концепта (deep-link). `id` из
 * URL (`param('conceptId')`) → `Learn.Concept` (Prose-тело, примеры,
 * relatedRules-чипы «Смотри правила», wikilink'и — всё эмитит наверх).
 * Рендерится в центре layout'а `concepts/index.tsx` (`Ui.Outlet`).
 */
const ConceptPage = Page(() => {
  const router = useRouter();

  return <Learn.Concept id={router.param('conceptId')} />;
});

export default ConceptPage;

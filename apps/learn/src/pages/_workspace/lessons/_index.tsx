/**
 * /lessons — index: дефолт раздела = вкладка «Концепты» (зеркало `concepts.tsx`).
 *
 * На голом `/lessons` показываем библиотеку прозы master-detail из пакетных
 * блоков `Learn.Lessons.*` — тот же контент, что `/lessons/concepts` (концепты =
 * дефолтная вкладка). Сегментные роуты `concepts.tsx` / `rules.tsx` рендерят под
 * своим URL, чтобы под-нав `Learn.LessonsNav` подсвечивал активную вкладку.
 *
 * Уроки-маршруты (`Learn.Lessons.List/View`) отсюда сняты до накопления контента —
 * блоки в пакете живут, вернём вкладкой позже.
 */
const LessonsHome = Page(() => (
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

export default LessonsHome;

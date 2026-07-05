/**
 * Lessons — доменная фича раздела уроков (канон app-фич: root `Features.App` =
 * только глобальные концерны, доменные события пакета ловит доменная фича аппа).
 *
 * Монтируется обёрткой в layout-странице `pages/_workspace/lessons/index.tsx` —
 * сток баблинга для под-навигации раздела и будущих lessons-событий.
 *
 * Под-навигация вкладок раздела теперь эмитит единый generic `onSegmentNavigate`
 * (`Shell.SegmentNav`, brief pilot-segment-nav-5) — оно app-wide, ловится в root
 * `Features.App` (автобабблится выше), сюда не приходит. Здесь остаются только
 * доменные события выбора темы/урока (не навигация-сегментами).
 *
 * `onLessonSelect` (ADR 032, `Learn.Lessons`): выбор урока живёт внутри
 * пакета (`Lessons` → `lessonsStore.open`, `Lesson` читает `current()`). Lessons/Lesson
 * с раздела сняты (вернём вкладкой позже), событие сейчас не эмитится — no-op сток
 * для канона, оставлен на возврат уроков-вкладки.
 *
 * `onSpeak` (озвучка слов дриллов) НЕ ловим тут — оно app-глобальное, баблится
 * выше в root `Features.App` (плеер/движок — app-concern).
 *
 * `onRuleSelect` / `onConceptSelect` (ADR 069, `Learn.{Rules,Rule,Concepts,
 * Concept}`): выбор темы = URL (deep-link). События приходят из аккордеонов,
 * relatedRules-чипов концепта И wikilink'ов в теле — пакет эмитит одинаково, фиче
 * всё равно откуда; она только роутит в сегментный URL. Страницы читают param
 * (`router.param('ruleId')` / `'conceptId'`) и отдают `id`-пропом в блоки.
 *
 * `Learn.{Rules,Rule,Concepts,Concept}` — плоские namespace-блоки (пакет промоутнул
 * их из вложенного `Learn.Lessons` namespace, brief apps-learn-flat-namespaces-1). Payload типизируем
 * вручную (форма зеркалит `IRulesEvents`/`IConceptsEvents` пакета, без импорта — как
 * `IOnSpeakEvent` в `features/app.tsx`).
 *
 * `onSpeak` (озвучка слов дриллов) тут НЕ ловим — оно app-глобальное, баблится
 * выше в root `Features.App` (плеер/движок — app-concern).
 */
interface ILessonSelectEvent {
  onLessonSelect: { id: string };
}

interface IRuleSelectEvent {
  onRuleSelect: { id: string };
}

interface IConceptSelectEvent {
  onConceptSelect: { id: string };
}

const Lessons = Feature<ILessonSelectEvent & IRuleSelectEvent & IConceptSelectEvent>(
  ({ router }) => ({
    initial: 'idle',

    states: {
      idle: {},
    },

    // Выбор правила (аккордеон / wikilink / relatedRules-чип) → deep-link URL.
    onRuleSelect: ({ target }) => {
      router.goTo(`/lessons/rules/${target.payload.id}`);
    },

    // Выбор концепта (аккордеон / wikilink) → deep-link URL.
    onConceptSelect: ({ target }) => {
      router.goTo(`/lessons/concepts/${target.payload.id}`);
    },

    onLessonSelect: () => {
      // no-op: стор пакета уже открыл урок (List → lessonsStore.open),
      // View читает current() из того же стора. Сток для канона app-фич.
    },
  }),
);

export default Lessons;

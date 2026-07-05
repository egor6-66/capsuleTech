/**
 * Lessons — доменная фича раздела уроков (канон app-фич: root `Features.App` =
 * только глобальные концерны, доменные события пакета ловит доменная фича аппа).
 *
 * Монтируется обёрткой в layout-странице `pages/_workspace/lessons/index.tsx` —
 * сток баблинга для под-навигации раздела и будущих lessons-событий.
 *
 * `onLessonsNavigate` (ADR 032, `Learn.LessonsNav`): под-навигация вкладок
 * (`concepts` | `rules`) — payload = id сегмента → роутим в `/lessons/<segment>`
 * (зеркало `onLibraryNavigate` в `Features.Library`). Активную вкладку `LessonsNav`
 * derived'ит из URL сам — фиче достаточно сменить путь.
 *
 * `onLessonSelect` (ADR 032, `Learn.Lessons.List`): выбор урока живёт внутри
 * пакета (`List` → `lessonsStore.open`, `View` читает `current()`). List/View с
 * раздела сняты (вернём вкладкой позже), событие сейчас не эмитится — no-op сток
 * для канона, оставлен на возврат уроков-вкладки.
 *
 * `onSpeak` (озвучка слов дриллов) НЕ ловим тут — оно app-глобальное, баблится
 * выше в root `Features.App` (плеер/движок — app-concern).
 *
 * `onRuleSelect` / `onConceptSelect` (ADR 069, `Learn.Lessons.{Rules,Rule,Concepts,
 * Concept}`): выбор темы = URL (deep-link). События приходят из аккордеонов,
 * relatedRules-чипов концепта И wikilink'ов в теле — пакет эмитит одинаково, фиче
 * всё равно откуда; она только роутит в сегментный URL. Страницы читают param
 * (`router.param('ruleId')` / `'conceptId'`) и отдают `id`-пропом в блоки.
 *
 * `Learn.Lessons.*` — вложенные namespace-блоки; codegen per-component `.Events`
 * агрегат вложенные ключи не видит (см. `web-learn/src/capsule.ts`), поэтому
 * payload типизируем вручную (форма зеркалит `IRulesEvents`/`IConceptsEvents`
 * пакета, без импорта — как `IOnSpeakEvent` в `features/app.tsx`). `LessonsNav` —
 * ПЛОСКИЙ ключ, его `.Events` codegen видит: тип берём из `Learn.LessonsNav.Events`.
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

const Lessons = Feature<
  Learn.LessonsNav.Events & ILessonSelectEvent & IRuleSelectEvent & IConceptSelectEvent
>(({ router }) => ({
  initial: 'idle',

  states: {
    idle: {},
  },

  // Под-навигация вкладок: payload — id сегмента (concepts/rules).
  onLessonsNavigate: ({ target }) => {
    router.goTo(`/lessons/${target.payload}`);
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
}));

export default Lessons;

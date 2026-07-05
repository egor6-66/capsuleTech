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
 * `Learn.Lessons.List` — вложенный namespace-блок; codegen per-component `.Events`
 * агрегат вложенные ключи не видит (см. `web-learn/src/capsule.ts`), поэтому
 * payload типизируем вручную (форма зеркалит `ILessonsListEvents` пакета, без
 * импорта — как `IOnSpeakEvent` в `features/app.tsx`). `LessonsNav` — ПЛОСКИЙ ключ,
 * его `.Events` codegen видит: тип берём из `Learn.LessonsNav.Events`.
 */
interface ILessonSelectEvent {
  onLessonSelect: { id: string };
}

const Lessons = Feature<Learn.LessonsNav.Events & ILessonSelectEvent>(({ router }) => ({
  initial: 'idle',

  states: {
    idle: {},
  },

  // Под-навигация вкладок: payload — id сегмента (concepts/rules).
  onLessonsNavigate: ({ target }) => {
    router.goTo(`/lessons/${target.payload}`);
  },

  onLessonSelect: () => {
    // no-op: стор пакета уже открыл урок (List → lessonsStore.open),
    // View читает current() из того же стора. Сток для канона app-фич.
  },
}));

export default Lessons;

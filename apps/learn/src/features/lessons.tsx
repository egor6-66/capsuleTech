/**
 * Lessons — доменная фича раздела уроков (канон app-фич: root `Features.App` =
 * только глобальные концерны, доменные события пакета ловит доменная фича аппа).
 *
 * Монтируется обёрткой в layout-странице `pages/_workspace/lessons/index.tsx` —
 * сток баблинга для `Learn.Lessons.List` и будущих lessons-событий.
 *
 * `onLessonSelect` (ADR 032, `Learn.Lessons.List`): выбор урока полностью живёт
 * внутри пакета — `List` при клике сам зовёт `lessonsStore.open(...)`, а
 * `Learn.Lessons.View` читает `lessonsStore.current()` из того же стора. Поэтому
 * на v1 фиче делать нечего: событие — no-op (сток для канона). URL-синк
 * `/lessons/<id>` отложен до появления per-id роутов (раздел плоский).
 *
 * `onSpeak` (озвучка слов дриллов) НЕ ловим тут — оно app-глобальное, баблится
 * выше в root `Features.App` (плеер/движок — app-concern).
 *
 * `Learn.Lessons.List` — вложенный namespace-блок; codegen per-component `.Events`
 * агрегат вложенные ключи не видит (см. `web-learn/src/capsule.ts`), поэтому
 * payload типизируем вручную (форма зеркалит `ILessonsListEvents` пакета, без
 * импорта — как `IOnSpeakEvent` в `features/app.tsx`).
 */
interface ILessonSelectEvent {
  onLessonSelect: { id: string };
}

const Lessons = Feature<ILessonSelectEvent>(() => ({
  initial: 'idle',

  states: {
    idle: {},
  },

  onLessonSelect: () => {
    // no-op v1: стор пакета уже открыл урок (List → lessonsStore.open),
    // View читает current() из того же стора. Сток для канона app-фич.
  },
}));

export default Lessons;

/**
 * Library — доменная фича библиотеки (канон app-фич: root `Features.App` = только
 * глобальные концерны, доменные события пакета ловит доменная фича аппа).
 *
 * Монтируется обёрткой в layout-странице `pages/_workspace/library/index.tsx` —
 * сток баблинга для будущих library-событий.
 *
 * Под-навигация library теперь эмитит единый generic `onSegmentNavigate`
 * (`Shell.SegmentNav`, brief pilot-segment-nav-5) — оно app-wide, ловится
 * в root `Features.App`, сюда не приходит (автобабблится выше). Фича оставлена
 * стоком под будущие доменные события раздела.
 */
const Library = Feature(() => ({
  initial: 'idle',

  states: {
    idle: {},
  },
}));

export default Library;

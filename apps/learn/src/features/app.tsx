/**
 * App — root feature обучающего app'а.
 *
 * RouterPlugin авто-детектит `src/features/app.tsx` и монтирует его в `__root`
 * ВЫШЕ `<Outlet/>` (mount-once) → даёт логик-контекст всем страницам. Именно
 * поэтому `Learn.Welcome` может эмитить `onNavigate` через `useEmit`.
 *
 * Ловит именованное событие `Learn.Welcome.Events.onNavigate` (ADR 032; payload
 * типизирован через codegen-namespace пакета) → роутинг по сегменту.
 *
 * SKELETON: единственный стейт `idle`, без domain-логики. Реальные states
 * (загрузка прогресса, текущий концепт и т.п.) — последующие итерации.
 */

const App = Feature<Learn.Welcome.Events>(({ router }) => ({
  initial: 'idle',

  states: {
    idle: {},
  },

  // Навигация из welcome-карточек: payload — id сегмента
  // ('lessons' | 'exercises' | 'progress' | 'library').
  onNavigate: ({ target }) => {
    router.goTo(`/${target.payload}`);
  },
}));

export default App;

/**
 * Shell — app-feature, обрабатывающая события, всплывающие из `@capsuletech/web-shell`
 * блоков (`Shell.Matrix`, и далее `Shell.Header` и т.д.).
 *
 * Пакетные компоненты эмитят ИМЕНОВАННЫЕ события через useEmit (ADR 032); они
 * всплывают по `next()`-цепочке к ближайшей фиче-ловцу. Эта фича стоит СНАРУЖИ
 * (data-фичи вроде `Features.Incidents` — ближе к своим виджетам), поэтому
 * ловит то, что прошло мимо них.
 *
 * Типизация: `Feature<Shell.Matrix.Events>` → `target.payload` в `onLayoutChange`
 * типизирован как `LayoutChangeEvent` (приходит namespace-merge'ом из web-shell,
 * без импорта).
 *
 * Сейчас единственный обработчик — persist раскладки Matrix в localStorage
 * (swap/resize/reorder). При желании сюда же добавятся другие Shell-события.
 */
const Shell = Feature<Shell.Matrix.Events>(() => ({
  initial: 'idle' as const,
  states: { idle: {} },

  /**
   * onLayoutChange — Matrix сообщил об изменении раскладки (swap/insert/grid).
   * `target.payload: LayoutChangeEvent` — типизирован. Сохраняем последнюю
   * раскладку в localStorage (демо persist; в реальном проекте — на бэк через api).
   */
  onLayoutChange: ({ target }) => {
    localStorage.setItem('ewc-dashboard-layout', JSON.stringify(target.payload));
  },
}));

export default Shell;

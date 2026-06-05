/**
 * Dashboard (`/workspace/dashboard`) — основной операционный экран EWC.
 *
 * **Shared state hub:** все слоты Matrix обёрнуты в `<Features.Incidents>` —
 * Tables / Maps / Sidebar читают **один и тот же** store (items / selected).
 * Выбор карточки — стандартный клик → универсальный `onClick`-роутер фичи
 * (tag `incident` + payload), а не именованные методы. Single source of truth.
 *
 * Matrix preset='app-shell' БЕЗ header-слота (header идёт от родительского
 * workspace layout). Внутренний matrix:
 *   main     — incidents table (draggable, swapGroup 'widgets')
 *   rightBar — sidebar с card выбранного incident'а (draggable, swapGroup 'widgets')
 *   footer   — карта с markers (draggable, swapGroup 'widgets')
 *
 * `layoutMode` НЕ передаём — Matrix сам подцепит глобальный store от
 * `@capsuletech/web-style`.
 *
 * **Слоты — только композиция.** Презентация loader'а и настроек живёт В
 * слое виджета, не на Page:
 *   - loader (data-load скелетон) — 2-й аргумент `Widget(content, { loader })`;
 *   - settings — декларативный конфиг `Widget(content, { settings: [...] })`,
 *     web-core рисует их в settings-strip при включённом settingsMode.
 * Page лишь расставляет виджеты по слотам Matrix (children + DnD-параметры).
 */
const Dashboard = Page(() => (
  // Features.Shell (снаружи) ловит всплывшие события Shell.Matrix (onLayoutChange →
  // persist раскладки). Features.Incidents (ближе к виджетам) даёт им items-store.
  <Features.Shell>
    <Features.Incidents>
      <Shell.Matrix
        preset="app-shell"
        slots={{
          main: {
            children: <Widgets.Tables.Incidents />,
            swapGroup: 'widgets',
          },
          rightBar: {
            children: <Widgets.Sidebars.Main />,
            swapGroup: 'widgets',
            initialSize: 0.25,
          },
          footer: {
            children: <Widgets.Maps.World />,
            swapGroup: 'widgets',
            initialSize: 0.35,
          },
        }}
      />
    </Features.Incidents>
  </Features.Shell>
));

export default Dashboard;

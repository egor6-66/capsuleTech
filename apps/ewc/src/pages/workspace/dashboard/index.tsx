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
 * **Per-slot Suspense (chunk-load):** каждый виджет — отдельный lazy-чанк из
 * реестра. Matrix оборачивает контент КАЖДОГО слота в собственный `<Suspense>`
 * (под капотом), иначе любой suspend всплыл бы к единственному `<Suspense>`
 * Feature'а и погасил ВЕСЬ Matrix до загрузки всех чанков. `skeleton` на слоте —
 * fallback на время загрузки чанка; совпадает с data-loading скелетоном виджета
 * (table/map) — без визуального скачка. Без `skeleton` слот получает нейтральный
 * pulse-дефолт от Matrix.
 */
const Dashboard = Page((Ui) => (
  <Features.Incidents>
    <Ui.Layout.Matrix
      preset="app-shell"
      slots={{
        main: {
          children: <Widgets.Tables.Incidents />,
          skeleton: <Ui.Skeleton variant="table" rows={100} />,
          settings: <Views.Settings.TableSync />,
          draggable: true,
          swapGroup: 'widgets',
        },
        rightBar: {
          children: <Widgets.Sidebars.Main />,
          skeleton: <Ui.Skeleton variant="card" />,
          draggable: true,
          swapGroup: 'widgets',
          initialSize: 0.25,
        },
        footer: {
          children: <Widgets.Maps.World />,
          skeleton: <Ui.Skeleton variant="map" />,
          settings: <Views.Settings.MapSync />,
          draggable: true,
          swapGroup: 'widgets',
          initialSize: 0.35,
        },
      }}
    />
  </Features.Incidents>
));

export default Dashboard;

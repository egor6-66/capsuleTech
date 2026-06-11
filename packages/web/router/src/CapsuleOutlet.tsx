import { Outlet } from '@tanstack/solid-router';
import { type JSX, useContext } from 'solid-js';
import { DepthContext } from './depthContext';

/**
 * CapsuleOutlet — capsule-обёртка над TanStack `<Outlet/>`.
 *
 * Единственная точка владения `view-transition-name` для routing-анимации
 * (ADR 046 Decision 4). Каждый уровень вложенного Outlet'а получает
 * уникальное имя `capsule-content-${depth}` через `DepthContext.Provider
 * value={parent + 1}` — благодаря этому нативный View Transitions API
 * анимирует каждый сегмент независимо: смена под-роута на глубине N не
 * триггерит анимацию у родителей (их именованные регионы рендерят
 * одинаковый DOM до/после → фейд visible-нулевой).
 *
 * **Depth-agnostic CSS targeting через `view-transition-class`.** Раньше
 * web-style перечислял селекторы `::view-transition-*(capsule-content-{0..3})`
 * руками, что давало hardcoded потолок глубины (depth 4+ молча терял brand
 * fade). Теперь все CapsuleOutlet'ы несут класс `capsule-route` —
 * web-style таргетит `::view-transition-*(.capsule-route)`, селектор
 * матчит регион любой глубины. Никакого enumeration.
 *
 * DOM-обёртка:
 *   - класс `vt-route-content` (legacy backward-compat для consumers, которые
 *     ещё руками ставят этот класс на свой wrapper — см. `packages/web/style/src/index.css`);
 *   - inline `view-transition-name: capsule-content-${depth}` (уникальный
 *     идентификатор именованного региона — нужен чтобы вложенные Outlet'ы
 *     были разными snapshot-регионами и не схлопывались в один);
 *   - inline `view-transition-class: capsule-route` (CSS-таргетинг по
 *     классу через `::view-transition-*(.capsule-route)` — depth-agnostic);
 *   - inline `width/height: 100%` — wrapper должен сохранять размер cell'а
 *     родителя, чтобы Page-Component'ы с `h-full`/`w-full` получили sized
 *     parent (исторический паттерн до PR #264, ныне инкапсулирован).
 *
 * **NB: `display: contents` НЕ годится** — view-transition-name требует
 * principal box (CSS view-transitions spec); `display:contents`-элемент
 * не генерирует layout-box → snapshot-регион не создаётся.
 *
 * **Browser support:** `view-transition-class` — Chromium 125+ (May 2024)
 * и Safari 18+. Firefox view-transitions не поддерживает вообще, graceful
 * degrade (никакого fade, мгновенный swap — приемлемо).
 *
 * Заменяет прямое использование `Outlet` в `Ui.Outlet`-инъекции
 * `@capsuletech/web-core` (см. C2 step plan-doc).
 *
 * Сценарий navigation `/workspace/web-studio/design → /workspace/web-studio/logic`:
 *   depth 0/1/2 — DOM не меняется → фейд visible-нулевой;
 *   depth 3    — DOM свопится → фейд по `vt-fade-out/in` в web-style.
 */
export const CapsuleOutlet = (): JSX.Element => {
  const parent = useContext(DepthContext);
  const depth = parent + 1;
  return (
    <DepthContext.Provider value={depth}>
      <div
        class="vt-route-content"
        style={{
          width: '100%',
          height: '100%',
          'view-transition-name': `capsule-content-${depth}`,
          'view-transition-class': 'capsule-route',
        }}
      >
        <Outlet />
      </div>
    </DepthContext.Provider>
  );
};

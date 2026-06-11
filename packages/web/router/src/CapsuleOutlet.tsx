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
 * DOM-обёртка:
 *   - класс `vt-route-content` (web-style цепляет per-depth `::view-transition-*`
 *     селекторы по нему — см. `packages/web/style/src/index.css`);
 *   - inline `view-transition-name: capsule-content-${depth}` (фактический
 *     идентификатор именованного региона для браузера);
 *   - inline `width/height: 100%` — wrapper должен сохранять размер cell'а
 *     родителя, чтобы Page-Component'ы с `h-full`/`w-full` получили sized
 *     parent (исторический паттерн до PR #264, ныне инкапсулирован).
 *
 * **NB: `display: contents` НЕ годится** — view-transition-name требует
 * principal box (CSS view-transitions spec); `display:contents`-элемент
 * не генерирует layout-box → snapshot-регион не создаётся.
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
        }}
      >
        <Outlet />
      </div>
    </DepthContext.Provider>
  );
};

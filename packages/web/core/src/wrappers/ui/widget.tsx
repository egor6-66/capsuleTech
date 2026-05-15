import { Outlet } from '@tanstack/solid-router';
import type { IWidgetWrapper } from '../interfaces';
import { Ui } from './ui-kit';

/**
 * `Entities`, `Controllers`, `Features` — runtime-объекты, кладутся на
 * `globalThis` в `bootstrap.tsx` (`Object.assign(globalThis, registry)`).
 * До npm-публикации работали как bare-identifier через AutoImport, но
 * после удаления `development` exports `dist/*.mjs` не транспилируется,
 * поэтому переключились на globalThis.
 */
const getEntities = (): Entities => (globalThis as any).Entities ?? ({} as Entities);
const getControllers = (): Controllers =>
  (globalThis as any).Controllers ?? ({} as Controllers);
const getFeatures = (): Features => (globalThis as any).Features ?? ({} as Features);

export const WidgetWrapper: IWidgetWrapper = (Component) => {
  return function Widget() {
    // Позиционные аргументы: ui, features, controllers, entities.
    // Ui приходит флэтом (все примитивы); тип renderer'а сужает до WidgetUi.
    return Component(
      { ...(Ui as any), Outlet } as any,
      getFeatures(),
      getControllers(),
      getEntities(),
    );
  };
};

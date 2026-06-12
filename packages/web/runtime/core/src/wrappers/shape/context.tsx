import { createContext, useContext } from 'solid-js';

/**
 * Контекст для проброса проксированного Ui из View/Widget/Page в Shape.
 * View-обёртка (`ViewWrapper`), WidgetWrapper и PageWrapper оборачивают
 * свой рендер в:
 *   `<ShapeUiContext.Provider value={Ui}>`
 * Shape-обёртка читает namespace через `useShapeUi()` для резолва `definition.as`.
 *
 * Path-tracker (`ui.Field`, `ui.Navigation.Item`) резолвится через `resolveByPath`
 * по Ui namespace на top level.
 *
 * NOTE (PR #114 откат): ранее контекст нёс combined `{ ...Ui, Views }` namespace.
 * Это смешивало UI-примитивы и registry-реестр в один объект. После упрощения
 * wrapper-сигнатур (Views/Shapes стали чистыми глобалами) — в контексте
 * остаётся только Ui. Shape-фабрика, которой нужны Views, обращается к ним
 * напрямую: `Views.Forms.Field` (доступно через globalThis via bootstrap).
 */
export type IShapeUiNamespace = Record<string, unknown>;

export const ShapeUiContext = createContext<IShapeUiNamespace | null>(null);

export const useShapeUi = () => useContext(ShapeUiContext);

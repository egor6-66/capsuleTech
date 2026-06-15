/**
 * WebStudio.Provider — контекст-обёртка редактора (ADR 032, фаза 6).
 *
 * ## Два кита редактора
 *
 * Редактор работает с двумя независимыми наборами компонентов:
 *
 * ### 1. КОНТЕНТ-кит (`kit` prop → `useWebStudioKit()`)
 * Передаётся пропом в `<WebStudio.Provider kit={...}>`. Это UI-компоненты, ИЗ которых
 * пользователь строит свой UI: им наполняется палитра (превью) и рендерится Canvas.
 * Результат редактора — JSON-дерево под этот кит. Юзер может передать любой кит.
 * Доступен через `useWebStudioKit()`. Используется ТОЛЬКО в Canvas и превью Palette.
 *
 * ### 2. Chrome-кит (= `@capsuletech/web-ui`, прямая зависимость пакета)
 * Фиксированный набор UI-компонентов, КОТОРЫМИ нарисован сам редактор: поля
 * инспектора, дропдауны Palette/Tree, кнопки панелей. Импортируется напрямую
 * из `@capsuletech/web-ui/*` в каждом файле где нужен. НЕ зависит от редактируемого
 * контента и НЕ передаётся через контекст.
 *
 * **Правило:** редактировать контент → `useWebStudioKit()`; рисовать chrome редактора → `@capsuletech/web-ui`.
 *
 * ---
 *
 * Принимает `kit` — объект UI-компонентов, который Canvas использует как
 * render-registry (передаёт в `<Renderer registry={{ ui: kit }}>`).
 * Таким образом редактор параметризуется китом и не хардкодит @capsuletech/web-ui.
 *
 * Монтирует `<Controllers.WebStudio>` внутри, поэтому дочерние компоненты
 * (Canvas, Overlay, Inspector) видят и editor-kit через `useWebStudioKit()`,
 * и editor-state через `useWebStudio()`.
 *
 * Также монтирует `<DnDProvider>` — редактор владеет своим drag-and-drop,
 * app-консумер про web-dnd знать не должен.
 *
 * Использование в app:
 * ```tsx
 * const WorkspacePage = Page((Ui) => (
 *   <WebStudio.Provider kit={Ui}>
 *     <WebStudio.Canvas />
 *   </WebStudio.Provider>
 * ));
 * ```
 *
 * `Controllers.WebStudio` — глобал, инжектируется через capsule-registry
 * (@capsuletech/web-studio/capsule → defineCapsuleModule).
 * Provider не импортирует Controllers напрямую — читает из globalThis
 * как и любой Widget в приложении.
 */

import { DnDProvider } from '@capsuletech/web-dnd';
import type { Registry } from '@capsuletech/web-renderer';
import { createContext, type JSX, useContext } from 'solid-js';

// ── Kit context ────────────────────────────────────────────────────────────────

/**
 * Кит — объект UI-компонентов, пригодный как registry для web-renderer.
 * App передаёт свой `Ui` (проксированная копия), пакет не хардкодит реализацию.
 *
 * На runtime это тот же shape что Registry['ui'] — вложенный объект компонентов.
 */
export type WebStudioKit = Registry;

const WebStudioKitContext = createContext<WebStudioKit>();

/**
 * Читает КОНТЕНТ-кит из WebStudio.Provider.
 *
 * КОНТЕНТ-кит — UI-компоненты, ИЗ которых пользователь строит свой UI
 * (Canvas render + Palette превью). НЕ используется для chrome самого редактора
 * (поля инспектора, Dropdown, кнопки) — chrome импортирует из `@capsuletech/web-ui` напрямую.
 *
 * @throws если вызван вне `<WebStudio.Provider>` (context = undefined).
 */
export const useWebStudioKit = (): WebStudioKit => {
  const kit = useContext(WebStudioKitContext);
  if (!kit) {
    throw new Error(
      '[web-studio] useWebStudioKit() вызван вне <WebStudio.Provider>. ' +
        'Убедись что WebStudio.Canvas / WebStudioOverlay монтируются внутри <WebStudio.Provider>.',
    );
  }
  return kit;
};

// ── Provider props ────────────────────────────────────────────────────────────

export interface IWebStudioProviderProps {
  /**
   * КОНТЕНТ-кит — UI-компоненты, ИЗ которых пользователь строит свой UI.
   * Используется как render-registry в Canvas и как источник превью в Palette.
   * Обычно `Ui` из Page factory — уже проксированная копия под текущий ControllerContext.
   *
   * Chrome самого редактора (Dropdown, Input, Toggle) — прямые импорты из
   * `@capsuletech/web-ui`, не зависят от этого кита.
   */
  kit: WebStudioKit;
  children: JSX.Element;
  /**
   * Показывать ли встроенный drag-оверлей (ghost под курсором во время drag).
   * По умолчанию `true` — editor-internal affordance.
   */
  showDefaultOverlay?: boolean;
}

/**
 * WebStudio.Provider — монтирует DnDProvider + WebStudioController + прокидывает kit в context.
 *
 * Порядок вложенности (снаружи → внутри):
 *   DnDProvider  →  WebStudioKitContext  →  Controllers.WebStudio  →  children
 *
 * Такой порядок гарантирует что surfaces-потомки видят всех трёх:
 * - DnD-context (useDnD)
 * - kit (useWebStudioKit)
 * - editor-state (useWebStudio через ControllerContext Controllers.WebStudio)
 *
 * `Controllers.WebStudio` читается из globalThis (capsule-registry inject).
 * Если registry ещё не инициализирован (unit-тест без bootstrap) —
 * рендерит только DnD + kit-context без Controller-обёртки.
 */
export const WebStudioProvider = (props: IWebStudioProviderProps) => {
  // Controllers — глобальный реестр, инжектируемый capsule-bootstrap'ом.
  // В unit-тестах или SSR без bootstrap'а Controllers может быть undefined.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WebStudioCtrl = (globalThis as any).Controllers?.WebStudio as
    | ((p: { children: JSX.Element }) => JSX.Element)
    | undefined;

  const showOverlay = () => props.showDefaultOverlay ?? true;

  return (
    <DnDProvider showDefaultOverlay={showOverlay()}>
      <WebStudioKitContext.Provider value={props.kit}>
        {WebStudioCtrl ? <WebStudioCtrl>{props.children}</WebStudioCtrl> : props.children}
      </WebStudioKitContext.Provider>
    </DnDProvider>
  );
};

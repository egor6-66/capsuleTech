import { type Accessor, createContext, type JSX, useContext } from 'solid-js';

/**
 * Mount target — куда `@capsuletech/web-ui` Portal-based примитивы (Select,
 * Dropdown, Tooltip) монтируют свои popover'ы. По дефолту они идут в
 * `document.body` JS-контекста (Kobalte default). Host может override'нуть
 * через `<MountProvider>` чтобы:
 *  - монтить внутрь iframe body (canvas-preview изоляция);
 *  - монтить внутрь Dialog content (фокус-trap не разрывается);
 *  - монтить в Shadow DOM root (Web Components wrapper);
 *  - монтить в custom split-view container.
 *
 * Generic ability — НЕ привязан к studio/iframe. Использует любой host
 * которому нужен specific mount target для kit Portal'ов.
 *
 * Контекст реактивен — `value` принимает `HTMLElement | undefined` или
 * Accessor (для случаев когда mount target появляется async, как iframe body
 * после `load`-event).
 */

type MountTarget = HTMLElement | undefined;
type MountTargetSource = MountTarget | Accessor<MountTarget>;

const MountTargetContext = createContext<Accessor<MountTarget>>();

const toAccessor = (src: MountTargetSource): Accessor<MountTarget> =>
  typeof src === 'function' ? (src as Accessor<MountTarget>) : () => src;

export interface IMountProviderProps {
  /**
   * Mount target. Принимает `HTMLElement` (статичный target) или Accessor
   * (для async-появляющегося target'а — например, iframe body после load).
   * `undefined` — kit-примитивы fallback'ятся на Kobalte default (`document.body`).
   */
  value: MountTargetSource;
  children: JSX.Element;
}

export const MountProvider = (props: IMountProviderProps) => (
  <MountTargetContext.Provider value={toAccessor(props.value)}>
    {props.children}
  </MountTargetContext.Provider>
);

/**
 * Читает текущий mount target из контекста. Возвращает Accessor — value
 * реактивен (host может менять mount target on-the-fly: iframe body после
 * load, Dialog content на open/close).
 *
 * Вне `<MountProvider>` возвращает Accessor отдающий `undefined` — fallback
 * на Kobalte default.
 */
export const useMountTarget = (): Accessor<MountTarget> => {
  const ctx = useContext(MountTargetContext);
  return ctx ?? (() => undefined);
};

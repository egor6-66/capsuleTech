import type { IGroupProps } from '@capsuletech/web-ui/group';
import type { Component, JSX, ParentProps } from 'solid-js';

/**
 * Shell.Header — bar-контейнер. ParentComponent: рендерит children в Flex
 * (h-full items-center justify-between border-b bg-background px-cell).
 * Слева/справа раскладку даёт justify-between по children.
 * НЕТ props brand/nav/menu — всё через composition.
 */
export type IHeaderProps = ParentProps<{
  class?: string;
}>;

/**
 * Shell.Header.Navigation — батч-контейнер, Shape-совместимый (тот же контракт,
 * что ui.Group: data + item + orientation + variant).
 *
 * Использовать в Shape (ADR 036, two-phase):
 * ```ts
 * Shape(
 *   (ui, { zod }) => ({
 *     schema: zod.array(zod.object({ label: zod.string(), to: zod.string() })),
 *     as: Shell.Header.Navigation,
 *   }),
 *   (ui, props) => ({
 *     data: props.data,
 *     item: {
 *       use: ui.Button,
 *       props: (i) => ({ as: ui.Link, to: i.to, children: i.label, variant: 'outline', size: 'sm' }),
 *     },
 *     orientation: 'horizontal',
 *     variant: 'attached',
 *   }),
 * )
 * ```
 *
 * Extends IGroupProps — форвардит все батч-props в ui.Group.
 * Header-специфичный дефолт: orientation='horizontal', gap=1.
 */
export type IHeaderNavigationProps<T = unknown> = IGroupProps<T> & {
  class?: string;
};

/**
 * Shell.Header.Menu — dropdown-контейнер.
 * Trigger = Button ghost/icon + Menu-иконка.
 * Content рендерит children — тогглы/пункты, которые КОМПОЗИРУЕТ апп.
 * Toggle'ы НЕ оборачиваются в Dropdown.Item — апп сам решает структуру.
 */
export type IHeaderMenuProps = ParentProps<{
  /** aria-label для кнопки-триггера. Дефолт: 'Меню'. */
  label?: string;
}>;

/**
 * Sub-namespace саб-хелперов Menu — re-export Dropdown.* со стилями.
 * Используется если апп хочет семантическую структуру внутри Menu:
 * ```tsx
 * <Shell.Header.Menu>
 *   <Shell.Header.Menu.Group>
 *     <Shell.Header.Menu.Label>Layout</Shell.Header.Menu.Label>
 *     <Shell.ModeToggle mode="dnd" />
 *   </Shell.Header.Menu.Group>
 * </Shell.Header.Menu>
 * ```
 */
export interface IHeaderMenuSubProps {
  children?: JSX.Element;
  class?: string;
}

/**
 * Compound-тип всего Header: базовый компонент + .Navigation + .Menu.
 */
export interface IHeaderCompound {
  (props: IHeaderProps): JSX.Element;
  Navigation: Component<IHeaderNavigationProps<any>>;
  Menu: {
    (props: IHeaderMenuProps): JSX.Element;
    Group: Component<IHeaderMenuSubProps>;
    Label: Component<IHeaderMenuSubProps>;
    Item: Component<IHeaderMenuSubProps & { onSelect?: () => void }>;
    Separator: Component<object>;
  };
}

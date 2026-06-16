import type { JSX } from 'solid-js';
import { For, Match, Switch, splitProps, useContext } from 'solid-js';

import { resolveIcon } from '../../icons';
import { Dropdown } from '../../primitives/dropdown';
import { Toggle } from '../../primitives/toggle';
import { CompositeProxyContext } from '../compositeProxy';

import type {
  IMenuActionItem,
  IMenuDropdownProps,
  IMenuItemMeta,
  IMenuProps,
  MenuItem,
} from './interfaces';

/** Props for the inner action row — `item` plus the HCA target descriptors. */
interface IMenuActionRowProps {
  item: IMenuActionItem;
  /** HCA tags — consumed by the events wrapper (web-core), not by this row. */
  meta?: IMenuItemMeta;
  /** HCA payload — consumed by the events wrapper (web-core). */
  payload?: Record<string, unknown>;
}

/**
 * Inner action-row component. Kept as a named component so the events wrapper
 * (CompositeProxyContext.wrap, injected by web-core) can attach a stable display
 * name and bind the HCA event from `meta` / `payload`.
 *
 * The wrapper CONSUMES `meta` / `payload` (they never reach this component) and
 * instead injects the bound event handlers (onClick, onChange, …) — so we split
 * off what we own and forward the rest (the injected handlers) onto the DOM row,
 * exactly like `DataTable`'s `DataRow`. Standalone (wrap = identity) the rest is
 * empty and activation flows through `onSelect`.
 */
function MenuActionRow(props: IMenuActionRowProps) {
  const [local, handlers] = splitProps(props, ['item', 'meta', 'payload']);
  const item = () => local.item;
  return (
    <Dropdown.Row
      variant="item"
      icon={item().icon ? resolveIcon(item().icon!) : undefined}
      label={item().label}
      disabled={item().disabled}
      closeOnSelect={item().closeOnSelect}
      onSelect={item().onSelect}
      {...(handlers as object)}
    />
  );
}

type WrappedActionRow = (props: IMenuActionRowProps) => JSX.Element;

/**
 * Recursively renders `MenuItem[]` into the matching `Dropdown.*` compound
 * elements, sharing the canonical `Dropdown.Row` layout for every row type.
 */
function renderItems(items: MenuItem[], ActionRow: WrappedActionRow): JSX.Element {
  return (
    <For each={items}>
      {(item) => (
        <Switch>
          <Match when={item.type === 'separator'}>
            <Dropdown.Separator />
          </Match>

          <Match when={item.type === 'label' && item}>
            {(it) => (
              <Dropdown.Group>
                <Dropdown.Label>{it().label}</Dropdown.Label>
              </Dropdown.Group>
            )}
          </Match>

          <Match when={item.type === 'toggle' && item}>
            {(it) => (
              <Dropdown.Row
                variant="static"
                icon={it().icon ? resolveIcon(it().icon!) : undefined}
                label={it().label}
                trailing={
                  <Toggle
                    size="sm"
                    checked={it().checked}
                    disabled={it().disabled}
                    onChange={(checked) => it().onChange?.(checked)}
                  />
                }
              />
            )}
          </Match>

          <Match when={item.type === 'submenu' && item}>
            {(it) => (
              <Dropdown.Sub>
                <Dropdown.Row
                  variant="sub"
                  icon={it().icon ? resolveIcon(it().icon!) : undefined}
                  label={it().label}
                  disabled={it().disabled}
                />
                <Dropdown.SubContent>{renderItems(it().items, ActionRow)}</Dropdown.SubContent>
              </Dropdown.Sub>
            )}
          </Match>

          <Match when={item.type === 'expandable' && item}>
            {(it) => (
              <Dropdown.Sub open={it().open} onOpenChange={it().onOpenChange}>
                <Dropdown.Row
                  variant="sub"
                  icon={it().icon ? resolveIcon(it().icon!) : undefined}
                  label={it().label}
                  disabled={it().disabled}
                />
                <Dropdown.SubContent>{it().render()}</Dropdown.SubContent>
              </Dropdown.Sub>
            )}
          </Match>

          <Match when={item.type === 'action' && item}>
            {(it) => <ActionRow item={it()} meta={it().meta} payload={it().payload} />}
          </Match>
        </Switch>
      )}
    </For>
  );
}

/**
 * Container-agnostic menu list. Renders `items` as canonical rows with no
 * surrounding chrome — drop it into any panel (`Dropdown.Content`, a popover,
 * a sidebar) or use `Menu.Dropdown` for a ready dropdown.
 *
 * Action rows are wrapped once via `CompositeProxyContext.wrap` (injected by
 * web-core) so a row's `meta` activates a named HCA event in the parent
 * Controller/Feature — the same mechanism `DataTable` uses for its rows.
 *
 * @example
 * ```tsx
 * <Menu items={[
 *   { type: 'label', id: 'h', label: 'Account' },
 *   { type: 'toggle', id: 'dark', icon: 'moon', label: 'Dark', checked: dark(), onChange: setDark },
 *   { type: 'separator', id: 's' },
 *   { type: 'action', id: 'logout', icon: 'log-out', label: 'Выйти', meta: { tags: ['logout'] } },
 * ]} />
 * ```
 */
function MenuList(props: IMenuProps): JSX.Element {
  const { wrap } = useContext(CompositeProxyContext);
  const ActionRow: WrappedActionRow = wrap ? wrap(MenuActionRow, 'MenuActionRow') : MenuActionRow;
  return <>{renderItems(props.items, ActionRow)}</>;
}

/**
 * Ready dropdown menu — wraps the `Menu` list in a web-ui `Dropdown` container.
 *
 * @example
 * ```tsx
 * <Menu.Dropdown
 *   trigger={<Button variant="ghost" size="icon"><Menu /></Button>}
 *   items={[ ...appearanceItems, { type: 'action', id: 'logout', icon: 'log-out', label: 'Выйти' } ]}
 * />
 * ```
 */
function MenuDropdown(props: IMenuDropdownProps): JSX.Element {
  const [own, rest] = splitProps(props, ['trigger', 'items']);
  return (
    <Dropdown {...rest}>
      <Dropdown.Trigger>{own.trigger}</Dropdown.Trigger>
      <Dropdown.Content>
        <MenuList items={own.items} />
      </Dropdown.Content>
    </Dropdown>
  );
}

/**
 * Data-driven menu composite. `Menu` is the container-agnostic list;
 * `Menu.Dropdown` is the ready dropdown. Owns the canonical row styling for
 * every item type (action / toggle / submenu / expandable / separator / label).
 */
export const Menu = Object.assign(MenuList, {
  Dropdown: MenuDropdown,
});

// Named re-exports for web-core lazy compound assembly (mirrors Dropdown).
export { MenuDropdown };

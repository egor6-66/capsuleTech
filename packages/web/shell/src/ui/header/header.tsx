import { cn } from '@capsuletech/web-style';
import { Button } from '@capsuletech/web-ui/button';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { Group } from '@capsuletech/web-ui/group';
import { Menu } from '@capsuletech/web-ui/icons';
import type { ParentProps } from 'solid-js';

import type {
  IHeaderCompound,
  IHeaderMenuProps,
  IHeaderMenuSubProps,
  IHeaderNavigationProps,
  IHeaderProps,
} from './interfaces';

// ---------------------------------------------------------------------------
// Shell.Header — bar-контейнер (ParentComponent)
// ---------------------------------------------------------------------------

function HeaderRoot(props: IHeaderProps) {
  return (
    <div
      class={cn(
        'flex h-full items-center justify-between',
        'border-b bg-background px-cell',
        props.class,
      )}
    >
      {props.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shell.Header.Navigation — батч-контейнер, Shape-совместимый
//
// Обёртка над ui.Group — форвардит ВСЕ батч-props (data/itemAs/itemProps/
// orientation/variant/gap/tags/resizable/withHandle/children).
// Header-специфичные дефолты: orientation='horizontal', gap=1.
// ---------------------------------------------------------------------------

function HeaderNavigation<T = unknown>(props: IHeaderNavigationProps<T>) {
  return (
    <Group<T>
      orientation={props.orientation ?? 'horizontal'}
      gap={props.gap ?? 1}
      variant={props.variant}
      data={props.data}
      itemAs={props.itemAs}
      itemProps={props.itemProps}
      tags={props.tags}
      resizable={props.resizable}
      withHandle={props.withHandle}
      class={cn('items-center', props.class)}
      style={props.style}
    >
      {props.children}
    </Group>
  );
}

// ---------------------------------------------------------------------------
// Shell.Header.Menu — dropdown с children
// Trigger = Button ghost/icon + Menu-иконка из web-ui/icons.
// Content рендерит children как-есть — апп сам решает структуру.
// ---------------------------------------------------------------------------

function HeaderMenu(props: IHeaderMenuProps) {
  return (
    <Dropdown modal={false}>
      <Dropdown.Trigger
        as={Button}
        variant="ghost"
        size="icon"
        aria-label={props.label ?? 'Меню'}
      >
        <Menu class="size-5" aria-hidden="true" />
      </Dropdown.Trigger>

      <Dropdown.Content>
        {props.children}
      </Dropdown.Content>
    </Dropdown>
  );
}

// ---------------------------------------------------------------------------
// Shell.Header.Menu sub-helpers — re-export Dropdown.* как Menu.*
// Апп может юзать их для семантической структуры внутри Menu.
// ---------------------------------------------------------------------------

function MenuGroup(props: IHeaderMenuSubProps) {
  return <Dropdown.Group>{props.children}</Dropdown.Group>;
}

function MenuLabel(props: IHeaderMenuSubProps) {
  return <Dropdown.Label class={props.class}>{props.children}</Dropdown.Label>;
}

function MenuSeparator(_props: object) {
  return <Dropdown.Separator />;
}

function MenuItemSub(
  props: IHeaderMenuSubProps & { onSelect?: () => void },
) {
  return (
    <Dropdown.Item onSelect={props.onSelect} class={props.class}>
      {props.children}
    </Dropdown.Item>
  );
}

// Attach sub-helpers onto Menu
const HeaderMenuCompound = Object.assign(HeaderMenu, {
  Group: MenuGroup,
  Label: MenuLabel,
  Item: MenuItemSub,
  Separator: MenuSeparator,
});

// ---------------------------------------------------------------------------
// Shell.Header — compound (Object.assign)
// ---------------------------------------------------------------------------

export const Header: IHeaderCompound = Object.assign(HeaderRoot, {
  Navigation: HeaderNavigation as IHeaderCompound['Navigation'],
  Menu: HeaderMenuCompound,
});

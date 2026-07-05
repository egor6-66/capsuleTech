import { List as ListRoot } from './list';
import { SelectableItem } from './selectableItem';

export const List = Object.assign(ListRoot, {
  /** Selectable leaf row (`Ui.List.Item`). Click / Enter / Space → `onSelect`. */
  Item: SelectableItem,
  Virtual: ListRoot.Virtual,
});

export type { ISelectableItemProps } from './interfaces';
export { SelectableItem };

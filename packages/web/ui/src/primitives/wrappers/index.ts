/**
 * @deprecated Resizable has been merged into Flex (items + resizable mode).
 * Use `<Flex items={[...]} withHandle />` instead.
 * This re-export is kept for backwards compatibility with consumers.
 */
import { Flex as ResizableCompat } from '../layout/flex/flex';
import { Status } from './status';

type WrapperWithStaticProps = {
  Status: typeof Status;
  /** @deprecated Use Flex with items instead */
  Resizable: typeof ResizableCompat;
};

const Wrapper = {} as WrapperWithStaticProps;
Wrapper.Status = Status;
Wrapper.Resizable = ResizableCompat;

/**
 * @deprecated Imported from wrappers for backwards compat.
 * Use `IFlex.IFlexItem` and `IFlex.IFlexProps` from `@capsuletech/web-ui/flex` instead.
 */
export type {
  FlexOrientation as ResizableOrientation,
  IFlexItem as IResizableItem,
} from '../layout/flex/interfaces';
/**
 * @deprecated Use `Flex` with `items` prop instead.
 * Kept for backwards compatibility.
 */
export { ResizableCompat as Resizable, Status, Wrapper };

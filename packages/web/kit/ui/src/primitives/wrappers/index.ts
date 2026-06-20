import { Resizable as ResizableImpl } from '../layout/resizable';
import { Status } from './status';

type WrapperWithStaticProps = {
  Status: typeof Status;
  Resizable: typeof ResizableImpl;
};

const Wrapper = {} as WrapperWithStaticProps;
Wrapper.Status = Status;
Wrapper.Resizable = ResizableImpl;

export type {
  ResizableOrientation,
  IResizableItem,
} from '../layout/resizable/interfaces';
export { ResizableImpl as Resizable, Status, Wrapper };

import type { IControllerWrapper } from '../interfaces';
import { createLogicWrapper } from './utils/createLogicWrapper';

export const ControllerWrapper: IControllerWrapper = createLogicWrapper('controller');

import type { IFeatureWrapper } from '../interfaces';
import { createLogicWrapper } from './utils/createLogicWrapper';

export const FeatureWrapper: IFeatureWrapper = createLogicWrapper('feature');

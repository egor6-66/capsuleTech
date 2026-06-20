import { Flex } from './flex';
import { Grid } from './grid';
import { Resizable } from './resizable';

export * from './flex';
export * from './grid';
export type * as IResizable from './resizable/interfaces';

/**
 * Layout namespace shape — kit ships { Grid, Flex, Resizable }; boost-layout
 * (and future heavy-layout boosters) augment this interface with
 * additional members (Matrix etc.) per ADR 046 D5 (augmentation pattern).
 *
 * Module augmentation:
 *   declare module '@capsuletech/web-ui/layout' {
 *     interface ILayoutNamespace {
 *       Matrix: typeof MatrixController;
 *     }
 *   }
 */
export interface ILayoutNamespace {
  Grid: typeof Grid;
  Flex: typeof Flex;
  Resizable: typeof Resizable;
}

/**
 * Layout namespace — compound for layout primitives.
 * Usage: `<Layout.Grid cols={3} />`, `<Layout.Flex gap={4} />`, `<Layout.Resizable items={[...]} />`.
 * Heavy variants (Matrix etc.) live in `@capsuletech/boost-layout` and
 * augment this object at app boot via ADR 033 capsule.ts manifests.
 */
export const Layout: ILayoutNamespace = { Grid, Flex, Resizable };

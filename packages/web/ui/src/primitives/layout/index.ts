import { Flex } from './flex';
import { Grid } from './grid';
import { Matrix } from './matrix';

export * from './flex';
export * from './grid';
export * from './matrix';

/**
 * Layout namespace — compound for the three layout primitives.
 * Usage: `<Layout.Matrix slots={...} />`, `<Layout.Grid cols={3} />`, `<Layout.Flex gap={4} />`
 */
export const Layout = { Grid, Flex, Matrix };

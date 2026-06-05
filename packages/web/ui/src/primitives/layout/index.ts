import { Flex } from './flex';
import { Grid } from './grid';

export * from './flex';
export * from './grid';

/**
 * Layout namespace — compound for layout primitives.
 * Usage: `<Layout.Grid cols={3} />`, `<Layout.Flex gap={4} />`
 * Matrix has been moved to @capsuletech/web-shell.
 */
export const Layout = { Grid, Flex };

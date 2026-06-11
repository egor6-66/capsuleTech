/**
 * Manual Vitest mock for @capsuletech/web-router.
 *
 * Provides a no-op useRouteDepth() that returns depth=0 without requiring
 * a real TanStack RouterProvider in the test tree. All Matrix render tests
 * run in jsdom without a router context — this mock prevents the
 * "Cannot read properties of null (reading 'stores')" error from useMatches().
 *
 * The mock is auto-applied in the shell package's test suite because Vitest
 * resolves __mocks__ adjacent to node_modules automatically when the module
 * is inlined via server.deps.inline.
 */
export const useRouteDepth = () => () => 0;

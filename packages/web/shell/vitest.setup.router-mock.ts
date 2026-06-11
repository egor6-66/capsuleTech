/**
 * vitest.setup.router-mock.ts
 *
 * Mocks @capsuletech/web-router for all shell package tests.
 *
 * useRouteDepth() calls useMatches() from TanStack Router which requires a live
 * RouterProvider in the component tree. Matrix render tests run in jsdom without
 * a router context → useMatches() throws "Cannot read properties of null".
 *
 * This setup file applies a global vi.mock so all tests that render Matrix
 * (which transitively calls useRouteDepth via cell.tsx / content.tsx) get a
 * depth=0 stub without any RouterProvider in the test tree.
 */
import { vi } from 'vitest';

vi.mock('@capsuletech/web-router', () => ({
  useRouteDepth: () => () => 0,
}));

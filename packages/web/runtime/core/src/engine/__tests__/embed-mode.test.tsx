/* @vitest-environment jsdom */
/**
 * embed-mode.test.tsx
 *
 * Static run-mode flags (`embedded` / `standalone`) injected into the `services`
 * object of every Controller/Feature factory (brief — embedded flag in services).
 *
 * Source of truth is the bootstrap iframe-check, surfaced via `EmbedModeContext`.
 * Renders a real Controller and captures the `services` passed to its factory.
 *
 * Contracts:
 *  1. services carries both flags (`embedded` + `standalone`).
 *  2. Default (no provider — standalone) → `embedded: false`, `standalone: true`.
 *  3. Provider `{ embedded: true }` → `embedded: true`, `standalone: false`.
 *  4. `standalone === !embedded` (mirror invariant) in both modes.
 */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LogicWrapper calls useRouter() unconditionally; stub it so a bare Controller can
// mount without a full RouterProvider tree (we only exercise the embed-mode path).
vi.mock('@capsuletech/web-router', () => ({
  useRouter: () => ({ goTo: () => {}, back: () => {}, current: () => '/', raw: {} }),
}));

import { ControllerWrapper } from '../../wrappers/controller';
import type { IServices } from '../../wrappers/interfaces';
import { EmbedModeContext } from '../host-bridge';

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.removeChild(container);
});

/** Renders a Controller, capturing the `services` object handed to its factory. */
const captureServices = (tree: (Root: any) => any): IServices => {
  let captured: IServices | undefined;
  const Root = ControllerWrapper((services) => {
    captured = services;
    return { initial: 'idle', states: { idle: {} } };
  }) as any;

  cleanup = render(() => tree(Root), container);
  if (!captured) throw new Error('services were not captured');
  return captured;
};

describe('embed-mode services flags', () => {
  it('services carries both `embedded` and `standalone`', () => {
    const services = captureServices((Root) => <Root />);
    expect(services).toHaveProperty('embedded');
    expect(services).toHaveProperty('standalone');
  });

  it('default (no provider) → standalone: embedded=false / standalone=true', () => {
    const services = captureServices((Root) => <Root />);
    expect(services.embedded).toBe(false);
    expect(services.standalone).toBe(true);
  });

  it('provider { embedded: true } → embedded=true / standalone=false', () => {
    const services = captureServices((Root) => (
      <EmbedModeContext.Provider value={{ embedded: true }}>
        <Root />
      </EmbedModeContext.Provider>
    ));
    expect(services.embedded).toBe(true);
    expect(services.standalone).toBe(false);
  });

  it('standalone is always the mirror of embedded', () => {
    const standalone = captureServices((Root) => <Root />);
    expect(standalone.standalone).toBe(!standalone.embedded);
    cleanup?.();
    cleanup = undefined;

    const embedded = captureServices((Root) => (
      <EmbedModeContext.Provider value={{ embedded: true }}>
        <Root />
      </EmbedModeContext.Provider>
    ));
    expect(embedded.standalone).toBe(!embedded.embedded);
  });
});

/**
 * Type-level tests for <Remote.View> typing + cross-boundary CapsuleRemotes merge
 * (ADR 060 D6 + augmentation-merge fix).
 *
 * NOT a vitest test — no `.test.` suffix, so it is excluded from `vitest run`
 * (include = `**​/__tests__/**​/*.test.tsx`). It is type-checked by the `typecheck`
 * target (`tsc --noEmit`, tsconfig `include: ["src"]`) and is NOT reachable from the
 * entry barrel, so the dts build never emits it. The `declare module` augmentation
 * is therefore program-local and does not leak into the published types.
 *
 * ⚠️ The augmentation here targets the PUBLIC barrel specifier
 * `@capsuletech/web-remote` (resolved to src/index.ts via tsconfig paths) — NOT the
 * relative `../interfaces`. That reproduces the real app boundary: a generated
 * `remotes.d.ts` augments the package, and the reader (`IRemoteViewProps`) must see
 * the same merged symbol. The earlier relative-import version gave a FALSE positive
 * because it bypassed this boundary. The DEFINITIVE check is the playground app-e2e
 * (dist resolution) — architect re-runs it.
 */

import type { JSX } from 'solid-js';
// Read the type through the PUBLIC barrel — same module the augmentation targets.
import type { IRemoteViewProps } from '@capsuletech/web-remote';
import { RemoteView } from './RemoteView';

// Fake augmentation — mimics what `.capsule/@types/remotes.d.ts` (vite-builder
// 3-of-4) emits in a real app. Targets the package, like the generated file does.
declare module '@capsuletech/web-remote' {
  interface CapsuleRemotes {
    map: {
      in: { setView: { lat: number; lng: number } };
      out: { markerClick: { id: string }; zoomChange: { level: number } };
    };
  }
}

// ── Cross-boundary merge discriminator ───────────────────────────────────────
// If the augmentation merges through the barrel, IRemoteViewProps<'map'> is the
// TYPED branch → `onMarkerClick` is `((p: { id: string }) => void) | undefined`.
// If it fell into the loose branch (the bug), the prop is `unknown` (index
// signature) → `h?.({ id })` is "not callable" → typecheck FAILS here. So this
// line is the regression guard for the merge itself.
type OnMarkerClick = IRemoteViewProps<'map'>['onMarkerClick'];
const _mergesThroughBarrel = (h: OnMarkerClick): void => {
  h?.({ id: 'x' });
};

// ── <Remote.View> usage (RemoteView reads CapsuleRemotes from ./index) ────────

// ✓ known name → typed on<Out> handlers, payload inferred from the contract.
const _ok: JSX.Element = (
  <RemoteView
    name="map"
    onMarkerClick={(p) => {
      const _id: string = p.id;
    }}
    onZoomChange={(p) => {
      const _lvl: number = p.level;
    }}
  />
);

// ✗ wrong payload field → type error inside the handler.
const _badPayload: JSX.Element = (
  <RemoteView
    name="map"
    onMarkerClick={(p) => {
      // @ts-expect-error — payload is `{ id: string }`, there is no `nope`.
      const _x: string = p.nope;
    }}
  />
);

// ✗ unknown out event → excess-property type error.
const _badEvent: JSX.Element = (
  <RemoteView
    name="map"
    // @ts-expect-error — 'onWiggle' is not an out event of "map".
    onWiggle={() => {}}
  />
);

// ✓ unknown name → falls back to the loose typing (arbitrary on* accepted, no error).
const _fallback: JSX.Element = <RemoteView name="unregistered" onAnything={() => {}} />;

// Keep this a module under stricter unused-checks.
export type _TypeTests = [
  typeof _mergesThroughBarrel,
  typeof _ok,
  typeof _badPayload,
  typeof _badEvent,
  typeof _fallback,
];

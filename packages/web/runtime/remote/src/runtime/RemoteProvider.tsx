/**
 * RemoteProvider — root context provider for @capsuletech/web-remote.
 *
 * Mounts above <RouterProvider> at app level. Accepts a reactive `modules` list
 * and optional `config` for ambient app config (provider-level default).
 *
 * Transport array shape — required even with multiple transports — Phase 1B
 * adds LocalShadowDomTransport (default for same-origin embedded mounts) and
 * keeps IframeTransport as the fallback for cases shadow-DOM declines
 * (standalone window / cross-origin, both Phase 2). Order matters: the
 * resolver in RemoteComponent picks the first transport whose `canReach`
 * returns `true`, so shadow-DOM must come first.
 *
 * On mount the Provider also dispatches a best-effort `fetchManifest` per
 * module and validates each remote's `shared` block against the host's
 * `<script type="importmap">` (`validateSharedCompat`, ADR 057 §D2). Failures
 * surface as `console.error` — they are reported eagerly so version drift is
 * visible before any `<Remote.View>` mount tries the dynamic import. The
 * RemoteComponent does its own fetch for the entry-URL discovery; the
 * Provider's fetch is purely the version gate.
 */

import { createEffect, createUniqueId, type JSX, onCleanup } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import type {
  IRemoteComponentProps,
  IRemoteContext,
  IRemoteModuleConfig,
  IRemoteProviderProps,
  ITransport,
} from '../interfaces';
import { IframeTransport } from '../transport/IframeTransport';
import { LocalShadowDomTransport } from '../transport/LocalShadowDomTransport';
import { createHostHandle } from './createHostHandle';
import { fetchManifest, readHostImportMap, validateSharedCompat } from './manifestFetcher';
import { RemoteComponent } from './RemoteComponent';
import { RemoteContext } from './RemoteContext';

export const RemoteProvider = (props: IRemoteProviderProps): JSX.Element => {
  const sessionId = createUniqueId();

  const [modules, setModules] = createStore<Record<string, IRemoteModuleConfig>>({});

  // ADR-053 Decision 8: transports is an array. Order = resolver priority
  // (first canReach wins). Shadow-DOM first per ADR 057 §D3 — iframe is the
  // fallback for standalone / cross-origin (Phase 2).
  const transports: ITransport[] = [
    new LocalShadowDomTransport(sessionId),
    new IframeTransport(sessionId),
  ];

  // Keep the modules store in sync with the reactive props.modules array
  createEffect(() => {
    const next = Object.fromEntries(props.modules.map((m) => [m.name, m]));
    setModules(reconcile(next));
  });

  // ADR 057 §D2 validate-on-mount: for each module, fetch the manifest and
  // verify its `shared` block against the host's import-map. Failures are
  // logged eagerly (no throw) — RemoteComponent's own resource still controls
  // the loading/error UI per <Remote.View fallback>.
  createEffect(() => {
    const hostMap = readHostImportMap();
    for (const m of props.modules) {
      void fetchManifest(m.url)
        .then((manifest) => {
          if (!manifest.shared) return;
          try {
            validateSharedCompat(manifest.shared, hostMap.imports);
          } catch (err) {
            console.error(`[capsule/remote] shared-deps mismatch for '${m.name}':`, err);
          }
        })
        .catch(() => {
          // Manifest unreachable — RemoteComponent surfaces the error to the
          // user via its own resource state; Provider stays silent here to
          // avoid double-logging.
        });
    }
  });

  // Dispose all transports on unmount
  onCleanup(() => {
    for (const t of transports) {
      t.dispose();
    }
  });

  const ctx: IRemoteContext = {
    Remote: (cp: IRemoteComponentProps): JSX.Element => (
      <RemoteComponent
        {...cp}
        transports={transports}
        sessionId={sessionId}
        modules={modules}
        providerConfig={props.config}
      />
    ),

    remote: (name: string, instanceId?: string) =>
      createHostHandle(name, instanceId ?? '', transports, sessionId),

    updateModule: (name: string, patch: Partial<IRemoteModuleConfig>) => {
      setModules(name, patch);
    },

    modules,
  };

  return <RemoteContext.Provider value={ctx}>{props.children}</RemoteContext.Provider>;
};

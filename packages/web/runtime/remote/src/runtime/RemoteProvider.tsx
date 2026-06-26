/**
 * RemoteProvider — root context provider for @capsuletech/web-remote.
 *
 * Mounts above <RouterProvider> at app level. Accepts a reactive `modules` list
 * and optional `config` for ambient app config (provider-level default).
 *
 * Transport array shape is required even with a single transport — Phase 2+
 * will add BroadcastChannelTransport to the array without changing consumer code.
 * ADR-053 Decision 8.
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
import { createHostHandle } from './createHostHandle';
import { RemoteComponent } from './RemoteComponent';
import { RemoteContext } from './RemoteContext';

export const RemoteProvider = (props: IRemoteProviderProps): JSX.Element => {
  const sessionId = createUniqueId();

  const [modules, setModules] = createStore<Record<string, IRemoteModuleConfig>>({});

  // ADR-053 Decision 8: transports is an array even with one element.
  // Phase 2 will push BroadcastChannelTransport here without changing consumer API.
  const transports: ITransport[] = [new IframeTransport(sessionId)];

  // Keep the modules store in sync with the reactive props.modules array
  createEffect(() => {
    const next = Object.fromEntries(props.modules.map((m) => [m.name, m]));
    setModules(reconcile(next));
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

    remote: <N extends string = string>(name: N, instanceId?: string) =>
      createHostHandle<N>(name, instanceId ?? '', transports, sessionId),

    updateModule: (name: string, patch: Partial<IRemoteModuleConfig>) => {
      setModules(name, patch);
    },

    modules,
  };

  return <RemoteContext.Provider value={ctx}>{props.children}</RemoteContext.Provider>;
};

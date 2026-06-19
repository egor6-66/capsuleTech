/**
 * useRemote — hook to access the IRemoteContext.
 * Must be called inside <RemoteProvider>.
 */

import { useContext } from 'solid-js';
import type { IRemoteContext } from '../interfaces';
import { RemoteContext } from './RemoteContext';

export const useRemote = (): IRemoteContext => {
  const ctx = useContext(RemoteContext);
  if (!ctx) {
    throw new Error('[capsule/web-remote] useRemote() must be called inside <RemoteProvider>');
  }
  return ctx;
};

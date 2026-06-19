/**
 * RemoteContext — Solid Context for IRemoteContext.
 * Consumed by useRemote() and provided by <RemoteProvider>.
 */

import { createContext } from 'solid-js';
import type { IRemoteContext } from '../interfaces';

export const RemoteContext = createContext<IRemoteContext | undefined>(undefined);

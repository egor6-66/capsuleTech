/**
 * host-bridge.test.ts
 *
 * Unit tests for createHostInbound — per-instance host→app inbound channel (ADR 060 D1).
 *
 * Contracts:
 *  1. emit broadcasts to all registered dispatchers.
 *  2. unregister stops a dispatcher from receiving further emits.
 *  3. emit with no dispatchers is a safe no-op.
 *  4. payload is forwarded verbatim.
 */

import { describe, expect, it, vi } from 'vitest';
import { createHostInbound } from '../host-bridge';

describe('createHostInbound', () => {
  it('broadcasts emit to all registered dispatchers', () => {
    const inbound = createHostInbound();
    const a = vi.fn();
    const b = vi.fn();
    inbound.register(a);
    inbound.register(b);

    inbound.emit('setMarkers', [{ id: 1 }]);

    expect(a).toHaveBeenCalledWith('setMarkers', [{ id: 1 }]);
    expect(b).toHaveBeenCalledWith('setMarkers', [{ id: 1 }]);
  });

  it('unregister stops further delivery', () => {
    const inbound = createHostInbound();
    const a = vi.fn();
    const off = inbound.register(a);

    inbound.emit('ping', 1);
    off();
    inbound.emit('ping', 2);

    expect(a).toHaveBeenCalledTimes(1);
    expect(a).toHaveBeenCalledWith('ping', 1);
  });

  it('emit with no dispatchers is a safe no-op', () => {
    const inbound = createHostInbound();
    expect(() => inbound.emit('whatever', {})).not.toThrow();
  });
});

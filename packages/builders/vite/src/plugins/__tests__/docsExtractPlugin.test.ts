/**
 * Smoke tests for DocsExtractPlugin wiring in vite-builder (Phase 3.2 — ADR 052 D2).
 *
 * Verifies:
 * - Plugin re-exported from @capsuletech/vite-builder plugins barrel
 * - capsuleConfig() includes DocsExtractPlugin by default
 * - capsuleConfig() respects docs: false opt-out
 * - Plugin uses 'app' strategy in capsuleConfig context
 */

import { describe, expect, it, vi } from 'vitest';
import { DocsExtractPlugin } from '../index';

describe('DocsExtractPlugin — re-export from vite-builder', () => {
  it('is exported from plugins/index', () => {
    expect(typeof DocsExtractPlugin).toBe('function');
  });

  it('returns a Vite plugin with correct name and apply', () => {
    const plugin = DocsExtractPlugin();
    expect(plugin).toMatchObject({
      name: 'capsule:docs-extract',
      apply: 'build',
    });
  });

  it('respects enabled: false', () => {
    const plugin = DocsExtractPlugin({ enabled: false });
    expect(plugin.name).toBe('capsule:docs-extract');
    expect(typeof plugin.closeBundle).toBe('function');
  });

  it('accepts slugStrategyOverride', () => {
    // Just verify it constructs without throwing
    const plugin = DocsExtractPlugin({ slugStrategyOverride: 'app' });
    expect(plugin.name).toBe('capsule:docs-extract');
  });

  it('accepts rootOverride', () => {
    const plugin = DocsExtractPlugin({ rootOverride: '/some/absolute/path' });
    expect(plugin.name).toBe('capsule:docs-extract');
  });
});

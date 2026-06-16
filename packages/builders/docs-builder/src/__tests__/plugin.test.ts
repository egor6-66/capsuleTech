/**
 * Smoke tests for DocsExtractPlugin (Phase 3.5 — moved into docs-builder).
 */

import { describe, expect, it } from 'vitest';
import { DocsExtractPlugin } from '../plugin.js';

describe('DocsExtractPlugin', () => {
  it('returns a Vite plugin with correct name and apply', () => {
    const plugin = DocsExtractPlugin();
    expect(plugin).toMatchObject({
      name: 'capsule:docs-extract',
      apply: 'build',
    });
    expect(typeof plugin.closeBundle).toBe('function');
  });

  it('respects enabled: false at construction time', () => {
    const plugin = DocsExtractPlugin({ enabled: false });
    expect(plugin.name).toBe('capsule:docs-extract');
    expect(typeof plugin.closeBundle).toBe('function');
  });

  it('accepts slugStrategyOverride', () => {
    const plugin = DocsExtractPlugin({ slugStrategyOverride: 'app' });
    expect(plugin.name).toBe('capsule:docs-extract');
  });

  it('accepts rootOverride', () => {
    const plugin = DocsExtractPlugin({ rootOverride: '/some/absolute/path' });
    expect(plugin.name).toBe('capsule:docs-extract');
  });

  it('is re-exported from package index', async () => {
    const mod = await import('../index.js');
    expect(typeof mod.DocsExtractPlugin).toBe('function');
  });
});

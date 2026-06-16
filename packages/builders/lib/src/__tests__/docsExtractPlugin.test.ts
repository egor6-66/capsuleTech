/**
 * Unit tests for DocsExtractPlugin (Phase 3.1 — ADR 052 D2).
 *
 * Strategy: test that libConfig() includes/excludes the plugin correctly,
 * and verify plugin metadata.
 */

import { describe, expect, it } from 'vitest';
import { libConfig } from '../libConfig';

const baseOpts = {
  entry: 'src/index.ts',
  name: 'TestLib',
} as const;

type AnyPlugin = { name?: string; apply?: string };

const pluginNames = (cfg: ReturnType<typeof libConfig>): string[] =>
  ((cfg.plugins ?? []) as unknown[])
    .flat(Number.POSITIVE_INFINITY)
    .filter(Boolean)
    .map((p) => (p as AnyPlugin).name)
    .filter((n): n is string => Boolean(n));

describe('DocsExtractPlugin — libConfig integration', () => {
  it('is included by default', () => {
    const names = pluginNames(libConfig(baseOpts));
    expect(names).toContain('capsule:docs-extract');
  });

  it('is excluded when docs: false', () => {
    const names = pluginNames(libConfig({ ...baseOpts, docs: false }));
    expect(names).not.toContain('capsule:docs-extract');
  });

  it('is included when docs: {} (empty options)', () => {
    const names = pluginNames(libConfig({ ...baseOpts, docs: {} }));
    expect(names).toContain('capsule:docs-extract');
  });

  it('is included when docs: { enabled: true }', () => {
    const names = pluginNames(libConfig({ ...baseOpts, docs: { enabled: true } }));
    expect(names).toContain('capsule:docs-extract');
  });

  it('is still present in plugin list when docs: { enabled: false } (plugin handles internally)', () => {
    // DocsExtractPlugin({ enabled: false }) still registers the plugin — it just no-ops at closeBundle.
    // This ensures the plugin slot is always present; enabled flag controls runtime behavior.
    const names = pluginNames(libConfig({ ...baseOpts, docs: { enabled: false } }));
    expect(names).toContain('capsule:docs-extract');
  });

  it('plugin applies to build only', () => {
    const plugins = ((libConfig(baseOpts).plugins ?? []) as unknown[])
      .flat(Number.POSITIVE_INFINITY)
      .filter(Boolean) as AnyPlugin[];
    const docsPlugin = plugins.find((p) => p.name === 'capsule:docs-extract');
    expect(docsPlugin).toBeDefined();
    expect(docsPlugin?.apply).toBe('build');
  });

  it('docs plugin is ordered after emit-dist-package-json and before user plugins', () => {
    const userPlugin = { name: 'user-marker' };
    const names = pluginNames(libConfig({ ...baseOpts, plugins: [userPlugin] }));
    const docsIdx = names.indexOf('capsule:docs-extract');
    const userIdx = names.indexOf('user-marker');
    const emitIdx = names.indexOf('capsule:emit-dist-package-json');
    // docs comes after emit-package-json
    expect(docsIdx).toBeGreaterThan(emitIdx);
    // docs comes before user plugin
    expect(docsIdx).toBeLessThan(userIdx);
  });
});

describe('DocsExtractPlugin — standalone', () => {
  it('exports DocsExtractPlugin from index', async () => {
    // Dynamic import to test the public export path
    const mod = await import('../index');
    expect(typeof mod.DocsExtractPlugin).toBe('function');
  });

  it('DocsExtractPlugin() returns a valid Vite plugin object', async () => {
    const { DocsExtractPlugin } = await import('../index');
    const plugin = DocsExtractPlugin();
    expect(plugin).toMatchObject({
      name: 'capsule:docs-extract',
      apply: 'build',
    });
    expect(typeof plugin.closeBundle).toBe('function');
  });

  it('DocsExtractPlugin({ enabled: false }) still returns plugin with correct name', async () => {
    const { DocsExtractPlugin } = await import('../index');
    const plugin = DocsExtractPlugin({ enabled: false });
    expect(plugin.name).toBe('capsule:docs-extract');
  });
});

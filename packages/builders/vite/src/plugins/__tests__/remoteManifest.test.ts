import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RemoteManifestPlugin } from '../remoteManifest';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

import { existsSync, writeFileSync } from 'node:fs';

const APP_ROOT = 'D:/projects/capsule/apps/my-app';
const CAPSULE_ROOT = APP_ROOT + '/.capsule';

function buildPlugin() { return RemoteManifestPlugin({ appRoot: APP_ROOT }); }

function runConfigResolved(plugin: ReturnType<typeof buildPlugin>) {
  (plugin as any).configResolved({ root: CAPSULE_ROOT });
}

function runBuildStart(plugin: ReturnType<typeof buildPlugin>): string {
  (plugin as any).buildStart();
  const calls = vi.mocked(writeFileSync).mock.calls;
  const call = calls.find((c: any[]) => String(c[0]).endsWith('remote-entry.ts'));
  return call ? String(call[1]) : '';
}

describe('RemoteManifestPlugin -- identity', () => {
  it('correct plugin name', () => {
    expect(buildPlugin().name).toBe('capsule:remote-manifest');
  });
  it('configResolved hook defined', () => {
    expect(typeof (buildPlugin() as any).configResolved).toBe('function');
  });
  it('buildStart hook defined', () => {
    expect(typeof (buildPlugin() as any).buildStart).toBe('function');
  });
});

describe('RemoteManifestPlugin -- default entry (no src/remote.ts)', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(existsSync).mockReturnValue(false); });

  it('existsSync called with src/remote.ts path', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); runBuildStart(plugin);
    expect(existsSync).toHaveBeenCalledWith(join(APP_ROOT, 'src', 'remote.ts'));
  });

  it('imports IRemoteBootstrap from @capsuletech/web-remote', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain("import type { IRemoteBootstrap } from '@capsuletech/web-remote'");
  });

  it('imports createRoot from @capsuletech/web-core/create', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain("import { createRoot } from '@capsuletech/web-core/create'");
  });

  it('imports Bootstrap from ./bootstrap', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain("import { Bootstrap } from './bootstrap'");
  });

  it('bootstrap typed as IRemoteBootstrap', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain('bootstrap: IRemoteBootstrap');
  });

  it('ctx parameter named _ctx', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toMatch(/bootstrap.*IRemoteBootstrap.*\(root, _ctx\)/);
  });

  it('calls createRoot(Bootstrap, { container: root })', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain('createRoot(Bootstrap, { container: root })');
  });

  it('does NOT import ../src/remote', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).not.toContain('../src/remote');
  });
});

describe('RemoteManifestPlugin -- user-aware entry (src/remote.ts present)', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(existsSync).mockReturnValue(true); });

  it("imports * as user from '../src/remote'", () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain("import * as user from '../src/remote'");
  });

  it('bootstrap typed as IRemoteBootstrap', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain('bootstrap: IRemoteBootstrap');
  });

  it('ctx param is plain ctx, not _ctx', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toMatch(/\(root, ctx\)/);
    expect(c).not.toMatch(/\(root, _ctx\)/);
  });

  it('calls createRoot(Bootstrap, { container: root })', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain('createRoot(Bootstrap, { container: root })');
  });

  it('calls user.bootstrap(root, ctx)', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain('.bootstrap(root, ctx)');
  });

  it("typeof guard before user.bootstrap call", () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toMatch(/typeof.*bootstrap.*===.*'function'/);
  });

  it('returns composed dispose', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    expect(c).toContain('return () => {');
  });

  it('userDispose called before dispose', () => {
    const plugin = buildPlugin(); runConfigResolved(plugin); const c = runBuildStart(plugin);
    const userIdx = c.indexOf('userDispose()');
    const dispIdx = c.lastIndexOf('dispose()');
    expect(userIdx).toBeGreaterThan(-1);
    expect(dispIdx).toBeGreaterThan(-1);
    expect(userIdx).toBeLessThan(dispIdx);
  });
});

describe('RemoteManifestPlugin -- output path', () => {
  it('writes to capsuleRoot/remote-entry.ts', () => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    const plugin = buildPlugin(); runConfigResolved(plugin); runBuildStart(plugin);
    const calls = vi.mocked(writeFileSync).mock.calls;
    const call = calls.find((c: any[]) => String(c[0]).endsWith('remote-entry.ts'));
    expect(call).toBeDefined();
    // Normalize path separators for cross-platform comparison
    const normalizedPath = String(call![0]).replace(/\\/g, '/');
    expect(normalizedPath).toContain(CAPSULE_ROOT);
  });
});

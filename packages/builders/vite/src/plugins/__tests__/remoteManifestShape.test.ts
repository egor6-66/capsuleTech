/**
 * Integration-style tests for the manifest shape emitted by RemoteManifestPlugin
 * after the ADR 057 Phase 1A extension ($schema / exposes / shared).
 *
 * These tests DO NOT mock node:fs — they exercise the real require.resolve +
 * package.json lookup against the workspace. apps/playground is used as a
 * stable appRoot because it has solid-js, @capsuletech/web-core, etc. installed.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RemoteManifestPlugin } from '../remoteManifest';
import { SHARED_DEPS } from '../importMap';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const APP_ROOT = resolve(REPO_ROOT, 'apps/playground');

interface IManifest {
  $schema: string;
  name: string;
  version: string;
  entry: string;
  exposes: Record<string, string>;
  shared: Record<string, { version: string; singleton: true }>;
}

function captureGenerateBundleManifest(): IManifest {
  const plugin = RemoteManifestPlugin({ appRoot: APP_ROOT });
  (plugin as any).configResolved({ root: resolve(APP_ROOT, '.capsule') });
  let captured: IManifest | null = null;
  const emitFile = (file: { type: string; fileName: string; source: string }) => {
    if (file.fileName === 'capsule.manifest.json') {
      captured = JSON.parse(file.source);
    }
  };
  const fakeBundle = {
    'remote-entry.js': {
      type: 'chunk' as const,
      isEntry: true,
      facadeModuleId: '/abs/path/remote-entry.ts',
      name: 'remote-entry',
      fileName: 'remote-entry.js',
    },
  };
  (plugin as any).generateBundle.call({ emitFile }, {}, fakeBundle);
  if (!captured) throw new Error('manifest not emitted');
  return captured;
}

function captureConfigureServerManifest(): IManifest {
  const plugin = RemoteManifestPlugin({ appRoot: APP_ROOT });
  (plugin as any).configResolved({ root: resolve(APP_ROOT, '.capsule') });
  let handler: ((req: any, res: any, next: any) => void) | null = null;
  const server = {
    middlewares: {
      use: (h: any) => {
        handler = h;
      },
    },
  };
  (plugin as any).configureServer(server);
  if (!handler) throw new Error('middleware not registered');
  const chunks: Buffer[] = [];
  let status = 0;
  let headers: Record<string, string> = {};
  const res = {
    writeHead: (s: number, h: Record<string, string>) => {
      status = s;
      headers = h;
    },
    end: (body?: string) => {
      if (body) chunks.push(Buffer.from(body));
    },
  };
  (handler as (req: any, res: any, next: any) => void)(
    { url: '/capsule.manifest.json' },
    res,
    () => {
      throw new Error('next() called — middleware did not handle');
    },
  );
  expect(status).toBe(200);
  expect(headers['Content-Type']).toBe('application/json');
  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

describe('RemoteManifestPlugin -- generateBundle manifest shape (ADR 057 D2)', () => {
  const manifest = captureGenerateBundleManifest();

  it('includes $schema pointing to remote-manifest-v1', () => {
    expect(manifest.$schema).toBe('https://capsuletech.dev/schemas/remote-manifest-v1.json');
  });

  it('preserves existing name field (basename of pkg name)', () => {
    expect(manifest.name).toBe('playground');
  });

  it('preserves existing version field from package.json', () => {
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('preserves existing entry derived from bundle.fileName', () => {
    expect(manifest.entry).toBe('/remote-entry.js');
  });

  it('emits exposes with single ./remote pointing at entry (Phase 1)', () => {
    expect(manifest.exposes).toEqual({ './remote': '/remote-entry.js' });
  });

  it('emits shared with at least solid-js singleton entry', () => {
    expect(manifest.shared).toBeDefined();
    expect(manifest.shared['solid-js']).toBeDefined();
    expect(manifest.shared['solid-js'].singleton).toBe(true);
    expect(manifest.shared['solid-js'].version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('emits shared keys that all come from SHARED_DEPS canonical list', () => {
    for (const key of Object.keys(manifest.shared)) {
      expect(SHARED_DEPS).toContain(key as any);
    }
  });
});

describe('RemoteManifestPlugin -- configureServer dev manifest shape', () => {
  const manifest = captureConfigureServerManifest();

  it('serves /capsule.manifest.json with ADR 057 D2 shape', () => {
    expect(manifest.$schema).toBe('https://capsuletech.dev/schemas/remote-manifest-v1.json');
    expect(manifest.name).toBe('playground');
    expect(manifest.entry).toBe('/remote-entry.ts');
    expect(manifest.exposes).toEqual({ './remote': '/remote-entry.ts' });
  });

  it('shared block in dev matches the same SHARED_DEPS resolution', () => {
    expect(manifest.shared['solid-js']).toBeDefined();
    expect(manifest.shared['solid-js'].singleton).toBe(true);
  });
});

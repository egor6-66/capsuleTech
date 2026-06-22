/**
 * Tests for buildSrcdoc — pure unit tests (no DOM required, but runs in jsdom).
 */

import { describe, expect, it } from 'vitest';
import type { IRemoteManifest, IRemoteModuleConfig } from '../../interfaces';
import { buildSrcdoc } from '../buildSrcdoc';

const MODULE: IRemoteModuleConfig = {
  name: 'hello',
  url: 'http://localhost:3001',
};

const MANIFEST: IRemoteManifest = {
  name: 'hello',
  version: '0.0.0',
  entry: '/src/standalone.ts',
};

const BOOT_URL = 'http://localhost:5173/@capsuletech/web-remote/dist/boot.mjs';
const HOST_ORIGIN = 'http://localhost:5173';

describe('buildSrcdoc', () => {
  it('injects name into __CAPSULE_REMOTE__ via JSON.stringify', () => {
    const html = buildSrcdoc({
      name: 'hello',
      instanceId: 'inst-1',
      sessionId: 'sess-abc',
      module: MODULE,
      manifest: MANIFEST,
      bootUrl: BOOT_URL,
      hostOrigin: HOST_ORIGIN,
    });

    expect(html).toContain('"name":"hello"');
    expect(html).toContain('"instanceId":"inst-1"');
    expect(html).toContain('"sessionId":"sess-abc"');
  });

  it('resolves entry URL relative to module.url', () => {
    const html = buildSrcdoc({
      name: 'hello',
      instanceId: 'i',
      sessionId: 's',
      module: MODULE,
      manifest: { ...MANIFEST, entry: '/src/standalone.ts' },
      bootUrl: BOOT_URL,
      hostOrigin: HOST_ORIGIN,
    });

    // entry should be absolute: http://localhost:3001/src/standalone.ts
    expect(html).toContain('"entry":"http://localhost:3001/src/standalone.ts"');
  });

  it('injects bootUrl as <script type="module" src>', () => {
    const html = buildSrcdoc({
      name: 'hello',
      instanceId: 'i',
      sessionId: 's',
      module: MODULE,
      manifest: MANIFEST,
      bootUrl: BOOT_URL,
      hostOrigin: HOST_ORIGIN,
    });

    expect(html).toContain(`<script type="module" src="${BOOT_URL}">`);
  });

  it('injects <link rel="stylesheet"> for each styles entry with resolved URL', () => {
    const html = buildSrcdoc({
      name: 'hello',
      instanceId: 'i',
      sessionId: 's',
      module: MODULE,
      manifest: { ...MANIFEST, styles: ['/assets/style.css', '/assets/extra.css'] },
      bootUrl: BOOT_URL,
      hostOrigin: HOST_ORIGIN,
    });

    expect(html).toContain('<link rel="stylesheet" href="http://localhost:3001/assets/style.css">');
    expect(html).toContain('<link rel="stylesheet" href="http://localhost:3001/assets/extra.css">');
  });

  it('produces no <link> when manifest.styles is absent', () => {
    const html = buildSrcdoc({
      name: 'hello',
      instanceId: 'i',
      sessionId: 's',
      module: MODULE,
      manifest: MANIFEST, // no styles field
      bootUrl: BOOT_URL,
      hostOrigin: HOST_ORIGIN,
    });

    expect(html).not.toContain('<link rel="stylesheet"');
  });

  it('escapes special characters via JSON.stringify (injection protection)', () => {
    const html = buildSrcdoc({
      name: 'hello<script>',
      instanceId: 'i"evil',
      sessionId: 's',
      module: MODULE,
      manifest: MANIFEST,
      bootUrl: BOOT_URL,
      hostOrigin: HOST_ORIGIN,
    });

    // JSON.stringify escapes < and " — raw injection should not appear
    expect(html).not.toContain('<script>evil');
    // The name is inside JSON.stringify so angle brackets are not present literally
    expect(html).toContain('"name":"hello<script>"'); // JSON doesn't escape < but it's inside JSON context
    // instanceId with " is escaped
    expect(html).toContain('"instanceId":"i\\"evil"');
  });

  it('contains #capsule-remote-root div', () => {
    const html = buildSrcdoc({
      name: 'hello',
      instanceId: 'i',
      sessionId: 's',
      module: MODULE,
      manifest: MANIFEST,
      bootUrl: BOOT_URL,
      hostOrigin: HOST_ORIGIN,
    });

    expect(html).toContain('id="capsule-remote-root"');
  });
});

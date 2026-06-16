/**
 * Tests for RouterPlugin helpers: buildRouteInfo + root-route generation.
 *
 * Covers:
 *  - buildRouteInfo: route path / import path / emit dir-name derivation
 *  - generateRootRoute: with features/app.tsx → wraps Outlet in <App>
 *  - generateRootRoute: without features/app.tsx → plain Outlet (regression)
 *  - resolveAppFeaturePath: returns correct absolute path
 *  - ROOT_WITH_APP_TEMPLATE: structural invariants
 */

import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildRouteInfo,
  generateRootRoute,
  ROOT_WITH_APP_TEMPLATE,
  ROUTE_TEMPLATE,
  resolveAppFeaturePath,
} from '../router/index';

// ---------------------------------------------------------------------------
// buildRouteInfo — route derivation
// ---------------------------------------------------------------------------

describe('buildRouteInfo', () => {
  it('returns null for non-tsx/ts files (css, etc)', () => {
    expect(buildRouteInfo('foo.css')).toBeNull();
    expect(buildRouteInfo('foo.json')).toBeNull();
  });

  it('accepts .ts files (service routes)', () => {
    // buildRouteInfo accepts .ts — the caller (fileGenerator) filters pages/ dir
    const info = buildRouteInfo('foo.ts');
    expect(info).not.toBeNull();
    expect(info!.routePath).toBe('/foo');
  });

  it('returns null for __double-underscore files', () => {
    expect(buildRouteInfo('__root.tsx')).toBeNull();
    expect(buildRouteInfo('auth/__guard.tsx')).toBeNull();
  });

  it('pages/index.tsx → routePath /, emitDir empty, emitName index', () => {
    const info = buildRouteInfo('index.tsx');
    expect(info).not.toBeNull();
    expect(info!.routePath).toBe('/');
    expect(info!.emitDir).toBe('');
    expect(info!.emitName).toBe('index');
  });

  it('pages/foo.tsx → routePath /foo, emitDir empty, emitName foo', () => {
    const info = buildRouteInfo('foo.tsx');
    expect(info).not.toBeNull();
    expect(info!.routePath).toBe('/foo');
    expect(info!.emitName).toBe('foo');
  });

  it('pages/foo/bar.tsx → routePath /foo/bar', () => {
    const info = buildRouteInfo('foo/bar.tsx');
    expect(info!.routePath).toBe('/foo/bar');
  });

  it('pages/foo/[id].tsx → routePath /foo/$id', () => {
    const info = buildRouteInfo('foo/[id].tsx');
    expect(info!.routePath).toBe('/foo/$id');
  });

  it('pages/_pathless/baz.tsx → routePath /baz (pathless segment filtered)', () => {
    const info = buildRouteInfo('_pathless/baz.tsx');
    expect(info!.routePath).toBe('/baz');
  });

  it('pages/foo/index.tsx → emitDir foo, emitName route (directory layout)', () => {
    const info = buildRouteInfo('foo/index.tsx');
    expect(info!.emitDir).toBe('foo');
    expect(info!.emitName).toBe('route');
    expect(info!.indexRoutePath).toBe('/foo/');
  });
});

// ---------------------------------------------------------------------------
// resolveAppFeaturePath
// ---------------------------------------------------------------------------

describe('resolveAppFeaturePath', () => {
  it('returns <appRoot>/src/features/app.tsx', () => {
    const result = resolveAppFeaturePath('/project/apps/myapp');
    expect(result.replace(/\\/g, '/')).toBe('/project/apps/myapp/src/features/app.tsx');
  });
});

// ---------------------------------------------------------------------------
// ROOT_WITH_APP_TEMPLATE — structural invariants
// ---------------------------------------------------------------------------

describe('ROOT_WITH_APP_TEMPLATE', () => {
  const tmpl = ROOT_WITH_APP_TEMPLATE();

  it('imports App from @features/app', () => {
    expect(tmpl).toContain(`import App from '@features/app'`);
  });

  it('imports Outlet and createRootRouteWithContext from @tanstack/solid-router', () => {
    expect(tmpl).toContain(
      `import { Outlet, createRootRouteWithContext } from '@tanstack/solid-router'`,
    );
  });

  it('does NOT import from @capsuletech/web-core', () => {
    expect(tmpl).not.toContain('@capsuletech/web-core');
  });

  it('wraps <Outlet /> inside <App>', () => {
    expect(tmpl).toContain('<App>');
    expect(tmpl).toContain('<Outlet />');
    expect(tmpl).toContain('</App>');
    // Outlet must appear between <App> tags
    const appOpen = tmpl.indexOf('<App>');
    const outletIdx = tmpl.indexOf('<Outlet />');
    const appClose = tmpl.indexOf('</App>');
    expect(outletIdx).toBeGreaterThan(appOpen);
    expect(outletIdx).toBeLessThan(appClose);
  });

  it('does NOT contain AnimatedOutlet', () => {
    expect(tmpl).not.toContain('AnimatedOutlet');
  });

  it('preserves createRootRouteWithContext<MyRouterContext>()()', () => {
    expect(tmpl).toContain('createRootRouteWithContext<MyRouterContext>()({');
  });

  it('uses component arrow function (not lazy)', () => {
    expect(tmpl).toContain('component: () =>');
  });

  it('does NOT import from @pages (root feature is not a page)', () => {
    expect(tmpl).not.toContain('@pages');
  });
});

// ---------------------------------------------------------------------------
// generateRootRoute — filesystem tests using real tmpdir (no ESM mock needed)
// ---------------------------------------------------------------------------

// Resolve template dir from the source tree (used by generateRootRoute).
const TEMPLATE_DIR = resolve(
  new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  'router',
  'template',
);

describe('generateRootRoute — with features/app.tsx present', () => {
  let tmpDir: string;
  let appRoot: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'capsule-router-test-'));
    appRoot = join(tmpDir, 'app');
    // Create the real features/app.tsx so existsSync returns true
    const featuresDir = join(appRoot, 'src', 'features');
    await mkdir(featuresDir, { recursive: true });
    await writeFile(join(featuresDir, 'app.tsx'), '// stub', 'utf-8');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('generates __root.tsx with <App> wrapper around <Outlet />', async () => {
    const outDir = join(tmpDir, 'routes');
    await generateRootRoute(outDir, TEMPLATE_DIR, appRoot);

    const content = await readFile(join(outDir, '__root.tsx'), 'utf-8');
    expect(content).toContain(`import App from '@features/app'`);
    expect(content).toContain('<App>');
    expect(content).toContain('<Outlet />');
    expect(content).toContain('</App>');
    expect(content).not.toContain('AnimatedOutlet');
  });

  it('generated __root.tsx still has createRootRouteWithContext', async () => {
    const outDir = join(tmpDir, 'routes');
    await generateRootRoute(outDir, TEMPLATE_DIR, appRoot);

    const content = await readFile(join(outDir, '__root.tsx'), 'utf-8');
    expect(content).toContain('createRootRouteWithContext');
  });

  it('creates outDir when it does not exist', async () => {
    const outDir = join(tmpDir, 'deep', 'nested', 'routes');
    expect(existsSync(outDir)).toBe(false);

    await generateRootRoute(outDir, TEMPLATE_DIR, appRoot);

    expect(existsSync(join(outDir, '__root.tsx'))).toBe(true);
  });
});

describe('generateRootRoute — without features/app.tsx (regression)', () => {
  let tmpDir: string;
  let appRoot: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'capsule-router-test-'));
    appRoot = join(tmpDir, 'app-no-feature');
    // Do NOT create features/app.tsx
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('generates plain __root.tsx with <Outlet/> (no App import)', async () => {
    const outDir = join(tmpDir, 'routes');
    await generateRootRoute(outDir, TEMPLATE_DIR, appRoot);

    const content = await readFile(join(outDir, '__root.tsx'), 'utf-8');
    expect(content).toContain('<Outlet');
    expect(content).not.toContain('AnimatedOutlet');
    expect(content).not.toContain(`import App from '@features/app'`);
    expect(content).not.toContain('<App>');
  });

  it('generates plain __root.tsx when appRoot is undefined', async () => {
    const outDir = join(tmpDir, 'routes-no-root');
    await generateRootRoute(outDir, TEMPLATE_DIR, undefined);

    const content = await readFile(join(outDir, '__root.tsx'), 'utf-8');
    expect(content).not.toContain(`import App from '@features/app'`);
    expect(content).toContain('<Outlet');
    expect(content).not.toContain('AnimatedOutlet');
  });

  it('plain __root.tsx still has createRootRouteWithContext', async () => {
    const outDir = join(tmpDir, 'routes');
    await generateRootRoute(outDir, TEMPLATE_DIR, undefined);

    const content = await readFile(join(outDir, '__root.tsx'), 'utf-8');
    expect(content).toContain('createRootRouteWithContext');
  });
});

// ---------------------------------------------------------------------------
// ROUTE_TEMPLATE — capability guard (beforeLoad + resolveAccess)
// ---------------------------------------------------------------------------

describe('ROUTE_TEMPLATE — beforeLoad capability guard', () => {
  const sampleInfo = {
    routePath: '/workspace/styles',
    importPath: 'workspace/styles',
    emitDir: 'workspace',
    emitName: 'styles',
  };

  it('imports redirect from @tanstack/solid-router', () => {
    const out = ROUTE_TEMPLATE(sampleInfo);
    expect(out).toContain(`import { createFileRoute, redirect } from '@tanstack/solid-router'`);
  });

  it('imports resolveAccess from @capsuletech/web-core', () => {
    const out = ROUTE_TEMPLATE(sampleInfo);
    expect(out).toContain(`import { resolveAccess } from '@capsuletech/web-core'`);
  });

  it('emits beforeLoad as async function', () => {
    const out = ROUTE_TEMPLATE(sampleInfo);
    expect(out).toContain('beforeLoad: async ()');
  });

  it('beforeLoad reads meta.can from the page module', () => {
    const out = ROUTE_TEMPLATE(sampleInfo);
    expect(out).toContain(`await import('@pages/${sampleInfo.importPath}')`);
    expect(out).toContain('mod?.meta?.can');
  });

  it('beforeLoad throws redirect to /workspace when can check fails', () => {
    const out = ROUTE_TEMPLATE(sampleInfo);
    expect(out).toContain(`!resolveAccess(can)`);
    expect(out).toContain(`throw redirect({ to: '/workspace' })`);
  });

  it('route path and import path are correct in generated output', () => {
    const out = ROUTE_TEMPLATE(sampleInfo);
    expect(out).toContain(`createFileRoute('${sampleInfo.routePath}')`);
    expect(out).toContain(`import('@pages/${sampleInfo.importPath}')`);
  });

  it('still sets component: Component (lazy)', () => {
    const out = ROUTE_TEMPLATE(sampleInfo);
    expect(out).toContain('component: Component');
    expect(out).toContain('lazy(');
  });

  it('works for root index route (routePath = /)', () => {
    const rootInfo = { routePath: '/', importPath: 'index', emitDir: '', emitName: 'index' };
    const out = ROUTE_TEMPLATE(rootInfo);
    expect(out).toContain(`createFileRoute('/')`);
    expect(out).toContain(`await import('@pages/index')`);
    expect(out).toContain('resolveAccess');
  });
});

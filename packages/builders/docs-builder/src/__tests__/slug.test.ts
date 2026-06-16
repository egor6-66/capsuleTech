import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { slugFromPath } from '../slug.js';

// We use POSIX-style paths in test data by constructing paths manually.
// slugFromPath normalizes backslashes internally.

const root = '/project/docs';

describe('slugFromPath — docs strategy', () => {
  it('strips numeric prefix from dir segments, keeps file basename', () => {
    const absPath = join(root, '01-architecture', 'adr', '048-foo.md');
    const slug = slugFromPath(absPath, root, 'docs');
    expect(slug).toBe('architecture/adr/048-foo');
  });

  it('root-level file → just filename (no ext)', () => {
    const absPath = join(root, 'index.md');
    const slug = slugFromPath(absPath, root, 'docs');
    expect(slug).toBe('index');
  });

  it('root index.md → "index"', () => {
    const absPath = join(root, 'index.md');
    expect(slugFromPath(absPath, root, 'docs')).toBe('index');
  });

  it('numeric-prefixed index at root → "index"', () => {
    const absPath = join(root, '00-index.md');
    expect(slugFromPath(absPath, root, 'docs')).toBe('index');
  });

  it('preserves numeric prefix in file basename', () => {
    const absPath = join(root, '01-arch', '048-foo.md');
    // dir 01-arch → arch, file 048-foo → 048-foo (basename not stripped)
    expect(slugFromPath(absPath, root, 'docs')).toBe('arch/048-foo');
  });

  it('nested dirs all stripped', () => {
    const absPath = join(root, '01-architecture', '02-decisions', 'my-doc.md');
    expect(slugFromPath(absPath, root, 'docs')).toBe('architecture/decisions/my-doc');
  });
});

describe('slugFromPath — package strategy', () => {
  const pkgRoot = '/project/packages/web-core';

  it('root README → pkg-short', () => {
    const absPath = join(pkgRoot, 'README.md');
    expect(slugFromPath(absPath, pkgRoot, 'package', '@capsuletech/web-core')).toBe('web-core');
  });

  it('nested README → parent dir as unit', () => {
    const absPath = join(pkgRoot, 'src', 'engine', 'README.md');
    expect(slugFromPath(absPath, pkgRoot, 'package', '@capsuletech/web-core')).toBe('web-core/engine');
  });

  it('strips @capsuletech/ scope from pkg name', () => {
    const absPath = join(pkgRoot, 'guide.md');
    const slug = slugFromPath(absPath, pkgRoot, 'package', '@capsuletech/web-core');
    expect(slug.startsWith('web-core/')).toBe(true);
  });

  it('strips leading src/ from path', () => {
    const absPath = join(pkgRoot, 'src', 'api.md');
    const slug = slugFromPath(absPath, pkgRoot, 'package', '@capsuletech/web-core');
    expect(slug).toBe('web-core/api');
  });

  it('nested file under src/', () => {
    const absPath = join(pkgRoot, 'src', 'engine', 'proxy.md');
    const slug = slugFromPath(absPath, pkgRoot, 'package', 'web-core');
    expect(slug).toBe('web-core/engine/proxy');
  });

  it('strips numeric prefix from dirs', () => {
    const absPath = join(pkgRoot, '01-docs', 'intro.md');
    const slug = slugFromPath(absPath, pkgRoot, 'package', 'web-core');
    expect(slug).toBe('web-core/docs/intro');
  });

  it('plain name (no scope) is used as-is', () => {
    const absPath = join(pkgRoot, 'notes.md');
    const slug = slugFromPath(absPath, pkgRoot, 'package', 'my-lib');
    expect(slug).toBe('my-lib/notes');
  });
});

describe('slugFromPath — app strategy', () => {
  const appRoot = '/project/apps/playground';

  it('prefixes with app/', () => {
    const absPath = join(appRoot, 'docs.md');
    const slug = slugFromPath(absPath, appRoot, 'app', 'playground');
    expect(slug).toBe('app/playground/docs');
  });

  it('root README → app/<appName>', () => {
    const absPath = join(appRoot, 'README.md');
    const slug = slugFromPath(absPath, appRoot, 'app', 'playground');
    expect(slug).toBe('app/playground');
  });

  it('strips leading src/', () => {
    const absPath = join(appRoot, 'src', 'guide.md');
    const slug = slugFromPath(absPath, appRoot, 'app', 'playground');
    expect(slug).toBe('app/playground/guide');
  });
});

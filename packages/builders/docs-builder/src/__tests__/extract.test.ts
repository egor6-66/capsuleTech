import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractDocs } from '../extract.js';

const createTmpDir = async (prefix = 'docs-builder-test-'): Promise<string> => {
  const dir = join(tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
};

const writeDoc = async (dir: string, relPath: string, content: string): Promise<void> => {
  const fullPath = join(dir, relPath);
  await mkdir(join(fullPath, '..'), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
};

const VALID_FM = `---
title: Test Doc
status: canon
tags: [test]
last_updated: 2026-01-01
---`;

describe('extractDocs — basic extraction', () => {
  it('returns registry with one entry for a valid doc', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(
        root,
        'guide.md',
        `${VALID_FM}\n\n# Guide\n\n## Overview {#overview}\n\nSome content.\n`,
      );

      const result = await extractDocs({ root, strategy: 'docs' });

      expect(result.errors).toHaveLength(0);
      expect(result.registry['guide']).toBeDefined();
      // frontmatter title takes priority over H1 fallback
      expect(result.registry['guide'].meta.title).toBe('Test Doc');
      expect(result.registry['guide'].meta.status).toBe('canon');
      expect(result.registry['guide'].sections['overview']).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('derives slug from nested path (docs strategy)', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, '01-arch/adr/048-foo.md', `${VALID_FM}\n\n# ADR\n`);

      const result = await extractDocs({ root, strategy: 'docs' });

      expect(result.registry['arch/adr/048-foo']).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('processes multiple files', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, 'a.md', `${VALID_FM}\n\n# Doc A\n`);
      await writeDoc(root, 'b.md', `${VALID_FM}\n\n# Doc B\n`);

      const result = await extractDocs({ root, strategy: 'docs' });

      expect(result.registry['a']).toBeDefined();
      expect(result.registry['b']).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('extractDocs — exclusions', () => {
  it('skips OWNERSHIP.md', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, 'OWNERSHIP.md', `${VALID_FM}\n\n# Ownership\n`);
      await writeDoc(root, 'guide.md', `${VALID_FM}\n\n# Guide\n`);

      const result = await extractDocs({ root, strategy: 'docs' });

      expect(Object.keys(result.registry)).not.toContain('OWNERSHIP');
      expect(result.registry['guide']).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('skips CHANGELOG.md', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, 'CHANGELOG.md', `${VALID_FM}\n\n# Changelog\n`);
      const result = await extractDocs({ root, strategy: 'docs' });
      expect(Object.keys(result.registry)).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('skips *.draft.md files', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, 'notes.draft.md', `${VALID_FM}\n\n# Draft\n`);
      const result = await extractDocs({ root, strategy: 'docs' });
      expect(Object.keys(result.registry)).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('skips node_modules directory', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, 'node_modules/pkg/doc.md', `${VALID_FM}\n\n# Inner\n`);
      await writeDoc(root, 'guide.md', `${VALID_FM}\n\n# Guide\n`);

      const result = await extractDocs({ root, strategy: 'docs' });

      expect(Object.keys(result.registry)).not.toContain('node_modules/pkg/doc');
      expect(result.registry['guide']).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('skips .generated directory', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, '.generated/registry.md', `${VALID_FM}\n\n# Generated\n`);
      const result = await extractDocs({ root, strategy: 'docs' });
      expect(Object.keys(result.registry)).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('extractDocs — errors', () => {
  it('reports slug collision as error', async () => {
    const root = await createTmpDir();
    try {
      // Two files that produce the same slug (e.g. different numeric prefix dirs with same basename)
      // Simplest: same file name in root dir is impossible, but we can use nested to collide.
      // Actually the simplest collision: since we can't have two files with same name in same dir,
      // let's use a scenario where two paths produce identical slugs.
      // With 'docs' strategy: 01-foo/bar.md → foo/bar, 02-foo/bar.md → foo/bar (same slug!)
      await writeDoc(root, '01-foo/bar.md', `${VALID_FM}\n\n# Doc 1\n`);
      await writeDoc(root, '02-foo/bar.md', `${VALID_FM}\n\n# Doc 2\n`);

      const result = await extractDocs({ root, strategy: 'docs' });

      expect(result.errors.some((e) => e.includes('slug collision'))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('extractDocs — missing frontmatter', () => {
  it('warns on missing required frontmatter fields', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, 'no-fm.md', '# No Frontmatter\n\nJust content.\n');

      const result = await extractDocs({ root, strategy: 'docs' });

      // File is still included (warn, not skip)
      expect(result.registry['no-fm']).toBeDefined();
      // Warnings for missing fields
      expect(result.warnings.some((w) => w.includes('missing frontmatter field'))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('extractDocs — package strategy', () => {
  it('uses pkgName as slug prefix', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, 'guide.md', `${VALID_FM}\n\n# Guide\n`);

      const result = await extractDocs({
        root,
        strategy: 'package',
        pkgName: '@capsuletech/web-core',
      });

      expect(result.registry['web-core/guide']).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('root README → pkg-short slug', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(root, 'README.md', `${VALID_FM}\n\n# Web Core\n`);

      const result = await extractDocs({ root, strategy: 'package', pkgName: 'web-core' });

      expect(result.registry['web-core']).toBeDefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('extractDocs — wikilinks', () => {
  it('collects wikilinks from sections', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(
        root,
        'a.md',
        `${VALID_FM}\n\n# A\n\n## Section {#sec}\n\nSee [[other-doc]].\n`,
      );
      await writeDoc(root, 'other-doc.md', `${VALID_FM}\n\n# Other\n`);

      const result = await extractDocs({ root, strategy: 'docs' });

      expect(result.registry['a'].wikilinks).toContain('other-doc');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('warns on unresolved wikilinks', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(
        root,
        'a.md',
        `${VALID_FM}\n\n# A\n\n## Section {#sec}\n\nSee [[nonexistent]].\n`,
      );

      const result = await extractDocs({ root, strategy: 'docs' });

      expect(result.warnings.some((w) => w.includes('unresolved wikilink'))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('extractDocs — registry shape', () => {
  it('registry entries have correct shape', async () => {
    const root = await createTmpDir();
    try {
      await writeDoc(
        root,
        'doc.md',
        `${VALID_FM}\n\n# My Doc\n\n## Section One {#s1}\n\nContent here.\n\n### Sub Section {#sub}\n\nSub content.\n`,
      );

      const result = await extractDocs({ root, strategy: 'docs' });

      const entry = result.registry['doc'];
      expect(entry).toBeDefined();
      expect(entry.meta).toBeDefined();
      expect(entry.sections).toBeDefined();
      expect(Array.isArray(entry.wikilinks)).toBe(true);

      expect(entry.sections['s1']).toMatchObject({
        heading: 'Section One',
        level: 2,
        body: expect.any(String),
        audience: expect.any(Array),
        wikilinks: expect.any(Array),
      });

      expect(entry.sections['sub']).toMatchObject({
        heading: 'Sub Section',
        level: 3,
        parentId: 's1',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

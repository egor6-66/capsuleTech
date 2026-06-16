import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EXCLUSIONS,
  shouldExcludeDir,
  shouldExcludeFile,
} from '../exclusions.js';

describe('DEFAULT_EXCLUSIONS', () => {
  it('has expected default files', () => {
    expect(DEFAULT_EXCLUSIONS.files).toContain('OWNERSHIP.md');
    expect(DEFAULT_EXCLUSIONS.files).toContain('CHANGELOG.md');
    expect(DEFAULT_EXCLUSIONS.files).toContain('LICENSE.md');
  });

  it('has expected default suffixes', () => {
    expect(DEFAULT_EXCLUSIONS.suffixes).toContain('.draft.md');
  });

  it('has expected default dirs', () => {
    expect(DEFAULT_EXCLUSIONS.dirs).toContain('node_modules');
    expect(DEFAULT_EXCLUSIONS.dirs).toContain('dist');
    expect(DEFAULT_EXCLUSIONS.dirs).toContain('.capsule');
    expect(DEFAULT_EXCLUSIONS.dirs).toContain('__tests__');
    expect(DEFAULT_EXCLUSIONS.dirs).toContain('__fixtures__');
    expect(DEFAULT_EXCLUSIONS.dirs).toContain('.generated');
  });
});

describe('shouldExcludeFile', () => {
  it('excludes OWNERSHIP.md by basename', () => {
    expect(shouldExcludeFile('OWNERSHIP.md')).toBe(true);
    expect(shouldExcludeFile('/some/path/OWNERSHIP.md')).toBe(true);
  });

  it('excludes CHANGELOG.md', () => {
    expect(shouldExcludeFile('CHANGELOG.md')).toBe(true);
  });

  it('excludes LICENSE.md', () => {
    expect(shouldExcludeFile('LICENSE.md')).toBe(true);
  });

  it('excludes *.draft.md', () => {
    expect(shouldExcludeFile('my-doc.draft.md')).toBe(true);
    expect(shouldExcludeFile('notes.draft.md')).toBe(true);
  });

  it('does not exclude regular .md files', () => {
    expect(shouldExcludeFile('guide.md')).toBe(false);
    expect(shouldExcludeFile('README.md')).toBe(false);
  });

  it('respects extra file patterns (additional exact basenames)', () => {
    expect(shouldExcludeFile('SKIP.md', ['SKIP.md'])).toBe(true);
    expect(shouldExcludeFile('keep.md', ['SKIP.md'])).toBe(false);
  });

  it('extra does NOT replace defaults, only extends them', () => {
    // defaults still apply when passing extras
    expect(shouldExcludeFile('OWNERSHIP.md', ['EXTRA.md'])).toBe(true);
    expect(shouldExcludeFile('EXTRA.md', ['EXTRA.md'])).toBe(true);
  });

  it('respects extra suffix patterns', () => {
    expect(shouldExcludeFile('doc.wip.md', [], ['.wip.md'])).toBe(true);
    expect(shouldExcludeFile('doc.md', [], ['.wip.md'])).toBe(false);
  });

  it('handles Windows backslash paths', () => {
    expect(shouldExcludeFile('C:\\docs\\OWNERSHIP.md')).toBe(true);
    expect(shouldExcludeFile('C:\\docs\\guide.md')).toBe(false);
  });
});

describe('shouldExcludeDir', () => {
  it('excludes node_modules', () => {
    expect(shouldExcludeDir('node_modules')).toBe(true);
  });

  it('excludes dist', () => {
    expect(shouldExcludeDir('dist')).toBe(true);
  });

  it('excludes hidden dirs (starting with .)', () => {
    expect(shouldExcludeDir('.git')).toBe(true);
    expect(shouldExcludeDir('.capsule')).toBe(true);
    expect(shouldExcludeDir('.generated')).toBe(true);
  });

  it('excludes __tests__ and __fixtures__', () => {
    expect(shouldExcludeDir('__tests__')).toBe(true);
    expect(shouldExcludeDir('__fixtures__')).toBe(true);
  });

  it('does not exclude regular dirs', () => {
    expect(shouldExcludeDir('src')).toBe(false);
    expect(shouldExcludeDir('docs')).toBe(false);
    expect(shouldExcludeDir('architecture')).toBe(false);
  });

  it('respects extra dir names', () => {
    expect(shouldExcludeDir('build', ['build'])).toBe(true);
    expect(shouldExcludeDir('src', ['build'])).toBe(false);
  });

  it('extra does NOT replace defaults', () => {
    expect(shouldExcludeDir('node_modules', ['build'])).toBe(true);
  });
});

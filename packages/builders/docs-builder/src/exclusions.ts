/**
 * Default exclusion lists for docs walker.
 * Canon: docs/_meta/docs-system.md §8.9
 */

/** File names (exact match on basename) that are always skipped. */
export const DEFAULT_EXCLUDE_FILES: string[] = [
  'OWNERSHIP.md',
  'CHANGELOG.md',
  'LICENSE.md',
];

/** File name suffix patterns that are always skipped (*.draft.md). */
export const DEFAULT_EXCLUDE_SUFFIXES: string[] = ['.draft.md'];

/** Directory names that are always skipped. */
export const DEFAULT_EXCLUDE_DIRS: string[] = [
  'node_modules',
  'dist',
  '.capsule',
  '__tests__',
  '__fixtures__',
  '.generated',
  '_build',
];

/** Combined default exclusions (files + suffixes) for consumers that want a flat list. */
export const DEFAULT_EXCLUSIONS: {
  files: string[];
  suffixes: string[];
  dirs: string[];
} = {
  files: DEFAULT_EXCLUDE_FILES,
  suffixes: DEFAULT_EXCLUDE_SUFFIXES,
  dirs: DEFAULT_EXCLUDE_DIRS,
};

/**
 * Returns true if the given file path (or basename) should be excluded.
 *
 * @param filePath - Absolute or relative path, or just a basename.
 * @param extraFiles - Additional exact-match basenames to exclude.
 * @param extraSuffixes - Additional suffix patterns to exclude.
 */
export const shouldExcludeFile = (
  filePath: string,
  extraFiles: string[] = [],
  extraSuffixes: string[] = [],
): boolean => {
  const name = filePath.includes('/') || filePath.includes('\\')
    ? filePath.replace(/\\/g, '/').split('/').pop()!
    : filePath;

  const allFiles = [...DEFAULT_EXCLUDE_FILES, ...extraFiles];
  if (allFiles.includes(name)) return true;

  const allSuffixes = [...DEFAULT_EXCLUDE_SUFFIXES, ...extraSuffixes];
  for (const suf of allSuffixes) {
    if (name.endsWith(suf)) return true;
  }

  return false;
};

/**
 * Returns true if the given directory name should be excluded.
 *
 * @param dirName - Just the directory segment name (not full path).
 * @param extraDirs - Additional dir names to exclude.
 */
export const shouldExcludeDir = (dirName: string, extraDirs: string[] = []): boolean => {
  if (dirName.startsWith('.')) return true;
  const allDirs = [...DEFAULT_EXCLUDE_DIRS, ...extraDirs];
  return allDirs.includes(dirName);
};

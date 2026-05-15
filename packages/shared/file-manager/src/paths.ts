import { existsSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Аналог __filename для ESM */
export const getFilename = (importMetaUrl: string) => fileURLToPath(importMetaUrl);

/** Аналог __dirname для ESM */
export const getDirname = (importMetaUrl: string) => dirname(getFilename(importMetaUrl));

/** Корень текущего пакета (ищет ближайший package.json вверх по дереву) */
export const getPackageRoot = (importMetaUrl: string) => {
  let current = getDirname(importMetaUrl);
  while (current !== resolve(current, '..')) {
    if (existsSync(join(current, 'package.json'))) {
      return current;
    }
    current = resolve(current, '..');
  }
  return getDirname(importMetaUrl); // fallback
};

/** Корень монорепозитория (обычно CWD при запуске через Nx) */
export const getWorkspaceRoot = () => process.cwd();
export const getCapsuleRoot = () => join(getWorkspaceRoot(), '.capsule');
/** Утилита для получения всех важных путей проекта одной командой */
export const getProjectPaths = (importMetaUrl: string) => {
  const root = getPackageRoot(importMetaUrl);
  const name = basename(root);
  const workspaceRoot = getWorkspaceRoot();

  return {
    name,
    root,
    src: join(root, 'src'),
    // Автоматический путь к dist в корне монорепы
    dist: join(workspaceRoot, 'dist/packages', name),
    // Путь к файлам внутри src (например, для exports)
    resolveSrc: (...p: string[]) => join(root, 'src', ...p),
  };
};

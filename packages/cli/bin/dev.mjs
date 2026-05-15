import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function getWorkspaceAliases() {
  const rootDir = resolve(process.cwd());

  const tsconfigPath = join(rootDir, 'tsconfig.base.json'); // В Nx пути обычно тут
  const fallbackPath = join(rootDir, 'paths.config.json');
  const targetPath = existsSync(tsconfigPath) ? tsconfigPath : fallbackPath;

  if (!existsSync(targetPath)) return {};

  try {
    const content = readFileSync(targetPath, 'utf-8').replace(
      /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
      '$1',
    );
    const tsconfig = JSON.parse(content);
    const paths = tsconfig.compilerOptions?.paths || {};
    const aliases = {};

    for (const [key, value] of Object.entries(paths)) {
      const aliasKey = key.replace(/\/\*$/, '');
      const aliasPath = value[0].replace(/\/\*$/, '');
      aliases[aliasKey] = resolve(rootDir, aliasPath);
    }
    return aliases;
  } catch (e) {
    console.warn('Не удалось прочитать tsconfig для jiti алиасов:', e.message);
    return {};
  }
}

export const RunCli = async (entryPath) => {
  const { createJiti } = await import('jiti');
  const jiti = createJiti(import.meta.url, {
    alias: getWorkspaceAliases(),
    jsx: { runtime: 'automatic', importSource: 'react' },
  });

  return jiti.import(pathToFileURL(entryPath).href);
};

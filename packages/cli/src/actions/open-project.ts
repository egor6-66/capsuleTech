import { join } from 'node:path';
import type { CommandAction } from '../commands/types';

/**
 * Меняет cwd на apps/<name> или packages/<name>. После этого следующая итерация
 * меню снова вызовет detect() и увидит уже app/lib контекст.
 */
export const openProject: CommandAction = async (ctx, params) => {
  if (!ctx.root) return;
  const subDir = params.dir as 'apps' | 'packages';
  const name = params.name as string;
  if (!subDir || !name) return;
  process.chdir(join(ctx.root, subDir, name));
};

export const goToRoot: CommandAction = async (ctx) => {
  if (ctx.root) process.chdir(ctx.root);
};

import type { CliContext } from '../context';
import { createCommands } from './create';
import { devCommands } from './dev';
import { gitCommands } from './git';
import { buildNavigationCommands } from './navigation';
import { nxCommands } from './nx';
import { type Category, type Command, matchesScope } from './types';
import { workspaceCommands } from './workspace';

export * from './types';

/** Команды, известные на этапе регистрации (commander). */
export const staticCommands: Command[] = [
  ...createCommands,
  ...devCommands,
  ...workspaceCommands,
  ...gitCommands,
  ...nxCommands,
];

/** Все команды для данного ctx, включая динамически собранные (open project). */
export const collectCommands = (ctx: CliContext): Command[] => [
  ...staticCommands.filter((c) => matchesScope(c, ctx.type)),
  ...buildNavigationCommands(ctx),
];

export const CATEGORY_META: Record<Category, { icon: string; label: string; order: number }> = {
  create: { icon: '➕', label: 'Create', order: 1 },
  dev: { icon: '🚀', label: 'Dev', order: 2 },
  workspace: { icon: 'ℹ️', label: 'Workspace', order: 3 },
  git: { icon: '🌿', label: 'Git', order: 4 },
  nx: { icon: '🔀', label: 'Nx', order: 5 },
  navigation: { icon: '📂', label: 'Navigate', order: 6 },
};

export const groupByCategory = (cmds: Command[]): Map<Category, Command[]> => {
  const map = new Map<Category, Command[]>();
  for (const cmd of cmds) {
    if (!map.has(cmd.category)) map.set(cmd.category, []);
    map.get(cmd.category)!.push(cmd);
  }
  return new Map(
    [...map.entries()].sort(([a], [b]) => CATEGORY_META[a].order - CATEGORY_META[b].order),
  );
};

export const findCommandById = (id: string): Command | undefined =>
  staticCommands.find((c) => c.id === id);

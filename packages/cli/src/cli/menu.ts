import {
  CATEGORY_META,
  type Category,
  type Command,
  collectCommands,
  groupByCategory,
} from '../commands';
import { type CliContext, detect } from '../context';
import { kit } from '../kit';
import { runCommand } from './runner';

const SENTINEL_EXIT = '__exit__';
const SENTINEL_BACK = '__back__';
const PREFIX_CATEGORY = 'cat:';
const PREFIX_COMMAND = 'cmd:';

const ctxTitle = (ctx: CliContext): string => {
  switch (ctx.type) {
    case 'no-workspace':
      return '🌱 Workspace не найден';
    case 'workspace-root':
      return `🏠 Workspace root (${ctx.root})`;
    case 'workspace-inner':
      return `🌀 Внутри workspace (${ctx.cwd})`;
    case 'app':
      return `📱 ${ctx.name} (app)`;
    case 'lib':
      return `📦 ${ctx.name} (lib)`;
  }
};

interface RootOption {
  value: string;
  label: string;
  hint?: string;
}

const pickCategoryOrCommand = async (
  title: string,
  groups: Map<Category, Command[]>,
): Promise<
  | { kind: 'category'; category: Category }
  | { kind: 'command'; cmd: Command }
  | { kind: 'exit' }
  | { kind: 'noop' }
> => {
  const opts: RootOption[] = [];
  for (const [cat, cmds] of groups) {
    const meta = CATEGORY_META[cat];
    if (cmds.length === 1) {
      const c = cmds[0];
      opts.push({ value: `${PREFIX_COMMAND}${c.id}`, label: c.label, hint: c.description });
    } else {
      opts.push({
        value: `${PREFIX_CATEGORY}${cat}`,
        label: `${meta.icon}  ${meta.label} ▸`,
        hint: `${cmds.length} команд`,
      });
    }
  }
  opts.push({ value: SENTINEL_EXIT, label: '❌ Выйти' });

  const choice = await kit.select(title, opts);
  if (!choice || choice === SENTINEL_EXIT) return { kind: 'exit' };
  if (typeof choice === 'string' && choice.startsWith(PREFIX_CATEGORY)) {
    return { kind: 'category', category: choice.slice(PREFIX_CATEGORY.length) as Category };
  }
  if (typeof choice === 'string' && choice.startsWith(PREFIX_COMMAND)) {
    const id = choice.slice(PREFIX_COMMAND.length);
    const cmd = [...groups.values()].flat().find((c) => c.id === id);
    if (cmd) return { kind: 'command', cmd };
  }
  return { kind: 'noop' };
};

const pickInCategory = async (
  category: Category,
  cmds: Command[],
): Promise<Command | 'back' | 'exit'> => {
  const meta = CATEGORY_META[category];
  const opts: RootOption[] = [
    ...cmds.map((c) => ({ value: c.id, label: c.label, hint: c.description })),
    { value: SENTINEL_BACK, label: '⬅️  Назад' },
    { value: SENTINEL_EXIT, label: '❌ Выйти' },
  ];
  const choice = await kit.select(`${meta.icon}  ${meta.label}`, opts);
  if (!choice || choice === SENTINEL_EXIT) return 'exit';
  if (choice === SENTINEL_BACK) return 'back';
  const cmd = cmds.find((c) => c.id === choice);
  return cmd ?? 'back';
};

export const runMenu = async (): Promise<void> => {
  kit.intro('CAPSULE');
  while (true) {
    const ctx = detect();
    const cmds = collectCommands(ctx);

    if (cmds.length === 0) {
      kit.log.warn('Нет доступных команд в этом контексте.');
      return;
    }

    const groups = groupByCategory(cmds);
    const root = await pickCategoryOrCommand(ctxTitle(ctx), groups);

    if (root.kind === 'exit') {
      kit.outro('До встречи!');
      return;
    }
    if (root.kind === 'noop') continue;

    if (root.kind === 'command') {
      await runCommand(root.cmd, ctx);
      continue;
    }

    // Категория с несколькими командами — подменю в собственном цикле,
    // чтобы после команды оставаться в той же категории, а не падать в корень.
    let exitRequested = false;
    while (true) {
      const subCtx = detect();
      const subGroups = groupByCategory(collectCommands(subCtx));
      const subCmds = subGroups.get(root.category) ?? [];
      if (subCmds.length === 0) break;

      const subChoice = await pickInCategory(root.category, subCmds);
      if (subChoice === 'exit') {
        exitRequested = true;
        break;
      }
      if (subChoice === 'back') break;
      await runCommand(subChoice, subCtx);
    }
    if (exitRequested) {
      kit.outro('До встречи!');
      return;
    }
  }
};

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CommandAction } from '../commands/types';
import { kit } from '../kit';
import { cvd, getViteEntry } from '../utils';

export const devServer: CommandAction = async (ctx) => {
  if (ctx.type !== 'app' || !ctx.root) {
    kit.log.error('Dev server запускается только внутри apps/<name>/');
    return;
  }
  const configPath = join(ctx.cwd, 'capsule.config.ts');
  if (!existsSync(configPath)) {
    kit.log.error('Не нашёл capsule.config.ts');
    return;
  }

  const vitePath = getViteEntry(ctx.root, ctx.mode);
  const viteActions = (await cvd.importModule(vitePath, ctx.root)) as Record<string, unknown>;
  const rawConfig = (await cvd.importModule(configPath, ctx.root)) as { default?: unknown };
  const userConfig = rawConfig?.default ?? rawConfig;

  const fn = viteActions.createDevCapsuleServer as
    | ((cfg: unknown, appRoot: string, wsRoot: string) => Promise<unknown>)
    | undefined;
  if (!fn) {
    kit.log.error('shared-vite не экспортирует createDevCapsuleServer');
    return;
  }

  // Vite dev server runs in-process and holds the Node event loop open via its
  // HTTP handles. When the user presses Ctrl-C (SIGINT) or the shell sends
  // SIGTERM, we must explicitly exit so the process does not become an orphan.
  // Without this handler, the process stays alive after the TUI exits or after
  // the user terminates the terminal session on Windows.
  const exitHandler = () => process.exit(0);
  process.once('SIGINT', exitHandler);
  process.once('SIGTERM', exitHandler);

  try {
    await fn(userConfig, ctx.cwd, ctx.root);
  } finally {
    process.off('SIGINT', exitHandler);
    process.off('SIGTERM', exitHandler);
  }
};

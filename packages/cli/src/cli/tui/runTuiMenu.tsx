/** @jsxImportSource react */
import { render } from 'ink';
import { collectCommands, groupByCategory } from '../../commands';
import { type CliContext, detect } from '../../context';
import { kit } from '../../kit';
import { runCommand } from '../runner';
import { App, type AppPick } from './App';

const ctxTitle = (ctx: CliContext): string => {
  switch (ctx.type) {
    case 'no-workspace':
      return '🌱 no workspace';
    case 'workspace-root':
      return `🏠 root · ${ctx.root}`;
    case 'workspace-inner':
      return `🌀 inner · ${ctx.cwd}`;
    case 'app':
      return `📱 ${ctx.name} (app)`;
    case 'lib':
      return `📦 ${ctx.name} (lib)`;
  }
};

const askPick = (ctx: CliContext): Promise<AppPick> =>
  new Promise((resolve) => {
    const cmds = collectCommands(ctx);
    if (cmds.length === 0) {
      resolve({ kind: 'exit' });
      return;
    }
    const groups = groupByCategory(cmds);
    let captured: AppPick = { kind: 'exit' };
    const instance = render(
      <App
        title="CAPSULE"
        ctxLabel={ctxTitle(ctx)}
        groups={groups}
        onPick={(p) => {
          captured = p;
        }}
      />,
      { exitOnCtrlC: true },
    );
    instance.waitUntilExit().then(() => {
      instance.clear();
      resolve(captured);
    });
  });

export const runTuiMenu = async (): Promise<void> => {
  while (true) {
    const ctx = detect();
    const pick = await askPick(ctx);
    if (pick.kind === 'exit' || !pick.command) {
      kit.outro('До встречи!');
      return;
    }
    await runCommand(pick.command, ctx);
  }
};

import * as p from '@clack/prompts';
import chalk from 'chalk';

export const ui = {
  intro: (title: string) => p.intro(chalk.bgCyan.black(` ${title} `)),
  outro: (message: string) => p.outro(chalk.green(message)),

  select: async <T>(message: string, options: { value: T; label: string; hint?: string }[]) => {
    const res = await p.select({
      message,
      options: options as p.Option<T>[],
    });

    if (p.isCancel(res)) ui.cancel();
    return res as T;
  },

  confirm: async (message: string) => {
    const res = await p.confirm({ message });
    if (p.isCancel(res)) ui.cancel();
    return res;
  },

  input: async (message: string, placeholder?: string, validate?: (v: string) => string) => {
    // @ts-ignore
    const res = await p.text({ message, placeholder, validate });
    if (p.isCancel(res)) ui.cancel();
    return res;
  },

  note: (message: string, title?: string) => p.note(message, title),
  divider: () => console.log(chalk.dim('──────────────────────────────────────────')),

  log: p.log,
  spinner: p.spinner,

  cancel: (msg = 'Операция отменена') => {
    p.cancel(chalk.yellow(msg));
    process.exit(0);
  },
};

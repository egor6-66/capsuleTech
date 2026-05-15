import chalk from 'chalk';
import { execa } from 'execa';
import { ui } from './ui';

export const shell = {
  task: async <T>(
    title: string,
    action: string | ((s: ReturnType<typeof ui.spinner>) => Promise<T>),
    args: string[] = [],
  ): Promise<T | string> => {
    const s = ui.spinner();
    s.start(title);
    let success = false;
    try {
      let result: T | string;
      if (typeof action === 'function') {
        result = (await action(s)) as T;
      } else {
        const { stdout } = await execa(action, args);
        result = stdout;
      }
      success = true;
      return result;
    } finally {
      if (success) s.stop(title);
      else s.stop(chalk.red(`${title} — ошибка`));
    }
  },
};

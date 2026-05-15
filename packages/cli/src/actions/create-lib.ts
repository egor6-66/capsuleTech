import { kit } from '../kit';
import type { CommandAction } from '../commands/types';
import { scaffoldEntity } from './_scaffold';

export const createLib: CommandAction = async (ctx, params) => {
  const result = await scaffoldEntity({
    kind: 'lib',
    title: 'Lib',
    subDir: 'packages',
    name: params.name as string | undefined,
    mode: ctx.mode,
  });
  if (!result) return;
  kit.note(`cd packages/${result.name}\npnpm build`, `Lib «${result.name}» готов`);
};

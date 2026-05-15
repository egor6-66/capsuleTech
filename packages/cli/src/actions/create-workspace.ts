import { kit } from '../kit';
import type { CommandAction } from '../commands/types';
import { scaffoldEntity } from './_scaffold';

export const createWorkspace: CommandAction = async (ctx) => {
  const result = await scaffoldEntity({
    kind: 'workspace',
    title: 'Workspace',
    mode: ctx.mode,
  });
  if (!result) return;
  kit.note(
    `cd ${result.name}\ncapsule → Create › App`,
    `Workspace «${result.name}» готов`,
  );
};

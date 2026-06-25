import { remoteSync } from '../actions/remote-sync';
import { ICONS } from '../cli/tui/icons';
import type { Command } from './types';

export const remoteCommands: Command[] = [
  {
    id: 'remote.sync',
    label: `${ICONS.remoteSync} Remote sync`,
    icon: ICONS.remoteSync,
    description:
      'Вендорит контракт ремоута(ов) из capsule.app.ts → remotes в коммитимую apps/<name>/remotes/<name>/ (snapshot, как lockfile). Explicit user-action, build от живого ремоута не зависит.',
    scope: ['app'],
    category: 'remote',
    params: [
      {
        name: 'name',
        description: 'Имя одного ремоута для синхронизации (по умолчанию — все)',
        required: false,
        positional: true,
      },
    ],
    action: remoteSync,
  },
];

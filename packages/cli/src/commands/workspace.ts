import { workspaceInfo } from '../actions';
import { ICONS } from '../cli/tui/icons';
import type { Command } from './types';

export const workspaceCommands: Command[] = [
  {
    id: 'workspace.info',
    label: `${ICONS.info} Info`,
    icon: ICONS.info,
    description: 'Сводка по workspace: путь, версия, ветка, apps/packages',
    scope: ['workspace-root', 'app', 'lib', 'workspace-inner'],
    category: 'workspace',
    action: workspaceInfo,
  },
];

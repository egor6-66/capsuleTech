import { workspaceInfo } from '../actions';
import type { Command } from './types';

export const workspaceCommands: Command[] = [
  {
    id: 'workspace.info',
    label: 'ℹ️ Info',
    icon: 'ℹ️',
    description: 'Сводка по workspace: путь, версия, ветка, apps/packages',
    scope: ['workspace-root', 'app', 'lib', 'workspace-inner'],
    category: 'workspace',
    action: workspaceInfo,
  },
];

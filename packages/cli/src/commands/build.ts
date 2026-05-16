import { buildAppAction } from '../actions/build-app';
import { ICONS } from '../cli/tui/icons';
import type { Command } from './types';

export const buildCommands: Command[] = [
  {
    id: 'build',
    label: `${ICONS.buildApp} Build app`,
    icon: ICONS.buildApp,
    description: 'Собрать production-бандл текущего приложения',
    scope: ['app'],
    category: 'dev',
    action: buildAppAction,
  },
];

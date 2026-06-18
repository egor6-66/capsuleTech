import { devServer, previewServer } from '../actions';
import { ICONS } from '../cli/tui/icons';
import type { Command } from './types';

export const devCommands: Command[] = [
  {
    id: 'dev',
    label: `${ICONS.devServer} Dev server`,
    icon: ICONS.devServer,
    description: 'Запустить dev-сервер Vite для текущего приложения',
    scope: ['app'],
    category: 'dev',
    action: devServer,
  },
  {
    id: 'preview',
    label: `${ICONS.previewServer} Preview server`,
    icon: ICONS.previewServer,
    description: 'Запустить preview-сервер production-сборки текущего приложения',
    scope: ['app'],
    category: 'dev',
    action: previewServer,
  },
];

import { devServer } from '../actions';
import type { Command } from './types';

export const devCommands: Command[] = [
  {
    id: 'dev',
    label: '🚀 Dev server',
    icon: '🚀',
    description: 'Запустить dev-сервер Vite для текущего приложения',
    scope: ['app'],
    category: 'dev',
    action: devServer,
  },
];

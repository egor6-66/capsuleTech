import { deploy } from '../actions/deploy';
import { ICONS } from '../cli/tui/icons';
import type { Command } from './types';

export const deployCommands: Command[] = [
  {
    id: 'deploy',
    label: `${ICONS.deploy} Deploy preview`,
    icon: ICONS.deploy,
    description:
      'Собрать и залить текущее приложение на self-hosted preview-сервер. Дефолты server/token читает из docker/preview-server/.env',
    scope: ['app'],
    category: 'dev',
    options: [
      { flag: '--server <url>', description: 'URL preview-сервера (override DEPLOY_SERVER)' },
      { flag: '--token <token>', description: 'Bearer-токен (override DEPLOY_TOKEN)' },
      { flag: '--no-build', description: 'Не пересобирать — использовать существующий dist/' },
      { flag: '--mocks', description: 'Собрать с моками (CAPSULE_MOCKS=true)' },
      { flag: '--root', description: 'Раздать под корнем `/` (testing-hub, требует base "/")' },
      { flag: '--dist <path>', description: 'Путь к dist (по умолчанию apps/<name>/dist)' },
    ],
    action: deploy,
  },
];

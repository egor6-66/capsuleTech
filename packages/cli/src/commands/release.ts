import { nxReleaseTags, release, releasePlan } from '../actions';
import type { Command } from './types';

const WORKSPACE_SCOPE = ['workspace-root', 'app', 'lib', 'workspace-inner'] as const;

export const releaseCommands: Command[] = [
  {
    id: 'release.plan',
    label: '🔍 Plan (dry-run)',
    icon: '🔍',
    description: 'Предпросмотр бампа: что изменится, какие версии станут — БЕЗ публикации',
    scope: [...WORKSPACE_SCOPE],
    category: 'release',
    action: releasePlan,
  },
  {
    id: 'release.run',
    label: '📦 Release',
    icon: '📦',
    description: 'Релиз группы: bump → CHANGELOG → tag → опционально publish',
    scope: [...WORKSPACE_SCOPE],
    category: 'release',
    action: release,
  },
  {
    id: 'release.tags',
    label: '🏷️ Tags',
    icon: '🏷️',
    description: 'Последние 20 git-тегов (cli@x.y.z / web@x.y.z)',
    scope: [...WORKSPACE_SCOPE],
    category: 'release',
    action: nxReleaseTags,
  },
];

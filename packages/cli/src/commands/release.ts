import { nxReleaseTags, release, releasePlan } from '../actions';
import { ICONS } from '../cli/tui/icons';
import type { Command } from './types';

const WORKSPACE_SCOPE = ['workspace-root', 'app', 'lib', 'workspace-inner'] as const;

export const releaseCommands: Command[] = [
  {
    id: 'release.plan',
    label: `${ICONS.plan} Plan (dry-run)`,
    icon: ICONS.plan,
    description: 'Предпросмотр бампа: что изменится, какие версии станут — БЕЗ публикации',
    scope: [...WORKSPACE_SCOPE],
    category: 'release',
    action: releasePlan,
  },
  {
    id: 'release.run',
    label: `${ICONS.release} Release`,
    icon: ICONS.release,
    description: 'Релиз группы: bump → CHANGELOG → tag → опционально publish',
    scope: [...WORKSPACE_SCOPE],
    category: 'release',
    action: release,
  },
  {
    id: 'release.tags',
    label: `${ICONS.tags} Tags`,
    icon: ICONS.tags,
    description: 'Последние 20 git-тегов (cli@x.y.z / web@x.y.z)',
    scope: [...WORKSPACE_SCOPE],
    category: 'release',
    action: nxReleaseTags,
  },
];

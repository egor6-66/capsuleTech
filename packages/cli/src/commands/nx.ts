import { nxAffected, nxGraph, nxProjects, nxReport, nxRun } from '../actions';
import type { Command } from './types';

const WORKSPACE_SCOPE = ['workspace-root', 'app', 'lib', 'workspace-inner'] as const;

export const nxCommands: Command[] = [
  {
    id: 'nx.projects',
    label: '📋 Projects',
    icon: '📋',
    description: 'Список всех проектов workspace (nx show projects)',
    scope: [...WORKSPACE_SCOPE],
    category: 'nx',
    action: nxProjects,
  },
  {
    id: 'nx.affected',
    label: '🔥 Affected',
    icon: '🔥',
    description: 'Проекты, затронутые относительно ветки main',
    scope: [...WORKSPACE_SCOPE],
    category: 'nx',
    action: nxAffected,
  },
  {
    id: 'nx.graph',
    label: '🕸️ Graph',
    icon: '🕸️',
    description: 'Открыть интерактивный граф зависимостей в браузере',
    scope: [...WORKSPACE_SCOPE],
    category: 'nx',
    action: nxGraph,
  },
  {
    id: 'nx.report',
    label: '🧾 Report',
    icon: '🧾',
    description: 'Версии nx и установленных плагинов',
    scope: [...WORKSPACE_SCOPE],
    category: 'nx',
    action: nxReport,
  },
  {
    id: 'nx.run',
    label: '▶️ Run target',
    icon: '▶️',
    description: 'Выполнить nx-таргет: <project>:<task>',
    scope: [...WORKSPACE_SCOPE],
    category: 'nx',
    params: [
      {
        name: 'target',
        description: 'project:target, например @capsule/cli:build',
        positional: true,
        required: true,
        prompt: {
          type: 'input',
          message: 'project:target',
          placeholder: '@capsule/cli:build',
        },
      },
    ],
    action: nxRun,
  },
];

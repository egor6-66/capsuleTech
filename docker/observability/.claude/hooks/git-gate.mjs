#!/usr/bin/env node
// git-gate.mjs — PreToolUse hook: hard-gate на write-операции git/gh.
//
// Несколько agent'ов работают параллельно в одном shared working tree (одна .git
// директория). Неконтролируемая смена HEAD (`git switch`) или публикация (`git push`)
// размазывает работу соседей и ведёт к мусорным коммитам / конфликтам.
//
// Промпт-уровень (memory `feedback_no_branch_switch_shared_tree`, `feedback_agents_commit_only_user_pushes`)
// под нагрузкой задачи игнорится. Этот хук — hard-gate: режет все write-операции
// независимо от того, помнит agent правило или нет.
//
// Контракт хука (Claude Code PreToolUse):
//   stdin  = JSON { tool_name, tool_input: { command }, transcript_path, cwd, session_id }
//   stdout = JSON { hookSpecificOutput: { hookEventName, permissionDecision, permissionDecisionReason } }
//   exit 0 всегда; решение — через permissionDecision (deny|allow). FAIL-OPEN на внутренних ошибках.
//
// Режем ВСЕХ одинаково (включая architect'а). Снять блок можно только правкой
// settings.json через user'а в отдельной ветке — это редкий случай, ок ручной workflow.

import { readFileSync } from 'node:fs';

function allow() {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' },
    }),
  );
  process.exit(0);
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

// Префикс, после которого может идти git/gh: начало строки, пробел, `;`, `&&`, `||`, `|`, кавычка.
// Это ловит и `git switch foo`, и `bash -c "git switch foo"`, и `git status && git switch foo`.
const PFX = '(?:^|[\\s;|&"\'`])';

const DENY_RULES = [
  { rx: new RegExp(`${PFX}git\\s+switch(?:\\s|$)`, 'i'), label: 'git switch' },
  { rx: new RegExp(`${PFX}git\\s+checkout\\s+-b\\b`, 'i'), label: 'git checkout -b' },
  { rx: new RegExp(`${PFX}git\\s+push(?:\\s|$)`, 'i'), label: 'git push' },
  { rx: new RegExp(`${PFX}git\\s+merge(?:\\s|$)`, 'i'), label: 'git merge' },
  { rx: new RegExp(`${PFX}git\\s+rebase(?:\\s|$)`, 'i'), label: 'git rebase' },
  { rx: new RegExp(`${PFX}git\\s+reset\\s+--(?:hard|keep)\\b`, 'i'), label: 'git reset --hard/--keep' },
  { rx: new RegExp(`${PFX}git\\s+branch\\s+-(?:D|f|m|M)\\b`), label: 'git branch -D/-f/-m' },
  {
    rx: new RegExp(`${PFX}git\\s+worktree\\s+(?:add|remove|move)\\b`, 'i'),
    label: 'git worktree add/remove/move',
  },
  { rx: new RegExp(`${PFX}gh\\s+pr\\s+(?:create|merge|close|reopen|edit)\\b`, 'i'), label: 'gh pr write' },
];

// `git checkout <branch>` режется ТОЛЬКО если в команде нет ` -- ` (path-restore форма).
// `git checkout -b` режется всегда — обрабатывается отдельным правилом выше.
function matchesCheckoutBranch(cmd) {
  const rx = new RegExp(`${PFX}git\\s+checkout(?!\\s+-b\\b)\\b`, 'i');
  if (!rx.test(cmd)) return null;
  if (/\s--(?:\s|$)/.test(cmd)) return null; // ` -- ` присутствует → path-restore, пускаем
  return 'git checkout <branch>';
}

function blockReason(cmd) {
  for (const { rx, label } of DENY_RULES) {
    if (rx.test(cmd)) return label;
  }
  const co = matchesCheckoutBranch(cmd);
  if (co) return co;
  return null;
}

function buildMessage(cmd, label) {
  return [
    `❌ Команда \`${cmd}\` заблокирована harness-хуком (git-gate).`,
    '',
    `Причина: \`${label}\` меняет HEAD / публикует / переписывает историю на shared \`.git\`.`,
    'Несколько agent\'ов работают параллельно в этом worktree; неконтролируемая смена ветки',
    'или push размазывает работу соседей.',
    '',
    'Действие: STOP. Не пытайся обойти (через `bash -c`, `&&`, кавычки — хук видит полную команду).',
    'Верни state главному (architect). Architect либо сделает операцию сам, либо выдаст тебе',
    'отдельный worktree, в котором смена HEAD безопасна.',
  ].join('\n');
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    allow();
    return;
  }

  if (input.tool_name !== 'Bash') {
    allow();
    return;
  }

  const cmd = String(input.tool_input?.command ?? '');
  if (!cmd) {
    allow();
    return;
  }

  const reason = blockReason(cmd);
  if (!reason) {
    allow();
    return;
  }

  deny(buildMessage(cmd, reason));
}

try {
  main();
} catch {
  // FAIL-OPEN: внутренняя ошибка хука не должна ломать обычные read-only команды.
  allow();
}

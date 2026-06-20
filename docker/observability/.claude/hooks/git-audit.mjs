#!/usr/bin/env node
// git-audit.mjs — PostToolUse hook: audit-tail на успешный `git commit`.
//
// В transcript'е architect'а сразу видно, на какую ветку лёг коммит — расхождение
// «должен был коммитить в X, а лёг в Y» ловится в момент, а не через час по конфликтам.
//
// Контракт (Claude Code PostToolUse):
//   stdin  = JSON { tool_name, tool_input: { command }, tool_response: { stdout, stderr, exit_code }, cwd, ... }
//   stdout = JSON { hookSpecificOutput: { hookEventName, additionalContext } } | пустой объект
//   exit 0 всегда; не валит exit-code оригинального commit'а.
//
// Не блокирует и не модифицирует результат commit'а — только дописывает строку
// в context agent'а через additionalContext.

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function emit(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext,
      },
    }),
  );
  process.exit(0);
}

function silent() {
  process.stdout.write('{}');
  process.exit(0);
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    silent();
    return;
  }

  if (input.tool_name !== 'Bash') {
    silent();
    return;
  }

  const cmd = String(input.tool_input?.command ?? '');
  if (!/(?:^|[\s;|&"'`])git\s+commit\b/i.test(cmd)) {
    silent();
    return;
  }

  // exit_code !== 0 (включая pre-commit hook failure) → ничего не пишем,
  // commit не состоялся, аудитировать нечего.
  const exitCode = input.tool_response?.exit_code ?? input.tool_response?.exitCode;
  if (exitCode !== 0 && exitCode !== undefined) {
    silent();
    return;
  }

  const cwd = input.cwd || process.cwd();
  let sha = '';
  let branch = '';
  try {
    sha = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf8', timeout: 3000 }).trim();
    branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf8',
      timeout: 3000,
    }).trim();
  } catch {
    silent();
    return;
  }

  if (!sha || !branch) {
    silent();
    return;
  }

  emit(`[git-audit] commit ${sha} on branch ${branch}`);
}

try {
  main();
} catch {
  silent();
}

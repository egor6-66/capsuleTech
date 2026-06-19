#!/usr/bin/env node
// dev-diagnostics-session-start.mjs — SessionStart hook.
//
// Сканирует `apps/*/.capsule/dev-diagnostics.log`, находит самый свежий по mtime
// и (если dev-server активен — mtime < 60 сек назад) дописывает в context agent'а
// инструкцию запустить Monitor на этом файле.
//
// Без активного dev-server'а — silent skip. Никаких error'ов, никаких блоков.
// Agent работает «слепым» — это на совести пользователя (не запустил dev).
//
// Контракт хука (Claude Code SessionStart):
//   stdin  = JSON { session_id, transcript_path, cwd, source, hook_event_name }
//   stdout = JSON { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext } } | {}
//   exit 0 всегда.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FRESH_THRESHOLD_MS = 60_000; // 60s

function silent() {
  process.stdout.write('{}');
  process.exit(0);
}

function emit(additionalContext) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext,
      },
    }),
  );
  process.exit(0);
}

function findLogs(cwd) {
  const appsDir = join(cwd, 'apps');
  if (!existsSync(appsDir)) return [];
  const found = [];
  for (const name of readdirSync(appsDir)) {
    const log = join(appsDir, name, '.capsule', 'dev-diagnostics.log');
    if (existsSync(log)) {
      try {
        const st = statSync(log);
        found.push({ path: log, mtime: st.mtimeMs, app: name });
      } catch {
        /* skip unreadable */
      }
    }
  }
  return found;
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    silent();
    return;
  }

  const cwd = input.cwd || process.cwd();
  const logs = findLogs(cwd);
  if (logs.length === 0) {
    silent();
    return;
  }

  // Берём самый свежий — он соответствует активному dev-server'у.
  logs.sort((a, b) => b.mtime - a.mtime);
  const freshest = logs[0];
  const ageMs = Date.now() - freshest.mtime;

  if (ageMs > FRESH_THRESHOLD_MS) {
    // Файл есть, но stale — dev-server, возможно, остановлен.
    silent();
    return;
  }

  // Относительный путь от cwd для портативности.
  const rel = freshest.path.startsWith(cwd)
    ? freshest.path.slice(cwd.length + 1).replace(/\\/g, '/')
    : freshest.path.replace(/\\/g, '/');

  const msg = [
    `[dev-diagnostics] Active dev-server detected: apps/${freshest.app} (log mtime ${Math.round(ageMs / 1000)}s ago).`,
    '',
    'A streaming diagnostics channel is available — TS errors, compliance violations',
    'and Vite resolve/transform errors flow into a JSONL log. To track in real-time,',
    'call the Monitor tool with this command (pretty-prints each JSONL line):',
    '',
    `  Monitor({ command: "node .claude/hooks/dev-diagnostics-pretty.mjs ${rel}" })`,
    '',
    'Format per notification: `[diag:<type>:<severity>] <file>:<line>:<col> — <code>: <message>`.',
    'When you want to inspect current state without streaming, Read the JSONL file directly.',
  ].join('\n');

  emit(msg);
}

try {
  main();
} catch {
  silent();
}

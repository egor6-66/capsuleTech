#!/usr/bin/env node
// governance.mjs — PreToolUse hook: scope-fence + ownership-gate + deviation-log.
//
// Срез B плана «рабочая база». Делает канон ИСПОЛНЯЕМЫМ контрактом, а не прозой:
//   1. scope-fence    — инстанс со scope=X не может писать в чужой пакет.
//   2. ownership-gate — нельзя править packages/<P>/**, пока в транскрипте этого
//                       инстанса не было Read packages/<P>/OWNERSHIP.md.
//   3. deviation-log  — каждый блок best-effort летит в OTEL-collector (:4318) →
//                       Loki → виден в Grafana как нарушение (срез A).
//
// Контракт хука (Claude Code PreToolUse):
//   stdin  = JSON { tool_name, tool_input, transcript_path, cwd, session_id, ... }
//   stdout = JSON { hookSpecificOutput: { hookEventName, permissionDecision, permissionDecisionReason } }
//   exit 0 всегда; решение — через permissionDecision (deny|allow). FAIL-OPEN:
//   любая внутренняя ошибка → пропускаем правку (governance не должен «кирпичить»
//   редактирование), но шлём deviation-log о сбое самого хука.
//
// scope передаётся ПЛОШ env-переменной CAPSULE_SCOPE (НЕ через OTEL_* — те Claude
// Code не пробрасывает в subprocess). Выставляется враппером claude-scope.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const COLLECTOR_LOGS = 'http://localhost:4318/v1/logs';

const norm = (p) => (p ?? '').replace(/\\/g, '/');

/** Пропустить правку (с опц. причиной для логов). */
function allow() {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' },
    }),
  );
  process.exit(0);
}

/** Заблокировать правку с человекочитаемой причиной. */
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

/** Best-effort OTLP-лог о нарушении → collector. Никогда не бросает/не блокирует. */
async function logDeviation(kind, scope, detail) {
  try {
    const body = {
      resourceLogs: [
        {
          resource: {
            attributes: [
              { key: 'scope', value: { stringValue: scope || 'unknown' } },
              { key: 'service.name', value: { stringValue: 'capsule-governance' } },
            ],
          },
          scopeLogs: [
            {
              logRecords: [
                {
                  timeUnixNano: String(Date.now() * 1e6),
                  severityText: 'WARN',
                  body: { stringValue: `governance:${kind} ${detail}` },
                  attributes: [
                    { key: 'deviation', value: { stringValue: kind } },
                    { key: 'scope', value: { stringValue: scope || 'unknown' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    await fetch(COLLECTOR_LOGS, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(800),
    });
  } catch {
    /* collector может быть выключен — нарушение всё равно блокируем/пропускаем */
  }
}

/** Найти корень пакета (ближайший package.json вверх) + его scope-имя. */
function resolvePackage(targetPath) {
  let dir = dirname(targetPath);
  // не выходим выше сегмента packages/
  while (norm(dir).includes('/packages/')) {
    const pj = join(dir, 'package.json');
    if (existsSync(pj)) {
      let name = '';
      try {
        name = JSON.parse(readFileSync(pj, 'utf8')).name ?? '';
      } catch {
        /* битый package.json — оставим name пустым */
      }
      const scope = name.replace(/^@[^/]+\//, ''); // @capsuletech/web-ui → web-ui
      return { root: dir, scope };
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Был ли в одном транскрипте Read указанного файла. */
function fileHasRead(transcriptPath, wantedNorm) {
  if (!transcriptPath || !existsSync(transcriptPath)) return false;
  let raw;
  try {
    raw = readFileSync(transcriptPath, 'utf8');
  } catch {
    return false;
  }
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const content = obj?.message?.content ?? obj?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type !== 'tool_use') continue;
      if (block?.name !== 'Read') continue;
      const fp = norm(block?.input?.file_path ?? '').toLowerCase();
      if (fp && (fp === wantedNorm || fp.endsWith(wantedNorm) || wantedNorm.endsWith(fp))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Был ли в транскрипте (parent или любом subagent рядом) Read указанного файла.
 *
 * Claude Code передаёт хуку `transcript_path` ПАРЕНТА даже когда PreToolUse
 * инициирован subagent'ом. Транскрипты subagent'ов живут рядом:
 *   <dir>/<session_id>.jsonl          (parent)
 *   <dir>/<session_id>/subagents/agent-*.jsonl  (subagents)
 * Скан обходит и parent, и активные subagent-файлы.
 */
function transcriptHasRead(transcriptPath, wantedFile) {
  if (!transcriptPath) return false;
  const want = norm(wantedFile).toLowerCase();

  if (fileHasRead(transcriptPath, want)) return true;

  // Доскан subagent-транскриптов рядом с parent'ом.
  try {
    const base = basename(transcriptPath).replace(/\.jsonl$/i, '');
    const subDir = join(dirname(transcriptPath), base, 'subagents');
    if (!existsSync(subDir)) return false;
    for (const name of readdirSync(subDir)) {
      if (!name.endsWith('.jsonl')) continue;
      const full = join(subDir, name);
      try {
        if (!statSync(full).isFile()) continue;
      } catch {
        continue;
      }
      if (fileHasRead(full, want)) return true;
    }
  } catch {
    /* ignore — fail-open наружу */
  }
  return false;
}

async function main() {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const tool = input.tool_name;
  if (!EDIT_TOOLS.has(tool)) allow();

  const targetRaw = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (!targetRaw) allow();
  const target = norm(targetRaw);

  // Гейтим только правки в packages/** — apps/docs/прочее свободно.
  if (!target.includes('/packages/')) allow();

  const pkg = resolvePackage(target);
  if (!pkg) allow(); // не нашли package.json — не наш кейс

  const scope = process.env.CAPSULE_SCOPE ?? '';

  // 1) scope-fence
  if (scope && pkg.scope && scope !== pkg.scope) {
    await logDeviation('scope-fence', scope, `tried to edit ${pkg.scope}: ${target}`);
    deny(
      `Scope-fence: этот инстанс работает в scope="${scope}", а правка идёт в пакет "${pkg.scope}" (${target}). ` +
        `Чужой пакет — зона его owner-агента. Запусти отдельный инстанс через claude-scope для "${pkg.scope}".`,
    );
  }

  // 2) ownership-gate
  const ownership = join(pkg.root, 'OWNERSHIP.md');
  const hasRead = transcriptHasRead(input.transcript_path, ownership);
  dbg(
    `tool=${tool} target=${target} pkg=${pkg.scope} ownership=${ownership} transcript_path=${input.transcript_path} transcript_exists=${input.transcript_path ? existsSync(input.transcript_path) : false} hasRead=${hasRead} session_id=${input.session_id}`,
  );
  if (existsSync(ownership) && !hasRead) {
    await logDeviation('ownership-gate', scope, `edit ${pkg.scope} without reading OWNERSHIP.md`);
    deny(
      `Ownership-gate: прежде чем править пакет "${pkg.scope}", прочитай его канон — ` +
        `${norm(ownership)} (POLICY §5). Сделай Read этого файла, затем повтори правку.`,
    );
  }

  allow();
}

main().catch(async (err) => {
  // FAIL-OPEN: внутренняя ошибка хука не должна ломать редактирование.
  await logDeviation('hook-error', process.env.CAPSULE_SCOPE ?? '', String(err?.message ?? err));
  allow();
});

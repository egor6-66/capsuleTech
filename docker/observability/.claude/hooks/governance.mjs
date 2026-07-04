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
// Canon (2026-06-22): scope = package.json#name минус @capsuletech/ минус
// опциональный web- префикс. Один источник истины с scope-resolve.mjs.
//   @capsuletech/web-ui      → ui
//   @capsuletech/vite-builder → vite-builder
//   @capsuletech/canvas-ui   → canvas-ui
//   @capsuletech/web-remote  → remote

const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const COLLECTOR_LOGS = 'http://localhost:4318/v1/logs';

const norm = (p) => (p ?? '').replace(/\\/g, '/');

/** Debug-лог в stderr (stdout занят hook-протоколом). Включается GOVERNANCE_DEBUG=1.
 * NB: раньше `dbg` не была определена → ReferenceError в main() → fail-open →
 * ownership-gate молча не работал (найдено 2026-07-03 при подводке зоны apps). */
const dbg = (msg) => {
  if (process.env.GOVERNANCE_DEBUG) process.stderr.write(`[governance] ${msg}\n`);
};

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

/** Канонический scope-name из package.json#name. */
function scopeFromName(pkgName) {
  return (pkgName ?? '').replace(/^@[^/]+\//, '').replace(/^web-/, '');
}

/** Найти корень проекта (ближайший манифест вверх) + его scope-имя.
 * Манифест: package.json (TS-пакеты в packages/) или project.json (backend-проекты
 * Python/Rust в backend/ без package.json). Имя из package.json#name (приоритет),
 * иначе project.json#name.
 *
 * Зона apps/ (канон user 2026-07-05 — owner PER APP, зеркало packages-модели;
 * заменяет «один owner-apps» от 2026-07-03): apps/<name>/** = scope `apps-<name>`.
 * Файлы прямо в apps/ (OWNERSHIP.md — общий канон app-слоёв) = scope `apps`
 * (канон-хранитель). main по-прежнему deny везде в apps — architect пишет брифы. */
function resolvePackage(targetPath) {
  const t = norm(targetPath);
  const appsIdx = t.indexOf('/apps/');
  if (appsIdx !== -1) {
    const zoneRoot = t.slice(0, appsIdx + '/apps'.length);
    const rest = t.slice(appsIdx + '/apps/'.length);
    // файл прямо в apps/ (без поддиректории) — общие канон-документы зоны
    if (!rest.includes('/')) return { root: zoneRoot, scope: 'apps', zoneRoot };
    const seg = rest.split('/')[0];
    return { root: `${zoneRoot}/${seg}`, scope: `apps-${seg}`, zoneRoot };
  }
  let dir = dirname(targetPath);
  // не выходим выше сегмента packages/ или backend/
  while (norm(dir).includes('/packages/') || norm(dir).includes('/backend/')) {
    const pkgJson = join(dir, 'package.json');
    const projJson = join(dir, 'project.json');
    const manifest = existsSync(pkgJson) ? pkgJson : existsSync(projJson) ? projJson : null;
    if (manifest) {
      let name = '';
      try {
        name = JSON.parse(readFileSync(manifest, 'utf8')).name ?? '';
      } catch {
        /* битый манифест — оставим name пустым */
      }
      return { root: dir, scope: scopeFromName(name) };
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
  // BOM-strip: PS-пайп в ручных тестах добавляет U+FEFF; Claude Code шлёт чистый JSON.
  const input = JSON.parse(readFileSync(0, 'utf8').replace(/^﻿/, ''));
  const tool = input.tool_name;
  dbg(`enter tool=${tool} scope=${process.env.CAPSULE_SCOPE ?? ''}`);
  if (!EDIT_TOOLS.has(tool)) allow();

  const targetRaw = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
  if (!targetRaw) allow();
  const target = norm(targetRaw);
  dbg(`target=${target}`);

  // Гейтим правки в packages/**, backend/** и apps/** — docs/infra/прочее свободно.
  if (
    !target.includes('/packages/') &&
    !target.includes('/backend/') &&
    !target.includes('/apps/')
  )
    allow();

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

  // 2a) ownership-gate зоны apps: общий канон app-слоёв обязателен для ЛЮБОГО
  // per-app owner'а (apps/OWNERSHIP.md), дополнительно к OWNERSHIP самого аппа.
  if (pkg.zoneRoot && pkg.scope.startsWith('apps-')) {
    const zoneCanon = join(pkg.zoneRoot, 'OWNERSHIP.md');
    if (existsSync(zoneCanon) && !transcriptHasRead(input.transcript_path, zoneCanon)) {
      await logDeviation('ownership-gate', scope, `edit ${pkg.scope} without reading apps/OWNERSHIP.md`);
      deny(
        `Ownership-gate: зона apps имеет общий канон app-слоёв — прочитай ${norm(zoneCanon)} ` +
          `(Read), затем повтори правку.`,
      );
    }
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

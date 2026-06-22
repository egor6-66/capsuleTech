#!/usr/bin/env node
// main-session-marker.mjs — SessionStart hook: writes session_id to marker ONLY for "main" scope.
//
// Канон (2026-06-22): user запускает каждую Claude-сессию в отдельном scope через
// `claude-scope.ps1 -Scope <name>`. Скрипт ставит env CAPSULE_SCOPE. Доступ к destructive
// git ops по канону имеет ТОЛЬКО scope "main" (architect). Любой другой scope
// (owners, telemetry, отладочные) не должен трогать marker — иначе их SessionStart
// перезапишет main marker'ом своего id и main lose-нёт git access.
//
// Поэтому хук пишет marker ТОЛЬКО если CAPSULE_SCOPE === 'main'. Любой другой scope —
// silent no-op. Это reinforces canon на уровне harness'а, а не промпта.
//
// Subagents (Agent tool) — отдельная история: они наследуют env от parent session,
// но SessionStart для них не фаер (per Claude Code design). Так что они никогда сюда
// не попадут. Если бы попали — их CAPSULE_SCOPE был бы 'main' (наследовано) — было бы
// нештатно; не покрываем.
//
// Contract (Claude Code SessionStart):
//   stdin  = JSON { session_id, transcript_path, cwd, source, hook_event_name }
//   stdout = {} (silent)
//   exit 0 always (fail-open).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

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

  // Канон: marker пишет ТОЛЬКО main scope. Любой другой scope (или отсутствие scope)
  // — silent no-op, чтобы не перезаписать main marker своим session_id.
  const scope = process.env.CAPSULE_SCOPE;
  if (scope !== 'main') {
    silent();
    return;
  }

  const sessionId = input.session_id;
  const cwd = input.cwd || process.cwd();
  if (!sessionId) {
    silent();
    return;
  }

  const marker = join(cwd, '.claude', '.main-session-id');
  try {
    mkdirSync(dirname(marker), { recursive: true });
    writeFileSync(marker, String(sessionId), 'utf8');
  } catch {
    /* fail-open */
  }

  silent();
}

try {
  main();
} catch {
  silent();
}
